/**
 * Local Supabase RPC security, idempotency, rollback, and conflict test for apply_correction_atomic.
 * Refuses to run if SUPABASE_URL is not local.
 *
 * Usage:
 *   npx supabase db reset --no-seed   (local only)
 *   npm run test:rpc
 */

import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

function assertLocalUrl(urlStr: string): void {
  const parsed = new URL(urlStr);
  if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
    throw new Error(`Refusing to run test:rpc against non-local URL: ${urlStr}`);
  }
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  assertLocalUrl(supabaseUrl);

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  if (!serviceRoleKey || !anonKey) {
    throw new Error('Set local SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY.');
  }

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const shopA = crypto.randomUUID();
  const shopB = crypto.randomUUID();
  const customerA = crypto.randomUUID();
  const origTxId = crypto.randomUUID();
  const revTxId = crypto.randomUUID();
  const corrTxId = crypto.randomUUID();
  const badRevTxId = crypto.randomUUID();
  const badCorrTxId = crypto.randomUUID();

  const emailA = `rpc-shopa-${shopA.slice(0, 8)}@example.com`;
  const emailNull = `rpc-null-${shopA.slice(0, 8)}@example.com`;
  const password = 'TestPassword123!';
  let userAId: string | null = null;
  let userNullId: string | null = null;

  await service.from('shops').insert([
    { id: shopA, name: 'RPC Test Shop A', owner_phone: '9000000011' },
    { id: shopB, name: 'RPC Test Shop B', owner_phone: '9000000012' },
  ]);

  try {
    const uA = await service.auth.admin.createUser({ email: emailA, password, email_confirm: true });
    assert.ifError(uA.error);
    userAId = uA.data.user.id;

    const uNull = await service.auth.admin.createUser({ email: emailNull, password, email_confirm: true });
    assert.ifError(uNull.error);
    userNullId = uNull.data.user.id;

    // Only userA gets a public.users row (shopA); userNull has auth_shop_id() = NULL
    await service.from('users').insert({
      id: userAId,
      shop_id: shopA,
      phone: '9000000011',
      name: 'Owner A',
      role: 'owner',
    });

    await service.from('customers').insert({
      id: customerA,
      shop_id: shopA,
      name: 'Ramesh Test',
      balance_owed: 500,
    });

    await service.from('transactions').insert({
      id: origTxId,
      shop_id: shopA,
      type: 'credit',
      amount: 500,
      items: [],
      customer_id: customerA,
      created_at: new Date().toISOString(),
    });

    const clientA = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    assert.ifError((await clientA.auth.signInWithPassword({ email: emailA, password })).error);

    const clientNull = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    assert.ifError((await clientNull.auth.signInWithPassword({ email: emailNull, password })).error);

    const nowIso = new Date().toISOString();
    const basePayload = (revId: string, corrId: string, custDeltas: unknown[]) => ({
      p_shop_id: shopA,
      p_target_tx_id: origTxId,
      p_expected_superseded_by: null,
      p_reversal_tx: {
        id: revId,
        type: 'credit',
        amount: -500,
        items: [],
        customer_id: customerA,
        created_at: nowIso,
        parent_transaction_id: origTxId,
        note: 'reversal',
        source: 'voice',
      },
      p_correction_tx: {
        id: corrId,
        type: 'credit',
        amount: 600,
        items: [],
        customer_id: customerA,
        created_at: nowIso,
        parent_transaction_id: origTxId,
        note: 'correction',
        source: 'voice',
      },
      p_customer_deltas: custDeltas,
      p_stock_deltas: [],
      p_audit_log: {
        entity_type: 'transaction',
        entity_id: origTxId,
        action: 'edit',
        actor_id: userAId,
        actor_name: 'Owner A',
        actor_role: 'owner',
        before_value: { amount: 500 },
        after_value: { amount: 600 },
        source: 'voice',
        created_at: nowIso,
      },
    });

    // 1. Anon call is denied
    const anonRes = await anon.rpc('apply_correction_atomic', basePayload(revTxId, corrTxId, []));
    assert.ok(anonRes.error, 'anon call must be denied');
    console.log('1. Anon denied:', anonRes.error.code, anonRes.error.message);

    // 2. Shop A user calling with Shop B's shop_id raises "Unauthorized shop_id"
    const crossShopPayload = { ...basePayload(revTxId, corrTxId, []), p_shop_id: shopB };
    const crossRes = await clientA.rpc('apply_correction_atomic', crossShopPayload);
    assert.ok(crossRes.error?.message.includes('Unauthorized shop_id'), `Expected Unauthorized shop_id, got ${crossRes.error?.message}`);
    console.log('2. Cross-shop rejected:', crossRes.error.message);

    // 3. Call where auth_shop_id() is NULL raises "Unauthorized shop_id"
    const nullRes = await clientNull.rpc('apply_correction_atomic', basePayload(revTxId, corrTxId, []));
    assert.ok(nullRes.error?.message.includes('Unauthorized shop_id'), `Expected Unauthorized shop_id for NULL shop, got ${nullRes.error?.message}`);
    console.log('3. NULL auth_shop_id() rejected:', nullRes.error.message);

    // 4. Failure halfway (invalid customer delta UUID) leaves NO partial rows
    const badRes = await clientA.rpc(
      'apply_correction_atomic',
      basePayload(badRevTxId, badCorrTxId, [{ customerId: 'not-a-valid-uuid', delta: 100 }])
    );
    assert.ok(badRes.error, 'Invalid customer delta must raise');
    const { data: partialTx } = await service.from('transactions').select('id').in('id', [badRevTxId, badCorrTxId]);
    assert.equal(partialTx?.length || 0, 0, 'Rollback failed: reversal/correction rows persisted');
    const { data: origAfterBad } = await service.from('transactions').select('superseded_by').eq('id', origTxId).single();
    assert.equal(origAfterBad?.superseded_by, null, 'Rollback failed: superseded_by was modified');
    const { data: badAudit } = await service.from('audit_logs').select('id').eq('entity_id', origTxId);
    assert.equal(badAudit?.length || 0, 0, 'Rollback failed: audit log persisted');
    console.log('4. Halfway failure rolled back cleanly (0 partial rows).');

    // 5. Valid same-shop call applies, and replay returns already_applied
    const applyRes = await clientA.rpc(
      'apply_correction_atomic',
      basePayload(revTxId, corrTxId, [{ customerId: customerA, delta: 100 }])
    );
    assert.ifError(applyRes.error);
    assert.equal((applyRes.data as any)?.status, 'applied');

    const replayRes = await clientA.rpc(
      'apply_correction_atomic',
      basePayload(revTxId, corrTxId, [{ customerId: customerA, delta: 100 }])
    );
    assert.ifError(replayRes.error);
    assert.equal((replayRes.data as any)?.status, 'already_applied');
    console.log('5. Valid apply + idempotent replay passed:', applyRes.data, replayRes.data);

    // 6. Stale p_expected_superseded_by returns status 'conflict' and writes nothing
    const conflictRev = crypto.randomUUID();
    const conflictCorr = crypto.randomUUID();
    const conflictRes = await clientA.rpc(
      'apply_correction_atomic',
      basePayload(conflictRev, conflictCorr, [])
    );
    assert.ifError(conflictRes.error);
    assert.equal((conflictRes.data as any)?.status, 'conflict');
    const { data: conflictTx } = await service.from('transactions').select('id').in('id', [conflictRev, conflictCorr]);
    assert.equal(conflictTx?.length || 0, 0, 'Conflict should write nothing');
    console.log('6. Stale p_expected_superseded_by returned conflict and wrote nothing:', conflictRes.data);

    console.log('✅ All apply_correction_atomic RPC security, rollback & idempotency tests passed!');
  } finally {
    if (userAId) await service.auth.admin.deleteUser(userAId);
    if (userNullId) await service.auth.admin.deleteUser(userNullId);
    await service.from('audit_logs').delete().eq('shop_id', shopA);
    await service.from('transactions').delete().eq('shop_id', shopA);
    await service.from('customers').delete().eq('shop_id', shopA);
    await service.from('shops').delete().in('id', [shopA, shopB]);
  }
}

main().catch((err) => {
  console.error('❌ test:rpc failed:', err);
  process.exit(1);
});

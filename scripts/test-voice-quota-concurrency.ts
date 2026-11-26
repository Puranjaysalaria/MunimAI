/**
 * Concurrency & Security Test for Distributed Voice Quota RPCs against LOCAL Supabase only.
 * Usage:
 *   npx supabase start
 *   npm run test:quota
 */

import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

function assertLocalUrl(urlStr: string): void {
  const parsed = new URL(urlStr);
  if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
    throw new Error(
      `Refusing to run quota concurrency tests against non-local Supabase URL: ${urlStr}. Use local npx supabase start only.`
    );
  }
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  assertLocalUrl(supabaseUrl);

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  if (!serviceRoleKey || !anonKey) {
    throw new Error('Set local SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY from `npx supabase status`.');
  }

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Fresh shop IDs per run for determinism
  const shopA = crypto.randomUUID();
  const shopB = crypto.randomUUID();
  const testEmail = `quota-auth-${shopA.slice(0, 8)}@example.com`;
  const testPassword = 'TestPassword123!';
  let createdAuthUserId: string | null = null;

  await service.from('shops').insert([
    { id: shopA, name: 'Quota Test Shop A', owner_phone: '9000000001' },
    { id: shopB, name: 'Quota Test Shop B', owner_phone: '9000000002' },
  ]);

  try {
    // Use integer-paise-clean cost (₹0.02 = 2 paise) and tight daily cap (₹0.15 = 15 paise),
    // and set global RPM high (1000) so consecutive runs without reset stay deterministic.
    const shopDailyCapInr = 0.15;
    const shopMonthlyCapInr = 100;
    const globalMonthlyCapInr = 10000;
    const globalRpm = 1000;
    const estimatedInr = 0.015; // DB rounds 1.5 paise -> 2 paise

    console.log('Quota Concurrency Test Config:', {
      shopA,
      estimatedInr,
      shopDailyCapInr,
      shopMonthlyCapInr,
      globalMonthlyCapInr,
      globalRpm,
    });

    // (a) Fire 50 parallel reserve calls against local Supabase
    const parallelRes = await Promise.all(
      Array.from({ length: 50 }, () =>
        service.rpc('reserve_voice_quota', {
          p_shop_id: shopA,
          p_provider: 'gnani',
          p_kind: 'stt',
          p_estimated_inr: estimatedInr,
          p_shop_daily_cap: shopDailyCapInr,
          p_shop_monthly_cap: shopMonthlyCapInr,
          p_global_monthly_cap: globalMonthlyCapInr,
          p_global_rpm: globalRpm,
        })
      )
    );

    const succeededRows: Array<{ reservation_id: string }> = [];
    const deniedReasons: Record<string, number> = {};
    const errors: Array<{ idx: number; code?: string; message: string }> = [];

    parallelRes.forEach((r, idx) => {
      if (r.error) {
        errors.push({ idx, code: r.error.code, message: r.error.message });
      } else {
        const row = Array.isArray(r.data) ? r.data[0] : null;
        if (row?.allowed === true) {
          succeededRows.push(row);
        } else {
          const reason = row?.reason || 'unknown_denied';
          deniedReasons[reason] = (deniedReasons[reason] || 0) + 1;
        }
      }
    });

    // Compute expected successes from the ACTUAL reserved paise cost stored in voice_reservations
    const { data: resRows, error: resQueryErr } = await service
      .from('voice_reservations')
      .select('reserved_paise')
      .eq('shop_id', shopA);
    assert.ifError(resQueryErr);
    assert.ok(resRows && resRows.length > 0, 'Expected at least one reservation row');

    const actualCostPaise = resRows[0].reserved_paise;
    const capPaise = Math.round(shopDailyCapInr * 100);
    const expectedSuccesses = Math.floor(capPaise / actualCostPaise);
    const totalDenied = Object.values(deniedReasons).reduce((a, b) => a + b, 0);

    const { data: usageRow } = await service
      .from('voice_usage')
      .select('spend_paise, req_count')
      .eq('shop_id', shopA)
      .single();
    const { data: globalRow } = await service
      .from('voice_usage_global')
      .select('spend_paise, minute_req_count');

    console.log('50-Parallel Summary:', {
      succeeded: succeededRows.length,
      denied: totalDenied,
      deniedReasons,
      errored: errors.length,
      actualCostPaise,
      capPaise,
      expectedSuccesses,
      voice_usage: usageRow,
      voice_usage_global: globalRow,
    });

    assert.equal(errors.length, 0, `Expected zero errors, got: ${JSON.stringify(errors)}`);
    assert.equal(
      succeededRows.length,
      expectedSuccesses,
      `Expected floor(${capPaise} / ${actualCostPaise}) = ${expectedSuccesses} successes, got ${succeededRows.length}`
    );
    assert.equal(succeededRows.length + totalDenied, 50, 'Every non-succeeded call must be cap-denied');
    assert.ok(deniedReasons['shop_daily_budget'] === totalDenied, 'All denials must carry shop_daily_budget reason');
    assert.ok(usageRow && usageRow.spend_paise <= capPaise, 'Shop daily spend exceeded cap!');

    // (b) Call reconcile twice AND in parallel for one reservation -> single refund
    const firstReservationId = succeededRows[0].reservation_id;
    const [rec1, rec2] = await Promise.all([
      service.rpc('reconcile_voice_quota', { p_reservation_id: firstReservationId, p_shop_id: shopA, p_actual_inr: 0 }),
      service.rpc('reconcile_voice_quota', { p_reservation_id: firstReservationId, p_shop_id: shopA, p_actual_inr: 0 }),
    ]);
    const rec3 = await service.rpc('reconcile_voice_quota', {
      p_reservation_id: firstReservationId,
      p_shop_id: shopA,
      p_actual_inr: 0,
    });
    const settledCount = [rec1.data?.[0], rec2.data?.[0], rec3.data?.[0]].filter((x) => x?.settled === true).length;
    assert.equal(settledCount, 1, 'Expected reconcile to settle/refund exactly once');

    // (c) Anon AND authenticated user callers get permission denied
    const anonCall = await anon.rpc('reserve_voice_quota', {
      p_shop_id: shopA,
      p_provider: 'gnani',
      p_kind: 'stt',
      p_estimated_inr: 0.02,
    });
    assert.ok(anonCall.error, 'Anon call to reserve_voice_quota must fail with permission denied');

    const { data: userCreated, error: createErr } = await service.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    assert.ifError(createErr);
    createdAuthUserId = userCreated.user?.id || null;

    const authedClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInErr } = await authedClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    assert.ifError(signInErr);

    const authedReserve = await authedClient.rpc('reserve_voice_quota', {
      p_shop_id: shopA,
      p_provider: 'gnani',
      p_kind: 'stt',
      p_estimated_inr: 0.02,
    });
    assert.ok(authedReserve.error, 'Authenticated user call to reserve_voice_quota must fail with permission denied');

    const authedReconcile = await authedClient.rpc('reconcile_voice_quota', {
      p_reservation_id: succeededRows[1].reservation_id,
      p_shop_id: shopA,
      p_actual_inr: 0,
    });
    assert.ok(authedReconcile.error, 'Authenticated user call to reconcile_voice_quota must fail with permission denied');

    // (d) Reconciling with another shop's id changes nothing
    const secondReservationId = succeededRows[1].reservation_id;
    const wrongShopRec = await service.rpc('reconcile_voice_quota', {
      p_reservation_id: secondReservationId,
      p_shop_id: shopB,
      p_actual_inr: 0,
    });
    assert.equal(wrongShopRec.data?.[0]?.settled, false);
    assert.equal(wrongShopRec.data?.[0]?.refunded_paise, 0);

    // (e) Negative and NaN amounts rejected
    const negRes = await service.rpc('reserve_voice_quota', {
      p_shop_id: shopA,
      p_provider: 'gnani',
      p_kind: 'stt',
      p_estimated_inr: -5,
    });
    assert.ok(negRes.error, 'Negative amount must be rejected');

    const nanRes = await service.rpc('reserve_voice_quota', {
      p_shop_id: shopA,
      p_provider: 'gnani',
      p_kind: 'stt',
      p_estimated_inr: 'NaN' as unknown as number,
    });
    assert.ok(nanRes.error, 'NaN amount must be rejected');

    console.log('✅ All 50-parallel concurrency, reconcile, permission, wrong-shop, and validation checks passed!');
  } finally {
    if (createdAuthUserId) {
      await service.auth.admin.deleteUser(createdAuthUserId);
    }
    await service.from('shops').delete().in('id', [shopA, shopB]);
  }
}

main().catch((err) => {
  console.error('❌ Quota concurrency test failed:', err);
  process.exit(1);
});

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

  // Create two isolated test shops for this run
  const shopA = crypto.randomUUID();
  const shopB = crypto.randomUUID();
  await service.from('shops').insert([
    { id: shopA, name: 'Quota Test Shop A', owner_phone: '9000000001' },
    { id: shopB, name: 'Quota Test Shop B', owner_phone: '9000000002' },
  ]);

  try {
    // (a) Fire 50 parallel reserve calls against small cap (0.15 / 0.015 = 10 allowed)
    const cap = 0.15;
    const cost = 0.015;
    const expectedOk = Math.floor(cap / cost);

    const parallelRes = await Promise.all(
      Array.from({ length: 50 }, () =>
        service.rpc('reserve_voice_quota', {
          p_shop_id: shopA,
          p_provider: 'gnani',
          p_kind: 'stt',
          p_estimated_inr: cost,
          p_shop_daily_cap: cap,
          p_shop_monthly_cap: 100,
          p_global_monthly_cap: 1000,
          p_global_rpm: 200,
        })
      )
    );

    const allowedRows = parallelRes
      .map((r) => (Array.isArray(r.data) ? r.data[0] : null))
      .filter((row) => row && row.allowed === true);

    assert.equal(allowedRows.length, expectedOk, `Expected exactly ${expectedOk} parallel reserves to succeed`);

    const { data: usageRow } = await service
      .from('voice_usage')
      .select('spend_paise')
      .eq('shop_id', shopA)
      .single();
    assert.ok(usageRow && usageRow.spend_paise <= Math.round(cap * 100), 'Shop spend exceeded cap!');

    // (b) Call reconcile twice AND in parallel for one reservation -> single refund
    const firstReservationId = allowedRows[0].reservation_id;
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

    // (c) Anon & authenticated callers get permission denied
    const anonCall = await anon.rpc('reserve_voice_quota', {
      p_shop_id: shopA,
      p_provider: 'gnani',
      p_kind: 'stt',
      p_estimated_inr: 0.015,
    });
    assert.ok(anonCall.error, 'Anon call to reserve_voice_quota must fail with permission denied');

    // (d) Reconciling with another shop's id changes nothing
    const secondReservationId = allowedRows[1].reservation_id;
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

    console.log('✅ All 50-parallel concurrency & security assertions passed on local Supabase.');
  } finally {
    await service.from('shops').delete().in('id', [shopA, shopB]);
  }
}

main().catch((err) => {
  console.error('❌ Quota concurrency test failed:', err);
  process.exit(1);
});

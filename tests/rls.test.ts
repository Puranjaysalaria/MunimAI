import { describe, it, expect } from 'vitest';

interface ScopedRecord {
  id: string;
  shop_id: string;
  [key: string]: unknown;
}

/**
 * Multi-Tenant Simulation Test verifying Row-Level Security (RLS) invariants
 * As specified in supabase/migrations/20261118000000_initial_schema.sql
 */
class MockSupabaseMultiTenantClient {
  private currentUserId: string | null = null;
  private users: { id: string; shop_id: string; role: 'owner' | 'staff' }[] = [];
  private data: Record<string, ScopedRecord[]> = {
    shops: [],
    users: [],
    customers: [],
    items: [],
    transactions: [],
    stock_movements: [],
    suppliers: [],
    supplier_orders: [],
    reminders: [],
  };

  setUser(userId: string | null) {
    this.currentUserId = userId;
  }

  addUser(user: { id: string; shop_id: string; role: 'owner' | 'staff' }) {
    this.users.push(user);
    this.data.users.push(user);
  }

  addRecord(table: string, record: ScopedRecord) {
    if (!this.data[table]) this.data[table] = [];
    this.data[table].push(record);
  }

  // Simulates public.auth_shop_id()
  private getAuthShopId(): string | null {
    if (!this.currentUserId) return null;
    const user = this.users.find((u) => u.id === this.currentUserId);
    return user ? user.shop_id : null;
  }

  // Simulates SELECT with RLS policy: USING (shop_id = public.auth_shop_id())
  select(table: string): ScopedRecord[] {
    const authShopId = this.getAuthShopId();
    if (!authShopId) return []; // RLS denies anon access

    const rows = this.data[table] || [];
    if (table === 'shops') {
      return rows.filter((r) => r.id === authShopId);
    }
    return rows.filter((r) => r.shop_id === authShopId);
  }

  // Simulates INSERT with RLS policy: WITH CHECK (shop_id = public.auth_shop_id())
  insert(table: string, record: ScopedRecord): { success: boolean; error?: string } {
    const authShopId = this.getAuthShopId();
    if (!authShopId) return { success: false, error: 'Unauthorized: No active session' };

    if (record.shop_id !== authShopId) {
      return { success: false, error: 'RLS Check Violation: Cannot insert data for another shop' };
    }

    this.data[table].push(record);
    return { success: true };
  }
}

describe('Row Level Security (RLS) & Multi-Tenant Data Isolation', () => {
  const shopA = 'shop-1111-sharma-kirana';
  const shopB = 'shop-2222-verma-kirana';

  const userOwnerA = 'user-owner-a';
  const userOwnerB = 'user-owner-b';

  const client = new MockSupabaseMultiTenantClient();

  // Setup 2 shops and owners
  client.addUser({ id: userOwnerA, shop_id: shopA, role: 'owner' });
  client.addUser({ id: userOwnerB, shop_id: shopB, role: 'owner' });

  client.addRecord('shops', { id: shopA, shop_id: shopA, name: 'Sharma Kirana Store' });
  client.addRecord('shops', { id: shopB, shop_id: shopB, name: 'Verma General Store' });

  // Add customers to Shop A
  client.addRecord('customers', {
    id: 'cust-a1',
    shop_id: shopA,
    name: 'Ramesh Sharma',
    balance_owed: 500,
  });
  client.addRecord('customers', {
    id: 'cust-a2',
    shop_id: shopA,
    name: 'Ramesh Kumar',
    balance_owed: 1450,
  });

  // Add customers to Shop B
  client.addRecord('customers', {
    id: 'cust-b1',
    shop_id: shopB,
    name: 'Suresh Raina',
    balance_owed: 300,
  });

  // Add transactions
  client.addRecord('transactions', {
    id: 'tx-a1',
    shop_id: shopA,
    type: 'credit',
    amount: 500,
    customer_id: 'cust-a1',
  });
  client.addRecord('transactions', {
    id: 'tx-b1',
    shop_id: shopB,
    type: 'credit',
    amount: 300,
    customer_id: 'cust-b1',
  });

  it('Shop A owner can only see Shop A customers and cannot see Shop B customers', () => {
    client.setUser(userOwnerA);
    const customersA = client.select('customers');

    expect(customersA.length).toBe(2);
    expect(customersA.map((c) => c.name)).toContain('Ramesh Sharma');
    expect(customersA.map((c) => c.name)).toContain('Ramesh Kumar');
    expect(customersA.map((c) => c.name)).not.toContain('Suresh Raina');
  });

  it('Shop B owner can only see Shop B customers and cannot see Shop A customers', () => {
    client.setUser(userOwnerB);
    const customersB = client.select('customers');

    expect(customersB.length).toBe(1);
    expect(customersB.map((c) => c.name)).toContain('Suresh Raina');
    expect(customersB.map((c) => c.name)).not.toContain('Ramesh Sharma');
    expect(customersB.map((c) => c.name)).not.toContain('Ramesh Kumar');
  });

  it('Shop A owner can only see Shop A transactions', () => {
    client.setUser(userOwnerA);
    const txsA = client.select('transactions');

    expect(txsA.length).toBe(1);
    expect(txsA[0].id).toBe('tx-a1');
    expect(txsA[0].amount).toBe(500);
  });

  it('Shop B owner cannot insert a customer record into Shop A (RLS CHECK violation)', () => {
    client.setUser(userOwnerB);
    const result = client.insert('customers', {
      id: 'cust-malicious',
      shop_id: shopA, // Trying to inject into Shop A!
      name: 'Hacker User',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('RLS Check Violation');
  });

  it('Unauthenticated user receives empty data and cannot read anything', () => {
    client.setUser(null);
    expect(client.select('customers')).toEqual([]);
    expect(client.select('transactions')).toEqual([]);
    expect(client.select('shops')).toEqual([]);
  });

  it('Customer reminder safety fields (do_not_remind, reminder_tone_override, last_reminded_at) are isolated per shop by RLS', () => {
    client.addRecord('customers', {
      id: 'cust-b1',
      shop_id: shopB,
      name: 'Pooja Verma',
      balance_owed: 1800,
      do_not_remind: true,
      reminder_tone_override: 'firm',
      last_reminded_at: new Date().toISOString(),
    });

    client.setUser(userOwnerA);
    const shopACustomers = client.select('customers');
    expect(shopACustomers.some((c) => c.name === 'Pooja Verma')).toBe(false);

    client.setUser(userOwnerB);
    const shopBCustomers = client.select('customers');
    const pooja = shopBCustomers.find((c) => c.name === 'Pooja Verma');
    expect(pooja).toBeDefined();
    expect(pooja?.do_not_remind).toBe(true);
    expect(pooja?.reminder_tone_override).toBe('firm');
  });
});

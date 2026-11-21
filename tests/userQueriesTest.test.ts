import { describe, it, expect } from 'vitest';
import { parseSpeech } from '../src/parser';
import { Customer, Item } from '../src/types/schema';

const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    shop_id: 'shop-1',
    name: 'Ramesh Sharma',
    phone: '9876543210',
    address_note: 'Bus Stand',
    credit_limit: 5000,
    balance_owed: 500,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cust-2',
    shop_id: 'shop-1',
    name: 'Ramesh Verma',
    phone: '9876543211',
    address_note: 'Main Bazaar',
    credit_limit: 5000,
    balance_owed: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'cust-3',
    shop_id: 'shop-1',
    name: 'Suresh Kumar',
    phone: '9876543212',
    address_note: 'Station Road',
    credit_limit: 5000,
    balance_owed: 1200,
    created_at: new Date().toISOString(),
  },
];

const mockItems: Item[] = [
  {
    id: 'item-1',
    shop_id: 'shop-1',
    name: 'Sugar',
    synonyms: ['chini', 'cheeni'],
    current_stock: 2,
    min_threshold: 5,
    cost_price: 38,
    selling_price: 42,
    unit: 'kilo',
    created_at: new Date().toISOString(),
  },
];

describe('User Query Problem Areas & Robust Voice Handling', () => {
  describe('Area 1: Bill Scan commands', () => {
    it('accepts "Scan the Bill"', async () => {
      const res = await parseSpeech('Scan the Bill', {
        customers: mockCustomers,
        items: mockItems,
        language: 'en',
      });
      expect(res.intent).toBe('open_bill_scan');
      expect(res.targetTab).toBe('bill_scan');
    });

    it('accepts "scan a bill"', async () => {
      const res = await parseSpeech('scan a bill', {
        customers: mockCustomers,
        items: mockItems,
        language: 'en',
      });
      expect(res.intent).toBe('open_bill_scan');
    });

    it('accepts "take photo of bill"', async () => {
      const res = await parseSpeech('take photo of bill', {
        customers: mockCustomers,
        items: mockItems,
        language: 'en',
      });
      expect(res.intent).toBe('open_bill_scan');
    });

    it('accepts "scan invoice" and "bill scanner"', async () => {
      const res1 = await parseSpeech('scan invoice', {
        customers: mockCustomers,
        items: mockItems,
        language: 'en',
      });
      expect(res1.intent).toBe('open_bill_scan');

      const res2 = await parseSpeech('bill scanner', {
        customers: mockCustomers,
        items: mockItems,
        language: 'en',
      });
      expect(res2.intent).toBe('open_bill_scan');
    });

    it('accepts Hindi "बिल स्कैन करो" and "बिल की फोटो खींचो"', async () => {
      const res1 = await parseSpeech('बिल स्कैन करो', {
        customers: mockCustomers,
        items: mockItems,
        language: 'hi',
      });
      expect(res1.intent).toBe('open_bill_scan');

      const res2 = await parseSpeech('बिल की फोटो खींचो', {
        customers: mockCustomers,
        items: mockItems,
        language: 'hi',
      });
      expect(res2.intent).toBe('open_bill_scan');
    });
  });

  describe('Area 2: Customer ledger records & disambiguation', () => {
    it('opens Suresh ledger directly when unique match', async () => {
      const res = await parseSpeech('Show Suresh ledger', {
        customers: mockCustomers,
        items: mockItems,
        language: 'en',
      });
      expect(res.intent).toBe('show_customer_ledger');
      expect(res.matchedCustomer?.name).toBe('Suresh Kumar');
      expect(res.targetTab).toBe('ledger');
    });

    it('resolves "show ledger record of Suresh"', async () => {
      const res = await parseSpeech('show ledger record of Suresh', {
        customers: mockCustomers,
        items: mockItems,
        language: 'en',
      });
      expect(res.intent).toBe('show_customer_ledger');
      expect(res.matchedCustomer?.name).toBe('Suresh Kumar');
    });

    it('resolves "Suresh record"', async () => {
      const res = await parseSpeech('Suresh record', {
        customers: mockCustomers,
        items: mockItems,
        language: 'en',
      });
      expect(res.intent).toBe('show_customer_ledger');
      expect(res.matchedCustomer?.name).toBe('Suresh Kumar');
    });

    it('disambiguates when multiple customers match ("Show Ramesh ledger")', async () => {
      const res = await parseSpeech('Show Ramesh ledger', {
        customers: mockCustomers,
        items: mockItems,
        language: 'en',
      });
      expect(res.intent).toBe('show_customer_ledger');
      expect(res.matchedCustomer).toBeNull();
      expect(res.ambiguousCustomers?.length).toBe(2);
      expect(res.questionToAsk).toBe('Which Ramesh?');
    });

    it('disambiguates "show ledger record of Ramesh"', async () => {
      const res = await parseSpeech('show ledger record of Ramesh', {
        customers: mockCustomers,
        items: mockItems,
        language: 'en',
      });
      expect(res.intent).toBe('show_customer_ledger');
      expect(res.matchedCustomer).toBeNull();
      expect(res.ambiguousCustomers?.length).toBe(2);
      expect(res.questionToAsk).toBe('Which Ramesh?');
    });

    it('handles Hindi "रमेश का खाता दिखाओ"', async () => {
      const res = await parseSpeech('रमेश का खाता दिखाओ', {
        customers: mockCustomers,
        items: mockItems,
        language: 'hi',
      });
      expect(res.intent).toBe('show_customer_ledger');
      expect(res.ambiguousCustomers?.length).toBe(2);
      expect(res.questionToAsk).toContain('Ramesh');
    });
  });

  describe('Area 3: Low running items & supplier ordering', () => {
    it('accepts "order low running items"', async () => {
      const res = await parseSpeech('order low running items', {
        customers: mockCustomers,
        items: mockItems,
        language: 'en',
      });
      expect(res.intent).toBe('build_order_list');
      expect(res.targetTab).toBe('stock');
    });

    it('handles typo "order low rinnning items"', async () => {
      const res = await parseSpeech('order low rinnning items', {
        customers: mockCustomers,
        items: mockItems,
        language: 'en',
      });
      expect(res.intent).toBe('build_order_list');
      expect(res.targetTab).toBe('stock');
    });

    it('accepts "low running items" to show low stock', async () => {
      const res = await parseSpeech('low running items', {
        customers: mockCustomers,
        items: mockItems,
        language: 'en',
      });
      expect(res.intent).toBe('show_low_stock');
      expect(res.targetTab).toBe('stock');
    });

    it('accepts "order low stock"', async () => {
      const res = await parseSpeech('order low stock', {
        customers: mockCustomers,
        items: mockItems,
        language: 'en',
      });
      expect(res.intent).toBe('build_order_list');
    });

    it('accepts Hindi "कम स्टॉक का ऑर्डर बनाओ"', async () => {
      const res = await parseSpeech('कम स्टॉक का ऑर्डर बनाओ', {
        customers: mockCustomers,
        items: mockItems,
        language: 'hi',
      });
      expect(res.intent).toBe('build_order_list');
    });
  });
});

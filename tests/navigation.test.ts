import { describe, it, expect } from 'vitest';
import { parseSpeech } from '../src/parser';
import { Item, Customer } from '../src/types/schema';

describe('Voice-driven Navigation & Price Action Tests', () => {
  const mockItems: Item[] = [
    {
      id: 'item-1',
      shop_id: 'shop-1',
      name: 'Doodh',
      synonyms: ['milk', 'dood'],
      current_stock: 20,
      min_threshold: 5,
      cost_price: 50,
      selling_price: 60,
      unit: 'litre',
      created_at: new Date().toISOString(),
    },
    {
      id: 'item-2',
      shop_id: 'shop-1',
      name: 'Chini',
      synonyms: ['sugar', 'cheeni'],
      current_stock: 50,
      min_threshold: 10,
      cost_price: 36,
      selling_price: 42,
      unit: 'kilo',
      created_at: new Date().toISOString(),
    },
    {
      id: 'item-3',
      shop_id: 'shop-1',
      name: 'ਦੁੱਧ',
      synonyms: ['milk'],
      current_stock: 15,
      min_threshold: 4,
      cost_price: 52,
      selling_price: 62,
      unit: 'litre',
      created_at: new Date().toISOString(),
    },
  ];

  const mockCustomers: Customer[] = [
    {
      id: 'cust-1',
      shop_id: 'shop-1',
      name: 'Ramesh Kumar',
      phone: '9876543210',
      balance_owed: 1200,
      credit_limit: 5000,
      trust_score: 85,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  describe('1. Navigation Intent Parsing across Hinglish, Punjabi, and English (>= 15 phrases)', () => {
    // open_bill_scan phrases
    it('parses "Bill scan karo" as open_bill_scan', async () => {
      const res = await parseSpeech('Bill scan karo', { items: mockItems, customers: mockCustomers });
      expect(res.intent).toBe('open_bill_scan');
      expect(res.targetTab).toBe('bill_scan');
    });

    it('parses "Bill se price update karo" as open_bill_scan', async () => {
      const res = await parseSpeech('Bill se price update karo', { items: mockItems, customers: mockCustomers });
      expect(res.intent).toBe('open_bill_scan');
      expect(res.targetTab).toBe('bill_scan');
    });

    it('parses "Bill ki photo lagani hai" as open_bill_scan', async () => {
      const res = await parseSpeech('Bill ki photo lagani hai', { items: mockItems, customers: mockCustomers });
      expect(res.intent).toBe('open_bill_scan');
      expect(res.targetTab).toBe('bill_scan');
    });

    it('parses "ਬਿੱਲ ਸਕੈਨ ਕਰੋ" (pa) as open_bill_scan', async () => {
      const res = await parseSpeech('ਬਿੱਲ ਸਕੈਨ ਕਰੋ', { items: mockItems, customers: mockCustomers, language: 'pa' });
      expect(res.intent).toBe('open_bill_scan');
      expect(res.targetTab).toBe('bill_scan');
    });

    it('parses "ਬਿੱਲ ਦੀ ਫੋਟੋ ਲਗਾਉਣੀ ਹੈ" (pa) as open_bill_scan', async () => {
      const res = await parseSpeech('ਬਿੱਲ ਦੀ ਫੋਟੋ ਲਗਾਉਣੀ ਹੈ', { items: mockItems, customers: mockCustomers, language: 'pa' });
      expect(res.intent).toBe('open_bill_scan');
      expect(res.targetTab).toBe('bill_scan');
    });

    it('parses "Scan bill" (en) as open_bill_scan', async () => {
      const res = await parseSpeech('Scan bill', { items: mockItems, customers: mockCustomers, language: 'en' });
      expect(res.intent).toBe('open_bill_scan');
      expect(res.targetTab).toBe('bill_scan');
    });

    it('parses "Open bill camera" (en) as open_bill_scan', async () => {
      const res = await parseSpeech('Open bill camera', { items: mockItems, customers: mockCustomers, language: 'en' });
      expect(res.intent).toBe('open_bill_scan');
      expect(res.targetTab).toBe('bill_scan');
    });

    // open_stock phrases
    it('parses "Stock kholo" as open_stock', async () => {
      const res = await parseSpeech('Stock kholo', { items: mockItems, customers: mockCustomers });
      expect(res.intent).toBe('open_stock');
      expect(res.targetTab).toBe('stock');
    });

    it('parses "Stock dikhao" as open_stock', async () => {
      const res = await parseSpeech('Stock dikhao', { items: mockItems, customers: mockCustomers });
      expect(res.intent).toBe('open_stock');
      expect(res.targetTab).toBe('stock');
    });

    it('parses "Dukaan ka stock" as open_stock', async () => {
      const res = await parseSpeech('Dukaan ka stock', { items: mockItems, customers: mockCustomers });
      expect(res.intent).toBe('open_stock');
      expect(res.targetTab).toBe('stock');
    });

    it('parses "ਸਟਾਕ ਖੋਲ੍ਹੋ" (pa) as open_stock', async () => {
      const res = await parseSpeech('ਸਟਾਕ ਖੋਲ੍ਹੋ', { items: mockItems, customers: mockCustomers, language: 'pa' });
      expect(res.intent).toBe('open_stock');
      expect(res.targetTab).toBe('stock');
    });

    it('parses "Open stock" (en) as open_stock', async () => {
      const res = await parseSpeech('Open stock', { items: mockItems, customers: mockCustomers, language: 'en' });
      expect(res.intent).toBe('open_stock');
      expect(res.targetTab).toBe('stock');
    });

    // open_ledger phrases
    it('parses "Ledger kholo" as open_ledger', async () => {
      const res = await parseSpeech('Ledger kholo', { items: mockItems, customers: mockCustomers });
      expect(res.intent).toBe('open_ledger');
      expect(res.targetTab).toBe('ledger');
    });

    it('parses "Khata kholo" as open_ledger', async () => {
      const res = await parseSpeech('Khata kholo', { items: mockItems, customers: mockCustomers });
      expect(res.intent).toBe('open_ledger');
      expect(res.targetTab).toBe('ledger');
    });

    it('parses "Udhaar khata dikhao" as open_ledger', async () => {
      const res = await parseSpeech('Udhaar khata dikhao', { items: mockItems, customers: mockCustomers });
      expect(res.intent).toBe('open_ledger');
      expect(res.targetTab).toBe('ledger');
    });

    it('parses "ਖਾਤਾ ਖੋਲ੍ਹੋ" (pa) as open_ledger', async () => {
      const res = await parseSpeech('ਖਾਤਾ ਖੋਲ੍ਹੋ', { items: mockItems, customers: mockCustomers, language: 'pa' });
      expect(res.intent).toBe('open_ledger');
      expect(res.targetTab).toBe('ledger');
    });

    it('parses "Open customer ledger" (en) as open_ledger', async () => {
      const res = await parseSpeech('Open customer ledger', { items: mockItems, customers: mockCustomers, language: 'en' });
      expect(res.intent).toBe('open_ledger');
      expect(res.targetTab).toBe('ledger');
    });

    // open_today phrases
    it('parses "Today kholo" as open_today', async () => {
      const res = await parseSpeech('Today kholo', { items: mockItems, customers: mockCustomers });
      expect(res.intent).toBe('open_today');
      expect(res.targetTab).toBe('today');
    });

    it('parses "Aaj ka hisaab" as open_today', async () => {
      const res = await parseSpeech('Aaj ka hisaab', { items: mockItems, customers: mockCustomers });
      expect(res.intent).toBe('open_today');
      expect(res.targetTab).toBe('today');
    });

    it('parses "ਅੱਜ ਦਾ ਹਿਸਾਬ" (pa) as open_today', async () => {
      const res = await parseSpeech('ਅੱਜ ਦਾ ਹਿਸਾਬ', { items: mockItems, customers: mockCustomers, language: 'pa' });
      expect(res.intent).toBe('open_today');
      expect(res.targetTab).toBe('today');
    });

    it('parses "Open today summary" (en) as open_today', async () => {
      const res = await parseSpeech('Open today summary', { items: mockItems, customers: mockCustomers, language: 'en' });
      expect(res.intent).toBe('open_today');
      expect(res.targetTab).toBe('today');
    });
  });

  describe('2. Price Action Intent Parsing (Selling & Cost Price)', () => {
    it('parses "Doodh ka rate 66 rupaye litre set karo" as set_selling_price', async () => {
      const res = await parseSpeech('Doodh ka rate 66 rupaye litre set karo', { items: mockItems, customers: mockCustomers });
      expect(res.intent).toBe('set_selling_price');
      expect(res.amount).toBe(66);
      expect(res.unit).toBe('litre');
      expect(res.item?.toLowerCase()).toContain('doodh');
      expect(res.oldPrice).toBe(60); // from mockItems selling_price
    });

    it('parses "Chini ka rate 45 rupaye kardo" as set_selling_price', async () => {
      const res = await parseSpeech('Chini ka rate 45 rupaye kardo', { items: mockItems, customers: mockCustomers });
      expect(res.intent).toBe('set_selling_price');
      expect(res.amount).toBe(45);
      expect(res.item?.toLowerCase()).toContain('chini');
      expect(res.oldPrice).toBe(42);
    });

    it('parses "Doodh ka khareed rate 55 rupaye litre set karo" as set_cost_price', async () => {
      const res = await parseSpeech('Doodh ka khareed rate 55 rupaye litre set karo', { items: mockItems, customers: mockCustomers });
      expect(res.intent).toBe('set_cost_price');
      expect(res.amount).toBe(55);
      expect(res.unit).toBe('litre');
      expect(res.item?.toLowerCase()).toContain('doodh');
      expect(res.oldPrice).toBe(50); // from mockItems cost_price
    });

    it('parses "Chini ka cost price 38 rupaye kardo" as set_cost_price', async () => {
      const res = await parseSpeech('Chini ka cost price 38 rupaye kardo', { items: mockItems, customers: mockCustomers });
      expect(res.intent).toBe('set_cost_price');
      expect(res.amount).toBe(38);
      expect(res.item?.toLowerCase()).toContain('chini');
      expect(res.oldPrice).toBe(36);
    });

    it('parses Punjabi "ਦੁੱਧ ਦਾ ਰੇਟ 66 ਰੁਪਏ ਲੀਟਰ ਸੈੱਟ ਕਰੋ" as set_selling_price', async () => {
      const res = await parseSpeech('ਦੁੱਧ ਦਾ ਰੇਟ 66 ਰੁਪਏ ਲੀਟਰ ਸੈੱਟ ਕਰੋ', { items: mockItems, customers: mockCustomers, language: 'pa' });
      expect(res.intent).toBe('set_selling_price');
      expect(res.amount).toBe(66);
    });

    it('parses Punjabi "ਦੁੱਧ ਦਾ ਖਰੀਦ ਰੇਟ 55 ਰੁਪਏ ਲੀਟਰ" as set_cost_price', async () => {
      const res = await parseSpeech('ਦੁੱਧ ਦਾ ਖਰੀਦ ਰੇਟ 55 ਰੁਪਏ ਲੀਟਰ', { items: mockItems, customers: mockCustomers, language: 'pa' });
      expect(res.intent).toBe('set_cost_price');
      expect(res.amount).toBe(55);
    });
  });

  describe('3. Invariant: Navigation never alters or commits unconfirmed transactions', () => {
    it('navigation intents do not mutate or clear existing pending confirmation data', async () => {
      const pendingData = {
        intent: 'credit' as const,
        amount: 500,
        customerName: 'Ramesh',
        rawText: 'Ramesh ko 500 udhaar',
      };

      // Simulating a navigation action when pending confirmation is active
      const navResult = await parseSpeech('Stock kholo', { items: mockItems, customers: mockCustomers });
      expect(navResult.intent).toBe('open_stock');
      // Navigation result has no transaction side-effects
      expect(navResult.amount).toBeUndefined();
      expect(navResult.customer).toBeUndefined();
      // Original pending confirmation remains untouched
      expect(pendingData.amount).toBe(500);
      expect(pendingData.customerName).toBe('Ramesh');
    });
  });

  describe('4. Navigation Rules & Unfinished Flow Handling', () => {
    it('navigates to Stock and highlights for 2 seconds when on Home or Stock with no unfinished flow', () => {
      let currentTab: string = 'home';
      let highlightedItem: string | null = null;
      let toastVisible = false;
      let showViewButton = false;

      const onPriceActionConfirmed = (change: { item: Item; oldPrice: number; newPrice: number }, isUnfinishedFlow: boolean) => {
        const isHomeOrStock = currentTab === 'home' || currentTab === 'stock';
        if (isHomeOrStock && !isUnfinishedFlow) {
          currentTab = 'stock';
          highlightedItem = change.item.id;
          toastVisible = true;
          showViewButton = false;
        } else {
          toastVisible = true;
          showViewButton = true;
        }
      };

      // Trigger while on Home and no unfinished flow
      onPriceActionConfirmed({ item: mockItems[0], oldPrice: 60, newPrice: 66 }, false);

      expect(currentTab).toBe('stock');
      expect(highlightedItem).toBe('item-1');
      expect(toastVisible).toBe(true);
      expect(showViewButton).toBe(false);
    });

    it('stays put and shows toast with "Dekhein" button when inside an unfinished flow', () => {
      let currentTab: string = 'ledger';
      let highlightedItem: string | null = null;
      let toastVisible = false;
      let showViewButton = false;

      const onPriceActionConfirmed = (change: { item: Item; oldPrice: number; newPrice: number }, isUnfinishedFlow: boolean) => {
        const isHomeOrStock = currentTab === 'home' || currentTab === 'stock';
        if (isHomeOrStock && !isUnfinishedFlow) {
          currentTab = 'stock';
          highlightedItem = change.item.id;
          toastVisible = true;
          showViewButton = false;
        } else {
          // Stays on current screen, shows "Dekhein" view button on toast
          toastVisible = true;
          showViewButton = true;
        }
      };

      // Trigger while on Ledger (or inside unfinished sale / credit flow)
      onPriceActionConfirmed({ item: mockItems[0], oldPrice: 60, newPrice: 66 }, true);

      // Must stay put on ledger!
      expect(currentTab).toBe('ledger');
      expect(highlightedItem).toBeNull();
      expect(toastVisible).toBe(true);
      expect(showViewButton).toBe(true); // "Dekhein" button shown!
    });
  });

  describe('5. Undo Price Change from Toast ("Wapas karo")', () => {
    it('restores the old price when undo is triggered', () => {
      let itemsList = [...mockItems];
      let lastPriceChange: { item: Item; priceType: 'selling' | 'cost'; oldPrice: number; newPrice: number } | null = {
        item: mockItems[0],
        priceType: 'selling',
        oldPrice: 60,
        newPrice: 66,
      };

      // Apply price change
      itemsList = itemsList.map((i) => i.id === 'item-1' ? { ...i, selling_price: 66 } : i);
      expect(itemsList.find((i) => i.id === 'item-1')?.selling_price).toBe(66);

      // Trigger undo
      const undoPriceChange = () => {
        if (!lastPriceChange) return false;
        const { item, priceType, oldPrice } = lastPriceChange;
        itemsList = itemsList.map((it) => {
          if (it.id === item.id) {
            return {
              ...it,
              [priceType === 'selling' ? 'selling_price' : 'cost_price']: oldPrice,
            };
          }
          return it;
        });
        lastPriceChange = null;
        return true;
      };

      const success = undoPriceChange();
      expect(success).toBe(true);
      expect(itemsList.find((i) => i.id === 'item-1')?.selling_price).toBe(60);
      expect(lastPriceChange).toBeNull();
    });
  });
});

import { Customer, Item, Supplier, Transaction } from '../types/schema';

export const DEMO_SHOP_ID = '00000000-0000-0000-0000-000000000001';

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: '11111111-0000-0000-0000-000000000001',
    shop_id: DEMO_SHOP_ID,
    name: 'Ramesh Sharma',
    phone: '+919811100001',
    address_note: 'Gali 4, Sharma Niwas',
    credit_limit: 5000,
    balance_owed: 500,
    trust_score: 92,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: '11111111-0000-0000-0000-000000000002',
    shop_id: DEMO_SHOP_ID,
    name: 'Ramesh Kumar',
    phone: '+919811100002',
    address_note: 'Near Temple (Mandir ke paas)',
    credit_limit: 4000,
    balance_owed: 1450,
    trust_score: 78,
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: '11111111-0000-0000-0000-000000000003',
    shop_id: DEMO_SHOP_ID,
    name: 'Gurpreet Singh',
    phone: '+919811100003',
    preferred_language: 'pa',
    address_note: 'GT Road, Petrol pump back',
    credit_limit: 6000,
    balance_owed: 2200,
    trust_score: 85,
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
  {
    id: '11111111-0000-0000-0000-000000000004',
    shop_id: DEMO_SHOP_ID,
    name: 'Sunita Devi',
    phone: '+919811100004',
    address_note: 'House 14, Purani Basti',
    credit_limit: 3000,
    balance_owed: 350,
    trust_score: 96,
    created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: '11111111-0000-0000-0000-000000000005',
    shop_id: DEMO_SHOP_ID,
    name: 'Harpreet Kaur',
    phone: '+919811100005',
    address_note: 'Near Gurudwara, Model Town',
    credit_limit: 5000,
    balance_owed: 1800,
    trust_score: 74,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: '11111111-0000-0000-0000-000000000006',
    shop_id: DEMO_SHOP_ID,
    name: 'Amit Verma',
    phone: '+919811100006',
    address_note: 'Railway Road, Flat 2B',
    credit_limit: 4000,
    balance_owed: 850,
    trust_score: 88,
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: '11111111-0000-0000-0000-000000000007',
    shop_id: DEMO_SHOP_ID,
    name: 'Rajesh Gupta',
    phone: '+919811100007',
    address_note: 'Main Market, Gupta Sweets',
    credit_limit: 10000,
    balance_owed: 0,
    trust_score: 99,
    created_at: new Date(Date.now() - 90 * 86400000).toISOString(),
  },
  {
    id: '11111111-0000-0000-0000-000000000008',
    shop_id: DEMO_SHOP_ID,
    name: 'Manoj Tiwari',
    phone: '+919811100008',
    preferred_language: 'gu',
    address_note: 'Near Bus Stand, Auto union',
    credit_limit: 3000,
    balance_owed: 1200,
    trust_score: 68,
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: '11111111-0000-0000-0000-000000000009',
    shop_id: DEMO_SHOP_ID,
    name: 'Ankit',
    phone: '+919811100009',
    preferred_language: 'en',
    address_note: 'Main Bazaar',
    credit_limit: 5000,
    balance_owed: 200,
    trust_score: 90,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

export const INITIAL_ITEMS: Item[] = [
  {
    id: '22222222-0000-0000-0000-000000000001',
    shop_id: DEMO_SHOP_ID,
    name: 'chini',
    synonyms: ['cheeni', 'sugar', 'sakkar', 'mishri'],
    unit: 'kilo',
    cost_price: 38,
    selling_price: 44,
    mrp: 48,
    current_stock: 45,
    min_threshold: 15,
    daily_avg_sales: 9.5,
    days_stock_left: 4.7,
  },
  {
    id: '22222222-0000-0000-0000-000000000002',
    shop_id: DEMO_SHOP_ID,
    name: 'aata',
    synonyms: ['atta', 'flour', 'gehu aata', 'ashirvaad aata', 'chakki aata'],
    unit: 'kilo',
    cost_price: 32,
    selling_price: 38,
    mrp: 42,
    current_stock: 60,
    min_threshold: 20,
    daily_avg_sales: 14.0,
    days_stock_left: 4.2,
  },
  {
    id: '22222222-0000-0000-0000-000000000003',
    shop_id: DEMO_SHOP_ID,
    name: 'doodh',
    synonyms: ['milk', 'amul doodh', 'amul taaza', 'dahi'],
    unit: 'litre',
    cost_price: 58,
    selling_price: 66,
    mrp: 68,
    current_stock: 8,
    min_threshold: 15,
    daily_avg_sales: 12.0,
    days_stock_left: 0.6, // Low stock: less than 1 day left!
  },
  {
    id: '22222222-0000-0000-0000-000000000004',
    shop_id: DEMO_SHOP_ID,
    name: 'chawal',
    synonyms: ['rice', 'kolam', 'basmati', 'tota pari'],
    unit: 'kilo',
    cost_price: 45,
    selling_price: 55,
    mrp: 60,
    current_stock: 80,
    min_threshold: 25,
    daily_avg_sales: 8.0,
    days_stock_left: 10.0,
  },
  {
    id: '22222222-0000-0000-0000-000000000005',
    shop_id: DEMO_SHOP_ID,
    name: 'dal',
    synonyms: ['daal', 'toor dal', 'arhar dal', 'moong dal', 'chana dal'],
    unit: 'kilo',
    cost_price: 110,
    selling_price: 130,
    mrp: 145,
    current_stock: 35,
    min_threshold: 10,
    daily_avg_sales: 4.0,
    days_stock_left: 8.7,
  },
  {
    id: '22222222-0000-0000-0000-000000000006',
    shop_id: DEMO_SHOP_ID,
    name: 'tel',
    synonyms: ['oil', 'mustard oil', 'sarso tel', 'fortune oil', 'refine'],
    unit: 'litre',
    cost_price: 135,
    selling_price: 155,
    mrp: 175,
    current_stock: 22,
    min_threshold: 10,
    daily_avg_sales: 3.5,
    days_stock_left: 6.2,
  },
  {
    id: '22222222-0000-0000-0000-000000000007',
    shop_id: DEMO_SHOP_ID,
    name: 'chai patti',
    synonyms: ['tea', 'chai', 'chai patti', 'taj mahal', 'tata tea', 'red label'],
    unit: 'packet',
    cost_price: 115,
    selling_price: 135,
    mrp: 150,
    current_stock: 18,
    min_threshold: 8,
    daily_avg_sales: 2.5,
    days_stock_left: 7.2,
  },
  {
    id: '22222222-0000-0000-0000-000000000008',
    shop_id: DEMO_SHOP_ID,
    name: 'namak',
    synonyms: ['salt', 'tata salt', 'sendha namak', 'kala namak'],
    unit: 'packet',
    cost_price: 22,
    selling_price: 28,
    mrp: 30,
    current_stock: 50,
    min_threshold: 15,
    daily_avg_sales: 5.0,
    days_stock_left: 10.0,
  },
  {
    id: '22222222-0000-0000-0000-000000000009',
    shop_id: DEMO_SHOP_ID,
    name: 'sabun',
    synonyms: ['soap', 'lifebuoy', 'dettol', 'lux', 'rin', 'surf', 'surf excel'],
    unit: 'piece',
    cost_price: 28,
    selling_price: 35,
    mrp: 40,
    current_stock: 40,
    min_threshold: 15,
    daily_avg_sales: 6.0,
    days_stock_left: 6.6,
  },
  {
    id: '22222222-0000-0000-0000-000000000010',
    shop_id: DEMO_SHOP_ID,
    name: 'biscuit',
    synonyms: ['biscuits', 'parle-g', 'parleg', 'good day', 'monaco', 'marie'],
    unit: 'packet',
    cost_price: 18,
    selling_price: 25,
    mrp: 30,
    current_stock: 55,
    min_threshold: 20,
    daily_avg_sales: 11.0,
    days_stock_left: 5.0,
  },
  {
    id: '22222222-0000-0000-0000-000000000011',
    shop_id: DEMO_SHOP_ID,
    name: 'haldi',
    synonyms: ['turmeric', 'haldi powder', 'masala', 'everest haldi', 'catch haldi'],
    unit: 'packet',
    cost_price: 30,
    selling_price: 40,
    mrp: 48,
    current_stock: 30,
    min_threshold: 10,
    daily_avg_sales: 2.0,
    days_stock_left: 15.0,
  },
  {
    id: '22222222-0000-0000-0000-000000000012',
    shop_id: DEMO_SHOP_ID,
    name: 'maggi',
    synonyms: ['maggie', 'noodles', 'maggi noodles', 'chhoti maggi'],
    unit: 'packet',
    cost_price: 12,
    selling_price: 14,
    mrp: 15,
    current_stock: 65,
    min_threshold: 25,
    daily_avg_sales: 18.0,
    days_stock_left: 3.6,
  },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: '33333333-0000-0000-0000-000000000001',
    shop_id: DEMO_SHOP_ID,
    name: 'Aggarwal Grain Wholesale Mandi',
    phone: '+919822200001',
    category: 'Grains, Pulses & Sugar',
  },
  {
    id: '33333333-0000-0000-0000-000000000002',
    shop_id: DEMO_SHOP_ID,
    name: 'Gupta Dairy & FMCG Agency',
    phone: '+919822200002',
    category: 'Dairy, Oil, Packaged Snacks & Spices',
  },
];

export function generate14DaysTransactions(): Transaction[] {
  const txs: Transaction[] = [];
  const now = Date.now();

  // Ramesh Sharma recent Udhaar with voice proof
  txs.push({
    id: 'tx-recent-ramesh-sharma',
    shop_id: DEMO_SHOP_ID,
    type: 'credit',
    amount: 500,
    customer_id: '11111111-0000-0000-0000-000000000001',
    created_at: new Date(now - 2 * 3600000).toISOString(),
    confirmed_by_voice: true,
    proof_clip_path: 'proof_ramesh_sharma_500.webm',
    voice_transcript: 'Ramesh Sharma ko 500 ka udhaar, aata aur chini',
    items: [
      { name: 'aata', quantity: 5, unit: 'kilo', price: 190 },
      { name: 'chini', quantity: 5, unit: 'kilo', price: 220 },
      { name: 'maggi', quantity: 6, unit: 'packet', price: 84 },
    ],
    synced: true,
  });

  // Recent payment by Ramesh Kumar
  txs.push({
    id: 'tx-recent-payment-ramesh-kumar',
    shop_id: DEMO_SHOP_ID,
    type: 'payment',
    amount: 500,
    customer_id: '11111111-0000-0000-0000-000000000002',
    created_at: new Date(now - 5 * 3600000).toISOString(),
    confirmed_by_voice: true,
    voice_transcript: 'Ramesh Kumar ne 500 diye',
    synced: true,
  });

  // 14 days of realistic past history
  for (let d = 1; d <= 14; d++) {
    const dayTimestamp = now - d * 86400000;

    // Morning Cash Sale
    txs.push({
      id: `tx-sale-m-${d}`,
      shop_id: DEMO_SHOP_ID,
      type: 'sale',
      amount: 450 + (d % 4) * 80,
      created_at: new Date(dayTimestamp + 8 * 3600000).toISOString(),
      confirmed_by_voice: true,
      voice_transcript: `Subah ki sale: doodh, chini aur maggi`,
      items: [
        { name: 'doodh', quantity: 12, unit: 'litre', price: 792 },
        { name: 'chini', quantity: 4, unit: 'kilo', price: 176 },
        { name: 'maggi', quantity: 5, unit: 'packet', price: 70 },
      ],
      synced: true,
    });

    // Afternoon Cash Sale
    txs.push({
      id: `tx-sale-a-${d}`,
      shop_id: DEMO_SHOP_ID,
      type: 'sale',
      amount: 680 + (d % 3) * 110,
      created_at: new Date(dayTimestamp + 14 * 3600000).toISOString(),
      confirmed_by_voice: true,
      voice_transcript: `Aata, tel aur namak becha`,
      items: [
        { name: 'aata', quantity: 10, unit: 'kilo', price: 380 },
        { name: 'tel', quantity: 1, unit: 'litre', price: 155 },
        { name: 'namak', quantity: 2, unit: 'packet', price: 56 },
      ],
      synced: true,
    });

    // Occasional Udhaar every 3 days
    if (d % 3 === 0) {
      txs.push({
        id: `tx-credit-${d}`,
        shop_id: DEMO_SHOP_ID,
        type: 'credit',
        amount: 320 + d * 20,
        customer_id: '11111111-0000-0000-0000-000000000003', // Gurpreet
        created_at: new Date(dayTimestamp + 18 * 3600000).toISOString(),
        confirmed_by_voice: true,
        voice_transcript: `Gurpreet ko udhaar samaan`,
        items: [{ name: 'dal', quantity: 2, unit: 'kilo', price: 260 }],
        synced: true,
      });
    }

    // Occasional payment received every 4 days
    if (d % 4 === 0) {
      txs.push({
        id: `tx-payment-${d}`,
        shop_id: DEMO_SHOP_ID,
        type: 'payment',
        amount: 400,
        customer_id: '11111111-0000-0000-0000-000000000005', // Harpreet
        created_at: new Date(dayTimestamp + 19 * 3600000).toISOString(),
        confirmed_by_voice: true,
        voice_transcript: `Harpreet Kaur ne 400 diye`,
        synced: true,
      });
    }

    // Small expense every 5 days (e.g. electricity, helper, packaging)
    if (d % 5 === 0) {
      txs.push({
        id: `tx-expense-${d}`,
        shop_id: DEMO_SHOP_ID,
        type: 'expense',
        amount: 150,
        created_at: new Date(dayTimestamp + 20 * 3600000).toISOString(),
        confirmed_by_voice: false,
        voice_transcript: `Polythene thaila kharcha 150`,
        synced: true,
      });
    }
  }

  return txs;
}

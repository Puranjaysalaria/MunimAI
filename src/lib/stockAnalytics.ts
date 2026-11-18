import { Item, Supplier, Transaction } from '../types/schema';

export interface ItemStockAnalysis {
  item: Item;
  totalSold14Days: number;
  dailyAvgSales: number;
  daysStockLeft: number;
  isLowStock: boolean;
  isCritical: boolean;
  suggestedReorderQty: number;
  estimatedReorderCost: number;
}

export interface SupplierOrderDraft {
  supplier: Supplier;
  items: Array<{
    item: Item;
    suggestedQty: number;
    unit: string;
    unitCost: number;
    totalCost: number;
  }>;
  totalEstimatedCost: number;
}

export interface DailySummaryMetrics {
  totalSales: number;
  creditGiven: number;
  cashCollected: number;
  expenses: number;
  grossRevenue: number;
  estimatedProfit: number;
  transactionCount: number;
}

/**
 * Computes 14-day daily sales run rate and days of stock remaining for each item
 */
export function compute14DayStockAnalysis(
  items: Item[],
  transactions: Transaction[]
): ItemStockAnalysis[] {
  const now = Date.now();
  const fourteenDaysAgo = now - 14 * 86400000;

  // Filter transactions within the last 14 days
  const recentTxs = transactions.filter(
    (t) => new Date(t.created_at).getTime() >= fourteenDaysAgo
  );

  return items.map((item) => {
    const itemNames = [
      item.name.toLowerCase(),
      ...item.synonyms.map((s) => s.toLowerCase()),
    ];

    // Calculate total quantity sold over past 14 days
    let totalSold = 0;
    for (const tx of recentTxs) {
      if ((tx.type === 'sale' || tx.type === 'credit') && tx.items) {
        for (const it of tx.items) {
          const match =
            it.item_id === item.id ||
            itemNames.includes(it.name.toLowerCase());
          if (match && it.quantity > 0) {
            totalSold += it.quantity;
          }
        }
      }
    }

    // Daily average sales: fallback to item.daily_avg_sales if no transactions in test/mock
    const rawDailyAvg = totalSold > 0 ? totalSold / 14 : (item.daily_avg_sales || 2);
    const dailyAvgSales = Math.max(0.1, Number(rawDailyAvg.toFixed(1)));

    // Days of stock left
    const daysStockLeft = Number((item.current_stock / dailyAvgSales).toFixed(1));
    const isCritical = daysStockLeft < 2;
    const isLowStock = isCritical || item.current_stock <= item.min_threshold;

    // Target 7 days buffer for reordering
    const target7DaysStock = Math.ceil(dailyAvgSales * 7);
    const suggestedReorderQty = Math.max(
      0,
      target7DaysStock - item.current_stock
    );
    const estimatedReorderCost = suggestedReorderQty * item.cost_price;

    return {
      item,
      totalSold14Days: totalSold,
      dailyAvgSales,
      daysStockLeft,
      isLowStock,
      isCritical,
      suggestedReorderQty,
      estimatedReorderCost,
    };
  });
}

/**
 * Supplier mapping table for Kirana items
 */
const SUPPLIER_CATEGORY_MAPPING: Record<string, string[]> = {
  // Aggarwal Grain Wholesale Mandi
  '33333333-0000-0000-0000-000000000001': [
    'chini',
    'cheeni',
    'sugar',
    'aata',
    'atta',
    'flour',
    'chawal',
    'rice',
    'dal',
    'daal',
  ],
  // Gupta Dairy & FMCG Agency
  '33333333-0000-0000-0000-000000000002': [
    'doodh',
    'milk',
    'tel',
    'oil',
    'chai patti',
    'tea',
    'namak',
    'salt',
    'sabun',
    'soap',
    'biscuit',
    'haldi',
    'maggi',
  ],
};

/**
 * Groups items needing restock by supplier
 */
export function groupOrdersBySupplier(
  itemsAnalysis: ItemStockAnalysis[],
  suppliers: Supplier[]
): SupplierOrderDraft[] {
  const drafts: SupplierOrderDraft[] = [];

  for (const supplier of suppliers) {
    const allowedCategories = SUPPLIER_CATEGORY_MAPPING[supplier.id] || [];

    const supplierItems = itemsAnalysis.filter((analysis) => {
      const itemName = analysis.item.name.toLowerCase();
      const belongsToSupplier =
        allowedCategories.includes(itemName) ||
        analysis.item.synonyms.some((s) => allowedCategories.includes(s.toLowerCase()));
      // Include if low stock or suggested reorder > 0
      return belongsToSupplier && (analysis.isLowStock || analysis.suggestedReorderQty > 0);
    });

    const items = supplierItems.map((analysis) => {
      // Reorder quantity: at least 7 days buffer or minimum threshold batch
      const qty =
        analysis.suggestedReorderQty > 0
          ? analysis.suggestedReorderQty
          : Math.ceil(analysis.dailyAvgSales * 5);

      return {
        item: analysis.item,
        suggestedQty: qty,
        unit: analysis.item.unit,
        unitCost: analysis.item.cost_price,
        totalCost: qty * analysis.item.cost_price,
      };
    });

    const totalEstimatedCost = items.reduce((sum, it) => sum + it.totalCost, 0);

    drafts.push({
      supplier,
      items,
      totalEstimatedCost,
    });
  }

  return drafts;
}

/**
 * Computes financial metrics for today's transactions
 */
export function computeDailySummary(transactions: Transaction[]): DailySummaryMetrics {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayTxs = transactions.filter(
    (t) => new Date(t.created_at).getTime() >= todayStart.getTime()
  );

  const totalSales = todayTxs
    .filter((t) => t.type === 'sale')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const creditGiven = todayTxs
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const cashCollected = todayTxs
    .filter((t) => t.type === 'payment')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expenses = todayTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const grossRevenue = totalSales + cashCollected;

  // Compute profit: 15% estimated average gross margin on kirana sales minus expenses
  const estimatedProfit = Math.max(
    0,
    Math.round((totalSales + creditGiven) * 0.15 - expenses)
  );

  return {
    totalSales,
    creditGiven,
    cashCollected,
    expenses,
    grossRevenue,
    estimatedProfit,
    transactionCount: todayTxs.length,
  };
}

export const ITEM_INDIC_NAMES: Record<string, { hi: string; pa: string }> = {
  chini: { hi: 'चीनी', pa: 'ਖੰਡ' },
  aata: { hi: 'आटा', pa: 'ਆਟਾ' },
  doodh: { hi: 'दूध', pa: 'ਦੁੱਧ' },
  chawal: { hi: 'चावल', pa: 'ਚੌਲ' },
  dal: { hi: 'दाल', pa: 'ਦਾਲ' },
  tel: { hi: 'तेल', pa: 'ਤੇਲ' },
  'chai patti': { hi: 'चाय पत्ती', pa: 'ਚਾਹ ਪੱਤੀ' },
  namak: { hi: 'नमक', pa: 'ਨਮਕ' },
  sabun: { hi: 'साबुन', pa: 'ਸਾਬਣ' },
  biscuit: { hi: 'बिस्कुट', pa: 'ਬਿਸਕੁਟ' },
  haldi: { hi: 'हल्दी', pa: 'ਹਲਦੀ' },
  maggi: { hi: 'मैगी', pa: 'ਮੈਗੀ' },
};

/**
 * Generates spoken response for Stock inquiries in Hindi, Punjabi, or English
 */
export function generateStockVoiceReply(
  analysis: ItemStockAnalysis,
  language: string = 'hi'
): string {
  const { item, daysStockLeft, isCritical } = analysis;
  const indic = ITEM_INDIC_NAMES[item.name.toLowerCase()];
  const displayName =
    language === 'hi' && indic?.hi
      ? indic.hi
      : language === 'pa' && indic?.pa
      ? indic.pa
      : item.name;

  if (language === 'pa') {
    if (isCritical) {
      return `${displayName} ਦਾ ਸਟਾਕ ਖ਼ਤਮ ਹੋਣ ਵਾਲਾ ਹੈ! ਸਿਰਫ਼ ${daysStockLeft} ਦਿਨ (${item.current_stock} ${item.unit}) ਬਚਿਆ ਹੈ। ਸਪਲਾਇਰ ਤੋਂ ਨਵਾਂ ਮਾਲ ਮੰਗਵਾ ਲਵੋ।`;
    }
    return `${displayName} ਦਾ ਸਟਾਕ ਠੀਕ ਹੈ, ਲਗਭਗ ${daysStockLeft} ਦਿਨ (${item.current_stock} ${item.unit}) ਚੱਲੇਗਾ।`;
  }

  if (language === 'en') {
    if (isCritical) {
      return `${item.name} stock is critically low! Only ${daysStockLeft} days (${item.current_stock} ${item.unit}) left. Supplier reorder recommended.`;
    }
    return `${item.name} stock is sufficient. Approximately ${daysStockLeft} days (${item.current_stock} ${item.unit}) remaining.`;
  }

  // Hindi default
  if (isCritical) {
    return `${displayName} का स्टॉक खत्म होने वाला है! सिर्फ ${daysStockLeft} दिन (${item.current_stock} ${item.unit}) बचा है। सप्लायर से तुरंत नया माल मंगवाने की सलाह है।`;
  }
  return `${displayName} का स्टॉक पर्याप्त है, लगभग ${daysStockLeft} दिन (${item.current_stock} ${item.unit}) का माल बाकी है।`;
}

/**
 * Generates spoken voice script for daily summary
 */
export function generateDailySummaryVoice(
  summary: DailySummaryMetrics,
  language: string = 'hi'
): string {
  const { totalSales, creditGiven, cashCollected, estimatedProfit } = summary;

  if (language === 'pa') {
    return `ਅੱਜ ਦੀ ਕੁੱਲ ਵਿਕਰੀ ₹${totalSales} ਹੋਈ, ਜਿਸ ਵਿੱਚ ₹${creditGiven} ਉਧਾਰ ਅਤੇ ₹${cashCollected} ਪੁਰਾਣਾ ਉਧਾਰ ਵਾਪਸ ਆਇਆ। ਅੰਦਾਜ਼ਨ ਮੁਨਾਫ਼ਾ ਲਗਭਗ ₹${estimatedProfit} ਹੈ।`;
  }

  if (language === 'en') {
    return `Today's sales are ₹${totalSales}, with ₹${creditGiven} given on credit. ₹${cashCollected} old credit was collected, and estimated profit is ₹${estimatedProfit}.`;
  }

  // Hindi default
  return `आज की नकद बिक्री ₹${totalSales} हुई, ₹${creditGiven} उधार दिया गया, और ₹${cashCollected} पुराना उधार वापस मिला। आज का अनुमानित मुनाफा ₹${estimatedProfit} है।`;
}

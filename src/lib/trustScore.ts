import { Customer, Transaction } from '../types/schema';

export interface TrustScoreDetails {
  score: number; // 0 - 100
  tier: 'excellent' | 'good' | 'moderate' | 'high_risk';
  tierLabelHi: string;
  tierLabelPa: string;
  tierLabelEn: string;
  badgeColor: string;
  repaymentRatio: number;
}

/**
 * Computes customer trust score dynamically based on repayment speed and credit utilization
 */
export function calculateCustomerTrustScore(
  customer: Customer,
  transactions: Transaction[]
): TrustScoreDetails {
  const customerTxs = transactions.filter((t) => t.customer_id === customer.id);

  // Total credit borrowed vs total repaid
  const totalBorrowed = customerTxs
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalRepaid = customerTxs
    .filter((t) => t.type === 'payment')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const repaymentRatio = totalBorrowed > 0 ? totalRepaid / totalBorrowed : 1.0;

  // Credit limit utilization ratio
  const utilizationRatio =
    customer.credit_limit > 0 ? customer.balance_owed / customer.credit_limit : 0;

  // Compute base score
  let score = 80;
  if (repaymentRatio >= 0.8) score += 15;
  else if (repaymentRatio >= 0.5) score += 5;
  else score -= 20;

  if (utilizationRatio > 1.0) score -= 30; // Over limit
  else if (utilizationRatio > 0.8) score -= 15;
  else if (utilizationRatio < 0.3) score += 10;

  score = Math.max(10, Math.min(100, Math.round(score)));

  let tier: 'excellent' | 'good' | 'moderate' | 'high_risk' = 'moderate';
  let tierLabelHi = 'मध्यम भरोसा';
  let tierLabelPa = 'ਠੀਕ ਭਰੋਸਾ';
  let tierLabelEn = 'Moderate Trust';
  let badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';

  if (score >= 90) {
    tier = 'excellent';
    tierLabelHi = 'उत्कृष्ट ग्राहक';
    tierLabelPa = 'ਬਹੁਤ ਭਰੋਸੇਮੰਦ';
    tierLabelEn = 'Excellent Trust';
    badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
  } else if (score >= 75) {
    tier = 'good';
    tierLabelHi = 'विश्वसनीय';
    tierLabelPa = 'ਭਰੋਸੇਯੋਗ';
    tierLabelEn = 'Good Trust';
    badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
  } else if (score < 60) {
    tier = 'high_risk';
    tierLabelHi = 'जोखिम भरा खाता';
    tierLabelPa = 'ਖ਼ਤਰਨਾਕ ਖਾਤਾ';
    tierLabelEn = 'High Risk';
    badgeColor = 'bg-red-100 text-red-800 border-red-200';
  }

  return {
    score,
    tier,
    tierLabelHi,
    tierLabelPa,
    tierLabelEn,
    badgeColor,
    repaymentRatio: Number(repaymentRatio.toFixed(2)),
  };
}

/**
 * Checks if a pending udhaar will exceed the customer's credit limit
 */
export function checkCreditLimitWarning(
  customer: Customer,
  pendingAmount: number
): {
  isExceeded: boolean;
  projectedBalance: number;
  creditLimit: number;
  excessAmount: number;
  warningTextHi: string;
} {
  const projectedBalance = Number(customer.balance_owed) + pendingAmount;
  const isExceeded = projectedBalance > customer.credit_limit;
  const excessAmount = Math.max(0, projectedBalance - customer.credit_limit);

  return {
    isExceeded,
    projectedBalance,
    creditLimit: customer.credit_limit,
    excessAmount,
    warningTextHi: isExceeded
      ? `चेतावनी: ₹${pendingAmount} उधार देने पर कुल बाकी ₹${projectedBalance} हो जाएगी, जो तय सीमा (₹${customer.credit_limit}) से ₹${excessAmount} ज़्यादा है!`
      : '',
  };
}

import { Customer, Reminder, Shop } from '../types/schema';

export interface DraftReminder {
  customer: Customer;
  amount: number;
  messageText: string;
  upiLink: string;
  language: string;
}

/**
 * Generates an Indian NPCI compliant UPI Payment Deep Link
 */
export function generateUPILink(
  upiId: string,
  shopName: string,
  amount: number
): string {
  const cleanUpi = upiId.trim() || 'sharmakirana@okaxis';
  const cleanName = encodeURIComponent(shopName.trim() || 'Kirana Store');
  const cleanNote = encodeURIComponent('Kirana Udhaar Payment');
  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${amount}&cu=INR&tn=${cleanNote}`;
}

/**
 * Formulates a polite, respectful debt recovery message in the customer's preferred language
 */
export function generateReminderMessage(params: {
  customerName: string;
  shopName: string;
  amount: number;
  upiLink: string;
  language?: string;
}): string {
  const { customerName, shopName, amount, upiLink, language = 'hi' } = params;

  if (language === 'pa') {
    return (
      `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ${customerName} ਜੀ,\n` +
      `${shopName} ਤੋਂ ਤੁਹਾਡਾ ਪੁਰਾਣਾ ਬਾਕੀ ਹਿਸਾਬ ₹${amount} ਹੈ।\n` +
      `ਤੁਸੀਂ ਇਸ UPI ਲਿੰਕ 'ਤੇ ਕਲਿੱਕ ਕਰਕੇ ਆਸਾਨੀ ਨਾਲ ਭੁਗਤਾਨ ਕਰ ਸਕਦੇ ਹੋ:\n` +
      `${upiLink}\n\n` +
      `ਕਿਰਪਾ ਕਰਕੇ ਭੁਗਤਾਨ ਕਰਕੇ ਸਾਨੂੰ ਸੂਚਿਤ ਕਰੋ। ਧੰਨਵਾਦ!`
    );
  }

  if (language === 'en') {
    return (
      `Hello ${customerName},\n` +
      `This is a friendly reminder from ${shopName} regarding your pending balance of ₹${amount}.\n` +
      `You can conveniently pay via UPI using the link below:\n` +
      `${upiLink}\n\n` +
      `Please let us know once paid. Thank you!`
    );
  }

  // Hindi default
  return (
    `नमस्ते ${customerName} जी,\n` +
    `${shopName} से आपका पुराना बकाया हिसाब ₹${amount} है।\n` +
    `सुविधा के लिए आप सीधे नीचे दिए गए UPI लिंक द्वारा भुगतान कर सकते हैं:\n` +
    `${upiLink}\n\n` +
    `भुगतान के बाद हमें अवश्य बताएं। धन्यवाद!`
  );
}

/**
 * Finds all customers who owe more than the threshold (default: ₹1000)
 */
export function getRecoveryCustomers(
  customers: Customer[],
  thresholdAmount: number = 1000
): Customer[] {
  return customers
    .filter((c) => Number(c.balance_owed) >= thresholdAmount)
    .sort((a, b) => Number(b.balance_owed) - Number(a.balance_owed));
}

/**
 * Builds list of draft reminders with personalized language & UPI links
 */
export function buildDraftReminders(
  customers: Customer[],
  shop: Shop,
  thresholdAmount: number = 1000
): DraftReminder[] {
  const eligible = getRecoveryCustomers(customers, thresholdAmount);

  return eligible.map((customer) => {
    const upiLink = generateUPILink(
      shop.upi_id || 'sharmakirana@okaxis',
      shop.name,
      customer.balance_owed
    );

    const messageText = generateReminderMessage({
      customerName: customer.name,
      shopName: shop.name,
      amount: customer.balance_owed,
      upiLink,
      language: customer.preferred_language || 'hi',
    });

    return {
      customer,
      amount: customer.balance_owed,
      messageText,
      upiLink,
      language: customer.preferred_language || 'hi',
    };
  });
}

/**
 * Convert draft to persisted reminder entity
 */
export function createReminderRecord(
  draft: DraftReminder,
  shopId: string,
  status: 'sent' | 'pending' = 'sent'
): Reminder {
  return {
    id: `rem-${Date.now()}-${draft.customer.id.slice(0, 6)}`,
    shop_id: shopId,
    customer_id: draft.customer.id,
    customer_name: draft.customer.name,
    customer_phone: draft.customer.phone,
    amount: draft.amount,
    message_text: draft.messageText,
    language: draft.language,
    upi_link: draft.upiLink,
    status,
    sent_at: status === 'sent' ? new Date().toISOString() : undefined,
    created_at: new Date().toISOString(),
  };
}

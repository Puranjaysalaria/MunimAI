import { Customer, Reminder, ReminderSettings, ReminderTone, Shop } from '../types/schema';

export interface DraftReminder {
  customer: Customer;
  amount: number;
  messageText: string;
  upiLink: string | null;
  language: string;
  tone: ReminderTone;
  isSentToday: boolean;
  isDoNotRemind: boolean;
  isHighTrustExempt: boolean;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  default_threshold: 1000,
  message_tone: 'polite',
  send_channel: 'whatsapp_first_sms_fallback',
  include_upi_link: true,
  schedule: 'manual',
  auto_filter_high_trust: false,
  quiet_hours_start: '21:00',
  quiet_hours_end: '08:00',
};

/**
 * Languages that are production standard but recommended for local native speaker review
 */
export const NATIVE_REVIEW_LANGUAGES = ['gu', 'mr', 'bn', 'ta', 'te', 'kn', 'ml'];

/**
 * Generates an Indian NPCI compliant UPI Payment Deep Link
 * Returns null if upiId is blank
 */
export function generateUPILink(
  upiId: string | undefined | null,
  shopName: string,
  amount: number
): string | null {
  if (!upiId || !upiId.trim()) return null;
  const cleanUpi = upiId.trim();
  const cleanName = encodeURIComponent(shopName.trim() || 'Kirana Store');
  const cleanNote = encodeURIComponent('Kirana Udhaar Payment');
  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${amount}&cu=INR&tn=${cleanNote}`;
}

/**
 * Check if the given time falls within shopkeeper configured quiet hours (e.g. 21:00 to 08:00)
 */
export function isQuietHours(
  now: Date = new Date(),
  start: string = '21:00',
  end: string = '08:00'
): boolean {
  const [startHour, startMin] = (start || '21:00').split(':').map(Number);
  const [endHour, endMin] = (end || '08:00').split(':').map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + (startMin || 0);
  const endMinutes = endHour * 60 + (endMin || 0);

  if (startMinutes > endMinutes) {
    // Crosses midnight: e.g. 21:00 (1260) to 08:00 (480)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Check if a reminder was already sent to this customer today in local time
 */
export function hasSentReminderToday(
  lastRemindedAt?: string | null,
  now: Date = new Date()
): boolean {
  if (!lastRemindedAt) return false;
  const remindedDate = new Date(lastRemindedAt);
  if (isNaN(remindedDate.getTime())) return false;

  return (
    remindedDate.getFullYear() === now.getFullYear() &&
    remindedDate.getMonth() === now.getMonth() &&
    remindedDate.getDate() === now.getDate()
  );
}

/**
 * Checks customer eligibility based on safety rules:
 * 1. do_not_remind flag
 * 2. Daily cap (1 reminder per customer per day)
 * 3. High-trust exemption: only exempt if customer has an actual trust_score >= 90. Customers with no score are never exempt.
 * 4. Balance threshold
 */
export function evaluateCustomerReminderEligibility(
  customer: Customer,
  settings: ReminderSettings,
  threshold: number,
  now: Date = new Date()
): {
  eligible: boolean;
  reason?: 'do_not_remind' | 'below_threshold' | 'sent_today' | 'high_trust_exempt';
} {
  if (customer.do_not_remind) {
    return { eligible: false, reason: 'do_not_remind' };
  }

  if (Number(customer.balance_owed) < threshold) {
    return { eligible: false, reason: 'below_threshold' };
  }

  if (hasSentReminderToday(customer.last_reminded_at, now)) {
    return { eligible: false, reason: 'sent_today' };
  }

  // VIP Exemption: only exempt if score is strictly defined and >= 90
  const hasTrustScore = customer.trust_score !== undefined && customer.trust_score !== null;
  if (settings.auto_filter_high_trust && hasTrustScore && customer.trust_score! >= 90) {
    return { eligible: false, reason: 'high_trust_exempt' };
  }

  return { eligible: true };
}

type TemplateVariant = 'with_upi' | 'without_upi';

interface TemplateSet {
  polite: Record<TemplateVariant, string>;
  standard: Record<TemplateVariant, string>;
  firm: Record<TemplateVariant, string>;
}

/**
 * 60 Handcrafted commercial templates across all 10 languages:
 * 10 languages x 3 tones x 2 UPI variants (with UPI and without UPI)
 * All "Firm (दृढ़)" messages are purely factual and respectful (no threats, no shaming).
 */
const TEMPLATES: Record<string, TemplateSet> = {
  hi: {
    polite: {
      with_upi: 'नमस्ते {customerName} जी, आशा है आप सकुशल हैं। {shopName} से आपका ₹{amount} का उधारी हिसाब शेष है। आप सुविधा के लिए सीधे नीचे दिए गए UPI लिंक द्वारा भुगतान कर सकते हैं:\n{upiLink}\n\nभुगतान के बाद हमें अवश्य सूचित करें। धन्यवाद!',
      without_upi: 'नमस्ते {customerName} जी, आशा है आप सकुशल हैं। {shopName} से आपका ₹{amount} का उधारी हिसाब शेष है। कृपया अपनी अगली दुकान यात्रा पर इसे चुकता करने का कष्ट करें। धन्यवाद!',
    },
    standard: {
      with_upi: 'नमस्ते {customerName} जी, {shopName} पर आपका कुल बकाया ₹{amount} है। कृपया नीचे दिए गए UPI लिंक का उपयोग करके हिसाब चुकता करें:\n{upiLink}\n\nधन्यवाद!',
      without_upi: 'नमस्ते {customerName} जी, {shopName} पर आपका कुल बकाया ₹{amount} है। कृपया दुकान पर आकर या संपर्क करके हिसाब चुकता करें। धन्यवाद!',
    },
    firm: {
      with_upi: 'सादर {customerName} जी, {shopName} के बहीखाते के अनुसार आपका ₹{amount} का बकाया हिसाब पिछले कुछ समय से लंबित है। कृपया हिसाब को अद्यतन रखने हेतु नीचे दिए गए UPI लिंक द्वारा भुगतान करें:\n{upiLink}\n\nसहयोग के लिए धन्यवाद।',
      without_upi: 'सादर {customerName} जी, {shopName} के बहीखाते के अनुसार आपका ₹{amount} का बकाया हिसाब पिछले कुछ समय से लंबित है। कृपया दुकान पर संपर्क कर हिसाब चुकता करने की कृपा करें। सहयोग के लिए धन्यवाद।',
    },
  },
  pa: {
    polite: {
      with_upi: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ {customerName} ਜੀ, {shopName} ਵੱਲੋਂ ਤੁਹਾਡਾ ₹{amount} ਦਾ ਪੁਰਾਣਾ ਬਾਕੀ ਹਿਸਾਬ ਹੈ। ਤੁਸੀਂ ਇਸ UPI ਲਿੰਕ ਰਾਹੀਂ ਆਸਾਨੀ ਨਾਲ ਭੁਗਤਾਨ ਕਰ ਸਕਦੇ ਹੋ:\n{upiLink}\n\nਕਿਰਪਾ ਕਰਕੇ ਭੁਗਤਾਨ ਕਰਕੇ ਸਾਨੂੰ ਸੂਚਿਤ ਕਰੋ। ਧੰਨਵਾਦ!',
      without_upi: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ {customerName} ਜੀ, {shopName} ਵੱਲੋਂ ਤੁਹਾਡਾ ₹{amount} ਦਾ ਪੁਰਾਣਾ ਬਾਕੀ ਹਿਸਾਬ ਹੈ। ਜਦੋਂ ਵੀ ਸਮਾਂ ਮਿਲੇ ਦੁਕਾਨ ਤੇ ਆ ਕੇ ਹਿਸਾਬ ਸਾਫ਼ ਕਰ ਦੇਣਾ ਜੀ। ਧੰਨਵਾਦ!',
    },
    standard: {
      with_upi: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ {customerName} ਜੀ, {shopName} ਦਾ ਕੁੱਲ ਬਕਾਇਆ ₹{amount} ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਹੇਠਾਂ ਦਿੱਤੇ UPI ਲਿੰਕ ਰਾਹੀਂ ਭੁਗਤਾਨ ਕਰੋ:\n{upiLink}\n\nਧੰਨਵਾਦ!',
      without_upi: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ {customerName} ਜੀ, {shopName} ਦਾ ਕੁੱਲ ਬਕਾਇਆ ₹{amount} ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਕਾਨ ਤੇ ਆ ਕੇ ਆਪਣਾ ਹਿਸਾਬ ਚੁਕਤਾ ਕਰੋ ਜੀ। ਧੰਨਵਾਦ!',
    },
    firm: {
      with_upi: 'ਜ਼ਰੂਰੀ ਬੇਨਤੀ {customerName} ਜੀ, {shopName} ਦੇ ਖਾਤੇ ਅਨੁਸਾਰ ਤੁਹਾਡਾ ₹{amount} ਦਾ ਬਕਾਇਆ ਹਿਸਾਬ ਕਾਫ਼ੀ ਸਮੇਂ ਤੋਂ ਲੰਬਿਤ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਇਸ UPI ਲਿੰਕ ਰਾਹੀਂ ਹਿਸਾਬ ਪੂਰਾ ਕਰਨ ਦੀ ਕ੍ਰਿਪਾਲਤਾ ਕਰੋ:\n{upiLink}\n\nਸਹਿਯੋਗ ਲਈ ਧੰਨਵਾਦ।',
      without_upi: 'ਜ਼ਰੂਰੀ ਬੇਨਤੀ {customerName} ਜੀ, {shopName} ਦੇ ਖਾਤੇ ਅਨੁਸਾਰ ਤੁਹਾਡਾ ₹{amount} ਦਾ ਬਕਾਇਆ ਹਿਸਾਬ ਕਾਫ਼ੀ ਸਮੇਂ ਤੋਂ ਲੰਬਿਤ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਦੁਕਾਨ ਤੇ ਆ ਕੇ ਹਿਸਾਬ ਸਾਫ਼ ਕਰਨ ਦੀ ਕ੍ਰਿਪਾਲਤਾ ਕਰੋ ਜੀ। ਸਹਿਯੋਗ ਲਈ ਧੰਨਵਾਦ।',
    },
  },
  en: {
    polite: {
      with_upi: 'Hello {customerName}, hope you are doing well. This is a friendly reminder from {shopName} regarding your pending balance of ₹{amount}. You can conveniently pay using the UPI link below:\n{upiLink}\n\nPlease let us know once paid. Thank you!',
      without_upi: 'Hello {customerName}, hope you are doing well. This is a friendly reminder from {shopName} regarding your pending balance of ₹{amount}. Please clear it at your convenience on your next visit. Thank you!',
    },
    standard: {
      with_upi: 'Hello {customerName}, a friendly reminder from {shopName} regarding your pending balance of ₹{amount}. Kindly make the payment using this UPI link:\n{upiLink}\n\nThank you!',
      without_upi: 'Hello {customerName}, a friendly reminder from {shopName} regarding your pending balance of ₹{amount}. Please visit the store to settle your account. Thank you!',
    },
    firm: {
      with_upi: 'Dear {customerName}, as per the accounts at {shopName}, an outstanding balance of ₹{amount} has been pending for some time. We request you to kindly clear this amount using the UPI link below:\n{upiLink}\n\nThank you for your cooperation.',
      without_upi: 'Dear {customerName}, as per the accounts at {shopName}, an outstanding balance of ₹{amount} has been pending for some time. We request you to kindly visit the store to settle your balance. Thank you for your cooperation.',
    },
  },
  gu: {
    polite: {
      with_upi: 'નમસ્તે {customerName} જી, {shopName} તરફથી આપનો ₹{amount} નો બાકી હિસાબ છે. આપ સરળતાથી નીચે આપેલ UPI લિંક દ્વારા ચુકવણી કરી શકો છો:\n{upiLink}\n\nચુકવણી પછી અમને જણાવશો. આભાર!',
      without_upi: 'નમસ્તે {customerName} જી, {shopName} તરફથી આપનો ₹{amount} નો બાકી હિસાબ છે. અનુકૂળતા મુજબ દુકાને આવી હિસાબ ચૂકતે કરશો. આભાર!',
    },
    standard: {
      with_upi: 'નમસ્તે {customerName} જી, {shopName} પર આપનો કુલ બાકી હિસાબ ₹{amount} છે. કૃપા કરીને આ UPI લિંક દ્વારા ચુકવણી કરો:\n{upiLink}\n\nઆભાર!',
      without_upi: 'નમસ્તે {customerName} જી, {shopName} પર આપનો કુલ બાકી હિસાબ ₹{amount} છે. કૃપા કરીને દુકાને આવી હિસાબ ચૂકતે કરશો. આભાર!',
    },
    firm: {
      with_upi: 'નમ્ર વિનંતી {customerName} જી, {shopName} ના ચોપડે આપનો ₹{amount} નો હિસાબ ઘણા સમયથી બાકી છે. કૃપા કરી નીચેની લિંક પરથી ચૂકવણી કરવા વિનંતી:\n{upiLink}\n\nસહકાર બદલ આભાર.',
      without_upi: 'નમ્ર વિનંતી {customerName} જી, {shopName} ના ચોપડે આપનો ₹{amount} નો હિસાબ ઘણા સમયથી બાકી છે. કૃપા કરી દુકાને આવી હિસાબ ચૂકતે કરવા વિનંતી. સહકાર બદલ આભાર.',
    },
  },
  mr: {
    polite: {
      with_upi: 'नमस्कार {customerName} जी, {shopName} कडून आपली ₹{amount} उधारी बाकी आहे. सोयीसाठी आपण खालील UPI लिंकद्वारे पैसे भरू शकता:\n{upiLink}\n\nपैसे भरल्यावर कृपया कळवावे. धन्यवाद!',
      without_upi: 'नमस्कार {customerName} जी, {shopName} कडून आपली ₹{amount} उधारी बाकी आहे. सोयीनुसार दुकानात येऊन हिशोब पूर्ण करावा. धन्यवाद!',
    },
    standard: {
      with_upi: 'नमस्कार {customerName} जी, {shopName} वर आपली ₹{amount} बाकी आहे. कृपया खालील UPI लिंकवरून रक्कम भरावी:\n{upiLink}\n\nधन्यवाद!',
      without_upi: 'नमस्कार {customerName} जी, {shopName} वर आपली ₹{amount} बाकी आहे. कृपया दुकानात येऊन हिशोब चुकता करावा. धन्यवाद!',
    },
    firm: {
      with_upi: 'सस्नेह नमस्कार {customerName} जी, {shopName} च्या नोंदीनुसार आपली ₹{amount} रक्कम बऱ्याच काळापासून प्रलंबित आहे. कृपया खालील UPI लिंकद्वारे हिशोब पूर्ण करावा:\n{upiLink}\n\nसहकार्याबद्दल धन्यवाद.',
      without_upi: 'सस्नेह नमस्कार {customerName} जी, {shopName} च्या नोंदीनुसार आपली ₹{amount} रक्कम बऱ्याच काळापासून प्रलंबित आहे. कृपया दुकानात येऊन हिशोब पूर्ण करावा. सहकार्याबद्दल धन्यवाद.',
    },
  },
  bn: {
    polite: {
      with_upi: 'নমস্কার {customerName} বাবু, {shopName} থেকে আপনার ₹{amount} বাকি রয়েছে। আপনি সুবিধার জন্য নিচের UPI লিঙ্ক দিয়ে পরিশোধ করতে পারেন:\n{upiLink}\n\nপেমেন্টের পরে অনুগ্রহ করে জানাবেন। ধন্যবাদ!',
      without_upi: 'নমস্কার {customerName} বাবু, {shopName} থেকে আপনার ₹{amount} বাকি রয়েছে। সময়মতো দোকানে এসে হিসেব মিটিয়ে দেওয়ার অনুরোধ রইল। ধন্যবাদ!',
    },
    standard: {
      with_upi: 'নমস্কার {customerName} বাবু, {shopName}-এ আপনার মোট বাকি ₹{amount}। অনুগ্রহ করে এই UPI লিঙ্কের মাধ্যমে পরিশোধ করুন:\n{upiLink}\n\nধন্যবাদ!',
      without_upi: 'নমস্কার {customerName} বাবু, {shopName}-এ আপনার মোট বাকি ₹{amount}। অনুগ্রহ করে দোকানে এসে বাকি পরিশোধ করুন। ধন্যবাদ!',
    },
    firm: {
      with_upi: 'শ্রদ্ধেয় {customerName} বাবু, {shopName}-এর খাতা অনুযায়ী আপনার ₹{amount} বাকি বেশ কিছুদিন ধরে অনিষ্পন্ন রয়েছে। অনুগ্রহ করে নিচে দেওয়া UPI লিঙ্কের মাধ্যমে পরিশোধ করুন:\n{upiLink}\n\nসহযোগিতার জন্য ধন্যবাদ।',
      without_upi: 'শ্রদ্ধেয় {customerName} বাবু, {shopName}-এর খাতা অনুযায়ী আপনার ₹{amount} বাকি বেশ কিছুদিন ধরে অনিষ্পন্ন রয়েছে। অনুগ্রহ করে দোকানে যোগাযোগ করে হিসেব মেটানোর অনুরোধ রইল। ধন্যবাদ।',
    },
  },
  ta: {
    polite: {
      with_upi: 'வணக்கம் {customerName} அவர்களே, {shopName} கடையில் உங்கள் நிலுவைத் தொகை ₹{amount}. எளிதாக செலுத்த கீழே உள்ள UPI இணைப்பைப் பயன்படுத்தவும்:\n{upiLink}\n\nசெலுத்திய பின் தெரிவிக்கவும். நன்றி!',
      without_upi: 'வணக்கம் {customerName} அவர்களே, {shopName} கடையில் உங்கள் நிலுவைத் தொகை ₹{amount}. கடைக்கு வரும்போது கணக்கை முடிக்குமாறு கேட்டுக்கொள்கிறோம். நன்றி!',
    },
    standard: {
      with_upi: 'வணக்கம் {customerName} அவர்களே, {shopName} கடையில் நிலுவை ₹{amount}. தயவுசெய்து இந்த UPI இணைப்பு மூலம் செலுத்தவும்:\n{upiLink}\n\nநன்றி!',
      without_upi: 'வணக்கம் {customerName} அவர்களே, {shopName} கடையில் நிலுவை ₹{amount}. கடைக்கு வந்து கணக்கை சரிசெய்யுமாறு கேட்டுக்கொள்கிறோம். நன்றி!',
    },
    firm: {
      with_upi: 'மதிப்பிற்குரிய {customerName} அவர்களே, {shopName} கணக்கின்படி ₹{amount} நிலுவை நீண்ட நாட்களாக உள்ளது. கணக்கை முடிக்க இந்த UPI இணைப்பைப் பயன்படுத்தவும்:\n{upiLink}\n\nஒத்துழைப்புக்கு நன்றி.',
      without_upi: 'மதிப்பிற்குரிய {customerName} அவர்களே, {shopName} கணக்கின்படி ₹{amount} நிலுவை நீண்ட நாட்களாக உள்ளது. கடைக்கு வந்து கணக்கை முடிக்குமாறு கேட்டுக்கொள்கிறோம். நன்றி.',
    },
  },
  te: {
    polite: {
      with_upi: 'నమస్కారం {customerName} గారు, {shopName} లో మీ పాత బాకీ ₹{amount}. సౌలభ్యం కోసం కింద ఉన్న UPI లింక్ ద్వారా చెల్లించవచ్చు:\n{upiLink}\n\nచెల్లించిన తర్వాత తెలియజేయగలరు. ధన్యవాదాలు!',
      without_upi: 'నమస్కారం {customerName} గారు, {shopName} లో మీ పాత బాకీ ₹{amount}. వీలైనప్పుడు షాపుకి వచ్చి బాకీ చెల్లించగలరు. ధన్యవాదాలు!',
    },
    standard: {
      with_upi: 'నమస్కారం {customerName} గారు, {shopName} లో మీ మొత్తం బాకీ ₹{amount}. దయచేసి ఈ UPI లింక్ ద్వారా చెల్లించండి:\n{upiLink}\n\nధన్యవాదాలు!',
      without_upi: 'నమస్కారం {customerName} గారు, {shopName} లో మీ మొత్తం బాకీ ₹{amount}. దయచేసి షాపుకు వచ్చి ఖాతా క్లియర్ చేయగలరు. ధన్యవాదాలు!',
    },
    firm: {
      with_upi: 'గమనిక {customerName} గారు, {shopName} ఖాతా ప్రకారం ₹{amount} బాకీ చాలా కాలంగా పెండింగ్‌లో ఉంది. దయచేసి ఈ UPI లింక్ ద్వారా చెల్లించి ఖాతా సరిచేయగలరు:\n{upiLink}\n\nసహకారానికి ధన్యవాదాలు.',
      without_upi: 'గమనిక {customerName} గారు, {shopName} ఖాతా ప్రకారం ₹{amount} బాకీ చాలా కాలంగా పెండింగ్‌లో ఉంది. దయచేసి షాపుకి వచ్చి బాకీ పూర్తి చేయగలరు. సహకారానికి ధన్యవాదాలు.',
    },
  },
  kn: {
    polite: {
      with_upi: 'ನಮಸ್ಕಾರ {customerName} ಅವರೇ, {shopName} ಯಲ್ಲಿ ನಿಮ್ಮ ₹{amount} ಬಾಕಿ ಹಣವಿದೆ. ಸುಲಭವಾಗಿ ಪಾವತಿಸಲು ಕೆಳಗಿನ UPI ಲಿಂಕ್ ಬಳಸಿ:\n{upiLink}\n\nಪಾವತಿಸಿದ ನಂತರ ತಿಳಿಸಿ. ಧನ್ಯವಾದಗಳು!',
      without_upi: 'ನಮಸ್ಕಾರ {customerName} ಅವರೇ, {shopName} ಯಲ್ಲಿ ನಿಮ್ಮ ₹{amount} ಬಾಕಿ ಹಣವಿದೆ. ಅಂಗಡಿಗೆ ಬಂದಾಗ ಹಣ ಪಾವತಿಸಲು ವಿನಂತಿ. ಧನ್ಯವಾದಗಳು!',
    },
    standard: {
      with_upi: 'ನಮಸ್ಕಾರ {customerName} ಅವರೇ, {shopName} ಯಲ್ಲಿ ನಿಮ್ಮ ಒಟ್ಟು ಬಾಕಿ ₹{amount}. ದಯವಿಟ್ಟು ಈ UPI ಲಿಂಕ್ ಮೂಲಕ ಪಾವತಿಸಿ:\n{upiLink}\n\nಧನ್ಯವಾದಗಳು!',
      without_upi: 'ನಮಸ್ಕಾರ {customerName} ಅವರೇ, {shopName} ಯಲ್ಲಿ ನಿಮ್ಮ ಒಟ್ಟು ಬಾಕಿ ₹{amount}. ದಯವಿಟ್ಟು ಅಂಗಡಿಗೆ ಬಂದು ಖಾತೆ ಸರಿಪಡಿಸಿ. ಧನ್ಯವಾದಗಳು!',
    },
    firm: {
      with_upi: 'ಗೌರವಾನ್ವಿತ {customerName} ಅವರೇ, {shopName} ಖಾತೆಯ ಪ್ರಕಾರ ₹{amount} ಬಾಕಿ ಹಣ ಬಹಳ ದಿನಗಳಿಂದ ಬಾಕಿಯಿದೆ. ದಯವಿಟ್ಟು ಈ UPI ಲಿಂಕ್ ಮೂಲಕ ಪಾವತಿಸಿ ಖಾತೆ ಇತ್ಯರ್ಥಪಡಿಸಿ:\n{upiLink}\n\nಸಹಕಾರಕ್ಕೆ ಧನ್ಯವಾದಗಳು.',
      without_upi: 'ಗೌರವಾನ್ವಿತ {customerName} ಅವರೇ, {shopName} ಖಾತೆಯ ಪ್ರಕಾರ ₹{amount} ಬಾಕಿ ಹಣ ಬಹಳ ದಿನಗಳಿಂದ ಬಾಕಿಯಿದೆ. ದಯವಿಟ್ಟು ಅಂಗಡಿಗೆ ಬಂದು ಖಾತೆ ಇತ್ಯರ್ಥಪಡಿಸಿ. ಧನ್ಯವಾದಗಳು.',
    },
  },
  ml: {
    polite: {
      with_upi: 'നമസ്കാരം {customerName}, {shopName}-ൽ നിങ്ങളുടെ ₹{amount} കുടിശ്ശികയുണ്ട്. സൗകര്യത്തിനായി താഴെ കാണുന്ന UPI ലിങ്ക് വഴി അടയ്ക്കാവുന്നതാണ്:\n{upiLink}\n\nപണം അടച്ച ശേഷം അറിയിക്കുക. നന്ദി!',
      without_upi: 'നമസ്കാരം {customerName}, {shopName}-ൽ നിങ്ങളുടെ ₹{amount} കുടിശ്ശികയുണ്ട്. കടയിൽ വരുമ്പോൾ തുക തീർക്കാൻ അഭ്യർത്ഥിക്കുന്നു. നന്ദി!',
    },
    standard: {
      with_upi: 'നമസ്കാരം {customerName}, {shopName}-ൽ നിങ്ങളുടെ ബാക്കി തുക ₹{amount}. ദയവായി ഈ UPI ലിങ്ക് ഉപയോഗിച്ച് പണം അടയ്ക്കുക:\n{upiLink}\n\nനന്ദി!',
      without_upi: 'നമസ്കാരം {customerName}, {shopName}-ൽ നിങ്ങളുടെ ബാക്കി തുക ₹{amount}. കടയിൽ നേരിട്ടെത്തി തുക നൽകാൻ അഭ്യർത്ഥിക്കുന്നു. നന്ദി!',
    },
    firm: {
      with_upi: 'ബഹുമാനപ്പെട്ട {customerName}, {shopName} കണക്കനുസരിച്ച് ₹{amount} കുടിശ്ശിക കുറച്ചുനാളായി തീർപ്പാക്കാതെയുണ്ട്. ദയവായി ഈ UPI ലിങ്ക് വഴി തുക നൽകി അക്കൗണ്ട് ക്രമീകരിക്കുക:\n{upiLink}\n\nസഹകരണത്തിന് നന്ദി.',
      without_upi: 'ബഹുമാനപ്പെട്ട {customerName}, {shopName} കണക്കനുസരിച്ച് ₹{amount} കുടിശ്ശിക കുറച്ചുനാളായി തീർപ്പാക്കാതെയുണ്ട്. ദയവായി കടയിൽ നേരിട്ടെത്തി തുക അടയ്ക്കുക. സഹകരണത്തിന് നന്ദി.',
    },
  },
};

/**
 * Formulate personalized reminder message in selected tone & language
 */
export function generateReminderMessage(params: {
  customerName: string;
  shopName: string;
  amount: number;
  upiLink?: string | null;
  language?: string;
  tone?: ReminderTone;
  customNote?: string;
}): string {
  const {
    customerName,
    shopName,
    amount,
    upiLink,
    language = 'hi',
    tone = 'polite',
    customNote,
  } = params;

  const langKey = TEMPLATES[language] ? language : 'hi';
  const toneKey: ReminderTone = ['polite', 'standard', 'firm'].includes(tone) ? tone : 'polite';
  const hasUpi = Boolean(upiLink && upiLink.trim().length > 0);
  const variant: TemplateVariant = hasUpi ? 'with_upi' : 'without_upi';

  let message = TEMPLATES[langKey][toneKey][variant]
    .replace('{customerName}', customerName)
    .replace('{shopName}', shopName)
    .replace('{amount}', String(amount));

  if (hasUpi && upiLink) {
    message = message.replace('{upiLink}', upiLink.trim());
  }

  if (customNote && customNote.trim().length > 0) {
    message += `\n\n📌 ${customNote.trim()}`;
  }

  return message;
}

/**
 * Legacy helper for threshold-only customer filtering
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
 * Filters customers who qualify for reminders based on threshold and safety rules
 */
export function getEligibleRecoveryCustomers(
  customers: Customer[],
  settings: ReminderSettings = DEFAULT_REMINDER_SETTINGS,
  thresholdAmount?: number,
  now: Date = new Date()
): Customer[] {
  const threshold = thresholdAmount !== undefined ? thresholdAmount : settings.default_threshold;

  return customers
    .filter((c) => {
      const { eligible } = evaluateCustomerReminderEligibility(c, settings, threshold, now);
      return eligible;
    })
    .sort((a, b) => Number(b.balance_owed) - Number(a.balance_owed));
}

/**
 * Builds list of draft reminders incorporating:
 * 1. Per-customer tone override (falls back to shop-wide tone)
 * 2. UPI link toggle & shop upi_id check
 * 3. Custom shop notes
 */
export function buildDraftReminders(
  customers: Customer[],
  shop: Shop,
  customThreshold?: number,
  overrideSettings?: Partial<ReminderSettings>,
  now: Date = new Date()
): DraftReminder[] {
  const settings: ReminderSettings = {
    ...DEFAULT_REMINDER_SETTINGS,
    ...(shop.settings?.reminder_settings || {}),
    ...(overrideSettings || {}),
  };

  const threshold = customThreshold !== undefined ? customThreshold : settings.default_threshold;
  const eligible = customers
    .filter((c) => Number(c.balance_owed) >= threshold)
    .sort((a, b) => Number(b.balance_owed) - Number(a.balance_owed));

  return eligible.map((customer) => {
    // 1. Per-customer tone override takes priority over shop-wide tone
    const resolvedTone: ReminderTone = customer.reminder_tone_override || settings.message_tone;

    // 2. UPI link: only if include_upi_link is true AND shop has a valid upi_id
    const upiLink = settings.include_upi_link
      ? generateUPILink(shop.upi_id, shop.name, customer.balance_owed)
      : null;

    const messageText = generateReminderMessage({
      customerName: customer.name,
      shopName: shop.name,
      amount: customer.balance_owed,
      upiLink,
      language: customer.preferred_language || 'hi',
      tone: resolvedTone,
      customNote: settings.custom_note,
    });

    return {
      customer,
      amount: customer.balance_owed,
      messageText,
      upiLink,
      language: customer.preferred_language || 'hi',
      tone: resolvedTone,
      isSentToday: hasSentReminderToday(customer.last_reminded_at, now),
      isDoNotRemind: Boolean(customer.do_not_remind),
      isHighTrustExempt: Boolean(
        customer.trust_score !== undefined &&
          customer.trust_score !== null &&
          customer.trust_score >= 90
      ),
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
    upi_link: draft.upiLink || undefined,
    status,
    sent_at: status === 'sent' ? new Date().toISOString() : undefined,
    created_at: new Date().toISOString(),
  };
}

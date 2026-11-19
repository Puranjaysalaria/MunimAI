import { LanguageCode } from '../i18n/types';
import { Transaction } from '../types/schema';

// Comprehensive Indian name dictionary across all 10 supported commercial languages
const TOKEN_MAP: Record<string, Record<string, string>> = {
  // First names
  ankit: { en: 'Ankit', hi: 'अंकित', pa: 'ਅੰਕਿਤ', gu: 'અંકિત', mr: 'अंकित', bn: 'অঙ্কিত', ta: 'அங்கித்', te: 'అంకిత్', kn: 'ಅಂಕಿತ್', ml: 'അങ്കിത്' },
  ramesh: { en: 'Ramesh', hi: 'रमेश', pa: 'ਰਮੇਸ਼', gu: 'રમેશ', mr: 'रमेश', bn: 'রমেশ', ta: 'ரமேஷ்', te: 'రమేష్', kn: 'ರಮೇಶ್', ml: 'രമേഷ്' },
  gurpreet: { en: 'Gurpreet', hi: 'गुरप्रीत', pa: 'ਗੁਰਪ੍ਰੀਤ', gu: 'ગુરપ્રીત', mr: 'गुरप्रीत', bn: 'গুরপ্রীত', ta: 'குர்ப்ரீத்', te: 'గుర్‌ప్రీత్', kn: 'ಗುರ್‌ಪ್ರೀತ್', ml: 'ഗുർപ്രീത്' },
  sunita: { en: 'Sunita', hi: 'सुनीता', pa: 'ਸੁਨੀਤਾ', gu: 'સુનીતા', mr: 'सुनीता', bn: 'সুনীতা', ta: 'சுனிதா', te: 'సునీత', kn: 'ಸುನೀತಾ', ml: 'സുനിത' },
  mohan: { en: 'Mohan', hi: 'मोहन', pa: 'ਮੋਹਨ', gu: 'મોહન', mr: 'मोहन', bn: 'মোহন', ta: 'மோகன்', te: 'మోహన్', kn: 'ಮೋಹನ್', ml: 'മോഹൻ' },
  pooja: { en: 'Pooja', hi: 'पूजा', pa: 'ਪੂਜਾ', gu: 'પૂજા', mr: 'पूजा', bn: 'পূজা', ta: 'பூஜா', te: 'పూజా', kn: 'ಪೂಜಾ', ml: 'പൂജ' },
  vikram: { en: 'Vikram', hi: 'विक्रम', pa: 'ਵਿਕਰਮ', gu: 'ਵਿਕਰਮ', mr: 'विक्रम', bn: 'বিক্রম', ta: 'விக்ரம்', te: 'విక్రమ్', kn: 'ವಿಕ್ರಮ್', ml: 'വിക്രം' },
  suresh: { en: 'Suresh', hi: 'सुरेश', pa: 'ਸੁਰੇਸ਼', gu: 'સુરેશ', mr: 'सुरेश', bn: 'সুরেশ', ta: 'சுரேஷ்', te: 'సురేష్', kn: 'ಸುರೇಶ್', ml: 'സുരേഷ്' },
  amit: { en: 'Amit', hi: 'अमित', pa: 'ਅਮਿਤ', gu: 'અમિત', mr: 'अमित', bn: 'অমিত', ta: 'அமித்', te: 'అమిత్', kn: 'ಅಮಿತ್', ml: 'അമിത്' },
  rahul: { en: 'Rahul', hi: 'राहुल', pa: 'ਰਾਹੁਲ', gu: 'ਰਾਹੁਲ', mr: 'राहुल', bn: 'রাহুল', ta: 'ராகுல்', te: 'ராహుల్', kn: 'ರಾಹುಲ್', ml: 'രാഹുൽ' },
  priya: { en: 'Priya', hi: 'प्रिया', pa: 'ਪ੍ਰਿਆ', gu: 'પ્રિયા', mr: 'प्रिया', bn: 'প্রিয়া', ta: 'பிரியா', te: 'ప్రియ', kn: 'ಪ್ರಿಯಾ', ml: 'പ്രിയ' },
  deepak: { en: 'Deepak', hi: 'दीपक', pa: 'ਦੀਪਕ', gu: 'દીપક', mr: 'दीपक', bn: 'দীপক', ta: 'தீபக்', te: 'దీపక్', kn: 'ದೀಪಕ್', ml: 'ദീപക്' },
  rajesh: { en: 'Rajesh', hi: 'राजेश', pa: 'ਰਾਜੇਸ਼', gu: 'રાજેશ', mr: 'राजेश', bn: 'রাজেশ', ta: 'ராஜேஷ்', te: 'రాజేష్', kn: 'ರಾಜೇಶ್', ml: 'ராஜേഷ്' },
  manoj: { en: 'Manoj', hi: 'मनोज', pa: 'ਮਨੋਜ', gu: 'મનોજ', mr: 'मनोज', bn: 'মনোজ', ta: 'மனோஜ்', te: 'మనొజ్', kn: 'ಮನೋಜ್', ml: 'മനോജ്' },
  vijay: { en: 'Vijay', hi: 'विजय', pa: 'ਵਿਜੇ', gu: 'વિજય', mr: 'विजय', bn: 'বিজয়', ta: 'விஜய்', te: 'విజయ్', kn: 'ವಿಜಯ್', ml: 'വിജയ്' },
  sanjay: { en: 'Sanjay', hi: 'संजय', pa: 'ਸੰਜੇ', gu: 'સંజయ્', mr: 'संजय', bn: 'সঞ্জয়', ta: 'சஞ்சய்', te: 'సంజయ్', kn: 'ಸಂಜಯ್', ml: 'സഞ്ജയ്' },
  ajay: { en: 'Ajay', hi: 'अजय', pa: 'ਅਜੈ', gu: 'અજય', mr: 'अजय', bn: 'অজয়', ta: 'அஜய்', te: 'అజయ్', kn: 'ಅಜಯ್', ml: 'അജയ്' },
  anil: { en: 'Anil', hi: 'अनिल', pa: 'ਅਨਿਲ', gu: 'અનિલ', mr: 'अनिल', bn: 'অনিল', ta: 'அனில்', te: 'అనిల్', kn: 'ಅನಿಲ್', ml: 'അനിൽ' },
  dinesh: { en: 'Dinesh', hi: 'दिनेश', pa: 'ਦਿਨੇਸ਼', gu: 'દિનેશ', mr: 'दिनेश', bn: 'দিনেশ', ta: 'தினேஷ்', te: 'దినేష్', kn: 'ದಿನೇಶ್', ml: 'ദിനേശ്' },
  mukesh: { en: 'Mukesh', hi: 'मुकेश', pa: 'ਮੁਕੇਸ਼', gu: 'મુકેશ', mr: 'मुकेश', bn: 'মুকেশ', ta: 'முகேஷ்', te: 'ముఖేష్', kn: 'ಮುಕೇಶ್', ml: 'മുകേഷ്' },
  rohit: { en: 'Rohit', hi: 'रोहित', pa: 'ਰੋਹਿਤ', gu: 'રોહિત', mr: 'रोहित', bn: 'রোহিত', ta: 'ரோஹித்', te: 'రోహిత్', kn: 'ರೋಹಿತ್', ml: 'രോഹിത്' },
  vikas: { en: 'Vikas', hi: 'विकास', pa: 'ਵਿਕਾਸ', gu: 'વિકાસ', mr: 'विकास', bn: 'বিকাশ', ta: 'விகாஸ்', te: 'వికాస్', kn: 'ವಿಕಾಸ್', ml: 'വികാസ്' },
  harpreet: { en: 'Harpreet', hi: 'हरप्रीत', pa: 'ਹਰਪ੍ਰੀਤ', gu: 'હરપ્રીત', mr: 'हरप्रीत', bn: 'হরপ্রীত', ta: 'ஹர்ப்ரீத்', te: 'హర్‌ప్రీత్', kn: 'ಹರ್‌ಪ್ರೀತ್', ml: 'ഹർപ്രീത്' },
  jaspreet: { en: 'Jaspreet', hi: 'जसप्रीत', pa: 'ਜਸਪ੍ਰੀਤ', gu: 'જસપ્રીત', mr: 'जसप्रीत', bn: 'জসপ্রীত', ta: 'ஜஸ்ப்ரீத்', te: 'జస్‌ప్రీత్', kn: 'ಜಸ್‌ಪ್ರೀತ್', ml: 'ജസ്പ്രീത്' },
  satnam: { en: 'Satnam', hi: 'सतनाम', pa: 'ਸਤਨਾਮ', gu: 'સતનામ', mr: 'सतनाम', bn: 'সতনাম', ta: 'சத்நாம்', te: 'సత్నామ్', kn: 'ಸತ್ನಾಮ್', ml: 'സത്നാം' },
  kuldeep: { en: 'Kuldeep', hi: 'कुलदीप', pa: 'ਕੁਲਦੀਪ', gu: 'કુલદીપ', mr: 'कुलदीप', bn: 'কুলদীপ', ta: 'குல்தீப்', te: 'కుల్‌దీప్', kn: 'ಕುಲ್‌ದೀಪ್', ml: 'കുൽദീപ്' },
  hardeep: { en: 'Hardeep', hi: 'हरदीप', pa: 'ਹਰਦੀਪ', gu: 'હરદીપ', mr: 'हरदीप', bn: 'হরদীপ', ta: 'ஹர்தீப்', te: 'హర్‌దీప్', kn: 'ಹರ್‌ದೀಪ್', ml: 'ഹർദീപ്' },
  ashok: { en: 'Ashok', hi: 'अशोक', pa: 'ਅਸ਼ੋਕ', gu: 'અશોક', mr: 'अशोक', bn: 'অশোক', ta: 'அசோக்', te: 'అశోక్', kn: 'ಅಶೋಕ್', ml: 'അശോക്' },
  vinod: { en: 'Vinod', hi: 'विनोद', pa: 'ਵਿਨੋਦ', gu: 'વિનોદ', mr: 'विनोद', bn: 'বিনোদ', ta: 'வினோத்', te: 'వినోద్', kn: 'ವಿನೋದ್', ml: 'വിനോദ്' },
  meena: { en: 'Meena', hi: 'मीना', pa: 'ਮੀਨਾ', gu: 'મીના', mr: 'मीना', bn: 'মীনা', ta: 'மீனா', te: 'మీనా', kn: 'ಮೀನಾ', ml: 'മീന' },
  geeta: { en: 'Geeta', hi: 'गीता', pa: 'ਗੀਤਾ', gu: 'ગીતા', mr: 'गीता', bn: 'গীতা', ta: 'கீதா', te: 'గీత', kn: 'ಗೀತಾ', ml: 'ഗീത' },
  ritu: { en: 'Ritu', hi: 'रितु', pa: 'ਰਿਤੂ', gu: 'રિતુ', mr: 'रितु', bn: 'ঋতু', ta: 'ரிது', te: 'రితు', kn: 'ರಿತು', ml: 'ഋതു' },
  neha: { en: 'Neha', hi: 'नेहा', pa: 'ਨੇਹਾ', gu: 'નેહા', mr: 'नेहा', bn: 'নেহা', ta: 'நேஹா', te: 'నేహా', kn: 'ನೇಹಾ', ml: 'നേഹ' },
  kavita: { en: 'Kavita', hi: 'कविता', pa: 'ਕਵਿਤਾ', gu: 'કવિતા', mr: 'कविता', bn: 'কবিতা', ta: 'கவிதா', te: 'కవిత', kn: 'ಕವಿತಾ', ml: 'കവിത' },

  // Surnames & Titles
  sharma: { en: 'Sharma', hi: 'शर्मा', pa: 'ਸ਼ਰਮਾ', gu: 'શર્મા', mr: 'शर्मा', bn: 'শর্মা', ta: 'சர்மா', te: 'శర్మ', kn: 'ಶರ್ಮಾ', ml: 'ശർമ്മ' },
  kumar: { en: 'Kumar', hi: 'कुमार', pa: 'ਕੁਮਾਰ', gu: 'કુમાર', mr: 'कुमार', bn: 'কুমার', ta: 'குமார்', te: 'కుమార్', kn: 'ಕುಮಾರ್', ml: 'കുമാർ' },
  singh: { en: 'Singh', hi: 'सिंह', pa: 'ਸਿੰਘ', gu: 'સિંહ', mr: 'सिंग', bn: 'সিং', ta: 'சிங்', te: 'సింగ్', kn: 'ಸಿಂಗ್', ml: 'സിംഗ്' },
  kaur: { en: 'Kaur', hi: 'कौर', pa: 'ਕੌਰ', gu: 'કૌર', mr: 'कौर', bn: 'কৌর', ta: 'கௌர்', te: 'కౌర్', kn: 'ಕೌರ್', ml: 'കൗർ' },
  devi: { en: 'Devi', hi: 'देवी', pa: 'ਦੇਵੀ', gu: 'દેવી', mr: 'देवी', bn: 'দেবী', ta: 'தேவி', te: 'దేవి', kn: 'ದೇವಿ', ml: 'ദേവി' },
  lal: { en: 'Lal', hi: 'लाल', pa: 'ਲਾਲ', gu: 'લાલ', mr: 'लाल', bn: 'লাল', ta: 'லால்', te: 'లాల్', kn: 'ಲಾಲ್', ml: 'ലാൽ' },
  verma: { en: 'Verma', hi: 'वर्मा', pa: 'ਵਰਮਾ', gu: 'વર્મા', mr: 'वर्मा', bn: 'বর্মা', ta: 'வர்மா', te: 'వర్మ', kn: 'ವರ್ಮಾ', ml: 'വർമ്മ' },
  gupta: { en: 'Gupta', hi: 'गुप्ता', pa: 'ਗੁਪਤਾ', gu: 'ગુપ્તા', mr: 'गुप्ता', bn: 'গুপ্ত', ta: 'குப்தா', te: 'గుప్తా', kn: 'ಗುಪ್ತಾ', ml: 'ഗുപ്ത' },
  agarwal: { en: 'Agarwal', hi: 'अग्रवाल', pa: 'ਅਗਰਵਾਲ', gu: 'અગ્રવાલ', mr: 'अगरवाल', bn: 'আগরওয়াল', ta: 'அகர்வால்', te: 'அగర్వాల్', kn: 'ಅಗರವಾಲ್', ml: 'അഗർവാൾ' },
};

// Build reverse lookup index for all scripts
const REVERSE_INDEX = new Map<string, string>();
for (const [key, translations] of Object.entries(TOKEN_MAP)) {
  for (const [, val] of Object.entries(translations)) {
    REVERSE_INDEX.set(val.toLowerCase(), key);
  }
}

/**
 * Returns customer name localized dynamically into the user's active language
 */
export function getLocalizedCustomerName(fullName: string | null | undefined, targetLang: LanguageCode | string = 'en'): string {
  if (!fullName) return '';
  const tokens = fullName.trim().split(/\s+/);
  const localized = tokens.map((token) => {
    const lower = token.toLowerCase();
    // Direct token key or reverse match from Indic script
    const key = TOKEN_MAP[lower] ? lower : REVERSE_INDEX.get(lower);
    if (key && TOKEN_MAP[key]) {
      return TOKEN_MAP[key][targetLang] || TOKEN_MAP[key].en || token;
    }
    return token;
  });
  return localized.join(' ');
}

// Common grocery items translation
const ITEM_NAMES: Record<string, Record<string, string>> = {
  chini: { en: 'Sugar', hi: 'चीनी', pa: 'ਖੰਡ', gu: 'ખાંડ', mr: 'साखर', bn: 'চিনি', ta: 'சர்க்கரை', te: 'చక్కెర', kn: 'ಸಕ್ಕರೆ', ml: 'പഞ്ചസാര' },
  aata: { en: 'Flour (Atta)', hi: 'आटा', pa: 'ਆਟਾ', gu: 'લોટ', mr: 'पीठ', bn: 'আটা', ta: 'மாவு', te: 'పిండి', kn: 'ಹಿಟ್ಟು', ml: 'പൊടി' },
  doodh: { en: 'Milk', hi: 'दूध', pa: 'ਦੁੱਧ', gu: 'દૂધ', mr: 'दूध', bn: 'দুধ', ta: 'பால்', te: 'పాలు', kn: 'ಹಾಲು', ml: 'പാൽ' },
  chawal: { en: 'Rice', hi: 'चावल', pa: 'ਚੌਲ', gu: 'ચોખા', mr: 'तांदूळ', bn: 'চাল', ta: 'அரிசி', te: 'బియ్యం', kn: 'ಅಕ್ಕಿ', ml: 'അരി' },
  dal: { en: 'Pulses (Dal)', hi: 'दाल', pa: 'ਦਾਲ', gu: 'દાળ', mr: 'डाळ', bn: 'ডাল', ta: 'பருப்பு', te: 'పప్పు', kn: 'ಬೇಳೆ', ml: 'പരിപ്പ്' },
  tel: { en: 'Cooking Oil', hi: 'तेल', pa: 'ਤੇਲ', gu: 'તેલ', mr: 'तेल', bn: 'তেল', ta: 'எண்ணெய்', te: 'నూనె', kn: 'ಎಣ್ಣೆ', ml: 'എണ്ണ' },
  namak: { en: 'Salt', hi: 'नमक', pa: 'ਨਮਕ', gu: 'મીઠું', mr: 'मीठ', bn: 'নুন', ta: 'உப்பு', te: 'ఉప్పు', kn: 'ಉಪ್ಪು', ml: 'ഉപ്പ്' },
  sabun: { en: 'Soap', hi: 'साबुन', pa: 'ਸਾਬਣ', gu: 'સાબુ', mr: 'साबण', bn: 'সাবান', ta: 'சோப்பு', te: 'సబ్బు', kn: 'ಸೋಪು', ml: 'സോപ്പ്' },
  biscuit: { en: 'Biscuit', hi: 'बिस्कुट', pa: 'ਬਿਸਕੁਟ', gu: 'બિસ્કિટ', mr: 'बिस्किट', bn: 'বিস্কুট', ta: 'பிஸ்கட்', te: 'బిస్కెట్', kn: 'ಬಿಸ್ಕತ್ತು', ml: 'ബിസ്കറ്റ്' },
  haldi: { en: 'Turmeric', hi: 'हल्दी', pa: 'ਹਲਦੀ', gu: 'હળદર', mr: 'हळद', bn: 'হলুদ', ta: 'மஞ்சள்', te: 'పసుపు', kn: 'ಅರಿಶಿನ', ml: 'മഞ്ഞൾ' },
  maggi: { en: 'Maggi Noodles', hi: 'मैगी', pa: 'ਮੈਗੀ', gu: 'મેગી', mr: 'मॅगी', bn: 'ম্যাগি', ta: 'மேகி', te: 'మ్యాగీ', kn: 'ಮ್ಯಾಗಿ', ml: 'മാഗി' },
};

export function formatItemName(rawName: string, targetLang: string = 'en'): string {
  if (!rawName) return '';
  const key = rawName.trim().toLowerCase();
  if (ITEM_NAMES[key]) {
    return ITEM_NAMES[key][targetLang] || ITEM_NAMES[key].en || rawName;
  }
  return rawName;
}

/**
 * Returns dynamic, language-reactive narrative subtitle for transactions
 * Replaces hardcoded raw transcripts with clean, localized descriptions
 */
export function getLocalizedTransactionDesc(
  tx: Transaction,
  rawCustomerName: string | undefined,
  language: LanguageCode | string = 'en'
): string {
  const custName = rawCustomerName ? getLocalizedCustomerName(rawCustomerName, language) : '';

  // 1. If structured items exist, format items in current language
  if (tx.items && tx.items.length > 0) {
    return tx.items
      .map(
        (it) =>
          `${it.quantity > 1 ? it.quantity + ' ' : ''}${it.unit ? it.unit + ' ' : ''}${formatItemName(it.name, language)}`
      )
      .join(', ');
  }

  // 2. Localized narrative description by transaction type
  if (tx.type === 'credit') {
    if (language === 'en') return custName ? `${custName} took ₹${tx.amount} credit` : `Credit given (Udhaar) • ₹${tx.amount}`;
    if (language === 'pa') return custName ? `${custName} ਨੇ ₹${tx.amount} ਉਧਾਰ ਲਿਆ` : `ਉਧਾਰ ਦਿੱਤਾ • ₹${tx.amount}`;
    if (language === 'gu') return custName ? `${custName}એ ₹${tx.amount} ઉધાર લીધું` : `ઉધાર આપ્યું • ₹${tx.amount}`;
    if (language === 'mr') return custName ? `${custName}ने ₹${tx.amount} उधार घेतले` : `उधार दिले • ₹${tx.amount}`;
    if (language === 'bn') return custName ? `${custName} ₹${tx.amount} বাকি নিয়েছে` : `বাকি দেওয়া হয়েছে • ₹${tx.amount}`;
    if (language === 'ta') return custName ? `${custName} ₹${tx.amount} கடன் வாங்கினார்` : `கடன் கொடுக்கப்பட்டது • ₹${tx.amount}`;
    if (language === 'te') return custName ? `${custName} ₹${tx.amount} అప్పు తీసుకున్నారు` : `అప్పు ఇవ్వబడింది • ₹${tx.amount}`;
    if (language === 'kn') return custName ? `${custName} ₹${tx.amount} ಸಾಲ ಪಡೆದಿದ್ದಾರೆ` : `ಸಾಲ ನೀಡಲಾಗಿದೆ • ₹${tx.amount}`;
    if (language === 'ml') return custName ? `${custName} ₹${tx.amount} കടം വാങ്ങി` : `കടം കൊടുത്തു • ₹${tx.amount}`;
    // Hindi default
    return custName ? `${custName} ने ₹${tx.amount} उधार लिया` : `उधार दिया • ₹${tx.amount}`;
  }

  if (tx.type === 'payment') {
    if (language === 'en') return custName ? `${custName} paid ₹${tx.amount}` : `Credit payment received • ₹${tx.amount}`;
    if (language === 'pa') return custName ? `${custName} ਨੇ ₹${tx.amount} ਜਮ੍ਹਾਂ ਕੀਤਾ` : `ਜਮ੍ਹਾਂ ਪ੍ਰਾਪਤ ਹੋਇਆ • ₹${tx.amount}`;
    if (language === 'gu') return custName ? `${custName}એ ₹${tx.amount} જમા કર્યા` : `જમા મળ્યું • ₹${tx.amount}`;
    if (language === 'mr') return custName ? `${custName}ने ₹${tx.amount} जमा केले` : `जमा मिळाले • ₹${tx.amount}`;
    if (language === 'bn') return custName ? `${custName} ₹${tx.amount} জমা দিয়েছে` : `জমা পাওয়া গেছে • ₹${tx.amount}`;
    if (language === 'ta') return custName ? `${custName} ₹${tx.amount} வரவு செலுத்தினார்` : `வரவு கிடைத்தது • ₹${tx.amount}`;
    if (language === 'te') return custName ? `${custName} ₹${tx.amount} జమ చేశారు` : `జమ చేయబడింది • ₹${tx.amount}`;
    if (language === 'kn') return custName ? `${custName} ₹${tx.amount} ಜಮೆ ಮಾಡಿದ್ದಾರೆ` : `ಜಮೆ ಸ್ವೀಕರಿಸಲಾಗಿದೆ • ₹${tx.amount}`;
    if (language === 'ml') return custName ? `${custName} ₹${tx.amount} അടച്ചു` : `വരവ് കിട്ടി • ₹${tx.amount}`;
    // Hindi default
    return custName ? `${custName} ने ₹${tx.amount} जमा किया` : `जमा प्राप्त हुआ • ₹${tx.amount}`;
  }

  if (tx.type === 'sale') {
    if (language === 'en') return `Cash sale • ₹${tx.amount}`;
    if (language === 'pa') return `ਨਕਦ ਵਿਕਰੀ • ₹${tx.amount}`;
    if (language === 'gu') return `રોકડ વેચાણ • ₹${tx.amount}`;
    if (language === 'mr') return `रोख विक्री • ₹${tx.amount}`;
    if (language === 'bn') return `নগদ বিক্রি • ₹${tx.amount}`;
    if (language === 'ta') return `ரொக்க விற்பனை • ₹${tx.amount}`;
    if (language === 'te') return `నగదు అమ్మకం • ₹${tx.amount}`;
    if (language === 'kn') return `ನಗದು ಮಾರಾಟ • ₹${tx.amount}`;
    if (language === 'ml') return `ക്യാഷ് വിൽപ്പന • ₹${tx.amount}`;
    // Hindi default
    return `नकद बिक्री • ₹${tx.amount}`;
  }

  // Expense
  if (language === 'en') return `Store expense • ₹${tx.amount}`;
  if (language === 'pa') return `ਦੁਕਾਨ ਦਾ ਖ਼ਰਚਾ • ₹${tx.amount}`;
  if (language === 'gu') return `દુકાન ખર્ચ • ₹${tx.amount}`;
  if (language === 'mr') return `दुकानाचा खर्च • ₹${tx.amount}`;
  if (language === 'bn') return `দোকানের খরচ • ₹${tx.amount}`;
  if (language === 'ta') return `கடை செலவு • ₹${tx.amount}`;
  if (language === 'te') return `దుకాణం ఖర్చు • ₹${tx.amount}`;
  if (language === 'kn') return `ಅಂಗಡಿ ಖರ್ಚು • ₹${tx.amount}`;
  if (language === 'ml') return `കടയിലെ ചെലവ് • ₹${tx.amount}`;
  // Hindi default
  return `दुकान का खर्चा • ₹${tx.amount}`;
}

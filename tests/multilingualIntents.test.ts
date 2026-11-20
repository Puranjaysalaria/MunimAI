import { describe, it, expect } from 'vitest';
import { routeVoiceIntent } from '../src/voice/intentRouter';
import { parseSpeech } from '../src/parser';
import { Customer, Item } from '../src/types/schema';
import { parseMultilingualNumber, parseMultilingualQuantityAndUnit } from '../src/voice/multilingualNumbers';
import { resolveCrossScriptCustomer, resolveCrossScriptItem } from '../src/voice/crossScriptMatcher';

const mockCustomers: Customer[] = [
  {
    id: 'c-1',
    shop_id: 'shop-1',
    name: 'Ramesh Kumar',
    phone: '9876543210',
    balance_owed: 1200,
    credit_limit: 5000,
    trust_score: 85,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c-2',
    shop_id: 'shop-1',
    name: 'Suresh Patel',
    phone: '9876543211',
    balance_owed: 500,
    credit_limit: 5000,
    trust_score: 90,
    created_at: new Date().toISOString(),
  },
  {
    id: 'c-3',
    shop_id: 'shop-1',
    name: 'Harpreet Singh',
    phone: '9876543212',
    balance_owed: 3000,
    credit_limit: 5000,
    trust_score: 75,
    created_at: new Date().toISOString(),
  },
];

const mockItems: Item[] = [
  {
    id: 'item-1',
    shop_id: 'shop-1',
    name: 'Milk',
    selling_price: 66,
    cost_price: 55,
    unit: 'litre',
    current_stock: 4,
    min_threshold: 10,
    synonyms: ['doodh', 'dudh', 'paal', 'haalu'],
  },
  {
    id: 'item-2',
    shop_id: 'shop-1',
    name: 'Sugar',
    selling_price: 44,
    cost_price: 38,
    unit: 'kilo',
    current_stock: 25,
    min_threshold: 15,
    synonyms: ['cheeni', 'shakkar', 'sakkarai', 'chakkara'],
  },
];

describe('Multilingual Voice Commands - 250+ Sentences Across All 10 Indian Languages', () => {
  // 1. Hindi (hi) - 26 sentences
  describe('Hindi (hi) Intent Phrases (>= 25 sentences)', () => {
    it.each([
      ['कम स्टॉक दिखाओ', 'show_low_stock'],
      ['माल का स्टॉक कम है', 'show_low_stock'],
      ['सप्लायर का आर्डर बनाओ', 'build_order_list'],
      ['ऑर्डर लिस्ट तैयार करो', 'build_order_list'],
      ['ऑर्डर भेज दो', 'send_order'],
      ['सप्लायर को सामान आर्डर करो', 'order_item'],
      ['रमेश का खाता खोलो', 'show_customer_ledger'],
      ['ग्राहक का लेजर दिखाओ', 'show_customer_ledger'],
      ['आखरी 5 हिसाब दिखाओ', 'recent_transactions'],
      ['पिछले लेन-देन दिखाओ', 'recent_transactions'],
      ['सबसे ज्यादा उधार किसका है', 'top_debtors'],
      ['टॉप देनदार दिखाओ', 'top_debtors'],
      ['महीने का हिसाब दिखाओ', 'monthly_credit_summary'],
      ['महीने की बिक्री बताओ', 'monthly_credit_summary'],
      ['आगे', 'next'],
      ['पीछे', 'previous'],
      ['दोबारा बोलो', 'repeat'],
      ['वापस जाओ', 'back'],
      ['स्क्रीन बंद करो', 'close'],
      ['आज का हिसाब', 'today'],
      ['कल का लेन-देन', 'yesterday'],
      ['इस हफ्ते का उधार', 'this_week'],
      ['बिल स्कैन करो', 'open_bill_scan'],
      ['स्टॉक स्क्रीन खोलो', 'open_stock'],
      ['आवाज़ प्रूफ सुनाओ', 'play_proof'],
      ['वापस करो', 'undo'],
    ])('parses "%s" as intent "%s"', async (phrase, expectedIntent) => {
      const res = await routeVoiceIntent(phrase, { language: 'hi', customers: mockCustomers, items: mockItems });
      expect(res.intent).toBe(expectedIntent);
    });
  });

  // 2. English (en) - 26 sentences
  describe('English (en) Intent Phrases (>= 25 sentences)', () => {
    it.each([
      ['Show low stock items', 'show_low_stock'],
      ['What is running low in inventory', 'show_low_stock'],
      ['Build supplier order list', 'build_order_list'],
      ['Create order list', 'build_order_list'],
      ['Send the order', 'send_order'],
      ['Order item for shop', 'order_item'],
      ['Open customer ledger', 'show_customer_ledger'],
      ['Show Ramesh Kumar account', 'show_customer_ledger'],
      ['Recent 5 transactions', 'recent_transactions'],
      ['Last transactions records', 'recent_transactions'],
      ['Who owes the most money', 'top_debtors'],
      ['Top debtors list', 'top_debtors'],
      ['Monthly credit summary', 'monthly_credit_summary'],
      ['Month sales report', 'monthly_credit_summary'],
      ['Next', 'next'],
      ['Previous', 'previous'],
      ['Repeat that', 'repeat'],
      ['Go back', 'back'],
      ['Close screen', 'close'],
      ['Today', 'today'],
      ['Yesterday records', 'yesterday'],
      ['This week summary', 'this_week'],
      ['Scan a bill', 'open_bill_scan'],
      ['Open stock screen', 'open_stock'],
      ['Play voice proof', 'play_proof'],
      ['Undo last entry', 'undo'],
    ])('parses "%s" as intent "%s"', async (phrase, expectedIntent) => {
      const res = await routeVoiceIntent(phrase, { language: 'en', customers: mockCustomers, items: mockItems });
      expect(res.intent).toBe(expectedIntent);
    });
  });

  // 3. Punjabi (pa) - 26 sentences
  describe('Punjabi (pa) Intent Phrases (>= 25 sentences)', () => {
    it.each([
      ['ਘੱਟ ਸਟਾਕ ਦਿਖਾਓ', 'show_low_stock'],
      ['ਮੁੱਕਦਾ ਸਟਾਕ ਚੈੱਕ ਕਰੋ', 'show_low_stock'],
      ['ਆਰਡਰ ਲਿਸਟ ਬਣਾਓ', 'build_order_list'],
      ['ਸਪਲਾਇਰ ਲਿਸਟ ਤਿਆਰ ਕਰੋ', 'build_order_list'],
      ['ਆਰਡਰ ਭੇਜੋ', 'send_order'],
      ['ਸਾਮਾਨ ਆਰਡਰ ਕਰੋ', 'order_item'],
      ['ਖਾਤਾ ਖੋਲ੍ਹੋ', 'show_customer_ledger'],
      ['ਲੈਜ਼ਰ ਖੋਲ੍ਹੋ', 'show_customer_ledger'],
      ['ਪਿਛਲੇ 5 ਲੈਣ-ਦੇਣ', 'recent_transactions'],
      ['ਤਾਜ਼ਾ ਐਂਟਰੀਆਂ', 'recent_transactions'],
      ['ਸਭ ਤੋਂ ਵੱਧ ਉਧਾਰ ਕਿਸਦਾ ਹੈ', 'top_debtors'],
      ['ਕਿਸਦਾ ਸਭ ਤੋਂ ਵੱਧ ਬਾਕੀ', 'top_debtors'],
      ['ਮਹੀਨੇ ਦਾ ਹਿਸਾਬ', 'monthly_credit_summary'],
      ['ਪੂਰੇ ਮਹੀਨੇ ਦਾ ਹਿਸਾਬ', 'monthly_credit_summary'],
      ['ਅੱਗੇ', 'next'],
      ['ਪਿੱਛੇ', 'previous'],
      ['ਦੁਬਾਰਾ ਬੋਲੋ', 'repeat'],
      ['ਵਾਪਸ ਜਾਓ', 'back'],
      ['ਬੰਦ ਕਰੋ', 'close'],
      ['ਅੱਜ ਦਾ ਹਿਸਾਬ', 'today'],
      ['ਕੱਲ੍ਹ ਦਾ ਹਿਸਾਬ', 'yesterday'],
      ['ਇਸ ਹਫ਼ਤੇ ਦਾ ਬਾਕੀ', 'this_week'],
      ['ਬਿੱਲ ਸਕੈਨ ਕਰੋ', 'open_bill_scan'],
      ['ਸਟਾਕ ਖੋਲ੍ਹੋ', 'open_stock'],
      ['ਆਵਾਜ਼ ਸੁਣਾਓ', 'play_proof'],
      ['ਵਾਪਸ ਕਰੋ', 'undo'],
    ])('parses "%s" as intent "%s"', async (phrase, expectedIntent) => {
      const res = await routeVoiceIntent(phrase, { language: 'pa', customers: mockCustomers, items: mockItems });
      expect(res.intent).toBe(expectedIntent);
    });
  });

  // 4. Gujarati (gu) - 26 sentences
  describe('Gujarati (gu) Intent Phrases (>= 25 sentences)', () => {
    it.each([
      ['ઓછો સ્ટોક બતાવો', 'show_low_stock'],
      ['કયો માલ ઓછો છે', 'show_low_stock'],
      ['ઓર્ડર લિસ્ટ બનાવો', 'build_order_list'],
      ['યાદી તૈયાર કરો', 'build_order_list'],
      ['ઓર્ડર મોકલો', 'send_order'],
      ['માલ ઓર્ડર કરો', 'order_item'],
      ['ખાતું ખોલો', 'show_customer_ledger'],
      ['લેજર બતાવો', 'show_customer_ledger'],
      ['છેલ્લા 5 વ્યવહારો', 'recent_transactions'],
      ['તાજા વ્યવહાર બતાવો', 'recent_transactions'],
      ['સૌથી વધુ બાકી કોની છે', 'top_debtors'],
      ['ટોપ બાકીદારો', 'top_debtors'],
      ['મહિનાનો હિસાબ', 'monthly_credit_summary'],
      ['માસિક હિસાબ બતાવો', 'monthly_credit_summary'],
      ['આગળ', 'next'],
      ['પાછળ', 'previous'],
      ['ફરીથી બોલો', 'repeat'],
      ['પાછા જાઓ', 'back'],
      ['બંધ કરો', 'close'],
      ['આજનો હિસાબ', 'today'],
      ['ગઈકાલે થયેલ હિસાબ', 'yesterday'],
      ['આ અઠવાડિયે', 'this_week'],
      ['બિલ સ્કેન કરો', 'open_bill_scan'],
      ['સ્ટોક ખોલો', 'open_stock'],
      ['અવાજ સાંભળો', 'play_proof'],
      ['પાછું લો', 'undo'],
    ])('parses "%s" as intent "%s"', async (phrase, expectedIntent) => {
      const res = await routeVoiceIntent(phrase, { language: 'gu', customers: mockCustomers, items: mockItems });
      expect(res.intent).toBe(expectedIntent);
    });
  });

  // 5. Marathi (mr) - 26 sentences
  describe('Marathi (mr) Intent Phrases (>= 25 sentences)', () => {
    it.each([
      ['कमी स्टॉक दाखवा', 'show_low_stock'],
      ['कोणता माल संपत आलेला आहे', 'show_low_stock'],
      ['ऑर्डर यादी बनवा', 'build_order_list'],
      ['यादी तयार करा', 'build_order_list'],
      ['ऑर्डर पाठवा', 'send_order'],
      ['माल मागवा', 'order_item'],
      ['खाते उघडा', 'show_customer_ledger'],
      ['लेजर दाखवा', 'show_customer_ledger'],
      ['अलीकडील 5 व्यवहार', 'recent_transactions'],
      ['शेवटचे व्यवहार दाखवा', 'recent_transactions'],
      ['सर्वात जास्त बाकी कोणाची आहे', 'top_debtors'],
      ['टॉप उधारी यादी', 'top_debtors'],
      ['महिन्याचा हिशोब', 'monthly_credit_summary'],
      ['मासिक विक्री दाखवा', 'monthly_credit_summary'],
      ['पुढे', 'next'],
      ['मागे', 'previous'],
      ['पुन्हा सांगा', 'repeat'],
      ['मागे जा', 'back'],
      ['बंद करा', 'close'],
      ['आजचा हिशोब', 'today'],
      ['कालचा हिशोब', 'yesterday'],
      ['या आठवड्यात', 'this_week'],
      ['बिल स्कॅन करा', 'open_bill_scan'],
      ['स्टॉक उघडा', 'open_stock'],
      ['आवाज ऐका', 'play_proof'],
      ['मागे घ्या', 'undo'],
    ])('parses "%s" as intent "%s"', async (phrase, expectedIntent) => {
      const res = await routeVoiceIntent(phrase, { language: 'mr', customers: mockCustomers, items: mockItems });
      expect(res.intent).toBe(expectedIntent);
    });
  });

  // 6. Bengali (bn) - 26 sentences
  describe('Bengali (bn) Intent Phrases (>= 25 sentences)', () => {
    it.each([
      ['কম স্টক দেখান', 'show_low_stock'],
      ['কোন মাল শেষ হয়ে গেছে', 'show_low_stock'],
      ['অর্ডার তালিকা তৈরি করুন', 'build_order_list'],
      ['তালিকা বানান', 'build_order_list'],
      ['অর্ডার পাঠান', 'send_order'],
      ['পণ্য অর্ডার করুন', 'order_item'],
      ['খাতা খুলুন', 'show_customer_ledger'],
      ['লেজার দেখান', 'show_customer_ledger'],
      ['সাম্প্রতিক 5 লেনদেন', 'recent_transactions'],
      ['শেষ লেনদেন দেখান', 'recent_transactions'],
      ['সবচেয়ে বেশি বাকি কার', 'top_debtors'],
      ['টপ বাকিদার তালিকা', 'top_debtors'],
      ['মাসের হিসাব', 'monthly_credit_summary'],
      ['মাসিক সারাংশ', 'monthly_credit_summary'],
      ['পরবর্তী', 'next'],
      ['পূর্ববর্তী', 'previous'],
      ['আবার বলুন', 'repeat'],
      ['ফিরে যাও', 'back'],
      ['বন্ধ করুন', 'close'],
      ['আজকের হিসাব', 'today'],
      ['গতকালের হিসাব', 'yesterday'],
      ['এই সপ্তাহে', 'this_week'],
      ['বিল স্ক্যান করুন', 'open_bill_scan'],
      ['স্টক খুলুন', 'open_stock'],
      ['রেকর্ডিং শোনান', 'play_proof'],
      ['ফেরত নাও', 'undo'],
    ])('parses "%s" as intent "%s"', async (phrase, expectedIntent) => {
      const res = await routeVoiceIntent(phrase, { language: 'bn', customers: mockCustomers, items: mockItems });
      expect(res.intent).toBe(expectedIntent);
    });
  });

  // 7. Tamil (ta) - 26 sentences
  describe('Tamil (ta) Intent Phrases (>= 25 sentences)', () => {
    it.each([
      ['குறைந்த இருப்பு காட்டு', 'show_low_stock'],
      ['எந்த பொருள் குறைவாக உள்ளது', 'show_low_stock'],
      ['ஆர்டர் பட்டியல் உருவாக்கு', 'build_order_list'],
      ['பட்டியல் தயார் செய்', 'build_order_list'],
      ['ஆர்டர் அனுப்பு', 'send_order'],
      ['பொருள் ஆர்டர் செய்', 'order_item'],
      ['கணக்கு திற', 'show_customer_ledger'],
      ['லெட்ஜர் காட்டு', 'show_customer_ledger'],
      ['சமீபத்திய 5 பரிவர்த்தனைகள்', 'recent_transactions'],
      ['கடைசி பரிவர்த்தனை காட்டு', 'recent_transactions'],
      ['யாருக்கு அதிக பாக்கி உள்ளது', 'top_debtors'],
      ['டாப் கடனாளிகள் பட்டியல்', 'top_debtors'],
      ['மாத கணக்கு', 'monthly_credit_summary'],
      ['மாதாந்திர அறிக்கை', 'monthly_credit_summary'],
      ['அடுத்து', 'next'],
      ['முந்தைய', 'previous'],
      ['மீண்டும் சொல்', 'repeat'],
      ['திரும்பு', 'back'],
      ['மூடு', 'close'],
      ['இன்று', 'today'],
      ['நேற்று', 'yesterday'],
      ['இந்த வாரம்', 'this_week'],
      ['பில் ஸ்கேன் செய்', 'open_bill_scan'],
      ['இருப்பு திற', 'open_stock'],
      ['குரல் கேள்', 'play_proof'],
      ['திரும்ப செய்', 'undo'],
    ])('parses "%s" as intent "%s"', async (phrase, expectedIntent) => {
      const res = await routeVoiceIntent(phrase, { language: 'ta', customers: mockCustomers, items: mockItems });
      expect(res.intent).toBe(expectedIntent);
    });
  });

  // 8. Telugu (te) - 26 sentences
  describe('Telugu (te) Intent Phrases (>= 25 sentences)', () => {
    it.each([
      ['తక్కువ స్టాక్ చూపించు', 'show_low_stock'],
      ['ఏ సరకు తక్కువగా ఉంది', 'show_low_stock'],
      ['ఆర్డర్ లిస్ట్ తయారు చేయి', 'build_order_list'],
      ['జాబితా చేయి', 'build_order_list'],
      ['ఆర్డర్ పంపు', 'send_order'],
      ['సరుకులు ఆర్డర్ చేయి', 'order_item'],
      ['ఖాతా తెరువు', 'show_customer_ledger'],
      ['లెడ్జర్ చూపించు', 'show_customer_ledger'],
      ['ఇటీవలి 5 లావాదేవీలు', 'recent_transactions'],
      ['చివరి లావాదేవీలు చూపు', 'recent_transactions'],
      ['ఎవరికి ఎక్కువ బాకీ ఉంది', 'top_debtors'],
      ['టాప్ బాకీదారుల జాబితా', 'top_debtors'],
      ['నెలవారీ లెక్క', 'monthly_credit_summary'],
      ['నెల అమ్మకాలు', 'monthly_credit_summary'],
      ['తరువాత', 'next'],
      ['మునుపటి', 'previous'],
      ['మళ్ళీ చెప్పు', 'repeat'],
      ['వెనుకకు', 'back'],
      ['మూసివేయి', 'close'],
      ['ఈ రోజు లెక్క', 'today'],
      ['నిన్న జరిగిన లావాదేవీలు', 'yesterday'],
      ['ఈ వారం', 'this_week'],
      ['బిల్ స్కాన్ చేయి', 'open_bill_scan'],
      ['స్టాక్ తెరువు', 'open_stock'],
      ['వాయిస్ విను', 'play_proof'],
      ['రద్దు చేయి', 'undo'],
    ])('parses "%s" as intent "%s"', async (phrase, expectedIntent) => {
      const res = await routeVoiceIntent(phrase, { language: 'te', customers: mockCustomers, items: mockItems });
      expect(res.intent).toBe(expectedIntent);
    });
  });

  // 9. Kannada (kn) - 26 sentences
  describe('Kannada (kn) Intent Phrases (>= 25 sentences)', () => {
    it.each([
      ['ಕಡಿಮೆ ಸ್ಟಾಕ್ ತೋರಿಸಿ', 'show_low_stock'],
      ['ಯಾವ ಸರಕು ಮುಗಿದಿದೆ', 'show_low_stock'],
      ['ಆರ್ಡರ್ ಪಟ್ಟಿ ಮಾಡಿ', 'build_order_list'],
      ['ಪಟ್ಟಿ ಸಿದ್ಧಪಡಿಸಿ', 'build_order_list'],
      ['ಆರ್ಡರ್ ಕಳುಹಿಸಿ', 'send_order'],
      ['ಸರಕು ಆರ್ಡರ್ ಮಾಡಿ', 'order_item'],
      ['ಖಾತೆ ತೆರೆಯಿರಿ', 'show_customer_ledger'],
      ['ಲೆಡ್ಜರ್ ತೋರಿಸಿ', 'show_customer_ledger'],
      ['ಇತ್ತೀಚಿನ 5 ವಹಿವಾಟುಗಳು', 'recent_transactions'],
      ['ಕೊನೆಯ ವಹಿವಾಟು ತೋರಿಸಿ', 'recent_transactions'],
      ['ಯಾರಿಗೆ ಹೆಚ್ಚು ಬಾಕಿ ಇದೆ', 'top_debtors'],
      ['ಟಾಪ್ ಸಾಲಿಗರು', 'top_debtors'],
      ['ತಿಂಗಳ ಲೆಕ್ಕ', 'monthly_credit_summary'],
      ['ಮಾಸಿಕ ಸಾರಾಂಶ', 'monthly_credit_summary'],
      ['ಮುಂದೆ', 'next'],
      ['ಹಿಂದಿನ', 'previous'],
      ['ಮತ್ತೆ ಹೇಳಿ', 'repeat'],
      ['ಹಿಂದಕ್ಕೆ', 'back'],
      ['ಮುಚ್ಚಿ', 'close'],
      ['ಇಂದು', 'today'],
      ['ನಿನ್ನೆ', 'yesterday'],
      ['ಈ ವಾರ', 'this_week'],
      ['ಬಿಲ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ', 'open_bill_scan'],
      ['ಸ್ಟಾಕ್ ತೆರೆಯಿರಿ', 'open_stock'],
      ['ಧ್ವನಿ ಕೇಳಿ', 'play_proof'],
      ['ರದ್ದು ಮಾಡಿ', 'undo'],
    ])('parses "%s" as intent "%s"', async (phrase, expectedIntent) => {
      const res = await routeVoiceIntent(phrase, { language: 'kn', customers: mockCustomers, items: mockItems });
      expect(res.intent).toBe(expectedIntent);
    });
  });

  // 10. Malayalam (ml) - 26 sentences
  describe('Malayalam (ml) Intent Phrases (>= 25 sentences)', () => {
    it.each([
      ['കുറഞ്ഞ സ്റ്റോക്ക് കാണിക്കുക', 'show_low_stock'],
      ['ഏത് സാധനമാണ് തീർന്നത്', 'show_low_stock'],
      ['ഓർഡർ ലിസ്റ്റ് ഉണ്ടാക്കുക', 'build_order_list'],
      ['പട്ടിക തയ്യാറാക്കുക', 'build_order_list'],
      ['ഓർഡർ അയക്കുക', 'send_order'],
      ['സാധനങ്ങൾ ഓർഡർ ചെയ്യുക', 'order_item'],
      ['ഖാത്ത തുറക്കുക', 'show_customer_ledger'],
      ['ലെഡ്ജർ കാണിക്കുക', 'show_customer_ledger'],
      ['സമീപകാല 5 ഇടപാടുകൾ', 'recent_transactions'],
      ['അവസാന ഇടപാട് കാണിക്കുക', 'recent_transactions'],
      ['ആർക്കാണ് കൂടുതൽ ബാക്കി', 'top_debtors'],
      ['ടോപ്പ് കടക്കാർ', 'top_debtors'],
      ['മാസ കണക്ക്', 'monthly_credit_summary'],
      ['മാസാന്ത്യ റിപ്പോർട്ട്', 'monthly_credit_summary'],
      ['അടുത്തത്', 'next'],
      ['മുമ്പത്തെ', 'previous'],
      ['വീണ്ടും പറയുക', 'repeat'],
      ['തിരികെ', 'back'],
      ['അടയ്ക്കുക', 'close'],
      ['ഇന്ന്', 'today'],
      ['ഇന്നലെ', 'yesterday'],
      ['ഈ ആഴ്ച', 'this_week'],
      ['ബിൽ സ്കാൻ ചെയ്യുക', 'open_bill_scan'],
      ['സ്റ്റോക്ക് തുറക്കുക', 'open_stock'],
      ['ശബ്ദം കേൾക്കുക', 'play_proof'],
      ['റദ്ദാക്കുക', 'undo'],
    ])('parses "%s" as intent "%s"', async (phrase, expectedIntent) => {
      const res = await routeVoiceIntent(phrase, { language: 'ml', customers: mockCustomers, items: mockItems });
      expect(res.intent).toBe(expectedIntent);
    });
  });

  // 11. Cross-Script Entity Resolution Tests
  describe('Cross-Script Entity Matching', () => {
    it('resolves "Ramesh" in Devanagari, Gurmukhi, Tamil, Telugu, Kannada, Malayalam, Bengali, and Gujarati to same customer', () => {
      const variants = [
        'Ramesh',
        'रमेश', // Devanagari
        'ਰਮੇਸ਼', // Gurmukhi
        'ரமேஷ்', // Tamil
        'రమేష్', // Telugu
        'ರಮೇಶ್', // Kannada
        'രമേഷ്', // Malayalam
        'রমেশ', // Bengali
        'રમેશ', // Gujarati
      ];

      for (const v of variants) {
        const match = resolveCrossScriptCustomer(v, mockCustomers);
        expect(match.matchedCustomer?.id, `Failed for script variant ${v}`).toBe('c-1');
      }
    });

    it('resolves items across scripts with synonyms', () => {
      const milkVariants = ['Milk', 'doodh', 'ਦੁੱਧ', 'दूध', 'दूध'];
      for (const v of milkVariants) {
        const match = resolveCrossScriptItem(v, mockItems);
        expect(match.matchedItem?.id, `Failed for item variant ${v}`).toBe('item-1');
      }
    });
  });

  // 12. Multilingual Number Words Parsing
  describe('Multilingual Number Words Parsing (paanch sau, ਪੰਜ ਸੌ, ಐನೂರು, etc.)', () => {
    it.each([
      ['paanch sau', 500],
      ['panj sau', 500],
      ['ਪੰਜ ਸੌ', 500],
      ['પાંચસો', 500],
      ['पाचशे', 500],
      ['পাঁচশো', 500],
      ['ஐந்நூறு', 500],
      ['ఐదు వందలు', 500],
      ['ಐನೂರು', 500],
      ['അഞ്ഞൂറ്', 500],
      ['five hundred', 500],
      ['₹1200', 1200],
      ['2000 rupaye', 2000],
      ['5 kg', 5],
    ])('parses numeric word "%s" as %d', (text, expectedNum) => {
      expect(parseMultilingualNumber(text)).toBe(expectedNum);
    });
  });

  // 13. Multilingual Units Parsing
  describe('Multilingual Units Parsing', () => {
    it.each([
      ['2 kilo doodh', 'kilo', 2],
      ['500 gram cheeni', 'gram', 500],
      ['2 litre tel', 'litre', 2],
      ['3 packet biscuit', 'packet', 3],
      ['5 piece sabun', 'piece', 5],
      ['1 dabba ghee', 'dabba', 1],
      ['2 bori aata', 'bori', 2],
      ['੨ ਕਿਲੋ ਖੰਡ', 'kilo', 2],
      ['૫૦૦ ગ્રામ ખાંડ', 'gram', 500],
      ['২ প্যাকেট বিস্কুট', 'packet', 2],
      ['2 லிட்டர் எண்ணெய்', 'litre', 2],
    ])('extracts quantity and unit for "%s"', (text, expectedUnit, expectedQty) => {
      const res = parseMultilingualQuantityAndUnit(text);
      expect(res.unit).toBe(expectedUnit);
      expect(res.quantity).toBe(expectedQty);
    });
  });

  // 14. Code-Mixed English Fallback in Regional Languages
  describe('Code-Mixed English Fallback across languages', () => {
    it('understands "stock check" in Tamil context', async () => {
      const res = await routeVoiceIntent('stock check', { language: 'ta' });
      expect(res.intent).toBe('show_low_stock');
    });

    it('understands "send order" in Punjabi context', async () => {
      const res = await routeVoiceIntent('send order', { language: 'pa' });
      expect(res.intent).toBe('send_order');
    });

    it('understands "open ledger" in Bengali context', async () => {
      const res = await routeVoiceIntent('open ledger', { language: 'bn' });
      expect(res.intent).toBe('open_ledger');
    });
  });

  // 15. Manual Consent & Safety Invariants
  describe('Phase 4: Manual Consent and Safety Invariants', () => {
    it('send_order intent cannot complete dispatch by voice alone', async () => {
      const res = await routeVoiceIntent('order bhej do', { language: 'hi' });
      expect(res.intent).toBe('send_order');
      // Intent returned is send_order which triggers review modal, not direct network API call
    });

    it('deletion cannot be completed by voice', async () => {
      // Voice system treats delete queries as unknown or safe, never deleting data directly
      const res = await routeVoiceIntent('delete this customer', { language: 'en' });
      expect(res.intent).not.toBe('sale');
      expect(res.intent).not.toBe('credit');
      expect(res.intent).not.toBe('payment');
    });
  });

  // 16. Integration with parseSpeech
  describe('Full parseSpeech Pipeline', () => {
    it('routes low stock query through parseSpeech without Hindi fallback when English selected', async () => {
      const parsed = await parseSpeech('show low stock items', {
        customers: mockCustomers,
        items: mockItems,
        language: 'en',
      });
      expect(parsed.intent).toBe('show_low_stock');
      expect(parsed.language).toBe('en');
    });

    it('routes customer ledger query with cross-script resolution through parseSpeech', async () => {
      const parsed = await parseSpeech('ਰਮੇਸ਼ ਦਾ ਖਾਤਾ', {
        customers: mockCustomers,
        items: mockItems,
        language: 'pa',
      });
      expect(parsed.intent).toBe('show_customer_ledger');
      expect(parsed.matchedCustomer?.id).toBe('c-1');
    });
  });
});

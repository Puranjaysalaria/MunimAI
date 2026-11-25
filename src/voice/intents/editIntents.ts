import { LanguageCode } from '../../i18n/types';
import { IntentMatchPattern } from '../types';

/**
 * Shared multilingual saved-entry edit intent patterns for all 10 supported Indian languages:
 * edit_entry, change_amount, change_item, change_customer, change_quantity, change_date, edit_note.
 */
export const EDIT_INTENT_PATTERNS: Record<LanguageCode, IntentMatchPattern[]> = {
  hi: [
    {
      intent: 'change_amount',
      patterns: [
        /(?:रकम|अमाउंट|पैसे|रुपये|amount|raqam|paisa|paise)\s*(?:बदलो|बदल\s*दो|चेंज\s*करो|सुधारो|सही\s*करो|कर\s*दो|badlo|badal\s*do|change|update|kar\s*do)/iu,
        /(?:बदलो|बदल\s*दो|चेंज\s*करो|सुधारो|badlo|badal\s*do|change|edit|correct)\s*(?:रकम|अमाउंट|amount|raqam|paise)/iu,
        /(?:\d+|सौ|हज़ार)\s*(?:नहीं|nahi)\s*(?:\d+|सौ|हज़ार)\s*(?:कर\s*दो|लिख\s*दो|बदलो|kar\s*do|badlo)/iu,
      ],
      confidence: 0.95,
    },
    {
      intent: 'change_item',
      patterns: [
        /(?:सामान|चीज़|आइटम|सौदा|item|samaan|saaman)\s*(?:बदलो|बदल\s*दो|चेंज\s*करो|सुधारो|सही\s*करो|ठीक\s*करो|badlo|badal\s*do|change|update|sudharo|sahi\s*karo|theek\s*karo)/iu,
        /(?:बदलो|बदल\s*दो|चेंज\s*करो|badlo|change)\s*(?:सामान|चीज़|आइटम|item|samaan)/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'change_customer',
      patterns: [
        /(?:ग्राहक|कस्टमर|नाम|customer|grahak|naam)\s*(?:बदलो|बदल\s*दो|चेंज\s*करो|सुधारो|सही\s*करो|ठीक\s*करो|badlo|badal\s*do|change|update|sudharo|sahi\s*karo|theek\s*karo)/iu,
        /(?:बदलो|बदल\s*दो|चेंज\s*करो|badlo|change)\s*(?:ग्राहक|कस्टमर|नाम|customer|grahak)/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'change_quantity',
      patterns: [
        /(?:मात्रा|क्वांटिटी|किलो|लीटर|पैकेट|वजन|quantity|qty|maatra|wazan)\s*(?:बदलो|बदल\s*दो|चेंज\s*करो|बढ़ाओ|घटाओ|कर\s*दो|सुधारो|सही\s*करो|badlo|badal\s*do|change|update|sudharo|sahi\s*karo|theek\s*karo)/iu,
        /(?:बदलो|बदल\s*दो|चेंज\s*करो|badlo|change)\s*(?:मात्रा|क्वांटिटी|quantity|qty)/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'change_date',
      patterns: [
        /(?:तारीख|तारीख़|दिन|डेट|date|taarikh|tarikh)\s*(?:बदलो|बदल\s*दो|चेंज\s*करो|कर\s*दो|सुधारो|सही\s*करो|badlo|badal\s*do|change|update|sudharo|sahi\s*karo|theek\s*karo)/iu,
        /(?:बदलो|बदल\s*दो|चेंज\s*करो|badlo|change)\s*(?:तारीख|तारीख़|date|taarikh)/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'edit_note',
      patterns: [
        /(?:नोट|टिप्पणी|रिमार्क|विवरण|note|remark|comment|tippani)\s*(?:बदलो|बदल\s*दो|जोड़ो|लिखो|सुधारो|एडिट\s*करो|badlo|jodo|edit|update|add)/iu,
        /(?:एडिट|बदलो|जोड़ो|edit|update|add)\s*(?:नोट|note|remark)/iu,
      ],
      confidence: 0.94,
    },
    {
      intent: 'edit_entry',
      patterns: [
        /(?:एंट्री|लेन-देन|हिसाब|रसीद|entry|hisab|len\s*den|transaction|record)\s*(?:बदलो|बदल\s*दो|सुधारो|एडिट\s*करो|सही\s*करो|ठीक\s*करो|badlo|badal\s*do|sudharo|edit|modify|correct|update)/iu,
        /(?:बदलो|बदल\s*दो|सुधारो|एडिट\s*करो|edit|modify|correct|update|change)\s*(?:पिछली|आखिरी|लास्ट|last|previous|recent)?\s*(?:एंट्री|लेन-देन|हिसाब|entry|transaction|record)/iu,
        /(?:गलत|galat)\s*(?:एंट्री|लिख\s*गया|हो\s*गया|entry)\s*(?:सुधारो|बदलो|सही\s*करो|sudharo|badlo|correct)/iu,
      ],
      confidence: 0.93,
    },
  ],
  en: [
    {
      intent: 'change_amount',
      patterns: [
        /(?:change|edit|update|correct|fix|modify)\s*(?:the\s*)?(?:amount|price|total|rupees|value)/i,
        /(?:amount|price|total)\s*(?:ko\s*)?(?:change|update|edit|fix)\s*(?:karo|to)?/i,
      ],
      confidence: 0.95,
    },
    {
      intent: 'change_item',
      patterns: [
        /(?:change|edit|update|replace|switch)\s*(?:the\s*)?(?:item|product|goods)/i,
      ],
      confidence: 0.94,
    },
    {
      intent: 'change_customer',
      patterns: [
        /(?:change|edit|update|switch|correct)\s*(?:the\s*)?(?:customer|name|buyer|person)/i,
      ],
      confidence: 0.94,
    },
    {
      intent: 'change_quantity',
      patterns: [
        /(?:change|edit|update|correct|adjust)\s*(?:the\s*)?(?:quantity|qty|weight|count|kilos?)/i,
      ],
      confidence: 0.94,
    },
    {
      intent: 'change_date',
      patterns: [
        /(?:change|edit|update|correct)\s*(?:the\s*)?(?:date|day|time)/i,
      ],
      confidence: 0.94,
    },
    {
      intent: 'edit_note',
      patterns: [
        /(?:edit|change|update|add)\s*(?:the\s*)?(?:note|remark|comment|memo|description)/i,
      ],
      confidence: 0.94,
    },
    {
      intent: 'edit_entry',
      patterns: [
        /(?:edit|change|update|correct|modify|fix)\s*(?:the\s*)?(?:last|previous|recent|this)?\s*(?:entry|transaction|record|bill)/i,
        /(?:wrong|incorrect)\s*(?:entry|transaction)\s*(?:fix|edit|correct)?/i,
      ],
      confidence: 0.93,
    },
  ],
  pa: [
    {
      intent: 'change_amount',
      patterns: [/(?:ਰਕਮ|ਪੈਸੇ|ਰੁਪਏ|amount)\s*(?:ਬਦਲੋ|ਬਦਲ\s*ਦਿਓ|ਸੁਧਾਰੋ|ਠੀਕ\s*ਕਰੋ|badlo)/iu],
      confidence: 0.95,
    },
    {
      intent: 'change_item',
      patterns: [/(?:ਸਾਮਾਨ|ਚੀਜ਼|ਆਈਟਮ|item)\s*(?:ਬਦਲੋ|ਬਦਲ\s*ਦਿਓ|badlo)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_customer',
      patterns: [/(?:ਗਾਹਕ|ਨਾਮ|customer)\s*(?:ਬਦਲੋ|ਬਦਲ\s*ਦਿਓ|badlo)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_quantity',
      patterns: [/(?:ਮਾਤਰਾ|ਕਿਲੋ|ਵਜ਼ਨ|quantity)\s*(?:ਬਦਲੋ|ਬਦਲ\s*ਦਿਓ|ਵਧਾਓ|ਘਟਾਓ|badlo)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_date',
      patterns: [/(?:ਤਾਰੀਖ਼|ਤਾਰੀਖ|ਦਿਨ|date)\s*(?:ਬਦਲੋ|ਬਦਲ\s*ਦਿਓ|badlo)/iu],
      confidence: 0.94,
    },
    {
      intent: 'edit_note',
      patterns: [/(?:ਨੋਟ|ਟਿੱਪਣੀ|note)\s*(?:ਬਦਲੋ|ਜੋੜੋ|ਲਿਖੋ|ਐਡਿਟ\s*ਕਰੋ)/iu],
      confidence: 0.94,
    },
    {
      intent: 'edit_entry',
      patterns: [
        /(?:ਐਂਟਰੀ|ਲੈਣ-ਦੇਣ|ਹਿਸਾਬ|ਪਰਚੀ)\s*(?:ਬਦਲੋ|ਬਦਲ\s*ਦਿਓ|ਸੁਧਾਰੋ|ਠੀਕ\s*ਕਰੋ|ਐਡਿਟ\s*ਕਰੋ)/iu,
        /(?:ਪਿਛਲੀ|ਆਖਰੀ)\s*(?:ਐਂਟਰੀ|ਲੈਣ-ਦੇਣ)\s*(?:ਬਦਲੋ|ਸੁਧਾਰੋ)/iu,
      ],
      confidence: 0.93,
    },
  ],
  gu: [
    {
      intent: 'change_amount',
      patterns: [/(?:રકમ|પૈસા|રૂપિયા)\s*(?:બદલો|સુધારો|કરો)/iu],
      confidence: 0.95,
    },
    {
      intent: 'change_item',
      patterns: [/(?:સામાન|વસ્તુ)\s*(?:બદલો|સુધારો)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_customer',
      patterns: [/(?:ગ્રાહક|નામ)\s*(?:બદલો|સુધારો)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_quantity',
      patterns: [/(?:જથ્થો|માત્રા|કિલો)\s*(?:બદલો|સુધારો|વધારો|ઘટાડો)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_date',
      patterns: [/(?:તારીખ|દિવસ)\s*(?:બદલો|સુધારો)/iu],
      confidence: 0.94,
    },
    {
      intent: 'edit_note',
      patterns: [/(?:નોંધ|નોટ)\s*(?:બદલો|ઉમેરો|સુધારો)/iu],
      confidence: 0.94,
    },
    {
      intent: 'edit_entry',
      patterns: [/(?:એન્ટ્રી|વ્યવહાર|હિસાબ)\s*(?:બદલો|સુધારો|એડિટ\s*કરો)/iu],
      confidence: 0.93,
    },
  ],
  mr: [
    {
      intent: 'change_amount',
      patterns: [/(?:रक्कम|पैसे|रुपये)\s*(?:बदला|सुधारा|करा)/iu],
      confidence: 0.95,
    },
    {
      intent: 'change_item',
      patterns: [/(?:वस्तू|सामान)\s*(?:बदला|सुधारा)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_customer',
      patterns: [/(?:ग्राहक|नाव)\s*(?:बदला|सुधारा)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_quantity',
      patterns: [/(?:प्रमाण|वजन|किलो)\s*(?:बदला|सुधारा|वाढवा|कमी\s*करा)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_date',
      patterns: [/(?:तारीख|दिवस)\s*(?:बदला|सुधारा)/iu],
      confidence: 0.94,
    },
    {
      intent: 'edit_note',
      patterns: [/(?:नोंद|टीप|नोट)\s*(?:बदला|जोडा|सुधारा)/iu],
      confidence: 0.94,
    },
    {
      intent: 'edit_entry',
      patterns: [/(?:नोंद|व्यवहार|हिशोब|एंट्री)\s*(?:बदला|सुधारा|एडिट\s*करा)/iu],
      confidence: 0.93,
    },
  ],
  bn: [
    {
      intent: 'change_amount',
      patterns: [/(?:টাকা|পরিমাণ|দাম)\s*(?:বদলাও|পরিবর্তন\s*করো|ঠিক\s*করো)/iu],
      confidence: 0.95,
    },
    {
      intent: 'change_item',
      patterns: [/(?:জিনিস|পণ্য|সওদা)\s*(?:বদলাও|পরিবর্তন\s*করো)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_customer',
      patterns: [/(?:গ্রাহক|নাম|ক্রেতা)\s*(?:বদলাও|পরিবর্তন\s*করো)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_quantity',
      patterns: [/(?:পরিমাণ|ওজন|কেজি)\s*(?:বদলাও|পরিবর্তন\s*করো|বাড়াও|কমাও)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_date',
      patterns: [/(?:তারিখ|দিন)\s*(?:বদলাও|পরিবর্তন\s*করো)/iu],
      confidence: 0.94,
    },
    {
      intent: 'edit_note',
      patterns: [/(?:নোট|মন্তব্য)\s*(?:বদলাও|যোগ\s*করো|এডিট\s*করো)/iu],
      confidence: 0.94,
    },
    {
      intent: 'edit_entry',
      patterns: [/(?:এন্ট্রি|লেনদেন|হিসাব)\s*(?:বদলাও|পরিবর্তন\s*করো|ঠিক\s*করো|এডিট\s*করো)/iu],
      confidence: 0.93,
    },
  ],
  ta: [
    {
      intent: 'change_amount',
      patterns: [/(?:தொகை|பணம்|விலை)\s*(?:மாற்று|திருத்து)/iu],
      confidence: 0.95,
    },
    {
      intent: 'change_item',
      patterns: [/(?:பொருள்|சரக்கு)\s*(?:மாற்று|திருத்து)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_customer',
      patterns: [/(?:வாடிக்கையாளர்|பெயர்)\s*(?:மாற்று|திருத்து)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_quantity',
      patterns: [/(?:அளவு|எடை|கிலோ)\s*(?:மாற்று|திருத்து)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_date',
      patterns: [/(?:தேதி|நாள்)\s*(?:மாற்று|திருத்து)/iu],
      confidence: 0.94,
    },
    {
      intent: 'edit_note',
      patterns: [/(?:குறிப்பு|நோட்)\s*(?:மாற்று|சேர்|திருத்து)/iu],
      confidence: 0.94,
    },
    {
      intent: 'edit_entry',
      patterns: [/(?:பதிவு|பரிவர்த்தனை|கணக்கு)\s*(?:மாற்று|திருத்து)/iu],
      confidence: 0.93,
    },
  ],
  te: [
    {
      intent: 'change_amount',
      patterns: [/(?:మొత్తం|డబ్బు|ధర)\s*(?:మార్చు|సరిచేయు)/iu],
      confidence: 0.95,
    },
    {
      intent: 'change_item',
      patterns: [/(?:వస్తువు|సరుకు)\s*(?:మార్చు|సరిచేయు)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_customer',
      patterns: [/(?:కస్టమర్|పేరు)\s*(?:మార్చు|సరిచేయు)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_quantity',
      patterns: [/(?:పరిమాణం|బరువు|కిలో)\s*(?:మార్చు|సరిచేయు)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_date',
      patterns: [/(?:తేదీ|రోజు)\s*(?:మార్చు|సరిచేయు)/iu],
      confidence: 0.94,
    },
    {
      intent: 'edit_note',
      patterns: [/(?:నోట్|గమనిక)\s*(?:మార్చు|చేర్చు|సరిచేయు)/iu],
      confidence: 0.94,
    },
    {
      intent: 'edit_entry',
      patterns: [/(?:ఎంట్రీ|లావాదేవీ|లెక్క)\s*(?:మార్చు|సరిచేయు)/iu],
      confidence: 0.93,
    },
  ],
  kn: [
    {
      intent: 'change_amount',
      patterns: [/(?:ಮೊತ್ತ|ಹಣ|ಬೆಲೆ)\s*(?:ಬದಲಾಯಿಸಿ|ತಿದ್ದುಪಡಿ\s*ಮಾಡಿ)/iu],
      confidence: 0.95,
    },
    {
      intent: 'change_item',
      patterns: [/(?:ವಸ್ತು|ಸಾಮಾನು)\s*(?:ಬದಲಾಯಿಸಿ|ತಿದ್ದುಪಡಿ\s*ಮಾಡಿ)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_customer',
      patterns: [/(?:ಗ್ರಾಹಕ|ಹೆಸರು)\s*(?:ಬದಲಾಯಿಸಿ|ತಿದ್ದುಪಡಿ\s*ಮಾಡಿ)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_quantity',
      patterns: [/(?:ಪ್ರಮಾಣ|ತೂಕ|ಕಿಲೋ)\s*(?:ಬದಲಾಯಿಸಿ|ತಿದ್ದುಪಡಿ\s*ಮಾಡಿ)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_date',
      patterns: [/(?:ದಿನಾಂಕ|ದಿನ)\s*(?:ಬದಲಾಯಿಸಿ|ತಿದ್ದುಪಡಿ\s*ಮಾಡಿ)/iu],
      confidence: 0.94,
    },
    {
      intent: 'edit_note',
      patterns: [/(?:ಟಿಪ್ಪಣಿ|ನೋಟ್)\s*(?:ಬದಲಾಯಿಸಿ|ಸೇರಿಸಿ)/iu],
      confidence: 0.94,
    },
    {
      intent: 'edit_entry',
      patterns: [/(?:ಎಂಟ್ರಿ|ವಹಿವಾಟು|ಲೆಕ್ಕ)\s*(?:ಬದಲಾಯಿಸಿ|ತಿದ್ದುಪಡಿ\s*ಮಾಡಿ)/iu],
      confidence: 0.93,
    },
  ],
  ml: [
    {
      intent: 'change_amount',
      patterns: [/(?:തുക|പണം|വില)\s*(?:മാറ്റുക|തിരുത്തുക)/iu],
      confidence: 0.95,
    },
    {
      intent: 'change_item',
      patterns: [/(?:സാധനം|വസ്തു)\s*(?:മാറ്റുക|തിരുത്തുക)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_customer',
      patterns: [/(?:ഉപഭോക്താവ്|പേര്)\s*(?:മാറ്റുക|തിരുത്തുക)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_quantity',
      patterns: [/(?:അളവ്|തൂക്കം|കിലോ)\s*(?:മാറ്റുക|തിരുത്തുക)/iu],
      confidence: 0.94,
    },
    {
      intent: 'change_date',
      patterns: [/(?:തീയതി|ദിവസം)\s*(?:മാറ്റുക|തിരുത്തുക)/iu],
      confidence: 0.94,
    },
    {
      intent: 'edit_note',
      patterns: [/(?:കുറിപ്പ്|നോട്ട്)\s*(?:മാറ്റുക|ചേർക്കുക|തിരുത്തുക)/iu],
      confidence: 0.94,
    },
    {
      intent: 'edit_entry',
      patterns: [/(?:എൻട്രി|ഇടപാട്|കണക്ക്)\s*(?:മാറ്റുക|തിരുത്തുക)/iu],
      confidence: 0.93,
    },
  ],
};

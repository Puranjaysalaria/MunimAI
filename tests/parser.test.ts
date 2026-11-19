import { describe, it, expect } from 'vitest';
import { parseSpeech } from '../src/parser';
import { extractNumbers, extractQuantityAndUnit } from '../src/parser/numbers';
import { resolveItemSynonym, findMentionedItems } from '../src/parser/synonyms';
import { INITIAL_CUSTOMERS, INITIAL_ITEMS } from '../src/data/mockData';

const testContext = {
  customers: INITIAL_CUSTOMERS,
  items: INITIAL_ITEMS,
};

describe('Number Parser - Multilingual Variants', () => {
  it('parses numeric digits (50, 500, 1450)', () => {
    expect(extractNumbers('50')).toEqual([50]);
    expect(extractNumbers('500')).toEqual([500]);
    expect(extractNumbers('1450')).toEqual([1450]);
  });

  it('parses Hindi number words (pachaas, paanch sau, dhai sau, dedh sau)', () => {
    expect(extractNumbers('pachaas')).toContain(50);
    expect(extractNumbers('paanch sau')).toContain(500);
    expect(extractNumbers('dhai sau')).toContain(250);
    expect(extractNumbers('dedh sau')).toContain(150);
    expect(extractNumbers('ek hazaar')).toContain(1000);
  });

  it('parses Punjabi number words (panj sau, panjaah, veeha, das)', () => {
    expect(extractNumbers('panj sau')).toContain(500);
    expect(extractNumbers('panjaah')).toContain(50);
    expect(extractNumbers('veeha')).toContain(20);
    expect(extractNumbers('das')).toContain(10);
  });

  it('parses English words (fifty, hundred, five hundred, thousand)', () => {
    expect(extractNumbers('fifty')).toContain(50);
    expect(extractNumbers('five hundred')).toContain(500);
    expect(extractNumbers('thousand')).toContain(1000);
  });

  it('extracts fractional quantities (adha kilo, 5 kilo, 2 litre)', () => {
    const q1 = extractQuantityAndUnit('adha kilo chini');
    expect(q1.quantity).toBe(0.5);
    expect(q1.unit).toBe('kilo');

    const q2 = extractQuantityAndUnit('5 kilo aata');
    expect(q2.quantity).toBe(5);
    expect(q2.unit).toBe('kilo');

    const q3 = extractQuantityAndUnit('2 litre doodh');
    expect(q3.quantity).toBe(2);
    expect(q3.unit).toBe('litre');
  });
});

describe('Synonym Registry - Kirana Items', () => {
  it('maps cheeni, khand, and sugar to chini', () => {
    expect(resolveItemSynonym('cheeni')).toBe('chini');
    expect(resolveItemSynonym('khand')).toBe('chini');
    expect(resolveItemSynonym('sugar')).toBe('chini');
  });

  it('maps atta and flour to aata', () => {
    expect(resolveItemSynonym('atta')).toBe('aata');
    expect(resolveItemSynonym('flour')).toBe('aata');
  });

  it('maps milk and dudh to doodh', () => {
    expect(resolveItemSynonym('milk')).toBe('doodh');
    expect(resolveItemSynonym('dudh')).toBe('doodh');
  });

  it('detects multiple items in compound sentences', () => {
    const items = findMentionedItems('aata aur chini aur doodh');
    const names = items.map((i) => i.canonical);
    expect(names).toContain('aata');
    expect(names).toContain('chini');
    expect(names).toContain('doodh');
  });

  it('handles words outside the starter dictionary via dynamic inventory', () => {
    // Custom item added by shopkeeper not in starter 12
    const customItem = {
      id: 'custom-1',
      shop_id: 'shop-1',
      name: 'besan',
      synonyms: ['chana aata', 'gram flour'],
      unit: 'kilo' as const,
      cost_price: 70,
      selling_price: 85,
      current_stock: 20,
      min_threshold: 5,
    };

    const result = resolveItemSynonym('gram flour', [customItem]);
    expect(result).toBe('besan');
  });

  it('extracts completely unknown spoken items using positional grammar', async () => {
    // "poha" is neither in static dictionary nor in demo items
    const res = await parseSpeech('5 kilo poha bechi', testContext);
    expect(res.intent).toBe('sale');
    expect(res.item).toBe('poha');
    expect(res.quantity).toBe(5);
  });
});

describe('Speech Parser - 30+ Multilingual Sentences Across All Intents', () => {
  // 1. Sale Intent (6 sentences)
  it('1. parses Hindi sale: "Aaj 5 kilo chini bechi"', async () => {
    const res = await parseSpeech('Aaj 5 kilo chini bechi', testContext);
    expect(res.intent).toBe('sale');
    expect(res.item).toBe('chini');
    expect(res.quantity).toBe(5);
    expect(res.unit).toBe('kilo');
    expect(res.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('2. parses Hinglish sale: "5 kg sugar vechi"', async () => {
    const res = await parseSpeech('5 kg sugar vechi', testContext);
    expect(res.intent).toBe('sale');
    expect(res.item).toBe('chini');
    expect(res.quantity).toBe(5);
  });

  it('3. parses Punjabi sale: "Aj 2 litre doodh vech ditta"', async () => {
    const res = await parseSpeech('Aj 2 litre doodh vech ditta', testContext);
    expect(res.intent).toBe('sale');
    expect(res.item).toBe('doodh');
    expect(res.quantity).toBe(2);
    expect(res.language).toBe('pa');
  });

  it('4. parses packet sale: "10 packet maggi becha"', async () => {
    const res = await parseSpeech('10 packet maggi becha', testContext);
    expect(res.intent).toBe('sale');
    expect(res.item).toBe('maggi');
    expect(res.quantity).toBe(10);
    expect(res.unit).toBe('packet');
  });

  it('5. parses multiple items sale: "Chawal aur aata becha"', async () => {
    const res = await parseSpeech('Chawal aur aata becha', testContext);
    expect(res.intent).toBe('sale');
    expect(res.item).toBe('chawal');
  });

  it('6. parses cash sale: "Ek packet namak cash sale"', async () => {
    const res = await parseSpeech('Ek packet namak cash sale', testContext);
    expect(res.intent).toBe('sale');
    expect(res.item).toBe('namak');
    expect(res.quantity).toBe(1);
  });

  // 2. Credit Intent & Disambiguation (7 sentences)
  it('7. parses credit entry: "Ramesh Sharma ko 500 ka udhaar, aata aur chini"', async () => {
    const res = await parseSpeech('Ramesh Sharma ko 500 ka udhaar, aata aur chini', testContext);
    expect(res.intent).toBe('credit');
    expect(res.amount).toBe(500);
    expect(res.matchedCustomer?.name).toBe('Ramesh Sharma');
    expect(res.ambiguousCustomers?.length).toBe(0);
  });

  it('8. triggers disambiguation on ambiguous name: "Ramesh ko 500 ka udhaar"', async () => {
    const res = await parseSpeech('Ramesh ko 500 ka udhaar', testContext);
    expect(res.intent).toBe('credit');
    expect(res.amount).toBe(500);
    expect(res.ambiguousCustomers?.length).toBe(2); // Ramesh Sharma & Ramesh Kumar
    expect(res.questionToAsk).toContain('Kaunsa Ramesh?');
  });

  it('9. parses Punjabi credit: "Gurpreet nu 2200 da udhaar"', async () => {
    const res = await parseSpeech('Gurpreet nu 2200 da udhaar', testContext);
    expect(res.intent).toBe('credit');
    expect(res.amount).toBe(2200);
    expect(res.matchedCustomer?.name).toBe('Gurpreet Singh');
    expect(res.language).toBe('pa');
  });

  it('10. parses credit with word number: "Sunita Devi ke khate mein pachaas likh do"', async () => {
    const res = await parseSpeech('Sunita Devi ke khate mein pachaas likh do', testContext);
    expect(res.intent).toBe('credit');
    expect(res.amount).toBe(50);
    expect(res.matchedCustomer?.name).toBe('Sunita Devi');
  });

  it('11. parses Punjabi credit with word number: "Harpreet Kaur nu panj sau da udhaar likh deo"', async () => {
    const res = await parseSpeech('Harpreet Kaur nu panj sau da udhaar likh deo', testContext);
    expect(res.intent).toBe('credit');
    expect(res.amount).toBe(500);
    expect(res.matchedCustomer?.name).toBe('Harpreet Kaur');
  });

  it('12. parses credit with item and amount: "Amit Verma ko 850 ka samaan udhaar"', async () => {
    const res = await parseSpeech('Amit Verma ko 850 ka samaan udhaar', testContext);
    expect(res.intent).toBe('credit');
    expect(res.amount).toBe(850);
    expect(res.matchedCustomer?.name).toBe('Amit Verma');
  });

  it('13. detects unknown customer: "Gaurav ko 300 ka udhaar"', async () => {
    const res = await parseSpeech('Gaurav ko 300 ka udhaar', testContext);
    expect(res.intent).toBe('credit');
    expect(res.amount).toBe(300);
    expect(res.questionToAsk).toContain('Naya customer');
  });

  // 3. Payment Received Intent (5 sentences)
  it('14. parses payment: "Ramesh Sharma ne 200 diye"', async () => {
    const res = await parseSpeech('Ramesh Sharma ne 200 diye', testContext);
    expect(res.intent).toBe('payment');
    expect(res.amount).toBe(200);
    expect(res.matchedCustomer?.name).toBe('Ramesh Sharma');
  });

  it('15. parses payment with 500: "Ramesh Kumar ne 500 diye"', async () => {
    const res = await parseSpeech('Ramesh Kumar ne 500 diye', testContext);
    expect(res.intent).toBe('payment');
    expect(res.amount).toBe(500);
    expect(res.matchedCustomer?.name).toBe('Ramesh Kumar');
  });

  it('16. parses payment with word number: "Gurpreet Singh ne ek hazaar jama karwaye"', async () => {
    const res = await parseSpeech('Gurpreet Singh ne ek hazaar jama karwaye', testContext);
    expect(res.intent).toBe('payment');
    expect(res.amount).toBe(1000);
    expect(res.matchedCustomer?.name).toBe('Gurpreet Singh');
  });

  it('17. parses Punjabi payment: "Harpreet ne 400 wapis kite"', async () => {
    const res = await parseSpeech('Harpreet ne 400 wapis kite', testContext);
    expect(res.intent).toBe('payment');
    expect(res.amount).toBe(400);
    expect(res.matchedCustomer?.name).toBe('Harpreet Kaur');
  });

  it('18. parses payment: "Sunita ne 350 lauta diye"', async () => {
    const res = await parseSpeech('Sunita ne 350 lauta diye', testContext);
    expect(res.intent).toBe('payment');
    expect(res.amount).toBe(350);
    expect(res.matchedCustomer?.name).toBe('Sunita Devi');
  });

  // 4. Stock Inquiry Intent (4 sentences)
  it('19. parses stock check: "Doodh khatam hone wala hai?"', async () => {
    const res = await parseSpeech('Doodh khatam hone wala hai?', testContext);
    expect(res.intent).toBe('stock');
    expect(res.item).toBe('doodh');
  });

  it('20. parses stock query: "Chini kitni bachi hai?"', async () => {
    const res = await parseSpeech('Chini kitni bachi hai?', testContext);
    expect(res.intent).toBe('stock');
    expect(res.item).toBe('chini');
  });

  it('21. parses Punjabi stock: "Aata da stock kinna hai?"', async () => {
    const res = await parseSpeech('Aata da stock kinna hai?', testContext);
    expect(res.intent).toBe('stock');
    expect(res.item).toBe('aata');
  });

  it('22. parses stock query: "Tel khatam ho gaya kya?"', async () => {
    const res = await parseSpeech('Tel khatam ho gaya kya?', testContext);
    expect(res.intent).toBe('stock');
    expect(res.item).toBe('tel');
  });

  // 5. Recovery Reminders Intent (3 sentences)
  it('23. parses recovery: "Jinka 1000 se zyada baaki hai, unko yaad dilao"', async () => {
    const res = await parseSpeech('Jinka 1000 se zyada baaki hai, unko yaad dilao', testContext);
    expect(res.intent).toBe('recovery');
    expect(res.amount).toBe(1000);
  });

  it('24. parses Punjabi recovery: "500 to vadh waleyan nu remind karo"', async () => {
    const res = await parseSpeech('500 to vadh waleyan nu remind karo', testContext);
    expect(res.intent).toBe('recovery');
    expect(res.amount).toBe(500);
  });

  it('25. parses recovery: "Sabhi baaki walo ko tagada bhejo"', async () => {
    const res = await parseSpeech('Sabhi baaki walo ko tagada bhejo', testContext);
    expect(res.intent).toBe('recovery');
  });

  // 6. Summary Intent (3 sentences)
  it('26. parses summary: "Aaj kitni kamai hui?"', async () => {
    const res = await parseSpeech('Aaj kitni kamai hui?', testContext);
    expect(res.intent).toBe('summary');
  });

  it('27. parses Punjabi summary: "Aj da kul hisaab kitna hai?"', async () => {
    const res = await parseSpeech('Aj da kul hisaab kitna hai?', testContext);
    expect(res.intent).toBe('summary');
    expect(res.language).toBe('pa');
  });

  it('28. parses summary: "Din bhar ki total sale aur profit dikhao"', async () => {
    const res = await parseSpeech('Din bhar ki total sale aur profit dikhao', testContext);
    expect(res.intent).toBe('summary');
  });

  // 7. Ordering Intent (3 sentences)
  it('29. parses ordering: "Agle hafte ka samaan mangwana hai"', async () => {
    const res = await parseSpeech('Agle hafte ka samaan mangwana hai', testContext);
    expect(res.intent).toBe('ordering');
  });

  it('30. parses Punjabi ordering: "Supplier to maal mangwana hai"', async () => {
    const res = await parseSpeech('Supplier to maal mangwana hai', testContext);
    expect(res.intent).toBe('ordering');
  });

  it('31. parses ordering: "Low stock items ka order banao"', async () => {
    const res = await parseSpeech('Low stock items ka order banao', testContext);
    expect(res.intent).toBe('ordering');
  });

  // 8. Confirmations, Undo & Proof (6 sentences)
  it('32. parses confirm YES: "Haan likh do"', async () => {
    const res = await parseSpeech('Haan likh do', testContext);
    expect(res.intent).toBe('confirm_yes');
  });

  it('33. parses Punjabi confirm YES: "Aaho likh deo"', async () => {
    const res = await parseSpeech('Aaho likh deo', testContext);
    expect(res.intent).toBe('confirm_yes');
    expect(res.language).toBe('pa');
  });

  it('34. parses confirm NO: "Nahi ruko cancel"', async () => {
    const res = await parseSpeech('Nahi ruko cancel', testContext);
    expect(res.intent).toBe('confirm_no');
  });

  it('35. parses undo: "Wapas karo"', async () => {
    const res = await parseSpeech('Wapas karo', testContext);
    expect(res.intent).toBe('undo');
  });

  it('36. parses Punjabi undo: "Galat ho gaya wapis mod do"', async () => {
    const res = await parseSpeech('Galat ho gaya wapis mod do', testContext);
    expect(res.intent).toBe('undo');
  });

  it('37. parses proof recording: "Customer se bulwayein"', async () => {
    const res = await parseSpeech('Customer se bulwayein', testContext);
    expect(res.intent).toBe('proof');
  });

  // 9. Noise / Garbled Input
  it('38. handles garbled or low-confidence noise with clarification prompt', async () => {
    const res = await parseSpeech('...', testContext);
    expect(res.confidence).toBeLessThan(0.7);
    expect(res.spokenReply).toContain('साफ़ नहीं आई');
  });

  // 10. Devanagari Native Hindi Voice Inputs & STT phonetic corrections
  describe('Devanagari Native Hindi Speech Recognition', () => {
    it('39. parses Devanagari multi-item credit with phonetic STT repair (दूर -> doodh): "शर्मा को दो किलो चीनी और एक पैकेट दूर लिख दो।"', async () => {
      const res = await parseSpeech('शर्मा को दो किलो चीनी और एक पैकेट दूर लिख दो।', testContext);
      expect(res.intent).toBe('credit');
      expect(res.confidence).toBeGreaterThanOrEqual(0.85);
      expect(res.matchedCustomer?.name).toBe('Ramesh Sharma');
      // Chini (44 * 2 = 88) + Doodh (66 * 1 = 66) = 154
      expect(res.amount).toBe(154);
      expect(res.item).toContain('chini');
    });

    it('40. handles Devanagari ambiguous customer: "रमेश को 500 रुपये लिख दो"', async () => {
      const res = await parseSpeech('रमेश को 500 रुपये लिख दो', testContext);
      expect(res.intent).toBe('credit');
      expect(res.amount).toBe(500);
      expect(res.ambiguousCustomers?.length).toBeGreaterThanOrEqual(2);
    });

    it('41. parses Devanagari payment: "सुनीता ने 350 रुपये जमा किए"', async () => {
      const res = await parseSpeech('सुनीता ने 350 रुपये जमा किए', testContext);
      expect(res.intent).toBe('payment');
      expect(res.matchedCustomer?.name).toBe('Sunita Devi');
      expect(res.amount).toBe(350);
    });

    it('42. parses Devanagari stock check: "दूध कितना बचा है"', async () => {
      const res = await parseSpeech('दूध कितना बचा है', testContext);
      expect(res.intent).toBe('stock');
      expect(res.item).toBe('doodh');
    });

    it('43. parses Devanagari daily summary: "आज की कमाई कितनी हुई"', async () => {
      const res = await parseSpeech('आज की कमाई कितनी हुई', testContext);
      expect(res.intent).toBe('summary');
    });
  });

  // 11. English Natural Voice Inputs (Loan, Credit, Payment, Sales)
  describe('English Natural Speech Recognition', () => {
    it('44. parses English loan query: "Ankit 900 loan"', async () => {
      const res = await parseSpeech('Ankit 900 loan', testContext);
      expect(res.intent).toBe('credit');
      expect(res.amount).toBe(900);
      expect(res.customer).toBe('Ankit');
      expect(res.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('45. parses English credit with preposition: "add 500 loan for Ramesh"', async () => {
      const res = await parseSpeech('add 500 loan for Ramesh', testContext);
      expect(res.intent).toBe('credit');
      expect(res.amount).toBe(500);
      expect(res.ambiguousCustomers?.length).toBeGreaterThanOrEqual(2);
    });

    it('46. parses English payment: "Sunita 350 payment"', async () => {
      const res = await parseSpeech('Sunita 350 payment', testContext);
      expect(res.intent).toBe('payment');
      expect(res.amount).toBe(350);
      expect(res.matchedCustomer?.name).toBe('Sunita Devi');
    });

    it('47. parses English payment received: "received 400 from Ankit"', async () => {
      const res = await parseSpeech('received 400 from Ankit', testContext);
      expect(res.intent).toBe('payment');
      expect(res.amount).toBe(400);
      expect(res.customer).toBe('Ankit');
    });

    it('48. parses English sale: "sold 2 packets milk cash"', async () => {
      const res = await parseSpeech('sold 2 packets milk cash', testContext);
      expect(res.intent).toBe('sale');
      expect(res.item).toBe('doodh');
    });

    it('49. parses payment with "has given" and "ruppees": "ankit has given 500 ruppees"', async () => {
      const res = await parseSpeech('ankit has given 500 ruppees', testContext);
      expect(res.intent).toBe('payment');
      expect(res.amount).toBe(500);
      expect(res.customer).toBe('Ankit');
      expect(res.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('50. parses payment with "gave": "Ankit gave 500 rupees"', async () => {
      const res = await parseSpeech('Ankit gave 500 rupees', testContext);
      expect(res.intent).toBe('payment');
      expect(res.amount).toBe(500);
      expect(res.customer).toBe('Ankit');
    });

    it('51. parses payment with "given by": "500 given by Ankit"', async () => {
      const res = await parseSpeech('500 given by Ankit', testContext);
      expect(res.intent).toBe('payment');
      expect(res.amount).toBe(500);
      expect(res.customer).toBe('Ankit');
    });

    it('52. parses Devanagari yes/no confirmation: "हाँ" and "नहीं"', async () => {
      const yesRes = await parseSpeech('हाँ', testContext);
      expect(yesRes.intent).toBe('confirm_yes');

      const noRes = await parseSpeech('नहीं', testContext);
      expect(noRes.intent).toBe('confirm_no');
    });

    it('53. parses Gurmukhi yes/no confirmation: "ਹਾਂ" and "ਨਹੀਂ"', async () => {
      const yesRes = await parseSpeech('ਹਾਂ', testContext);
      expect(yesRes.intent).toBe('confirm_yes');

      const noRes = await parseSpeech('ਨਹੀਂ', testContext);
      expect(noRes.intent).toBe('confirm_no');
    });
  });
});

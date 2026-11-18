import { Item } from '../types/schema';

export interface SeasonalInsight {
  seasonKey: string;
  seasonName: string;
  seasonNamePa: string;
  seasonNameEn: string;
  description: string;
  descriptionPa: string;
  descriptionEn: string;
  impactedItemNames: string[];
  recommendedBoostPercentage: number;
}

/**
 * Returns seasonal stocking recommendations based on current month/festival calendar in India
 */
export function getSeasonalStockInsights(currentDate: Date = new Date()): SeasonalInsight[] {
  const month = currentDate.getMonth(); // 0 = Jan, 9 = Oct, 10 = Nov

  const insights: SeasonalInsight[] = [];

  // Diwali / Festive Season (October - November)
  if (month === 9 || month === 10) {
    insights.push({
      seasonKey: 'diwali',
      seasonName: 'दीवाली व त्यौहार का सीज़न',
      seasonNamePa: 'ਦੀਵਾਲੀ ਅਤੇ ਤਿਉਹਾਰ ਦਾ ਸੀਜ਼ਨ',
      seasonNameEn: 'Diwali & Festive Season',
      description: 'मिठाइयों और पकवानों के लिए चीनी, आटा, मैदा, तेल और मसालों की मांग 30-40% बढ़ती है।',
      descriptionPa: 'ਮਿਠਾਈਆਂ ਲਈ ਖੰਡ, ਆਟਾ, ਤੇਲ ਅਤੇ ਮਸਾਲਿਆਂ ਦੀ ਮੰਗ 30-40% ਵੱਧਦੀ ਹੈ।',
      descriptionEn: 'High demand for sugar, flour, cooking oil, and spices for sweets and festivities (+35%).',
      impactedItemNames: ['chini', 'aata', 'tel', 'haldi', 'biscuit'],
      recommendedBoostPercentage: 35,
    });
  }

  // Holi & Spring Festival (February - March)
  if (month === 1 || month === 2) {
    insights.push({
      seasonKey: 'holi',
      seasonName: 'होली व बसंत उत्सव',
      seasonNamePa: 'ਹੋਲੀ ਦਾ ਤਿਉਹਾਰ',
      seasonNameEn: 'Holi Festival',
      description: 'गुझिया और नमकीन बनाने के लिए चीनी, तेल और सूजी/आटा का 25% अतिरिक्त स्टॉक रखें।',
      descriptionPa: 'ਹੋਲੀ ਦੇ ਪਕਵਾਨਾਂ ਲਈ ਖੰਡ ਅਤੇ ਤੇਲ ਦਾ ਵਾਧੂ ਸਟਾਕ ਰੱਖੋ।',
      descriptionEn: 'Stock extra sugar and cooking oil (+25%) for festival preparations.',
      impactedItemNames: ['chini', 'tel', 'aata', 'namak'],
      recommendedBoostPercentage: 25,
    });
  }

  // Wedding & Sawa Season (November - February, May - June)
  if ([10, 11, 0, 1, 4, 5].includes(month)) {
    insights.push({
      seasonKey: 'wedding',
      seasonName: 'शादियों और सावे का सीज़न',
      seasonNamePa: 'ਵਿਆਹਾਂ ਦਾ ਸੀਜ਼ਨ',
      seasonNameEn: 'Wedding & Catering Season',
      description: 'शादी के दावतों के लिए दाल, चावल, चीनी और दूध की थोक मांग बढ़ जाती है।',
      descriptionPa: 'ਦਾਅਵਤਾਂ ਲਈ ਦਾਲ, ਚੌਲ, ਖੰਡ ਅਤੇ ਦੁੱਧ ਦੀ ਥੋਕ ਮੰਗ ਵੱਧ ਜਾਂਦੀ ਹੈ।',
      descriptionEn: 'High volume wholesale orders for pulses, rice, sugar, and dairy (+30%).',
      impactedItemNames: ['dal', 'chawal', 'chini', 'doodh', 'tel'],
      recommendedBoostPercentage: 30,
    });
  }

  // Summer Dairy & Beverages (April - July)
  if (month >= 3 && month <= 6) {
    insights.push({
      seasonKey: 'summer',
      seasonName: 'गर्मी और शीतल पेय सीज़न',
      seasonNamePa: 'ਗਰਮੀਆਂ ਦਾ ਸੀਜ਼ਨ',
      seasonNameEn: 'Summer Season',
      description: 'लस्सी, छाछ और दही के लिए दूध की दैनिक खपत 20% बढ़ जाती है।',
      descriptionPa: 'ਲੱਸੀ ਅਤੇ ਦਹੀਂ ਲਈ ਦੁੱਧ ਦੀ ਖਪਤ 20% ਵੱਧਦੀ ਹੈ।',
      descriptionEn: 'Elevated daily demand for milk and curd (+20%).',
      impactedItemNames: ['doodh', 'chini', 'namak'],
      recommendedBoostPercentage: 20,
    });
  }

  // Fallback ongoing seasonal recommendation
  if (insights.length === 0) {
    insights.push({
      seasonKey: 'regular',
      seasonName: 'साप्ताहिक ग्रॉसरी सीज़न',
      seasonNamePa: 'ਹਫ਼ਤਾਵਾਰੀ ਰਾਸ਼ਨ',
      seasonNameEn: 'Weekly Staple Replenishment',
      description: 'दुकान के मुख्य सामान (आटा, चीनी, दूध, तेल) का 7 दिन का बफ़र स्टॉक बनाए रखें।',
      descriptionPa: 'ਮੁੱਖ ਚੀਜ਼ਾਂ ਦਾ 7 ਦਿਨਾਂ ਦਾ ਸਟਾਕ ਬਣਾ ਕੇ ਰੱਖੋ।',
      descriptionEn: 'Maintain a 7-day safety buffer on core essentials (flour, sugar, milk, oil).',
      impactedItemNames: ['aata', 'chini', 'doodh', 'tel'],
      recommendedBoostPercentage: 15,
    });
  }

  return insights;
}

/**
 * Filter items that should have extra stock ordered based on the active seasonal insight
 */
export function getSeasonalRecommendedItems(items: Item[], insight: SeasonalInsight): Item[] {
  return items.filter((item) =>
    insight.impactedItemNames.some(
      (name) =>
        item.name.toLowerCase() === name.toLowerCase() ||
        item.synonyms.some((s) => s.toLowerCase() === name.toLowerCase())
    )
  );
}

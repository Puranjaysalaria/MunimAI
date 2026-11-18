/**
 * Converts numbers into spoken words in Hindi, Punjabi, and English
 * Used to read amounts back in both words and digits per prompt requirement.
 */

export function amountToWords(amount: number, lang: 'hi' | 'pa' | 'en' = 'hi'): string {
  const rounded = Math.round(amount);

  if (lang === 'pa') {
    if (rounded === 50) return 'ਪੰਜਾਹ';
    if (rounded === 100) return 'ਇੱਕ ਸੌ';
    if (rounded === 150) return 'ਡੇਢ ਸੌ';
    if (rounded === 200) return 'ਦੋ ਸੌ';
    if (rounded === 250) return 'ਢਾਈ ਸੌ';
    if (rounded === 500) return 'ਪੰਜ ਸੌ';
    if (rounded === 1000) return 'ਇੱਕ ਹਜ਼ਾਰ';
    if (rounded === 2000) return 'ਦੋ ਹਜ਼ਾਰ';
    return `${rounded} ਰੁਪਏ`;
  }

  if (lang === 'en') {
    if (rounded === 50) return 'fifty';
    if (rounded === 100) return 'one hundred';
    if (rounded === 150) return 'one hundred fifty';
    if (rounded === 200) return 'two hundred';
    if (rounded === 250) return 'two hundred fifty';
    if (rounded === 500) return 'five hundred';
    if (rounded === 1000) return 'one thousand';
    if (rounded === 2000) return 'two thousand';
    return `${rounded} rupees`;
  }

  // Hindi default
  if (rounded === 50) return 'पचास';
  if (rounded === 100) return 'एक सौ';
  if (rounded === 150) return 'डेढ़ सौ';
  if (rounded === 200) return 'दो सौ';
  if (rounded === 250) return 'ढाई सौ';
  if (rounded === 300) return 'तीन सौ';
  if (rounded === 400) return 'चार सौ';
  if (rounded === 500) return 'पाँच सौ';
  if (rounded === 1000) return 'एक हज़ार';
  if (rounded === 2000) return 'दो हज़ार';
  if (rounded === 5000) return 'पाँच हज़ार';

  return `${rounded} रुपये`;
}

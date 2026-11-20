/**
 * Converts numbers into spoken words across all 10 Indian languages
 * Used to read amounts back in both words and digits for natural, crystal-clear voice prompts.
 */

export function amountToWords(amount: number, lang: string = 'hi'): string {
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

  if (lang === 'gu') {
    if (rounded === 50) return 'પચાસ';
    if (rounded === 100) return 'એક સો';
    if (rounded === 150) return 'દોઢ સો';
    if (rounded === 200) return 'બસો';
    if (rounded === 250) return 'અઢી સો';
    if (rounded === 500) return 'પાંચસો';
    if (rounded === 1000) return 'એક હજાર';
    if (rounded === 2000) return 'બે હજાર';
    return `${rounded} રૂપિયા`;
  }

  if (lang === 'mr') {
    if (rounded === 50) return 'पन्नास';
    if (rounded === 100) return 'शंभर';
    if (rounded === 150) return 'दीडशे';
    if (rounded === 200) return 'दोनशे';
    if (rounded === 250) return 'अडीचशे';
    if (rounded === 500) return 'पाचशे';
    if (rounded === 1000) return 'एक हजार';
    if (rounded === 2000) return 'दोन हजार';
    return `${rounded} रुपये`;
  }

  if (lang === 'bn') {
    if (rounded === 50) return 'পঞ্চাশ';
    if (rounded === 100) return 'একশত';
    if (rounded === 150) return 'দেড়শত';
    if (rounded === 200) return 'দুইশত';
    if (rounded === 250) return 'আড়াইশত';
    if (rounded === 500) return 'পাঁচশত';
    if (rounded === 1000) return 'এক হাজার';
    if (rounded === 2000) return 'দুই হাজার';
    return `${rounded} টাকা`;
  }

  if (lang === 'ta') {
    if (rounded === 50) return 'ஐம்பது';
    if (rounded === 100) return 'நூறு';
    if (rounded === 200) return 'இருநூறு';
    if (rounded === 500) return 'ஐந்நூறு';
    if (rounded === 1000) return 'ஆயிரம்';
    return `${rounded} ரூபாய்`;
  }

  if (lang === 'te') {
    if (rounded === 50) return 'యాభై';
    if (rounded === 100) return 'వంద';
    if (rounded === 200) return 'రెండు వందలు';
    if (rounded === 500) return 'ఐదు వందలు';
    if (rounded === 1000) return 'వెయ్యి';
    return `${rounded} రూపాయలు`;
  }

  if (lang === 'kn') {
    if (rounded === 50) return 'ಐವತ್ತು';
    if (rounded === 100) return 'ನೂರು';
    if (rounded === 200) return 'ಇನ್ನೂರು';
    if (rounded === 500) return 'ಐನೂರು';
    if (rounded === 1000) return 'ಒಂದು ಸಾವಿರ';
    return `${rounded} ರೂಪಾಯಿ`;
  }

  if (lang === 'ml') {
    if (rounded === 50) return 'അമ്പത്';
    if (rounded === 100) return 'നൂറ്';
    if (rounded === 200) return 'ഇരുന്നൂറ്';
    if (rounded === 500) return 'അഞ്ഞൂറ്';
    if (rounded === 1000) return 'ആയിരം';
    return `${rounded} രൂപ`;
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

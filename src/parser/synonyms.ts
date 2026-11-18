import { Item } from '../types/schema';
import { transliterateIndicToLatin } from './indicNormalizer';

export interface ItemSynonymDef {
  canonical: string;
  unit: string;
  synonyms: string[];
}

export const KIRANA_SYNONYM_REGISTRY: ItemSynonymDef[] = [
  {
    canonical: 'chini',
    unit: 'kilo',
    synonyms: ['chini', 'cheeni', 'khand', 'khandi', 'sugar', 'sakkar', 'mishri', 'shakkar', 'चीनी', 'चीनि', 'खांड', 'ਸ਼ੱਕਰ', 'ਖੰਡ'],
  },
  {
    canonical: 'aata',
    unit: 'kilo',
    synonyms: ['aata', 'atta', 'flour', 'gehu aata', 'gehun ka aata', 'chakki aata', 'ashirvaad aata', 'आटा', 'आट्टा', 'ਆਟਾ'],
  },
  {
    canonical: 'doodh',
    unit: 'litre',
    synonyms: ['doodh', 'dudh', 'dhoodh', 'milk', 'amul doodh', 'amul taaza', 'taaza doodh', 'dahi', 'door', 'दूध', 'दुध', 'दूर', 'ਦੁੱਧ'],
  },
  {
    canonical: 'chawal',
    unit: 'kilo',
    synonyms: ['chawal', 'chaawal', 'rice', 'basmati', 'kolam', 'tota pari', 'चावल', 'ਚੌਲ'],
  },
  {
    canonical: 'dal',
    unit: 'kilo',
    synonyms: ['dal', 'daal', 'toor dal', 'arhar dal', 'moong dal', 'chana dal', 'masoor dal', 'pulses', 'दाल', 'ਦਾਲ'],
  },
  {
    canonical: 'tel',
    unit: 'litre',
    synonyms: ['tel', 'tail', 'oil', 'mustard oil', 'sarso tel', 'sarson tel', 'fortune oil', 'refine', 'refined tel', 'तेल', 'ਤੇਲ'],
  },
  {
    canonical: 'chai patti',
    unit: 'packet',
    synonyms: ['chai patti', 'chai', 'cha patti', 'cha', 'tea', 'patti', 'taj mahal', 'tata tea', 'red label', 'wagh bakri', 'चाय', 'ਚਾਹ'],
  },
  {
    canonical: 'namak',
    unit: 'packet',
    synonyms: ['namak', 'salt', 'tata salt', 'sendha namak', 'kala namak', 'loon', 'noon', 'नमक', 'ਲੂਣ'],
  },
  {
    canonical: 'sabun',
    unit: 'piece',
    synonyms: ['sabun', 'saboon', 'soap', 'lifebuoy', 'dettol', 'lux', 'rin', 'surf', 'surf excel', 'tide', 'wheel', 'साबुन', 'ਸਾਬਣ'],
  },
  {
    canonical: 'biscuit',
    unit: 'packet',
    synonyms: ['biscuit', 'biscuits', 'biskit', 'parle-g', 'parleg', 'parle g', 'good day', 'monaco', 'marie', 'बिस्कुट', 'बिस्किट', 'ਬਿਸਕੁਟ'],
  },
  {
    canonical: 'haldi',
    unit: 'packet',
    synonyms: ['haldi', 'turmeric', 'haldi powder', 'masala', 'everest haldi', 'catch haldi', 'हल्दी', 'ਹਲਦੀ'],
  },
  {
    canonical: 'maggi',
    unit: 'packet',
    synonyms: ['maggi', 'maggie', 'noodles', 'maggi noodles', 'chhoti maggi', '2-minute maggi', 'मैगी', 'ਮੈਗੀ'],
  },
];

/**
 * Finds all matched items mentioned in a sentence.
 * Dynamically checks BOTH the built-in dictionary AND the shopkeeper's dynamic inventory items!
 */
export function findMentionedItems(
  text: string,
  dynamicItems: Item[] = []
): { canonical: string; matchedSynonym: string; defaultUnit: string; index: number; isCustom?: boolean }[] {
  const normalized = transliterateIndicToLatin(text);
  const lower = normalized.toLowerCase();
  const matched: { canonical: string; matchedSynonym: string; defaultUnit: string; index: number; isCustom?: boolean }[] = [];

  // 1. Build combined registry: static items + shopkeeper's dynamic custom inventory
  const combinedRegistry: ItemSynonymDef[] = [...KIRANA_SYNONYM_REGISTRY];

  if (dynamicItems && dynamicItems.length > 0) {
    for (const dyn of dynamicItems) {
      if (!combinedRegistry.some((c) => c.canonical.toLowerCase() === dyn.name.toLowerCase())) {
        combinedRegistry.push({
          canonical: dyn.name,
          unit: dyn.unit,
          synonyms: [dyn.name, ...(dyn.synonyms || [])],
        });
      }
    }
  }

  for (const item of combinedRegistry) {
    for (const syn of item.synonyms) {
      const regex = new RegExp(`\\b${syn.replace(/\s+/g, '\\s+')}\\b`, 'i');
      const match = lower.match(regex);
      if (match && match.index !== undefined) {
        if (!matched.some((m) => m.canonical === item.canonical)) {
          matched.push({
            canonical: item.canonical,
            matchedSynonym: syn,
            defaultUnit: item.unit,
            index: match.index,
          });
        }
        break;
      }
    }
  }

  // 2. Positional Grammar Fallback for completely unknown words outside dictionary:
  // e.g., "5 kilo besan becha" -> matches pattern `(\d+|adha|ek|do|teen)\s+(kilo|packet|litre|piece)\s+([a-zA-Z\u0900-\u097F]+)`
  if (matched.length === 0) {
    const unknownItemPattern = /(?:\d+|adha|aadha|paav|pao|ek|ik|do|teen|char|paanch|panj)\s*(?:kilo|kg|litre|packet|piece|gram|bori)\s+([a-zA-Z\u0900-\u097F]+)/i;
    const match = lower.match(unknownItemPattern);
    if (match && match[1]) {
      const extractedWord = match[1].trim();
      // Ignore common action verbs
      const ignoreWords = ['bechi', 'becha', 'vechi', 'vech', 'diya', 'diye', 'ka', 'ke', 'ko', 'aur', 'te', 'de', 'bika'];
      if (!ignoreWords.includes(extractedWord) && extractedWord.length >= 3) {
        matched.push({
          canonical: extractedWord,
          matchedSynonym: extractedWord,
          defaultUnit: 'piece',
          index: match.index ?? 0,
          isCustom: true,
        });
      }
    }
  }

  // Sort by order of appearance in the sentence
  matched.sort((a, b) => a.index - b.index);

  return matched;
}

export function resolveItemSynonym(query: string, dynamicItems: Item[] = []): string | null {
  const matches = findMentionedItems(query, dynamicItems);
  return matches.length > 0 ? matches[0].canonical : null;
}

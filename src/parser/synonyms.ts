/**
 * Kirana Item Synonym Dictionary & Normalizer
 * Maps local Hindi, Punjabi, and colloquial terms to canonical inventory items.
 */

export interface ItemSynonymDef {
  canonical: string;
  unit: string;
  synonyms: string[];
}

export const KIRANA_SYNONYM_REGISTRY: ItemSynonymDef[] = [
  {
    canonical: 'chini',
    unit: 'kilo',
    synonyms: ['chini', 'cheeni', 'khand', 'khandi', 'sugar', 'sakkar', 'mishri', 'shakkar'],
  },
  {
    canonical: 'aata',
    unit: 'kilo',
    synonyms: ['aata', 'atta', 'flour', 'gehu aata', 'gehun ka aata', 'chakki aata', 'ashirvaad aata'],
  },
  {
    canonical: 'doodh',
    unit: 'litre',
    synonyms: ['doodh', 'dudh', 'dhoodh', 'milk', 'amul doodh', 'amul taaza', 'taaza doodh', 'dahi'],
  },
  {
    canonical: 'chawal',
    unit: 'kilo',
    synonyms: ['chawal', 'chaawal', 'rice', 'basmati', 'kolam', 'tota pari'],
  },
  {
    canonical: 'dal',
    unit: 'kilo',
    synonyms: ['dal', 'daal', 'toor dal', 'arhar dal', 'moong dal', 'chana dal', 'masoor dal', 'pulses'],
  },
  {
    canonical: 'tel',
    unit: 'litre',
    synonyms: ['tel', 'tail', 'oil', 'mustard oil', 'sarso tel', 'sarson tel', 'fortune oil', 'refine', 'refined tel'],
  },
  {
    canonical: 'chai patti',
    unit: 'packet',
    synonyms: ['chai patti', 'chai', 'cha patti', 'cha', 'tea', 'patti', 'taj mahal', 'tata tea', 'red label', 'wagh bakri'],
  },
  {
    canonical: 'namak',
    unit: 'packet',
    synonyms: ['namak', 'salt', 'tata salt', 'sendha namak', 'kala namak', 'loon', 'noon'],
  },
  {
    canonical: 'sabun',
    unit: 'piece',
    synonyms: ['sabun', 'saboon', 'soap', 'lifebuoy', 'dettol', 'lux', 'rin', 'surf', 'surf excel', 'tide', 'wheel'],
  },
  {
    canonical: 'biscuit',
    unit: 'packet',
    synonyms: ['biscuit', 'biscuits', 'biskit', 'parle-g', 'parleg', 'parle g', 'good day', 'monaco', 'marie'],
  },
  {
    canonical: 'haldi',
    unit: 'packet',
    synonyms: ['haldi', 'turmeric', 'haldi powder', 'masala', 'everest haldi', 'catch haldi'],
  },
  {
    canonical: 'maggi',
    unit: 'packet',
    synonyms: ['maggi', 'maggie', 'noodles', 'maggi noodles', 'chhoti maggi', '2-minute maggi'],
  },
];

/**
 * Finds all matched items mentioned in a sentence, ordered by their appearance in the text.
 */
export function findMentionedItems(
  text: string
): { canonical: string; matchedSynonym: string; defaultUnit: string; index: number }[] {
  const lower = text.toLowerCase();
  const matched: { canonical: string; matchedSynonym: string; defaultUnit: string; index: number }[] = [];

  for (const item of KIRANA_SYNONYM_REGISTRY) {
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

  // Sort by order of appearance in the sentence
  matched.sort((a, b) => a.index - b.index);

  return matched;
}

export function resolveItemSynonym(query: string): string | null {
  const matches = findMentionedItems(query);
  return matches.length > 0 ? matches[0].canonical : null;
}

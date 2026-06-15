// services/nerParserService.js

/**
 * Number words → digit map (English + Hindi numerals + Hinglish variants).
 * FIX: Added missing Hindi/Hinglish quantity words: dono, couple, single, double, triple, half, full.
 */
const NUMBER_WORDS = {
  // English
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  single: 1, double: 2, triple: 3, couple: 2, half: 1, full: 1,
  // Hindi (Devanagari romanised)
  ek: 1, do: 2, teen: 3, char: 4, paanch: 5,
  chhe: 6, saat: 7, aath: 8, nau: 9, das: 10,
  // Common Hinglish variants
  ik: 1, doh: 2, dono: 2, tin: 3, chaar: 4, panch: 5,
  sat: 7, nao: 9,
};

/**
 * Given a raw segment like "two paneer butter masala" or "3 mango lassi",
 * returns { quantity, itemName }.
 */
const extractQtyFromSegment = (segment) => {
  const s = segment.trim();

  // Match leading digit(s)
  const digitMatch = s.match(/^(\d+)\s+(.+)$/);
  if (digitMatch) {
    return { quantity: parseInt(digitMatch[1], 10), itemName: digitMatch[2].trim() };
  }

  // Match leading number word — sort longest first to prevent "do" matching inside "double"
  const sortedEntries = Object.entries(NUMBER_WORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [word, val] of sortedEntries) {
    const wordRegex = new RegExp(`^${word}\\s+(.+)$`, 'i');
    const m = s.match(wordRegex);
    if (m) {
      return { quantity: val, itemName: m[1].trim() };
    }
  }

  return { quantity: 1, itemName: s };
};

exports.parseEntitiesWithQty = (tokens, originalText) => {
  const items = [];
  let currentItem = [];

  // ── NER path (when HuggingFace NER returns entity tokens) ──
  const saveCurrentEntity = () => {
    if (currentItem.length > 0) {
      // FIX: Join without leading space for word-pieces — they were already handled inline
      const raw = currentItem.join(' ').replace(/\s+([.,!?])/g, '$1');
      if (raw.length > 2) {
        const { quantity, itemName } = extractQtyFromSegment(raw);
        items.push({ entityText: itemName, quantity });
      }
      currentItem = [];
    }
  };

  for (const token of tokens) {
    const type = token.entity_group || token.entity;
    if (
      type === 'ORG' || type === 'PER' || type === 'MISC' || type === 'LOC' ||
      type === 'B-ORG' || type === 'I-ORG' || type === 'B-MISC' || type === 'I-MISC'
    ) {
      let word = token.word;

      // FIX: Correctly reconstruct BERT word-pieces (## prefix tokens).
      // Append directly to the last token (no space) rather than as a new word.
      if (word.startsWith('##')) {
        if (currentItem.length > 0) {
          currentItem[currentItem.length - 1] += word.substring(2);
        }
        continue;
      }

      if (type.startsWith('B-')) {
        // B- tag always starts a new entity
        saveCurrentEntity();
      }
      // I- tags continue the current entity — push word (non-##) normally
      currentItem.push(word);
    } else {
      saveCurrentEntity();
    }
  }
  saveCurrentEntity();

  // ── Fallback path: plain-text splitting when NER yields nothing ──
  if (items.length === 0 && originalText.trim().length > 0) {
    // Split on: " and ", " aur ", " or ", comma
    const parts = originalText.split(/\s+and\s+|\s+aur\s+|\s+or\s+|,/i);
    for (const p of parts) {
      const cleaned = p.replace(/[^\w\s]/gi, '').trim();
      if (cleaned.length > 2) {
        const { quantity, itemName } = extractQtyFromSegment(cleaned);
        if (itemName.length > 2) {
          items.push({ entityText: itemName, quantity });
        }
      }
    }
  }

  return items;
};

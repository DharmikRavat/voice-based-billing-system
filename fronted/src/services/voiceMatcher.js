// src/services/voiceMatcher.js
// ─────────────────────────────────────────────────────────────
// Pure front-end voice → menu matching with high-accuracy scoring.
// Improvements: Levenshtein distance, phonetic normalization,
// multi-alternative selection, and word-alias expansion.
// ─────────────────────────────────────────────────────────────

/** Quantity words: English + full Hindi number set + Hinglish variants */
const NUMBER_WORDS = {
  // English
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  single: 1, double: 2, triple: 3, couple: 2, half: 1, full: 1,
  // Hindi (Devanagari romanised)
  ek: 1, do: 2, teen: 3, char: 4, paanch: 5,
  chhe: 6, saat: 7, aath: 8, nau: 9, das: 10,
  gyarah: 11, barah: 12, terah: 13, chaudah: 14, pandrah: 15,
  solah: 16, satrah: 17, atharah: 18, unnees: 19, bees: 20,
  // Common Hinglish variants
  ik: 1, doh: 2, dono: 2, tin: 3, chaar: 4, panch: 5,
  sat: 7, nao: 9,
};


/**
 * Convert all number words in a string to actual digits.
 * e.g. "two butter naan and three lassi" → "2 butter naan and 3 lassi"
 * Runs BEFORE any matching so quantities always appear as real numbers.
 */
function wordsToDigits(text) {
  let t = text;
  // Sort by length descending so "seventeen" is replaced before "seven"
  const entries = Object.entries(NUMBER_WORDS).sort((a, b) => b[0].length - a[0].length);
  for (const [word, digit] of entries) {
    t = t.replace(new RegExp(`\\b${word}\\b`, 'gi'), String(digit));
  }
  return t;
}

/**
 * Common speech-recognition mistakes / phonetic alternates.
 * Maps what the browser often hears → correct word.
 */
const PHONETIC_ALIASES = {
  // ── Bread / Naan
  'nan': 'naan',
  'nan bread': 'naan',
  'butter nan': 'butter naan',
  'garlic nan': 'garlic naan',
  'roti': 'naan',          // common Hindi word for bread
  'chapati': 'naan',
  'chapatti': 'naan',
  'paratha': 'naan',
  // ── Paneer
  'panner': 'paneer',
  'paner': 'paneer',
  'pneer': 'paneer',
  'paneeer': 'paneer',
  'panir': 'paneer',
  'poneer': 'paneer',
  // ── Masala / Spice
  'massala': 'masala',
  'mussala': 'masala',
  // ── Butter
  'buter': 'butter',
  'butr': 'butter',
  'makhan': 'butter',      // Hindi for butter
  // ── Tikka
  'tikki': 'tikka',
  'tikaa': 'tikka',
  'tika': 'tikka',
  // ── Lassi
  'lasi': 'lassi',
  'laasi': 'lassi',
  'lasee': 'lassi',
  'lassie': 'lassi',
  // ── Dal / Lentils
  'daal': 'dal',
  'dhal': 'dal',
  'daal makhani': 'dal makhani',
  'dal makhni': 'dal makhani',
  'makhni': 'makhani',
  'dal fry': 'dal',        // if dal fry is on menu
  // ── Samosa
  'samose': 'samosa',
  'samosay': 'samosa',
  'samosé': 'samosa',
  // ── Rasmalai / Gulab Jamun
  'rasmali': 'rasmalai',
  'ras malai': 'rasmalai',
  'gulab jamin': 'gulab jamun',
  'gulab jaman': 'gulab jamun',
  'gulaab jamun': 'gulab jamun',
  // ── Chai / Tea
  'chai tea': 'chai',
  'chay': 'chai',
  'masala chai': 'masala chai',
  'masala tea': 'masala chai',
  // ── Biryani
  'biriyani': 'biryani',
  'biriani': 'biryani',
  'briyani': 'biryani',
  'veg biryani': 'biryani',
  // ── Hindi food names → English equivalents
  'chawal': 'rice',
  'doodh': 'milk',
  'sabji': 'sabzi',
  'sabzee': 'sabzi',
  'aloo': 'potato',
  'aaloo': 'potato',
  'mirch': 'chilli',
  'gobi': 'cauliflower',
  'matar': 'peas',
  'pyaaz': 'onion',
  'tamatar': 'tomato',
};

/**
 * Apply phonetic alias substitutions to a transcript/item name.
 */
function applyAliases(text) {
  let t = text.toLowerCase().trim();
  for (const [wrong, right] of Object.entries(PHONETIC_ALIASES)) {
    t = t.replace(new RegExp(`\\b${wrong}\\b`, 'gi'), right);
  }
  return t;
}

/**
 * Strip common Hinglish/Hindi filler and request words that pollute the transcript
 * before item name matching.
 * e.g. "mujhe ek butter naan chahiye please" → "ek butter naan"
 */
const NOISE_WORDS = [
  // Hindi request/filler words
  'chahiye', 'chaiye', 'dena', 'dedo', 'de do', 'lao', 'laao',
  'mujhe', 'mujhko', 'bhai', 'yaar', 'please', 'jaldi',
  'ekdum', 'abhi', 'order', 'dijiye', 'dena ji',
  // English filler
  'i want', 'i need', 'give me', 'get me', 'add', 'bring',
  'can i have', 'can i get', 'i would like', 'i\'ll have',
  'for me', 'for us', 'for table',
  // Connectors already handled by segment splitter but just in case
  'aur', 'and', 'also', 'with',
];

function stripNoise(text) {
  let t = text.toLowerCase().trim();
  // Sort longest first to prevent partial matches
  const sorted = [...NOISE_WORDS].sort((a, b) => b.length - a.length);
  for (const w of sorted) {
    t = t.replace(new RegExp(`\\b${w}\\b`, 'gi'), ' ');
  }
  return t.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Extract quantity and item name from a segment.
 * e.g. "two paneer butter masala" → { quantity: 2, itemName: "paneer butter masala" }
 */
export function extractQtyAndName(segment) {
  // Convert word numbers to digits first so "two naan" → "2 naan"
  const s = wordsToDigits(segment.trim());

  // Leading digit (now the only path needed after wordsToDigits)
  const digitMatch = s.match(/^(\d+)\s+(.+)$/);
  if (digitMatch) {
    return { quantity: parseInt(digitMatch[1], 10), itemName: digitMatch[2].trim() };
  }

  // Trailing digit: e.g. "butter naan 2"
  const trailingMatch = s.match(/^(.+?)\s+(\d+)$/);
  if (trailingMatch) {
    return { quantity: parseInt(trailingMatch[2], 10), itemName: trailingMatch[1].trim() };
  }

  return { quantity: 1, itemName: s };
}

/**
 * Normalise: lowercase, strip punctuation, collapse spaces.
 */
function norm(str) {
  return str.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Levenshtein edit distance between two strings.
 * Lower = more similar.
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Levenshtein similarity score (0–100).
 */
function levenshteinScore(a, b) {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  return Math.round((1 - dist / maxLen) * 100);
}

/**
 * Score how well a menu item name matches a spoken item name.
 * Uses exact, substring, word-overlap, and Levenshtein scoring.
 * Returns 0–100.
 */
function matchScore(menuName, spokenName) {
  const menu = norm(applyAliases(menuName));
  const spoke = norm(applyAliases(spokenName));

  if (menu === spoke) return 100;
  if (menu.includes(spoke) && spoke.length > 3) return 92;
  if (spoke.includes(menu) && menu.length > 3) return 88;

  // Per-word Levenshtein: each spoken word vs each menu word
  const menuWords = menu.split(' ').filter(w => w.length > 2);
  const spokeWords = spoke.split(' ').filter(w => w.length > 2);

  if (menuWords.length === 0 || spokeWords.length === 0) return 0;

  // Guard: at least one spoken word must have ≥55% similarity to some menu word.
  // This prevents short/unrelated words from accumulating a score above threshold.
  const hasAnyReasonableMatch = spokeWords.some(sw =>
    menuWords.some(mw => levenshteinScore(sw, mw) >= 55)
  );
  if (!hasAnyReasonableMatch) return 0;

  let wordMatchScore = 0;
  for (const sw of spokeWords) {
    const best = Math.max(...menuWords.map(mw => levenshteinScore(sw, mw)));
    wordMatchScore += best;
  }
  const avgWordScore = wordMatchScore / spokeWords.length;

  // Exact word overlap bonus
  const exactOverlap = menuWords.filter(w => spokeWords.includes(w)).length;
  const overlapBonus = Math.round((exactOverlap / Math.max(menuWords.length, spokeWords.length)) * 20);

  return Math.min(Math.round(avgWordScore * 0.85) + overlapBonus, 99);
}

/**
 * Match a single transcript against the menu.
 * Returns { matched, notFound }.
 */
function matchTranscript(transcript, menuItems) {
  // Convert all word-numbers to digits before anything else
  const normalised = wordsToDigits(transcript);
  const segments = normalised.split(/\s+and\s+|\s+aur\s+|\s+or\s+|,/i);
  const matched = [];
  const notFound = [];

  for (const seg of segments) {
    // 1. Strip Hinglish/Hindi filler words  2. Apply phonetic aliases  3. Remove punctuation
    const cleaned = applyAliases(stripNoise(seg).replace(/[^\w\s]/gi, '').trim());
    if (!cleaned || cleaned.length < 2) continue;

    const { quantity, itemName } = extractQtyAndName(cleaned);

    let bestItem = null;
    let bestScore = 0;

    for (const item of menuItems) {
      if (!item.available) continue;
      const score = matchScore(item.name, itemName);
      if (score > bestScore) { bestScore = score; bestItem = item; }
    }

    const THRESHOLD = 62; // minimum score to accept — high enough to avoid false positives
    if (bestItem && bestScore >= THRESHOLD) {
      // FIX: MongoDB _id is an ObjectId object — must use String() for equality check.
      // Using === directly always returns false for objects, causing duplicate entries.
      const existing = matched.find(m => String(m.menuItem._id) === String(bestItem._id));
      if (existing) {
        existing.quantity += quantity;
      } else {
        matched.push({ menuItem: bestItem, quantity, score: bestScore });
      }
    } else {
      notFound.push(itemName);
    }

  }

  return { matched, notFound };
}

/**
 * Main export — tries all speech alternatives and picks the result
 * with the most matched items (and highest total score as tiebreak).
 *
 * @param {string|string[]} transcriptOrAlts  One transcript or array of alternates
 * @param {Array}           menuItems          Menu from DB
 * @returns {{ matched: Array, notFound: Array, usedTranscript: string }}
 */
export function matchVoiceToMenu(transcriptOrAlts, menuItems) {
  if (!transcriptOrAlts || !menuItems?.length) return { matched: [], notFound: [], usedTranscript: '' };

  const alternatives = Array.isArray(transcriptOrAlts)
    ? transcriptOrAlts
    : [transcriptOrAlts];

  let bestResult = null;
  let bestAlt = alternatives[0];
  let bestMatchCount = -1;
  let bestTotalScore = -1;

  for (const alt of alternatives) {
    if (!alt || !alt.trim()) continue;
    const result = matchTranscript(alt.trim(), menuItems);
    const totalScore = result.matched.reduce((s, m) => s + (m.score || 0), 0);
    if (
      result.matched.length > bestMatchCount ||
      (result.matched.length === bestMatchCount && totalScore > bestTotalScore)
    ) {
      bestResult = result;
      bestAlt = alt;
      bestMatchCount = result.matched.length;
      bestTotalScore = totalScore;
    }
  }

  return {
    matched: bestResult?.matched ?? [],
    notFound: bestResult?.notFound ?? [],
    usedTranscript: bestAlt,
  };
}

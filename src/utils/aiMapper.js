import { GEAR_INFO } from './gearData';

// Build a reverse lookup: canonical display name -> key
const NAME_TO_KEY = Object.entries(GEAR_INFO).reduce((acc, [key, meta]) => {
  if (meta && meta.name) acc[meta.name.toLowerCase()] = key;
  return acc;
}, {});

// Small alias table to catch common surface forms from AI
const ALIASES = {
  // Headwear
  'ear band': 'headband',
  'earband': 'headband',
  'ear-band': 'headband',
  'head band': 'headband',
  'headband': 'headband',
  'cap for rain': 'brim_cap',
  'brim cap': 'brim_cap',
  'rain cap': 'brim_cap',
  'cap': 'cap',
  'running cap': 'cap',
  'beanie': 'beanie',
  'winter hat': 'beanie',
  
  // Tops
  'sports bra': 'sports_bra',
  'bra': 'sports_bra',
  'tank': 'tank_top',
  'tank top': 'tank_top',
  'singlet': 'tank_top',
  'short sleeve': 'short_sleeve',
  'ss shirt': 'short_sleeve',
  't-shirt': 'short_sleeve',
  'tshirt': 'short_sleeve',
  'long sleeve': 'long_sleeve',
  'ls shirt': 'long_sleeve',
  'base layer': 'base_layer',
  'thermal': 'base_layer',
  
  // Bottoms
  'running tights': 'tights',
  'tights': 'tights',
  'leggings': 'tights',
  'shorts': 'shorts',
  'running shorts': 'shorts',
  
  // Hands
  'light gloves': 'light_gloves',
  'gloves': 'light_gloves',
  'thin gloves': 'light_gloves',
  'mittens': 'mittens',
  'heavy gloves': 'mittens',
  'liner gloves': 'glove_liners',
  'liner': 'glove_liners',
  
  // Outerwear
  'windbreaker': 'windbreaker',
  'wind jacket': 'windbreaker',
  'vest': 'vest',
  'gilet': 'vest',
  'light jacket': 'light_jacket',
  'packable rain shell': 'rain_shell',
  'rain jacket': 'rain_shell',
  'rain shell': 'rain_shell',
  'waterproof': 'rain_shell',
  'insulated jacket': 'insulated_jacket',
  'winter jacket': 'insulated_jacket',
  
  // Socks
  'running socks': 'light_socks',
  'light running socks': 'light_socks',
  'light socks': 'light_socks',
  'socks': 'light_socks',
  'double socks': 'double_socks',
  'two pairs': 'double_socks',
  'heavy running socks': 'heavy_socks',
  'heavy socks': 'heavy_socks',
  'thick socks': 'heavy_socks',
  
  // Accessories
  'sunglasses': 'sunglasses',
  'shades': 'sunglasses',
  'glasses': 'sunglasses',
  'sunscreen': 'sunscreen',
  'sun protection': 'sunscreen',
  'spf': 'sunscreen',
  
  // Nutrition/Hydration
  'water/hydration': 'hydration',
  'water': 'hydration',
  'hydration': 'hydration',
  'fluids': 'hydration',
  'energy gels/chews': 'energy_nutrition',
  'energy gels': 'energy_nutrition',
  'gels': 'energy_nutrition',
  'chews': 'energy_nutrition',
  'nutrition': 'energy_nutrition',
  
  // Care
  'anti-chafe balm': 'anti_chafe',
  'anti-chafe': 'anti_chafe',
  'antichafe': 'anti_chafe',
  'chafe protection': 'anti_chafe',
  'body glide': 'anti_chafe',
};

// normalize helper
function normalize(s = '') {
  return s
    .toLowerCase()
    .replace(/[\u2013\u2014\u2018\u2019\u201c\u201d]/g, " ") // curly punctuation
    .replace(/[^\w\s]/g, '')
    .trim();
}

// token overlap score (very simple)
function tokenScore(a = '', b = '') {
  const as = new Set(normalize(a).split(/\s+/).filter(Boolean));
  const bs = new Set(normalize(b).split(/\s+/).filter(Boolean));
  if (as.size === 0 || bs.size === 0) return 0;
  let inter = 0;
  for (const x of as) if (bs.has(x)) inter++;
  const denom = Math.max(as.size, bs.size);
  return inter / denom; // 0..1
}

// Map a single candidate string to the best canonical key
export function mapCandidateToKey(candidate) {
  const raw = (candidate || '').trim();
  const n = normalize(raw);
  if (!n) return { key: null, name: null, confidence: 0, original: raw };

  // 1) alias exact match
  if (ALIASES[n]) {
    const key = ALIASES[n];
    return { key, name: GEAR_INFO[key]?.name || key, confidence: 0.95, original: raw };
  }

  // 2) exact display name match
  if (NAME_TO_KEY[n]) {
    const key = NAME_TO_KEY[n];
    return { key, name: GEAR_INFO[key]?.name || key, confidence: 0.98, original: raw };
  }

  // 3) substring match (candidate contains canonical name or vice versa)
  for (const [canonName, key] of Object.entries(NAME_TO_KEY)) {
    if (n.includes(canonName) || canonName.includes(n)) {
      return { key, name: GEAR_INFO[key]?.name || key, confidence: 0.9, original: raw };
    }
  }

  // 4) token overlap heuristic best match
  let best = null;
  let bestScore = 0;
  for (const [canonName, key] of Object.entries(NAME_TO_KEY)) {
    const sc = tokenScore(n, canonName);
    if (sc > bestScore) {
      bestScore = sc;
      best = key;
    }
  }
  if (best && bestScore >= 0.45) {
    return { key: best, name: GEAR_INFO[best]?.name || best, confidence: Number(bestScore.toFixed(2)), original: raw };
  }

  // 5) try partial alias tokens (split and match)
  const tokens = n.split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    if (ALIASES[t]) {
      const key = ALIASES[t];
      return { key, name: GEAR_INFO[key]?.name || key, confidence: 0.7, original: raw };
    }
  }

  // 6) no match
  return { key: null, name: null, confidence: 0, original: raw };
}

// High-level API: parse AI text -> list of mapped items
/**
 * Parse AI output text and map all mentioned gear items to canonical GEAR_INFO keys.
 * Automatically extracts the "Gear Recommendation" section and returns a clean list.
 * 
 * @param {string} text - Raw AI output text
 * @returns {Array<{key: string|null, name: string, confidence: number, original: string}>}
 */
export function mapAiOutput(text) {
  if (!text || typeof text !== 'string') {
    console.warn('aiMapper: Invalid input text');
    return [];
  }
  
  // Find and extract the Gear Recommendation section
  const gearSection = extractGearSection(text);
  if (!gearSection) {
    console.warn('aiMapper: No Gear Recommendation section found in AI output');
    console.log('AI output preview:', text.substring(0, 200) + '...');
    return [];
  }
  
  console.log('aiMapper: Processing gear section:', gearSection.substring(0, 100) + '...');
  
  // Split into lines and normalize
  const lines = gearSection.split('\n').map(line => line.trim()).filter(Boolean);
  
  const results = [];
  const seenText = new Set();
  const seenKeys = new Set(); // Track mapped keys to prevent duplicates
  
  for (const line of lines) {
    // Skip headers, empty lines, or very short lines
    if (line.length < 3 || /^#+\s/.test(line) || /^[-*]\s*$/.test(line)) continue;
    
    // Remove common prefixes (bullets, numbers, dashes)
    let cleaned = line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim();
    
    // Skip if this is a section header or explanation
    if (/^(gear|recommendation|strategy|analysis|weather|run|approach|tips?|notes?):/i.test(cleaned)) continue;
    
    // Extract candidates: split by common delimiters
    const candidates = cleaned
      .split(/[,;/]|(?:\s+and\s+)|(?:\s+or\s+)/i)
      .map(c => c.trim())
      .filter(c => c.length >= 3);
    
    for (const candidate of candidates) {
      // Skip if already processed this exact text
      const candidateLower = candidate.toLowerCase();
      if (seenText.has(candidateLower)) continue;
      seenText.add(candidateLower);
      
      const match = mapCandidateToKey(candidate);
      
      // Lower confidence threshold and add better logging
      if (match.key && match.confidence >= 0.45) {
        // Skip if we already have this key (prevents duplicate water/hydration)
        if (seenKeys.has(match.key)) {
          console.log(`aiMapper: Skipping duplicate key "${match.key}" from "${candidate}"`);
          continue;
        }
        seenKeys.add(match.key);
        
        console.log(`aiMapper: Mapped "${candidate}" → ${match.key} (${(match.confidence * 100).toFixed(0)}%)`);
        results.push({
          key: match.key,
          name: match.name,
          confidence: match.confidence,
          original: candidate
        });
      } else if (match.confidence > 0) {
        console.log(`aiMapper: Low confidence for "${candidate}" → ${match.key || 'none'} (${(match.confidence * 100).toFixed(0)}%)`);
      }
    }
  }
  
  console.log(`aiMapper: Found ${results.length} valid gear items`);
  return results;
}

/**
 * Extract the Gear Recommendation section from AI output.
 * Looks for section markers and returns only the gear list portion.
 * 
 * @param {string} text - Full AI output text
 * @returns {string|null} - Extracted gear section or null if not found
 */
function extractGearSection(text) {
  if (!text) return null;
  
  // First, try to extract using the explicit delimiters
  const delimiterMatch = text.match(/---\s*GEAR\s+LIST\s+START\s*---\s*(.*?)\s*---\s*GEAR\s+LIST\s+END\s*---/is);
  if (delimiterMatch && delimiterMatch[1] && delimiterMatch[1].trim().length > 0) {
    console.log('✓ Found gear section using GEAR LIST delimiters');
    return delimiterMatch[1].trim();
  }
  
  // Try multiple patterns to find gear section with increasing flexibility
  const patterns = [
    // Standard markdown headers with clear section boundaries
    /##\s*(?:Gear\s+)?Recommendation[s]?[:\s]*(.*?)(?=##|\*\*(?:Run|Weather|Approach)|$)/is,
    /\*\*(?:Gear\s+)?Recommendation[s]?\*\*[:\s]*(.*?)(?=\*\*(?:Run|Weather|Approach)|$)/is,
    
    // Headers without clear boundaries (look for next section)
    /(?:Gear\s+)?Recommendation[s]?[:\s]*(.*?)(?=(?:Run\s+Strategy|Weather\s+Analysis|Approach|Tips)[:\s]|$)/is,
    
    // Look for "What to wear" type language
    /(?:What\s+to\s+wear|Outfit|Clothing|Apparel)[:\s]*(.*?)(?=(?:Run\s+Strategy|Weather|Approach|Tips)[:\s]|$)/is,
    
    // Numbered section (e.g., "1. Gear Recommendation")
    /\d+\.\s*(?:Gear\s+)?Recommendation[s]?[:\s]*(.*?)(?=\d+\.|##|\*\*|$)/is
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].trim().length > 10) {
      console.log('✓ Found gear section using pattern:', pattern.source.substring(0, 50) + '...');
      return match[1].trim();
    }
  }
  
  // Fallback 1: Look for bullet points before "Run Strategy"
  const strategyIndex = text.search(/(?:##?\s*)?(?:Run\s+Strategy|Approach|Tips)[:\s]/i);
  const beforeStrategy = strategyIndex > 0 ? text.substring(0, strategyIndex) : text;
  
  // Extract lines that look like gear items (bullet points with actual content)
  const bulletLines = beforeStrategy
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      // Must start with bullet/dash and have at least 5 characters of content
      return /^[-*•]\s+.{5,}/.test(trimmed) && 
             // Exclude lines that are clearly section headers
             !/^[-*•]\s*(?:weather|run|strategy|approach|tips)/i.test(trimmed);
    })
    .join('\n');
  
  if (bulletLines.length > 0) {
    console.log('✓ Found gear section using bullet point fallback');
    return bulletLines;
  }
  
  // Fallback 2: Look for lines with common gear terms before "Run Strategy"
  const gearTerms = /(?:shirt|shorts|tights|jacket|gloves|cap|hat|socks|sunglasses|sunscreen|hydration|water|gel|chafe)/i;
  const gearLines = beforeStrategy
    .split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 5 && 
             gearTerms.test(trimmed) &&
             // Exclude section headers
             !/^#+\s|^\*\*|^(?:weather|run|strategy|approach|tips):/i.test(trimmed);
    })
    .join('\n');
  
  if (gearLines.length > 0) {
    console.log('✓ Found gear section using gear terms fallback');
    return gearLines;
  }
  
  // Fallback 3: If we still have nothing, look for ANY bullet points in first half of text
  const firstHalf = text.substring(0, Math.floor(text.length / 2));
  const anyBullets = firstHalf
    .split('\n')
    .filter(line => /^[-*•]\s+.{5,}/.test(line.trim()))
    .join('\n');
  
  if (anyBullets.length > 0) {
    console.log('⚠ Using first-half bullet points as last resort');
    return anyBullets;
  }
  
  console.warn('✗ Could not extract gear section from AI output');
  return null;
}

export default { mapAiOutput, mapCandidateToKey };

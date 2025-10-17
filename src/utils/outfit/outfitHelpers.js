/**
 * Outfit recommendation utilities
 * Handles gear selection logic for hands, socks, and layers
 */

// --- Configurable Thresholds for Gear Logic ---
export const TIGHTS_TEMP_THRESHOLD = 48; // Below this adjT, add tights
export const SHORTS_TEMP_THRESHOLD = 60; // Above this adjT, add shorts
export const INSULATED_JACKET_TEMP_THRESHOLD = 15; // Above this T, switch to light jacket
export const RAIN_PROB_THRESHOLD = 50; // Precipitation probability (%) to add rain shell
export const RAIN_IN_THRESHOLD = 0.05; // Precipitation inches to add rain shell
export const WIND_BREAKER_THRESHOLD = 15; // Wind speed (mph) to add windbreaker
export const UV_INDEX_CAP_THRESHOLD = 6; // UV index to add cap/sunglasses/sunscreen
export const HUMIDITY_ANTI_CHAFE_THRESHOLD = 80; // Humidity (%) to add anti-chafe
export const TEMP_ANTI_CHAFE_THRESHOLD = 65; // Temperature (F) to add anti-chafe
export const SOCKS_LIGHT_TEMP_THRESHOLD = 70; // Above this temp, use light socks
export const SOCKS_HUMIDITY_THRESHOLD = 70; // Humidity (%) for light socks

// --- Hand Protection Thresholds ---
export const LIGHT_GLOVES_TEMP_THRESHOLD = 55; // Below this adjT, add light gloves
export const MEDIUM_GLOVES_TEMP_THRESHOLD = 45; // Below this adjT, upgrade to medium gloves
export const MITTENS_TEMP_THRESHOLD = 30; // Below this adjT, switch to mittens
export const MITTENS_LINER_TEMP_THRESHOLD = 15; // Below this adjT, add liner under mittens
export const WIND_GLOVES_THRESHOLD = 8; // Wind speed (mph) to add gloves
export const WIND_MEDIUM_GLOVES_THRESHOLD = 12; // Wind speed (mph) to upgrade to medium gloves
export const WIND_MITTENS_THRESHOLD = 15; // Wind speed (mph) to switch to mittens

// Cold hands preference: use warmer thresholds (trigger protection earlier)
export const COLD_HANDS_LIGHT_GLOVES_THRESHOLD = 60; // Cold hands: add light gloves below this
export const COLD_HANDS_MEDIUM_GLOVES_THRESHOLD = 42; // Cold hands: upgrade to medium gloves
export const COLD_HANDS_MITTENS_THRESHOLD = 30; // Cold hands: switch to mittens
export const COLD_HANDS_MITTENS_LINER_THRESHOLD = 18; // Cold hands: add liner
export const COLD_HANDS_WIND_GLOVES_THRESHOLD = 5; // Cold hands: add gloves at lower wind speed
export const COLD_HANDS_WIND_MEDIUM_THRESHOLD = 8; // Cold hands: upgrade at lower wind
export const COLD_HANDS_WIND_MITTENS_THRESHOLD = 12; // Cold hands: mittens at lower wind

/**
 * Get hands protection level from gear keys
 * @param {Array<string>} keys - Array of gear keys
 * @returns {number} Protection level (0-4)
 */
export function handsLevelFromGear(keys) {
  if (keys.includes("mittens") && keys.includes("mittens_liner")) return 4;
  if (keys.includes("mittens")) return 3;
  if (keys.includes("medium_gloves")) return 2;
  if (keys.includes("light_gloves")) return 1;
  return 0;
}

/**
 * Get human-readable label for hands protection level
 * @param {number} level - Protection level (0-4)
 * @returns {string} Label
 */
export function handsLabel(level) {
  return ["None", "Light gloves", "Medium gloves", "Mittens", "Mittens + liner"][level] || "None";
}

/**
 * Get Tailwind classes for hands protection level badge
 * @param {number} level - Protection level (0-4)
 * @returns {string} Tailwind CSS classes
 */
export function handsTone(level) {
  return [
    "bg-emerald-100 text-emerald-700 border-emerald-200",
    "bg-sky-100 text-sky-700 border-sky-200",
    "bg-amber-100 text-amber-800 border-amber-200",
    "bg-orange-100 text-orange-800 border-orange-200",
    "bg-rose-100 text-rose-800 border-rose-200"
  ][level] || "bg-gray-100 text-gray-800 border-gray-200";
}

/**
 * Choose appropriate socks based on weather conditions
 * Three-level progression: light_socks -> heavy_socks -> double_socks
 * 
 * @param {Object} conditions - Weather conditions
 * @param {number} conditions.apparentF - Feels-like temperature in Fahrenheit
 * @param {number} conditions.precipIn - Precipitation amount in inches
 * @param {number} conditions.precipProb - Precipitation probability (0-100)
 * @param {number} conditions.windMph - Wind speed in mph
 * @param {number} conditions.humidity - Relative humidity (0-100)
 * @returns {string} Sock type: 'light_socks', 'heavy_socks', or 'double_socks'
 */
export function chooseSocks({ apparentF, precipIn, precipProb, windMph, humidity }) {
  let sockLevel = 'light_socks'; // Default
  
  // Upgrade to heavy socks in cool/moderate conditions
  if (apparentF <= 50) {
    sockLevel = 'heavy_socks';
  }
  
  // Upgrade to double socks in cold/wet/windy conditions
  if (apparentF <= 25 || 
      (apparentF <= 32 && (precipIn > 0 || precipProb >= 60)) || 
      (apparentF <= 30 && windMph >= 15)) {
    sockLevel = 'double_socks';
  }
  
  // Stay light in hot/humid conditions regardless of base temp
  if (apparentF >= 70 || (apparentF >= 60 && humidity >= 75)) {
    sockLevel = 'light_socks';
  }
  
  return sockLevel;
}

/**
 * Calculate effective temperature considering all weather factors
 * Adjusts perceived temperature based on user sensitivity, wind, humidity, UV, and precipitation
 * 
 * @param {Object} conditions - Weather conditions
 * @param {number} conditions.apparentF - Feels-like temperature in Fahrenheit
 * @param {number} conditions.humidity - Relative humidity (0-100)
 * @param {number} conditions.windMph - Wind speed in mph
 * @param {number} conditions.uvIndex - UV index
 * @param {number} conditions.precipProb - Precipitation probability (0-100)
 * @param {boolean} conditions.isDay - Is it daytime
 * @param {number} tempSensitivity - User temperature sensitivity (-2 to +2)
 * @returns {number} Effective temperature in Fahrenheit
 */
export function calculateEffectiveTemp({ apparentF, humidity, windMph, uvIndex, precipProb, isDay }, tempSensitivity = 0) {
  let effectiveTemp = apparentF;
  
  // User sensitivity adjustment: -2 (runs cold/needs warmer) to +2 (runs hot/needs cooler)
  // Each point = ~5°F adjustment
  effectiveTemp += tempSensitivity * 5;
  
  // Wind chill factor (wind makes it feel colder)
  if (apparentF < 50 && windMph > 10) {
    const windChillPenalty = Math.min((windMph - 10) * 0.3, 5); // Up to 5°F colder
    effectiveTemp -= windChillPenalty;
  }
  
  // Humidity/dew point factor (high humidity makes heat worse)
  if (apparentF > 55 && humidity > 60) {
    const humidityPenalty = ((humidity - 60) / 40) * 8; // Up to 8°F hotter feeling
    effectiveTemp += humidityPenalty;
  }
  
  // Sun exposure factor (UV makes you feel warmer during day)
  if (isDay && uvIndex > 3 && apparentF > 45) {
    const sunBonus = Math.min((uvIndex - 3) * 1.5, 6); // Up to 6°F warmer
    effectiveTemp += sunBonus;
  }
  
  // Rain/precipitation cooling (wet = feels colder)
  if (precipProb > 50 && apparentF < 60) {
    const rainPenalty = 3; // Wet clothes make you feel ~3°F colder
    effectiveTemp -= rainPenalty;
  }
  
  return effectiveTemp;
}

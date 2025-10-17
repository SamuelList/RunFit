/**
 * WBGT (Wet Bulb Globe Temperature) Calculations
 * 
 * Heat index and WBGT calculations for running safety.
 * Extracted from utils/runScore.js
 * 
 * WBGT is the gold standard for assessing heat stress during physical activity.
 * It combines temperature, humidity, wind, and solar radiation to give a more
 * accurate picture of heat stress than simple heat index.
 */

/**
 * Calculate WBGT with fallback to simple wet bulb approximation
 * Uses the Australian Bureau of Meteorology simplified formula
 * 
 * @param {Object} params - Weather parameters
 * @param {number} params.tempF - Temperature in Fahrenheit
 * @param {number} params.humidity - Relative humidity (0-100)
 * @param {number} params.windMph - Wind speed in mph
 * @param {number|null} params.pressureHPa - Barometric pressure in hPa (optional)
 * @param {number|null} params.solarRadiationWm2 - Solar radiation in W/m² (optional)
 * @param {number} params.cloudCover - Cloud cover percentage (0-100), default 50
 * @returns {number} WBGT in Fahrenheit
 * 
 * @example
 * const wbgt = calculateWBGT({ 
 *   tempF: 85, 
 *   humidity: 70, 
 *   windMph: 5,
 *   cloudCover: 30
 * });
 * // => ~78°F (High Risk conditions)
 */
export function calculateWBGT({ 
  tempF, 
  humidity, 
  windMph, 
  pressureHPa = null, 
  solarRadiationWm2 = null, 
  cloudCover = 50 
}) {
  const tempC = (tempF - 32) * (5 / 9);
  const windMs = windMph * 0.44704; // mph to m/s
  const rhDecimal = humidity / 100;
  const cloudFraction = cloudCover / 100;
  
  // Use simplified WBGT approximation (Australian BoM method)
  // WBGT ≈ 0.567×Ta + 0.393×e + 3.94 (where e = vapor pressure in hPa)
  // This empirical formula is widely used and validated for meteorological purposes
  
  // Calculate vapor pressure using Magnus formula (hPa)
  const eSat_hPa = 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
  const e_hPa = rhDecimal * eSat_hPa;
  
  // Simplified WBGT formula (°C)
  const wbgtSimple_C = 0.567 * tempC + 0.393 * e_hPa + 3.94;
  const wbgtSimple_F = (wbgtSimple_C * 9) / 5 + 32;
  
  return wbgtSimple_F;
}

/**
 * WBGT risk assessment based on research (ACSM, World Athletics, Outside Online)
 * WBGT only matters above 60°F - below that, standard feels-like temperature is more relevant
 * 
 * @param {number} wbgtF - WBGT in Fahrenheit
 * @param {boolean} workout - Is this a workout run
 * @param {boolean} longRun - Is this a long run
 * @returns {Object} Risk assessment with level and message
 * 
 * Risk levels:
 * - ideal: 50-60°F WBGT (optimal performance)
 * - caution: 60-65°F WBGT (yellow flag, monitor closely)
 * - high-risk: 65-73°F WBGT (red flag, reduce intensity)
 * - danger: 73°F+ WBGT (black flag, high heat illness risk)
 */
export function assessWBGTRisk(wbgtF, workout = false, longRun = false) {
  // WBGT not meaningful below 60°F - cool/cold conditions use feels-like temp instead
  if (wbgtF < 60) {
    return { 
      level: 'ideal', 
      message: 'Cool conditions - use feels-like temperature for guidance.',
      flag: 'none'
    };
  }
  
  // Research-based WBGT thresholds:
  // 50-65°F: Ideal (peak performance, minimal risk) - GREEN FLAG
  // 65-73°F: Warm/Caution (performance declines ~0.3-0.4% per °F) - YELLOW FLAG
  // 73-82°F: Hot/High Risk (serious heat stress, increased medical support) - RED FLAG
  // >82°F: Extreme/Danger (races cancelled, heat stroke risk) - BLACK FLAG
  
  if (workout) {
    // Hard workouts are most sensitive to heat - performance drops sharply above 60°F WBGT
    if (wbgtF >= 82) {
      return { 
        level: 'danger', 
        message: 'WBGT ≥82°F—Extreme Heat. Organized events cancelled. Indoor workout strongly recommended.',
        flag: 'black'
      };
    }
    if (wbgtF >= 73) {
      return { 
        level: 'danger', 
        message: 'WBGT 73-82°F—Hot/High Risk. Postpone hard workout. High heat illness risk during intervals.',
        flag: 'red'
      };
    }
    if (wbgtF >= 65) {
      return { 
        level: 'high-risk', 
        message: 'WBGT 65-73°F—Warm/Caution. Reduce intensity. Performance declines ~0.3-0.4% per °F above ideal.',
        flag: 'yellow'
      };
    }
    if (wbgtF >= 60) {
      return { 
        level: 'caution', 
        message: 'WBGT 60-65°F—Upper ideal range. Monitor effort, stay well hydrated.',
        flag: 'green'
      };
    }
    return { 
      level: 'ideal', 
      message: 'WBGT 50-60°F—Ideal for hard workouts. Optimal performance conditions.',
      flag: 'green'
    };
  }
  
  if (longRun) {
    // Long runs: cumulative heat stress increases with duration
    if (wbgtF >= 82) {
      return { 
        level: 'danger', 
        message: 'WBGT ≥82°F—Extreme Heat. Do not attempt long run. Extreme heat illness risk over time.',
        flag: 'black'
      };
    }
    if (wbgtF >= 73) {
      return { 
        level: 'danger', 
        message: 'WBGT 73-82°F—Hot/High Risk. Postpone long run. Cumulative heat stress too high.',
        flag: 'red'
      };
    }
    if (wbgtF >= 65) {
      return { 
        level: 'high-risk', 
        message: 'WBGT 65-73°F—Warm/Caution. Shorten by 25-30%. Heat stress compounds over duration.',
        flag: 'yellow'
      };
    }
    if (wbgtF >= 60) {
      return { 
        level: 'caution', 
        message: 'WBGT 60-65°F—Manageable but monitor closely. Hydrate every 15-20 min.',
        flag: 'green'
      };
    }
    return { 
      level: 'ideal', 
      message: 'WBGT 50-60°F—Ideal for long runs. Optimal endurance conditions.',
      flag: 'green'
    };
  }
  
  // Easy/recovery runs: more tolerant of heat but still risky at extremes
  if (wbgtF >= 82) {
    return { 
      level: 'danger', 
      message: 'WBGT ≥82°F—Extreme Heat. Skip run or move indoors. Too hot even for easy pace.',
      flag: 'black'
    };
  }
  if (wbgtF >= 73) {
    return { 
      level: 'high-risk', 
      message: 'WBGT 73-82°F—Hot/High Risk. Run very easy, stay in shade, bring extra water.',
      flag: 'red'
    };
  }
  if (wbgtF >= 65) {
    return { 
      level: 'caution', 
      message: 'WBGT 65-73°F—Warm/Caution. Slow down significantly, use shaded routes.',
      flag: 'yellow'
    };
  }
  if (wbgtF >= 60) {
    return { 
      level: 'caution', 
      message: 'WBGT 60-65°F—Warm but manageable. Pace by effort, not time.',
      flag: 'green'
    };
  }
  return { 
    level: 'ideal', 
    message: 'WBGT 50-60°F—Ideal running conditions. Comfortable and safe.',
    flag: 'green'
  };
}

/**
 * WBGT thresholds (in Fahrenheit)
 */
export const WBGT_THRESHOLDS = {
  IDEAL_MIN: 50,
  IDEAL_MAX: 60,
  CAUTION_MIN: 60,
  CAUTION_MAX: 65,
  HIGH_RISK_MIN: 65,
  HIGH_RISK_MAX: 73,
  DANGER_MIN: 73,
  DANGER_MAX: 82,
  EXTREME: 82,
};

/**
 * Get WBGT flag color based on temperature
 * Based on World Athletics (formerly IAAF) heat guidelines
 * 
 * @param {number} wbgtF - WBGT in Fahrenheit
 * @returns {string} Flag color: 'green', 'yellow', 'red', 'black', or 'none'
 */
export function getWBGTFlag(wbgtF) {
  if (wbgtF < 60) return 'none'; // Below threshold for WBGT concerns
  if (wbgtF < 65) return 'green'; // Low risk
  if (wbgtF < 73) return 'yellow'; // Moderate risk
  if (wbgtF < 82) return 'red'; // High risk
  return 'black'; // Extreme risk
}

/**
 * Calculate heat index (feels-like temperature for hot/humid conditions)
 * Uses the National Weather Service formula
 * 
 * @param {number} tempF - Temperature in Fahrenheit
 * @param {number} humidity - Relative humidity (0-100)
 * @returns {number} Heat index in Fahrenheit
 */
export function calculateHeatIndex(tempF, humidity) {
  // Heat index only meaningful above 80°F
  if (tempF < 80) {
    return tempF;
  }
  
  const T = tempF;
  const RH = humidity;
  
  // Rothfusz regression (NWS formula)
  let HI = -42.379 
    + 2.04901523 * T 
    + 10.14333127 * RH 
    - 0.22475541 * T * RH 
    - 0.00683783 * T * T 
    - 0.05481717 * RH * RH 
    + 0.00122874 * T * T * RH 
    + 0.00085282 * T * RH * RH 
    - 0.00000199 * T * T * RH * RH;
  
  // Adjustments for low humidity or high heat
  if (RH < 13 && T >= 80 && T <= 112) {
    HI -= ((13 - RH) / 4) * Math.sqrt((17 - Math.abs(T - 95)) / 17);
  } else if (RH > 85 && T >= 80 && T <= 87) {
    HI += ((RH - 85) / 10) * ((87 - T) / 5);
  }
  
  return Math.round(HI);
}

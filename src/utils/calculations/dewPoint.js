/**
 * Dew Point Calculations
 * 
 * Dew point and humidity-related calculations.
 * Extracted from utils/scoring.js
 */

/**
 * Calculate dew point in Fahrenheit using Magnus formula
 * 
 * The dew point is the temperature at which air reaches 100% relative humidity
 * and water vapor begins to condense. It's a better measure of humidity comfort
 * than relative humidity alone.
 * 
 * @param {number} tempF - Temperature in Fahrenheit
 * @param {number} rh - Relative humidity (0-100)
 * @returns {number} Dew point in Fahrenheit
 * 
 * @example
 * const dewPoint = dewPointF(75, 60);
 * // => 60.3°F (muggy conditions)
 */
export function dewPointF(tempF, rh) {
  // Convert to Celsius for Magnus formula
  const tempC = (tempF - 32) * (5 / 9);
  
  // Magnus formula constants
  const a = 17.62;
  const b = 243.12;
  
  // Calculate gamma (intermediate value)
  const gamma = Math.log(Math.max(1e-6, rh) / 100) + (a * tempC) / (b + tempC);
  
  // Calculate dew point in Celsius
  const dpC = (b * gamma) / (a - gamma);
  
  // Convert back to Fahrenheit
  return (dpC * 9) / 5 + 32;
}

/**
 * Calculate dew point in Celsius
 * 
 * @param {number} tempC - Temperature in Celsius
 * @param {number} rh - Relative humidity (0-100)
 * @returns {number} Dew point in Celsius
 */
export function dewPointC(tempC, rh) {
  const a = 17.62;
  const b = 243.12;
  const gamma = Math.log(Math.max(1e-6, rh) / 100) + (a * tempC) / (b + tempC);
  return (b * gamma) / (a - gamma);
}

/**
 * Get comfort level description based on dew point
 * 
 * @param {number} dewPointF - Dew point in Fahrenheit
 * @returns {Object} Comfort level with label and description
 */
export function getDewPointComfortLevel(dewPointF) {
  if (dewPointF < 50) {
    return { 
      level: 'dry', 
      label: 'Dry', 
      description: 'Comfortable for most people',
      color: 'green'
    };
  } else if (dewPointF < 55) {
    return { 
      level: 'comfortable', 
      label: 'Comfortable', 
      description: 'Pleasant conditions',
      color: 'green'
    };
  } else if (dewPointF < 60) {
    return { 
      level: 'slightly-muggy', 
      label: 'Slightly Muggy', 
      description: 'Noticeable humidity',
      color: 'yellow'
    };
  } else if (dewPointF < 65) {
    return { 
      level: 'moderate', 
      label: 'Moderately Humid', 
      description: 'Sticky feeling outdoors',
      color: 'yellow'
    };
  } else if (dewPointF < 70) {
    return { 
      level: 'muggy', 
      label: 'Muggy', 
      description: 'Uncomfortable for most',
      color: 'orange'
    };
  } else if (dewPointF < 75) {
    return { 
      level: 'very-humid', 
      label: 'Very Humid', 
      description: 'Very uncomfortable, oppressive',
      color: 'red'
    };
  } else {
    return { 
      level: 'oppressive', 
      label: 'Oppressive', 
      description: 'Dangerous heat stress possible',
      color: 'red'
    };
  }
}

/**
 * Calculate relative humidity from temperature and dew point
 * 
 * @param {number} tempF - Temperature in Fahrenheit
 * @param {number} dewPointF - Dew point in Fahrenheit
 * @returns {number} Relative humidity (0-100)
 */
export function relativeHumidityFromDewPoint(tempF, dewPointF) {
  const tempC = (tempF - 32) * (5 / 9);
  const dpC = (dewPointF - 32) * (5 / 9);
  
  const a = 17.62;
  const b = 243.12;
  
  const eSat = Math.exp((a * tempC) / (b + tempC));
  const e = Math.exp((a * dpC) / (b + dpC));
  
  return Math.min(100, Math.max(0, (e / eSat) * 100));
}

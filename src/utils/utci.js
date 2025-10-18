/**
 * Universal Thermal Climate Index (UTCI) Calculator
 * 
 * UTCI is an internationally standardized index for assessing outdoor thermal comfort
 * based on the latest scientific understanding of human thermoregulation.
 * 
 * The UTCI represents the air temperature (°C) of a reference environment that would
 * produce the same physiological response as the actual environment.
 * 
 * Inputs required:
 * - Air Temperature (T_a): Dry-bulb temperature at 2m height
 * - Water Vapour Pressure (e) or Relative Humidity (RH)
 * - Wind Speed (v_10m): Wind speed at 10m height
 * - Mean Radiant Temperature (MRT or T_mrt)
 * - Precipitation Rate (optional): For rain adjustment
 * 
 * For runners:
 * - Provides comprehensive thermal stress assessment
 * - Accounts for all environmental factors affecting body heat balance
 * - More accurate than simple "feels like" temperature
 * - Includes precipitation effects on perceived temperature
 */

/**
 * Calculate saturation vapor pressure using Magnus formula
 * @param {number} tempC - Temperature in Celsius
 * @returns {number} Saturation vapor pressure in hPa
 */
function calculateSaturationVaporPressure(tempC) {
  return 6.112 * Math.exp((17.62 * tempC) / (243.12 + tempC));
}

/**
 * Calculate water vapor pressure from relative humidity
 * @param {number} tempC - Air temperature in Celsius
 * @param {number} rh - Relative humidity (0-100%)
 * @returns {number} Water vapor pressure in hPa
 */
function calculateVaporPressure(tempC, rh) {
  const es = calculateSaturationVaporPressure(tempC);
  return (rh / 100) * es;
}

/**
 * Calculate UTCI using the 6th order polynomial approximation
 * This is the official UTCI polynomial developed by the COST Action 730
 * 
 * Valid ranges:
 * - Air temperature: -50°C to +50°C
 * - Wind speed: 0.5 to 17 m/s
 * - Delta T (MRT - Ta): -30K to +70K
 * 
 * @param {number} ta - Air temperature in °C
 * @param {number} vp - Water vapor pressure in hPa
 * @param {number} va - Wind speed at 10m in m/s
 * @param {number} mrt - Mean radiant temperature in °C
 * @returns {number} UTCI in °C
 */
function calculateUTCIPolynomial(ta, vp, va, mrt) {
  // Validate and constrain inputs to valid UTCI ranges
  ta = Math.max(-50, Math.min(50, ta));
  va = Math.max(0.5, Math.min(17, va));
  
  // Calculate delta T (MRT - Air Temp) and constrain
  let deltaT = mrt - ta;
  deltaT = Math.max(-30, Math.min(70, deltaT));
  
  // Constrain vapor pressure (0 to 50 hPa is typical range)
  vp = Math.max(0, Math.min(50, vp));
  
  // Polynomial coefficients (official UTCI formula)
  const utci = ta +
    0.607562052 +
    -0.0227712343 * ta +
    8.06470249e-4 * ta * ta +
    -1.54271372e-4 * ta * ta * ta +
    -3.24651735e-6 * ta * ta * ta * ta +
    7.32602852e-8 * ta * ta * ta * ta * ta +
    1.35959073e-9 * ta * ta * ta * ta * ta * ta +
    -2.25836520 * va +
    0.0880326035 * ta * va +
    0.00216844454 * ta * ta * va +
    -1.53347087e-5 * ta * ta * ta * va +
    -5.72983704e-7 * ta * ta * ta * ta * va +
    -2.55090145e-9 * ta * ta * ta * ta * ta * va +
    -0.751269505 * va * va +
    -0.00408350271 * ta * va * va +
    -5.21670675e-5 * ta * ta * va * va +
    1.94544667e-6 * ta * ta * ta * va * va +
    1.14099531e-8 * ta * ta * ta * ta * va * va +
    0.158137256 * va * va * va +
    -6.57263143e-5 * ta * va * va * va +
    2.22697524e-7 * ta * ta * va * va * va +
    -4.16117031e-8 * ta * ta * ta * va * va * va +
    -0.0127762753 * va * va * va * va +
    9.66891875e-6 * ta * va * va * va * va +
    2.52785852e-9 * ta * ta * va * va * va * va +
    4.56306672e-4 * va * va * va * va * va +
    -1.74202546e-7 * ta * va * va * va * va * va +
    -5.91491269e-6 * va * va * va * va * va * va +
    0.398374029 * deltaT +
    1.83945314e-4 * ta * deltaT +
    -1.73754510e-4 * ta * ta * deltaT +
    -7.60781159e-7 * ta * ta * ta * deltaT +
    3.77830287e-8 * ta * ta * ta * ta * deltaT +
    5.43079673e-10 * ta * ta * ta * ta * ta * deltaT +
    -0.0200518269 * va * deltaT +
    8.92859837e-4 * ta * va * deltaT +
    3.45433048e-6 * ta * ta * va * deltaT +
    -3.77925774e-7 * ta * ta * ta * va * deltaT +
    -1.69699377e-9 * ta * ta * ta * ta * va * deltaT +
    1.69992415e-4 * va * va * deltaT +
    -4.99204314e-5 * ta * va * va * deltaT +
    2.47417178e-7 * ta * ta * va * va * deltaT +
    1.07596466e-8 * ta * ta * ta * va * va * deltaT +
    8.49242932e-5 * va * va * va * deltaT +
    1.35191328e-6 * ta * va * va * va * deltaT +
    -6.21531254e-9 * ta * ta * va * va * va * deltaT +
    -4.99410301e-6 * va * va * va * va * deltaT +
    -1.89489258e-8 * ta * va * va * va * va * deltaT +
    8.15300114e-8 * va * va * va * va * va * deltaT +
    7.55043090e-4 * deltaT * deltaT +
    -5.65095215e-5 * ta * deltaT * deltaT +
    -4.52166564e-7 * ta * ta * deltaT * deltaT +
    2.46688878e-8 * ta * ta * ta * deltaT * deltaT +
    2.42674348e-10 * ta * ta * ta * ta * deltaT * deltaT +
    1.54547250e-4 * va * deltaT * deltaT +
    5.24110970e-6 * ta * va * deltaT * deltaT +
    -8.75874982e-8 * ta * ta * va * deltaT * deltaT +
    -1.50743064e-9 * ta * ta * ta * va * deltaT * deltaT +
    -1.56236307e-5 * va * va * deltaT * deltaT +
    -1.33895614e-7 * ta * va * va * deltaT * deltaT +
    2.49709824e-9 * ta * ta * va * va * deltaT * deltaT +
    6.51711721e-7 * va * va * va * deltaT * deltaT +
    1.94960053e-9 * ta * va * va * va * deltaT * deltaT +
    -1.00361113e-8 * va * va * va * va * deltaT * deltaT +
    -1.21206673e-5 * deltaT * deltaT * deltaT +
    -2.18203660e-7 * ta * deltaT * deltaT * deltaT +
    7.51269482e-9 * ta * ta * deltaT * deltaT * deltaT +
    9.79063848e-11 * ta * ta * ta * deltaT * deltaT * deltaT +
    1.25006734e-6 * va * deltaT * deltaT * deltaT +
    -1.81584736e-9 * ta * va * deltaT * deltaT * deltaT +
    -3.52197671e-10 * ta * ta * va * deltaT * deltaT * deltaT +
    -3.36514630e-8 * va * va * deltaT * deltaT * deltaT +
    1.35908359e-10 * ta * va * va * deltaT * deltaT * deltaT +
    4.17032620e-10 * va * va * va * deltaT * deltaT * deltaT +
    -1.30369025e-9 * deltaT * deltaT * deltaT * deltaT +
    4.13908461e-10 * ta * deltaT * deltaT * deltaT * deltaT +
    9.22652254e-12 * ta * ta * deltaT * deltaT * deltaT * deltaT +
    -5.08220384e-9 * va * deltaT * deltaT * deltaT * deltaT +
    -2.24730961e-11 * ta * va * deltaT * deltaT * deltaT * deltaT +
    1.17139133e-10 * va * va * deltaT * deltaT * deltaT * deltaT +
    6.62154879e-10 * deltaT * deltaT * deltaT * deltaT * deltaT +
    4.03863260e-13 * ta * deltaT * deltaT * deltaT * deltaT * deltaT +
    1.95087203e-12 * va * deltaT * deltaT * deltaT * deltaT * deltaT +
    -4.73602469e-12 * deltaT * deltaT * deltaT * deltaT * deltaT * deltaT +
    5.12733497 * vp +
    -0.312788561 * ta * vp +
    -0.0196701861 * ta * ta * vp +
    9.99690870e-4 * ta * ta * ta * vp +
    9.51738512e-6 * ta * ta * ta * ta * vp +
    -4.66426341e-7 * ta * ta * ta * ta * ta * vp +
    0.548050612 * va * vp +
    -0.00330552823 * ta * va * vp +
    -0.00164119440 * ta * ta * va * vp +
    -5.16670694e-6 * ta * ta * ta * va * vp +
    9.52692432e-7 * ta * ta * ta * ta * va * vp +
    -0.0429223622 * va * va * vp +
    0.00500845667 * ta * va * va * vp +
    1.00601257e-6 * ta * ta * va * va * vp +
    -1.81748644e-6 * ta * ta * ta * va * va * vp +
    -1.25813502e-3 * va * va * va * vp +
    -1.79330391e-4 * ta * va * va * va * vp +
    2.34994441e-6 * ta * ta * va * va * va * vp +
    1.29735808e-4 * va * va * va * va * vp +
    1.29064870e-6 * ta * va * va * va * va * vp +
    -2.28558686e-6 * va * va * va * va * va * vp +
    -0.0369476348 * deltaT * vp +
    0.00162325322 * ta * deltaT * vp +
    -3.14279680e-5 * ta * ta * deltaT * vp +
    2.59835559e-6 * ta * ta * ta * deltaT * vp +
    -4.77136523e-8 * ta * ta * ta * ta * deltaT * vp +
    8.64203390e-3 * va * deltaT * vp +
    -6.87405181e-4 * ta * va * deltaT * vp +
    -9.13863872e-6 * ta * ta * va * deltaT * vp +
    5.15916806e-7 * ta * ta * ta * va * deltaT * vp +
    -3.59217476e-5 * va * va * deltaT * vp +
    3.28696511e-5 * ta * va * va * deltaT * vp +
    -7.10542454e-7 * ta * ta * va * va * deltaT * vp +
    -1.24382300e-5 * va * va * va * deltaT * vp +
    -7.38584400e-9 * ta * va * va * va * deltaT * vp +
    2.20609296e-7 * va * va * va * va * deltaT * vp +
    -7.32469180e-4 * deltaT * deltaT * vp +
    -1.87381964e-5 * ta * deltaT * deltaT * vp +
    4.80925239e-6 * ta * ta * deltaT * deltaT * vp +
    -8.75492040e-8 * ta * ta * ta * deltaT * deltaT * vp +
    2.77862930e-5 * va * deltaT * deltaT * vp +
    -5.06004592e-6 * ta * va * deltaT * deltaT * vp +
    1.14325367e-7 * ta * ta * va * deltaT * deltaT * vp +
    2.53016723e-6 * va * va * deltaT * deltaT * vp +
    -1.72857035e-8 * ta * va * va * deltaT * deltaT * vp +
    -3.95079398e-8 * va * va * va * deltaT * deltaT * vp +
    -3.59413173e-7 * deltaT * deltaT * deltaT * vp +
    7.04388046e-7 * ta * deltaT * deltaT * deltaT * vp +
    -1.89309167e-8 * ta * ta * deltaT * deltaT * deltaT * vp +
    -4.79768731e-7 * va * deltaT * deltaT * deltaT * vp +
    7.96079978e-9 * ta * va * deltaT * deltaT * deltaT * vp +
    1.62897058e-9 * va * va * deltaT * deltaT * deltaT * vp +
    3.94367674e-8 * deltaT * deltaT * deltaT * deltaT * vp +
    -1.18566247e-9 * ta * deltaT * deltaT * deltaT * deltaT * vp +
    3.34678041e-10 * va * deltaT * deltaT * deltaT * deltaT * vp +
    -1.15606447e-10 * deltaT * deltaT * deltaT * deltaT * deltaT * vp +
    -2.80626406 * vp * vp +
    0.548712484 * ta * vp * vp +
    -0.00399428410 * ta * ta * vp * vp +
    -9.54009191e-4 * ta * ta * ta * vp * vp +
    1.93090978e-5 * ta * ta * ta * ta * vp * vp +
    -0.308806365 * va * vp * vp +
    0.0116952364 * ta * va * vp * vp +
    4.95271903e-4 * ta * ta * va * vp * vp +
    -1.90710882e-5 * ta * ta * ta * va * vp * vp +
    0.00210787756 * va * va * vp * vp +
    -6.98445738e-4 * ta * va * va * vp * vp +
    2.30109073e-5 * ta * ta * va * va * vp * vp +
    4.17856590e-4 * va * va * va * vp * vp +
    -1.27043871e-5 * ta * va * va * va * vp * vp +
    -3.04620472e-6 * va * va * va * va * vp * vp +
    0.0514507424 * deltaT * vp * vp +
    -0.00432510997 * ta * deltaT * vp * vp +
    8.99281156e-5 * ta * ta * deltaT * vp * vp +
    -7.14663943e-7 * ta * ta * ta * deltaT * vp * vp +
    -2.66016305e-4 * va * deltaT * vp * vp +
    2.63789586e-4 * ta * va * deltaT * vp * vp +
    -7.01199003e-6 * ta * ta * va * deltaT * vp * vp +
    -1.06823306e-4 * va * va * deltaT * vp * vp +
    3.61341136e-6 * ta * va * va * deltaT * vp * vp +
    2.29748967e-7 * va * va * va * deltaT * vp * vp +
    3.04788893e-4 * deltaT * deltaT * vp * vp +
    -6.42070836e-5 * ta * deltaT * deltaT * vp * vp +
    1.16257971e-6 * ta * ta * deltaT * deltaT * vp * vp +
    7.68023384e-6 * va * deltaT * deltaT * vp * vp +
    -5.47446896e-7 * ta * va * deltaT * deltaT * vp * vp +
    -3.59937910e-8 * va * va * deltaT * deltaT * vp * vp +
    -4.36497725e-6 * deltaT * deltaT * deltaT * vp * vp +
    1.68737969e-7 * ta * deltaT * deltaT * deltaT * vp * vp +
    2.67489271e-8 * va * deltaT * deltaT * deltaT * vp * vp +
    3.23926897e-9 * deltaT * deltaT * deltaT * deltaT * vp * vp +
    -0.0353874123 * vp * vp * vp +
    -0.221201190 * ta * vp * vp * vp +
    0.0155126038 * ta * ta * vp * vp * vp +
    -2.63917279e-4 * ta * ta * ta * vp * vp * vp +
    0.0453433455 * va * vp * vp * vp +
    -0.00432943862 * ta * va * vp * vp * vp +
    1.45389826e-4 * ta * ta * va * vp * vp * vp +
    2.17508610e-4 * va * va * vp * vp * vp +
    -6.66724702e-5 * ta * va * va * vp * vp * vp +
    3.33217140e-5 * va * va * va * vp * vp * vp +
    -0.00226921615 * deltaT * vp * vp * vp +
    3.80261982e-4 * ta * deltaT * vp * vp * vp +
    -5.45314314e-9 * ta * ta * deltaT * vp * vp * vp +
    -7.96355448e-4 * va * deltaT * vp * vp * vp +
    2.53458034e-5 * ta * va * deltaT * vp * vp * vp +
    -6.31223658e-6 * va * va * deltaT * vp * vp * vp +
    3.02122035e-4 * deltaT * deltaT * vp * vp * vp +
    -4.77403547e-6 * ta * deltaT * deltaT * vp * vp * vp +
    1.73825715e-6 * va * deltaT * deltaT * vp * vp * vp +
    -4.09087898e-7 * deltaT * deltaT * deltaT * vp * vp * vp +
    0.614155345 * vp * vp * vp * vp +
    -0.0616755931 * ta * vp * vp * vp * vp +
    0.00133374846 * ta * ta * vp * vp * vp * vp +
    0.00355375387 * va * vp * vp * vp * vp +
    -5.13027851e-4 * ta * va * vp * vp * vp * vp +
    1.02449757e-4 * va * va * vp * vp * vp * vp +
    -0.00148526421 * deltaT * vp * vp * vp * vp +
    -4.11469183e-5 * ta * deltaT * vp * vp * vp * vp +
    -6.80434415e-6 * va * deltaT * vp * vp * vp * vp +
    -9.77675906e-6 * deltaT * deltaT * vp * vp * vp * vp +
    0.0882773108 * vp * vp * vp * vp * vp +
    -0.00301859306 * ta * vp * vp * vp * vp * vp +
    0.00104452989 * va * vp * vp * vp * vp * vp +
    2.47090539e-4 * deltaT * vp * vp * vp * vp * vp +
    0.00148348065 * vp * vp * vp * vp * vp * vp;
  
  return utci;
}

/**
 * Classify precipitation intensity
 * @param {number} precipRate - Precipitation rate in inches per hour
 * @returns {string} Intensity category: 'none', 'light', 'moderate', 'heavy'
 */
function classifyPrecipitation(precipRate) {
  if (precipRate < 0.1) return 'light';
  if (precipRate < 0.3) return 'moderate';
  return 'heavy';
}

/**
 * Get rain adjustment based on UTCI and precipitation intensity
 * Returns the temperature adjustment in Fahrenheit (negative values)
 * 
 * @param {number} utciF - Baseline UTCI in Fahrenheit
 * @param {string} intensity - Precipitation intensity ('light', 'moderate', 'heavy')
 * @returns {number} Temperature adjustment in °F (negative)
 */
function getRainAdjustment(utciF, intensity) {
  // Rain adjustment table (in Fahrenheit)
  const adjustments = {
    // Strong heat: 89.6–100.4°F
    strongHeat: { light: -3.6, moderate: -7.2, heavy: -12.6 },
    // Moderate heat: 78.8–89.6°F
    moderateHeat: { light: -2.7, moderate: -5.4, heavy: -9.0 },
    // No stress: 48.2–78.8°F
    noStress: { light: -1.8, moderate: -4.5, heavy: -7.2 },
    // Slight cold: 32–48.2°F
    slightCold: { light: -4.5, moderate: -9.0, heavy: -14.4 },
    // Moderate cold: 8.6–32°F
    moderateCold: { light: -7.2, moderate: -12.6, heavy: -19.8 },
    // Strong cold: < 8.6°F
    strongCold: { light: -9.0, moderate: -16.2, heavy: -25.2 }
  };
  
  let category;
  if (utciF >= 89.6) category = 'strongHeat';
  else if (utciF >= 78.8) category = 'moderateHeat';
  else if (utciF >= 48.2) category = 'noStress';
  else if (utciF >= 32) category = 'slightCold';
  else if (utciF >= 8.6) category = 'moderateCold';
  else category = 'strongCold';
  
  return adjustments[category][intensity] || 0;
}

/**
 * Get UTCI stress category and description
 * @param {number} utciF - UTCI in Fahrenheit
 * @returns {Object} Category info with label, description, color, and impact
 */
export function getUTCICategory(utciF) {
  if (utciF >= 106) {
    return {
      category: 'extreme_heat_stress',
      label: 'Extreme Heat Stress',
      description: 'Dangerous conditions. Avoid outdoor activity.',
      color: 'red',
      impact: 'extreme',
      icon: '🔥'
    };
  } else if (utciF >= 100.4) {
    return {
      category: 'very_strong_heat_stress',
      label: 'Very Strong Heat',
      description: 'High risk of heat illness. Limit activity.',
      color: 'red',
      impact: 'very_high',
      icon: '🥵'
    };
  } else if (utciF >= 89.6) {
    return {
      category: 'strong_heat_stress',
      label: 'Strong Heat Stress',
      description: 'Challenging conditions. Take precautions.',
      color: 'orange',
      impact: 'high',
      icon: '☀️'
    };
  } else if (utciF >= 78.8) {
    return {
      category: 'moderate_heat_stress',
      label: 'Moderate Heat',
      description: 'Warm conditions. Stay hydrated.',
      color: 'amber',
      impact: 'moderate',
      icon: '😓'
    };
  } else if (utciF >= 48.2) {
    return {
      category: 'no_thermal_stress',
      label: 'Comfortable',
      description: 'Ideal running conditions.',
      color: 'green',
      impact: 'minimal',
      icon: '✅'
    };
  } else if (utciF >= 32) {
    return {
      category: 'slight_cold_stress',
      label: 'Slight Cold',
      description: 'Cool conditions. Layer appropriately.',
      color: 'sky',
      impact: 'low',
      icon: '🧊'
    };
  } else if (utciF >= 8.6) {
    return {
      category: 'moderate_cold_stress',
      label: 'Moderate Cold',
      description: 'Cold conditions. Protect extremities.',
      color: 'blue',
      impact: 'moderate',
      icon: '❄️'
    };
  } else if (utciF >= -5.8) {
    return {
      category: 'strong_cold_stress',
      label: 'Strong Cold',
      description: 'Harsh conditions. Full winter gear needed.',
      color: 'indigo',
      impact: 'high',
      icon: '🥶'
    };
  } else if (utciF >= -27.4) {
    return {
      category: 'very_strong_cold_stress',
      label: 'Very Strong Cold',
      description: 'Dangerous cold. Limit exposure time.',
      color: 'purple',
      impact: 'very_high',
      icon: '🧊'
    };
  } else {
    return {
      category: 'extreme_cold_stress',
      label: 'Extreme Cold',
      description: 'Life-threatening conditions. Stay indoors.',
      color: 'purple',
      impact: 'extreme',
      icon: '⚠️'
    };
  }
}

/**
 * Calculate Universal Thermal Climate Index (UTCI)
 * 
 * @param {Object} params - Weather parameters
 * @param {number} params.tempF - Air temperature in Fahrenheit
 * @param {number} params.humidity - Relative humidity (0-100%)
 * @param {number} params.windMph - Wind speed in mph
 * @param {number} params.mrt - Mean Radiant Temperature in Fahrenheit (optional, defaults to air temp)
 * @param {number} params.precipRate - Precipitation rate in inches/hour (optional, for rain adjustment)
 * @returns {Object} UTCI result with value, category, and adjustments
 */
export function calculateUTCI({
  tempF,
  humidity,
  windMph,
  mrt = null,
  precipRate = 0
}) {
  // Validate inputs
  if (!Number.isFinite(tempF) || !Number.isFinite(humidity) || !Number.isFinite(windMph)) {
    return null;
  }
  
  // Constrain inputs to reasonable ranges
  humidity = Math.max(0, Math.min(100, humidity));
  windMph = Math.max(0, windMph);
  precipRate = Math.max(0, precipRate || 0);
  
  // Convert inputs to metric units
  const tempC = (tempF - 32) * 5 / 9;
  const mrtC = mrt != null && Number.isFinite(mrt) ? (mrt - 32) * 5 / 9 : tempC;
  const windMs = windMph * 0.44704; // mph to m/s
  
  // If MRT is unreasonably different from air temp, cap it
  const mrtDiff = Math.abs(mrtC - tempC);
  const constrainedMrtC = mrtDiff > 70 ? tempC + Math.sign(mrtC - tempC) * 70 : mrtC;
  
  // Calculate vapor pressure
  const vaporPressure = calculateVaporPressure(tempC, humidity);
  
  // Calculate baseline UTCI (dry conditions)
  const utciC = calculateUTCIPolynomial(tempC, vaporPressure, windMs, constrainedMrtC);
  
  // Sanity check: UTCI should be within reasonable range of inputs
  // If calculation produces invalid result, fall back to apparent temperature
  if (!Number.isFinite(utciC) || Math.abs(utciC) > 200) {
    // Simple apparent temperature as fallback
    const apparentC = tempC + 0.33 * vaporPressure - 0.7 * windMs - 4.0;
    return {
      utci: (apparentC * 9 / 5) + 32,
      utciDry: (apparentC * 9 / 5) + 32,
      rainAdjustment: 0,
      precipIntensity: 'none',
      category: getUTCICategory((apparentC * 9 / 5) + 32),
      components: {
        airTemp: tempF,
        mrt: mrt || tempF,
        humidity,
        windMph,
        precipRate
      }
    };
  }
  
  const utciF = (utciC * 9 / 5) + 32;
  
  // Apply rain adjustment if there's precipitation
  let rainAdjustment = 0;
  let precipIntensity = 'none';
  let adjustedUTCI = utciF;
  
  if (precipRate > 0) {
    precipIntensity = classifyPrecipitation(precipRate);
    rainAdjustment = getRainAdjustment(utciF, precipIntensity);
    adjustedUTCI = utciF + rainAdjustment; // rainAdjustment is negative
  }
  
  // Get stress category based on final UTCI
  const category = getUTCICategory(adjustedUTCI);
  
  return {
    utci: adjustedUTCI,
    utciDry: utciF,
    rainAdjustment,
    precipIntensity,
    category,
    components: {
      airTemp: tempF,
      mrt: mrt || tempF,
      humidity,
      windMph,
      precipRate
    }
  };
}

/**
 * Get color classes for UTCI display based on stress level
 * @param {string} impact - Impact level from category
 * @returns {Object} Tailwind color classes
 */
export function getUTCIColorClasses(impact) {
  const colors = {
    extreme: {
      border: 'border-red-300 dark:border-red-500/40',
      bg: 'bg-red-50/80 dark:bg-red-500/15',
      icon: 'bg-red-100 dark:bg-red-500/25',
      iconColor: 'text-red-600 dark:text-red-400',
      label: 'text-red-700 dark:text-red-400',
      value: 'text-red-900 dark:text-red-200'
    },
    very_high: {
      border: 'border-red-200 dark:border-red-500/30',
      bg: 'bg-red-50/60 dark:bg-red-500/10',
      icon: 'bg-red-100 dark:bg-red-500/20',
      iconColor: 'text-red-600 dark:text-red-400',
      label: 'text-red-600 dark:text-red-400',
      value: 'text-red-800 dark:text-red-200'
    },
    high: {
      border: 'border-orange-200 dark:border-orange-500/30',
      bg: 'bg-orange-50/60 dark:bg-orange-500/10',
      icon: 'bg-orange-100 dark:bg-orange-500/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      label: 'text-orange-600 dark:text-orange-400',
      value: 'text-orange-800 dark:text-orange-200'
    },
    moderate: {
      border: 'border-amber-200 dark:border-amber-500/30',
      bg: 'bg-amber-50/60 dark:bg-amber-500/10',
      icon: 'bg-amber-100 dark:bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      label: 'text-amber-600 dark:text-amber-400',
      value: 'text-amber-800 dark:text-amber-200'
    },
    minimal: {
      border: 'border-green-200 dark:border-green-500/30',
      bg: 'bg-green-50/60 dark:bg-green-500/10',
      icon: 'bg-green-100 dark:bg-green-500/20',
      iconColor: 'text-green-600 dark:text-green-400',
      label: 'text-green-600 dark:text-green-400',
      value: 'text-green-800 dark:text-green-200'
    },
    low: {
      border: 'border-sky-200 dark:border-sky-500/30',
      bg: 'bg-sky-50/60 dark:bg-sky-500/10',
      icon: 'bg-sky-100 dark:bg-sky-500/20',
      iconColor: 'text-sky-600 dark:text-sky-400',
      label: 'text-sky-600 dark:text-sky-400',
      value: 'text-sky-800 dark:text-sky-200'
    }
  };
  
  return colors[impact] || colors.minimal;
}

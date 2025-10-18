/**
 * Mean Radiant Temperature (MRT) Calculator
 * 
 * Estimates MRT from available weather data including solar radiation,
 * cloud cover, temperature, humidity, and solar angle.
 * 
 * MRT represents the uniform temperature of an imaginary enclosure in which 
 * the radiant heat transfer from the human body equals the radiant heat 
 * transfer in the actual non-uniform enclosure.
 * 
 * For runners, MRT helps understand:
 * - Why it feels hotter in direct sunlight than in shade (even at same air temp)
 * - The impact of solar radiation on thermal stress
 * - How cloud cover affects heat load
 * - Optimal timing for runs (lower solar angle = less radiant heat)
 * 
 * MRT is calculated using:
 * 1. Shortwave radiation (direct, diffuse, reflected solar)
 * 2. Longwave radiation (atmospheric and ground emission)
 * 3. Solar geometry (elevation angle, projected area)
 * 4. Surface properties (albedo, emissivity)
 * 
 * This provides a more accurate heat stress assessment than air temperature alone.
 */

const STEFAN_BOLTZMANN = 5.67e-8; // W/(m²·K⁴)
const EARTH_ALBEDO_URBAN = 0.15; // Typical urban surface albedo
const EARTH_ALBEDO_GRASS = 0.25; // Grass/natural surface
const EMISSIVITY_ATMOSPHERE = 0.9; // Typical atmospheric emissivity

/**
 * Convert Fahrenheit to Kelvin
 */
const fToK = (f) => ((f - 32) * 5/9) + 273.15;

/**
 * Convert Kelvin to Fahrenheit
 */
const kToF = (k) => ((k - 273.15) * 9/5) + 32;

/**
 * Estimate atmospheric longwave radiation
 * Based on air temperature, humidity, and cloud cover
 */
function estimateLongwaveDown(tempK, humidity, cloudCover) {
  // Clear sky emissivity (Brutsaert formula)
  // Note: vapor pressure in Pa, divide by 100 to get hPa for the formula
  const tempC = tempK - 273.15;
  const vaporPressureHPa = 6.11 * Math.exp((17.27 * tempC) / (tempC + 237.3)) * (humidity / 100);
  
  // Brutsaert formula: ε = 1.24 * (e/T)^(1/7) where e is in hPa and T in K
  const clearSkyEmissivity = 1.24 * Math.pow(vaporPressureHPa / tempK, 1/7);
  
  // Constrain emissivity to physically valid range (0.6 to 1.0)
  const constrainedEmissivity = Math.min(1.0, Math.max(0.6, clearSkyEmissivity));
  
  // Cloud correction (clouds increase longwave radiation)
  const cloudFraction = cloudCover / 100;
  const effectiveEmissivity = constrainedEmissivity * (1 + 0.22 * Math.pow(cloudFraction, 2));
  
  // Final emissivity constraint
  const finalEmissivity = Math.min(1.0, effectiveEmissivity);
  
  // Longwave radiation from atmosphere
  return finalEmissivity * STEFAN_BOLTZMANN * Math.pow(tempK, 4);
}

/**
 * Estimate ground/surface longwave radiation
 */
function estimateLongwaveUp(tempK, albedo = EARTH_ALBEDO_URBAN) {
  // Assume ground is slightly warmer than air (simplified)
  const surfaceTempK = tempK + 2; // Ground typically 2K warmer in daytime
  const surfaceEmissivity = 0.95; // Typical ground emissivity
  
  return surfaceEmissivity * STEFAN_BOLTZMANN * Math.pow(surfaceTempK, 4);
}

/**
 * Calculate direct and diffuse solar radiation components
 */
function calculateSolarComponents(solarRadiation, solarElevation, cloudCover) {
  if (!solarRadiation || solarElevation <= 0) {
    return { direct: 0, diffuse: 0, reflected: 0 };
  }
  
  // Solar radiation is total (direct + diffuse)
  // Estimate components based on cloud cover and solar angle
  const cloudFraction = cloudCover / 100;
  
  // Clear sky: ~80% direct, ~20% diffuse
  // Cloudy sky: ~0% direct, ~100% diffuse
  const directFraction = (1 - cloudFraction) * 0.8;
  const diffuseFraction = 1 - directFraction;
  
  const direct = solarRadiation * directFraction;
  const diffuse = solarRadiation * diffuseFraction;
  
  // Reflected radiation from ground (albedo-dependent)
  const albedo = EARTH_ALBEDO_URBAN; // Can be made configurable
  const reflected = solarRadiation * albedo * 0.5; // 0.5 = view factor to ground
  
  return { direct, diffuse, reflected };
}

/**
 * Calculate projected area factor for a standing person
 * Based on solar elevation angle
 */
function calculateProjectedAreaFactor(solarElevation) {
  if (solarElevation <= 0) return 0;
  
  // For a standing person, projected area varies with sun angle
  // At zenith (90°): minimal area (~0.08)
  // At horizon (0°): maximum area (~0.3)
  const elevationRad = (solarElevation * Math.PI) / 180;
  
  // Empirical formula for projected area factor
  // Combines frontal and top projections
  const frontalFactor = 0.3 * Math.cos(elevationRad);
  const topFactor = 0.08 * Math.sin(elevationRad);
  
  return frontalFactor + topFactor;
}

/**
 * Calculate Mean Radiant Temperature
 * 
 * @param {Object} params - Weather parameters
 * @param {number} params.tempF - Air temperature in Fahrenheit
 * @param {number} params.humidity - Relative humidity (0-100%)
 * @param {number} params.solarRadiation - Solar radiation in W/m²
 * @param {number} params.solarElevation - Solar elevation angle in degrees
 * @param {number} params.cloudCover - Cloud cover percentage (0-100%)
 * @param {number} params.windMph - Wind speed in mph (affects convection)
 * @returns {Object} MRT in Fahrenheit and component breakdown
 */
export function calculateMRT({
  tempF,
  humidity,
  solarRadiation = 0,
  solarElevation = 0,
  cloudCover = 50,
  windMph = 0
}) {
  // Validate inputs
  if (!Number.isFinite(tempF) || !Number.isFinite(humidity)) {
    return null;
  }
  
  const tempK = fToK(tempF);
  
  // Calculate longwave radiation components
  const longwaveDown = estimateLongwaveDown(tempK, humidity, cloudCover);
  const longwaveUp = estimateLongwaveUp(tempK);
  
  // Calculate solar radiation components
  const { direct, diffuse, reflected } = calculateSolarComponents(
    solarRadiation,
    solarElevation,
    cloudCover
  );
  
  // Projected area factor for solar radiation
  const projectedAreaFactor = calculateProjectedAreaFactor(solarElevation);
  
  // Total shortwave radiation absorbed by person
  const absorptivity = 0.7; // Human skin/clothing absorptivity
  const totalShortwaveAbsorbed = (direct * projectedAreaFactor + diffuse * 0.2 + reflected) * absorptivity;
  
  // For MRT calculation, we need the mean radiant temperature of the environment
  // Not the total radiation exchange
  const emissivity = 0.95; // Human body emissivity
  
  // Mean radiant temperature from longwave environment (simplified)
  // Assume person receives longwave from sky (50% view) and ground (50% view)
  const skyViewFactor = 0.5;
  const groundViewFactor = 0.5;
  const avgLongwaveRadiation = longwaveDown * skyViewFactor + longwaveUp * groundViewFactor;
  
  // Calculate base MRT from longwave radiation (no sun)
  // L = ε * σ * T_mrt^4, so T_mrt^4 = L / (ε * σ)
  const baseMrtK4 = avgLongwaveRadiation / (emissivity * STEFAN_BOLTZMANN);
  
  // Add shortwave radiation contribution to MRT
  // Convert absorbed shortwave to equivalent temperature increase
  const shortwaveContribution = totalShortwaveAbsorbed / (emissivity * STEFAN_BOLTZMANN);
  
  // Total MRT^4
  const mrtK4 = baseMrtK4 + shortwaveContribution;
  
  // Validate mrtK4 is positive and reasonable
  if (!Number.isFinite(mrtK4) || mrtK4 <= 0) {
    // Fallback to air temperature if calculation fails
    return {
      mrt: tempF,
      enhancement: 0,
      components: {
        airTemp: tempF,
        longwaveDown,
        longwaveUp,
        solarDirect: direct,
        solarDiffuse: diffuse,
        solarReflected: reflected,
        totalShortwave: totalShortwaveAbsorbed,
        avgLongwave: avgLongwaveRadiation,
        projectedAreaFactor
      }
    };
  }
  
  const mrtK = Math.pow(mrtK4, 0.25);
  let mrtF = kToF(mrtK);
  
  // Sanity check: MRT shouldn't be more than 60°F warmer than air temp
  // or colder than air temp (unless in extreme cold with low radiation)
  const maxEnhancement = 60; // °F
  const minEnhancement = -20; // °F (can be slightly cooler at night)
  
  if (mrtF - tempF > maxEnhancement) {
    mrtF = tempF + maxEnhancement;
  } else if (mrtF - tempF < minEnhancement) {
    mrtF = tempF + minEnhancement;
  }
  
  // Calculate enhancement over air temperature
  const enhancement = mrtF - tempF;
  
  return {
    mrt: mrtF,
    enhancement, // How much warmer MRT is than air temp
    components: {
      airTemp: tempF,
      longwaveDown: longwaveDown,
      longwaveUp: longwaveUp,
      solarDirect: direct,
      solarDiffuse: diffuse,
      solarReflected: reflected,
      totalShortwave: totalShortwaveAbsorbed,
      avgLongwave: avgLongwaveRadiation,
      projectedAreaFactor: projectedAreaFactor
    }
  };
}

/**
 * Get MRT category and description for runners
 */
export function getMRTCategory(mrt, airTemp) {
  const enhancement = mrt - airTemp;
  
  if (enhancement < 5) {
    return {
      category: 'minimal',
      label: 'Minimal Heat Load',
      description: 'Low solar radiation effect. Similar to running in shade.',
      color: 'sky',
      impact: 'low'
    };
  } else if (enhancement < 15) {
    return {
      category: 'moderate',
      label: 'Moderate Heat Load',
      description: 'Noticeable solar heating. Consider sun protection.',
      color: 'amber',
      impact: 'moderate'
    };
  } else if (enhancement < 25) {
    return {
      category: 'high',
      label: 'High Heat Load',
      description: 'Significant solar heating. Seek shade when possible.',
      color: 'orange',
      impact: 'high'
    };
  } else {
    return {
      category: 'extreme',
      label: 'Extreme Heat Load',
      description: 'Intense solar radiation. Avoid midday sun exposure.',
      color: 'red',
      impact: 'extreme'
    };
  }
}

/**
 * Calculate effective temperature combining air temp and MRT
 * This represents what temperature a runner actually "feels" in the sun
 */
export function calculateEffectiveSolarTemp(tempF, mrtF, windMph) {
  // Weight MRT more heavily in low wind, less in high wind
  const windFactor = Math.max(0.3, 1 - (windMph / 20)); // Wind reduces MRT effect
  
  // Effective temp is weighted average
  const effectiveTemp = tempF * (1 - windFactor * 0.6) + mrtF * (windFactor * 0.6);
  
  return effectiveTemp;
}

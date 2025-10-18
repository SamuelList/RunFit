/**
 * UTCI-Based Running Performance Score Calculator
 * 
 * This scoring system uses the Universal Thermal Climate Index (UTCI) as the
 * primary metric for determining running conditions. UTCI accounts for:
 * - Air temperature
 * - Humidity (vapor pressure)
 * - Wind speed
 * - Mean Radiant Temperature (solar radiation effect)
 * 
 * The score is based on deviation from ideal conditions (47°F UTCI).
 */

import { getUTCICategory } from './utci';

// Ideal UTCI for running (in Fahrenheit)
const IDEAL_UTCI_MIN = 45.0;
const IDEAL_UTCI_MAX = 49.0;
const IDEAL_UTCI = (IDEAL_UTCI_MIN + IDEAL_UTCI_MAX) / 2; // Midpoint for reference

// Multiplier to adjust the overall severity of score penalties.
// 1.0 = standard penalties
// > 1.0 = harsher penalties (score drops faster)
// < 1.0 = milder penalties (score drops slower)
const PENALTY_MULTIPLIER = 2;

// UTCI ranges and their base penalties
// These define how much the score decreases per degree away from ideal
export const UTCI_ZONES = [
  // DANGEROUS COLD
  { min: -Infinity, max: -40, penalty: 2.5, label: 'Dangerous Cold' },
  { min: -40, max: -27.4, penalty: 2.2, label: 'Very Strong Cold' },
  { min: -27.4, max: -15, penalty: 1.8, label: 'Strong Cold' },
  { min: -15, max: -5.8, penalty: 1.5, label: 'Lower Moderate Cold' },
  { min: -5.8, max: 8.6, penalty: 1.2, label: 'Moderate Cold' },
  { min: 8.6, max: 20, penalty: 1.0, label: 'Upper Moderate Cold' },
  { min: 20, max: 32, penalty: 0.8, label: 'Cold' },
  { min: 32, max: IDEAL_UTCI_MIN, penalty: 0.5, label: 'Cool' },
  // COMFORTABLE (Ideal is 45-49)
  { min: IDEAL_UTCI_MIN, max: IDEAL_UTCI_MAX, penalty: 0, label: 'Ideal' },
  { min: IDEAL_UTCI_MAX, max: 60, penalty: 0.4, label: 'Comfortable Warm' },
  { min: 60, max: 70, penalty: 0.6, label: 'Mildly Warm' },
  { min: 70, max: 78.8, penalty: 0.8, label: 'Warm' },
  // HEAT STRESS
  { min: 78.8, max: 84, penalty: 1.0, label: 'Moderate Heat' },
  { min: 84, max: 89.6, penalty: 1.25, label: 'Upper Moderate Heat' },
  { min: 89.6, max: 95, penalty: 1.5, label: 'Strong Heat' },
  { min: 95, max: 100.4, penalty: 1.75, label: 'Upper Strong Heat' },
  { min: 100.4, max: 106, penalty: 2.0, label: 'Very Strong Heat' },
  { min: 106, max: Infinity, penalty: 2.5, label: 'Extreme Heat' }
];

/**
 * Calculate running performance score based on UTCI
 * 
 * @param {number} utciF - UTCI value in Fahrenheit
 * @param {number} precipRate - Precipitation rate in inches/hour (optional)
 * @returns {Object} Score breakdown with value and details
 */
export function calculateUTCIScore(utciF, precipRate = 0) {
  // Validate input
  if (!Number.isFinite(utciF)) {
    return {
      score: 0,
      utci: null,
      deviation: null,
      zone: null,
      category: null,
      description: 'Invalid UTCI value'
    };
  }

  // Get UTCI category info
  const category = getUTCICategory(utciF);

  // Calculate deviation from ideal range
  const deviation = utciF < IDEAL_UTCI_MIN ? IDEAL_UTCI_MIN - utciF :
                  utciF > IDEAL_UTCI_MAX ? utciF - IDEAL_UTCI_MAX : 0;

  // Find which zone this UTCI falls into
  const zone = UTCI_ZONES.find(z => utciF >= z.min && utciF < z.max);
  
  if (!zone) {
    return {
      score: 0,
      utci: utciF,
      deviation,
      zone: null,
      category,
      description: 'UTCI out of valid range'
    };
  }

  // Calculate base score using deviation and zone penalty
  const zonePenaltyRate = zone.penalty * PENALTY_MULTIPLIER;
  const basePenalty = deviation * zonePenaltyRate;
  let score = 100 - basePenalty;
  
  // Track additional penalties
  let extremePenalty = 0;

  // Additional penalties for extreme conditions
  if (utciF > 106 || utciF < -27.4) {
    // Extreme conditions get an additional flat penalty
    extremePenalty = 20 * PENALTY_MULTIPLIER;
    score -= extremePenalty;
  } else if (utciF > 100.4 || utciF < -5.8) {
    // Very strong stress gets additional penalty
    extremePenalty = 10 * PENALTY_MULTIPLIER;
    score -= extremePenalty;
  }

  // Note: Precipitation effects are already included in the UTCI calculation
  // via the rain adjustment table, so no additional precipitation penalty is needed

  // Clamp score to 0-100 range
  const uncappedScore = score;
  score = Math.max(0, Math.min(100, Math.round(score)));
  
  // Console log the calculation breakdown
  console.log('========================================');
  console.log('🎯 UTCI SCORE CALCULATION');
  console.log('========================================');
  console.log(`📊 Input:`);
  console.log(`  • UTCI: ${utciF.toFixed(1)}°F`);
  console.log(`  • Ideal UTCI: ${IDEAL_UTCI}°F`);
  console.log(`  • Penalty Multiplier: x${PENALTY_MULTIPLIER}`);
  console.log(``);
  console.log(`📐 Calculation:`);
  console.log(`  • Deviation from ideal: ${deviation.toFixed(1)}°F ${utciF > IDEAL_UTCI ? 'warmer' : 'cooler'}`);
  console.log(`  • Thermal zone: ${zone.label}`);
  console.log(`  • Zone penalty rate: ${zone.penalty} x ${PENALTY_MULTIPLIER} = ${zonePenaltyRate.toFixed(2)} pts/°F`);
  console.log(``);
  console.log(`💯 Score Breakdown:`);
  console.log(`  • Starting score: 100`);
  console.log(`  • Base penalty: ${deviation.toFixed(1)}°F × ${zonePenaltyRate.toFixed(2)} = -${basePenalty.toFixed(2)} pts`);
  if (extremePenalty > 0) {
    console.log(`  • Extreme condition penalty: -${extremePenalty.toFixed(2)} pts`);
  }
  console.log(`  • Subtotal: ${uncappedScore.toFixed(2)}`);
  console.log(`  • Final score (capped 0-100): ${score}`);
  console.log(``);
  console.log(`📝 Summary: ${zone.label} conditions (${category.label})`);
  console.log('========================================');

  return {
    score,
    utci: utciF,
    deviation: Math.round(deviation * 10) / 10,
    zone: zone.label,
    zonePenalty: zone.penalty,
    category,
    description: buildScoreDescription(score, utciF, deviation, zone, category)
  };
}

/**
 * Build human-readable description of the score
 */
function buildScoreDescription(score, utciF, deviation, zone, category) {
  const isIdeal = deviation < 3;
  const isHot = utciF > IDEAL_UTCI;
  
  let desc = '';

  // Primary condition description
  if (isIdeal) {
    desc = `Ideal running conditions! UTCI is ${Math.round(utciF)}°F, very close to the optimal ${IDEAL_UTCI}°F.`;
  } else if (isHot) {
    desc = `${zone.label} conditions with UTCI of ${Math.round(utciF)}°F (${Math.round(deviation)}° above ideal).`;
  } else {
    desc = `${zone.label} conditions with UTCI of ${Math.round(utciF)}°F (${Math.round(deviation)}° below ideal).`;
  }

  // Add stress level description
  desc += ` ${category.description}`;

  // Note: Precipitation effects are already included in UTCI value

  return desc;
}

/**
 * Get score label based on value
 */
export function getScoreLabel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  if (score >= 50) return 'Moderate';
  if (score >= 40) return 'Challenging';
  if (score >= 30) return 'Difficult';
  if (score >= 20) return 'Very Difficult';
  if (score >= 10) return 'Extreme';
  return 'Dangerous';
}

/**
 * Get detailed breakdown of score factors for display
 */
export function getUTCIScoreBreakdown(utciInput, precipRate = 0) {
  // utciInput can be either a numeric UTCI value (°F) or the full object
  // returned by calculateUTCI (which includes components).
  let utciVal = null;
  let components = null;
  let rainAdj = 0;

  if (utciInput && typeof utciInput === 'object' && utciInput.utci != null) {
    utciVal = utciInput.utci;
    components = utciInput.components || {};
    rainAdj = utciInput.rainAdjustment || 0;
  } else {
    // fallback: numeric value
    utciVal = Number(utciInput);
    components = { precipRate };
  }

  const result = calculateUTCIScore(utciVal, precipRate || components.precipRate || 0);
  const category = getUTCICategory(utciVal);

  // Build factor parts from available components
  const parts = [];

  // UTCI summary part
  parts.push({
    key: 'utci',
    label: 'UTCI (Universal Thermal Climate Index)',
    value: `${Math.round(result.utci)}°F`,
    description: result.description,
    impact: result.deviation < 5 ? 'low' : result.deviation < 15 ? 'medium' : 'high',
    penalty: Math.round(result.deviation * result.zonePenalty)
  });

  // Add air temperature
  if (components.airTemp != null) {
    parts.push({
      key: 'air_temp',
      label: 'Air Temperature',
      value: `${Math.round(components.airTemp)}°F`,
      description: 'Ambient dry-bulb air temperature used in UTCI calculation.',
      impact: 'low',
      penalty: 0
    });
  }

  // Feels-like / apparent (if present)
  if (components.apparentTemp != null) {
    parts.push({
      key: 'feels_like',
      label: 'Feels Like',
      value: `${Math.round(components.apparentTemp)}°F`,
      description: 'Apparent temperature / heat index for quick reference.',
      impact: 'low',
      penalty: 0
    });
  }

  // Humidity / vapor pressure
  if (components.humidity != null) {
    parts.push({
      key: 'humidity',
      label: 'Relative Humidity',
      value: `${Math.round(components.humidity)}%`,
      description: 'Relative humidity influences evaporative cooling and UTCI via vapor pressure.',
      impact: 'medium',
      penalty: 0
    });
  }

  // Wind
  if (components.windMph != null) {
    parts.push({
      key: 'wind',
      label: 'Wind Speed',
      value: `${Math.round(components.windMph)} mph`,
      description: 'Wind increases convective heat loss; accounted for in UTCI at 10m wind speed.',
      impact: 'medium',
      penalty: 0
    });
  }

  // MRT and note about solar/longwave
  if (components.mrt != null) {
    parts.push({
      key: 'mrt',
      label: 'Mean Radiant Temperature (MRT)',
      value: `${Math.round(components.mrt)}°F`,
      description: 'MRT captures the combined radiative environment (sun + sky + ground); higher MRT increases UTCI.',
      impact: 'medium',
      penalty: 0
    });
  }

  // Rain info (informational)
  if (components.precipRate != null && components.precipRate > 0) {
    parts.push({
      key: 'precip',
      label: 'Precipitation',
      value: `${components.precipRate.toFixed(2)} in/hr`,
      description: `Precipitation lowers perceived temperature (rain adjustment: ${rainAdj}°F).`,
      impact: 'low',
      penalty: 0
    });
  }

  // Thermal stress / category
  parts.push({
    key: 'thermal_stress',
    label: 'Thermal Stress Level',
    value: category.label,
    description: `${category.icon} ${category.description}`,
    impact: category.impact === 'extreme' || category.impact === 'very_high' ? 'high' : 
            category.impact === 'high' || category.impact === 'moderate' ? 'medium' : 'low',
    penalty: 0
  });

  return {
    score: result.score,
    label: getScoreLabel(result.score),
    useWBGT: false, // This is UTCI-based
    parts,
    result: {
      label: 'Final Performance Score',
      value: `${result.score}/100`,
      description: `${getScoreLabel(result.score)} running conditions. ${result.description}`
    },
    total: 100,
    dominantKeys: result.deviation > 10 ? ['utci'] : ['thermal_stress']
  };
}

export default calculateUTCIScore;

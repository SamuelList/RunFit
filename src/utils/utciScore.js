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
const IDEAL_UTCI = 47.0;

// Multiplier to adjust the overall severity of score penalties.
// 1.0 = standard penalties
// > 1.0 = harsher penalties (score drops faster)
// < 1.0 = milder penalties (score drops slower)
const PENALTY_MULTIPLIER = 4.0;

// UTCI ranges and their base penalties
// These define how much the score decreases per degree away from ideal
const UTCI_ZONES = [
  // Extreme Heat: > 106°F
  { min: 106, max: Infinity, penalty: 2.5, label: 'Extreme Heat' },
  // Very Strong Heat: 100.4-106°F
  { min: 100.4, max: 106, penalty: 2.0, label: 'Very Strong Heat' },
  // Strong Heat: 89.6-100.4°F
  { min: 89.6, max: 100.4, penalty: 1.5, label: 'Strong Heat' },
  // Moderate Heat: 78.8-89.6°F
  { min: 78.8, max: 89.6, penalty: 1.0, label: 'Moderate Heat' },
  // Comfortable (hot side): 47-78.8°F
  { min: IDEAL_UTCI, max: 78.8, penalty: 0.4, label: 'Warm' },
  // Comfortable (cold side): 32-47°F
  { min: 32, max: IDEAL_UTCI, penalty: 0.5, label: 'Cool' },
  // Slight Cold: 8.6-32°F
  { min: 8.6, max: 32, penalty: 0.8, label: 'Cold' },
  // Moderate Cold: -5.8 to 8.6°F
  { min: -5.8, max: 8.6, penalty: 1.2, label: 'Very Cold' },
  // Strong Cold: -27.4 to -5.8°F
  { min: -27.4, max: -5.8, penalty: 1.8, label: 'Extreme Cold' },
  // Very Strong Cold: < -27.4°F
  { min: -Infinity, max: -27.4, penalty: 2.5, label: 'Dangerous Cold' }
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

  // Calculate deviation from ideal
  const deviation = Math.abs(utciF - IDEAL_UTCI);

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
    desc = `${zone} conditions with UTCI of ${Math.round(utciF)}°F (${Math.round(deviation)}° above ideal).`;
  } else {
    desc = `${zone} conditions with UTCI of ${Math.round(utciF)}°F (${Math.round(deviation)}° below ideal).`;
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
export function getUTCIScoreBreakdown(utciF, precipRate = 0) {
  const result = calculateUTCIScore(utciF, precipRate);
  const category = getUTCICategory(utciF);
  
  return {
    score: result.score,
    label: getScoreLabel(result.score),
    useWBGT: false, // This is UTCI-based
    parts: [
      {
        key: 'utci',
        label: 'UTCI (Universal Thermal Climate Index)',
        value: `${Math.round(result.utci)}°F`,
        description: result.description,
        impact: result.deviation < 5 ? 'low' : result.deviation < 15 ? 'medium' : 'high',
        penalty: Math.round(result.deviation * result.zonePenalty)
      },
      {
        key: 'thermal_stress',
        label: 'Thermal Stress Level',
        value: category.label,
        description: `${category.icon} ${category.description}`,
        impact: category.impact === 'extreme' || category.impact === 'very_high' ? 'high' : 
                category.impact === 'high' || category.impact === 'moderate' ? 'medium' : 'low',
        penalty: 0 // Already factored into UTCI deviation
      }
      // Note: Precipitation effects are already included in the UTCI calculation
    ],
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

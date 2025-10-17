/**
 * Scoring Utilities
 * 
 * Core scoring algorithm for running conditions.
 * Extracted from utils/scoring.js
 */

import { clamp } from '../helpers';
import { dewPointF } from './dewPoint';

// --- Scoring Constants ---
export const HEAT_PENALTY_MAX_TEMP = 85; // Temperature (°F) where heat penalty reaches maximum (99 points)
export const COLD_PENALTY_MAX_MULTIPLIER = 28; // Max penalty for cold (lower = more forgiving, max = 99)
export const COLD_PENALTY_WIDTH_WORKOUT = 22; // Temperature range for cold penalty (workouts)
export const COLD_PENALTY_WIDTH_EASY = 20; // Temperature range for cold penalty (easy/long runs)

// --- Ideal Running Temperatures ---
export const IDEAL_TEMP_WORKOUT = 43; // Ideal temperature for workouts (°F)
export const IDEAL_TEMP_LONG_RUN = 48; // Ideal temperature for long runs (°F)
export const IDEAL_TEMP_EASY = 50; // Ideal temperature for easy runs (°F)

// --- Dew Point Penalty Thresholds ---
export const DEW_POINT_COMFORTABLE = 50; // Below this: 0 penalty
export const DEW_POINT_SLIGHTLY_MUGGY = 55; // 50-55: 2 penalty
export const DEW_POINT_MODERATE = 60; // 55-60: 5 penalty
export const DEW_POINT_MUGGY = 65; // 60-65: 10 penalty
export const DEW_POINT_VERY_HUMID = 70; // 65-70: 18 penalty
export const DEW_POINT_OPPRESSIVE = 75; // 70-75: 28 penalty

// --- Dew Point Penalty Values ---
export const DEW_POINT_PENALTY_COMFORTABLE = 0;
export const DEW_POINT_PENALTY_SLIGHTLY_MUGGY = 2;
export const DEW_POINT_PENALTY_MODERATE = 5;
export const DEW_POINT_PENALTY_MUGGY = 10;
export const DEW_POINT_PENALTY_VERY_HUMID = 18;
export const DEW_POINT_PENALTY_OPPRESSIVE = 28;
export const DEW_POINT_PENALTY_DANGEROUS = 40;

// --- High Humidity Penalty ---
export const HUMIDITY_THRESHOLD = 80; // High humidity starts at 80%
export const HUMIDITY_TEMP_THRESHOLD = 60; // Temperature threshold for humidity penalty
export const HUMIDITY_PENALTY_MAX = 8; // Max penalty for high humidity

// --- Wind Penalty Thresholds ---
export const WIND_PENALTY_BASE_DIVISOR = 25; // Wind speed divisor for base penalty calculation
export const WIND_PENALTY_MAX = 40; // Max wind penalty
export const WIND_PENALTY_OFFSET = 2; // Wind speed offset (mph) before penalty starts

// --- Precipitation Penalty Values ---
export const PRECIP_PROB_PENALTY_MAX = 15; // Max penalty from precipitation probability
export const PRECIP_AMOUNT_PENALTY_MAX = 20; // Max penalty from precipitation amount
export const PRECIP_AMOUNT_MULTIPLIER = 160; // Multiplier for precipitation amount
export const ICE_DANGER_TEMP = 34; // Temperature (°F) for ice danger with precipitation
export const ICE_DANGER_PENALTY = 10; // Penalty for ice danger

// --- UV Penalty Thresholds ---
export const UV_BASE_THRESHOLD = 6; // UV index where penalty starts
export const UV_PENALTY_MULTIPLIER = 2.5; // Multiplier for UV penalty
export const UV_PENALTY_MAX = 10; // Max UV penalty (base)
export const UV_WORKOUT_HEAT_TEMP = 70; // Temperature (°F) where workout UV penalty increases
export const UV_WORKOUT_HEAT_PENALTY = 5; // Additional UV penalty for hot workouts
export const UV_LONGRUN_THRESHOLD = 5; // UV threshold for long runs
export const UV_LONGRUN_MULTIPLIER = 3; // Multiplier for long run UV penalty
export const UV_LONGRUN_MAX = 15; // Max UV penalty for long runs
export const UV_LONGRUN_HEAT_PENALTY = 3; // Additional UV penalty for hot long runs

// --- Synergy Penalty Thresholds ---
export const HEAT_SYNERGY_TEMP_THRESHOLD = 100; // Temperature (°F) where heat synergy penalty starts
export const COLD_SYNERGY_TEMP = 35; // Temperature (°F) where cold synergy starts
export const COLD_SYNERGY_WIND_THRESHOLD = 10; // Wind speed (mph) where cold synergy increases
export const COLD_SYNERGY_MULTIPLIER = 0.3; // Base multiplier for cold synergy
export const COLD_SYNERGY_WIND_MULTIPLIER = 0.6; // Additional multiplier when windy

export const HEAT_SYNERGY_DP_THRESHOLD = 70; // Dew point (°F) where heat synergy starts
export const HEAT_SYNERGY_DP_MULTIPLIER = 0.6; // Multiplier for dew point heat synergy
export const HEAT_SYNERGY_TEMP_DIVISOR = 5; // Temperature divisor for heat synergy calculation
export const HEAT_SYNERGY_MAX_MULTIPLIER = 20; // Max multiplier for heat synergy

/**
 * Calculate running score based on weather conditions
 * Higher score = better running conditions
 * 
 * @param {Object} conditions - Weather conditions
 * @param {number} conditions.tempF - Temperature in Fahrenheit
 * @param {number} conditions.apparentF - Feels-like temperature in Fahrenheit
 * @param {number} conditions.humidity - Relative humidity (0-100)
 * @param {number} conditions.windMph - Wind speed in mph
 * @param {number} conditions.precipProb - Precipitation probability (0-100)
 * @param {number} conditions.precipIn - Precipitation amount in inches
 * @param {number} conditions.uvIndex - UV index
 * @param {boolean} workout - Is this a workout run
 * @param {boolean} longRun - Is this a long run
 * @returns {number} Running score (0-100)
 */
export function computeRunningScore({ tempF, apparentF, humidity, windMph, precipProb, precipIn, uvIndex }, workout, longRun) {
  // Step 1: Determine ideal temperature based on run type
  const ideal = workout ? IDEAL_TEMP_WORKOUT : longRun ? IDEAL_TEMP_LONG_RUN : IDEAL_TEMP_EASY;

  // Step 2: Set temperature penalty curve width based on run type
  const coolWidth = workout ? COLD_PENALTY_WIDTH_WORKOUT : COLD_PENALTY_WIDTH_EASY;

  // Step 3: Calculate dew point (humidity's effect on perceived temperature)
  const dpF = dewPointF(tempF, humidity);

  // Step 4: Calculate temperature penalty using asymmetric curves
  const diff = apparentF - ideal;
  const warmSpan = Math.max(5, HEAT_PENALTY_MAX_TEMP - ideal);
  const tempPenalty = diff >= 0
    ? Math.pow(clamp(diff / warmSpan, 0, 1), 1.6) * 99
    : Math.pow(Math.abs(diff) / coolWidth, 2) * COLD_PENALTY_MAX_MULTIPLIER;

  // Step 5: Calculate humidity penalty based on dew point thresholds
  let dewpointPenalty;
  if (dpF < DEW_POINT_COMFORTABLE) dewpointPenalty = DEW_POINT_PENALTY_COMFORTABLE;
  else if (dpF < DEW_POINT_SLIGHTLY_MUGGY) dewpointPenalty = DEW_POINT_PENALTY_SLIGHTLY_MUGGY;
  else if (dpF < DEW_POINT_MODERATE) dewpointPenalty = DEW_POINT_PENALTY_MODERATE;
  else if (dpF < DEW_POINT_MUGGY) dewpointPenalty = DEW_POINT_PENALTY_MUGGY;
  else if (dpF < DEW_POINT_VERY_HUMID) dewpointPenalty = DEW_POINT_PENALTY_VERY_HUMID;
  else if (dpF < DEW_POINT_OPPRESSIVE) dewpointPenalty = DEW_POINT_PENALTY_OPPRESSIVE;
  else dewpointPenalty = DEW_POINT_PENALTY_DANGEROUS;

  // Step 6: Calculate humidity penalty (additional factor when hot + humid)
  const humidityPenalty = humidity > HUMIDITY_THRESHOLD && apparentF > HUMIDITY_TEMP_THRESHOLD 
    ? Math.pow((humidity - HUMIDITY_THRESHOLD) / 20, 2) * HUMIDITY_PENALTY_MAX 
    : 0;

  // Step 7: Calculate wind penalty
  const windPenalty = Math.pow(Math.max(0, windMph - WIND_PENALTY_OFFSET) / WIND_PENALTY_BASE_DIVISOR, 2) * WIND_PENALTY_MAX;

  // Step 8: Calculate precipitation penalty
  const precipPenalty = Math.min(Math.max((precipProb / 100) * PRECIP_PROB_PENALTY_MAX, 0), PRECIP_PROB_PENALTY_MAX) 
    + Math.min(Math.max(precipIn * PRECIP_AMOUNT_MULTIPLIER, 0), PRECIP_AMOUNT_PENALTY_MAX) 
    + (apparentF <= ICE_DANGER_TEMP && precipIn > 0 ? ICE_DANGER_PENALTY : 0);

  // Step 9: Calculate UV penalty
  let uvPenalty = Math.min(Math.max(Math.max(0, uvIndex - UV_BASE_THRESHOLD) * UV_PENALTY_MULTIPLIER, 0), UV_PENALTY_MAX);
  if (workout && apparentF >= UV_WORKOUT_HEAT_TEMP) uvPenalty += UV_WORKOUT_HEAT_PENALTY;
  if (longRun) {
    uvPenalty = Math.min(Math.max(Math.max(0, uvIndex - UV_LONGRUN_THRESHOLD) * UV_LONGRUN_MULTIPLIER, 0), UV_LONGRUN_MAX);
    if (apparentF >= UV_WORKOUT_HEAT_TEMP) uvPenalty += UV_LONGRUN_HEAT_PENALTY;
  }

  // Step 10: Calculate synergy penalties
  const synergyCold = apparentF < COLD_SYNERGY_TEMP 
    ? (COLD_SYNERGY_TEMP - apparentF) * COLD_SYNERGY_MULTIPLIER * (windMph > COLD_SYNERGY_WIND_THRESHOLD ? COLD_SYNERGY_WIND_MULTIPLIER : 0) 
    : 0;
  const synergyHeat = (dpF > HEAT_SYNERGY_DP_THRESHOLD ? (dpF - HEAT_SYNERGY_DP_THRESHOLD) * HEAT_SYNERGY_DP_MULTIPLIER : 0) 
    + (apparentF > HEAT_SYNERGY_TEMP_THRESHOLD ? Math.pow((apparentF - HEAT_SYNERGY_TEMP_THRESHOLD) / HEAT_SYNERGY_TEMP_DIVISOR, 2) * HEAT_SYNERGY_MAX_MULTIPLIER : 0);

  // Step 11: Sum all penalties and ensure bounds (0-100)
  let penalties = tempPenalty + dewpointPenalty + humidityPenalty + windPenalty + precipPenalty + uvPenalty + synergyCold + synergyHeat;
  return Math.min(Math.max(Math.round(100 - Math.min(Math.max(penalties, 0), 99)), 0), 100);
}

/**
 * Get label and tone for a score
 * @param {number} score - Running score (0-100)
 * @returns {Object} Label with text and tone
 */
export function scoreLabel(score) {
  if (score >= 90) return { text: "Ideal conditions", tone: "Perfect for peak performance" };
  if (score >= 80) return { text: "Excellent", tone: "Great time to fly" };
  if (score >= 70) return { text: "Great for running", tone: "Strong conditions" };
  if (score >= 60) return { text: "Good", tone: "Solid conditions" };
  if (score >= 50) return { text: "Decent conditions", tone: "Manageable" };
  if (score >= 40) return { text: "Fair / Not ideal", tone: "Consider adjustments" };
  if (score >= 30) return { text: "Not ideal", tone: "Challenging" };
  if (score >= 20) return { text: "Tough conditions", tone: "Proceed with care" };
  if (score >= 10) return { text: "Very tough", tone: "High risk" };
  return { text: "Extreme / Unsafe", tone: "Consider skipping" };
}

/**
 * Helper to interpolate between two RGB colors
 * @param {Object} color1 - First color {r, g, b}
 * @param {Object} color2 - Second color {r, g, b}
 * @param {number} t - Interpolation factor (0-1)
 * @returns {Object} Interpolated color {r, g, b}
 */
function lerpColor(color1, color2, t) {
  const r = Math.round(color1.r + (color2.r - color1.r) * t);
  const g = Math.round(color1.g + (color2.g - color1.g) * t);
  const b = Math.round(color1.b + (color2.b - color1.b) * t);
  return { r, g, b };
}

/**
 * Get tone styling for a score with temperature-based colors
 * Temperature-based gradient: cold (blue) -> ideal (green) -> warm (yellow) -> hot (red)
 * 
 * @param {number} score - Running score (0-100)
 * @param {number} apparentF - Feels-like temperature in Fahrenheit
 * @returns {Object} Styling object with textClass, textStyle, badgeClass, badgeStyle, fillColor
 */
export function scoreTone(score, apparentF) {
  const ideal = 45;
  const warmMid = 65;
  const coldThreshold = 20;
  const hotThreshold = 85;
  
  const blue = { r: 59, g: 130, b: 246 };
  const green = { r: 34, g: 197, b: 94 };
  const yellow = { r: 234, g: 179, b: 8 };
  const red = { r: 239, g: 68, b: 68 };
  
  let color;
  if (apparentF <= coldThreshold) {
    color = blue;
  } else if (apparentF >= hotThreshold) {
    color = red;
  } else if (apparentF < ideal) {
    const t = (apparentF - coldThreshold) / (ideal - coldThreshold);
    color = lerpColor(blue, green, clamp(t, 0, 1));
  } else if (apparentF < warmMid) {
    const t = (apparentF - ideal) / (warmMid - ideal);
    color = lerpColor(green, yellow, clamp(t, 0, 1));
  } else {
    const t = (apparentF - warmMid) / (hotThreshold - warmMid);
    color = lerpColor(yellow, red, clamp(t, 0, 1));
  }
  
  const rgb = `rgb(${color.r}, ${color.g}, ${color.b})`;
  const lightBg = `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`;
  const border = `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`;
  
  return {
    textClass: "",
    textStyle: { color: rgb },
    badgeClass: "",
    badgeStyle: { 
      backgroundColor: lightBg, 
      color: rgb, 
      borderColor: border 
    },
    fillColor: rgb
  };
}

/**
 * Get tone styling based purely on score
 * Score-based gradient: purple (poor) -> red -> yellow -> green (excellent)
 * 
 * @param {number} score - Running score (0-100)
 * @returns {Object} Styling object with textClass, textStyle, badgeClass, badgeStyle, fillColor
 */
export function scoreBasedTone(score) {
  const purple = { r: 147, g: 51, b: 234 };
  const red = { r: 239, g: 68, b: 68 };
  const yellow = { r: 234, g: 179, b: 8 };
  const green = { r: 34, g: 197, b: 94 };
  
  let color;
  if (score <= 10) {
    const t = (score - 1) / (10 - 1);
    color = lerpColor(purple, red, clamp(t, 0, 1));
  } else if (score <= 50) {
    const t = (score - 10) / (50 - 10);
    color = lerpColor(red, yellow, clamp(t, 0, 1));
  } else {
    const t = (score - 50) / (100 - 50);
    color = lerpColor(yellow, green, clamp(t, 0, 1));
  }
  
  const rgb = `rgb(${color.r}, ${color.g}, ${color.b})`;
  const lightBg = `rgba(${color.r}, ${color.g}, ${color.b}, 0.1)`;
  const border = `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`;
  
  return {
    textClass: "",
    textStyle: { color: rgb },
    badgeClass: "",
    badgeStyle: { 
      backgroundColor: lightBg, 
      color: rgb, 
      borderColor: border 
    },
    fillColor: rgb
  };
}

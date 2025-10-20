// please use and or create other files at all cost, we are trying to reduce the size of App.jsx


import React, { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Thermometer, Droplets, Wind, CloudRain, Sun, Hand, Info, Flame, Sunrise as SunriseIcon, Sunset as SunsetIcon, Settings as SettingsIcon, Crosshair, Moon, X, TrendingUp, Cloud, CloudFog, UserRound, Calendar, Lightbulb, Activity, Clock, Gauge } from "lucide-react";
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

// Utils
import { computeSunEvents, calculateSolarElevation, calculateMoonPosition } from "./utils/solar";
import { calculateMRT, getMRTCategory, calculateEffectiveSolarTemp } from "./utils/mrt";
import { calculateUTCI, getUTCICategory, getUTCIColorClasses } from "./utils/utci";
import { GEAR_INFO, GEAR_ICONS } from "./utils/gearData";
import { APP_VERSION, DEFAULT_PLACE, DEFAULT_SETTINGS, FORECAST_ALERT_META, nominatimHeaders } from "./utils/constants";
import { clamp, round1, msToMph, mmToInches, cToF, fToC, computeFeelsLike, blendWeather, getCurrentHourIndex } from "./utils/helpers";
import { calculateRoadConditions, makeApproachTips, calculateWBGT } from "./utils/runScore";
import { getUTCIScoreBreakdown } from "./utils/utciScore";
import { getRunningCondition } from "./utils/conditions";
import { scoreLabel, scoreTone, scoreBasedTone } from "./utils/scoring";
import { outfitFor, chooseSocks, calculateEffectiveTemp, baseLayersForTemp, handsLevelFromGear } from "./utils/outfit";

// UI Components
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Label, Switch, SegmentedControl } from "./components/ui";

// Layout Components
import { Header, LoadingSplash } from "./components/layout";

// Weather Components
import { CurrentConditions, WeatherGauge, WeatherMetrics, ForecastCard } from "./components/weather";

// Running Components
import { OutfitRecommendation, BestRunTimeCard } from "./components/running";

// Night Components
import { NightRunningCard } from "./components/night";

// Modal Components
import { DynamicModal, ScoreBreakdownContent, DebugModal } from "./components/modals";
import { InsightsModal } from "./components/insights";

// Tomorrow Components
import { TomorrowOutfit, TimeSelector } from "./components/tomorrow";

// Performance Components
import { PerformanceScore } from "./components/performance";

// iOS-specific styles for safe area and native feel
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    :root {
      --sat: env(safe-area-inset-top);
      --sar: env(safe-area-inset-right);
      --sab: env(safe-area-inset-bottom);
      --sal: env(safe-area-inset-left);
    }
    
    html {
      height: 100%;
      height: 100dvh;
      overflow: hidden;
    }
    
    body {
      margin: 0;
      padding: 0;
      height: 100%;
      height: 100dvh;
      overflow: hidden;
      overscroll-behavior: none;
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
      position: fixed;
      width: 100%;
      top: 0;
      left: 0;
    }
    
    #root {
      height: 100%;
      height: 100dvh;
      overflow: auto;
      overscroll-behavior: none;
      -webkit-overflow-scrolling: touch;
    }
    
    * {
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
    }
    
    input, textarea, button, select {
      -webkit-user-select: auto;
      user-select: auto;
    }
    
    /* Smooth scrolling for iOS */
    * {
      -webkit-overflow-scrolling: touch;
    }
    
    /* Remove app loading skeleton after React hydration */
    .app-loading {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

// --- Configurable Thresholds for Gear Logic ---
const TIGHTS_TEMP_THRESHOLD = 48; // Below this adjT, add tights
const SHORTS_TEMP_THRESHOLD = 60; // Above this adjT, add shorts
const INSULATED_JACKET_TEMP_THRESHOLD = 15; // Above this T, switch to light jacket
const RAIN_PROB_THRESHOLD = 50; // Precipitation probability (%) to add rain shell
const RAIN_IN_THRESHOLD = 0.05; // Precipitation inches to add rain shell
const WIND_BREAKER_THRESHOLD = 15; // Wind speed (mph) to add windbreaker
const UV_INDEX_CAP_THRESHOLD = 6; // UV index to add cap/sunglasses/sunscreen
const HUMIDITY_ANTI_CHAFE_THRESHOLD = 80; // Humidity (%) to add anti-chafe
const TEMP_ANTI_CHAFE_THRESHOLD = 65; // Temperature (F) to add anti-chafe
const SOCKS_LIGHT_TEMP_THRESHOLD = 70; // Above this temp, use light socks
const SOCKS_HUMIDITY_THRESHOLD = 70; // Humidity (%) for light socks

const LIGHT_GLOVES_TEMP_THRESHOLD = 55; // Below this adjT, add light gloves
const MEDIUM_GLOVES_TEMP_THRESHOLD = 45; // Below this adjT, upgrade to medium gloves
const MITTENS_TEMP_THRESHOLD = 30; // Below this adjT, switch to mittens
const MITTENS_LINER_TEMP_THRESHOLD = 15; // Below this adjT, add liner under mittens
const WIND_GLOVES_THRESHOLD = 8; // Wind speed (mph) to add gloves
const WIND_MEDIUM_GLOVES_THRESHOLD = 12; // Wind speed (mph) to upgrade to medium gloves
const WIND_MITTENS_THRESHOLD = 15; // Wind speed (mph) to switch to mittens

// Cold hands preference: use warmer thresholds (trigger protection earlier)
const COLD_HANDS_LIGHT_GLOVES_THRESHOLD = 60; // Cold hands: add light gloves below this
const COLD_HANDS_MEDIUM_GLOVES_THRESHOLD = 42; // Cold hands: upgrade to medium gloves
const COLD_HANDS_MITTENS_THRESHOLD = 30; // Cold hands: switch to mittens
const COLD_HANDS_MITTENS_LINER_THRESHOLD = 18; // Cold hands: add liner
const COLD_HANDS_WIND_GLOVES_THRESHOLD = 5; // Cold hands: add gloves at lower wind speed
const COLD_HANDS_WIND_MEDIUM_THRESHOLD = 8; // Cold hands: upgrade at lower wind
const COLD_HANDS_WIND_MITTENS_THRESHOLD = 12; // Cold hands: mittens at lower wind

// --- Scoring Temperature Thresholds ---
// These control when temperature penalties reach their maximum (99 points)
export const HEAT_PENALTY_MAX_TEMP = 90; // Temperature (°F) where heat penalty reaches maximum (99 points) - WBGT cutoff
export const COLD_PENALTY_MAX_MULTIPLIER = 28; // Max penalty for cold (lower = more forgiving, max = 99)
export const COLD_PENALTY_WIDTH_WORKOUT = 22; // Temperature range for cold penalty (workouts)
export const COLD_PENALTY_WIDTH_EASY = 20; // Temperature range for cold penalty (easy/long runs)

// --- Ideal Running Temperatures ---
export const IDEAL_TEMP_WORKOUT = 43; // Ideal temperature for workouts (°F)
export const IDEAL_TEMP_LONG_RUN = 48; // Ideal temperature for long runs (°F)
export const IDEAL_TEMP_EASY = 50; // Ideal temperature for easy runs (°F)

// --- Synergy Penalty Thresholds ---
const HEAT_SYNERGY_TEMP_THRESHOLD = 100; // Temperature (°F) where heat synergy penalty starts

// --- Dew Point Penalty Thresholds ---
// Dew point measures humidity's effect on perceived temperature and sweat evaporation
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

// --- High Humidity Penalty (App.jsx only) ---
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

// --- Synergy Penalty Values ---
export const COLD_SYNERGY_TEMP = 35; // Temperature (°F) where cold synergy starts
export const COLD_SYNERGY_WIND_THRESHOLD = 10; // Wind speed (mph) where cold synergy increases
export const COLD_SYNERGY_MULTIPLIER = 0.3; // Base multiplier for cold synergy
export const COLD_SYNERGY_WIND_MULTIPLIER = 0.6; // Additional multiplier when windy

export const HEAT_SYNERGY_DP_THRESHOLD = 70; // Dew point (°F) where heat synergy starts
export const HEAT_SYNERGY_DP_MULTIPLIER = 0.6; // Multiplier for dew point heat synergy
export const HEAT_SYNERGY_TEMP_DIVISOR = 5; // Temperature divisor for heat synergy calculation
export const HEAT_SYNERGY_MAX_MULTIPLIER = 20; // Max multiplier for heat synergy

// --- Comfort/score model ---
function dewPointF(tempF, rh) {
  const tempC = (tempF - 32) * (5 / 9);
  const a = 17.62, b = 243.12;
  const gamma = Math.log(Math.max(1e-6, rh) / 100) + (a * tempC) / (b + tempC);
  const dpC = (b * gamma) / (a - gamma);
  return (dpC * 9) / 5 + 32;
}

function computeRunningScore({ tempF, apparentF, humidity, windMph, precipProb, precipIn, uvIndex, pressure, solarRadiation, cloudCover }, workout, longRun) {
  // Calculate a running score (0-100) based on weather conditions
  // Higher score = better running conditions, lower score = worse conditions
  // Score starts at 100 and subtracts penalties for various weather factors

  // Step 1: Determine ideal temperature based on run type
  // Workouts need cooler temps to prevent heat buildup during high effort
  // Long runs need moderate temps to avoid temperature swings over time
  // Easy runs are most flexible with temps around 50°F
  const ideal = workout ? IDEAL_TEMP_WORKOUT : longRun ? IDEAL_TEMP_LONG_RUN : IDEAL_TEMP_EASY;

  // Step 2: Set temperature penalty curve width based on run type
  // Workouts have narrower cold tolerance (more sensitive to cold starts)
  // Easy/long runs have wider cold tolerance (can warm up during run)
  const coolWidth = workout ? COLD_PENALTY_WIDTH_WORKOUT : COLD_PENALTY_WIDTH_EASY;

  // Step 3: Calculate dew point (humidity's effect on perceived temperature)
  const dpF = dewPointF(tempF, humidity);

  // Step 3.5: For warm weather (>60°F), use WBGT instead of apparent temperature
  // WBGT accounts for humidity, sun, and wind in a scientifically validated way
  const wbgtF = apparentF > 60 ? calculateWBGT({ 
    tempF, 
    humidity, 
    windMph, 
    pressureHPa: pressure, 
    solarRadiationWm2: solarRadiation, 
    cloudCover: cloudCover ?? 50 
  }) : null;
  
  // Use WBGT for warm weather, apparent temp for cool/cold weather
  const effectiveTemp = wbgtF !== null ? wbgtF : apparentF;

  // Step 4: Calculate temperature penalty using asymmetric curves
  // Warmer than ideal: exponential penalty (heat builds up fast)
  // Cooler than ideal: quadratic penalty (cold is more tolerable, can warm up)
  const diff = effectiveTemp - ideal;
  const warmSpan = Math.max(5, HEAT_PENALTY_MAX_TEMP - ideal); // Heat penalty range (ideal to max temp)
  const tempPenalty = diff >= 0
    ? Math.pow(clamp(diff / warmSpan, 0, 1), 1.6) * 99  // Heat: exponential curve, max 99 penalty
    : Math.pow(Math.abs(diff) / coolWidth, 2) * COLD_PENALTY_MAX_MULTIPLIER;       // Cold: quadratic curve

  // Step 5: Calculate humidity penalty based on dew point thresholds
  // Higher dew point = more moisture in air = harder to cool via sweat
  let dewpointPenalty;
  if (dpF < DEW_POINT_COMFORTABLE) dewpointPenalty = DEW_POINT_PENALTY_COMFORTABLE;
  else if (dpF < DEW_POINT_SLIGHTLY_MUGGY) dewpointPenalty = DEW_POINT_PENALTY_SLIGHTLY_MUGGY;
  else if (dpF < DEW_POINT_MODERATE) dewpointPenalty = DEW_POINT_PENALTY_MODERATE;
  else if (dpF < DEW_POINT_MUGGY) dewpointPenalty = DEW_POINT_PENALTY_MUGGY;
  else if (dpF < DEW_POINT_VERY_HUMID) dewpointPenalty = DEW_POINT_PENALTY_VERY_HUMID;
  else if (dpF < DEW_POINT_OPPRESSIVE) dewpointPenalty = DEW_POINT_PENALTY_OPPRESSIVE;
  else dewpointPenalty = DEW_POINT_PENALTY_DANGEROUS;

  // Step 6: Calculate humidity penalty (additional factor when hot + humid)
  // Only applies when both hot AND humid (compounding effect)
  const humidityPenalty = humidity > HUMIDITY_THRESHOLD && apparentF > HUMIDITY_TEMP_THRESHOLD ? Math.pow((humidity - HUMIDITY_THRESHOLD) / 20, 2) * HUMIDITY_PENALTY_MAX : 0;

  // Step 7: Calculate wind penalty (context-dependent)
  // Wind can help (cooling in heat) or hurt (resistance + wind chill in cold)
  const windPenalty = Math.pow(Math.max(0, windMph - WIND_PENALTY_OFFSET) / WIND_PENALTY_BASE_DIVISOR, 2) * WIND_PENALTY_MAX;

  // Step 8: Calculate precipitation penalty
  // Based on probability + amount, with extra penalty for ice danger
  const precipPenalty = Math.min(Math.max((precipProb / 100) * PRECIP_PROB_PENALTY_MAX, 0), PRECIP_PROB_PENALTY_MAX) + Math.min(Math.max(precipIn * PRECIP_AMOUNT_MULTIPLIER, 0), PRECIP_AMOUNT_PENALTY_MAX) + (apparentF <= ICE_DANGER_TEMP && precipIn > 0 ? ICE_DANGER_PENALTY : 0);

  // Step 9: Calculate UV penalty (sun exposure risk)
  // Higher for workouts (heat + sun = double trouble) and long runs (more exposure time)
  let uvPenalty = Math.min(Math.max(Math.max(0, uvIndex - UV_BASE_THRESHOLD) * UV_PENALTY_MULTIPLIER, 0), UV_PENALTY_MAX);
  if (workout && apparentF >= UV_WORKOUT_HEAT_TEMP) uvPenalty += UV_WORKOUT_HEAT_PENALTY;
  if (longRun) {
    uvPenalty = Math.min(Math.max(Math.max(0, uvIndex - UV_LONGRUN_THRESHOLD) * UV_LONGRUN_MULTIPLIER, 0), UV_LONGRUN_MAX); // Long runs more UV sensitive
    if (apparentF >= UV_WORKOUT_HEAT_TEMP) uvPenalty += UV_LONGRUN_HEAT_PENALTY; // Extra heat buildup over time
  }

  // Step 10: Calculate synergy penalties (compounding weather effects)
  // Cold synergy: wind + cold = dangerous wind chill
  // Heat synergy: humidity + heat = heat illness risk
  const synergyCold = apparentF < COLD_SYNERGY_TEMP ? (COLD_SYNERGY_TEMP - apparentF) * COLD_SYNERGY_MULTIPLIER * (windMph > COLD_SYNERGY_WIND_THRESHOLD ? COLD_SYNERGY_WIND_MULTIPLIER : 0) : 0;
  const synergyHeat = (dpF > HEAT_SYNERGY_DP_THRESHOLD ? (dpF - HEAT_SYNERGY_DP_THRESHOLD) * HEAT_SYNERGY_DP_MULTIPLIER : 0) + (apparentF > HEAT_SYNERGY_TEMP_THRESHOLD ? Math.pow((apparentF - HEAT_SYNERGY_TEMP_THRESHOLD) / HEAT_SYNERGY_TEMP_DIVISOR, 2) * HEAT_SYNERGY_MAX_MULTIPLIER : 0);

  // Step 11: Sum all penalties and ensure bounds (0-99)
  let penalties = tempPenalty + dewpointPenalty + humidityPenalty + windPenalty + precipPenalty + uvPenalty + synergyCold + synergyHeat;
  return Math.min(Math.max(Math.round(100 - Math.min(Math.max(penalties, 0), 99)), 0), 100);
}

// --- Tiny UI for the insights panel ---
const ProgressBar = ({ pct }) => (
  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
    <div className="h-2 rounded-full bg-pink-500" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
  </div>
);

/*
  RunFit Wardrobe — Single-file React (App.jsx)
  CHANGELOG:
  - Gender toggle (Female/Male) added for more personalized gear recommendations.
  - UI layout cleaned up into a more intuitive multi-column dashboard.
  - "Need-to-know" card moved next to the visual figure for better context.
  - Outfit algorithm refined for clarity and gender-specific logic.
  - Defaults to °F, Kansas City, MO, and "Female" profile.
*/

// Extract raw weather values from MET.no API response
function extractMetNoRawData(first) {
  const details = first.data.instant.details;
  const next1h = first.data.next_1_hours?.details;
  const next6h = first.data.next_6_hours?.details;

  const tempC = typeof details.air_temperature === 'number' ? details.air_temperature : null;
  const humidity = typeof details.relative_humidity === 'number' ? details.relative_humidity : null;
  const windMs = typeof details.wind_speed === 'number' ? details.wind_speed : null;
  const cloud = typeof details.cloud_area_fraction === 'number' ? details.cloud_area_fraction : null;
  
  const precipMm =
    typeof next1h?.precipitation_amount === 'number'
      ? next1h.precipitation_amount
      : typeof next6h?.precipitation_amount === 'number'
      ? next6h.precipitation_amount / 6
      : null;
  
  const precipProb =
    typeof next1h?.probability_of_precipitation === 'number'
      ? next1h.probability_of_precipitation
      : typeof next6h?.probability_of_precipitation === 'number'
      ? next6h.probability_of_precipitation
      : null;

  return { tempC, humidity, windMs, cloud, precipMm, precipProb, details };
}

// Convert raw weather data to user's preferred units
function convertWeatherUnits(raw, unit) {
  const { tempC, humidity, windMs, cloud, precipMm, precipProb } = raw;
  
  const feels = typeof tempC === 'number' 
    ? computeFeelsLike(tempC, windMs ?? 0, humidity ?? 50) 
    : null;

  const temperature = tempC == null ? undefined : unit === 'F' ? cToF(tempC) : tempC;
  const apparent = feels == null ? temperature : unit === 'F' ? feels.f : feels.c;
  const wind = windMs == null ? undefined : msToMph(windMs);
  const precip = precipMm == null ? undefined : mmToInches(precipMm);

  return {
    provider: 'MET Norway',
    temperature,
    apparent,
    wind,
    humidity,
    precip,
    precipProb,
    uv: undefined,
    cloud,
  };
}

// Log comprehensive weather debug information with derived calculations
function logWeatherDebug(weatherData, raw, location, unit) {
  const { tempC, humidity, windMs, cloud, precipMm, precipProb, details } = raw;
  const { temperature, apparent, wind, precip } = weatherData;

  // Calculate derived metrics for troubleshooting
  const now = new Date();
  const solarElevation = calculateSolarElevation({
    latitude: location.lat,
    longitude: location.lon,
    timestamp: now,
  });
  
  const mrtData = calculateMRT({
    tempF: temperature,
    humidity: humidity || 50,
    solarRadiation: 0, // MET.no doesn't provide this, will be estimated
    solarElevation: solarElevation ?? 0, // Use nullish coalescing to allow negative values
    cloudCover: cloud || 50,
    windMph: wind || 0
  });
  
  const utciData = calculateUTCI({
    tempF: temperature,
    humidity: humidity || 50,
    windMph: wind || 0,
    mrt: mrtData?.mrt || temperature,
    precipRate: precip || 0
  });

  // Debug UTCI inputs (disabled to reduce console noise)
  // console.log('🔍 UTCI INPUTS DEBUG at', new Date().toISOString(), ':', {
  //   tempF: temperature,
  //   humidity: humidity || 50,
  //   windMph: wind || 0,
  //   mrt: mrtData?.mrt || temperature,
  //   precipRate: precip || 0,
  //   mrtData: mrtData,
  //   solarElevation: solarElevation,
  //   cloud: raw.cloud,
  //   solarRadiation: raw.solarRadiation,
  //   timestamp: now
  // });

  // Calculate dew point
  const dewPointC = tempC != null && humidity != null 
    ? tempC - ((100 - humidity) / 5)
    : null;
  const dewPointF = dewPointC != null ? (dewPointC * 9/5) + 32 : null;

  // Wind chill calculation (for temps below 50°F and wind > 3mph)
  const windChillF = temperature != null && temperature < 50 && wind > 3
    ? 35.74 + (0.6215 * temperature) - (35.75 * Math.pow(wind, 0.16)) + (0.4275 * temperature * Math.pow(wind, 0.16))
    : null;

  // Heat index approximation (for temps above 80°F)
  const heatIndexF = temperature != null && humidity != null && temperature > 80
    ? -42.379 + 2.04901523*temperature + 10.14333127*humidity - 0.22475541*temperature*humidity -
      0.00683783*temperature*temperature - 0.05481717*humidity*humidity + 0.00122874*temperature*temperature*humidity +
      0.00085282*temperature*humidity*humidity - 0.00000199*temperature*temperature*humidity*humidity
    : null;

  console.log('========================================');
  console.log('🌤️ WEATHER DEBUG LOG');
  console.log('========================================');
  console.log('📍 Location:', `${location.lat.toFixed(4)}°, ${location.lon.toFixed(4)}°`);
  console.log('⏰ Timestamp:', now.toLocaleString());
  console.log('🌐 API:', 'MET Norway (api.met.no)');
  console.log('');
  
  console.log('🌡️ Temperature:');
  console.log('  • Air Temperature:', temperature?.toFixed(1) ?? 'N/A', unit === 'F' ? '°F' : '°C');
  console.log('  • Apparent/Feels:', apparent?.toFixed(1) ?? 'N/A', unit === 'F' ? '°F' : '°C');
  console.log('  • Dew Point:', dewPointF?.toFixed(1) ?? 'N/A', '°F');
  console.log('  • Raw (°C):', tempC?.toFixed(2) ?? 'N/A');
  if (windChillF) console.log('  • Wind Chill:', windChillF.toFixed(1), '°F');
  if (heatIndexF) console.log('  • Heat Index:', heatIndexF.toFixed(1), '°F');
  console.log('');
  
  console.log('💧 Moisture:');
  console.log('  • Relative Humidity:', humidity != null ? `${humidity.toFixed(1)}%` : 'N/A');
  console.log('  • Precipitation Rate:', precip != null ? `${precip.toFixed(3)} in/hr` : 'N/A');
  console.log('  • Precip Probability:', precipProb != null ? `${precipProb.toFixed(0)}%` : 'N/A');
  console.log('  • Raw Precip (mm/hr):', precipMm != null ? precipMm.toFixed(2) : 'N/A');
  console.log('');
  
  console.log('💨 Wind:');
  console.log('  • Speed:', wind != null ? `${wind.toFixed(1)} mph` : 'N/A');
  console.log('  • Speed (m/s):', windMs != null ? windMs.toFixed(2) : 'N/A');
  console.log('  • Beaufort Scale:', wind != null ? getBeaufortScale(wind) : 'N/A');
  console.log('');
  
  console.log('☁️ Sky Conditions:');
  console.log('  • Cloud Cover:', cloud != null ? `${cloud.toFixed(1)}%` : 'N/A');
  console.log('  • Sky Description:', cloud != null ? getSkyDescription(cloud) : 'N/A');
  console.log('  • UV Index:', weatherData.uv ?? 'N/A (not provided by MET.no)');
  console.log('');
  
  console.log('☀️ Solar & Radiation:');
  console.log('  • Solar Elevation:', solarElevation != null ? `${solarElevation.toFixed(2)}°` : 'N/A');
  console.log('  • Sun Status:', solarElevation > 0 ? '☀️ Above Horizon' : '🌙 Below Horizon');
  console.log('  • Est. Solar Radiation:', mrtData?.solarRadiation?.toFixed(0) ?? 'N/A', 'W/m²');
  console.log('');
  
  console.log('🌡️ Thermal Comfort Indices:');
  console.log('  • MRT (Mean Radiant Temp):', mrtData?.mrt?.toFixed(1) ?? 'N/A', '°F');
  console.log('  • MRT Enhancement:', mrtData?.enhancement?.toFixed(1) ?? 'N/A', '°F');
  console.log('  • MRT Category:', mrtData ? getMRTCategory(mrtData.mrt, temperature) : 'N/A');
  if (mrtData?.components) {
    console.log('  • MRT Components:');
    console.log('    - Longwave Down:', mrtData.components.longwaveDown?.toFixed(1), 'W/m²');
    console.log('    - Longwave Up:', mrtData.components.longwaveUp?.toFixed(1), 'W/m²');
    console.log('    - Solar Direct:', mrtData.components.solarDirect?.toFixed(1), 'W/m²');
    console.log('    - Solar Diffuse:', mrtData.components.solarDiffuse?.toFixed(1), 'W/m²');
    console.log('    - Projected Area:', mrtData.components.projectedAreaFactor?.toFixed(3));
  }
  console.log('  • UTCI:', utciData?.utci?.toFixed(1) ?? 'N/A', '°F');
  console.log('  • UTCI Stress Level:', utciData ? getUTCICategory(utciData.utci) : 'N/A');
  console.log('  • UTCI Adjustment:', utciData?.adjustment?.toFixed(1) ?? 'N/A', '°F');
  console.log('');
  
  console.log('📊 Raw MET.no API Values:');
  console.log('  • air_temperature:', details.air_temperature, '°C');
  console.log('  • relative_humidity:', details.relative_humidity, '%');
  console.log('  • wind_speed:', details.wind_speed, 'm/s');
  console.log('  • cloud_area_fraction:', details.cloud_area_fraction, '%');
  console.log('  • wind_from_direction:', details.wind_from_direction ?? 'N/A', '°');
  console.log('  • air_pressure_at_sea_level:', details.air_pressure_at_sea_level ?? 'N/A', 'hPa');
  console.log('');
  
  console.log('🔍 Data Quality:');
  console.log('  • Temperature Valid:', temperature != null && !isNaN(temperature));
  console.log('  • Humidity Valid:', humidity != null && humidity >= 0 && humidity <= 100);
  console.log('  • Wind Valid:', wind != null && wind >= 0);
  console.log('  • Cloud Valid:', cloud != null && cloud >= 0 && cloud <= 100);
  console.log('  • All Core Data Present:', [temperature, humidity, wind, cloud].every(v => v != null));
  console.log('========================================');
}

// Helper: Get Beaufort wind scale description
function getBeaufortScale(mph) {
  if (mph < 1) return '0 - Calm';
  if (mph < 4) return '1 - Light Air';
  if (mph < 8) return '2 - Light Breeze';
  if (mph < 13) return '3 - Gentle Breeze';
  if (mph < 19) return '4 - Moderate Breeze';
  if (mph < 25) return '5 - Fresh Breeze';
  if (mph < 32) return '6 - Strong Breeze';
  if (mph < 39) return '7 - Near Gale';
  if (mph < 47) return '8 - Gale';
  if (mph < 55) return '9 - Strong Gale';
  if (mph < 64) return '10 - Storm';
  if (mph < 73) return '11 - Violent Storm';
  return '12 - Hurricane';
}

// Helper: Get sky description from cloud cover percentage
function getSkyDescription(cloudPercent) {
  if (cloudPercent < 10) return 'Clear';
  if (cloudPercent < 30) return 'Mostly Clear';
  if (cloudPercent < 50) return 'Partly Cloudy';
  if (cloudPercent < 70) return 'Mostly Cloudy';
  if (cloudPercent < 90) return 'Cloudy';
  return 'Overcast';
}

// Fetch and process weather data from MET Norway API
async function fetchMetNoWeather(p, unit) {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${p.lat}&lon=${p.lon}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('MET Norway fetch failed');
  
  const data = await res.json();
  const first = data?.properties?.timeseries?.[0];
  if (!first?.data?.instant?.details) throw new Error('MET Norway missing data');

  const raw = extractMetNoRawData(first);
  const weatherData = convertWeatherUnits(raw, unit);
  logWeatherDebug(weatherData, raw, p, unit);

  return weatherData;
}


// --- Hands/Socks Helpers ---
function handsLabel(level) { return ["None", "Light gloves", "Medium gloves", "Mittens", "Mittens + liner"][level] || "None"; }
function handsTone(level) {
  return [
    "bg-emerald-100 text-emerald-700 border-emerald-200",
    "bg-sky-100 text-sky-700 border-sky-200",
    "bg-amber-100 text-amber-800 border-amber-200",
    "bg-orange-100 text-orange-800 border-orange-200",
    "bg-rose-100 text-rose-800 border-rose-200"
  ][level] || "bg-gray-100 text-gray-800 border-gray-200";
}

// Load settings from localStorage
function loadSettings() {
  try {
    const savedVersion = localStorage.getItem('runGearVersion');
    const saved = localStorage.getItem('runGearSettings');
    
    // If version mismatch, force complete reset to ensure new settings
    if (savedVersion !== APP_VERSION) {
      console.log('App updated to v' + APP_VERSION + ' - resetting to defaults with user preferences');
      localStorage.setItem('runGearVersion', APP_VERSION);
      
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Only keep core user preferences, force new features to default enabled
          const merged = {
            ...DEFAULT_SETTINGS,
            // Preserve user's location and preferences
            place: parsed.place || DEFAULT_SETTINGS.place,
            query: parsed.query || DEFAULT_SETTINGS.query,
            unit: parsed.unit || DEFAULT_SETTINGS.unit,
            coldHands: parsed.coldHands ?? DEFAULT_SETTINGS.coldHands,
            gender: parsed.gender || DEFAULT_SETTINGS.gender,
            theme: parsed.theme || DEFAULT_SETTINGS.theme,
            tempSensitivity: parsed.tempSensitivity ?? DEFAULT_SETTINGS.tempSensitivity,
            runnerBoldness: parsed.runnerBoldness ?? DEFAULT_SETTINGS.runnerBoldness,
            runHoursStart: parsed.runHoursStart ?? DEFAULT_SETTINGS.runHoursStart,
            runHoursEnd: parsed.runHoursEnd ?? DEFAULT_SETTINGS.runHoursEnd,
            // Force new settings to defaults (don't preserve old values)
            showTomorrowOutfit: DEFAULT_SETTINGS.showTomorrowOutfit,
            tomorrowRunHour: DEFAULT_SETTINGS.tomorrowRunHour,
            tomorrowRunType: DEFAULT_SETTINGS.tomorrowRunType,
            smartNightCard: DEFAULT_SETTINGS.smartNightCard,
          };
          // Immediately save the merged result
          localStorage.setItem('runGearSettings', JSON.stringify(merged));
          return merged;
        } catch (parseError) {
          console.warn('Could not parse saved settings, using defaults');
        }
      }
      return DEFAULT_SETTINGS;
    }
    
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

// Save settings to localStorage
function saveSettings(settings) {
  try {
    localStorage.setItem('runGearSettings', JSON.stringify(settings));
    localStorage.setItem('runGearVersion', APP_VERSION);
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}

export default function App() {
  const initialSettings = loadSettings();
  const [place, setPlace] = useState(initialSettings.place);
  const [query, setQuery] = useState(initialSettings.query);
  const [unit, setUnit] = useState(initialSettings.unit);
  const [runType, setRunType] = useState("easy"); // Always reset to easy on page load
  const [coldHands, setColdHands] = useState(initialSettings.coldHands);
  const [gender, setGender] = useState(initialSettings.gender);
  const [loading, setLoading] = useState(true); // Start with loading true for initial load
  const [initializing, setInitializing] = useState(true); // Keep splash until first full load completes
  const [error, setError] = useState("");
  const [wx, setWx] = useState(null);
  const [customTempEnabled, setCustomTempEnabled] = useState(initialSettings.customTempEnabled);
  const [customTempInput, setCustomTempInput] = useState(initialSettings.customTempInput);
  const [activeOption, setActiveOption] = useState(initialSettings.activeOption);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedOutfitItem, setSelectedOutfitItem] = useState(null);
  const [showInsights, setShowInsights] = useState(false);
  const [showHourBreakdown, setShowHourBreakdown] = useState(false);
  const [selectedHourData, setSelectedHourData] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [showGearGuide, setShowGearGuide] = useState(false);
  const [selectedGearItem, setSelectedGearItem] = useState(null);
  const [theme, setTheme] = useState(initialSettings.theme);
  const [twilightTerms, setTwilightTerms] = useState(initialSettings.twilightTerms);
  const [tempSensitivity, setTempSensitivity] = useState(initialSettings.tempSensitivity);
  const [runnerBoldness, setRunnerBoldness] = useState(initialSettings.runnerBoldness);
  const [runHoursStart, setRunHoursStart] = useState(initialSettings.runHoursStart);
  const [runHoursEnd, setRunHoursEnd] = useState(initialSettings.runHoursEnd);
  const [showTomorrowOutfit, setShowTomorrowOutfit] = useState(initialSettings.showTomorrowOutfit);
  const [tomorrowRunHour, setTomorrowRunHour] = useState(initialSettings.tomorrowRunHour);
  const [tomorrowRunType, setTomorrowRunType] = useState(initialSettings.tomorrowRunType);
  const [smartNightCard, setSmartNightCard] = useState(initialSettings.smartNightCard ?? true);
  const [tomorrowCardRunType, setTomorrowCardRunType] = useState(initialSettings.tomorrowRunType);
  const [tomorrowCardOption, setTomorrowCardOption] = useState('A'); // 'A' = Performance, 'B' = Comfort, 'C' = A.I.
  const [lastUpdated, setLastUpdated] = useState(null);
  const [debugActive, setDebugActive] = useState(false);
  const [debugInputs, setDebugInputs] = useState({
    apparent: undefined,
    temp: undefined,
    wind: undefined,
    humidity: undefined,
    precipProb: undefined,
    precipIn: undefined,
    uvIndex: undefined,
    cloudCover: undefined,
    pressure: undefined,
    solarRadiation: undefined,
    isDay: true,
    debugTimeHour: undefined,
  });
  const [showRefreshToast, setShowRefreshToast] = useState(false);

  // Calculate displayed score based on runner boldness (only affects display, not gear recommendations)
  const getDisplayedScore = useCallback((actualScore, boldness) => {
    if (boldness === 0 || !actualScore) return actualScore;
    
    // Boldness adjusts how the score FEELS to the runner using percentage scaling
    // -2 (cautious): Score × 0.50 (perceives as 50% worse, e.g., 50 → 25, 100 → 50)
    // -1 (careful): Score × 0.75 (25% worse, e.g., 50 → 38, 100 → 75)
    //  0 (standard): Score × 1.0 (unchanged)
    // +1 (bold): Score × 1.25 (25% better, e.g., 50 → 63, 80 → 100)
    // +2 (badass): Score × 1.50 (50% better, e.g., 50 → 75, 67 → 100)
    
    const multiplier = 1 + (boldness * 0.10); // DONT NOT CHANGE THIS LINE, IT IS CORRECT
    let displayScore = actualScore * multiplier;
    
    // Keep displayed score in full bounds (1-100)

    displayScore = Math.max(1, Math.min(100, displayScore));
    
    return Math.round(displayScore);
  }, []);

  // Tap-to-refresh handler
  const handleLocationRefresh = async () => {
    if (loading) return;
    
    setLoading(true);
    setError("");
    
    try {
      // Check if geolocation is available
      if (!("geolocation" in navigator) || !window.isSecureContext) {
      // Fallback: just refresh current place
      await fetchWeather(place, unit);
      setShowRefreshToast(true);
      setTimeout(() => setShowRefreshToast(false), 2000);
      setLoading(false);
      return;
    }

    // Get current position
    const pos = await new Promise((resolve, reject) => 
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
    );
    const { latitude, longitude } = pos.coords;
    
    // Set temporary location and fetch weather immediately
    const p = { name: "Current location", lat: latitude, lon: longitude, source: 'gps' };
    setPlace(p); 
    setQuery("Current location");
    await fetchWeather(p, unit); // Await here to ensure loading is correct
    
    // Get better name in background
    reverseGeocode(latitude, longitude);
    
    setShowRefreshToast(true);
    setTimeout(() => setShowRefreshToast(false), 2000);
  } catch (err) {
    console.error("Geolocation error:", err);
    // Fallback: just refresh current place
    await fetchWeather(place, unit);
    setShowRefreshToast(true);
    setTimeout(() => setShowRefreshToast(false), 2000);
  } finally {
    setLoading(false);
  }
};  // Save settings to localStorage whenever they change
  useEffect(() => {
    const settings = {
      place,
      query,
      unit,
      coldHands,
      gender,
      customTempEnabled,
      customTempInput,
      activeOption,
      theme,
      twilightTerms,
      tempSensitivity,
      runnerBoldness,
      runHoursStart,
      runHoursEnd,
      showTomorrowOutfit,
      tomorrowRunHour,
      tomorrowRunType,
      smartNightCard
    };
    saveSettings(settings);
  }, [place, query, unit, coldHands, gender, customTempEnabled, customTempInput, activeOption, theme, twilightTerms, tempSensitivity, runnerBoldness, runHoursStart, runHoursEnd, showTomorrowOutfit, tomorrowRunHour, tomorrowRunType, smartNightCard]);

  useEffect(() => {
    if (showDebug) {
      setDebugInputs({
        apparent: wx?.apparent != null ? String(wx.apparent) : "",
        temp: wx?.temperature != null ? String(wx.temperature) : "",
        wind: wx?.wind != null ? String(wx.wind) : "",
        humidity: wx?.humidity != null ? String(wx.humidity) : "",
        precipProb: wx?.precipProb != null ? String(wx.precipProb) : "",
        precipIn: wx?.precip != null ? String(wx.precip) : "",
        debugTimeHour: "",
        uvIndex: wx?.uv != null ? String(wx.uv) : "",
        cloudCover: wx?.cloud != null ? String(wx.cloud) : "",
        isDay: wx?.isDay ?? true,
      });
    }
  }, [showDebug, wx]);

  // Reset to default settings
  const resetToDefaults = () => {
    setPlace(DEFAULT_SETTINGS.place);
    setQuery(DEFAULT_SETTINGS.query);
    setUnit(DEFAULT_SETTINGS.unit);
    setRunType("easy"); // Always reset to easy
    setColdHands(DEFAULT_SETTINGS.coldHands);
    setGender(DEFAULT_SETTINGS.gender);
    setCustomTempEnabled(DEFAULT_SETTINGS.customTempEnabled);
    setCustomTempInput(DEFAULT_SETTINGS.customTempInput);
    setActiveOption(DEFAULT_SETTINGS.activeOption);
    setTheme(DEFAULT_SETTINGS.theme);
    setTwilightTerms(DEFAULT_SETTINGS.twilightTerms);
    setTempSensitivity(DEFAULT_SETTINGS.tempSensitivity);
    setRunnerBoldness(DEFAULT_SETTINGS.runnerBoldness);
    setRunHoursStart(DEFAULT_SETTINGS.runHoursStart);
    setRunHoursEnd(DEFAULT_SETTINGS.runHoursEnd);
    setShowTomorrowOutfit(DEFAULT_SETTINGS.showTomorrowOutfit);
    setTomorrowRunHour(DEFAULT_SETTINGS.tomorrowRunHour);
    setTomorrowRunType(DEFAULT_SETTINGS.tomorrowRunType);
    setSmartNightCard(DEFAULT_SETTINGS.smartNightCard);
    setDebugActive(false);
  };

  const applyDebugScenario = () => {
    const parse = (value, fallback) => {
      if (value === "" || value == null) return fallback;
      const num = parseFloat(value);
      return Number.isFinite(num) ? num : fallback;
    };
    const base = wx || {};
    const temperature = parse(debugInputs.temp, base.temperature ?? base.apparent ?? 55);
    const apparent = parse(debugInputs.apparent, base.apparent ?? temperature);
    const wind = parse(debugInputs.wind, base.wind ?? 5);
    const humidity = clamp(parse(debugInputs.humidity, base.humidity ?? 55), 0, 100);
    const precipProb = clamp(parse(debugInputs.precipProb, base.precipProb ?? 0), 0, 100);
    const precip = Math.max(0, parse(debugInputs.precipIn, base.precip ?? 0));
    const uv = Math.max(0, parse(debugInputs.uvIndex, base.uv ?? 0));
    const cloud = clamp(parse(debugInputs.cloudCover, base.cloud ?? 0), 0, 100);
    const pressure = parse(debugInputs.pressure, base.pressure ?? 1013);
    const solarRadiation = Math.max(0, parse(debugInputs.solarRadiation, base.solarRadiation ?? (isDay ? 200 : 0)));
    const isDay = Boolean(debugInputs.isDay);

    const nextWx = {
      ...base,
      temperature,
      apparent,
      wind,
      humidity,
      precipProb,
      precip,
      uv,
      cloud,
      pressure,
      solarRadiation,
      isDay,
      sources: {
        ...(base.sources || {}),
        debug: {
          label: "Debug scenario",
          appliedAt: new Date().toISOString(),
          values: { temperature, apparent, wind, humidity, precipProb, precip, uv, cloud, pressure, solarRadiation, isDay },
        },
      },
      debugOverride: true,
    };

    if (Array.isArray(base.hourlyForecast) && base.hourlyForecast.length) {
      nextWx.hourlyForecast = base.hourlyForecast.map((hour, idx) =>
        idx === 0
          ? {
              ...hour,
              temperature,
              apparent,
              humidity,
              wind,
              precipProb,
              precip,
              uv,
              cloud,
              pressure,
              solarRadiation,
            }
          : hour
      );
    }

    setWx(nextWx);
    setDebugActive(true);
    setShowDebug(false);
    setLastUpdated(Date.now());
  };

  const clearDebugScenario = async () => {
    setDebugActive(false);
    setShowDebug(false);
    await fetchWeather(place, unit);
  };

  const handleDebugInput = (field) => (event) => {
    const value = event?.target?.value ?? "";
    setDebugInputs((prev) => ({ ...prev, [field]: value }));
  };

  // Handler for when an outfit item is clicked in the OutfitRecommendation or Gear Guide
  // Opens the outfit detail modal (or toggles it closed if already selected)
  const handleOutfitItemClick = useCallback((itemKey) => {
    if (!itemKey) return;
    setSelectedOutfitItem((prev) => (prev === itemKey ? null : itemKey));
  }, []);

  // Animation Variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  const cardVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
    hover: { scale: 1.02, transition: { duration: 0.2 } },
    tap: { scale: 0.98 }
  };

  const modalVariants = {
    initial: { opacity: 0, scale: 0.9, y: 50 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.9, y: 50, transition: { duration: 0.2 } }
  };

  const backdropVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }
  };

  const listItemVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3 } }
  };

  const staggerContainer = {
    animate: { transition: { staggerChildren: 0.05 } }
  };

  const fetchWeather = async (p = place, u = unit) => {
    setLoading(true); setError("");
    try {
  const tempUnit = u === "F" ? "fahrenheit" : "celsius";
  const primaryUrl = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current_weather=true&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,cloud_cover,uv_index,wind_speed_10m,surface_pressure,shortwave_radiation&daily=sunrise,sunset&temperature_unit=${tempUnit}&windspeed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=3`;

      const [primaryResult, secondaryResult] = await Promise.allSettled([
        fetch(primaryUrl).then((res) => {
          if (!res.ok) throw new Error("Weather fetch failed");
          return res.json();
        }),
        fetchMetNoWeather(p, u),
      ]);

      if (primaryResult.status !== 'fulfilled') throw primaryResult.reason;

      const data = primaryResult.value;
      const idx = getCurrentHourIndex(data?.hourly?.time || []);
      const currentTime = data?.hourly?.time?.[idx];
      const temp = data?.current_weather?.temperature;
      const wind = data?.current_weather?.windspeed;
      const apparent = data?.hourly?.apparent_temperature?.[idx] ?? temp;
      const timezone = typeof data?.timezone === "string" ? data.timezone : undefined;

      const fallbackSunrise = Array.isArray(data?.daily?.sunrise) ? data.daily.sunrise.filter(Boolean) : [];
      const fallbackSunset = Array.isArray(data?.daily?.sunset) ? data.daily.sunset.filter(Boolean) : [];

      const sunEvents = computeSunEvents({
        timestamp: Date.now(),
        latitude: p.lat,
        longitude: p.lon,
        timeZone: timezone,
      });

      const toIsoList = (arr = []) =>
        arr
          .filter((value) => typeof value === "number" && Number.isFinite(value))
          .map((value) => new Date(value).toISOString());

      const sunriseTimes = sunEvents.sunrise.length ? toIsoList(sunEvents.sunrise) : fallbackSunrise;
      const sunsetTimes = sunEvents.sunset.length ? toIsoList(sunEvents.sunset) : fallbackSunset;
      const dawnTimes = toIsoList(sunEvents.civilDawn);
      const duskTimes = toIsoList(sunEvents.civilDusk);

      const times = data?.hourly?.time || [];
      const hourlyForecast = [];
      for (let offset = 0; offset < 48; offset += 1) { // Extended to 48 hours for tomorrow's outfit
        const hIdx = idx + offset;
        if (!times[hIdx]) break;
        hourlyForecast.push({
          time: times[hIdx],
          temperature: data?.hourly?.temperature_2m?.[hIdx],
          apparent: data?.hourly?.apparent_temperature?.[hIdx] ?? data?.hourly?.temperature_2m?.[hIdx],
          humidity: data?.hourly?.relative_humidity_2m?.[hIdx],
          wind: data?.hourly?.wind_speed_10m?.[hIdx],
          precipProb: data?.hourly?.precipitation_probability?.[hIdx],
          precip: data?.hourly?.precipitation?.[hIdx],
          uv: data?.hourly?.uv_index?.[hIdx],
          cloud: data?.hourly?.cloud_cover?.[hIdx],
          pressure: data?.hourly?.surface_pressure?.[hIdx],
          solarRadiation: data?.hourly?.shortwave_radiation?.[hIdx],
        });
      }

      const primaryWx = {
        provider: 'Open-Meteo',
        temperature: temp,
        apparent,
        wind,
        humidity: data?.hourly?.relative_humidity_2m?.[idx] ?? 50,
        precipProb: data?.hourly?.precipitation_probability?.[idx] ?? 0,
        precip: data?.hourly?.precipitation?.[idx] ?? 0,
        cloud: data?.hourly?.cloud_cover?.[idx] ?? 0,
        uv: data?.hourly?.uv_index?.[idx] ?? 0,
        pressure: data?.hourly?.surface_pressure?.[idx] ?? 1013.25,
        solarRadiation: data?.hourly?.shortwave_radiation?.[idx] ?? 0,
        isDay: data?.current_weather?.is_day === 1,
        sunriseTimes,
        sunsetTimes,
        dawnTimes,
        duskTimes,
        timezone,
        hourlyForecast,
      };

      let combined = { ...primaryWx };
      const sources = { primary: primaryWx };

      if (secondaryResult.status === 'fulfilled') {
        const secondaryWx = secondaryResult.value;
        sources.secondary = secondaryWx;
        combined = {
          ...blendWeather(primaryWx, secondaryWx),
          isDay: primaryWx.isDay,
          sunriseTimes,
          sunsetTimes,
          dawnTimes,
          duskTimes,
          timezone,
        };
      } else if (secondaryResult.status === 'rejected') {
        console.warn('Secondary weather source unavailable', secondaryResult.reason);
      }

      combined.hourlyForecast = hourlyForecast;
  const { provider: _ignoredProvider, ...finalWx } = combined;
  setWx({ ...finalWx, sources });
  setDebugActive(false);
  setLastUpdated(Date.now());
    } catch (e) {
      console.error(e);
      setError("Couldn't load weather. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (lat, lon) => {
    // Note: This function is called without awaiting its result in some cases.
    // It should update the state itself when the name is found.
    try {
      const params = new URLSearchParams({ format: "jsonv2", lat: String(lat), lon: String(lon) });
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
        headers: nominatimHeaders(),
      });
      if (!res.ok) throw new Error("Nominatim reverse geocode failed");
      const data = await res.json();
      const addr = data?.address;
      const locality = addr?.city || addr?.town || addr?.village || addr?.hamlet || addr?.municipality || addr?.suburb;
      const region = addr?.state || addr?.state_district || addr?.county;
      const fallback = typeof data?.display_name === "string" ? data.display_name.split(",")[0] : "";
      const name = [locality || fallback, region].filter(Boolean).join(", ") || fallback;
      if (name) {
        setPlace((p) => ({ ...p, name }));
        setQuery(name);
      }
    } catch (e) {
      console.warn('Reverse geocode failed', e);
    }
  };

  const ipLocationFallback = async (returnPlace = false) => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      const d = await res.json();
      if (!d?.latitude) throw new Error("IP API failed");
      const nameGuess = d.city && d.region ? `${d.city}, ${d.region}` : "Approximate location";
      const p = { name: nameGuess, lat: d.latitude, lon: d.longitude, source: 'ip' };
      setPlace(p); setQuery(p.name);
      setError("Using approximate location. For GPS, enable location permissions.");
      if (returnPlace) return p; // Return the place object if requested
      else await fetchWeather(p, unit);
    } catch (e) {
      setError("Couldn't get your location. Please search a city.");
      if (returnPlace) return DEFAULT_PLACE; // Return default place on error
      else await fetchWeather(DEFAULT_PLACE, unit);
    }
  };

  const tryGeolocate = async (initialLoad = false) => {
    setError("");
    let fetchedPlace = null;
    try {
      if (!("geolocation" in navigator) || !window.isSecureContext) { 
        fetchedPlace = await ipLocationFallback(true); // true to return place
      } else {
        const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }));
        const { latitude, longitude } = pos.coords;
        
        const p = { name: "Current location", lat: latitude, lon: longitude, source: 'gps' };
        setPlace(p); 
        setQuery("Current location");
        fetchedPlace = p;

        // Try to get a better name without blocking the UI
        reverseGeocode(latitude, longitude);
      }
    } catch (err) { 
      console.warn("Geolocation attempt failed, falling back to IP or default.", err);
      fetchedPlace = await ipLocationFallback(true);
    } finally {
      if (fetchedPlace) {
        await fetchWeather(fetchedPlace, unit);
      } else {
        // Fallback to default place if all geolocation attempts fail
        await fetchWeather(DEFAULT_PLACE, unit);
      }
      if (initialLoad) {
        setInitializing(false);
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      setInitializing(true);
      setLoading(true);
      try {
        await tryGeolocate(true);
      } catch (e) {
        console.warn('Initial geolocation failed', e);
      } finally {
        setInitializing(false);
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  const searchCity = async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "1", addressdetails: "1" });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: nominatimHeaders(),
      });
      const results = await res.json();
      const hit = Array.isArray(results) ? results[0] : null;
      if (!hit) throw new Error("No results");
  const addr = hit.address || {};
  const displayLocality = typeof hit.display_name === "string" ? hit.display_name.split(",")[0] : undefined;
  const locality = addr.city || addr.town || addr.village || addr.hamlet || addr.municipality || addr.suburb || displayLocality;
      const region = addr.state || addr.state_district || addr.county;
      const name = [locality, region].filter(Boolean).join(", ") || hit.display_name || query;
      const lat = parseFloat(hit.lat);
      const lon = parseFloat(hit.lon);
      if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error("Invalid coordinates");
      const p = { name, lat, lon, source: 'manual' };
      setPlace(p); fetchWeather(p, unit);
    } catch (e) { setError("Couldn't find that place."); } finally { setLoading(false); }
  };

  const derived = useMemo(() => {
  // console.log('🔥 DERIVED USEMEMO RUNNING at', new Date().toISOString());
  if (!wx) return null;
  
  // Derive workout and longRun from runType for backward compatibility
  const workout = runType === 'workout';
  const longRun = runType === 'longRun';
  
  const toF = (v) => (unit === "F" ? v : (v * 9) / 5 + 32);
  const apparentFWx = toF(wx.apparent);
  const tempFWx = toF(wx.temperature);
  const tempDisplay = Number.isFinite(tempFWx)
    ? (unit === "F" ? tempFWx : ((tempFWx - 32) * 5) / 9)
    : null;

  const manualOn = customTempEnabled && customTempInput !== "" && !Number.isNaN(parseFloat(customTempInput));
  const manualValF = manualOn ? toF(parseFloat(customTempInput)) : null;
  const usedApparentF = manualValF ?? apparentFWx;

  const baselineForWorkout = workout
    ? outfitFor(
        { apparentF: usedApparentF, humidity: wx.humidity, windMph: wx.wind, precipProb: wx.precipProb, precipIn: wx.precip, uvIndex: wx.uv, isDay: wx.isDay },
        false,
        coldHands,
        gender,
        false,
        wx.hourlyForecast || [],
        tempSensitivity
      )
    : null;

  const baselineForLongRun = longRun
    ? outfitFor(
        { apparentF: usedApparentF, humidity: wx.humidity, windMph: wx.wind, precipProb: wx.precipProb, precipIn: wx.precip, uvIndex: wx.uv, isDay: wx.isDay },
        false,
        coldHands,
        gender,
        false,
        wx.hourlyForecast || [],
        tempSensitivity
      )
    : null;

  const recs = outfitFor(
    { apparentF: usedApparentF, humidity: wx.humidity, windMph: wx.wind, precipProb: wx.precipProb, precipIn: wx.precip, uvIndex: wx.uv, isDay: wx.isDay },
    workout,
    coldHands,
    gender,
    longRun,
    wx.hourlyForecast || [],
    tempSensitivity
  );

  if (workout && baselineForWorkout) {
    const baselineKeysA = new Set(baselineForWorkout.optionA.map((item) => item.key));
    const baselineKeysB = new Set(baselineForWorkout.optionB.map((item) => item.key));
    recs.optionA = recs.optionA.map((item) =>
      baselineKeysA.has(item.key) ? item : { ...item, workout: true }
    );
    recs.optionB = recs.optionB.map((item) =>
      baselineKeysB.has(item.key) ? item : { ...item, workout: true }
    );
  }
  
  if (longRun && baselineForLongRun) {
    const baselineKeysA = new Set(baselineForLongRun.optionA.map((item) => item.key));
    const baselineKeysB = new Set(baselineForLongRun.optionB.map((item) => item.key));
    recs.optionA = recs.optionA.map((item) =>
      baselineKeysA.has(item.key) ? item : { ...item, longRun: true }
    );
    recs.optionB = recs.optionB.map((item) =>
      baselineKeysB.has(item.key) ? item : { ...item, longRun: true }
    );
  }

  // NEW: compute detailed score + breakdown
  // For long runs, blend current + next 2-3 hours to account for changing conditions
  let scoreWeatherData = {
    tempF: tempFWx,
    apparentF: usedApparentF,
    humidity: wx.humidity,
    windMph: wx.wind,
    precipProb: wx.precipProb,
    precipIn: wx.precip,
    uvIndex: wx.uv,
    cloudCover: wx.cloud || 50,
    pressure: wx.pressure,
    solarRadiation: wx.solarRadiation,
  };
  
  if (longRun && wx.hourlyForecast && wx.hourlyForecast.length >= 3) {
    // For long runs (90-120+ min), analyze next 2-3 hours
    const futureHours = wx.hourlyForecast.slice(1, 4); // Next 3 hours
    
    // Calculate average conditions over the run duration
    const avgTemp = futureHours.reduce((sum, h) => sum + (toF(h.temperature) || tempFWx), tempFWx) / (futureHours.length + 1);
    const avgApparent = futureHours.reduce((sum, h) => sum + (toF(h.apparent) || usedApparentF), usedApparentF) / (futureHours.length + 1);
    const avgHumidity = futureHours.reduce((sum, h) => sum + (h.humidity || wx.humidity), wx.humidity) / (futureHours.length + 1);
    const avgWind = futureHours.reduce((sum, h) => sum + (h.wind || wx.wind), wx.wind) / (futureHours.length + 1);
    const avgUV = futureHours.reduce((sum, h) => sum + (h.uv || wx.uv), wx.uv) / (futureHours.length + 1);
    const avgCloud = futureHours.reduce((sum, h) => sum + (h.cloud || wx.cloud || 50), wx.cloud || 50) / (futureHours.length + 1);
    const avgPressure = futureHours.reduce((sum, h) => sum + (h.pressure || wx.pressure || 1013), wx.pressure || 1013) / (futureHours.length + 1);
    const avgSolar = futureHours.reduce((sum, h) => sum + (h.solarRadiation || wx.solarRadiation || 0), wx.solarRadiation || 0) / (futureHours.length + 1);
    
    // For precipitation, use maximum probability and total accumulation
    const maxPrecipProb = Math.max(wx.precipProb, ...futureHours.map(h => h.precipProb || 0));
    const totalPrecip = (wx.precip || 0) + futureHours.reduce((sum, h) => sum + (h.precip || 0), 0);
    
    scoreWeatherData = {
      tempF: avgTemp,
      apparentF: avgApparent,
      humidity: avgHumidity,
      windMph: avgWind,
      precipProb: maxPrecipProb,
      precipIn: totalPrecip,
      uvIndex: avgUV,
      cloudCover: avgCloud,
      pressure: avgPressure,
      solarRadiation: avgSolar,
    };
  }

  const displayApparent = Number.isFinite(usedApparentF)
    ? (unit === "F" ? usedApparentF : ((usedApparentF - 32) * 5) / 9)
    : null;
  const dpF = dewPointF(tempFWx, wx.humidity);
  const dewPointDisplay = Number.isFinite(dpF)
    ? (unit === "F" ? dpF : (dpF - 32) * 5 / 9)
    : null;

  const roadConditions = calculateRoadConditions({
    tempF: tempFWx,
    apparentF: usedApparentF,
    precipProb: wx.precipProb,
    precip: wx.precip,
    cloudCover: wx.cloud || 0,
  });

  const parseTimes = (values) =>
    Array.isArray(values)
      ? values
          .map((value) => {
            if (value == null) return null;
            if (typeof value === "number") return Number.isFinite(value) ? value : null;
            const parsed = new Date(value).getTime();
            return Number.isFinite(parsed) ? parsed : null;
          })
          .filter((n) => n != null)
      : [];
  const sunriseMs = parseTimes(wx.sunriseTimes);
  const sunsetMs = parseTimes(wx.sunsetTimes);
  const dawnMs = parseTimes(wx.dawnTimes);
  const duskMs = parseTimes(wx.duskTimes);
  const now = Date.now();
  
  // Enhanced moon phase calculation with accurate illumination
  const calculateMoonPhase = (timestamp) => {
    const date = new Date(timestamp);
    
    // More accurate moon phase calculation
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Convert to Julian date
    let a = Math.floor((14 - month) / 12);
    let y = year + 4800 - a;
    let m = month + 12 * a - 3;
    let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    
    // Days since known new moon (Jan 6, 2000)
    const daysSinceNew = jd - 2451549.5;
    
    // Synodic month (new moon to new moon)
    const synodicMonth = 29.53058867;
    
    // Current phase in cycle (0 = new, 0.5 = full)
    const phase = (daysSinceNew % synodicMonth) / synodicMonth;
    
    // Illumination (0 to 1)
    const illumination = (1 - Math.cos(phase * 2 * Math.PI)) / 2;
    
    // Determine phase name and emoji
    let phaseName, emoji, phaseIndex;
    const isWaxing = phase < 0.5;
    
    if (phase < 0.0625 || phase >= 0.9375) {
      phaseName = "New Moon";
      emoji = "🌑";
      phaseIndex = 0;
    } else if (phase < 0.1875) {
      phaseName = "Waxing Crescent";
      emoji = "🌒";
      phaseIndex = 1;
    } else if (phase < 0.3125) {
      phaseName = "First Quarter";
      emoji = "🌓";
      phaseIndex = 2;
    } else if (phase < 0.4375) {
      phaseName = "Waxing Gibbous";
      emoji = "🌔";
      phaseIndex = 3;
    } else if (phase < 0.5625) {
      phaseName = "Full Moon";
      emoji = "🌕";
      phaseIndex = 4;
    } else if (phase < 0.6875) {
      phaseName = "Waning Gibbous";
      emoji = "🌖";
      phaseIndex = 5;
    } else if (phase < 0.8125) {
      phaseName = "Last Quarter";
      emoji = "🌗";
      phaseIndex = 6;
    } else {
      phaseName = "Waning Crescent";
      emoji = "🌘";
      phaseIndex = 7;
    }
    
    // Calculate days to next full and new moon
    let daysToFull, daysToNew;
    if (phase < 0.5) {
      // Waxing: moving toward full
      daysToFull = Math.round((0.5 - phase) * synodicMonth);
      daysToNew = Math.round((1 - phase) * synodicMonth);
    } else {
      // Waning: moving toward new
      daysToNew = Math.round((1 - phase) * synodicMonth);
      daysToFull = Math.round((0.5 + (1 - phase)) * synodicMonth);
    }
    
    return {
      name: phaseName,
      emoji,
      phase, // 0 to 1
      illumination, // 0 to 1 (accurate light percentage)
      illuminationPct: Math.round(illumination * 100),
      isWaxing,
      daysToFull: Math.max(0, daysToFull),
      daysToNew: Math.max(0, daysToNew),
      phaseIndex
    };
  };
  
  const moonPhase = calculateMoonPhase(now);
  
  // Calculate moon position for visibility check
  const moonPosition = calculateMoonPosition({
    latitude: place.lat,
    longitude: place.lon,
    timestamp: now
  });
  
  const nextSunrise = sunriseMs.find((t) => t > now);
  const nextSunset = sunsetMs.find((t) => t > now);
  const nextDawn = dawnMs.find((t) => t > now);
  const nextDusk = duskMs.find((t) => t > now);

  // Find most recent past events to determine current phase
  const lastSunrise = [...sunriseMs].reverse().find((t) => t <= now);
  const lastSunset = [...sunsetMs].reverse().find((t) => t <= now);
  const lastDawn = [...dawnMs].reverse().find((t) => t <= now);
  const lastDusk = [...duskMs].reverse().find((t) => t <= now);

  let twilight = null;
  const countdownLabel = (ms) => {
    const totalMinutes = Math.max(0, Math.round(ms / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };
  const formatClock = (ts) => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZone: wx.timezone || undefined,
      }).format(new Date(ts));
    } catch (e) {
      return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
  };

  const buildTwilight = (type, timestamp) => {
    const diff = timestamp - now;
    const icon = type === "sunset" || type === "dusk" ? "sunset" : "sunrise";
    const labelMap = {
      sunrise: "Sunrise",
      sunset: "Sunset",
      dawn: "Dawn",
      dusk: "Dusk",
    };
    return {
      type,
      label: labelMap[type] || type,
      in: countdownLabel(diff),
      at: formatClock(timestamp),
      icon,
    };
  };

  // Helper to check if we're within reasonable time (< 6 hours) of an event
  const isReasonablyClose = (timestamp) => {
    return timestamp && (timestamp - now) < 6 * 60 * 60 * 1000;
  };

  if (twilightTerms === "sunrise-sunset") {
    if (wx.isDay) {
      if (nextSunset != null) twilight = buildTwilight("sunset", nextSunset);
      else if (nextSunrise != null) twilight = buildTwilight("sunrise", nextSunrise);
    } else {
      if (nextSunrise != null) twilight = buildTwilight("sunrise", nextSunrise);
      else if (nextSunset != null) twilight = buildTwilight("sunset", nextSunset);
    }
  } else {
    // Dawn-dusk mode: Be smarter about which event to show
    if (wx.isDay) {
      // During daytime, show upcoming dusk
      if (nextDusk != null) twilight = buildTwilight("dusk", nextDusk);
      else if (nextSunset != null) twilight = buildTwilight("dusk", nextSunset);
      else if (nextDawn != null) twilight = buildTwilight("dawn", nextDawn);
    } else {
      // During nighttime, determine if we're before or after midnight
      // If dawn is very far away (>6 hours), we probably just passed dusk - show next dusk
      // Otherwise, we're approaching morning - show dawn
      if (nextDawn != null && isReasonablyClose(nextDawn)) {
        twilight = buildTwilight("dawn", nextDawn);
      } else if (nextSunrise != null && isReasonablyClose(nextSunrise)) {
        // If dawn isn't close but sunrise is, we're between dawn and sunrise
        twilight = buildTwilight("sunrise", nextSunrise);
      } else if (nextDusk != null) {
        // Dawn is far away (tomorrow), show next dusk instead
        twilight = buildTwilight("dusk", nextDusk);
      } else if (nextDawn != null) {
        // Fallback to dawn even if it's far
        twilight = buildTwilight("dawn", nextDawn);
      }
    }
  }

  let timeFormatter;
  try {
    timeFormatter = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: wx.timezone || undefined,
    });
  } catch (e) {
    timeFormatter = null;
  }

  const forecast = (Array.isArray(wx.hourlyForecast) ? wx.hourlyForecast : [])
    .map((slot, idx) => {
      if (!slot || typeof slot.apparent !== "number") return null;
      let slotTemp = typeof slot.temperature === "number" ? slot.temperature : slot.apparent;
      let slotHumidity = typeof slot.humidity === "number" ? slot.humidity : wx.humidity;
      let slotWind = typeof slot.wind === "number" ? slot.wind : wx.wind;
      let slotPrecipProb = typeof slot.precipProb === "number" ? slot.precipProb : 0;
      let slotPrecip = typeof slot.precip === "number" ? slot.precip : 0;
      let slotUv = typeof slot.uv === "number" ? slot.uv : 0;
      let slotCloud = typeof slot.cloud === "number" ? slot.cloud : (wx.cloud || 50);

      // Align "Now" slot exactly with the values driving the primary gauge/controls.
      if (idx === 0) {
        slotTemp = wx.temperature;
        slotHumidity = wx.humidity;
        slotWind = wx.wind;
        slotPrecipProb = wx.precipProb;
        slotPrecip = wx.precip;
        slotUv = wx.uv;
        slotCloud = wx.cloud || 50;
      }

      const slotTempF = toF(slotTemp);
      const slotApparentF = idx === 0 ? usedApparentF : toF(slot.apparent);
      if (!Number.isFinite(slotApparentF)) return null;

      const slotOutfit = outfitFor(
        {
          apparentF: slotApparentF,
          humidity: slotHumidity,
          windMph: slotWind,
          precipProb: slotPrecipProb,
          precipIn: slotPrecip,
          uvIndex: slotUv,
          isDay: wx.isDay,
        },
        workout,
        coldHands,
        gender,
        false,
        [],
        tempSensitivity
      );

      // Calculate UTCI for this forecast slot
      const slotSolarElevation = place?.lat != null && place?.lon != null
        ? calculateSolarElevation({
            latitude: place.lat,
            longitude: place.lon,
            timestamp: slot.time,
          })
        : 0;

      const slotMrtData = calculateMRT({
        tempF: slotTempF,
        humidity: slotHumidity || 50,
        solarRadiation: typeof slot.solarRadiation === "number" ? slot.solarRadiation : 0,
        solarElevation: slotSolarElevation ?? 0,
        cloudCover: slotCloud || 50,
        windMph: slotWind || 0
      });

      const slotUtciData = calculateUTCI({
        tempF: slotTempF,
        humidity: slotHumidity || 50,
        windMph: slotWind || 0,
        mrt: slotMrtData?.mrt || slotTempF,
        precipRate: slotPrecip || 0
      });

      // Debug log for problematic UTCI calculations
      const utciF = slotUtciData?.utci;
      if (utciF && (Math.abs(utciF) > 100 || Math.abs(utciF - slotTempF) > 50)) {
        console.warn(`🐛 PROBLEMATIC UTCI at ${slot.time}:`, {
          hourIndex: idx,
          airTemp: slotTempF,
          mrt: slotMrtData?.mrt,
          mrtEnhancement: slotMrtData?.enhancement,
          humidity: slotHumidity,
          wind: slotWind,
          solarRadiation: slot.solarRadiation,
          solarElevation: slotSolarElevation,
          cloudCover: slotCloud,
          utci: utciF,
          utciDeviation: utciF - slotTempF,
          mrtComponents: slotMrtData
        });
      }

      const slotBreakdown = slotUtciData ? getUTCIScoreBreakdown(slotUtciData, slotPrecip || 0) : {
        score: 50,
        label: 'Unknown',
        useWBGT: false,
        parts: [],
        result: null,
        total: 100,
        dominantKeys: []
      };

      const slotScore = slotBreakdown.score;
      const slotLabel = scoreLabel(slotScore);
      const displaySlotScore = getDisplayedScore(slotScore, runnerBoldness);
      const tone = scoreBasedTone(displaySlotScore);

      const displayApparent = Number.isFinite(slotApparentF)
        ? (unit === "F"
            ? Math.round(slotApparentF)
            : Math.round(((slotApparentF - 32) * 5) / 9))
        : null;

      const alerts = [];
      if (Number.isFinite(slotWind) && slotWind >= 15) {
        alerts.push({ type: "wind", message: `${Math.round(slotWind)} mph wind` });
      }
      if (
        (Number.isFinite(slotPrecipProb) && slotPrecipProb >= 40) ||
        (Number.isFinite(slotPrecip) && slotPrecip >= 0.05)
      ) {
        alerts.push({ type: "rain", message: `${Math.round(slotPrecipProb)}% / ${round1(slotPrecip)}"` });
      }
      if (Number.isFinite(slotUv) && slotUv >= 6) {
        alerts.push({ type: "uv", message: `UV ${round1(slotUv)}` });
      }

      const timeLabel = idx === 0
        ? "Now"
        : (timeFormatter
            ? timeFormatter.format(new Date(slot.time))
            : new Date(slot.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));

      return {
        time: slot.time,
        timeLabel,
        score: slotScore,
        label: slotLabel.text,
        tone,
        apparentDisplay: displayApparent != null ? `${displayApparent}°${unit}` : null,
        alerts,
        // Store full breakdown data for modal
        breakdown: slotBreakdown,
        weatherData: {
          tempF: slotTempF,
          apparentF: slotApparentF,
          humidity: slotHumidity,
          windMph: slotWind,
          precipProb: slotPrecipProb,
          precipIn: slotPrecip,
          uvIndex: slotUv,
        },
      };
    })
    .filter(Boolean);
  
  // Calculate solar elevation angle (round to reduce jitter)
  const solarElevation = place?.lat != null && place?.lon != null
    ? Math.round(calculateSolarElevation({
        latitude: place.lat,
        longitude: place.lon,
        timestamp: now,
      }) * 10) / 10 // Round to 0.1 degree precision
    : null;
  
  // Calculate Mean Radiant Temperature (MRT)
  const mrtData = calculateMRT({
    tempF: tempFWx,
    humidity: wx.humidity,
    solarRadiation: wx.solarRadiation || 0,
    solarElevation: solarElevation ?? 0, // Use nullish coalescing to allow negative values
    cloudCover: wx.cloud || 50,
    windMph: wx.wind
  });
  
  // Round MRT to reduce jitter
  if (mrtData) {
    mrtData.mrt = Math.round(mrtData.mrt * 10) / 10;
    if (mrtData.enhancement) mrtData.enhancement = Math.round(mrtData.enhancement * 10) / 10;
  }
  
  const mrtCategory = mrtData ? getMRTCategory(mrtData.mrt, tempFWx) : null;
  const effectiveSolarTemp = mrtData ? calculateEffectiveSolarTemp(tempFWx, mrtData.mrt, wx.wind) : null;
  
  // Calculate Universal Thermal Climate Index (UTCI)
  const utciData = calculateUTCI({
    tempF: tempFWx,
    humidity: wx.humidity,
    windMph: wx.wind,
    mrt: mrtData?.mrt || tempFWx,
    precipRate: wx.precip || 0 // inches per hour
  });
  
  // Round UTCI to reduce jitter
  if (utciData) {
    utciData.utci = Math.round(utciData.utci * 10) / 10;
    if (utciData.adjustment) utciData.adjustment = Math.round(utciData.adjustment * 10) / 10;
  }
  
  const utciCategory = utciData ? getUTCICategory(utciData.utci) : null;

  const utciDisplay = utciData?.utci != null ? (unit === 'F' ? utciData.utci : fToC(utciData.utci)) : null;
  
  // Calculate Wet Bulb Globe Temperature (WBGT) for heat stress assessment
  const wbgtF = calculateWBGT({ 
    tempF: tempFWx, 
    humidity: wx.humidity, 
    windMph: wx.wind, 
    pressureHPa: wx.pressure, 
    solarRadiationWm2: wx.solarRadiation, 
    cloudCover: wx.cloud ?? 50 
  });
  
  // Calculate score based on UTCI (pass full utciData so breakdown shows components)
  const breakdown = utciData ? getUTCIScoreBreakdown(utciData, wx.precip || 0) : {
    score: 50,
    label: 'Unknown',
    useWBGT: false,
    parts: [],
    result: null,
    total: 100,
    dominantKeys: []
  };
  
  const score = breakdown.score;
  
  // Calculate tone based on score
  const tone = scoreBasedTone(getDisplayedScore(score, runnerBoldness));
  
  // Find best run time for today and tomorrow within user-defined hours (after score is available)
  const findBestRunTimes = () => {
    if (!wx?.hourlyForecast || wx.hourlyForecast.length === 0) return { today: null, tomorrow: null };
    
    const now = Date.now();
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const todayStart = todayDate.getTime();
    const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
    const tomorrowEnd = tomorrowStart + 24 * 60 * 60 * 1000;
    
    const todayCandidates = [];
    const tomorrowCandidates = [];
    
    // First, add "Now" as a candidate for today if we're in the valid time window
    const currentHour = new Date().getHours();
    if (currentHour >= runHoursStart && currentHour < runHoursEnd) {
      todayCandidates.push({
        time: now,
        score: score, // Use the already-calculated current score
        apparentF: usedApparentF,
        wind: wx.wind,
        precipProb: wx.precipProb,
        uv: wx.uv,
        isNow: true,
      });
    }
    
    for (const slot of wx.hourlyForecast) {
      if (!slot || !slot.time) continue;
      const slotTime = typeof slot.time === 'number' ? slot.time : Date.parse(slot.time);
      if (!Number.isFinite(slotTime)) continue;
      
      // Skip the first slot since we already added "Now"
      if (slotTime < now + 60 * 60 * 1000) continue;
      
      // Check if within user-defined run hours window
      const slotDate = new Date(slotTime);
      const hour = slotDate.getHours();
      if (hour < runHoursStart || hour >= runHoursEnd) continue;
      
      // Calculate score for this slot
      const slotTempF = slot.apparent;
      const slotHumidity = slot.humidity;
      const slotWind = slot.wind;
      const slotPrecip = slot.precip || 0;
      const slotCloud = slot.cloud || 50;
      
      const slotSolarElevation = place?.lat != null && place?.lon != null
        ? calculateSolarElevation({
            latitude: place.lat,
            longitude: place.lon,
            timestamp: slotTime,
          })
        : 0;
      
      const slotMrtData = calculateMRT({
        tempF: slotTempF,
        humidity: slotHumidity || 50,
        solarRadiation: typeof slot.solarRadiation === "number" ? slot.solarRadiation : 0,
        solarElevation: slotSolarElevation ?? 0,
        cloudCover: slotCloud || 50,
        windMph: slotWind || 0
      });

      const slotUtciData = calculateUTCI({
        tempF: slotTempF,
        humidity: slotHumidity || 50,
        windMph: slotWind || 0,
        mrt: slotMrtData?.mrt || slotTempF,
        precipRate: slotPrecip || 0
      });
      
      console.log(`📊 HOURLY UTCI INPUTS DEBUG for ${new Date(slot.time).toISOString()} at`, {
        tempF: parseFloat(slotTempF?.toFixed(1)) ?? 0,
        humidity: parseFloat(slotHumidity?.toFixed(0)) ?? 0,
        windMph: parseFloat(slotWind?.toFixed(1)) ?? 0,
        mrt: parseFloat(slotMrtData?.mrt?.toFixed(1)) ?? 0,
        precipRate: parseFloat(slotPrecip?.toFixed(2)) ?? 0,
        cloudCover: parseFloat(slotCloud?.toFixed(0)) ?? 0,
        solarElevation: parseFloat(slotSolarElevation?.toFixed(1)) ?? 0,
        solarRadiation: parseFloat(slot.solarRadiation?.toFixed(0)) ?? 0,
        utci: parseFloat(slotUtciData?.utci?.toFixed(1)) ?? 0,
        utciAdjustment: parseFloat(slotUtciData?.adjustment?.toFixed(1)) ?? 0,
      });

      const slotBreakdown = slotUtciData ? getUTCIScoreBreakdown(slotUtciData, slotPrecip || 0) : {
        score: 50,
        label: 'Unknown',
        useWBGT: false,
        parts: [],
        result: null,
        total: 100,
        dominantKeys: []
      };

      const slotScore = slotBreakdown.score;
      
      const candidate = {
        time: slotTime,
        score: slotScore,
        apparentF: slotTempF,
        wind: slotWind,
        precipProb: slot.precipProb,
        uv: slot.uv,
        isNow: false,
      };
      
      // Categorize by today vs tomorrow
      if (slotTime >= todayStart && slotTime < tomorrowStart) {
        todayCandidates.push(candidate);
      } else if (slotTime >= tomorrowStart && slotTime < tomorrowEnd) {
        tomorrowCandidates.push(candidate);
      }
    }
    
    // Find best for today
    let today = null;
    if (todayCandidates.length > 0) {
      todayCandidates.sort((a, b) => b.score - a.score);
      today = todayCandidates[0];
    }
    
    // Find best for tomorrow
    let tomorrow = null;
    if (tomorrowCandidates.length > 0) {
      tomorrowCandidates.sort((a, b) => b.score - a.score);
      tomorrow = tomorrowCandidates[0];
    }
    
    return { today, tomorrow };
  };
  
  const bestRunTimes = findBestRunTimes();
  
  // Calculate approach tips (after breakdown is available)
  const approach = makeApproachTips({
    score,
    parts: breakdown.parts,
    dpF,
    apparentF: usedApparentF,
    tempF: tempFWx,
    humidity: wx.humidity,
    windMph: wx.wind,
    precipProb: wx.precipProb,
    workout,
    longRun,
    tempChange: longRun && wx.hourlyForecast?.length > 1 
      ? Math.max(0, ...(wx.hourlyForecast.slice(1, 3).map(h => h.apparent - usedApparentF).filter(v => !isNaN(v)))) 
      : 0,
    willRain: longRun && wx.hourlyForecast?.some((h, i) => i > 0 && i <= 2 && (h.precipProb > 40 || h.precip > 0.02)),
    roadConditions,
    runnerBoldness,
    cloudCover: wx.cloud || 50,
  });
  
  return {
    apparentF: apparentFWx,
    tempF: tempFWx,
    tempDisplay,
    score,
    label: scoreLabel(score),
    tone,
    recs,
    displayApparent,
    dewPointDisplay,
    manualOn,
    hands: recs.handsLevel,
    handsText: handsLabel(recs.handsLevel),
    handsToneClass: handsTone(recs.handsLevel),
    socksLabel: recs.sockLevel === "double_socks" ? "Double socks" : recs.sockLevel === "heavy_socks" ? "Heavy socks" : "Light socks",
    // NEW fields for insights panel
    breakdown,   // { parts, total, ideal, dpF, dominantKeys }
    approach,    // { tips:[], paceAdj: string }
    roadConditions, // { severity, warnings, hasWarnings }
    twilight,
    forecast,
    moonPhase,
    moonPosition, // Moon altitude, azimuth, visibility
    bestRunTimes,
    solarElevation, // Solar angle above horizon in degrees
    mrt: mrtData?.mrt, // Mean Radiant Temperature
    mrtEnhancement: mrtData?.enhancement, // How much warmer than air temp
    mrtCategory, // MRT category info (label, color, impact)
    effectiveSolarTemp, // Effective temperature accounting for solar radiation
    utci: utciDisplay, // Universal Thermal Climate Index
    utciCategory, // UTCI stress category
    utciRainAdjustment: utciData?.rainAdjustment, // Rain cooling effect
    wbgt: wbgtF, // Wet Bulb Globe Temperature
    // Hour click handler for forecast
    onHourClick: (slot) => {
      setSelectedHourData(slot);
      setShowHourBreakdown(true);
    },
  };
}, [wx, unit, runType, coldHands, gender, customTempEnabled, customTempInput, twilightTerms, tempSensitivity, runnerBoldness]);

  // Calculate displayed score properties (visual only, based on boldness)
  const displayedScoreProps = useMemo(() => {
    if (!derived) return null;
    const displayScore = getDisplayedScore(derived.score, runnerBoldness);
    return {
      score: displayScore,
      label: scoreLabel(displayScore),
      tone: scoreBasedTone(displayScore),
    };
  }, [derived?.score, derived?.apparentF, runnerBoldness, getDisplayedScore]);

  const gaugeData = useMemo(() => {
    if (!derived || !displayedScoreProps) return [{ name: "score", value: 0, fill: "#0ea5e9" }];
    const fillColor = displayedScoreProps.tone?.fillColor || "#0ea5e9";
    const displayScore = displayedScoreProps.score;
    return [{ name: "score", value: displayScore, fill: fillColor }];
  }, [derived, displayedScoreProps]);

  // Selected hour display props (visual-only, based on boldness)
  const selectedHourDisplay = useMemo(() => {
    if (!selectedHourData) return null;
    const ds = typeof selectedHourData.score === 'number' ? getDisplayedScore(selectedHourData.score, runnerBoldness) : selectedHourData.score;
    return { score: ds, label: scoreLabel(ds), tone: scoreBasedTone(ds) };
  }, [selectedHourData?.score, runnerBoldness, getDisplayedScore]);

  // Compare options by gear keys only (ignore workout/coldHands metadata)
  const encodeOptionList = (list = []) => list.map((item) => item.key).sort().join(",");
  const optionsDiffer = derived ? encodeOptionList(derived.recs.optionA) !== encodeOptionList(derived.recs.optionB) : false;

  useEffect(() => {
    if (!optionsDiffer) setActiveOption("A");
  }, [optionsDiffer]);

  const activeItems = derived
    ? (() => {
        const items = optionsDiffer && activeOption === "B"
          ? derived.recs.optionB
          : derived.recs.optionA;
        
        // Sort items by category in the desired order
        const categoryOrder = {
          'Headwear': 1,
          'Tops': 2,
          'Outerwear': 3,
          'Hands': 4,
          'Bottoms': 5,
          'Accessories': 6,
          'Socks': 7,
          'Nutrition': 8,
          'Care': 9
        };
        
        return items.sort((a, b) => {
          const aCategory = GEAR_INFO[a.key]?.category || 'Accessories';
          const bCategory = GEAR_INFO[b.key]?.category || 'Accessories';
          const aOrder = categoryOrder[aCategory] || 99;
          const bOrder = categoryOrder[bCategory] || 99;
          return aOrder - bOrder;
        });
      })()
    : [];

  const optionTitle = useMemo(() => {
    if (!derived) return "Outfit";
    const workout = runType === 'workout';
    const longRun = runType === 'longRun';
    if (!optionsDiffer) return workout ? "Workout-ready outfit" : longRun ? "Long run outfit" : "Recommended outfit";
    return activeOption === "B"
      ? workout ? "Option B — Comfort (controlled)" : "Option B — Comfort (cozy)"
      : workout ? "Option A — Performance (workout)" : longRun ? "Option A — Performance (long run)" : "Option A — Performance (lean)";
  }, [derived, optionsDiffer, activeOption, runType]);

  const sourceBadge = useMemo(() => {
    switch (place?.source) {
      case 'gps': return { text: 'GPS', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'ip': return { text: 'IP', tone: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'manual': return { text: 'Manual', tone: 'bg-sky-100 text-sky-800 border-sky-200' };
  default: return { text: 'Default', tone: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  }, [place?.source]);

  const weatherSourceLabel = useMemo(() => {
    const providerList = wx?.sources ? Object.values(wx.sources).map((s) => s.provider).filter(Boolean) : [];
    if (!providerList.length) return "Open-Meteo";
    return Array.from(new Set(providerList)).join(" + ");
  }, [wx?.sources]);

  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdated) return "—";
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: wx?.timezone || undefined,
      }).format(new Date(lastUpdated));
    } catch (e) {
      return new Date(lastUpdated).toLocaleString();
    }
  }, [lastUpdated, wx?.timezone]);

  const formattedPlaceName = useMemo(() => {
    if (!place?.name) return "";
    const parts = place.name.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) return `${parts[0]} ${parts[1]}`;
    if (place.source === "gps" && place.lat && place.lon) {
      return `${place.lat.toFixed(2)}° ${place.lon.toFixed(2)}°`;
    }
    return place.name;
  }, [place?.name, place?.lat, place?.lon, place?.source]);

  const pageThemeClass = theme === "dark"
    ? "bg-gradient-to-br from-slate-950 via-slate-1000 to-slate-1050 text-slate-100"
    : "bg-gradient-to-b from-sky-50 via-white to-sky-50/30 text-gray-900";

  // Check if it's evening (5 PM - 11 PM) for Tomorrow's Outfit placement
  const isEvening = useMemo(() => {
    const now = new Date();
    const hour = debugActive && debugInputs.debugTimeHour !== "" 
      ? parseInt(debugInputs.debugTimeHour) 
      : now.getHours();
    return hour >= 17 && hour < 23;
  }, [debugActive, debugInputs.debugTimeHour]);

  return (
    <div 
      className={`min-h-screen min-h-[100dvh] w-full transition-colors ${pageThemeClass}`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        height: '100%',
      }}
    >
      {/* Refresh success toast */}
      <AnimatePresence>
        {showRefreshToast && (
          <motion.div
            className="fixed left-1/2 z-50 -translate-x-1/2"
            style={{ top: 'max(env(safe-area-inset-top) + 1rem, 5rem)' }}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <div className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-white shadow-lg backdrop-blur-sm">
              <motion.svg 
                className="h-5 w-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <motion.path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2.5} 
                  d="M5 13l4 4L19 7"
                />
              </motion.svg>
              <span className="text-sm font-semibold">Weather Refreshed!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div 
        className="mx-auto max-w-6xl px-6 py-8"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <motion.header 
          className="mb-6 flex items-start justify-between gap-4"
          variants={cardVariants}
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100">SamsFitCast</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">Smart outfit picks for your run, based on real‑feel weather.</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              variant="ghost"
              className="h-12 w-12 rounded-full border border-transparent text-slate-500 shadow-sm hover:border-slate-200 hover:text-slate-700 hover:shadow dark:text-slate-300 dark:hover:border-slate-700"
              onClick={() => setShowSettings(true)}
              aria-label="Open settings"
            >
              <SettingsIcon className="h-6 w-6" />
            </Button>
          </motion.div>
        </motion.header>

        {/* Smart Night Running Card - Shows at top when enabled and conditions are met */}
        {smartNightCard && derived?.moonPhase && derived?.moonPosition && (() => {
          const moonLight = derived.moonPhase.illuminationPct;
          const skyClarity = 100 - (wx?.cloud || 0);
          const humidity = wx?.humidity || 0;
          const tempDewDiff = Math.abs((wx?.temperature || 0) - (derived?.dewPointDisplay || 0));
          const isFoggy = humidity > 90 && tempDewDiff < 3;
          const fogFactor = isFoggy ? 0.3 : humidity > 90 && tempDewDiff < 8 ? 0.6 : 1.0;
          const effectiveVis = Math.round((moonLight * skyClarity / 100) * fogFactor);
          const isNightTime = wx?.isDay === false;
          const moonVis = derived.moonPosition.isVisible;
          const moonAlt = derived.moonPosition.altitude;
          const moonDir = derived.moonPosition.direction;
          
          // Only show at top if it's nighttime, moon is visible, and visibility > 75%
          if (!isNightTime || !moonVis || effectiveVis <= 75) {
            return null;
          }
          
          return (
            <motion.div 
              variants={cardVariants}
              initial="initial"
              animate="animate"
              className="mt-6"
            >
              <Card className="overflow-hidden border-2 border-purple-300/60 dark:border-purple-500/40 shadow-xl">
                <CardHeader className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-blue-500/10 dark:from-indigo-500/20 dark:via-purple-500/20 dark:to-blue-500/20">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500">
                        <Moon className="h-4 w-4 text-white" />
                      </div>
                      Great Night for Running
                    </span>
                    <span className="text-sm font-normal text-emerald-600 dark:text-emerald-400">
                      {effectiveVis}% Visibility
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
                      <span className="text-2xl">{derived.moonPhase.emoji}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
                        Excellent visibility tonight
                      </div>
                      <div className="text-sm text-gray-700 dark:text-slate-300 space-y-1">
                        <p>Moon at {derived.moonPhase.illuminationPct}% illumination ({derived.moonPhase.name}) is visible {moonAlt.toFixed(0)}° above horizon in the {moonDir}.</p>
                        <p>Clear skies ({skyClarity.toFixed(0)}% clarity) and good atmospheric conditions make this ideal for an evening run.</p>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 px-2 py-1">
                          <span className="font-medium text-emerald-700 dark:text-emerald-300">Safe to run</span>
                        </span>
                        <span>•</span>
                        <span>Headlamp optional</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })()}

        {/* Tomorrow's Outfit Card - Prominent Evening Version */}
        {isEvening && showTomorrowOutfit && derived && wx?.hourlyForecast?.length > 0 && (
          <TomorrowOutfit
            wx={wx}
            tomorrowRunHour={tomorrowRunHour}
            tomorrowCardRunType={tomorrowCardRunType}
            tomorrowCardOption={tomorrowCardOption}
            setTomorrowCardRunType={setTomorrowCardRunType}
            setTomorrowRunType={setTomorrowRunType}
            setTomorrowCardOption={setTomorrowCardOption}
            setShowTimePickerModal={setShowTimePickerModal}
            outfitFor={outfitFor}
            getDisplayedScore={getDisplayedScore}
            scoreLabel={scoreLabel}
            scoreBasedTone={scoreBasedTone}
            coldHands={coldHands}
            gender={gender}
            runnerBoldness={runnerBoldness}
            tempSensitivity={tempSensitivity}
            unit={unit}
            variant="prominent"
            cardVariants={cardVariants}
          />
        )}

        {/* Main Weather Card - Run Controls */}
        <CurrentConditions
          place={place}
          loading={loading}
          formattedPlaceName={formattedPlaceName}
          lastUpdatedLabel={lastUpdatedLabel}
          debugActive={debugActive}
          derived={derived}
          wx={wx}
          gender={gender}
          displayedScoreProps={displayedScoreProps}
          error={error}
          runType={runType}
          setShowInsights={setShowInsights}
          onOpenHourBreakdown={() => {
            if (!derived) { setShowInsights(true); return; }
            const nowSlot = {
              time: new Date().toISOString(),
              timeLabel: 'Now',
              score: derived.score,
              apparentDisplay: derived.displayApparent,
              weatherData: {
                tempF: derived.tempF,
                apparentF: derived.apparentF,
                humidity: derived.humidity,
                windMph: derived.windMph,
                precipProb: derived.precipProb,
                precipIn: derived.precipIn,
              },
              breakdown: derived.breakdown
            };
            setSelectedHourData(nowSlot);
            setShowHourBreakdown(true);
          }}
          setRunType={setRunType}
          handleLocationRefresh={handleLocationRefresh}
          cardVariants={cardVariants}
        />

        {/* Main Dashboard */}
    <motion.div 
      className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Left Column */}
            <motion.div className="flex flex-col gap-6 lg:col-start-1" variants={cardVariants}>
                <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-br from-gray-50/50 to-white dark:from-slate-900/50 dark:to-slate-900">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                          <CardTitle className="text-base">{optionTitle}</CardTitle>
                        </div>
                        <SegmentedControl
                          value={activeOption}
                          onChange={setActiveOption}
                          options={[
                            { label: "Performance", value: "A" },
                            { label: "Comfort", value: "B" },
                            { label: "A.I. (beta)", value: "C" },
                          ]}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      {derived ? (
                        <>
                          {activeOption === 'C' ? (
                            <motion.div 
                              key="C" 
                              initial={{ opacity: 0, y: 20 }} 
                              animate={{ opacity: 1, y: 0 }} 
                              exit={{ opacity: 0, y: -20 }} 
                              className="text-center p-8"
                            >
                              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">A.I. recommendations are coming soon!</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This feature will provide personalized gear suggestions based on the weather.</p>
                            </motion.div>
                          ) : (
                            <motion.div 
                              className="space-y-2"
                              variants={staggerContainer}
                              initial="initial"
                              animate="animate"
                            >
                              {activeItems.map((item) => (
                                <motion.div 
                                  key={item.key} 
                                  className="group relative rounded-xl border border-gray-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white to-gray-50/30 dark:from-slate-800/40 dark:to-slate-900/40 px-4 py-3 transition-all hover:shadow-sm hover:border-gray-300 dark:hover:border-slate-600 cursor-pointer"
                                  variants={listItemVariants}
                                  whileHover={{ x: 4, transition: { duration: 0.2 } }}
                                  onClick={() => setSelectedOutfitItem(item.key)}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      {(() => {
                                        const gearInfo = GEAR_INFO[item.key];
                                        const Icon = GEAR_ICONS[item.key] || UserRound;
                                        return gearInfo?.image ? (
                                          <img 
                                            src={gearInfo.image} 
                                            alt={item.label} 
                                            className="h-10 w-10 rounded-lg object-cover"
                                          />
                                        ) : (
                                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-700">
                                            <Icon className="h-5 w-5 text-gray-600 dark:text-slate-300" />
                                          </div>
                                        );
                                      })()}
                                      <span className="text-sm font-semibold text-gray-800 dark:text-slate-100">{item.label}</span>
                                    </div>
                                    {(item.coldHands || item.workout || item.longRun) && (
                                      <div className="flex items-center gap-1">
                                        {item.workout && (
                                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/60 dark:border-amber-500/40 bg-amber-50/80 dark:bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                                            <Flame className="h-3 w-3" /> Workout
                                          </span>
                                        )}
                                        {item.longRun && (
                                          <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200/60 dark:border-indigo-500/40 bg-indigo-50/80 dark:bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:text-indigo-300">
                                            <TrendingUp className="h-3 w-3" /> Long
                                          </span>
                                        )}
                                        {item.coldHands && (
                                          <span className="inline-flex items-center gap-1 rounded-full border border-sky-200/60 dark:border-sky-500/40 bg-sky-50/80 dark:bg-sky-500/20 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
                                            <Hand className="h-3 w-3" /> Cold
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                            </motion.div>
                          )}
                          
                          {!optionsDiffer ? (
                            <motion.div 
                              className="mt-4 rounded-xl border border-emerald-200/60 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 px-4 py-3"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 dark:bg-emerald-500/30 mt-0.5">
                                  <svg className="h-3 w-3 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                  </svg>
                                </div>
                                <p className="text-sm font-semibold">Perfect alignment! Performance and comfort recommendations match today—this outfit optimizes both.</p>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div 
                              className="mt-4 rounded-xl border border-blue-200/60 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 px-4 py-3"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                            >
                              <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                                <p className="text-sm font-semibold leading-relaxed text-blue-800 dark:text-blue-200">
                                  {activeOption === "A" 
                                    ? "Performance-focused: Optimized for speed and efficiency. May sacrifice some warmth/comfort."
                                    : "Comfort-focused: Prioritizes warmth and protection. May feel slightly overdressed during hard efforts."}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </>
                      ) : (
                        <div className="space-y-2">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-gray-100 dark:bg-slate-800/40" />
                          ))}
                        </div>
                      )}
                    </CardContent>
                </Card>
                
                {/* Today's Run Strategy Card */}
                {derived?.approach && (
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-br from-sky-50/50 to-blue-50/50 dark:from-sky-900/20 dark:to-blue-900/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-500">
                            <Flame className="h-4 w-4 text-white" />
                          </div>
                          <CardTitle className="text-base">
                            {runType === 'easy' ? 'Easy Run' : runType === 'workout' ? 'Hard Workout' : 'Long Run'} Strategy
                          </CardTitle>
                        </div>
                        {derived?.roadConditions?.hasWarnings && (
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                            derived.roadConditions.severity === 'danger' 
                              ? 'border-red-300 bg-red-100 text-red-800 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-200'
                              : derived.roadConditions.severity === 'warning'
                              ? 'border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-500/40 dark:bg-orange-500/20 dark:text-orange-200'
                              : 'border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-500/40 dark:bg-yellow-500/20 dark:text-yellow-200'
                          }`}>
                            ⚠️ Road Alert
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {derived.approach.tips.map((tip, idx) => {
                          const isRoadWarning = tip.startsWith('⚠️');
                          return (
                            <motion.div
                              key={idx}
                              className={`flex items-start gap-2 rounded-lg border p-3 ${
                                isRoadWarning
                                  ? derived.roadConditions.severity === 'danger'
                                    ? 'border-red-300/60 bg-red-50/80 dark:border-red-500/30 dark:bg-red-500/10'
                                    : derived.roadConditions.severity === 'warning'
                                    ? 'border-orange-300/60 bg-orange-50/80 dark:border-orange-500/30 dark:bg-orange-500/10'
                                    : 'border-yellow-300/60 bg-yellow-50/80 dark:border-yellow-500/30 dark:bg-yellow-500/10'
                                  : 'border-sky-200/40 bg-white/60 dark:border-sky-800/40 dark:bg-slate-900/40'
                              }`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                            >
                              {derived.approach.tips.length > 2 && !isRoadWarning && (
                                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/20">
                                  <span className="text-xs font-bold text-sky-700 dark:text-sky-400">{idx + 1}</span>
                                </div>
                              )}
                              <p className={`text-sm leading-relaxed ${
                                isRoadWarning 
                                  ? 'text-gray-900 dark:text-slate-100 font-medium'
                                  : 'text-gray-800 dark:text-slate-200'
                              }`}>
                                {tip}
                              </p>
                            </motion.div>
                          );
                        })}
                        
                        <motion.div
                          className="mt-4 rounded-lg border border-indigo-200/60 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/10 p-3"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: derived.approach.tips.length * 0.1 }}
                        >
                          <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Pace Guidance</div>
                          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">{derived.approach.paceAdj}</p>
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <ForecastCard derived={derived} getDisplayedScore={getDisplayedScore} runnerBoldness={runnerBoldness} className="lg:hidden" />
                <BestRunTimeCard derived={derived} unit={unit} getDisplayedScore={getDisplayedScore} runnerBoldness={runnerBoldness} className="lg:hidden" />

            </motion.div>

      {/* Center Column */}
      <PerformanceScore
        displayedScoreProps={displayedScoreProps}
        gaugeData={gaugeData}
        setShowInsights={setShowInsights}
        wx={wx}
        derived={derived}
        unit={unit}
        staggerContainer={staggerContainer}
        listItemVariants={listItemVariants}
        cardVariants={cardVariants}
      />
            
        <motion.div variants={cardVariants}>
          <ForecastCard derived={derived} getDisplayedScore={getDisplayedScore} runnerBoldness={runnerBoldness} className="lg:col-start-3 hidden lg:block" />
          <BestRunTimeCard derived={derived} unit={unit} getDisplayedScore={getDisplayedScore} runnerBoldness={runnerBoldness} className="lg:col-start-3 hidden lg:block" />
        </motion.div>
        </motion.div>

        {/* Night Running Conditions Card */}
        <NightRunningCard
          moonPhase={derived?.moonPhase}
          wx={wx}
          dewPoint={derived?.dewPointDisplay}
          smartNightCard={smartNightCard}
          cardVariants={cardVariants}
        />

        {/* Tomorrow's Outfit Card - Subtle Bottom Version (shown only when not evening) */}
        {!isEvening && showTomorrowOutfit && derived && wx?.hourlyForecast?.length > 0 && (
          <TomorrowOutfit
            wx={wx}
            tomorrowRunHour={tomorrowRunHour}
            tomorrowCardRunType={tomorrowCardRunType}
            tomorrowCardOption={tomorrowCardOption}
            setTomorrowCardRunType={setTomorrowCardRunType}
            setTomorrowRunType={setTomorrowRunType}
            setTomorrowCardOption={setTomorrowCardOption}
            setShowTimePickerModal={setShowTimePickerModal}
            outfitFor={outfitFor}
            getDisplayedScore={getDisplayedScore}
            scoreLabel={scoreLabel}
            scoreBasedTone={scoreBasedTone}
            coldHands={coldHands}
            gender={gender}
            runnerBoldness={runnerBoldness}
            tempSensitivity={tempSensitivity}
            unit={unit}
            variant="compact"
            cardVariants={cardVariants}
          />
        )}

  <motion.footer 
    className="mt-6 text-center text-sm text-gray-400 dark:text-slate-500"
    variants={cardVariants}
  >
          <p>Weather by Open‑Meteo. Score blends real feel, dew point, wind, precip, UV, and heat/cold synergies.</p>
        </motion.footer>
      </motion.div>

      <AnimatePresence>
        {/* Time Picker Modal */}
        {showTimePickerModal && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            onClick={() => setShowTimePickerModal(false)}
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <motion.div
              className="relative w-full max-w-md rounded-2xl border border-sky-500/40 bg-gradient-to-br from-white to-sky-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="border-b border-sky-200/60 bg-gradient-to-r from-sky-600 to-blue-700 dark:from-sky-700 dark:to-blue-800 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-white" />
                    <h2 className="text-lg font-semibold text-white">Set Tomorrow's Run Time</h2>
                  </div>
                  <motion.button
                    onClick={() => setShowTimePickerModal(false)}
                    className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Select what time you plan to run tomorrow. The outfit planner will check the forecast for this time.
                </p>
                <div className="grid grid-cols-4 gap-2 max-h-[400px] overflow-y-auto p-1">
                  {Array.from({ length: 24 }, (_, i) => i).map((hour) => {
                    const isSelected = tomorrowRunHour === hour;
                    const displayTime = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
                    return (
                      <motion.button
                        key={hour}
                        onClick={() => {
                          setTomorrowRunHour(hour);
                          setShowTimePickerModal(false);
                        }}
                        className={`rounded-lg px-3 py-3 text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-sky-600 text-white shadow-lg ring-2 ring-sky-400'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/30'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {displayTime}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Gear Guide Modal */}
        {showGearGuide && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowGearGuide(false)}
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <motion.div
              className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-white to-emerald-50 dark:from-slate-900 dark:to-emerald-950/30 shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="border-b border-emerald-200/60 bg-gradient-to-r from-emerald-600 to-teal-700 dark:from-emerald-700 dark:to-teal-800 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-white" />
                    <h2 className="text-lg font-semibold text-white">Running Gear Guide</h2>
                  </div>
                  <motion.button
                    onClick={() => setShowGearGuide(false)}
                    className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                  Tap any item to learn more about it - when to wear it, temperature ranges, and pro tips.
                </p>
                {/* Organize by category */}
                {['Tops', 'Bottoms', 'Outerwear', 'Headwear', 'Hands', 'Accessories', 'Nutrition', 'Care', 'Socks'].map((category) => {
                  const items = Object.entries(GEAR_INFO).filter(([key, info]) => info.category === category);
                  if (items.length === 0) return null;
                  return (
                    <div key={category} className="mb-6">
                      <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-200 mb-3 uppercase tracking-wide">{category}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {items.map(([key, info]) => {
                          const Icon = GEAR_ICONS[key] || UserRound;
                          return (
                            <motion.button
                              key={key}
                              onClick={() => setSelectedGearItem(key)}
                              className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md transition-all text-left"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {info.image ? (
                                  <img 
                                    src={info.image} 
                                    alt={info.name} 
                                    className="h-8 w-8 rounded-lg object-cover border border-emerald-200 dark:border-emerald-700"
                                  />
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                                    <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                  </div>
                                )}
                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{info.name}</div>
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 ml-10">{info.tempRange}</div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Outfit Item Detail Modal */}
        {selectedOutfitItem && GEAR_INFO[selectedOutfitItem] && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setSelectedOutfitItem(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative max-h-[85vh] w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {(() => {
                const item = GEAR_INFO[selectedOutfitItem];
                const Icon = GEAR_ICONS[selectedOutfitItem] || UserRound;
                return (
                  <>
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-gradient-to-br from-blue-500 to-indigo-600 px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="h-14 w-14 rounded-xl object-cover border-2 border-white/30"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                            <Icon className="h-7 w-7 text-white" />
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-bold text-white">{item.name}</h3>
                          <p className="text-xs text-blue-100">{item.category}</p>
                        </div>
                      </div>
                      <motion.button
                        onClick={() => setSelectedOutfitItem(null)}
                        className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X className="h-5 w-5" />
                      </motion.button>
                    </div>
                    <div className="overflow-y-auto p-6 space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Description</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">When to Wear</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{item.whenToWear}</p>
                      </div>
                      <div className="rounded-lg border border-blue-200/60 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Thermometer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100">Temperature Range</h4>
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">{item.tempRange}</p>
                      </div>
                      <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Pro Tips</h4>
                        </div>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">{item.tips}</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}

        {/* Gear Item Detail Modal */}
        {selectedGearItem && GEAR_INFO[selectedGearItem] && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setSelectedGearItem(null)}
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <motion.div
              className="relative w-full max-w-lg rounded-2xl border border-sky-500/40 bg-gradient-to-br from-white to-sky-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {(() => {
                const item = GEAR_INFO[selectedGearItem];
                const Icon = GEAR_ICONS[selectedGearItem] || UserRound;
                return (
                  <>
                    <div className="border-b border-sky-200/60 bg-gradient-to-r from-sky-600 to-blue-700 dark:from-sky-700 dark:to-blue-800 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="h-14 w-14 rounded-xl object-cover border-2 border-white/30"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                              <Icon className="h-7 w-7 text-white" />
                            </div>
                          )}
                          <div>
                            <h2 className="text-xl font-bold text-white">{item.name}</h2>
                            <div className="text-xs text-sky-100">{item.category}</div>
                          </div>
                        </div>
                        <motion.button
                          onClick={() => setSelectedGearItem(null)}
                          className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <X className="h-5 w-5" />
                        </motion.button>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300 mb-1 flex items-center gap-1">
                          <Thermometer className="h-3 w-3" />
                          Temperature Range
                        </div>
                        <p className="text-sm font-medium text-sky-900 dark:text-sky-100">{item.tempRange}</p>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300 mb-1 flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          Pro Tips
                        </div>
                        <p className="text-sm text-sky-900 dark:text-sky-100">{item.tips}</p>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}

        {showSettings && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" 
            onClick={() => setShowSettings(false)}
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <motion.div 
              className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl flex flex-col" 
              onClick={(e) => e.stopPropagation()}
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100">Settings</h2>
              <button className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" onClick={() => setShowSettings(false)} aria-label="Close settings">
                X
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 text-sm text-slate-600 dark:text-slate-300">
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-slate-200">Temperature Sensitivity</div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Adjust outfit recommendations based on whether you run hot or cold. Each notch = ~5°F adjustment.</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400 w-20">Runs Cold</span>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="1"
                      value={tempSensitivity}
                      onChange={(e) => setTempSensitivity(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400 w-20 text-right">Runs Hot</span>
                  </div>
                  <div className="flex justify-center items-center gap-2">
                    <div className="text-sm font-medium text-gray-800 dark:text-slate-200">
                      {tempSensitivity === -2 && "Much warmer gear"}
                      {tempSensitivity === -1 && "Slightly warmer gear"}
                      {tempSensitivity === 0 && "Standard (balanced)"}
                      {tempSensitivity === 1 && "Slightly lighter gear"}
                      {tempSensitivity === 2 && "Much lighter gear"}
                    </div>
                    {tempSensitivity !== 0 && (
                      <button
                        onClick={() => setTempSensitivity(0)}
                        className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-slate-200">Runner Boldness</div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Adjust how cautious the tips and warnings are. Badass runners get fewer warnings; cautious runners get earlier alerts.</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400 w-20">Cautious</span>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="1"
                      value={runnerBoldness}
                      onChange={(e) => setRunnerBoldness(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400 w-20 text-right">Badass</span>
                  </div>
                  <div className="flex justify-center items-center gap-2">
                    <div className="text-sm font-medium text-gray-800 dark:text-slate-200">
                      {runnerBoldness === -2 && "Very Cautious - Early warnings"}
                      {runnerBoldness === -1 && "Cautious - More warnings"}
                      {runnerBoldness === 0 && "Balanced (standard)"}
                      {runnerBoldness === 1 && "Bold - Fewer warnings"}
                      {runnerBoldness === 2 && "Badass - Minimal warnings"}
                    </div>
                    {runnerBoldness !== 0 && (
                      <button
                        onClick={() => setRunnerBoldness(0)}
                        className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-slate-200">Gender</div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Affects outfit recommendations based on typical physiological differences in temperature regulation.</p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setGender("Female")}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center ${
                      gender === "Female"
                        ? "bg-pink-400 dark:bg-pink-500 text-white shadow-md"
                        : "bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    Female
                  </button>
                  <button
                    onClick={() => setGender("Male")}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center ${
                      gender === "Male"
                        ? "bg-blue-500 dark:bg-blue-600 text-white shadow-md"
                        : "bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    Male
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-slate-200">Cold Hands</div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Enable if you tend to get cold hands while running. Adds extra 5°F adjustment for glove recommendations.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch id="coldHandsSetting" checked={coldHands} onCheckedChange={setColdHands} />
                  <Label htmlFor="coldHandsSetting" className="text-sm text-slate-600 dark:text-slate-300">
                    {coldHands ? "Enabled - Warmer hand protection" : "Disabled - Standard hand protection"}
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-medium text-gray-700 dark:text-slate-200">Location</div>
                <div className="space-y-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex grow items-center gap-2">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <Input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search city, postcode, or coordinates"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button onClick={searchCity} disabled={loading} gender={gender}>Set</Button>
                        <Button variant="secondary" onClick={tryGeolocate} disabled={loading} gender={gender}>
                          <Crosshair className="h-4 w-4" /> Use my location
                        </Button>
                      </div>
                    </div>
                  </div>
                  <dl className="grid gap-2 text-xs text-slate-500 dark:text-slate-300 sm:grid-cols-2">
                    <div>
                      <dt className="uppercase tracking-wide text-[11px] text-slate-400 dark:text-slate-500">Display name</dt>
                      <dd className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">{place?.name || "—"}</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wide text-[11px] text-slate-400 dark:text-slate-500">Coordinates</dt>
                      <dd className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">
                        {place?.lat && place?.lon ? `${place.lat.toFixed(4)}, ${place.lon.toFixed(4)}` : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wide text-[11px] text-slate-400 dark:text-slate-500">Source</dt>
                      <dd className="mt-0.5 inline-flex items-center gap-1 text-sm text-slate-700 dark:text-slate-200">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${sourceBadge.tone}`}>{sourceBadge.text}</span>
                        <span className="text-slate-400">({place?.source || "default"})</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wide text-[11px] text-slate-400 dark:text-slate-500">Weather blend</dt>
                      <dd className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">{weatherSourceLabel}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="uppercase tracking-wide text-[11px] text-slate-400 dark:text-slate-500">Last updated</dt>
                      <dd className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">{lastUpdatedLabel}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-slate-200">Preferred Run Hours</div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Set your typical running hours. This affects the "Best Times to Run" recommendations only.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Start Time</label>
                    <select
                      value={runHoursStart}
                      onChange={(e) => setRunHoursStart(parseInt(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">End Time</label>
                    <select
                      value={runHoursEnd}
                      onChange={(e) => setRunHoursEnd(parseInt(e.target.value))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {runHoursStart >= runHoursEnd && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    ⚠️ End time should be after start time for same-day runs
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-slate-200">Tomorrow's Outfit</div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Show a card with tomorrow's run outfit recommendations based on your selected time.</p>
                </div>
                <div className="space-y-3">
                  <label className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 dark:text-slate-200">Show Tomorrow's Outfit Card</span>
                    <button
                      onClick={() => setShowTomorrowOutfit(!showTomorrowOutfit)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        showTomorrowOutfit ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showTomorrowOutfit ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </label>
                  {showTomorrowOutfit && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Tomorrow's Run Time</label>
                        <select
                          value={tomorrowRunHour}
                          onChange={(e) => setTomorrowRunHour(parseInt(e.target.value))}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>
                              {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Weather is averaged from the hour before, during, and after your selected time.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-slate-200">Smart Night Running Card</div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">When enabled, the night running card only appears at the top when it's nighttime and visibility is good (&gt;75%). When disabled, the card always appears at the bottom.</p>
                </div>
                <label className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-200">Enable Smart Card</span>
                  <button
                    onClick={() => setSmartNightCard(!smartNightCard)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      smartNightCard ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        smartNightCard ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              </div>
              
              {/* Gear Guide */}
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-slate-200">Running Gear Guide</div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Learn about all the gear items - what they are, when to wear them, and pro tips.</p>
                </div>
                <Button variant="secondary" onClick={() => setShowGearGuide(true)} className="w-full" gender={gender}>
                  <Info className="h-4 w-4 mr-2" />
                  Browse Gear Guide
                </Button>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-slate-200">Debug tools</div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Manually craft weather scenarios for testing outfits without leaving the app.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" onClick={() => setShowDebug(true)} gender={gender}>
                    Open debug modal
                  </Button>
                  {debugActive && (
                    <Button variant="ghost" onClick={clearDebugScenario} className="text-amber-600 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-200" gender={gender}>
                      Reload live weather
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-medium text-gray-700 dark:text-slate-200">Temperature units</div>
                <SegmentedControl
                  value={unit}
                  onChange={(val) => {
                    setUnit(val);
                    fetchWeather(place, val);
                  }}
                  options={[
                    { label: "°F", value: "F" },
                    { label: "°C", value: "C" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <div className="font-medium text-gray-700 dark:text-slate-200">Manual temp override</div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Dial in a custom real-feel if you want the outfit and score to use your own number.</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Switch id="customTemp" checked={customTempEnabled} onCheckedChange={setCustomTempEnabled} />
                    <span className="text-sm text-slate-600 dark:text-slate-300">Enable override</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Input
                      className="w-28"
                      type="number"
                      value={customTempInput}
                      onChange={(e) => setCustomTempInput(e.target.value)}
                      placeholder={`e.g., ${unit === 'F' ? 45 : 7}`}
                      disabled={!customTempEnabled}
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-300">°{unit}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-medium text-gray-700 dark:text-slate-200">Appearance</div>
                <SegmentedControl
                  value={theme}
                  onChange={(val) => setTheme(val)}
                  options={[
                    { label: "Light", value: "light" },
                    { label: "Dark", value: "dark" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <div className="font-medium text-gray-700 dark:text-slate-200">Twilight terminology</div>
                <SegmentedControl
                  value={twilightTerms}
                  onChange={setTwilightTerms}
                  options={[
                    { label: "Dawn/Dusk", value: "dawn-dusk" },
                    { label: "Sunrise/Sunset", value: "sunrise-sunset" },
                  ]}
                />
              </div>
              <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-red-800 dark:text-red-200">Hard Reset</div>
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">Clear all cached data, settings, and force a complete refresh. Use this if you're experiencing issues or want a fresh start.</p>
                </div>
                <Button 
                  variant="secondary"
                  onClick={() => {
                    if (confirm('This will clear all settings, cache, and reload the app. Continue?')) {
                      // Clear localStorage
                      localStorage.clear();
                      
                      // Unregister service workers
                      if ('serviceWorker' in navigator) {
                        navigator.serviceWorker.getRegistrations().then(registrations => {
                          registrations.forEach(reg => reg.unregister());
                        });
                      }
                      
                      // Clear all caches
                      if ('caches' in window) {
                        caches.keys().then(keys => {
                          keys.forEach(key => caches.delete(key));
                        });
                      }
                      
                      // Force hard reload
                      setTimeout(() => {
                        window.location.reload(true);
                      }, 100);
                    }
                  }}
                  className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                >
                  Clear Everything & Reload
                </Button>
              </div>
            </div>
            <div className="border-t border-gray-200 dark:border-slate-700 px-6 py-4 flex justify-between">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="outline" 
                  onClick={resetToDefaults}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-red-300 hover:border-red-400 dark:border-red-800 dark:hover:border-red-700"
                >
                  Reset to Defaults
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="outline" onClick={() => setShowSettings(false)}>Done</Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Debug Modal */}
      <DebugModal
        isOpen={showDebug}
        onClose={() => setShowDebug(false)}
        unit={unit}
        debugActive={debugActive}
        onClearScenario={clearDebugScenario}
        onApplyScenario={applyDebugScenario}
        initialData={debugInputs}
      />

      {/* Insights Modal */}
      <InsightsModal
        showInsights={showInsights}
        onClose={() => setShowInsights(false)}
        breakdown={derived ? derived.breakdown : null}
        score={displayedScoreProps?.score}
        displayedScoreProps={displayedScoreProps}
        derived={derived}
      />

      {/* Hour Breakdown Modal */}
      <DynamicModal
        isOpen={showHourBreakdown}
        onClose={() => setShowHourBreakdown(false)}
        title={selectedHourData?.timeLabel ? `${selectedHourData.timeLabel} Performance Score` : 'Hour Breakdown'}
        icon={Clock}
        headerRight={
          <div className="flex items-baseline gap-2">
            <div className="text-4xl font-extrabold" style={selectedHourDisplay?.tone?.textStyle}>
              {selectedHourDisplay ? Math.max(1, Math.round(selectedHourDisplay.score / 10)) : (selectedHourData?.score ? Math.max(1, Math.round(getDisplayedScore(selectedHourData.score, runnerBoldness) / 10)) : '--')}
            </div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400">/ 10</div>
          </div>
        }
        scoreBar={selectedHourData && selectedHourDisplay && {
          value: selectedHourDisplay?.score ?? (selectedHourData.score ? getDisplayedScore(selectedHourData.score, runnerBoldness) : 0),
          style: selectedHourDisplay?.tone?.badgeStyle
        }}
        variants={{ backdropVariants, modalVariants }}
      >
        {selectedHourData && (
          <ScoreBreakdownContent
            breakdown={selectedHourData.breakdown}
            weatherSummary={selectedHourData.weatherData ? {
              apparentDisplay: selectedHourData.apparentDisplay,
              windMph: selectedHourData.weatherData.windMph,
              humidity: selectedHourData.weatherData.humidity
            } : null}
            score={selectedHourDisplay?.score ?? (selectedHourData.score ? getDisplayedScore(selectedHourData.score, runnerBoldness) : null)}
            variants={{ staggerContainer, listItemVariants }}
          />
        )}
      </DynamicModal>

      {/* Loading Splash: show while initializing (first load) or when actively loading */}
      <AnimatePresence>
        {(initializing || loading) && (
          <LoadingSplash 
            isLoading={true}
            progress={initializing ? (wx ? 80 : 30) : (loading ? (wx ? 90 : 60) : 100)}
            stage={
              initializing ? (place ? 'Initializing — fetching weather...' : 'Initializing — getting location...') :
              loading ? (wx ? 'Refreshing weather...' : 'Fetching weather data...') :
              'Loading complete'
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
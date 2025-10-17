import React, { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Thermometer, Droplets, Wind, CloudRain, Sun, Hand, Info, Flame, Sunrise as SunriseIcon, Sunset as SunsetIcon, Settings as SettingsIcon, Crosshair, Moon, X, TrendingUp, Cloud, CloudFog, UserRound, Calendar, Lightbulb, Activity, Clock, Gauge } from "lucide-react";
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { computeSunEvents } from "./utils/solar";
import { GEAR_INFO, GEAR_ICONS } from "./utils/gearData";
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Label, Switch, SegmentedControl, ProgressBar, Toast } from "./components/ui";
import { ForecastCard } from "./components/weather/ForecastCard";
import { BestRunTimeCard } from "./components/running/BestRunTimeCard";
import OutfitRecommendation from "./components/running/OutfitRecommendation";
import CurrentConditions from "./components/weather/CurrentConditions";
import WeatherGauge from "./components/weather/WeatherGauge";
import WeatherMetrics from "./components/weather/WeatherMetrics";
import { Header, AppShell, LoadingSplash } from "./components/layout";
import { APP_VERSION, DEFAULT_PLACE, DEFAULT_SETTINGS, FORECAST_ALERT_META } from "./utils/constants";
import { clamp, round1 } from "./utils/helpers";
import { fetchWeather as fetchWeatherService } from "./services/weatherApi";
import { reverseGeocode as reverseGeocodeService, searchCity as searchCityService, ipLocationFallback as ipLocationService } from "./services/geocodingApi";
import { computeScoreBreakdown, calculateRoadConditions, makeApproachTips } from "./utils/runScore";
import { getRunningCondition } from "./utils/conditions";
import { scoreLabel, scoreBasedTone, scoreTone, dewPointF, computeRunningScore } from "./utils/scoring";
import { handsLevelFromGear, handsLabel, handsTone, chooseSocks, calculateEffectiveTemp } from "./utils/outfit/outfitHelpers";

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

// --- Helper functions extracted to utils/ ---
// getRunningCondition, scoring functions, outfit helpers now imported from utils/

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
export const HEAT_PENALTY_MAX_TEMP = 85; // Temperature (°F) where heat penalty reaches maximum (99 points)
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

// --- Scoring functions (dewPointF, computeRunningScore, scoreLabel, scoreTone, scoreBasedTone, lerpColor) ---
// All moved to utils/scoring.js and imported at top of file

// --- Hands/Socks Helpers (handsLevelFromGear, handsLabel, handsTone, chooseSocks, calculateEffectiveTemp) ---
// All moved to utils/outfit/outfitHelpers.js and imported at top of file

/*
  RunFit Wardrobe — Single-file React (App.jsx)
  CHANGELOG:
  - Gender toggle (Female/Male) added for more personalized gear recommendations.
  - UI layout cleaned up into a more intuitive multi-column dashboard.
  - "Need-to-know" card moved next to the visual figure for better context.
  - Outfit algorithm refined for clarity and gender-specific logic.
  - Defaults to °F, Kansas City, MO, and "Female" profile.
*/

// --- Core outfit recommendation functions below ---
// (handsLevelFromGear, handsLabel, handsTone, chooseSocks, calculateEffectiveTemp now imported from utils/outfit/outfitHelpers.js)

function baseLayersForTemp(adjT, gender) {
  const base = new Set();
  if (gender === 'Female') base.add('sports_bra');

  // Extreme cold: 0°F and below - Maximum protection
  if (adjT < 0) {
    base.add('thermal_tights');
    base.add('long_sleeve');
    base.add('insulated_jacket');
    base.add('balaclava');  // Full face coverage
    base.add('beanie');     // Layer over balaclava
    base.add('neck_gaiter');
    base.add('mittens');
    base.add('mittens_liner');
  }
  // Very cold: 0-10°F - Balaclava recommended
  else if (adjT < 10) {
    base.add('thermal_tights');
    base.add('long_sleeve');
    base.add('insulated_jacket');
    base.add('balaclava');  // Face protection crucial
    base.add('neck_gaiter');
    base.add('mittens');
    base.add('mittens_liner');
  }
  // Very cold: 10-20°F - Heavy insulation
  else if (adjT < 20) {
    base.add('thermal_tights');
    base.add('long_sleeve');
    base.add('insulated_jacket');
    base.add('beanie');     // Full ear coverage
    base.add('neck_gaiter');
    base.add('mittens');
  }
  // Cold: 20-32°F - Standard winter gear
  else if (adjT < 32) {
    base.add('thermal_tights');
    base.add('long_sleeve');
    base.add('vest');
    base.add('beanie');
    base.add('medium_gloves');
    base.add('neck_gaiter');
  }
  // Cool: 32-38°F - Transition zone
  else if (adjT < 38) {
    base.add('tights');
    base.add('long_sleeve');
    base.add('vest');
    base.add('headband');   // Ear protection
    base.add('light_gloves');
  }
  else if (adjT < 45) {
    base.add('tights');
    base.add('long_sleeve');
    base.add('headband');
    base.add('light_gloves');
  } else if (adjT < 52) {
    base.add('tights');
    base.add('long_sleeve');
    base.add('light_gloves');
  } else if (adjT < 62) {
    base.add('shorts');
    base.add('short_sleeve');
  } else if (adjT < 70) {
    base.add('shorts');
    if (gender === 'Female') base.add('tank_top');
    else base.add('short_sleeve');
  } else {
    base.add('split_shorts');
    base.add('cap');
    if (gender === 'Female') base.add('tank_top');
  }

  return base;
}

// --- Core Outfit Logic ---
function outfitFor({ apparentF, humidity, windMph, precipProb, precipIn, uvIndex, isDay = true }, workout, coldHands, gender, longRun = false, hourlyForecast = [], tempSensitivity = 0) {
  const coldHandSeed = new Set();
  const T = apparentF;
  
  // Calculate effective temperature with all weather factors
  const effectiveT = calculateEffectiveTemp({ apparentF, humidity, windMph, uvIndex, precipProb, isDay }, tempSensitivity);
  
  // Analyze next 1-2 hours for long runs
  let tempChange = 0;
  let maxPrecipProb = precipProb;
  let maxUV = uvIndex;
  let willRain = precipProb > 50 || precipIn > 0.05;
  
  if (longRun && hourlyForecast.length > 1) {
    // Look ahead 2 hours (indices 1 and 2)
    for (let i = 1; i <= Math.min(2, hourlyForecast.length - 1); i++) {
      const future = hourlyForecast[i];
      if (future.apparent != null) {
        const futureTemp = future.apparent;
        tempChange = Math.max(tempChange, futureTemp - T);
      }
      if (future.precipProb != null) maxPrecipProb = Math.max(maxPrecipProb, future.precipProb);
      if (future.precip != null && future.precip > 0.05) willRain = true;
      if (future.uv != null) maxUV = Math.max(maxUV, future.uv);
    }
  }
  
  // Workouts feel warmer: +10°F adjustment to effective temp
  // Long runs: moderate boost considering temp rise
  const adjT = workout ? effectiveT + 10 : longRun ? effectiveT + Math.min(tempChange * 0.5, 5) : effectiveT;
  const baseEasy = baseLayersForTemp(effectiveT, gender);
  const baseWorkout = baseLayersForTemp(effectiveT + 10, gender);
  const baseLongRun = baseLayersForTemp(adjT, gender);
  const baseGear = workout ? baseWorkout : longRun ? baseLongRun : baseEasy;
  const gear = new Set(baseGear);

  // Adaptive outer layer for cold, breezy, or damp conditions
  if (effectiveT <= 35 && !gear.has('light_jacket') && (windMph >= 10 || precipProb > 30 || precipIn > 0.02)) {
    gear.add('light_jacket');
  }
  if (effectiveT <= 42 && !gear.has('vest') && windMph >= 8) {
    gear.add('vest');
  }

  // --- 2. Weather Condition Modifiers ---
  // Rain protection: prioritize brim cap over regular cap for rain
  if (precipProb > 50 || precipIn > 0.05 || (longRun && willRain)) { 
    gear.add("rain_shell").add("brim_cap"); 
  }
  
  // --- Enhanced Wind Logic: Research-backed windbreaker recommendations ---
  // Based on ambient temperature and wind speed analysis
  // 
  // Key findings:
  // - 60°F+: NEVER recommend windbreaker (too warm)
  // - 55-59°F: Optional/situational across all wind speeds
  // - 50°F: Recommended with base layer at 10+ mph
  // - 45°F and below: Recommended with base layer across all conditions
  // - 35°F and below: Essential + midlayer needed
  
  const ambientTemp = apparentF; // Use apparent temp as proxy for ambient
  
  // NEVER recommend windbreaker above 59°F
  if (ambientTemp >= 60) {
    // Skip windbreaker entirely - too warm
  } else {
    const needsWindbreaker = (() => {
      // 55-59°F: Optional/situational - only add if very windy and long run
      if (ambientTemp >= 55) {
        return longRun && windMph >= 20;
      }
      
      // 50-54°F: Recommended at 10+ mph (needs base layer)
      if (ambientTemp >= 50) {
        return windMph >= 10 && !gear.has("rain_shell");
      }
      
      // 40-49°F: Recommended with base layer
      if (ambientTemp >= 40) {
        return !gear.has("rain_shell") && !gear.has("light_jacket");
      }
      
      // 35-39°F: Essential + midlayer
      if (ambientTemp >= 35) {
        // At this temp, ensure we have midlayer (long sleeve)
        if (!gear.has("long_sleeve") && !gear.has("light_jacket")) {
          gear.add("long_sleeve");
        }
        return !gear.has("rain_shell") && !gear.has("light_jacket");
      }
      
      // Below 35°F: Essential + midlayer (but jacket may be better choice)
      if (ambientTemp < 35) {
        // Prefer light jacket over windbreaker in very cold conditions
        return false; // Let jacket logic handle this
      }
      
      return false;
    })();
    
    if (needsWindbreaker) {
      gear.add("windbreaker");
    }
  }
  
  // Below windbreaker range in windy/cold conditions: add vest for core wind protection
  if (windMph >= 15 && ambientTemp < 35 && !gear.has("windbreaker") && !gear.has("rain_shell") && !gear.has("light_jacket")) {
    gear.add("vest"); // Wind vest for very cold + windy
  }
  // Sun protection: only add cap if we don't already have brim_cap (brim provides better sun protection)
  if (uvIndex >= 7 || (longRun && maxUV >= 6)) { 
    if (!gear.has("brim_cap")) {
      gear.add("cap");
    }
    gear.add("sunglasses").add("sunscreen");
  }
  if (humidity >= 75 && T >= 65) { gear.add("anti_chafe").add("hydration"); }
  
  // --- Enhanced Arm Sleeves Logic: Research-backed recommendations ---
  // Based on temperature, UV index, humidity, and wind conditions
  // Sources: NWS wind-chill guidance, CDC UV protection, running physiology research
  
  const feelsLike = effectiveT;
  const isLowHumidity = humidity < 50; // Dry air enhances evaporative cooling
  const isHighHumidity = humidity >= 75; // High humidity reduces sweat evaporation
  
  let needsArmSleeves = false;
  let armSleevesOptional = false;
  
  // Temperature-based logic (thermal protection)
  if (feelsLike < 45) {
    // Cold: thermal or brushed knit sleeves to cut convective heat loss
    needsArmSleeves = true;
  } else if (feelsLike >= 45 && feelsLike <= 60) {
    // Moderate: lightweight sleeves for comfort, warm-up, early miles
    armSleevesOptional = true;
  }
  // Above 60°F: skip for heat unless UV dictates otherwise (handled below)
  
  // UV Index-based logic (sun protection) - overrides temperature in some cases
  if (uvIndex >= 8) {
    // Very high to extreme UV: UPF 50+ sleeves strongly recommended
    needsArmSleeves = true;
  } else if (uvIndex >= 3 && uvIndex < 8) {
    // Moderate to high UV: UPF 30-50+ sleeves recommended
    if (feelsLike <= 60 || (longRun && maxUV >= 6)) {
      // Add if temp allows or on long runs with sustained UV exposure
      needsArmSleeves = true;
    } else if (feelsLike > 60) {
      // Hot weather: only if UV justifies it
      armSleevesOptional = true;
    }
  }
  // UV 0-2 (low): optional, minimal UV risk
  
  // Environmental modifiers
  if (feelsLike > 60 && isLowHumidity && uvIndex >= 3) {
    // Full sun + dry air: thin UPF sleeves for evaporative cooling
    needsArmSleeves = true;
    armSleevesOptional = false; // Override optional status
  }
  
  if (feelsLike > 60 && isHighHumidity && uvIndex < 8) {
    // Hot + humid: avoid unless UV is very high (reduces sweat evaporation, feels clammy)
    needsArmSleeves = false;
    armSleevesOptional = uvIndex >= 3; // Only optional if moderate UV
  }
  
  // Windy & cool: wind accelerates heat loss from bare skin
  if (feelsLike < 60 && windMph >= 15) {
    needsArmSleeves = true;
    armSleevesOptional = false;
  }
  
  // Long run specific: temperature swings or extended UV exposure
  if (longRun) {
    if (tempChange > 8) {
      // Versatile for temp swings - can remove mid-run
      armSleevesOptional = true;
    }
    if (maxUV >= 6 && feelsLike <= 65) {
      // Extended UV exposure on long runs
      needsArmSleeves = true;
    }
  }
  
  // Add arm sleeves with optional marker if applicable
  if (needsArmSleeves) {
    gear.add("arm_sleeves");
  } else if (armSleevesOptional) {
    gear.add("arm_sleeves_optional");
  }
  
  // --- Enhanced Cold Weather Headgear Logic ---
  // Adjust headgear based on wind chill and run type
  const calculateWindChill = (temp, wind) => {
    if (temp > 50 || wind < 3) return temp;
    return 35.74 + 0.6215 * temp - 35.75 * Math.pow(wind, 0.16) + 0.4275 * temp * Math.pow(wind, 0.16);
  };
  
  const windChill = calculateWindChill(effectiveT, windMph);
  
  // At 20°F or below with wind: upgrade to balaclava or add gaiter
  if (effectiveT <= 20 && windMph >= 15) {
    if (workout) {
      // Hard workouts: lightweight balaclava for breathability
      gear.add("balaclava");
      gear.delete("beanie"); // Replace beanie with balaclava
    } else if (longRun) {
      // Long runs: beanie + gaiter combo for adjustability
      gear.add("neck_gaiter");
    } else {
      // Easy runs: beanie + gaiter, can adjust as needed
      gear.add("neck_gaiter");
    }
  }
  
  // At 10°F or below: ensure face protection
  if (effectiveT <= 10) {
    if (workout) {
      gear.add("balaclava");
      gear.delete("beanie");
    } else {
      gear.add("balaclava");
      if (longRun) {
        // Long runs may need backup layer
        gear.add("neck_gaiter");
      }
    }
  }
  
  // At 0°F or below: maximum head/face protection
  if (effectiveT <= 0 || windChill <= 0) {
    gear.add("balaclava");
    if (!workout) {
      // Easy/long runs get beanie over balaclava
      gear.add("beanie");
    }
    gear.add("neck_gaiter");
  }
  
  // Downgrade headgear for workouts in milder cold (they generate more heat)
  if (workout && effectiveT > 20 && effectiveT < 35) {
    if (gear.has("beanie") && windMph < 10) {
      gear.delete("beanie");
      gear.add("headband"); // Ear band sufficient for hard efforts
    }
  }
  
  // Long run specific additions
  if (longRun) {
    gear.add("hydration"); // Always bring water on long runs
    gear.add("anti_chafe"); // Extended friction = always use
    if (T > 50) gear.add("energy_nutrition"); // Fuel for longer efforts
    // Only suggest rain shell if there's a reasonable chance of rain (>30%) and we don't already have it
    if (maxPrecipProb > 50 && !gear.has("rain_shell")) {
      gear.add("rain_shell");
    }
  }

  // --- 3. Personalization: Cold Hands ---
  // When cold hands is enabled, use more sensitive thresholds that trigger warmer protection earlier
  // Use effectiveT for threshold comparisons to account for user sensitivity
  const gloveThresholds = coldHands ? {
    light: COLD_HANDS_LIGHT_GLOVES_THRESHOLD,
    medium: COLD_HANDS_MEDIUM_GLOVES_THRESHOLD,
    mittens: COLD_HANDS_MITTENS_THRESHOLD,
    liner: COLD_HANDS_MITTENS_LINER_THRESHOLD,
    windLight: COLD_HANDS_WIND_GLOVES_THRESHOLD,
    windMedium: COLD_HANDS_WIND_MEDIUM_THRESHOLD,
    windMittens: COLD_HANDS_WIND_MITTENS_THRESHOLD,
  } : {
    light: LIGHT_GLOVES_TEMP_THRESHOLD,
    medium: MEDIUM_GLOVES_TEMP_THRESHOLD,
    mittens: MITTENS_TEMP_THRESHOLD,
    liner: MITTENS_LINER_TEMP_THRESHOLD,
    windLight: WIND_GLOVES_THRESHOLD,
    windMedium: WIND_MEDIUM_GLOVES_THRESHOLD,
    windMittens: WIND_MITTENS_THRESHOLD,
  };
  
  // Additional adjustment for cold hands: if user has cold hands, make them feel 3°F colder for glove decisions
  const gloveAdjT = coldHands ? adjT - 3 : adjT;
  
  // Determine required hand protection level based on adjusted temp (accounts for workout warmth + temp sensitivity)
  // Hard rule: never wear gloves when adjusted temp is 60°F or above (unless cold hands makes it feel colder)
  let requiredLevel = null;
  if (gloveAdjT < 60) {
    if (gloveAdjT < gloveThresholds.liner) {
      requiredLevel = "mittens_liner";
    } else if (gloveAdjT < gloveThresholds.mittens || windMph >= gloveThresholds.windMittens) {
      requiredLevel = "mittens";
    } else if (gloveAdjT < gloveThresholds.medium || windMph >= gloveThresholds.windMedium) {
      requiredLevel = "medium_gloves";
    } else if (gloveAdjT < gloveThresholds.light || windMph >= gloveThresholds.windLight) {
      requiredLevel = "light_gloves";
    }
  }
  
  // Apply the required level, clearing lower levels and marking cold-hands-driven additions
  if (requiredLevel) {
    // Clear all existing glove items
    gear.delete("light_gloves");
    gear.delete("medium_gloves");
    gear.delete("mittens");
    gear.delete("mittens_liner");
    
    // Add the required level and mark if it's due to cold hands preference
    if (requiredLevel === "mittens_liner") {
      gear.add("mittens");
      gear.add("mittens_liner");
      if (coldHands) {
        coldHandSeed.add("mittens");
        coldHandSeed.add("mittens_liner");
      }
    } else if (requiredLevel === "mittens") {
      gear.add("mittens");
      if (coldHands) coldHandSeed.add("mittens");
    } else if (requiredLevel === "medium_gloves") {
      gear.add("medium_gloves");
      if (coldHands) coldHandSeed.add("medium_gloves");
    } else if (requiredLevel === "light_gloves") {
      gear.add("light_gloves");
      if (coldHands) coldHandSeed.add("light_gloves");
    }
  }

  // --- 4. Define Gear Labels & Display Order ---
  const labels = {
    thermal_tights: "Thermal tights", long_sleeve: "Long-sleeve base", insulated_jacket: "Insulated jacket", neck_gaiter: "Neck gaiter", mittens: "Mittens", mittens_liner: "Glove liner (under mittens)",
    tights: "Running tights", vest: "Short-sleeve tech tee", light_jacket: "Light jacket", light_gloves: "Light gloves", medium_gloves: "Medium gloves", headband: "Ear band",
    shorts: "Shorts", split_shorts: "Split shorts", short_sleeve: "Short-sleeve tech tee", tank_top: "Tank top", sports_bra: "Sports bra",
    cap: "Cap", brim_cap: "Cap for rain", rain_shell: "Packable rain shell", windbreaker: "Windbreaker", sunglasses: "Sunglasses", sunscreen: "Sunscreen",
    hydration: "Bring water", anti_chafe: "Anti-chafe balm", light_socks: "Light socks", heavy_socks: "Heavy socks", double_socks: "Double socks (layered)", beanie: "Beanie", balaclava: "Balaclava",
    arm_sleeves: "Arm sleeves", arm_sleeves_optional: "Arm sleeves (Optional)", energy_nutrition: "Energy gels/chews",
  };
  const perfOrder = ["sports_bra", "tank_top", "short_sleeve", "long_sleeve", "vest", "light_jacket", "insulated_jacket", "split_shorts", "shorts", "tights", "thermal_tights", "cap", "brim_cap", "headband", "beanie", "arm_sleeves", "arm_sleeves_optional", "light_gloves", "medium_gloves", "mittens", "mittens_liner", "windbreaker", "rain_shell", "sunglasses", "sunscreen", "hydration", "energy_nutrition", "anti_chafe", "light_socks", "heavy_socks", "double_socks", "neck_gaiter"];
  const comfortOrder = ["sports_bra", "short_sleeve", "long_sleeve", "tank_top", "light_jacket", "insulated_jacket", "vest", "tights", "thermal_tights", "shorts", "split_shorts", "beanie", "headband", "cap", "brim_cap", "arm_sleeves", "arm_sleeves_optional", "mittens", "mittens_liner", "medium_gloves", "light_gloves", "heavy_socks", "light_socks", "double_socks", "neck_gaiter", "windbreaker", "rain_shell", "sunglasses", "sunscreen", "hydration", "energy_nutrition", "anti_chafe"];

  // --- 5. Generate Performance vs. Comfort Options ---
  const perf = new Set(gear);
  const cozy = new Set(gear);
  const perfTags = new Set(coldHandSeed);
  const cozyTags = new Set(coldHandSeed);

  // Clean up headwear conflicts before performance/comfort tweaks
  // Priority: brim_cap > cap (brim provides better sun and rain protection)
  if (perf.has('brim_cap') && perf.has('cap')) {
    perf.delete('cap');
  }
  if (cozy.has('brim_cap') && cozy.has('cap')) {
    cozy.delete('cap');
  }

  // Clean up outerwear conflicts
  // Priority: rain_shell > windbreaker (rain shell provides wind + rain protection)
  if (perf.has('rain_shell') && perf.has('windbreaker')) {
    perf.delete('windbreaker');
  }
  if (cozy.has('rain_shell') && cozy.has('windbreaker')) {
    cozy.delete('windbreaker');
  }

  // Performance tweaks (bias: lighter, less restrictive)
  if (perf.has('insulated_jacket') && (workout || effectiveT > 15)) { perf.delete('insulated_jacket'); perf.add('light_jacket'); }
  if (perf.has('vest') && perf.has('light_jacket')) perf.delete('vest');
  // Prevent both light_jacket and insulated_jacket at the same time
  if (perf.has('light_jacket') && perf.has('insulated_jacket')) perf.delete('light_jacket');
  if (perf.has('mittens_liner')) {
    perf.delete('mittens_liner');
    perfTags.delete('mittens_liner');
  }
  if (perf.has('mittens') && effectiveT > 25) {
    perf.delete('mittens');
    if (perfTags.has('mittens')) {
      perfTags.delete('mittens');
      if (coldHands) perfTags.add('medium_gloves');
    }
    perf.add('medium_gloves');
  }
  if (perf.has('medium_gloves') && effectiveT > 40) {
    perf.delete('medium_gloves');
    if (perfTags.has('medium_gloves')) {
      perfTags.delete('medium_gloves');
      if (coldHands) perfTags.add('light_gloves');
    }
    perf.add('light_gloves');
  }
  // Performance removes light gloves, but respects cold hands preference
  if (perf.has('light_gloves') && gloveAdjT > 50) {
    perf.delete('light_gloves');
    perfTags.delete('light_gloves');
  }
  if (perf.has('vest') && effectiveT >= 38 && windMph < 10) {
    perf.delete('vest');
  }
  if (perf.has('tights') && effectiveT >= 40 && effectiveT < 45 && windMph < 10) {
    perf.delete('tights');
    perf.add('shorts');
  }
  if (perf.has('tights') && effectiveT >= 45) { perf.delete('tights'); perf.add('shorts'); }
  if (perf.has('long_sleeve') && effectiveT >= 52) { perf.delete('long_sleeve'); perf.add('short_sleeve'); }
  if (gender === 'Male') {
    if (workout && effectiveT >= 50) {
      perf.delete('long_sleeve');
      perf.delete('short_sleeve');
      perf.delete('tank_top');
    } else if (!workout && effectiveT > 60) {
      perf.delete('short_sleeve');
      perf.delete('tank_top');
    }
  }

  // Comfort tweaks (bias: warmer, more coverage)
  if (effectiveT <= 35 && !cozy.has('light_jacket')) cozy.add('light_jacket');
  if (effectiveT <= 42 && !cozy.has('vest')) cozy.add('vest');
  if (cozy.has('light_jacket') && (windMph >= 10 || effectiveT < 45)) cozy.add('vest');
  // Prevent both light_jacket and insulated_jacket at the same time
  if (cozy.has('light_jacket') && cozy.has('insulated_jacket')) cozy.delete('light_jacket');
  if (cozy.has('light_gloves') && effectiveT < 40) {
    cozy.delete('light_gloves');
    cozyTags.delete('light_gloves');
    cozy.add('medium_gloves');
    if (coldHands) cozyTags.add('medium_gloves');
  }
  if (cozy.has('medium_gloves') && effectiveT < 25) {
    cozy.delete('medium_gloves');
    cozyTags.delete('medium_gloves');
    cozy.add('mittens');
    if (coldHands) cozyTags.add('mittens');
  }
  if (effectiveT < 10) {
    cozy.add('mittens_liner');
    if (coldHands) cozyTags.add('mittens_liner');
  }
  if (effectiveT < 33 || windMph >= 18) cozy.add('neck_gaiter');
  if (gender === 'Male' && adjT >= 70) cozy.add('short_sleeve'); // Ensure men have a shirt for comfort

  // --- 6. Finalize Socks & Sort Output ---
  const sockLevel = chooseSocks({ apparentF: T, precipIn, precipProb, windMph, humidity });
  [
    { set: perf, tags: perfTags },
    { set: cozy, tags: cozyTags },
  ].forEach(({ set, tags }) => {
    // Clear all sock options
    set.delete('light_socks');
    set.delete('heavy_socks');
    set.delete('double_socks');
    // Add the determined level
    set.add(sockLevel);
  });

  const sortByOrder = (keys, order) => keys.sort((a, b) => (order.indexOf(a) ?? 99) - (order.indexOf(b) ?? 99));

  const formatOptionList = (set, order, tags) =>
    sortByOrder(Array.from(set), order).map((k) => ({
      key: k,
      label: labels[k] || k,
      coldHands: tags.has(k),
    }));

  // --- 7. Generate Final Results ---
  const optionA = formatOptionList(perf, perfOrder, perfTags);
  const optionB = formatOptionList(cozy, comfortOrder, cozyTags);
  return { optionA, optionB, handsLevel: handsLevelFromGear(Array.from(cozy)), sockLevel };
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
  const [loading, setLoading] = useState(false);
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
  const [tomorrowCardOption, setTomorrowCardOption] = useState('A'); // 'A' = Performance, 'B' = Comfort
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
  
  // Splash screen loading state
  const [showSplash, setShowSplash] = useState(true);
  const [splashProgress, setSplashProgress] = useState(0);
  const [splashStage, setSplashStage] = useState('Initializing...');

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
      fetchWeather(p, unit); // Don't await, let it run
      
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
  };

  // Save settings to localStorage whenever they change
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
    setLoading(true); 
    setError("");
    try {
      const weatherData = await fetchWeatherService(p, u);
      setWx(weatherData);
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
      const name = await reverseGeocodeService(lat, lon);
      if (name) {
        setPlace((p) => ({ ...p, name }));
        setQuery(name);
      }
    } catch (e) {
      console.warn('Reverse geocode failed', e);
    }
  };

  const ipLocationFallback = async () => {
    try {
      setSplashProgress(30);
      setSplashStage('Finding your location...');
      
      const locationResult = await ipLocationService(DEFAULT_PLACE);
      
      setSplashProgress(50);
      setSplashStage('Fetching weather data...');
      
      setPlace(locationResult); 
      setQuery(locationResult.name); 
      await fetchWeather(locationResult, unit);
      
      setSplashProgress(80);
      setSplashStage('Calculating conditions...');
      
      if (locationResult.isApproximate) {
        setError("Using approximate location. For GPS, enable location permissions.");
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setSplashProgress(100);
      setSplashStage('Ready!');
    } catch (e) {
      setSplashProgress(70);
      setSplashStage('Loading default location...');
      
      setError("Couldn't get your location. Please search a city.");
      await fetchWeather(DEFAULT_PLACE, unit);
      
      setSplashProgress(100);
      setSplashStage('Ready!');
    }
  };

  const tryGeolocate = async () => {
    setLoading(true); setError("");
    setSplashProgress(10);
    setSplashStage('Getting location...');
    
    try {
      if (!("geolocation" in navigator) || !window.isSecureContext) { 
        await ipLocationFallback(); 
        return; 
      }
      
      setSplashProgress(30);
      const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }));
      const { latitude, longitude } = pos.coords;
      
      setSplashProgress(50);
      setSplashStage('Fetching weather data...');
      
      // Set a temporary name and start weather fetch immediately
      const p = { name: "Current location", lat: latitude, lon: longitude, source: 'gps' };
      setPlace(p); 
      setQuery("Current location");
      
      await fetchWeather(p, unit);
      
      setSplashProgress(80);
      setSplashStage('Calculating conditions...');
      
      // Now, try to get a better name without blocking the UI
      reverseGeocode(latitude, longitude);
      
      // Small delay for smooth transition
      await new Promise(resolve => setTimeout(resolve, 500));
      setSplashProgress(100);
      setSplashStage('Ready!');
      
      // Hide splash after a brief moment
      setTimeout(() => setShowSplash(false), 300);

    } catch (err) { 
      await ipLocationFallback();
      setSplashProgress(100);
      setTimeout(() => setShowSplash(false), 300);
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { tryGeolocate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  const searchCity = async () => {
    setLoading(true); 
    setError("");
    try {
      const locationResult = await searchCityService(query);
      setPlace(locationResult); 
      fetchWeather(locationResult, unit);
    } catch (e) { 
      setError(e.message || "Couldn't find that place."); 
    } finally { 
      setLoading(false); 
    }
  };

  const derived = useMemo(() => {
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
  
  const breakdown = computeScoreBreakdown(
    scoreWeatherData,
    workout,
    coldHands,
    recs.handsLevel,
    longRun
  );
  
  // Debug: Check what's in wx object vs hourly forecast
  console.log('☀️ Solar Radiation Debug:', {
    current_solarRadiation: wx.solarRadiation,
    current_isDay: wx.isDay,
    current_uv: wx.uv,
    current_cloud: wx.cloud,
    hourly_sample: wx.hourlyForecast?.slice(0, 12).map((h, i) => ({
      hour: i,
      temp: h.temperature?.toFixed(1),
      solar: h.solarRadiation?.toFixed(1),
      uv: h.uv?.toFixed(1)
    }))
  });
  
  const score = breakdown.score;

  const displayApparent = Number.isFinite(usedApparentF)
    ? (unit === "F" ? usedApparentF : ((usedApparentF - 32) * 5) / 9)
    : null;
  const dpF = dewPointF(tempFWx, wx.humidity);
  const dewPointDisplay = Number.isFinite(dpF)
    ? (unit === "F" ? dpF : (dpF - 32) * 5 / 9)
    : null;
  
  // WBGT comes from breakdown (comprehensive calculation when pressure/solar available)
  const wbgtF = breakdown?.wbF;
  
  // Only show WBGT when feels-like temp is >= 50°F (heat stress becomes relevant)
  // Below 50°F, use feels-like temperature for cold assessment
  const useWBGT = Number.isFinite(wbgtF) && usedApparentF >= 50;
  
  const effectiveTempF = useWBGT ? wbgtF : usedApparentF;
  const effectiveTempDisplay = Number.isFinite(effectiveTempF)
    ? (unit === "F" ? effectiveTempF : (effectiveTempF - 32) * 5 / 9)
    : null;
  const effectiveTempLabel = useWBGT ? "WBGT" : "Feels Like";

  const roadConditions = calculateRoadConditions({
    tempF: tempFWx,
    apparentF: usedApparentF,
    precipProb: wx.precipProb,
    precip: wx.precip,
    cloudCover: wx.cloud || 0,
  });

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

      const slotBreakdown = computeScoreBreakdown(
        {
          tempF: slotTempF,
          apparentF: slotApparentF,
          humidity: slotHumidity,
          windMph: slotWind,
          precipProb: slotPrecipProb,
          precipIn: slotPrecip,
          uvIndex: slotUv,
          cloudCover: slotCloud,
          pressure: typeof slot.pressure === "number" ? slot.pressure : wx.pressure,
          solarRadiation: typeof slot.solarRadiation === "number" ? slot.solarRadiation : 0,
        },
        workout,
        coldHands,
        slotOutfit.handsLevel
      );

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

  const tone = scoreBasedTone(getDisplayedScore(score, runnerBoldness));
  
  // Find best run time for today and tomorrow within user-defined hours
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
      const slotTemp = typeof slot.temperature === 'number' ? slot.temperature : slot.apparent;
      const slotApparentF = toF(slot.apparent);
      const slotHumidity = typeof slot.humidity === 'number' ? slot.humidity : wx.humidity;
      const slotWind = typeof slot.wind === 'number' ? slot.wind : wx.wind;
      const slotPrecipProb = typeof slot.precipProb === 'number' ? slot.precipProb : 0;
      const slotPrecip = typeof slot.precip === 'number' ? slot.precip : 0;
      const slotUv = typeof slot.uv === 'number' ? slot.uv : 0;
      
      if (!Number.isFinite(slotApparentF)) continue;
      
      const slotOutfit = outfitFor(
        {
          apparentF: slotApparentF,
          humidity: slotHumidity,
          windMph: slotWind,
          precipProb: slotPrecipProb,
          precipIn: slotPrecip,
          uvIndex: slotUv,
          isDay: true,
        },
        workout,
        coldHands,
        gender,
        false,
        [],
        tempSensitivity
      );
      
      const slotBreakdown = computeScoreBreakdown(
        {
          tempF: toF(slotTemp),
          apparentF: slotApparentF,
          humidity: slotHumidity,
          windMph: slotWind,
          precipProb: slotPrecipProb,
          precipIn: slotPrecip,
          uvIndex: slotUv,
          cloudCover: wx.cloud || 50,
          pressure: slot.pressure || wx.pressure,
          solarRadiation: slot.solarRadiation || 0,
        },
        workout,
        coldHands,
        slotOutfit.handsLevel
      );
      
      const slotScore = slotBreakdown.score;
      const candidate = {
        time: slotTime,
        score: slotScore,
        apparentF: slotApparentF,
        wind: slotWind,
        precipProb: slotPrecipProb,
        uv: slotUv,
      };
      
      // Categorize by day
      if (slotTime >= todayStart && slotTime < tomorrowStart && slotTime >= now) {
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
    effectiveTempDisplay,
    effectiveTempLabel,
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
    bestRunTimes,
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

  const apparentForCondition = derived && Number.isFinite(derived.displayApparent)
    ? Math.round(derived.displayApparent)
    : null;
  
  // Use WBGT for warm weather (≥50°F feels-like), feels-like for cold weather
  const useWBGTForCondition = apparentForCondition != null && apparentForCondition >= 50;
  const conditionTemp = useWBGTForCondition 
    ? (derived?.wbgtF != null ? Math.round(derived.wbgtF) : apparentForCondition)
    : apparentForCondition;
  
  const condition = derived && conditionTemp != null
    ? getRunningCondition(conditionTemp, useWBGTForCondition)
    : null;

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
    <>
      <AnimatePresence>
        {showSplash && (
          <LoadingSplash
            isLoading={showSplash}
            progress={splashProgress}
            stage={splashStage}
          />
        )}
      </AnimatePresence>

      <AppShell
        pageThemeClass={pageThemeClass}
        pageVariants={pageVariants}
        showRefreshToast={showRefreshToast}
      >
        <Header 
          onSettingsClick={() => setShowSettings(true)}
          cardVariants={cardVariants}
        />

        {/* Smart Night Running Card - Shows at top when enabled and conditions are met */}
        {smartNightCard && derived?.moonPhase && (() => {
          const moonLight = derived.moonPhase.illuminationPct;
          const skyClarity = 100 - (wx?.cloud || 0);
          const humidity = wx?.humidity || 0;
          const tempDewDiff = Math.abs((wx?.temperature || 0) - (derived?.dewPointDisplay || 0));
          const isFoggy = humidity > 90 && tempDewDiff < 3;
          const fogFactor = isFoggy ? 0.3 : humidity > 90 && tempDewDiff < 8 ? 0.6 : 1.0;
          const effectiveVis = Math.round((moonLight * skyClarity / 100) * fogFactor);
          const isNightTime = wx?.isDay === false;
          
          // Only show at top if it's nighttime and visibility > 75%
          if (!isNightTime || effectiveVis <= 75) {
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
                        <p>Moon at {derived.moonPhase.illuminationPct}% illumination ({derived.moonPhase.name}) provides strong natural light.</p>
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
        {isEvening && showTomorrowOutfit && derived && wx?.hourlyForecast?.length > 0 && (() => {
          const now = new Date();
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(tomorrowRunHour, 0, 0, 0);
          
          const targetTime = tomorrow.getTime();
          
          const findClosestSlot = (targetOffset) => {
            const searchTime = targetTime + targetOffset * 60 * 60 * 1000;
            return wx.hourlyForecast
              .map(slot => ({
                slot,
                time: typeof slot.time === 'number' ? slot.time : Date.parse(slot.time)
              }))
              .filter(({ time }) => Math.abs(time - searchTime) <= 90 * 60 * 1000)
              .sort((a, b) => Math.abs(a.time - searchTime) - Math.abs(b.time - searchTime))[0]?.slot;
          };
          
          const hourBefore = findClosestSlot(-1);
          const mainHour = findClosestSlot(0);
          const hourAfter = findClosestSlot(1);
          
          if (!mainHour) return null;
          
          const slots = [hourBefore, mainHour, hourAfter].filter(Boolean);
          const toF = (v) => (unit === "F" ? v : (v * 9) / 5 + 32);
          
          const avgApparent = slots.reduce((sum, s) => sum + toF(s.apparent), 0) / slots.length;
          const avgTemp = slots.reduce((sum, s) => sum + toF(s.temperature), 0) / slots.length;
          const avgWind = slots.reduce((sum, s) => sum + (typeof s.wind === 'number' ? s.wind : wx.wind), 0) / slots.length;
          const avgHumidity = slots.reduce((sum, s) => sum + (typeof s.humidity === 'number' ? s.humidity : wx.humidity), 0) / slots.length;
          const avgPrecipProb = slots.reduce((sum, s) => sum + (typeof s.precipProb === 'number' ? s.precipProb : 0), 0) / slots.length;
          const avgPrecip = slots.reduce((sum, s) => sum + (typeof s.precip === 'number' ? s.precip : 0), 0) / slots.length;
          const avgUv = slots.reduce((sum, s) => sum + (typeof s.uv === 'number' ? s.uv : 0), 0) / slots.length;
          const avgPressure = slots.reduce((sum, s) => sum + (typeof s.pressure === 'number' ? s.pressure : wx.pressure), 0) / slots.length;
          const avgSolarRadiation = slots.reduce((sum, s) => sum + (typeof s.solarRadiation === 'number' ? s.solarRadiation : 0), 0) / slots.length;
          
          const tomorrowOutfit = outfitFor(
            {
              apparentF: avgApparent,
              humidity: avgHumidity,
              windMph: avgWind,
              precipProb: avgPrecipProb,
              precipIn: avgPrecip,
              uvIndex: avgUv,
              isDay: true
            },
            tomorrowCardRunType === 'workout',
            coldHands,
            gender,
            tomorrowCardRunType === 'longRun',
            wx.hourlyForecast || [],
            tempSensitivity
          );
          
          const tomorrowBreakdown = computeScoreBreakdown(
            {
              tempF: avgTemp,
              apparentF: avgApparent,
              humidity: avgHumidity,
              windMph: avgWind,
              precipProb: avgPrecipProb,
              precipIn: avgPrecip,
              uvIndex: avgUv,
              cloudCover: wx.cloud || 50,
              pressure: avgPressure,
              solarRadiation: avgSolarRadiation,
            },
            tomorrowCardRunType === 'workout',
            coldHands,
            tomorrowOutfit.handsLevel,
            tomorrowCardRunType === 'longRun'
          );
          
          const tomorrowScore = tomorrowBreakdown.score;
          const displayTomorrowScore = getDisplayedScore(tomorrowScore, runnerBoldness);
          const tomorrowLabel = scoreLabel(displayTomorrowScore);
          const tomorrowTone = scoreBasedTone(displayTomorrowScore);
          const displayTemp = unit === "F" ? Math.round(avgApparent) : Math.round((avgApparent - 32) * 5 / 9);
          const tomorrowItems = tomorrowCardOption === 'A' ? (tomorrowOutfit.optionA || []) : (tomorrowOutfit.optionB || []);
          
          return (
            <motion.div
              variants={cardVariants}
              initial="initial"
              animate="animate"
              className="mb-6"
            >
              <Card className={`overflow-hidden border-2 shadow-xl ${
                gender === "Female"
                  ? "border-pink-300 dark:border-pink-500 bg-gradient-to-br from-pink-50 via-pink-50/50 to-pink-100/70 dark:from-pink-900/50 dark:via-pink-900/30 dark:to-pink-900/50"
                  : "border-sky-400 dark:border-sky-600 bg-gradient-to-br from-sky-100 via-blue-50 to-sky-100 dark:from-sky-900/70 dark:via-blue-900/50 dark:to-sky-900/70"
              }`}>
                <CardHeader className={`pb-8 ${
                  gender === "Female"
                    ? "bg-gradient-to-r from-pink-500 to-pink-600 dark:from-pink-600 dark:to-pink-700"
                    : "bg-gradient-to-r from-sky-600 to-blue-700 dark:from-sky-700 dark:to-blue-800"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/30 backdrop-blur-sm ring-2 ring-white/40">
                        <Calendar className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">Tomorrow's Run</div>
                        <div className={`text-sm ${
                          gender === "Female"
                            ? "text-pink-100"
                            : "text-sky-100"
                        }`}>Lay out your gear tonight</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className={`text-xs font-medium ${
                          gender === "Female"
                            ? "text-pink-100"
                            : "text-sky-100"
                        }`}>
                          {tomorrow.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-sm font-semibold text-white">
                          {tomorrowRunHour === 0 ? '12:00 AM' : tomorrowRunHour < 12 ? `${tomorrowRunHour}:00 AM` : tomorrowRunHour === 12 ? '12:00 PM' : `${tomorrowRunHour - 12}:00 PM`}
                        </div>
                      </div>
                      <motion.button
                        onClick={() => setShowTimePickerModal(true)}
                        className="rounded-lg bg-white/20 p-2 text-white hover:bg-white/30 transition-colors backdrop-blur-sm"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title="Change run time"
                      >
                        <Clock className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => { setTomorrowCardRunType('easy'); setTomorrowRunType('easy'); }}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        tomorrowCardRunType === 'easy'
                          ? 'bg-white text-pink-600 shadow-sm dark:bg-white/95 dark:text-pink-700'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      Easy
                    </button>
                    <button
                      onClick={() => { setTomorrowCardRunType('workout'); setTomorrowRunType('workout'); }}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        tomorrowCardRunType === 'workout'
                          ? 'bg-white text-pink-600 shadow-sm dark:bg-white/95 dark:text-pink-700'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      Workout
                    </button>
                    <button
                      onClick={() => { setTomorrowCardRunType('longRun'); setTomorrowRunType('longRun'); }}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        tomorrowCardRunType === 'longRun'
                          ? 'bg-white text-pink-600 shadow-sm dark:bg-white/95 dark:text-pink-700'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      Long Run
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Score display */}
                    <div className="flex items-center justify-between rounded-xl bg-white/70 dark:bg-slate-800/50 p-4">
                      <div>
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Run Score</div>
                        <div className="text-3xl font-extrabold mt-1" style={tomorrowTone.textStyle}>{displayTomorrowScore}</div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{tomorrowLabel.text}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Feels Like</div>
                        <div className="text-2xl font-bold text-slate-700 dark:text-slate-200 mt-1">{displayTemp}°{unit}</div>
                      </div>
                    </div>
                  
                  {/* Outfit items */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-700 dark:text-slate-200">Tomorrow's Outfit</h3>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setTomorrowCardOption('A')}
                          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                            tomorrowCardOption === 'A'
                              ? 'bg-sky-500 text-white dark:bg-sky-600'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                          }`}
                        >
                          Option A
                        </button>
                        <button
                          onClick={() => setTomorrowCardOption('B')}
                          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                            tomorrowCardOption === 'B'
                              ? 'bg-sky-500 text-white dark:bg-sky-600'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                          }`}
                        >
                          Option B
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {tomorrowItems.map((item) => {
                        const gearInfo = GEAR_INFO[item.key];
                        const Icon = GEAR_ICONS[item.key] || UserRound;
                        return (
                          <div
                            key={item.key}
                            className={`flex items-center gap-3 rounded-lg border p-3 ${
                              item.workout
                                ? 'border-orange-300 bg-orange-50/50 dark:border-orange-500/50 dark:bg-orange-500/10'
                                : item.longRun
                                ? 'border-purple-300 bg-purple-50/50 dark:border-purple-500/50 dark:bg-purple-500/10'
                                : 'border-slate-200 bg-white/50 dark:border-slate-700 dark:bg-slate-800/50'
                            }`}
                          >
                            {gearInfo?.image ? (
                              <img src={gearInfo.image} alt={item.label} className="h-10 w-10 flex-shrink-0 object-cover rounded-lg" />
                            ) : (
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-700">
                                <Icon className="h-5 w-5 text-gray-600 dark:text-slate-300" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-slate-800 dark:text-slate-100">{item.label}</div>
                              {item.detail && (
                                <div className="text-xs text-slate-500 dark:text-slate-400">{item.detail}</div>
                              )}
                              {item.workout && (
                                <div className="text-xs text-orange-600 dark:text-orange-400">Workout-specific</div>
                              )}
                              {item.longRun && (
                                <div className="text-xs text-purple-600 dark:text-purple-400">Long run essential</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })()}

        {/* Main Weather Card */}
        {/* Controls */}
        <motion.div variants={cardVariants}>
          <Card className="overflow-hidden">
            <CardHeader className={`bg-gradient-to-br py-3 ${
              gender === "Female"
                ? "from-pink-400/10 via-pink-500/10 to-pink-400/10 dark:from-pink-400/20 dark:via-pink-500/20 dark:to-pink-400/20"
                : "from-sky-500/10 via-blue-500/10 to-indigo-500/10 dark:from-sky-500/20 dark:via-blue-500/20 dark:to-indigo-500/20"
            }`}>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${
                    gender === "Female"
                      ? "from-pink-400 to-pink-500 dark:from-pink-400 dark:to-pink-500"
                      : "from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500"
                  }`}>
                    <Gauge className="h-4 w-4 text-white" />
                  </div>
                  Run Controls
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-slate-800">
              
              {/* Location & Score Section */}
              <div className="p-5 lg:col-span-2">
                <div className="flex flex-wrap items-start gap-3 mb-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Location</span>
                    </div>
                    <motion.button
                      onClick={handleLocationRefresh}
                      disabled={loading}
                      className="font-semibold text-lg text-gray-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left group"
                      title={`${place?.name} — Tap to refresh weather`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {formattedPlaceName || "Loading…"}
                        <svg className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </span>
                    </motion.button>
                    {debugActive && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Debug scenario
                      </span>
                    )}
                  </div>
                  
                  {/* Condition Badge with Performance Details */}
                  {derived && condition && (
                    <motion.div
                      className="group relative inline-block"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                    >
                      <span 
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-normal sm:whitespace-nowrap shrink-0 cursor-help ${condition.badgeClass}`}
                        title="Hover for performance details"
                      >
                        {condition.text}
                      </span>
                      
                      {/* Tooltip with performance and action details */}
                      {condition.performance && condition.action && (
                        <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute z-50 left-0 top-full mt-2 w-80 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xl">
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                                Performance Impact
                              </div>
                              <div className="text-sm text-gray-700 dark:text-slate-300">
                                {condition.performance}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                                Recommended Actions
                              </div>
                              <div className="text-sm text-gray-700 dark:text-slate-300">
                                {condition.action}
                              </div>
                            </div>
                          </div>
                          {/* Tooltip arrow */}
                          <div className="absolute -top-1 left-4 h-2 w-2 rotate-45 border-l border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* Score & Twilight Row */}
                {derived && (
                  <div className="flex flex-wrap items-center gap-3">
                    <motion.button 
                      onClick={() => setShowInsights(true)}
                      className="flex items-center gap-2 rounded-xl border border-gray-200/60 dark:border-slate-700 bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800/60 dark:to-slate-900/60 px-4 py-3 shadow-sm hover:border-sky-300 dark:hover:border-sky-600 transition-colors cursor-pointer"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      title="Click to view Run Score Breakdown"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Score</span>
                        <span className="text-3xl font-extrabold" style={displayedScoreProps?.tone?.textStyle}>{displayedScoreProps ? displayedScoreProps.score : '--'}</span>
                      </div>
                    </motion.button>
                    
                    {derived.twilight && (
                      <motion.div 
                        className="flex items-center gap-2 rounded-xl border border-gray-200/60 dark:border-slate-700 bg-white/80 dark:bg-slate-800/60 px-4 py-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-500/20 dark:to-orange-500/20">
                          {derived.twilight.icon === "sunset" ? (
                            <SunsetIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <SunriseIcon className="h-5 w-5 text-sky-500 dark:text-sky-400" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{derived.twilight.label}</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-bold text-gray-900 dark:text-slate-100">{derived.twilight.in}</span>
                            <span className="text-xs text-slate-400">({derived.twilight.at})</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Preferences Section */}
              <div className="p-5 bg-gradient-to-br from-gray-50/50 to-white dark:from-slate-900/50 dark:to-slate-900">
                <div className="space-y-3">
                  <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-3">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-slate-400">Run Type</div>
                    <SegmentedControl
                      value={runType}
                      onChange={setRunType}
                      options={[
                        { label: "Easy Run", value: "easy" },
                        { label: "Hard Workout", value: "workout" },
                        { label: "Long Run", value: "longRun" },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {error && (
              <motion.div 
                className="border-t border-gray-200 dark:border-slate-800 bg-red-50 dark:bg-red-500/10 px-5 py-3"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
              </motion.div>
            )}
          </CardContent>
        </Card>
        </motion.div>

        {/* Main Dashboard */}
    <motion.div 
      className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Left Column */}
      <OutfitRecommendation
        derived={derived}
        optionsDiffer={optionsDiffer}
        optionTitle={optionTitle}
        activeOption={activeOption}
        activeItems={activeItems}
        setActiveOption={setActiveOption}
        setSelectedOutfitItem={setSelectedOutfitItem}
        staggerContainer={staggerContainer}
        listItemVariants={listItemVariants}
        cardVariants={cardVariants}
      />

      <motion.div className="flex flex-col gap-6 lg:col-start-1" variants={cardVariants}>
                
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
  <motion.div variants={cardVariants}>
  <Card className="relative lg:col-start-2">
  <CardHeader className="pb-3">
    <div className="flex items-start justify-between">
      <div>
        <CardTitle className="text-xl font-bold">Performance Score</CardTitle>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {displayedScoreProps ? displayedScoreProps.label.tone : "Loading conditions..."}
        </p>
      </div>
      {displayedScoreProps && (
        <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium`} style={displayedScoreProps.tone.badgeStyle}>
          {displayedScoreProps.label.text}
        </span>
      )}
    </div>
  </CardHeader>
  <CardContent className="space-y-4">
    <WeatherGauge 
      gaugeData={gaugeData}
      displayedScoreProps={displayedScoreProps}
      setShowInsights={setShowInsights}
    />

    <WeatherMetrics
      wx={wx}
      derived={derived}
      unit={unit}
      listItemVariants={listItemVariants}
      staggerContainer={staggerContainer}
      round1={round1}
    />
  </CardContent>
</Card>
  </motion.div>
            
        <motion.div variants={cardVariants}>
          <ForecastCard derived={derived} getDisplayedScore={getDisplayedScore} runnerBoldness={runnerBoldness} className="lg:col-start-3 hidden lg:block" />
          <BestRunTimeCard derived={derived} unit={unit} getDisplayedScore={getDisplayedScore} runnerBoldness={runnerBoldness} className="lg:col-start-3 hidden lg:block" />
        </motion.div>
        </motion.div>

        {/* Night Running Conditions Card - Completely Redesigned */}
        {derived?.moonPhase && (() => {
          // Calculate effective visibility
          const moonLight = derived.moonPhase.illuminationPct;
          const skyClarity = 100 - (wx?.cloud || 0);
          const humidity = wx?.humidity || 0;
          const tempDewDiff = Math.abs((wx?.temperature || 0) - (derived?.dewPointDisplay || 0));
          const isFoggy = humidity > 85 && tempDewDiff < 5;
          const fogFactor = isFoggy ? 0.3 : humidity > 90 && tempDewDiff < 8 ? 0.6 : 1.0;
          const effectiveVis = Math.round((moonLight * skyClarity / 100) * fogFactor);
          
          // Check if it's nighttime (not day)
          const isNightTime = wx?.isDay === false;
          
          // Determine if card should show at top (smart mode) or bottom (always)
          const showAtTop = smartNightCard && isNightTime && effectiveVis > 75;
          const showAtBottom = !smartNightCard;
          
          // Don't render anything if smart mode is on but conditions aren't met
          if (smartNightCard && (!isNightTime || effectiveVis <= 75)) {
            return null;
          }
          
          return showAtTop || showAtBottom ? (
          <motion.div
            variants={cardVariants}
            initial="initial"
            animate="animate"
          >
            <Card className="mt-6 overflow-hidden">
              <CardHeader className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-blue-500/10 dark:from-indigo-500/20 dark:via-purple-500/20 dark:to-blue-500/20">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500">
                      <Moon className="h-4 w-4 text-white" />
                    </div>
                    Night Running Conditions
                  </span>
                  <span className="text-sm font-normal text-gray-600 dark:text-slate-400">
                    {derived.moonPhase.name}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Left: Moon Visualization & Data */}
                  <div className="space-y-6">
                    {/* Moon Visual with SVG */}
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative flex h-40 w-40 items-center justify-center">
                        <svg viewBox="0 0 100 100" className="h-full w-full">
                          {/* Moon base (dark side) */}
                          <circle cx="50" cy="50" r="48" fill="url(#moonDark)" className="drop-shadow-2xl" />
                          
                          {/* Moon illuminated portion */}
                          <defs>
                            <radialGradient id="moonLight">
                              <stop offset="0%" stopColor="#FEF3C7" />
                              <stop offset="50%" stopColor="#FDE68A" />
                              <stop offset="100%" stopColor="#FCD34D" />
                            </radialGradient>
                            <radialGradient id="moonDark">
                              <stop offset="0%" stopColor="#64748B" />
                              <stop offset="100%" stopColor="#1E293B" />
                            </radialGradient>
                            <clipPath id="illuminatedPart">
                              {(() => {
                                const illum = derived.moonPhase.illumination;
                                const isWaxing = derived.moonPhase.isWaxing;
                                
                                // Calculate the visible portion based on phase
                                // Full moon = circle, new moon = nothing, quarters = half
                                if (illum >= 0.99) {
                                  // Full moon - show complete circle
                                  return <circle cx="50" cy="50" r="48" />;
                                } else if (illum <= 0.01) {
                                  // New moon - show nothing
                                  return null;
                                } else if (illum === 0.5) {
                                  // Quarter moon - show exact half
                                  return isWaxing 
                                    ? <rect x="50" y="2" width="48" height="96" />
                                    : <rect x="2" y="2" width="48" height="96" />;
                                } else {
                                  // Crescent or gibbous - use ellipse
                                  const phase = derived.moonPhase.phase;
                                  let xOffset = 50;
                                  let rx = 48;
                                  
                                  if (phase < 0.5) {
                                    // Waxing (0 to 0.5) - light on right
                                    rx = 48 * (illum * 2); // Scale from 0 to 48
                                    xOffset = 50 + (48 - rx);
                                  } else {
                                    // Waning (0.5 to 1) - light on left
                                    const waningIllum = 1 - ((phase - 0.5) * 2);
                                    rx = 48 * waningIllum;
                                    xOffset = 50 - (48 - rx);
                                  }
                                  
                                  return <ellipse cx={xOffset} cy="50" rx={rx} ry="48" />;
                                }
                              })()}
                            </clipPath>
                          </defs>
                          
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="48" 
                            fill="url(#moonLight)" 
                            clipPath="url(#illuminatedPart)"
                          />
                          
                          {/* Outer ring */}
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="48" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="0.5" 
                            className="text-gray-300 dark:text-slate-600"
                          />
                        </svg>
                        
                        {/* Phase emoji overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-5xl drop-shadow-lg">{derived.moonPhase.emoji}</span>
                        </div>
                      </div>
                      
                      {/* Phase info */}
                      <div className="text-center">
                        <div className="text-xl font-bold text-gray-800 dark:text-slate-100">
                          {derived.moonPhase.illuminationPct}% Illuminated
                        </div>
                        <div className="text-sm text-gray-600 dark:text-slate-300">
                          {derived.moonPhase.daysToFull < derived.moonPhase.daysToNew
                            ? `${derived.moonPhase.daysToFull} ${derived.moonPhase.daysToFull === 1 ? 'day' : 'days'} until full moon`
                            : `${derived.moonPhase.daysToNew} ${derived.moonPhase.daysToNew === 1 ? 'day' : 'days'} until new moon`}
                        </div>
                        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                          <span>{derived.moonPhase.isWaxing ? 'Waxing' : 'Waning'}</span>
                          <span>{derived.moonPhase.isWaxing ? '→' : '←'}</span>
                          <span className="text-amber-500">●</span>
                        </div>
                      </div>
                    </div>

                    {/* Visibility Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-indigo-200/50 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-500/10 dark:to-purple-500/5 p-4">
                        <div className="text-xs font-medium uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Moon Light</div>
                        <div className="mt-1 text-3xl font-bold text-indigo-900 dark:text-indigo-100">
                          {derived.moonPhase.illuminationPct}%
                        </div>
                        <div className="mt-1 text-xs text-gray-600 dark:text-slate-400">
                          {derived.moonPhase.illumination >= 0.75 ? 'Very bright' :
                           derived.moonPhase.illumination >= 0.5 ? 'Moderate' :
                           derived.moonPhase.illumination >= 0.25 ? 'Dim' : 'Very dark'}
                        </div>
                      </div>
                      
                      <div className="rounded-xl border border-blue-200/50 dark:border-blue-500/30 bg-gradient-to-br from-blue-50/50 to-sky-50/30 dark:from-blue-500/10 dark:to-sky-500/5 p-4">
                        <div className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">Sky Clarity</div>
                        <div className="mt-1 text-3xl font-bold text-blue-900 dark:text-blue-100">
                          {(100 - (wx?.cloud || 0)).toFixed(1)}%
                        </div>
                        <div className="mt-1 text-xs text-gray-600 dark:text-slate-400">
                          {(wx?.cloud || 0) < 20 ? 'Clear skies' :
                           (wx?.cloud || 0) < 50 ? 'Partly cloudy' :
                           (wx?.cloud || 0) < 80 ? 'Mostly cloudy' : 'Overcast'}
                        </div>
                      </div>
                    </div>

                    {/* Effective Visibility Calculation */}
                    <div className="rounded-xl border-2 border-purple-200/60 dark:border-purple-500/40 bg-gradient-to-br from-purple-50/60 via-fuchsia-50/40 to-pink-50/30 dark:from-purple-500/15 dark:via-fuchsia-500/10 dark:to-pink-500/5 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-purple-900 dark:text-purple-200">
                          Effective Night Visibility
                        </div>
                        <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                          {(() => {
                            const moonLight = derived.moonPhase.illuminationPct;
                            const skyClarity = 100 - (wx?.cloud || 0);
                            const humidity = wx?.humidity || 0;
                            const tempDewDiff = Math.abs((wx?.temperature || 0) - (derived?.dewPointDisplay || 0));
                            const isFoggy = humidity > 85 && tempDewDiff < 5;
                            const fogFactor = isFoggy ? 0.3 : humidity > 90 && tempDewDiff < 8 ? 0.6 : 1.0;
                            const effectiveVis = Math.round((moonLight * skyClarity / 100) * fogFactor);
                            return `${effectiveVis}%`;
                          })()}
                        </div>
                      </div>
                      <div className="space-y-1.5 text-xs text-gray-700 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span>Moon illumination:</span>
                          <span className="font-medium">{derived.moonPhase.illuminationPct}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sky clarity:</span>
                          <span className="font-medium">{(100 - (wx?.cloud || 0)).toFixed(1)}%</span>
                        </div>
                        {(() => {
                          const humidity = wx?.humidity || 0;
                          const tempDewDiff = Math.abs((wx?.temperature || 0) - (derived?.dewPointDisplay || 0));
                          const isFoggy = humidity > 85 && tempDewDiff < 5;
                          const isHazy = humidity > 90 && tempDewDiff < 8;
                          if (isFoggy) {
                            return (
                              <div className="flex justify-between text-amber-700 dark:text-amber-300">
                                <span>Fog penalty:</span>
                                <span className="font-medium">-70%</span>
                              </div>
                            );
                          } else if (isHazy) {
                            return (
                              <div className="flex justify-between text-amber-600 dark:text-amber-400">
                                <span>Haze penalty:</span>
                                <span className="font-medium">-40%</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 transition-all duration-700"
                          style={{ 
                            width: `${(() => {
                              const moonLight = derived.moonPhase.illuminationPct;
                              const skyClarity = 100 - (wx?.cloud || 0);
                              const humidity = wx?.humidity || 0;
                              const tempDewDiff = Math.abs((wx?.temperature || 0) - (derived?.dewPointDisplay || 0));
                              const isFoggy = humidity > 85 && tempDewDiff < 5;
                              const fogFactor = isFoggy ? 0.3 : humidity > 90 && tempDewDiff < 8 ? 0.6 : 1.0;
                              return Math.round((moonLight * skyClarity / 100) * fogFactor);
                            })()}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Running Guidance */}
                  <div className="space-y-4">
                    {/* Visibility Assessment */}
                    <div className={`rounded-xl border-2 p-5 ${
                      (() => {
                        const moonLight = derived.moonPhase.illuminationPct;
                        const skyClarity = 100 - (wx?.cloud || 0);
                        const humidity = wx?.humidity || 0;
                        const tempDewDiff = Math.abs((wx?.temperature || 0) - (derived?.dewPointDisplay || 0));
                        const isFoggy = humidity > 85 && tempDewDiff < 5;
                        const fogFactor = isFoggy ? 0.3 : humidity > 90 && tempDewDiff < 8 ? 0.6 : 1.0;
                        const effectiveVis = Math.round((moonLight * skyClarity / 100) * fogFactor);
                        
                        if (effectiveVis >= 70) return 'border-emerald-300 dark:border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-500/10';
                        if (effectiveVis >= 50) return 'border-green-300 dark:border-green-500/50 bg-green-50/50 dark:bg-green-500/10';
                        if (effectiveVis >= 30) return 'border-yellow-300 dark:border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-500/10';
                        if (effectiveVis >= 15) return 'border-orange-300 dark:border-orange-500/50 bg-orange-50/50 dark:bg-orange-500/10';
                        return 'border-red-300 dark:border-red-500/50 bg-red-50/50 dark:bg-red-500/10';
                      })()
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                          (() => {
                            const moonLight = derived.moonPhase.illuminationPct;
                            const skyClarity = 100 - (wx?.cloud || 0);
                            const humidity = wx?.humidity || 0;
                            const tempDewDiff = Math.abs((wx?.temperature || 0) - (derived?.dewPointDisplay || 0));
                            const isFoggy = humidity > 85 && tempDewDiff < 5;
                            const fogFactor = isFoggy ? 0.3 : humidity > 90 && tempDewDiff < 8 ? 0.6 : 1.0;
                            const effectiveVis = Math.round((moonLight * skyClarity / 100) * fogFactor);
                            
                            if (effectiveVis >= 70) return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300';
                            if (effectiveVis >= 50) return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300';
                            if (effectiveVis >= 30) return 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
                            if (effectiveVis >= 15) return 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300';
                            return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300';
                          })()
                        }`}>
                          <Moon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-bold mb-2 ${
                            (() => {
                              const moonLight = derived.moonPhase.illuminationPct;
                              const skyClarity = 100 - (wx?.cloud || 0);
                              const humidity = wx?.humidity || 0;
                              const tempDewDiff = Math.abs((wx?.temperature || 0) - (derived?.dewPointDisplay || 0));
                              const isFoggy = humidity > 85 && tempDewDiff < 5;
                              const fogFactor = isFoggy ? 0.3 : humidity > 90 && tempDewDiff < 8 ? 0.6 : 1.0;
                              const effectiveVis = Math.round((moonLight * skyClarity / 100) * fogFactor);
                              
                              if (effectiveVis >= 70) return 'text-emerald-900 dark:text-emerald-100';
                              if (effectiveVis >= 50) return 'text-green-900 dark:text-green-100';
                              if (effectiveVis >= 30) return 'text-yellow-900 dark:text-yellow-100';
                              if (effectiveVis >= 15) return 'text-orange-900 dark:text-orange-100';
                              return 'text-red-900 dark:text-red-100';
                            })()
                          }`}>
                            {(() => {
                              const moonLight = derived.moonPhase.illuminationPct;
                              const skyClarity = 100 - (wx?.cloud || 0);
                              const humidity = wx?.humidity || 0;
                              const tempDewDiff = Math.abs((wx?.temperature || 0) - (derived?.dewPointDisplay || 0));
                              const isFoggy = humidity > 85 && tempDewDiff < 5;
                              const fogFactor = isFoggy ? 0.3 : humidity > 90 && tempDewDiff < 8 ? 0.6 : 1.0;
                              const effectiveVis = Math.round((moonLight * skyClarity / 100) * fogFactor);
                              
                              if (effectiveVis >= 70) return '🌟 Exceptional Night Visibility';
                              if (effectiveVis >= 50) return '✅ Good Natural Light';
                              if (effectiveVis >= 30) return '⚠️ Moderate Darkness';
                              if (effectiveVis >= 15) return '🔦 Low Visibility';
                              return '🚨 Very Poor Visibility';
                            })()}
                          </div>
                          <p className="text-sm leading-relaxed text-gray-700 dark:text-slate-200">
                            {(() => {
                              const moonLight = derived.moonPhase.illuminationPct;
                              const skyClarity = 100 - (wx?.cloud || 0);
                              const humidity = wx?.humidity || 0;
                              const tempDewDiff = Math.abs((wx?.temperature || 0) - (derived?.dewPointDisplay || 0));
                              const isFoggy = humidity > 85 && tempDewDiff < 5;
                              const isHazy = humidity > 90 && tempDewDiff < 8;
                              const fogFactor = isFoggy ? 0.3 : isHazy ? 0.6 : 1.0;
                              const effectiveVis = Math.round((moonLight * skyClarity / 100) * fogFactor);
                              
                              if (effectiveVis >= 70) {
                                return `Excellent natural moonlight (${effectiveVis}%). Trails and unlit paths are safe. Headlamp for shadows.`;
                              } else if (effectiveVis >= 50) {
                                return `Good visibility (${effectiveVis}%). ${skyClarity < 70 ? 'Clouds reducing moonlight. ' : ''}Familiar routes clearly visible. Headlamp needed for dark spots.`;
                              } else if (effectiveVis >= 30) {
                                return `Moderate darkness (${effectiveVis}%). ${isFoggy ? 'Fog reducing visibility. ' : isHazy ? 'Haze blocking moonlight. ' : skyClarity < 40 ? 'Cloud cover blocking moon. ' : ''}Headlamp required. Stick to known routes, avoid technical trails.`;
                              } else if (effectiveVis >= 15) {
                                return `Low visibility (${effectiveVis}%). ${isFoggy ? 'Fog + limited moon. ' : skyClarity < 30 ? 'Heavy overcast. ' : ''}Strong headlamp essential. High-vis clothing mandatory. Well-lit paths or very familiar routes only.`;
                              } else {
                                return `Very poor visibility (${effectiveVis}%). ${isFoggy ? 'Dense fog + ' : ''}${skyClarity < 20 ? 'complete cloud cover + ' : ''}minimal moonlight = near-total darkness. Powerful headlamp (300+ lumens) + reflective gear required. Lit paths only. Consider treadmill or daylight run.`;
                              }
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Route Recommendations */}
                    <div className="rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/40 p-4">
                      <div className="text-sm font-semibold text-gray-800 dark:text-slate-100 mb-3">Recommended Routes</div>
                      <div className="space-y-2 text-sm">
                        {(() => {
                          const moonLight = derived.moonPhase.illuminationPct;
                          const skyClarity = 100 - (wx?.cloud || 0);
                          const humidity = wx?.humidity || 0;
                          const tempDewDiff = Math.abs((wx?.temperature || 0) - (derived?.dewPointDisplay || 0));
                          const isFoggy = humidity > 85 && tempDewDiff < 5;
                          const fogFactor = isFoggy ? 0.3 : humidity > 90 && tempDewDiff < 8 ? 0.6 : 1.0;
                          const effectiveVis = Math.round((moonLight * skyClarity / 100) * fogFactor);
                          
                          if (effectiveVis >= 70) {
                            return (
                              <>
                                <div className="flex items-start gap-2">
                                  <span className="text-green-500 mt-0.5">✓</span>
                                  <span className="text-gray-700 dark:text-slate-200">Trails & unlit paths safe</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-green-500 mt-0.5">✓</span>
                                  <span className="text-gray-700 dark:text-slate-200">Parks & open spaces</span>
                                </div>
                              </>
                            );
                          } else if (effectiveVis >= 50) {
                            return (
                              <>
                                <div className="flex items-start gap-2">
                                  <span className="text-green-500 mt-0.5">✓</span>
                                  <span className="text-gray-700 dark:text-slate-200">Familiar trails with headlamp</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-green-500 mt-0.5">✓</span>
                                  <span className="text-gray-700 dark:text-slate-200">Neighborhood loops ideal</span>
                                </div>
                              </>
                            );
                          } else if (effectiveVis >= 30) {
                            return (
                              <>
                                <div className="flex items-start gap-2">
                                  <span className="text-green-500 mt-0.5">✓</span>
                                  <span className="text-gray-700 dark:text-slate-200">Well-known routes only</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-red-500 mt-0.5">✗</span>
                                  <span className="text-gray-700 dark:text-slate-200">Avoid trails & technical terrain</span>
                                </div>
                              </>
                            );
                          } else if (effectiveVis >= 15) {
                            return (
                              <>
                                <div className="flex items-start gap-2">
                                  <span className="text-yellow-500 mt-0.5">!</span>
                                  <span className="text-gray-700 dark:text-slate-200">Lit paths only, short loops</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-red-500 mt-0.5">✗</span>
                                  <span className="text-gray-700 dark:text-slate-200">No trails or parks</span>
                                </div>
                              </>
                            );
                          } else {
                            return (
                              <>
                                <div className="flex items-start gap-2">
                                  <span className="text-red-500 mt-0.5">✗</span>
                                  <span className="text-gray-700 dark:text-slate-200">Avoid unlit areas</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-yellow-500 mt-0.5">!</span>
                                  <span className="text-gray-700 dark:text-slate-200">Well-lit main streets only</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="text-blue-500 mt-0.5">→</span>
                                  <span className="text-gray-700 dark:text-slate-200">Consider treadmill or daylight</span>
                                </div>
                              </>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          ) : null;
        })()}

        {/* Tomorrow's Outfit Card - Subtle Bottom Version (shown only when not evening) */}
        {!isEvening && showTomorrowOutfit && derived && wx?.hourlyForecast?.length > 0 && (() => {
          // Find tomorrow's forecast slots for averaging
          const now = new Date();
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(tomorrowRunHour, 0, 0, 0);
          
          const targetTime = tomorrow.getTime();
          
          // Find slots for the selected hour, hour before, and hour after
          const findClosestSlot = (targetOffset) => {
            const searchTime = targetTime + targetOffset * 60 * 60 * 1000;
            return wx.hourlyForecast
              .map(slot => ({
                slot,
                time: typeof slot.time === 'number' ? slot.time : Date.parse(slot.time)
              }))
              .filter(({ time }) => Math.abs(time - searchTime) <= 90 * 60 * 1000) // Within 90 minutes
              .sort((a, b) => Math.abs(a.time - searchTime) - Math.abs(b.time - searchTime))[0]?.slot;
          };
          
          const hourBefore = findClosestSlot(-1);
          const mainHour = findClosestSlot(0);
          const hourAfter = findClosestSlot(1);
          
          if (!mainHour) return null;
          
          // Average weather values from available slots
          const slots = [hourBefore, mainHour, hourAfter].filter(Boolean);
          const toF = (v) => (unit === "F" ? v : (v * 9) / 5 + 32);
          
          const avgApparent = slots.reduce((sum, s) => sum + toF(s.apparent), 0) / slots.length;
          const avgTemp = slots.reduce((sum, s) => sum + toF(s.temperature), 0) / slots.length;
          const avgWind = slots.reduce((sum, s) => sum + (typeof s.wind === 'number' ? s.wind : wx.wind), 0) / slots.length;
          const avgHumidity = slots.reduce((sum, s) => sum + (typeof s.humidity === 'number' ? s.humidity : wx.humidity), 0) / slots.length;
          const avgPrecipProb = slots.reduce((sum, s) => sum + (typeof s.precipProb === 'number' ? s.precipProb : 0), 0) / slots.length;
          const avgPrecip = slots.reduce((sum, s) => sum + (typeof s.precip === 'number' ? s.precip : 0), 0) / slots.length;
          const avgUv = slots.reduce((sum, s) => sum + (typeof s.uv === 'number' ? s.uv : 0), 0) / slots.length;
          const avgPressure = slots.reduce((sum, s) => sum + (typeof s.pressure === 'number' ? s.pressure : wx.pressure), 0) / slots.length;
          const avgSolarRadiation = slots.reduce((sum, s) => sum + (typeof s.solarRadiation === 'number' ? s.solarRadiation : 0), 0) / slots.length;
          
          // Get outfit for tomorrow using the selected run type
          const tomorrowOutfit = outfitFor(
            {
              apparentF: avgApparent,
              humidity: avgHumidity,
              windMph: avgWind,
              precipProb: avgPrecipProb,
              precipIn: avgPrecip,
              uvIndex: avgUv,
              isDay: true
            },
            tomorrowCardRunType === 'workout',
            coldHands,
            gender,
            tomorrowCardRunType === 'longRun',
            wx.hourlyForecast || [],
            tempSensitivity
          );
          
          const tomorrowBreakdown = computeScoreBreakdown(
            {
              tempF: avgTemp,
              apparentF: avgApparent,
              humidity: avgHumidity,
              windMph: avgWind,
              precipProb: avgPrecipProb,
              precipIn: avgPrecip,
              uvIndex: avgUv,
              cloudCover: wx.cloud || 50,
              pressure: avgPressure,
              solarRadiation: avgSolarRadiation,
            },
            tomorrowCardRunType === 'workout',
            coldHands,
            tomorrowOutfit.handsLevel,
            tomorrowCardRunType === 'longRun'
          );
          
          const tomorrowScore = tomorrowBreakdown.score;
          const displayTomorrowScore = getDisplayedScore(tomorrowScore, runnerBoldness);
          const tomorrowLabel = scoreLabel(displayTomorrowScore);
          const tomorrowTone = scoreBasedTone(displayTomorrowScore);
          
          const displayTemp = unit === "F" ? Math.round(avgApparent) : Math.round((avgApparent - 32) * 5 / 9);
          
          const tomorrowItems = tomorrowOutfit.optionA || [];
          
          return (
            <motion.div
              variants={cardVariants}
              initial="initial"
              animate="animate"
              className="mt-6"
            >
              <Card className="border-slate-200 dark:border-slate-700">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                      <span className="text-slate-700 dark:text-slate-200">Tomorrow's Run</span>
                    </span>
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                      {tomorrow.toLocaleDateString([], { weekday: 'short' })} @ {tomorrowRunHour === 0 ? '12 AM' : tomorrowRunHour < 12 ? `${tomorrowRunHour} AM` : tomorrowRunHour === 12 ? '12 PM' : `${tomorrowRunHour - 12} PM`}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {/* Run Type Selector */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setTomorrowCardRunType('easy');
                          setTomorrowRunType('easy');
                        }}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          tomorrowCardRunType === 'easy'
                            ? 'bg-blue-600 text-white dark:bg-blue-500'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        Easy
                      </button>
                      <button
                        onClick={() => {
                          setTomorrowCardRunType('workout');
                          setTomorrowRunType('workout');
                        }}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          tomorrowCardRunType === 'workout'
                            ? 'bg-orange-600 text-white dark:bg-orange-500'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        Workout
                      </button>
                      <button
                        onClick={() => {
                          setTomorrowCardRunType('longRun');
                          setTomorrowRunType('longRun');
                        }}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          tomorrowCardRunType === 'longRun'
                            ? 'bg-purple-600 text-white dark:bg-purple-500'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        Long
                      </button>
                    </div>
                    
                    {/* Condensed Weather & Outfit Grid */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {/* Weather */}
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">Conditions</div>
                            <div className="mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">{displayTemp}°{unit}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold" style={tomorrowTone.textStyle}>{displayTomorrowScore}</div>
                          </div>
                        </div>
                      </div>

                      {/* Outfit */}
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Gear ({tomorrowItems.length})</div>
                        <div className="space-y-1">
                          {tomorrowItems.slice(0, 4).map((item) => (
                            <div key={item.key} className="flex items-center gap-1.5 text-xs">
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                            </div>
                          ))}
                          {tomorrowItems.length > 4 && (
                            <div className="text-xs text-slate-500 dark:text-slate-400">+{tomorrowItems.length - 4} more</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })()}

      <motion.footer 
        className="mt-6 text-center text-sm text-gray-400 dark:text-slate-500"
        variants={cardVariants}
      >
        <p>Weather by Open‑Meteo. Score blends real feel, dew point, wind, precip, UV, and heat/cold synergies.</p>
      </motion.footer>

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
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/30'
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
                            <Icon className="h-6 w-6 text-white" />
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
                      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 p-3">
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
                        <div className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300 mb-1">Description</div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{item.description}</p>
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300 mb-1">When to Wear</div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{item.whenToWear}</p>
                      </div>
                      <div className="rounded-lg bg-sky-100 dark:bg-sky-900/40 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-200 mb-1 flex items-center gap-1">
                          <Thermometer className="h-3 w-3" />
                          Temperature Range
                        </div>
                        <p className="text-sm font-medium text-sky-900 dark:text-sky-100">{item.tempRange}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/40 p-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200 mb-1 flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" />
                          Pro Tips
                        </div>
                        <p className="text-sm text-emerald-900 dark:text-emerald-100">{item.tips}</p>
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
      <AnimatePresence>
        {showDebug && (
          <motion.div
            className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 p-4"
            onClick={() => setShowDebug(false)}
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <motion.div
              className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-amber-500/40 bg-gradient-to-br from-white to-amber-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-amber-200/60 bg-white/95 px-4 py-3 dark:border-amber-500/30 dark:bg-slate-900/95 backdrop-blur-sm">
                <div>
                  <h2 className="text-base font-semibold text-amber-800 dark:text-amber-200 sm:text-lg">Debug scenario builder</h2>
                  <p className="text-[10px] text-amber-600 dark:text-amber-300/80 sm:text-xs">Override the current weather to test edge cases. Values are in °{unit}.</p>
                </div>
                <motion.button
                  onClick={() => setShowDebug(false)}
                  className="rounded-lg p-1.5 text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-500/10 sm:p-2"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </motion.button>
              </div>
              <div className="space-y-4 px-4 py-4 sm:space-y-6 sm:px-6 sm:py-6">
                <div className="rounded-lg border border-sky-200/60 bg-sky-50/50 p-2.5 dark:border-sky-500/30 dark:bg-sky-500/10 sm:p-3">
                  <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-sky-700 dark:text-sky-300 sm:text-xs">Quick presets</div>
                  <div className="space-y-2">
                    <div>
                      <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 sm:text-[10px]">Ideal Conditions</div>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setDebugInputs({ apparent: "50", temp: "52", wind: "3", humidity: "45", precipProb: "0", precipIn: "0", uvIndex: "4", cloudCover: "30", pressure: "1015", solarRadiation: "250", isDay: true, debugTimeHour: "" })}
                          className="text-xs bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:border-emerald-700 dark:text-emerald-300"
                        >
                          ⭐ PR Weather (WBGT ~60°F)
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setDebugInputs({ apparent: "45", temp: "46", wind: "5", humidity: "50", precipProb: "0", precipIn: "0", uvIndex: "3", cloudCover: "40", pressure: "1012", solarRadiation: "200", isDay: true, debugTimeHour: "" })}
                          className="text-xs"
                        >
                          🏃 Marathon Ideal
                        </Button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 sm:text-[10px]">Warm/Caution (WBGT 65-73°F)</div>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setDebugInputs({ apparent: "68", temp: "70", wind: "6", humidity: "65", precipProb: "0", precipIn: "0", uvIndex: "7", cloudCover: "25", pressure: "1010", solarRadiation: "650", isDay: true, debugTimeHour: "" })}
                          className="text-xs"
                        >
                          ⚡ WBGT 68°F
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setDebugInputs({ apparent: "70", temp: "72", wind: "4", humidity: "72", precipProb: "0", precipIn: "0", uvIndex: "8", cloudCover: "15", pressure: "1008", solarRadiation: "750", isDay: true, debugTimeHour: "" })}
                          className="text-xs"
                        >
                          ⚡ WBGT 72°F (Yellow Flag)
                        </Button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400 sm:text-[10px]">Hot/High Risk (WBGT 73-82°F)</div>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setDebugInputs({ apparent: "78", temp: "80", wind: "5", humidity: "75", precipProb: "0", precipIn: "0", uvIndex: "9", cloudCover: "10", pressure: "1005", solarRadiation: "850", isDay: true, debugTimeHour: "" })}
                          className="text-xs"
                        >
                          🔥 WBGT 76°F (Red Flag)
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setDebugInputs({ apparent: "82", temp: "84", wind: "3", humidity: "78", precipProb: "0", precipIn: "0", uvIndex: "10", cloudCover: "5", pressure: "1003", solarRadiation: "900", isDay: true, debugTimeHour: "" })}
                          className="text-xs"
                        >
                          🔥 WBGT 81°F
                        </Button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-rose-900 dark:text-rose-300 sm:text-[10px]">Extreme Heat (WBGT {'>'}82°F)</div>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setDebugInputs({ apparent: "88", temp: "90", wind: "2", humidity: "80", precipProb: "0", precipIn: "0", uvIndex: "11", cloudCover: "0", pressure: "1000", solarRadiation: "950", isDay: true, debugTimeHour: "" })}
                          className="text-xs bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100 dark:bg-rose-950/50 dark:border-rose-700 dark:text-rose-300"
                        >
                          🚨 WBGT 86°F (Black Flag)
                        </Button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400 sm:text-[10px]">Cold Conditions</div>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setDebugInputs({ apparent: "35", temp: "38", wind: "8", humidity: "60", precipProb: "0", precipIn: "0", uvIndex: "2", cloudCover: "50", pressure: "1018", solarRadiation: "150", isDay: true, debugTimeHour: "" })}
                          className="text-xs"
                        >
                          ❄️ Chilly 35°F
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setDebugInputs({ apparent: "22", temp: "26", wind: "12", humidity: "55", precipProb: "0", precipIn: "0", uvIndex: "1", cloudCover: "60", pressure: "1022", solarRadiation: "100", isDay: true, debugTimeHour: "" })}
                          className="text-xs"
                        >
                          ❄️ Cold 22°F
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setDebugInputs({ apparent: "8", temp: "15", wind: "18", humidity: "50", precipProb: "0", precipIn: "0", uvIndex: "0", cloudCover: "70", pressure: "1025", solarRadiation: "0", isDay: true, debugTimeHour: "" })}
                          className="text-xs"
                        >
                          🥶 Very Cold 8°F
                        </Button>
                      </div>
                    </div>
                    <div>
                      <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 sm:text-[10px]">Precipitation</div>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setDebugInputs({ apparent: "33", temp: "35", wind: "8", humidity: "75", precipProb: "70", precipIn: "0.08", uvIndex: "0", cloudCover: "95", pressure: "1005", solarRadiation: "0", isDay: true, debugTimeHour: "" })}
                          className="text-xs"
                        >
                          🧊 Freezing Rain
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setDebugInputs({ apparent: "55", temp: "56", wind: "10", humidity: "85", precipProb: "80", precipIn: "0.15", uvIndex: "1", cloudCover: "100", pressure: "1002", solarRadiation: "50", isDay: true, debugTimeHour: "" })}
                          className="text-xs"
                        >
                          🌧️ Heavy Rain
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Real feel / apparent</label>
                    <Input type="number" value={debugInputs.apparent || ""} onChange={handleDebugInput('apparent')} placeholder="e.g., 38" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Actual temperature</label>
                    <Input type="number" value={debugInputs.temp || ""} onChange={handleDebugInput('temp')} placeholder="e.g., 40" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Wind speed (mph)</label>
                    <Input type="number" value={debugInputs.wind || ""} onChange={handleDebugInput('wind')} placeholder="e.g., 12" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Humidity (%)</label>
                    <Input type="number" value={debugInputs.humidity || ""} onChange={handleDebugInput('humidity')} placeholder="e.g., 65" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Precip probability (%)</label>
                    <Input type="number" value={debugInputs.precipProb || ""} onChange={handleDebugInput('precipProb')} placeholder="e.g., 40" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Precip amount (in)</label>
                    <Input type="number" value={debugInputs.precipIn || ""} onChange={handleDebugInput('precipIn')} placeholder="e.g., 0.05" step="0.01" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">UV index</label>
                    <Input type="number" value={debugInputs.uvIndex || ""} onChange={handleDebugInput('uvIndex')} placeholder="e.g., 3" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Cloud cover (%)</label>
                    <Input type="number" value={debugInputs.cloudCover || ""} onChange={handleDebugInput('cloudCover')} placeholder="e.g., 25" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Pressure (hPa)</label>
                    <Input type="number" value={debugInputs.pressure || ""} onChange={handleDebugInput('pressure')} placeholder="e.g., 1013" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Solar radiation (W/m²)</label>
                    <Input type="number" value={debugInputs.solarRadiation || ""} onChange={handleDebugInput('solarRadiation')} placeholder="e.g., 650" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Daylight</label>
                    <div className="flex items-center gap-2.5 rounded-lg border border-amber-200/70 bg-amber-50/50 px-2.5 py-2 dark:border-amber-500/30 dark:bg-amber-500/10 sm:gap-3 sm:px-3">
                      <Switch id="debug-isDay" checked={debugInputs.isDay} onCheckedChange={(val) => setDebugInputs((prev) => ({ ...prev, isDay: val }))} />
                      <Label htmlFor="debug-isDay" className="text-xs text-slate-600 dark:text-slate-200 sm:text-sm">
                        {debugInputs.isDay ? "Daytime" : "Nighttime"}
                      </Label>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-purple-200/60 bg-purple-50/50 p-3 dark:border-purple-500/30 dark:bg-purple-500/10">
                  <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-purple-700 dark:text-purple-300 sm:text-xs">Time Override (Test Tomorrow's Outfit Card)</div>
                  <div className="mb-3 flex flex-wrap gap-1.5 sm:gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setDebugInputs(prev => ({ ...prev, debugTimeHour: "8" }))}
                      className="text-xs"
                    >
                      8 AM (Morning)
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setDebugInputs(prev => ({ ...prev, debugTimeHour: "14" }))}
                      className="text-xs"
                    >
                      2 PM (Afternoon)
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setDebugInputs(prev => ({ ...prev, debugTimeHour: "17" }))}
                      className="text-xs"
                    >
                      5 PM (Evening)
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setDebugInputs(prev => ({ ...prev, debugTimeHour: "20" }))}
                      className="text-xs"
                    >
                      8 PM (Evening)
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setDebugInputs(prev => ({ ...prev, debugTimeHour: "23" }))}
                      className="text-xs"
                    >
                      11 PM (Late)
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Current hour (0-23, leave empty for real time)</label>
                    <Input 
                      type="number" 
                      min="0" 
                      max="23" 
                      value={debugInputs.debugTimeHour || ""} 
                      onChange={handleDebugInput('debugTimeHour')} 
                      placeholder="e.g., 17 for 5 PM" 
                      className="h-9 text-sm" 
                    />
                    {debugInputs.debugTimeHour !== undefined && debugInputs.debugTimeHour !== "" && (
                      <div className="text-xs text-purple-600 dark:text-purple-400">
                        Testing as {parseInt(debugInputs.debugTimeHour) % 12 || 12}{parseInt(debugInputs.debugTimeHour) >= 12 ? ' PM' : ' AM'} - Card will appear {parseInt(debugInputs.debugTimeHour) >= 17 && parseInt(debugInputs.debugTimeHour) < 23 ? 'at TOP (evening)' : 'at BOTTOM (daytime)'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 rounded-lg border border-amber-300/60 bg-amber-100/40 p-2.5 dark:border-amber-500/40 dark:bg-amber-500/10 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-3">
                  <div className="text-[10px] font-medium text-amber-800 dark:text-amber-200 sm:text-xs">
                    💡 Enter values above or click a preset, then hit <strong>Apply scenario</strong> to activate.
                  </div>
                  <div className="flex items-center gap-2">
                    {debugActive && (
                      <Button variant="ghost" onClick={clearDebugScenario} className="h-8 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-200 sm:h-9 sm:text-sm">
                        Reload live
                      </Button>
                    )}
                    <Button onClick={applyDebugScenario} className="h-8 text-xs sm:h-9 sm:text-sm">
                      Apply scenario
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insights Modal */}
      <AnimatePresence>
        {showInsights && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" 
            onClick={() => setShowInsights(false)}
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <motion.div 
              className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl" 
              onClick={(e) => e.stopPropagation()}
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
            {/* Header with Score */}
            
            <div className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Performance Score Breakdown</h2>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-extrabold" style={displayedScoreProps?.tone?.textStyle}>
                      {displayedScoreProps ? displayedScoreProps.score : '--'}
                    </div>
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400">/100</div>
                  </div>
                </div>
                <motion.button 
                  onClick={() => setShowInsights(false)} 
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>
              {/* Score bar */}
              {derived && (
                <div className="px-6 pb-4">
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
                    <motion.div 
                      className="h-full rounded-full"
                      style={displayedScoreProps?.tone?.badgeStyle}
                      initial={{ width: 0 }}
                      animate={{ width: `${displayedScoreProps?.score ?? 0}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 180px)' }}>
              {!derived ? (
                <p className="text-slate-500 dark:text-slate-300">Fetching conditions…</p>
              ) : (
                <motion.div 
                  className="space-y-6"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {/* Factor Cards Grid */}
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Impact Factors</h3>
                    <motion.div 
                      className="grid grid-cols-1 md:grid-cols-2 gap-3"
                      variants={staggerContainer}
                    >
                      {derived.breakdown.parts.map((part) => {
                        const percentage = Math.round((part.penalty / part.max) * 100);
                        const impactLevel = percentage > 70 ? 'high' : percentage > 40 ? 'medium' : 'low';
                        const impactColors = {
                          high: 'border-rose-200/60 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/10',
                          medium: 'border-amber-200/60 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10',
                          low: 'border-emerald-200/60 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10'
                        };
                        const barColors = {
                          high: 'bg-rose-500 dark:bg-rose-400',
                          medium: 'bg-amber-500 dark:bg-amber-400',
                          low: 'bg-emerald-500 dark:bg-emerald-400'
                        };
                        
                        return (
                          <motion.div 
                            key={part.key} 
                            className={`rounded-xl border p-4 ${impactColors[impactLevel]}`}
                            variants={listItemVariants}
                            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-bold text-gray-900 dark:text-slate-100">{part.label}</span>
                                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                    -{Math.round(part.penalty)} pts
                                  </span>
                                </div>
                                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                                  <div 
                                    className={`h-full rounded-full transition-all ${barColors[impactLevel]}`}
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                            <p className="text-xs leading-relaxed text-gray-700 dark:text-slate-300 mb-2">{part.why}</p>
                            {part.tip && (
                              <div className="mt-2 rounded-lg bg-white/60 dark:bg-slate-800/60 p-2 text-xs text-gray-600 dark:text-slate-300">
                                <span className="font-semibold">💡 Tip: </span>{part.tip}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  </div>

                  {/* Strategy Section - REMOVED, now has its own dedicated card */}
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Hour Breakdown Modal */}
      <AnimatePresence>
        {showHourBreakdown && selectedHourData && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" 
            onClick={() => setShowHourBreakdown(false)}
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <motion.div 
              className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl" 
              onClick={(e) => e.stopPropagation()}
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
            {/* Header with Score */}
            <div className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                      {selectedHourData.timeLabel} Performance Score
                    </h2>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-extrabold" style={selectedHourDisplay?.tone?.textStyle}>
                      {selectedHourDisplay ? selectedHourDisplay.score : (selectedHourData.score ? getDisplayedScore(selectedHourData.score, runnerBoldness) : '--')}
                    </div>
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400">/100</div>
                  </div>
                </div>
                <motion.button 
                  onClick={() => setShowHourBreakdown(false)} 
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>
              {/* Score bar */}
              <div className="px-6 pb-4">
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
                    <motion.div 
                    className="h-full rounded-full"
                    style={selectedHourDisplay?.tone?.badgeStyle}
                    initial={{ width: 0 }}
                    animate={{ width: `${selectedHourDisplay?.score ?? (selectedHourData.score ? getDisplayedScore(selectedHourData.score, runnerBoldness) : 0)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 180px)' }}>
              <motion.div 
                className="space-y-6"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {/* Weather Summary */}
                <div className="flex flex-wrap gap-4 items-center p-4 rounded-xl bg-white/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Feels like {selectedHourData.apparentDisplay}
                    </span>
                  </div>
                  {selectedHourData.weatherData.windMph > 0 && (
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {Math.round(selectedHourData.weatherData.windMph)} mph wind
                      </span>
                    </div>
                  )}
                  {selectedHourData.weatherData.humidity > 0 && (
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {Math.round(selectedHourData.weatherData.humidity)}% humidity
                      </span>
                    </div>
                  )}
                </div>

                {/* Factor Cards Grid */}
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">Impact Factors</h3>
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 gap-3"
                    variants={staggerContainer}
                  >
                    {selectedHourData.breakdown.parts.map((part) => {
                      const percentage = Math.round((part.penalty / part.max) * 100);
                      const impactLevel = percentage > 70 ? 'high' : percentage > 40 ? 'medium' : 'low';
                      const impactColors = {
                        high: 'border-rose-200/60 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/10',
                        medium: 'border-amber-200/60 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10',
                        low: 'border-emerald-200/60 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10'
                      };
                      const barColors = {
                        high: 'bg-rose-500 dark:bg-rose-400',
                        medium: 'bg-amber-500 dark:bg-amber-400',
                        low: 'bg-emerald-500 dark:bg-emerald-400'
                      };
                      
                      return (
                        <motion.div 
                          key={part.key} 
                          className={`rounded-xl border p-4 ${impactColors[impactLevel]}`}
                          variants={listItemVariants}
                          whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <div className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-1">{part.label}</div>
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-extrabold text-gray-900 dark:text-slate-100">
                                  -{Math.round(part.penalty)}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">points</span>
                              </div>
                            </div>
                          </div>
                          <div className="mb-2">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
                              <div 
                                className={`h-full rounded-full ${barColors[impactLevel]} transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                          <p className="text-xs leading-relaxed text-gray-700 dark:text-slate-300 mb-2">{part.why}</p>
                          {part.tip && (
                            <div className="mt-2 rounded-lg bg-white/60 dark:bg-slate-800/60 p-2 text-xs text-gray-600 dark:text-slate-300">
                              <span className="font-semibold">💡 Tip: </span>{part.tip}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>
      </AppShell>
    </>
  );
}
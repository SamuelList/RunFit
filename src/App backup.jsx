import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { computeSunEvents } from "./utils/solar";

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

// --- Running Condition Indicator ---
function getRunningCondition(tempF) {
  if (tempF >= 85) return { text: "Too hot/dangerous — avoid outdoor running", textClass: "text-rose-700", badgeClass: "bg-rose-100/80 text-rose-700 border-rose-300/60 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40" };
  if (tempF >= 75) return { text: "Hot — hydrate and shorten runs", textClass: "text-rose-600", badgeClass: "bg-rose-100/80 text-rose-700 border-rose-300/60 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40" };
  if (tempF >= 65) return { text: "Warm — slow pace, hydrate", textClass: "text-amber-600", badgeClass: "bg-amber-100/80 text-amber-700 border-amber-300/60 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40" };
  if (tempF >= 55) return { text: "Comfortable", textClass: "text-emerald-600", badgeClass: "bg-emerald-100/80 text-emerald-700 border-emerald-300/60 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40" };
  if (tempF >= 40) return { text: "Ideal — best performance", textClass: "text-emerald-600", badgeClass: "bg-emerald-100/80 text-emerald-700 border-emerald-300/60 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40" };
  if (tempF >= 30) return { text: "Cool — light layers", textClass: "text-sky-600", badgeClass: "bg-sky-100/80 text-sky-700 border-sky-300/60 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40" };
  if (tempF >= 20) return { text: "Cold — layer up, protect skin", textClass: "text-blue-600", badgeClass: "bg-blue-100/80 text-blue-700 border-blue-300/60 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40" };
  if (tempF >= 0) return { text: "Very cold — frostbite risk; cover extremities", textClass: "text-indigo-600", badgeClass: "bg-indigo-100/80 text-indigo-700 border-indigo-300/60 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/40" };
  return { text: "Extremely cold/dangerous — avoid outdoor running", textClass: "text-indigo-700", badgeClass: "bg-indigo-100/80 text-indigo-700 border-indigo-300/60 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/40" };
}

// --- Configurable Thresholds for Gear Logic ---
const TIGHTS_TEMP_THRESHOLD = 48; // Below this adjT, add tights
const SHORTS_TEMP_THRESHOLD = 60; // Above this adjT, add shorts
const INSULATED_JACKET_TEMP_THRESHOLD = 15; // Above this T, switch to light jacket
const RAIN_PROB_THRESHOLD = 50; // Precipitation probability (%) to add rain shell
const RAIN_IN_THRESHOLD = 0.02; // Precipitation inches to add rain shell
const WIND_BREAKER_THRESHOLD = 15; // Wind speed (mph) to add windbreaker
const UV_INDEX_CAP_THRESHOLD = 7; // UV index to add cap/sunglasses/sunscreen
const HUMIDITY_ANTI_CHAFE_THRESHOLD = 75; // Humidity (%) to add anti-chafe
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
const COLD_HANDS_LIGHT_GLOVES_THRESHOLD = 65; // Cold hands: add light gloves below this
const COLD_HANDS_MEDIUM_GLOVES_THRESHOLD = 55; // Cold hands: upgrade to medium gloves
const COLD_HANDS_MITTENS_THRESHOLD = 40; // Cold hands: switch to mittens
const COLD_HANDS_MITTENS_LINER_THRESHOLD = 25; // Cold hands: add liner
const COLD_HANDS_WIND_GLOVES_THRESHOLD = 5; // Cold hands: add gloves at lower wind speed
const COLD_HANDS_WIND_MEDIUM_THRESHOLD = 8; // Cold hands: upgrade at lower wind
const COLD_HANDS_WIND_MITTENS_THRESHOLD = 12; // Cold hands: mittens at lower wind

// --- Comfort/score model ---
function dewPointF(tempF, rh) {
  const tempC = (tempF - 32) * (5 / 9);
  const a = 17.62, b = 243.12;
  const gamma = Math.log(Math.max(1e-6, rh) / 100) + (a * tempC) / (b + tempC);
  const dpC = (b * gamma) / (a - gamma);
  return (dpC * 9) / 5 + 32;
}

function computeRunningScore({ tempF, apparentF, humidity, windMph, precipProb, precipIn, uvIndex }, workout, longRun) {
  const ideal = workout ? 43 : longRun ? 48 : 50;
  const coolWidth = workout ? 22 : 20;
  const dpF = dewPointF(tempF, humidity);

  const diff = apparentF - ideal;
  const warmSpan = Math.max(5, 85 - ideal);
  const tempPenalty = diff >= 0
    ? Math.pow(clamp(diff / warmSpan, 0, 1), 1.6) * 99
    : Math.pow(Math.abs(diff) / coolWidth, 2) * 28;
  
  let dewpointPenalty;
  if (dpF < 55) dewpointPenalty = 0;
  else if (dpF < 60) dewpointPenalty = 3;
  else if (dpF < 65) dewpointPenalty = 8;
  else if (dpF < 70) dewpointPenalty = 15;
  else if (dpF < 75) dewpointPenalty = 25;
  else dewpointPenalty = 35;

  const humidityPenalty = humidity > 80 && apparentF > 60 ? Math.pow((humidity - 80) / 20, 2) * 8 : 0;

  const windPenalty = Math.pow(Math.max(0, windMph - 2) / 25, 2) * 40;
  const precipPenalty = Math.min(Math.max((precipProb / 100) * 15, 0), 15) + Math.min(Math.max(precipIn * 160, 0), 20) + (apparentF <= 34 && precipIn > 0 ? 10 : 0);
  let uvPenalty = Math.min(Math.max(Math.max(0, uvIndex - 6) * 2.5, 0), 10);
  if (workout && apparentF >= 70) uvPenalty += 5;
  if (longRun) {
    uvPenalty = Math.min(Math.max(Math.max(0, uvIndex - 5) * 3, 0), 15); // Long runs more UV sensitive
    if (apparentF >= 70) uvPenalty += 3; // Extra heat buildup over time
  }

  const synergyCold = apparentF < 35 ? (35 - apparentF) * 0.3 * (windMph > 10 ? 0.6 : 0) : 0;
  const synergyHeat = (dpF > 70 ? (dpF - 70) * 0.6 : 0) + (apparentF > 85 ? Math.pow((apparentF - 85) / 5, 2) * 20 : 0);

  let penalties = tempPenalty + dewpointPenalty + humidityPenalty + windPenalty + precipPenalty + uvPenalty + synergyCold + synergyHeat;
  return Math.min(Math.max(Math.round(100 - Math.min(Math.max(penalties, 0), 99)), 0), 100);
}

function scoreLabel(score) {
  if (score >= 85) return { text: "Excellent", tone: "Great time to fly" };
  if (score >= 70) return { text: "Good", tone: "Solid conditions" };
  if (score >= 55) return { text: "Fair", tone: "Manageable with tweaks" };
  if (score >= 40) return { text: "Challenging", tone: "Proceed with care" };
  return { text: "Tough", tone: "Consider cross-training" };
}

// Helper to interpolate between two RGB colors
function lerpColor(color1, color2, t) {
  const r = Math.round(color1.r + (color2.r - color1.r) * t);
  const g = Math.round(color1.g + (color2.g - color1.g) * t);
  const b = Math.round(color1.b + (color2.b - color1.b) * t);
  return { r, g, b };
}

function scoreTone(score, apparentF) {
  // Temperature-based gradient: cold (blue) -> ideal (green) -> warm (yellow) -> hot (red)
  // Ideal range: 40-50°F (most green)
  const ideal = 45;
  const warmMid = 65;        // Yellow zone
  const coldThreshold = 20;  // Below this: full blue
  const hotThreshold = 85;   // Above this: full red
  
  // Define color stops: blue (cold) -> green (ideal) -> yellow (warm) -> red (hot)
  const blue = { r: 59, g: 130, b: 246 };     // blue-500
  const green = { r: 34, g: 197, b: 94 };     // green-500
  const yellow = { r: 234, g: 179, b: 8 };    // yellow-500
  const red = { r: 239, g: 68, b: 68 };       // red-500
  
  let color;
  if (apparentF <= coldThreshold) {
    color = blue;
  } else if (apparentF >= hotThreshold) {
    color = red;
  } else if (apparentF < ideal) {
    // Interpolate from blue to green
    const t = (apparentF - coldThreshold) / (ideal - coldThreshold);
    color = lerpColor(blue, green, clamp(t, 0, 1));
  } else if (apparentF < warmMid) {
    // Interpolate from green to yellow
    const t = (apparentF - ideal) / (warmMid - ideal);
    color = lerpColor(green, yellow, clamp(t, 0, 1));
  } else {
    // Interpolate from yellow to red
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

// --- Run Score: detailed breakdown & tips ---
function computeScoreBreakdown(
  { tempF, apparentF, humidity, windMph, precipProb, precipIn, uvIndex },
  workout,
  coldHands,
  handsLevel,
  longRun = false
) {
  const ideal = workout ? 43 : longRun ? 48 : 50;
  const coolWidth = workout ? 22 : longRun ? 18 : 20;
  const dpF = dewPointF(tempF, humidity);

  const diff = apparentF - ideal;
  const warmSpan = Math.max(5, 85 - ideal);
  
  // Enhanced temperature penalty with better curve
  const tempPenalty =
    diff >= 0
      ? Math.pow(clamp(diff / warmSpan, 0, 1), 1.6) * 99
      : Math.pow(Math.abs(diff) / coolWidth, 2) * 28;

  // Smarter humidity penalty using dew point thresholds
  let humidityPenalty;
  if (dpF < 50) humidityPenalty = 0;
  else if (dpF < 55) humidityPenalty = 2;
  else if (dpF < 60) humidityPenalty = 5;
  else if (dpF < 65) humidityPenalty = 10;
  else if (dpF < 70) humidityPenalty = 18;
  else if (dpF < 75) humidityPenalty = 28;
  else humidityPenalty = 40;

  // Wind penalty scales with temperature context
  const windBasePenalty = Math.pow(Math.max(0, windMph - 2) / 25, 2) * 40;
  const windTempMultiplier = apparentF < 40 ? 1.4 : apparentF > 75 ? 0.7 : 1.0;
  const windPenalty = windBasePenalty * windTempMultiplier;

  // Enhanced precipitation penalty with ice danger
  const precipBasePenalty = Math.min(Math.max((precipProb / 100) * 15, 0), 15) +
    Math.min(Math.max(precipIn * 160, 0), 20);
  const iceDanger = apparentF <= 34 && precipIn > 0 ? 15 : apparentF <= 38 && precipProb > 40 ? 8 : 0;
  const precipPenalty = precipBasePenalty + iceDanger;

  // UV penalty with workout heat interaction
  let uvPenalty = Math.min(Math.max(Math.max(0, uvIndex - 6) * 2.5, 0), 10);
  if (workout && apparentF >= 70) uvPenalty += 5;
  if (longRun && uvIndex >= 8) uvPenalty += 3;

  // Cold synergy: wind + cold compounds risk
  const windChill = apparentF < 50 && windMph > 5 
    ? 35.74 + 0.6215 * apparentF - 35.75 * Math.pow(windMph, 0.16) + 0.4275 * apparentF * Math.pow(windMph, 0.16)
    : apparentF;
  const synergyCold = apparentF < 35 
    ? Math.max(0, (35 - windChill) * 0.5)
    : 0;

  // Heat synergy: humidity + heat is exponentially worse
  const heatStress = apparentF > 75 && dpF > 60 
    ? Math.pow((apparentF - 75) / 10, 1.8) * Math.pow((dpF - 60) / 10, 1.5) * 15
    : 0;
  const synergyHeat = (dpF > 70 ? (dpF - 70) * 0.8 : 0) + heatStress;

  // Cold hands personal penalty
  const coldHandsPenalty = coldHands ? (handsLevel || 0) * 2 : 0;

  let penalties =
    tempPenalty +
    humidityPenalty +
    windPenalty +
    precipPenalty +
    uvPenalty +
    synergyCold +
    synergyHeat +
    coldHandsPenalty;
  penalties = Math.min(Math.max(penalties, 0), 99);

  const rawScore = Math.round(100 - penalties);
  const score = Math.min(Math.max(rawScore, 0), 100);

  // Smart, context-aware explanations and tips
  const getTempTip = () => {
    if (diff >= 0) {
      if (diff > 35) return "Dangerous heat—consider moving indoors. If outside: run very easy, take walk breaks every 5-10 min, pour water on head/neck.";
      if (diff > 25) return "Extreme heat stress—shorten distance 30-50%, slow pace 60-90s/mile, run early morning (before 7am) or late evening only.";
      if (diff > 15) return "Significant heat—reduce intensity, add 30-60s/mile to easy pace, walk through aid/water stops to keep heart rate controlled.";
      if (diff > 8) return "Moderately warm—slow easy pace by 15-30s/mile, sip water every 15-20 min, choose shaded routes.";
      return "Slightly warm—dress lighter than you think, stay hydrated, you'll feel great once you warm up.";
    } else {
      const absDiff = Math.abs(diff);
      if (absDiff > 25) return "Dangerous cold—indoor run strongly recommended. Outside: cover all skin, run loops near shelter, bring phone + tell someone your route.";
      if (absDiff > 15) return "Very cold—extend warm-up to 15 min, dress in layers, protect face + extremities. Watch for ice patches.";
      if (absDiff > 8) return "Cold start—add 5-10 min warm-up, wear gloves + hat, you'll shed layers after 10-15 min of running.";
      if (absDiff > 3) return "Slightly cool—ideal for faster paces once warmed up. One light extra layer for the first mile.";
      return "Perfect temperature—minimal adjustments needed.";
    }
  };

  const getHumidityTip = () => {
    if (dpF >= 75) return "Oppressive humidity—sweat won't evaporate. Slow pace 45-75s/mile, take walk breaks, hydrate every 10 min. Heat illness escalates fast.";
    if (dpF >= 70) return "Very humid—cooling is impaired. Reduce effort 10-15%, extra hydration, seek shade, plan bailout points.";
    if (dpF >= 65) return "Muggy conditions—expect to feel warmer than thermometer suggests. Slow 20-30s/mile, stay hydrated, use anti-chafe liberally.";
    if (dpF >= 60) return "Moderate humidity—slight impact on cooling. Stay on top of hydration, adjust pace by feel.";
    if (dpF >= 55) return "Comfortable humidity—minimal impact. Normal hydration strategy works fine.";
    return "Low humidity—optimal evaporative cooling. Great day for pushing pace.";
  };

  const getWindTip = () => {
    if (apparentF < 40 && windMph >= 15) return "Dangerous wind chill—frostbite possible in 30 min. Cover all skin, windproof outer layer required. Indoor run recommended.";
    if (windMph >= 20) return "Very strong winds—plan short out-and-back (start into wind). Accept 20-40s/mile slower into headwind. Use buildings/trees for wind breaks.";
    if (windMph >= 15) return "Strong winds—tactical route planning matters. Start into wind, finish with tailwind when tired. Effort > pace today.";
    if (windMph >= 10 && apparentF < 50) return "Breezy + cold combo—windproof layer helps. Face wind early, save tailwind for when you're fatigued.";
    if (windMph >= 10) return "Moderate winds—slight aerodynamic drag. Plan loops to alternate wind directions, or embrace it as resistance training.";
    return "Calm conditions—wind won't be a factor today.";
  };

  const getPrecipTip = () => {
    if (apparentF <= 34 && (precipProb >= 40 || precipIn > 0.02)) return "DANGER: Ice/freezing rain likely. Treadmill strongly recommended. Outside = high injury risk from falls.";
    if (precipProb >= 80 || precipIn > 0.25) return "Heavy rain expected—waterproof shell + cap mandatory. Change routes to avoid trail/unpaved (will be muddy). Dry socks + shoes ready post-run.";
    if (precipProb >= 60 || precipIn > 0.1) return "Likely rain—bring packable shell even if dry at start. Avoid painted road markings (slick when wet). Body Glide on feet prevents wet blisters.";
    if (precipProb >= 40) return "Rain possible—check radar before heading out. Cap keeps rain off face, rain shell in pocket as insurance.";
    if (precipProb >= 20) return "Slight rain chance—probably fine without rain gear, but check forecast right before you go.";
    return "Dry conditions expected—no rain gear needed.";
  };

  const getUVTip = () => {
    if (uvIndex >= 9) return "Extreme UV—skin damage in 15 min. SPF 50+ required, reapply if sweating heavily. Sunglasses + visor/cap mandatory. Run before 9am or after 5pm.";
    if (uvIndex >= 7) return "Very high UV—SPF 30+ sunscreen 20 min before run. Cover shoulders, wear hat + sunglasses. Early morning or evening strongly preferred.";
    if (uvIndex >= 5) return "High UV—sunscreen recommended for runs >30 min. Wear a cap, consider arm sleeves for long runs.";
    if (uvIndex >= 3) return "Moderate UV—sunscreen for runs >60 min or if fair-skinned. Less concern in early morning/evening.";
    return "Low UV—minimal sun protection needed today.";
  };

  const parts = [
    {
      key: "temperature",
      label: "Temperature",
      penalty: tempPenalty,
      why: diff >= 0
        ? `Feels ${Math.round(diff)}°F warmer than ideal for ${workout ? 'workouts' : longRun ? 'long runs' : 'easy runs'} (${ideal}°F)`
        : `Feels ${Math.round(Math.abs(diff))}°F cooler than ideal (${ideal}°F)`,
      tip: getTempTip(),
      max: 99,
    },
    {
      key: "humidity",
      label: "Humidity",
      penalty: humidityPenalty,
      why: `Dew point ${Math.round(dpF)}°F — ${dpF >= 70 ? 'very high' : dpF >= 60 ? 'elevated' : dpF >= 55 ? 'moderate' : 'comfortable'} moisture in air`,
      tip: getHumidityTip(),
      max: 40,
    },
    {
      key: "wind",
      label: "Wind",
      penalty: windPenalty,
      why: windMph >= 15 
        ? `Strong ${Math.round(windMph)} mph winds ${apparentF < 40 ? '+ cold = wind chill danger' : '= high aerodynamic cost'}`
        : `${Math.round(windMph)} mph winds ${apparentF < 50 ? 'increasing cold perception' : 'adding resistance'}`,
      tip: getWindTip(),
      max: apparentF < 40 ? 25 : 18,
    },
    {
      key: "precip",
      label: "Precipitation",
      penalty: precipPenalty,
      why: iceDanger > 0
        ? `${Math.round(precipProb)}% precip chance + freezing temps = ICE RISK`
        : `${Math.round(precipProb)}% chance, ${precipIn.toFixed(2)}" expected`,
      tip: getPrecipTip(),
      max: 50,
    },
    {
      key: "uv",
      label: "UV / Sun",
      penalty: uvPenalty,
      why: `UV index ${Math.round(uvIndex)}${uvIndex >= 8 ? ' — skin damage risk' : uvIndex >= 6 ? ' — high exposure' : ''}`,
      tip: getUVTip(),
      max: workout ? 15 : longRun ? 13 : 10,
    },
    {
      key: "coldSynergy",
      label: "Wind Chill",
      penalty: synergyCold,
      why: synergyCold > 0
        ? `Feels like ${Math.round(windChill)}°F (${Math.round(apparentF - windChill)}°F colder due to wind) — frostbite risk`
        : "—",
      tip: synergyCold > 0 ? "Cover all exposed skin—ears, face, hands. Windproof layers critical. Frostbite can occur in <30 min in severe wind chill." : "",
      max: 20,
    },
    {
      key: "heatSynergy",
      label: "Heat Stress",
      penalty: synergyHeat,
      why: synergyHeat > 0
        ? `Heat + humidity = compounding thermal load. Effective temp feels ${Math.round(apparentF + (dpF - 60) * 0.5)}°F`
        : "—",
      tip: synergyHeat > 0 ? "Heat illness develops fast in humid heat—slow pace significantly, hydrate aggressively, pour water on head/neck, take walk breaks liberally." : "",
      max: 35,
    },
    {
      key: "coldPref",
      label: "Cold Sensitivity",
      penalty: coldHandsPenalty,
      why: coldHandsPenalty > 0
        ? `Personal cold sensitivity factored in (protection level ${handsLevel})`
        : "—",
      tip: coldHandsPenalty > 0 ? "Your cold sensitivity means extra hand/body protection is needed in conditions others might tolerate." : "",
      max: 8,
    },
  ];

  const total = parts.reduce((a, p) => a + p.penalty, 0);
  const visibleParts = parts
    .filter((p) => p.penalty >= 0.5)
    .sort((a, b) => b.penalty - a.penalty)
    .map((p) => ({
      ...p,
      sharePct: total > 0 ? Math.round((p.penalty / total) * 100) : 0,
      sev:
        p.penalty >= 20 ? "high" : p.penalty >= 8 ? "med" : p.penalty > 0 ? "low" : "none",
    }));

  const dominantKeys = visibleParts.slice(0, 2).map((p) => p.key);
  return { score, parts: visibleParts, total, ideal, dpF, dominantKeys };
}

// Calculate road condition warnings based on weather
function calculateRoadConditions({ tempF, apparentF, precipProb, precip, cloudCover }) {
  const warnings = [];
  let severity = 'safe'; // safe, caution, warning, danger
  
  // Freezing conditions with precipitation = ice risk
  if (tempF <= 32 && (precipProb > 20 || precip > 0)) {
    severity = 'danger';
    warnings.push({
      type: 'ice',
      level: 'danger',
      message: 'Black ice likely on roads and sidewalks',
      advice: 'Avoid running outdoors. Treadmill strongly recommended. If you must run outside, choose well-salted main roads and wear trail shoes with aggressive tread. Shorten your stride significantly.'
    });
  }
  // Near-freezing with recent/current precip
  else if (tempF > 32 && tempF <= 35 && precipProb > 40) {
    severity = severity === 'danger' ? 'danger' : 'warning';
    warnings.push({
      type: 'ice',
      level: 'warning',
      message: 'Potential for icy patches in shaded areas',
      advice: 'Use extreme caution on bridges, overpasses, and shaded sections. Test footing before committing to speed. Consider postponing to afternoon when temps rise.'
    });
  }
  
  // Heavy rain = slippery surfaces
  if (precipProb > 70 || precip > 0.2) {
    severity = severity === 'danger' ? 'danger' : 'warning';
    warnings.push({
      type: 'wet',
      level: 'warning',
      message: 'Slippery roads and reduced visibility',
      advice: 'Avoid painted road markings, manhole covers, and metal grates—extremely slippery when wet. Shorten stride and increase cadence for better traction. Stay visible with bright colors and reflective gear.'
    });
  }
  // Moderate rain
  else if (precipProb > 40 || precip > 0.05) {
    severity = severity === 'danger' || severity === 'warning' ? severity : 'caution';
    warnings.push({
      type: 'wet',
      level: 'caution',
      message: 'Wet road surfaces possible',
      advice: 'Watch for puddles hiding potholes. Leaves and debris become slippery when wet. Give extra space when crossing driveways (oil residue + water = slick).'
    });
  }
  
  // Low visibility conditions
  if (cloudCover > 85 && (precipProb > 50 || precip > 0.1)) {
    severity = severity === 'danger' ? 'danger' : severity === 'warning' ? 'warning' : 'caution';
    warnings.push({
      type: 'visibility',
      level: 'caution',
      message: 'Reduced visibility for drivers',
      advice: 'Wear bright/reflective clothing even during daytime. Make eye contact with drivers at intersections. Use sidewalks and crosswalks—don\'t assume you\'re seen.'
    });
  }
  
  // Heat = no road issues but surface heat warning
  if (apparentF >= 85) {
    severity = severity === 'danger' || severity === 'warning' ? severity : 'caution';
    warnings.push({
      type: 'heat',
      level: 'caution',
      message: 'Hot pavement can reach 140-160°F',
      advice: 'Choose light-colored asphalt or concrete over dark pavement where possible. Run on grass/dirt paths if available—significantly cooler. Peak surface temps occur 2-4pm; run early morning or evening.'
    });
  }
  
  return {
    severity,
    warnings,
    hasWarnings: warnings.length > 0
  };
}

function makeApproachTips({ score, parts, dpF, apparentF, windMph, precipProb, workout, longRun = false, tempChange = 0, willRain = false, roadConditions = null, runnerBoldness = 0 }) {
  const tops = parts.slice(0, 2).map((p) => p.key);
  const tips = [];

  // Adjust score thresholds based on runner boldness
  // Boldness +2 (badass): More tolerant, fewer warnings, thresholds shift 10-15 points lower
  // Boldness -2 (cautious): More warnings, earlier alerts, thresholds shift 10-15 points higher
  const boldnessAdjust = runnerBoldness * 7; // Each notch = 7 point adjustment
  const adjustedScore = score + boldnessAdjust;

  // Intelligent condition detection for multi-factor interactions
  const isExtremeCold = apparentF <= 10;
  const isVeryCold = apparentF <= 32;
  const isExtremeHeat = apparentF >= 85;
  const isVeryHot = apparentF >= 75;
  const isHumid = dpF >= 65;
  const isVeryHumid = dpF >= 70;
  const isWindy = windMph >= 15;
  const isVeryWindy = windMph >= 20;
  const isIcyConditions = apparentF <= 34 && (precipProb >= 30 || (parts.find(p => p.key === 'precip')?.penalty || 0) > 5);
  const heatHumidityDanger = isVeryHot && isVeryHumid;
  const coldWindDanger = isVeryCold && isWindy;

  // Natural, coach-like guidance - speak to the runner like a human (adjusted by boldness)
  if (adjustedScore >= 85) {
    // Perfect conditions - enthusiastic!
    if (workout) {
      tips.push("Great day for a hard workout! Conditions are dialed in.");
    } else if (longRun) {
      tips.push("Beautiful day for miles. Enjoy it out there.");
    } else {
      tips.push("Perfect running weather. Get after it!");
    }
  } else if (adjustedScore >= 70) {
    // Good conditions - just a heads up
    if (workout) {
      tips.push("Solid conditions for speed work. You might feel a bit more effort than usual, but nothing major.");
    } else if (longRun) {
      tips.push("Good day for your long run. Expect to work a touch harder, but you'll be fine.");
    } else {
      tips.push("Nice day for a run. Just run by feel rather than chasing the watch.");
    }
  } else if (adjustedScore >= 55) {
    // Getting challenging - real talk
    if (workout) {
      tips.push("Tough day for intervals. Shorten the reps or convert to a tempo if you're not feeling it. No shame in being smart.");
    } else if (longRun) {
      tips.push("It's going to be a grind out there. Maybe trim a couple miles or slow down 30s/mile. Save the suffer-fest for race day.");
    } else {
      tips.push("Run's gonna feel harder than it should today. Let the pace drift and focus on time on feet instead.");
    }
  } else if (adjustedScore >= 40) {
    // Poor conditions - clear advice
    if (workout) {
      tips.push("This is not the day for speed work. Either bail to the treadmill or just run easy. The workout can wait.");
    } else if (longRun) {
      tips.push("Rough conditions for a long run. Cut it by 30%, stay on short loops near home, and bring your phone. Live to run another day.");
    } else {
      tips.push("Shorten it up today. Stay close to home and call it early if it gets worse.");
    }
  } else {
    // Dangerous - be direct
    tips.push("Seriously, hit the treadmill today. If you absolutely have to go outside, tell someone where you're going, carry your phone, and stay on short loops. This isn't worth it.");
  }

  // Compound conditions - real warnings when it matters (adjusted by boldness)
  if (heatHumidityDanger && runnerBoldness <= 0) {
    tips.push("� Heat + humidity is a dangerous combo for heat illness. Run early morning only, take walk breaks every 10 minutes, and pour water on your head and neck. If you stop sweating, you're in trouble—stop immediately.");
  } else if (heatHumidityDanger && runnerBoldness > 0) {
    tips.push("� Heat stress is real today. Early morning, walk breaks, aggressive hydration. Know the signs of heat illness.");
  }
  
  if (coldWindDanger && runnerBoldness <= 0) {
    tips.push("❄️ Wind chill puts you at frostbite risk in under 30 minutes. Cover every inch of skin, wear a windproof shell, and run short loops so you're never far from shelter.");
  } else if (coldWindDanger && runnerBoldness > 0) {
    tips.push("❄️ Frostbite risk is real. Cover exposed skin, windproof up, and stay on short loops.");
  }

  if (isIcyConditions) {
    if (runnerBoldness <= 1) {
      tips.push("🧊 Ice or freezing rain means high fall risk. Get traction devices if you're going out, or just hit the treadmill.");
    } else {
      tips.push("🧊 Icy out there. Traction devices or treadmill.");
    }
  }

  // Long-run specific wisdom (adjusted by boldness)
  if (longRun) {
    if (tempChange > 12 && runnerBoldness <= 0) {
      const isTempWarming = apparentF > (parts.find(p => p.key === 'temperature')?.why.includes('cooler') ? apparentF + tempChange : apparentF - tempChange);
      tips.push(`🌡️ Temperature's going to ${isTempWarming ? 'climb' : 'drop'} ${Math.round(tempChange)}°F during your run. ${isTempWarming ? 'Start with layers you can peel off and tie around your waist.' : 'Stash an extra layer at the finish or bring it with you.'}`);
    } else if (tempChange > 15 && runnerBoldness > 0) {
      const isTempWarming = apparentF > (parts.find(p => p.key === 'temperature')?.why.includes('cooler') ? apparentF + tempChange : apparentF - tempChange);
      tips.push(`🌡️ Expect a ${Math.round(tempChange)}°F temp ${isTempWarming ? 'rise' : 'drop'}. Layer smart.`);
    }

    if ((willRain || (precipProb >= 60 && (parts.find(p => p.key === 'precip')?.penalty || 0) > 10)) && runnerBoldness <= 0) {
      tips.push("🌧️ Rain's coming during your run. Bring a shell and a cap, slap some Body Glide on your feet to prevent blisters, and change your shoes the second you finish.");
    } else if ((willRain || (precipProb >= 70 && (parts.find(p => p.key === 'precip')?.penalty || 0) > 10)) && runnerBoldness > 0) {
      tips.push("🌧️ Rain incoming. Shell, cap, done.");
    }

    if (adjustedScore < 60 && (isVeryHot || isHumid) && runnerBoldness <= 0) {
      tips.push("💧 You'll need water out there. Carry a bottle or plan stops every 3-4 miles. Drink every 15-20 minutes, not just when you're thirsty.");
    } else if (adjustedScore < 50 && (isVeryHot || isHumid) && runnerBoldness > 0) {
      tips.push("💧 Plan water stops or carry fluids.");
    }
  }

  // Extreme conditions - get specific (adjusted by boldness)
  if (tops.includes("temperature")) {
    if (isExtremeHeat && runnerBoldness <= 0) {
      tips.push("🔥 Extreme heat warning. Pre-cool with a cold shower, pour water on your head and neck every 10 minutes, and run short loops. If you feel confused or stop sweating, stop running immediately.");
    } else if (isExtremeHeat && runnerBoldness > 0) {
      tips.push("🔥 Extreme heat. Pre-cool, frequent water on head/neck, watch for heat illness.");
    }
    
    if (isExtremeCold && runnerBoldness <= 0) {
      tips.push("🥶 Extreme cold means business. Warm up indoors first, cover all skin including a balaclava for your face, and run short loops near shelter.");
    } else if (isExtremeCold && runnerBoldness > 0) {
      tips.push("🥶 Extreme cold. Cover everything, warm up indoors first.");
    }
  }

  if (tops.includes("wind") || tops.includes("coldSynergy")) {
    if (isVeryWindy && isVeryCold && runnerBoldness <= 0) {
      tips.push("💨 Wind chill is dangerous today. Windproof shell over everything, cover your face and ears, and start into the wind so you finish with it at your back. Check your fingers and face for numbness every 5 minutes.");
    } else if (isVeryWindy && isVeryCold && runnerBoldness > 0) {
      tips.push("💨 Wind chill warning. Windproof layers, cover face, start into wind.");
    } else if (isVeryWindy && runnerBoldness <= 1) {
      tips.push("💨 Strong winds today. Start into the wind and finish with a tailwind—trust me, you'll thank yourself. This is an effort run, not a pace run.");
    }
  }

  if (tops.includes("precip") && precipProb >= 70 && runnerBoldness <= 0) {
    tips.push("🌧️ Heavy rain expected. Brimmed cap to keep water off your face, good shell, and avoid painted road markings—they're slick as ice when wet.");
  } else if (tops.includes("precip") && precipProb >= 80 && runnerBoldness > 0) {
    tips.push("🌧️ Heavy rain. Cap, shell, watch painted surfaces.");
  }

  // Road condition warnings integration (only for cautious to balanced runners)
  if (roadConditions?.hasWarnings && runnerBoldness <= 0) {
    roadConditions.warnings.forEach(warning => {
      tips.push(`⚠️ ${warning.message}: ${warning.advice}`);
    });
  } else if (roadConditions?.severity === 'danger' && runnerBoldness > 0) {
    // Badass runners only get danger-level road warnings
    roadConditions.warnings.filter(w => w.level === 'danger').forEach(warning => {
      tips.push(`⚠️ ${warning.message}`);
    });
  }

  // Pace guidance - conversational and practical (adjusted by boldness)
  let paceAdj;
  if (adjustedScore >= 85) {
    paceAdj = workout 
      ? "Hit your target paces. You've got this." 
      : "Run your normal pace. Nothing's holding you back today.";
  } else if (adjustedScore >= 70) {
    paceAdj = workout 
      ? "Add 5-15 seconds per mile to your interval paces. Respect the conditions, still get the work done." 
      : "Slow down 10-20 seconds per mile from your usual easy pace. It'll feel right.";
  } else if (adjustedScore >= 55) {
    paceAdj = workout
      ? "Tack on 15-30 seconds per mile to your workout paces, or just cut the volume by 20%. Quality over ego today." 
      : "Expect to slow down 25-40 seconds per mile. The effort's what counts, not the numbers.";
  } else if (adjustedScore >= 40) {
    paceAdj = workout
      ? (runnerBoldness >= 1 
          ? "Add 30-50 seconds per mile or seriously cut the reps. This isn't your day for a breakthrough." 
          : "Add 30-50 seconds per mile or just convert to an easy run. Better yet, hit the treadmill and actually get the workout done right.")
      : (runnerBoldness >= 1 
          ? "Slow down 45-75 seconds per mile. It's survival mode out there." 
          : "Slow down 45-75 seconds per mile, or just cut the distance by 30%. Don't be a hero.");
  } else {
    paceAdj = runnerBoldness >= 1 
      ? "Conditions are brutal. Manage expectations heavily or move indoors." 
      : "Seriously, just hop on the treadmill. There's no point suffering through this for a junk run.";
  }

  return { tips, paceAdj };
}

// --- Tiny UI for the insights panel ---
const ProgressBar = ({ pct }) => (
  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
    <div className="h-2 rounded-full bg-sky-500" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
  </div>
);

const ForecastCard = ({ derived, className = "" }) => (
  <Card className={className}>
    <CardHeader>
      <CardTitle className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          6-hour outlook
        </span>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Next 6 hours</span>
      </CardTitle>
    </CardHeader>
    <CardContent>
      {!derived ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-20 w-full animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/40" />
          ))}
        </div>
      ) : derived.forecast.length ? (
        <div className="space-y-2.5">
          {derived.forecast.slice(0, 6).map((slot, idx) => {
            const isNow = idx === 0;
            return (
              <motion.button
                key={slot.time}
                onClick={() => {
                  if (typeof derived.onHourClick === 'function') {
                    derived.onHourClick(slot);
                  }
                }}
                className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg w-full text-left cursor-pointer ${
                  isNow 
                    ? 'border-violet-300/60 bg-gradient-to-br from-violet-50 via-purple-50/80 to-fuchsia-50/60 dark:border-violet-500/40 dark:from-violet-500/15 dark:via-purple-500/10 dark:to-fuchsia-500/5'
                    : 'border-gray-200/50 bg-white/80 dark:border-slate-700/60 dark:bg-slate-900/40 hover:border-violet-200 dark:hover:border-violet-500/30'
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.02, x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Accent bar */}
                <div 
                  className="absolute left-0 top-0 h-full w-1 transition-all duration-300 group-hover:w-1.5"
                  style={{ background: slot.tone.fillColor }}
                />
                
                {/* Content */}
                <div className="flex items-center gap-3 p-3 pl-4">
                  {/* Time and Score */}
                  <div className="flex min-w-[100px] flex-col">
                    <div className={`text-xs font-bold uppercase tracking-wider ${
                      isNow 
                        ? 'text-violet-600 dark:text-violet-400' 
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {slot.timeLabel}
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold leading-none" style={slot.tone.textStyle}>
                        {slot.score}
                      </span>
                      <span className="text-xs font-medium text-slate-400 dark:text-slate-500">/ 100</span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-12 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent dark:via-slate-600" />

                  {/* Badge and Temp */}
                  <div className="flex flex-1 flex-col items-start gap-1.5">
                    <span 
                      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm" 
                      style={slot.tone.badgeStyle}
                    >
                      {slot.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Thermometer className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {slot.apparentDisplay ?? "—"}
                      </span>
                    </div>
                  </div>

                  {/* Alerts */}
                  {slot.alerts?.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {slot.alerts.map((alert, alertIdx) => {
                        const meta = FORECAST_ALERT_META[alert.type];
                        if (!meta) return null;
                        const Icon = meta.Icon;
                        return (
                          <div
                            key={`${slot.time}-${alert.type}-${alertIdx}`}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${meta.badgeClass}`}
                            title={alert.message}
                          >
                            <Icon className={`h-3 w-3 ${meta.iconClass}`} />
                            <span className="hidden sm:inline">{meta.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                {/* Hover glow effect */}
                <div 
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(circle at left center, ${slot.tone.fillColor}15 0%, transparent 70%)`
                  }}
                />
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 dark:border-slate-700 dark:bg-slate-800/30">
          <Cloud className="h-10 w-10 text-slate-400 dark:text-slate-600" />
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">No forecast data available</p>
        </div>
      )}
    </CardContent>
  </Card>
);

const BestRunTimeCard = ({ derived, unit, className = "" }) => {
  if (!derived?.bestRunTimes?.today && !derived?.bestRunTimes?.tomorrow) return null;
  
  const { today, tomorrow } = derived.bestRunTimes;
  
  const renderTimeSlot = (slot, dayLabel) => {
    const { time, score, apparentF, wind, precipProb, uv, isNow } = slot;
    const date = new Date(time);
    const timeStr = isNow ? 'Now' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    
    const displayTemp = unit === "F" ? Math.round(apparentF) : Math.round((apparentF - 32) * 5 / 9);
    const label = scoreLabel(score);
    const tone = scoreTone(score, apparentF);
    
    const highlights = [];
    if (score >= 80) highlights.push("Excellent conditions");
    else if (score >= 65) highlights.push("Great conditions");
    else if (score >= 50) highlights.push("Good conditions");
    else highlights.push("Best available window");
    
    if (precipProb < 20) highlights.push("low precip risk");
    if (wind < 10) highlights.push("calm winds");
    if (uv < 3) highlights.push("low UV");
    else if (uv >= 6) highlights.push("high UV - sunscreen recommended");
    
    const isToday = dayLabel === "Today";
    const bgClass = isToday
      ? "border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-green-50/60 dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-green-500/5"
      : "border-sky-200/60 bg-gradient-to-br from-sky-50/80 to-blue-50/60 dark:border-sky-500/30 dark:from-sky-500/10 dark:to-blue-500/5";
    
    const textClass = isToday
      ? "text-emerald-700 dark:text-emerald-300"
      : "text-sky-700 dark:text-sky-300";
      
    const mainTextClass = isToday
      ? "text-emerald-900 dark:text-emerald-100"
      : "text-sky-900 dark:text-sky-100";
      
    const badgeClass = isToday
      ? "border-emerald-200 bg-white/60 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
      : "border-sky-200 bg-white/60 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200";
    
    return (
      <div className={`rounded-2xl border p-4 ${bgClass}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className={`text-xs font-medium uppercase tracking-wide ${textClass}`}>
              {dayLabel}
            </div>
            <div className={`mt-1 text-3xl font-bold ${mainTextClass}`}>
              {timeStr}
            </div>
            <div className="mt-2 text-sm text-gray-700 dark:text-slate-300">
              {displayTemp}°{unit} feels like • {highlights[0]}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-4xl font-bold" style={tone.textStyle}>
              {score}
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium" style={tone.badgeStyle}>
              {label.text}
            </span>
          </div>
        </div>
        {highlights.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {highlights.slice(1).map((highlight, idx) => (
              <span key={idx} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}>
                {highlight}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Best times to run</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {today && renderTimeSlot(today, "Today")}
        {tomorrow && renderTimeSlot(tomorrow, "Tomorrow")}
        {!today && !tomorrow && (
          <div className="rounded-lg border border-slate-200/60 bg-slate-50/60 p-3 text-center text-xs text-slate-600 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-400">
            No optimal run times found for today or tomorrow
          </div>
        )}
      </CardContent>
    </Card>
  );
};

import { MapPin, Thermometer, Droplets, Wind, CloudRain, Sun, Hand, Info, Flame, Sunrise as SunriseIcon, Sunset as SunsetIcon, Settings as SettingsIcon, Crosshair, Moon, X, TrendingUp, Cloud, CloudFog, UserRound, Calendar, Lightbulb, Activity, Clock, Gauge } from "lucide-react";
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

// Gear icon mapping for outfit items
const GEAR_ICONS = {
  // Tops
  singlet: UserRound,
  tShirt: UserRound,
  longSleeve: UserRound,
  jacket: Cloud,
  
  // Bottoms
  shorts: UserRound,
  tights: UserRound,
  
  // Accessories
  gloves: Hand,
  hat: UserRound,
  sunglasses: Sun,
  
  // Weather gear
  windbreaker: Wind,
  rainJacket: CloudRain,
  waterproof: CloudRain,
  
  // Hydration
  water: Droplets,
  hydration: Droplets,
};

// Comprehensive gear information database
const GEAR_INFO = {
  // Tops
  sports_bra: {
    name: "Sports Bra",
    category: "Tops",
    description: "Essential foundation for female runners providing support and comfort during runs.",
    whenToWear: "Worn as a base layer in warm weather (70°F+) or under other layers in cooler conditions.",
    tips: "Choose high-impact for intense workouts, medium for easy runs. Look for moisture-wicking fabrics.",
    tempRange: "All temperatures as base layer",
  },
  tank_top: {
    name: "Tank Top",
    category: "Tops",
    description: "Sleeveless running shirt for maximum ventilation and freedom of movement.",
    whenToWear: "Hot weather running (75°F+), especially in humid conditions or during hard workouts.",
    tips: "Great for summer racing. Apply sunscreen to exposed shoulders. Choose technical fabrics over cotton.",
    tempRange: "75°F and above",
  },
  short_sleeve: {
    name: "Short-Sleeve Tech Tee",
    category: "Tops",
    description: "Versatile moisture-wicking shirt suitable for a wide range of temperatures.",
    whenToWear: "Mild to warm weather (50-75°F). The go-to choice for most spring and fall runs.",
    tips: "Look for seamless construction to prevent chafing. Bright colors increase visibility.",
    tempRange: "50-75°F",
  },
  long_sleeve: {
    name: "Long-Sleeve Base",
    category: "Tops",
    description: "Technical long-sleeve shirt that provides warmth while wicking moisture away.",
    whenToWear: "Cool weather (40-55°F) or as a base layer in cold conditions.",
    tips: "Thumbholes keep sleeves in place. Can be layered under jackets for added warmth.",
    tempRange: "40-55°F",
  },
  vest: {
    name: "Light Running Vest",
    category: "Outerwear",
    description: "Core insulation without restricting arm movement. Wind-resistant front panel.",
    whenToWear: "Cool mornings (38-50°F) or windy conditions. Perfect for temperature fluctuations.",
    tips: "Great for runs that start cold but warm up. Easy to remove and carry if needed.",
    tempRange: "38-50°F",
  },
  light_jacket: {
    name: "Light Jacket",
    category: "Outerwear",
    description: "Lightweight wind and water-resistant outer layer for cold weather protection.",
    whenToWear: "Cold weather (30-45°F) with wind or light precipitation.",
    tips: "Look for reflective details for visibility. Pit zips help regulate temperature.",
    tempRange: "30-45°F",
  },
  insulated_jacket: {
    name: "Insulated Jacket",
    category: "Outerwear",
    description: "Heavy-duty jacket with thermal insulation for the coldest conditions.",
    whenToWear: "Very cold weather (below 25°F) or extreme wind chill.",
    tips: "May feel too warm during hard efforts. Best for easy runs in frigid temps.",
    tempRange: "Below 25°F",
  },
  
  // Bottoms
  split_shorts: {
    name: "Split Shorts",
    category: "Bottoms",
    description: "Lightweight racing shorts with side splits for maximum range of motion.",
    whenToWear: "Warm weather (60°F+), especially for speed workouts and races.",
    tips: "Built-in liner provides support. Short inseam increases ventilation and stride freedom.",
    tempRange: "60°F and above",
  },
  shorts: {
    name: "Running Shorts",
    category: "Bottoms",
    description: "Standard running shorts offering comfort and breathability.",
    whenToWear: "Mild to warm weather (50-70°F). Year-round for some experienced runners.",
    tips: "5-7 inch inseam is most common. Pockets are handy for keys or energy gels.",
    tempRange: "50-70°F",
  },
  tights: {
    name: "Running Tights",
    category: "Bottoms",
    description: "Form-fitting pants that provide muscle support and warmth.",
    whenToWear: "Cool to cold weather (30-50°F). Essential for winter running.",
    tips: "Compression tights aid recovery. Fleece-lined versions add extra warmth.",
    tempRange: "30-50°F",
  },
  thermal_tights: {
    name: "Thermal Tights",
    category: "Bottoms",
    description: "Insulated tights with thermal lining for extreme cold protection.",
    whenToWear: "Very cold weather (below 30°F) or high wind chill.",
    tips: "Double-layer construction traps heat. May need to size up for layering.",
    tempRange: "Below 30°F",
  },
  
  // Head & Hands
  cap: {
    name: "Running Cap",
    category: "Headwear",
    description: "Lightweight cap to shield eyes from sun and keep sweat out of your face.",
    whenToWear: "Sunny conditions with high UV index (6+). Useful in light rain too.",
    tips: "Mesh panels increase ventilation. Darker colors underneath bill reduce glare.",
    tempRange: "All temperatures",
  },
  brim_cap: {
    name: "Brimmed Cap/Visor",
    category: "Headwear",
    description: "Wide-brimmed hat or visor providing maximum sun and rain protection.",
    whenToWear: "Rain (40%+ chance) or intense sun. Long runs in exposed areas.",
    tips: "Visor keeps head cooler than full cap. Brim keeps rain off glasses.",
    tempRange: "All temperatures",
  },
  headband: {
    name: "Ear Band",
    category: "Headwear",
    description: "Covers ears while allowing heat to escape from the top of your head.",
    whenToWear: "Cool weather (35-45°F) when ears need protection but a beanie is too warm.",
    tips: "Perfect middle ground between bare head and beanie. Stays in place better than hats.",
    tempRange: "35-45°F",
  },
  beanie: {
    name: "Running Beanie",
    category: "Headwear",
    description: "Thermal hat that prevents significant heat loss from your head.",
    whenToWear: "Cold weather (below 35°F). Essential when temperature drops significantly.",
    tips: "You lose 10% of body heat through your head. Breathable fabric prevents overheating.",
    tempRange: "Below 35°F",
  },
  balaclava: {
    name: "Balaclava",
    category: "Headwear",
    description: "Full head and face coverage protecting cheeks, nose, and neck from extreme cold and wind.",
    whenToWear: "Very cold weather (below 10°F) or extreme wind chill. Essential for preventing frostbite.",
    tips: "Look for breathable mesh mouth panel to reduce moisture and fogging. Can layer under beanie for extra warmth at 0°F.",
    tempRange: "Below 10°F or severe wind chill",
  },
  light_gloves: {
    name: "Light Gloves",
    category: "Hands",
    description: "Thin, breathable gloves for mild cold protection.",
    whenToWear: "Cool mornings (40-50°F) when hands need light coverage.",
    tips: "Touch-screen compatible fingertips let you use your phone. Easy to pocket if you warm up.",
    tempRange: "40-50°F",
  },
  medium_gloves: {
    name: "Medium Gloves",
    category: "Hands",
    description: "Insulated gloves providing solid cold weather protection.",
    whenToWear: "Cold weather (25-40°F) or windy conditions.",
    tips: "Windproof shell on palm side. Moisture-wicking liner keeps hands dry.",
    tempRange: "25-40°F",
  },
  mittens: {
    name: "Running Mittens",
    category: "Hands",
    description: "Maximum hand warmth by keeping fingers together to share heat.",
    whenToWear: "Very cold weather (below 25°F) or severe wind chill.",
    tips: "Warmer than gloves but less dexterity. Consider convertible mitten-glove hybrids.",
    tempRange: "Below 25°F",
  },
  mittens_liner: {
    name: "Glove Liner (under mittens)",
    category: "Hands",
    description: "Thin inner glove worn under mittens for extreme cold layering.",
    whenToWear: "Extreme cold (below 10°F) or frostbite-level wind chill.",
    tips: "Can be worn alone in milder cold. Adds versatility to your hand protection system.",
    tempRange: "Below 10°F",
  },
  
  // Accessories
  arm_sleeves: {
    name: "Arm Sleeves",
    category: "Accessories",
    description: "Removable sleeves for sun protection or adaptable warmth.",
    whenToWear: "Variable temps on long runs, or sunny days needing UV protection.",
    tips: "Easy to remove and pocket when you warm up. UPF 50+ blocks harmful rays.",
    tempRange: "55-70°F",
  },
  neck_gaiter: {
    name: "Neck Gaiter",
    category: "Accessories",
    description: "Tube of fabric protecting neck and face from cold air and wind.",
    whenToWear: "Very cold (below 33°F) or very windy conditions (18+ mph).",
    tips: "Pull up over nose and mouth in extreme cold. Prevents breathing cold air directly.",
    tempRange: "Below 33°F",
  },
  windbreaker: {
    name: "Windbreaker",
    category: "Outerwear",
    description: "Ultra-light wind-blocking layer that packs down small.",
    whenToWear: "Windy conditions (15+ mph) in temps 45-60°F.",
    tips: "Packs into own pocket. Great insurance on long runs. Not waterproof.",
    tempRange: "45-60°F with wind",
  },
  rain_shell: {
    name: "Packable Rain Shell",
    category: "Outerwear",
    description: "Waterproof jacket designed to keep you dry in wet conditions.",
    whenToWear: "Rain probability 40%+ or during precipitation.",
    tips: "Breathable fabric prevents overheating. Bright colors increase visibility in storms.",
    tempRange: "All temperatures in rain",
  },
  sunglasses: {
    name: "Sunglasses",
    category: "Accessories",
    description: "UV-protective eyewear reducing glare and eye strain.",
    whenToWear: "High UV index (7+) or very sunny conditions.",
    tips: "Polarized lenses reduce road glare. Secure fit prevents bouncing while running.",
    tempRange: "All temperatures",
  },
  sunscreen: {
    name: "Sunscreen",
    category: "Accessories",
    description: "SPF protection preventing sunburn on exposed skin.",
    whenToWear: "UV index 6+ or any long run over 1 hour in daylight.",
    tips: "Sport formula resists sweat. Reapply every 80 minutes on long runs. SPF 30+ minimum.",
    tempRange: "All temperatures",
  },
  
  // Nutrition & Care
  hydration: {
    name: "Water/Hydration",
    category: "Nutrition",
    description: "Fluid replacement essential for performance and safety.",
    whenToWear: "Runs over 45 minutes, hot weather (75°F+), or high humidity (75%+).",
    tips: "Handheld bottle, vest, or belt. Drink before you feel thirsty. Electrolytes for 90+ min runs.",
    tempRange: "All temperatures",
  },
  energy_nutrition: {
    name: "Energy Gels/Chews",
    category: "Nutrition",
    description: "Quick-absorbing carbohydrates to fuel long runs.",
    whenToWear: "Long runs (90+ minutes) or runs over 50°F when body processes fuel efficiently.",
    tips: "Take with water. Start fueling at 45-60 minutes. 30-60g carbs per hour.",
    tempRange: "50°F and above",
  },
  anti_chafe: {
    name: "Anti-Chafe Balm",
    category: "Care",
    description: "Lubricant preventing friction and chafing on long runs.",
    whenToWear: "Runs over 60 minutes, humid conditions (75%+), or anywhere skin rubs.",
    tips: "Apply to inner thighs, underarms, nipples. Reapply on very long runs (2+ hours).",
    tempRange: "All temperatures",
  },
  
  // Socks
  light_socks: {
    name: "Light Running Socks",
    category: "Socks",
    description: "Thin moisture-wicking socks for warm weather comfort.",
    whenToWear: "Warm, dry conditions (60°F+) or indoor running.",
    tips: "Moisture-wicking prevents blisters. Seamless toe reduces irritation.",
    tempRange: "60°F and above",
  },
  heavy_socks: {
    name: "Heavy Running Socks",
    category: "Socks",
    description: "Cushioned socks with extra warmth and protection.",
    whenToWear: "Cold weather (below 40°F) or when extra cushioning is needed.",
    tips: "Merino wool regulates temperature. Extra padding reduces impact on long runs.",
    tempRange: "Below 40°F",
  },
  double_socks: {
    name: "Double Socks (layered)",
    category: "Socks",
    description: "Two layers of socks for extreme cold or blister prevention.",
    whenToWear: "Very cold/wet conditions (below 32°F) or high precipitation.",
    tips: "Thin liner sock under thicker outer sock. Helps manage moisture and adds warmth.",
    tempRange: "Below 32°F or wet conditions",
  },
};

/*
  RunFit Wardrobe — Single-file React (App.jsx)
  CHANGELOG:
  - Gender toggle (Female/Male) added for more personalized gear recommendations.
  - UI layout cleaned up into a more intuitive multi-column dashboard.
  - "Need-to-know" card moved next to the visual figure for better context.
  - Outfit algorithm refined for clarity and gender-specific logic.
  - Defaults to °F, Kansas City, MO, and "Female" profile.
*/

// --- Tiny UI primitives (inlined so it's all in one file) ---
const Card = ({ className = "", children }) => (
  <div className={`rounded-2xl bg-white/95 backdrop-blur-sm border border-gray-200/60 shadow-lg shadow-gray-200/50 dark:bg-slate-900/80 dark:border-slate-800 dark:shadow-2xl dark:shadow-slate-950/60 ${className}`}>{children}</div>
);
const CardHeader = ({ className = "", children }) => (
  <div className={`border-b border-gray-200/50 dark:border-slate-800 px-5 py-4 ${className}`}>{children}</div>
);
const CardTitle = ({ className = "", children }) => (
  <div className={`text-sm font-semibold tracking-tight text-gray-700 dark:text-slate-100 ${className}`}>{children}</div>
);
const CardContent = ({ className = "", children }) => (
  <div className={`p-4 text-gray-700 dark:text-slate-100 ${className}`}>{children}</div>
);

const Button = ({ variant = "default", className = "", ...props }) => {
  const map = {
    default: "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold shadow transition-colors bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50",
    secondary: "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium shadow-sm bg-white text-sky-700 ring-1 ring-sky-100 hover:bg-sky-50 disabled:opacity-50 dark:bg-slate-900 dark:text-sky-300 dark:ring-slate-700 dark:hover:bg-slate-800",
    outline: "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium shadow-sm border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 disabled:opacity-50 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800",
    ghost: "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800",
  };
  return <button className={`${map[variant]} ${className}`} {...props} />;
};

const Input = ({ className = "", ...props }) => (
  <input className={`w-full rounded-lg border border-gray-300/60 dark:border-slate-700 bg-white/80 dark:bg-slate-900 px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500 disabled:opacity-50 text-gray-700 dark:text-slate-100 ${className}`} {...props} />
);

const Label = ({ htmlFor, className = "", children }) => (
  <label htmlFor={htmlFor} className={`text-sm text-gray-500 dark:text-slate-300 ${className}`}>{children}</label>
);

const Switch = ({ checked, onCheckedChange, id }) => (
  <button id={id} role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? 'bg-sky-500' : 'bg-gray-200 dark:bg-slate-700'}`}>
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
  </button>
);

const SegmentedControl = ({ options, value, onChange }) => (
  <div className="flex items-center rounded-lg bg-gray-100 dark:bg-slate-800 p-1">
    {options.map(opt => (
      <button key={opt.value} onClick={() => onChange(opt.value)} className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${value === opt.value ? 'bg-white text-sky-700 shadow-sm dark:bg-slate-700 dark:text-sky-300' : 'text-gray-600 hover:bg-gray-200/50 dark:text-slate-300 dark:hover:bg-slate-700/80'}`}>
        {opt.label}
      </button>
    ))}
  </div>
);

const FORECAST_ALERT_META = {
  wind: {
    Icon: Wind,
    badgeClass: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-200",
    iconClass: "text-sky-500 dark:text-sky-300",
    label: "Wind",
  },
  rain: {
    Icon: CloudRain,
    badgeClass: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/20 dark:text-indigo-200",
    iconClass: "text-indigo-500 dark:text-indigo-300",
    label: "Precip",
  },
  uv: {
    Icon: Sun,
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-200",
    iconClass: "text-amber-500 dark:text-amber-300",
    label: "UV",
  },
};

// --- Utility helpers ---
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const round1 = (v) => Math.round(v * 10) / 10;
const msToMph = (ms) => ms * 2.2369362921;
const mmToInches = (mm) => mm * 0.0393701;
const cToF = (c) => (c * 9) / 5 + 32;
const fToC = (f) => ((f - 32) * 5) / 9;

function computeFeelsLike(tempC, windMs, humidityPct) {
  const tempF = cToF(tempC);
  const windMph = msToMph(windMs);
  let feelsF = tempF;

  if (tempF <= 50 && windMph > 3) {
    const v16 = Math.pow(windMph, 0.16);
    feelsF = 35.74 + 0.6215 * tempF - 35.75 * v16 + 0.4275 * tempF * v16;
  } else if (tempF >= 80 && humidityPct >= 40) {
    const R = humidityPct;
    const T = tempF;
    const hi =
      -42.379 +
      2.04901523 * T +
      10.14333127 * R -
      0.22475541 * T * R -
      6.83783e-3 * T * T -
      5.481717e-2 * R * R +
      1.22874e-3 * T * T * R +
      8.5282e-4 * T * R * R -
      1.99e-6 * T * T * R * R;
    feelsF = Math.max(T, hi);
  }

  return { f: feelsF, c: fToC(feelsF) };
}

function blendWeather(primary, secondary) {
  const { provider: _pp, ...p } = primary;
  const { provider: _ps, ...s } = secondary || {};
  const avg = (a, b) => {
    if (typeof a === "number" && typeof b === "number") return (a + b) / 2;
    if (typeof a === "number") return a;
    if (typeof b === "number") return b;
    return undefined;
  };

  return {
    ...p,
    temperature: avg(p.temperature, s?.temperature),
    apparent: avg(p.apparent, s?.apparent),
    wind: avg(p.wind, s?.wind),
    humidity: avg(p.humidity, s?.humidity),
    precip: avg(p.precip, s?.precip),
    precipProb: avg(p.precipProb, s?.precipProb),
    uv: avg(p.uv, s?.uv),
    cloud: avg(p.cloud, s?.cloud),
  };
}

// Default to Kansas City, MO (F)
const APP_VERSION = "1.2.1"; // Increment to force cache clear
const DEFAULT_PLACE = { name: "Kansas City, MO", lat: 39.0997, lon: -94.5786, source: 'default' };

const nominatimHeaders = () => ({
  "User-Agent": `SamsFitCast/1.0 (${window.location.href})`,
  "Accept-Language": "en",
});

// Map Open-Meteo hourly array to current hour index
function getCurrentHourIndex(times) {
  if (!Array.isArray(times) || times.length === 0) return 0;
  const now = Date.now();
  let previousIdx = 0;

  for (let i = 0; i < times.length; i += 1) {
    const parsed = Date.parse(times[i]);
    if (!Number.isFinite(parsed)) continue;
    if (parsed > now) {
      return i === 0 ? 0 : previousIdx;
    }
    previousIdx = i;
  }

  return previousIdx;
}

async function fetchMetNoWeather(p, unit) {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${p.lat}&lon=${p.lon}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('MET Norway fetch failed');
  const data = await res.json();
  const first = data?.properties?.timeseries?.[0];
  if (!first?.data?.instant?.details) throw new Error('MET Norway missing data');

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

  const feels = typeof tempC === 'number' ? computeFeelsLike(tempC, windMs ?? 0, humidity ?? 50) : null;

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


// --- Hands/Socks Helpers ---
function handsLevelFromGear(keys) {
  if (keys.includes("mittens") && keys.includes("mittens_liner")) return 4;
  if (keys.includes("mittens")) return 3;
  if (keys.includes("medium_gloves")) return 2;
  if (keys.includes("light_gloves")) return 1;
  return 0;
}
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

function chooseSocks({ apparentF, precipIn, precipProb, windMph, humidity }) {
  // Three-level progression: light_socks -> heavy_socks -> double_socks
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

// Calculate effective temperature considering all weather factors
function calculateEffectiveTemp({ apparentF, humidity, windMph, uvIndex, precipProb, isDay }, tempSensitivity = 0) {
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
  
  return Math.round(effectiveTemp);
}

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
  let willRain = precipProb > 40 || precipIn > 0.02;
  
  if (longRun && hourlyForecast.length > 1) {
    // Look ahead 2 hours (indices 1 and 2)
    for (let i = 1; i <= Math.min(2, hourlyForecast.length - 1); i++) {
      const future = hourlyForecast[i];
      if (future.apparent != null) {
        const futureTemp = future.apparent;
        tempChange = Math.max(tempChange, futureTemp - T);
      }
      if (future.precipProb != null) maxPrecipProb = Math.max(maxPrecipProb, future.precipProb);
      if (future.precip != null && future.precip > 0.02) willRain = true;
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
  if (precipProb > 40 || precipIn > 0.02 || (longRun && willRain)) { 
    gear.add("rain_shell").add("brim_cap"); 
  }
  
  // --- Enhanced Wind Logic: Research-backed windbreaker "sweet spots" ---
  // Based on feels-like temp (apparent temp already accounts for wind chill)
  // Sources: REI, Runner's World, NWS wind chill guidance
  // 
  // Sweet spots by run type (feels-like °F):
  // - Easy runs: 40-55°F → breathable windbreaker ideal
  // - Hard/tempo/intervals: 35-50°F → more heat generation, lighter needed
  // - Long runs: 38-58°F → longer exposure, prioritize windblock + breathability
  //
  // Wind tiers:
  // - Breezy (5-12 mph): noticeable cooling, helpful in mid-40s to low-50s
  // - Windy (13-20 mph): strong cooling, shift ranges 5-10°F warmer
  
  const feelsLike = effectiveT; // Already accounts for wind chill and heat
  const isBreezy = windMph >= 5 && windMph < 13;
  const isWindy = windMph >= 13;
  
  // Determine windbreaker sweet spot based on run type
  let windBreakerMin, windBreakerMax;
  if (workout) {
    // Hard efforts generate more heat: 35-50°F range
    windBreakerMin = 35;
    windBreakerMax = 50;
  } else if (longRun) {
    // Long runs need longer exposure protection: 38-58°F range
    windBreakerMin = 38;
    windBreakerMax = 58;
  } else {
    // Easy runs: 40-55°F range
    windBreakerMin = 40;
    windBreakerMax = 55;
  }
  
  // Adjust ranges for wind intensity
  if (isWindy) {
    // Strong winds (13-20+ mph): shift range 5-10°F warmer
    windBreakerMax += 7;
    windBreakerMin += 5;
  } else if (isBreezy) {
    // Breezy (5-12 mph): slight shift
    windBreakerMax += 3;
  }
  
  // Add windbreaker if in sweet spot and no rain shell (rain shell provides wind protection)
  if (feelsLike >= windBreakerMin && feelsLike <= windBreakerMax && !gear.has("rain_shell")) {
    gear.add("windbreaker");
  }
  
  // Below windbreaker range in windy/cold conditions: add vest for core wind protection
  if (isWindy && feelsLike < windBreakerMin && !gear.has("windbreaker") && !gear.has("rain_shell")) {
    gear.add("vest"); // Wind vest for very cold + windy
  }
  // Sun protection: only add cap if we don't already have brim_cap (brim provides better sun protection)
  if (uvIndex >= 7 || (longRun && maxUV >= 6)) { 
    if (!gear.has("brim_cap")) {
      gear.add("cap");
    }
    gear.add("sunglasses").add("sunscreen"); 
    if (longRun && T > 55) gear.add("arm_sleeves"); // Sun protection for long exposed runs
  }
  if (humidity >= 75 && T >= 65) { gear.add("anti_chafe").add("hydration"); }
  
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
    if (tempChange > 8) gear.add("arm_sleeves"); // Versatile for temp swings
    // Only suggest rain shell if there's a reasonable chance of rain (>30%) and we don't already have it
    if (maxPrecipProb > 40 && !gear.has("rain_shell")) {
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
  
  // Additional adjustment for cold hands: if user has cold hands, make them feel 5°F colder for glove decisions
  const gloveAdjT = coldHands ? adjT - 5 : adjT;
  
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
    tights: "Running tights", vest: "Light running vest", light_jacket: "Light jacket", light_gloves: "Light gloves", medium_gloves: "Medium gloves", headband: "Ear band",
    shorts: "Shorts", split_shorts: "Split shorts", short_sleeve: "Short-sleeve tech tee", tank_top: "Tank top", sports_bra: "Sports bra",
    cap: "Cap", brim_cap: "Brimmed cap/visor", rain_shell: "Packable rain shell", windbreaker: "Windbreaker", sunglasses: "Sunglasses", sunscreen: "Sunscreen",
    hydration: "Bring water", anti_chafe: "Anti-chafe balm", light_socks: "Light socks", heavy_socks: "Heavy socks", double_socks: "Double socks (layered)", beanie: "Beanie", balaclava: "Balaclava",
    arm_sleeves: "Arm sleeves", energy_nutrition: "Energy gels/chews",
  };
  const perfOrder = ["sports_bra", "tank_top", "short_sleeve", "long_sleeve", "vest", "light_jacket", "insulated_jacket", "split_shorts", "shorts", "tights", "thermal_tights", "cap", "brim_cap", "headband", "beanie", "arm_sleeves", "light_gloves", "medium_gloves", "mittens", "mittens_liner", "windbreaker", "rain_shell", "sunglasses", "sunscreen", "hydration", "energy_nutrition", "anti_chafe", "light_socks", "heavy_socks", "double_socks", "neck_gaiter"];
  const comfortOrder = ["sports_bra", "short_sleeve", "long_sleeve", "tank_top", "light_jacket", "insulated_jacket", "vest", "tights", "thermal_tights", "shorts", "split_shorts", "beanie", "headband", "cap", "brim_cap", "arm_sleeves", "mittens", "mittens_liner", "medium_gloves", "light_gloves", "heavy_socks", "light_socks", "double_socks", "neck_gaiter", "windbreaker", "rain_shell", "sunglasses", "sunscreen", "hydration", "energy_nutrition", "anti_chafe"];

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

// Default settings
const DEFAULT_SETTINGS = {
  place: DEFAULT_PLACE,
  query: "Kansas City, MO",
  unit: "F",
  coldHands: false,
  gender: "Female",
  customTempEnabled: false,
  customTempInput: "",
  activeOption: "A",
  theme: "dark",
  twilightTerms: "dawn-dusk",
  tempSensitivity: 0,
  runnerBoldness: 0,
  runHoursStart: 4,
  runHoursEnd: 20,
  showTomorrowOutfit: true,
  tomorrowRunHour: 6,
  tomorrowRunType: "easy"
};

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
  const [tomorrowCardRunType, setTomorrowCardRunType] = useState(initialSettings.tomorrowRunType);
  const [tomorrowCardOption, setTomorrowCardOption] = useState('A'); // 'A' = Performance, 'B' = Comfort
  const [lastUpdated, setLastUpdated] = useState(null);
  const [debugActive, setDebugActive] = useState(false);
  const [debugInputs, setDebugInputs] = useState({
    apparent: "",
    temp: "",
    wind: "",
    humidity: "",
    precipProb: "",
    precipIn: "",
    uvIndex: "",
    cloudCover: "",
    isDay: true,
    debugTimeHour: "",
  });
  const [showRefreshToast, setShowRefreshToast] = useState(false);

  // Tap-to-refresh handler
  const handleLocationRefresh = async () => {
    if (!loading) {
      await fetchWeather(place, unit);
      setShowRefreshToast(true);
      setTimeout(() => setShowRefreshToast(false), 2000);
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
      tomorrowRunType
    };
    saveSettings(settings);
  }, [place, query, unit, coldHands, gender, customTempEnabled, customTempInput, activeOption, theme, twilightTerms, tempSensitivity, runnerBoldness, runHoursStart, runHoursEnd, showTomorrowOutfit, tomorrowRunHour, tomorrowRunType]);

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
      isDay,
      sources: {
        ...(base.sources || {}),
        debug: {
          label: "Debug scenario",
          appliedAt: new Date().toISOString(),
          values: { temperature, apparent, wind, humidity, precipProb, precip, uv, cloud, isDay },
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
    setLoading(true); setError("");
    try {
  const tempUnit = u === "F" ? "fahrenheit" : "celsius";
  const primaryUrl = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current_weather=true&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,cloud_cover,uv_index,wind_speed_10m&daily=sunrise,sunset&temperature_unit=${tempUnit}&windspeed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=3`;

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

  const ipLocationFallback = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      const d = await res.json();
      if (!d?.latitude) throw new Error("IP API failed");
      const nameGuess = d.city && d.region ? `${d.city}, ${d.region}` : "Approximate location";
      const p = { name: nameGuess, lat: d.latitude, lon: d.longitude, source: 'ip' };
      setPlace(p); setQuery(p.name); await fetchWeather(p, unit);
      setError("Using approximate location. For GPS, enable location permissions.");
    } catch (e) {
      setError("Couldn't get your location. Please search a city.");
      await fetchWeather(DEFAULT_PLACE, unit);
    }
  };

  const tryGeolocate = async () => {
    setLoading(true); setError("");
    try {
      if (!("geolocation" in navigator) || !window.isSecureContext) { await ipLocationFallback(); return; }
      const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }));
      const { latitude, longitude } = pos.coords;
      
      // Set a temporary name and start weather fetch immediately
      const p = { name: "Current location", lat: latitude, lon: longitude, source: 'gps' };
      setPlace(p); 
      setQuery("Current location");
      fetchWeather(p, unit); // Don't await, let it run

      // Now, try to get a better name without blocking the UI
      reverseGeocode(latitude, longitude);

    } catch (err) { await ipLocationFallback(); } finally { setLoading(false); }
  };

  useEffect(() => { tryGeolocate(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const breakdown = computeScoreBreakdown(
    {
      tempF: tempFWx,
      apparentF: usedApparentF,
      humidity: wx.humidity,
      windMph: wx.wind,
      precipProb: wx.precipProb,
      precipIn: wx.precip,
      uvIndex: wx.uv,
    },
    workout,
    coldHands,
    recs.handsLevel,
    longRun
  );
  const score = breakdown.score;

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

  const approach = makeApproachTips({
    score,
    parts: breakdown.parts,
    dpF,
    apparentF: usedApparentF,
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

      // Align "Now" slot exactly with the values driving the primary gauge/controls.
      if (idx === 0) {
        slotTemp = wx.temperature;
        slotHumidity = wx.humidity;
        slotWind = wx.wind;
        slotPrecipProb = wx.precipProb;
        slotPrecip = wx.precip;
        slotUv = wx.uv;
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
        },
        workout,
        coldHands,
        slotOutfit.handsLevel
      );

      const slotScore = slotBreakdown.score;
      const slotLabel = scoreLabel(slotScore);
      const tone = scoreTone(slotScore, slotApparentF);

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

  const tone = scoreTone(score, usedApparentF);
  
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


  const gaugeData = useMemo(() => {
    const fillColor = derived?.tone?.fillColor || "#0ea5e9";
    return [{ name: "score", value: derived?.score ?? 0, fill: fillColor }];
  }, [derived?.score, derived?.tone]);

  // Compare options by gear keys only (ignore workout/coldHands metadata)
  const encodeOptionList = (list = []) => list.map((item) => item.key).sort().join(",");
  const optionsDiffer = derived ? encodeOptionList(derived.recs.optionA) !== encodeOptionList(derived.recs.optionB) : false;

  useEffect(() => {
    if (!optionsDiffer) setActiveOption("A");
  }, [optionsDiffer]);

  const activeItems = derived
    ? optionsDiffer && activeOption === "B"
      ? derived.recs.optionB
      : derived.recs.optionA
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
  const condition = derived && apparentForCondition != null
    ? getRunningCondition(apparentForCondition)
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
    ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100"
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
              uvIndex: avgUv
            },
            tomorrowCardRunType === 'workout',
            coldHands,
            tomorrowOutfit.handsLevel
          );
          
          const tomorrowScore = tomorrowBreakdown.score;
          const tomorrowLabel = scoreLabel(tomorrowScore);
          const tomorrowTone = scoreTone(tomorrowScore, avgApparent);
          const displayTemp = unit === "F" ? Math.round(avgApparent) : Math.round((avgApparent - 32) * 5 / 9);
          const tomorrowItems = tomorrowCardOption === 'A' ? (tomorrowOutfit.optionA || []) : (tomorrowOutfit.optionB || []);
          
          return (
            <motion.div
              variants={cardVariants}
              initial="initial"
              animate="animate"
              className="mb-6"
            >
              <Card className="overflow-hidden border-2 border-sky-400 dark:border-sky-600 bg-gradient-to-br from-sky-100 via-blue-50 to-sky-100 dark:from-sky-900/70 dark:via-blue-900/50 dark:to-sky-900/70 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-sky-600 to-blue-700 dark:from-sky-700 dark:to-blue-800 pb-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/30 backdrop-blur-sm ring-2 ring-white/40">
                        <Calendar className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">Tomorrow's Run</div>
                        <div className="text-sm text-sky-100">Lay out your gear tonight</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-xs font-medium text-sky-100">
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
                  
                  {/* Run Type Pills */}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => { setTomorrowCardRunType('easy'); setTomorrowRunType('easy'); }}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        tomorrowCardRunType === 'easy'
                          ? 'bg-white text-sky-700 shadow-lg'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      Easy
                    </button>
                    <button
                      onClick={() => { setTomorrowCardRunType('workout'); setTomorrowRunType('workout'); }}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        tomorrowCardRunType === 'workout'
                          ? 'bg-white text-orange-700 shadow-lg'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      Workout
                    </button>
                    <button
                      onClick={() => { setTomorrowCardRunType('longRun'); setTomorrowRunType('longRun'); }}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        tomorrowCardRunType === 'longRun'
                          ? 'bg-white text-purple-700 shadow-lg'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      Long
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Weather Summary */}
                    <div className="rounded-xl border-2 border-sky-300/60 dark:border-sky-700/60 bg-white dark:bg-slate-800 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-sky-700 dark:text-sky-300">Conditions</div>
                          <div className="mt-1 text-3xl font-bold text-sky-900 dark:text-sky-100">{displayTemp}°{unit}</div>
                          {slots.length > 1 && (
                            <div className="mt-0.5 text-xs text-sky-600 dark:text-sky-400">Avg of {slots.length} hours</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-bold" style={tomorrowTone.textStyle}>{tomorrowScore}</div>
                          <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold" style={tomorrowTone.badgeStyle}>
                            {tomorrowLabel.text}
                          </span>
                        </div>
                      </div>
                      {/* Weather Description */}
                      <div className="mt-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {(() => {
                          const temp = Math.round(avgApparent);
                          const wind = Math.round(avgWind);
                          const precip = Math.round(avgPrecipProb);
                          const humid = Math.round(avgHumidity);
                          
                          let description = "";
                          
                          // Temperature feel
                          if (temp < 32) description += "Freezing";
                          else if (temp < 40) description += "Very cold";
                          else if (temp < 50) description += "Cold";
                          else if (temp < 60) description += "Cool";
                          else if (temp < 70) description += "Mild";
                          else if (temp < 80) description += "Warm";
                          else description += "Hot";
                          
                          // Precipitation
                          if (precip >= 70) description += " with heavy rain likely";
                          else if (precip >= 40) description += " with rain possible";
                          
                          // Wind
                          if (wind >= 20) description += ", very windy";
                          else if (wind >= 15) description += ", breezy";
                          
                          // Humidity
                          if (humid >= 80 && temp >= 60) description += ", humid";
                          
                          description += ".";
                          
                          // Advice
                          if (temp < 40 && wind >= 15) description += " Windchill will be a factor.";
                          else if (temp >= 75 && humid >= 70) description += " Stay hydrated.";
                          else if (precip >= 60) description += " Bring waterproof gear.";
                          
                          return description;
                        })()}
                      </div>
                      {(avgPrecipProb >= 40 || avgWind >= 15 || avgUv >= 6) && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {avgPrecipProb >= 40 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                              <CloudRain className="h-3 w-3" />
                              {Math.round(avgPrecipProb)}%
                            </span>
                          )}
                          {avgWind >= 15 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                              <Wind className="h-3 w-3" />
                              {Math.round(avgWind)} mph
                            </span>
                          )}
                          {avgUv >= 6 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                              <Sun className="h-3 w-3" />
                              UV {Math.round(avgUv)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Outfit List */}
                    <div className="rounded-xl border-2 border-sky-300/60 dark:border-sky-700/60 bg-white dark:bg-slate-800 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Your Gear</div>
                        <div className="flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-700/50 p-0.5">
                          <button
                            onClick={() => setTomorrowCardOption('A')}
                            className={`rounded-md px-2 py-1 text-xs font-medium transition-all ${
                              tomorrowCardOption === 'A'
                                ? 'bg-white dark:bg-slate-600 text-sky-700 dark:text-sky-300 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                          >
                            Performance
                          </button>
                          <button
                            onClick={() => setTomorrowCardOption('B')}
                            className={`rounded-md px-2 py-1 text-xs font-medium transition-all ${
                              tomorrowCardOption === 'B'
                                ? 'bg-white dark:bg-slate-600 text-sky-700 dark:text-sky-300 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }`}
                          >
                            Comfort
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {tomorrowItems.map((item, idx) => (
                          <motion.div
                            key={item.key}
                            className="flex items-center gap-2 text-sm"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                          >
                            <span className="text-sky-500 dark:text-sky-400">•</span>
                            <span className="font-medium text-slate-900 dark:text-slate-100">{item.label}</span>
                            {item.detail && <span className="text-xs text-slate-500 dark:text-slate-400">({item.detail})</span>}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })()}

        {/* Controls */}
        <motion.div variants={cardVariants}>
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-br from-sky-500/10 via-blue-500/10 to-indigo-500/10 dark:from-sky-500/20 dark:via-blue-500/20 dark:to-indigo-500/20 py-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${
                    gender === "Female"
                      ? "from-pink-500 to-rose-600 dark:from-pink-400 dark:to-rose-500"
                      : "from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500"
                  }`}>
                    <Gauge className="h-4 w-4 text-white" />
                  </div>
                  Run Controls
                </span>
                <span className={`flex items-center text-xl leading-none ${
                  gender === "Female"
                    ? "text-pink-500 dark:text-pink-400"
                    : "text-blue-500 dark:text-blue-400"
                }`}>
                  {gender === "Female" ? "♀" : "♂"}
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
                  
                  {/* Condition Badge */}
                  {derived && condition && (
                    <motion.span 
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${condition.badgeClass}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                    >
                      {condition.text}
                    </motion.span>
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
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Run Score</span>
                        <span className="text-3xl font-extrabold" style={derived.tone.textStyle}>{derived.score}</span>
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
            <motion.div className="flex flex-col gap-6 lg:col-start-1" variants={cardVariants}>
                <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-br from-gray-50/50 to-white dark:from-slate-900/50 dark:to-slate-900">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                          <CardTitle className="text-base">{optionTitle}</CardTitle>
                        </div>
                        {optionsDiffer && (
                          <SegmentedControl
                            value={activeOption}
                            onChange={setActiveOption}
                            options={[
                              { label: "Performance", value: "A" },
                              { label: "Comfort", value: "B" },
                            ]}
                          />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      {derived ? (
                        <>
                          <motion.div 
                            className="space-y-2"
                            variants={staggerContainer}
                            initial="initial"
                            animate="animate"
                          >
                            {activeItems.map((item, idx) => (
                              <motion.div 
                                key={item.key} 
                                className="group relative rounded-xl border border-gray-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white to-gray-50/30 dark:from-slate-800/40 dark:to-slate-900/40 px-4 py-3 transition-all hover:shadow-sm hover:border-gray-300 dark:hover:border-slate-600"
                                variants={listItemVariants}
                                whileHover={{ x: 4, transition: { duration: 0.2 } }}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gray-100 to-gray-200/50 dark:from-slate-700/60 dark:to-slate-800/60 text-xs font-bold text-gray-600 dark:text-slate-300">
                                      {idx + 1}
                                    </div>
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
                          
                          {!optionsDiffer ? (
                            <motion.div 
                              className="mt-4 rounded-xl border border-emerald-200/60 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 px-4 py-3"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 dark:bg-emerald-500/30 mt-0.5">
                                  <svg className="h-3 w-3 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                  </svg>
                                </div>
                                <p className="text-xs font-medium leading-relaxed text-emerald-800 dark:text-emerald-200">
                                  Perfect alignment! Performance and comfort recommendations match today—this outfit optimizes both.
                                </p>
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
                                <p className="text-xs font-medium leading-relaxed text-blue-800 dark:text-blue-200">
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
                          <CardTitle className="text-base">Today's Run Strategy</CardTitle>
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
                
                <ForecastCard derived={derived} className="lg:hidden" />
                <BestRunTimeCard derived={derived} unit={unit} className="lg:hidden" />

            </motion.div>

      {/* Center Column */}
  <motion.div variants={cardVariants}>
  <Card className="relative lg:col-start-2">
  <CardHeader className="pb-3">
    <div className="flex items-start justify-between">
      <div>
        <CardTitle className="text-xl font-bold">Run ! Score</CardTitle>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {derived ? derived.label.tone : "Loading conditions..."}
        </p>
      </div>
      {condition && (
        <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium ${condition.badgeClass}`}>
          {condition.text}
        </span>
      )}
    </div>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Score Gauge */}
    <div className="relative flex items-center justify-center">
      <RadialBarChart width={240} height={240} cx={120} cy={120} innerRadius={80} outerRadius={105} barSize={20} data={gaugeData} startAngle={225} endAngle={-45}>
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar minAngle={15} background dataKey="value" clockWise cornerRadius={20} />
      </RadialBarChart>
      <div className="pointer-events-none absolute text-center">
        <div className="text-6xl font-extrabold" style={derived?.tone?.textStyle}>
          {derived ? derived.score : "--"}
        </div>
        <div className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">out of 10</div>
      </div>
    </div>

    {/* View Insights Button */}
    <motion.button
      onClick={() => setShowInsights(true)}
      className="w-full rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50/60 dark:bg-sky-500/10 px-4 py-3 text-sm font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-100/80 dark:hover:bg-sky-500/20 transition-colors flex items-center justify-center gap-2"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Info className="h-4 w-4" />
      View Score Insights
    </motion.button>

    {/* Weather Details Grid */}
    <motion.div 
      className="grid grid-cols-2 gap-2.5"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div 
        className="flex items-center gap-2.5 rounded-xl border border-gray-200/40 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-3"
        variants={listItemVariants}
        whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100/80 dark:bg-sky-500/20">
          <Thermometer className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-gray-600 dark:text-slate-400">Temp / Feels</div>
          <div className="text-sm font-bold text-gray-700 dark:text-slate-100">
            {wx && Number.isFinite(derived?.tempDisplay) && Number.isFinite(derived?.displayApparent) 
              ? `${Math.round(derived.tempDisplay)}° / ${Math.round(derived.displayApparent)}°${unit}${derived.manualOn ? ' *' : ''}` 
              : "--"}
          </div>
        </div>
      </motion.div>
      <motion.div 
        className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-3"
        variants={listItemVariants}
        whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/20">
          <Droplets className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-gray-500 dark:text-slate-400">Dew Point</div>
          <div className="text-sm font-bold text-gray-800 dark:text-slate-100">
            {wx && Number.isFinite(derived?.dewPointDisplay) ? `${round1(derived.dewPointDisplay)}°${unit}` : "--"}
          </div>
        </div>
      </motion.div>
      <motion.div 
        className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-3"
        variants={listItemVariants}
        whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/20">
          <Droplets className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-gray-500 dark:text-slate-400">Humidity</div>
          <div className="text-sm font-bold text-gray-800 dark:text-slate-100">
            {wx ? `${round1(wx.humidity)}%` : "--"}
          </div>
        </div>
      </motion.div>
      <motion.div 
        className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-3"
        variants={listItemVariants}
        whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/20">
          <Wind className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-gray-500 dark:text-slate-400">Wind</div>
          <div className="text-sm font-bold text-gray-800 dark:text-slate-100">
            {wx ? `${round1(wx.wind)} mph` : "--"}
          </div>
        </div>
      </motion.div>
      <motion.div 
        className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-3"
        variants={listItemVariants}
        whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/20">
          <CloudRain className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-gray-500 dark:text-slate-400">Precip</div>
          <div className="text-sm font-bold text-gray-800 dark:text-slate-100">
            {wx ? `${round1(wx.precipProb)}%` : "--"}
          </div>
        </div>
      </motion.div>
      <motion.div 
        className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-3"
        variants={listItemVariants}
        whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/20">
          <Sun className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-gray-500 dark:text-slate-400">UV Index</div>
          <div className="text-sm font-bold text-gray-800 dark:text-slate-100">
            {wx ? round1(wx.uv) : "--"}
          </div>
        </div>
      </motion.div>
      <motion.div 
        className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-3"
        variants={listItemVariants}
        whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/20">
          <Cloud className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-gray-500 dark:text-slate-400">Cloud Cover</div>
          <div className="text-sm font-bold text-gray-800 dark:text-slate-100">
            {wx ? `${round1(wx.cloud)}%` : "--"}
          </div>
        </div>
      </motion.div>
      {wx && (wx.humidity > 85 && Math.abs(wx.temperature - (derived?.dewPointDisplay || 0)) < 5) && (
        <motion.div 
          className="flex items-center gap-2.5 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-3"
          variants={listItemVariants}
          whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20">
            <CloudFog className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-amber-600 dark:text-amber-400">Fog Detected</div>
            <div className="text-sm font-bold text-amber-800 dark:text-amber-200">
              Low Visibility
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>

    {/* Bottom-line recommendation - REMOVED, now in separate card */}
  </CardContent>
</Card>
  </motion.div>
            
        <motion.div variants={cardVariants}>
          <ForecastCard derived={derived} className="lg:col-start-3 hidden lg:block" />
          <BestRunTimeCard derived={derived} unit={unit} className="lg:col-start-3 hidden lg:block" />
        </motion.div>
        </motion.div>

        {/* Night Running Conditions Card - Completely Redesigned */}
        {derived?.moonPhase && (
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
                          {100 - (wx?.cloud || 0)}%
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
                          <span className="font-medium">{100 - (wx?.cloud || 0)}%</span>
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
        )}

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
              uvIndex: avgUv
            },
            tomorrowCardRunType === 'workout',
            coldHands,
            tomorrowOutfit.handsLevel
          );
          
          const tomorrowScore = tomorrowBreakdown.score;
          const tomorrowLabel = scoreLabel(tomorrowScore);
          const tomorrowTone = scoreTone(tomorrowScore, avgApparent);
          
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
                            <div className="text-2xl font-bold" style={tomorrowTone.textStyle}>{tomorrowScore}</div>
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
                          return (
                            <motion.button
                              key={key}
                              onClick={() => setSelectedGearItem(key)}
                              className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md transition-all text-left"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{info.name}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{info.tempRange}</div>
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
                return (
                  <>
                    <div className="border-b border-sky-200/60 bg-gradient-to-r from-sky-600 to-blue-700 dark:from-sky-700 dark:to-blue-800 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-bold text-white">{item.name}</h2>
                          <div className="text-xs text-sky-100">{item.category}</div>
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
                    className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-1.5 ${
                      gender === "Female"
                        ? "bg-pink-500 dark:bg-pink-600 text-white shadow-md"
                        : "bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span className="text-base leading-none">♀</span>
                    <span>Female</span>
                  </button>
                  <button
                    onClick={() => setGender("Male")}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-1.5 ${
                      gender === "Male"
                        ? "bg-blue-500 dark:bg-blue-600 text-white shadow-md"
                        : "bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span className="text-base leading-none">♂</span>
                    <span>Male</span>
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
                        <Button onClick={searchCity} disabled={loading}>Set</Button>
                        <Button variant="secondary" onClick={tryGeolocate} disabled={loading}>
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
              
              {/* Gear Guide */}
              <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 p-4 space-y-3">
                <div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-slate-200">Running Gear Guide</div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Learn about all the gear items - what they are, when to wear them, and pro tips.</p>
                </div>
                <Button variant="secondary" onClick={() => setShowGearGuide(true)} className="w-full">
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
                  <Button variant="secondary" onClick={() => setShowDebug(true)}>
                    Open debug modal
                  </Button>
                  {debugActive && (
                    <Button variant="ghost" onClick={clearDebugScenario} className="text-amber-600 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-200">
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
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setDebugInputs({ apparent: "30", temp: "32", wind: "5", humidity: "65", precipProb: "0", precipIn: "0", uvIndex: "0", cloudCover: "20", isDay: true })}
                      className="text-xs"
                    >
                      Cold 30°F
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setDebugInputs({ apparent: "28", temp: "30", wind: "18", humidity: "60", precipProb: "0", precipIn: "0", uvIndex: "0", cloudCover: "40", isDay: true })}
                      className="text-xs"
                    >
                      Cold + Windy
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setDebugInputs({ apparent: "33", temp: "35", wind: "8", humidity: "75", precipProb: "70", precipIn: "0.08", uvIndex: "0", cloudCover: "95", isDay: true })}
                      className="text-xs"
                    >
                      Freezing Rain
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setDebugInputs({ apparent: "40", temp: "42", wind: "12", humidity: "55", precipProb: "0", precipIn: "0", uvIndex: "2", cloudCover: "30", isDay: true })}
                      className="text-xs"
                    >
                      Cool 40°F
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setDebugInputs({ apparent: "75", temp: "75", wind: "5", humidity: "80", precipProb: "0", precipIn: "0", uvIndex: "8", cloudCover: "50", isDay: true })}
                      className="text-xs"
                    >
                      Hot + Humid
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Real feel / apparent</label>
                    <Input type="number" value={debugInputs.apparent} onChange={handleDebugInput('apparent')} placeholder="e.g., 38" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Actual temperature</label>
                    <Input type="number" value={debugInputs.temp} onChange={handleDebugInput('temp')} placeholder="e.g., 40" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Wind speed (mph)</label>
                    <Input type="number" value={debugInputs.wind} onChange={handleDebugInput('wind')} placeholder="e.g., 12" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Humidity (%)</label>
                    <Input type="number" value={debugInputs.humidity} onChange={handleDebugInput('humidity')} placeholder="e.g., 65" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Precip probability (%)</label>
                    <Input type="number" value={debugInputs.precipProb} onChange={handleDebugInput('precipProb')} placeholder="e.g., 40" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Precip amount (in)</label>
                    <Input type="number" value={debugInputs.precipIn} onChange={handleDebugInput('precipIn')} placeholder="e.g., 0.05" step="0.01" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">UV index</label>
                    <Input type="number" value={debugInputs.uvIndex} onChange={handleDebugInput('uvIndex')} placeholder="e.g., 3" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-xs">Cloud cover (%)</label>
                    <Input type="number" value={debugInputs.cloudCover} onChange={handleDebugInput('cloudCover')} placeholder="e.g., 25" className="h-9 text-sm" />
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
                      value={debugInputs.debugTimeHour} 
                      onChange={handleDebugInput('debugTimeHour')} 
                      placeholder="e.g., 17 for 5 PM" 
                      className="h-9 text-sm" 
                    />
                    {debugInputs.debugTimeHour !== "" && (
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
                    <div className="text-4xl font-extrabold" style={derived?.tone?.textStyle}>
                      {derived?.score || '--'}
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
                      style={derived.tone.badgeStyle}
                      initial={{ width: 0 }}
                      animate={{ width: `${derived.score}%` }}
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
                      {selectedHourData.timeLabel} Run Score
                    </h2>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-extrabold" style={selectedHourData.tone?.textStyle}>
                      {selectedHourData.score || '--'}
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
                    style={selectedHourData.tone.badgeStyle}
                    initial={{ width: 0 }}
                    animate={{ width: `${selectedHourData.score}%` }}
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
    </div>
  );
}
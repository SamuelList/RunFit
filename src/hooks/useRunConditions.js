import { useMemo, useCallback } from 'react';
import { computeScoreBreakdown, calculateRoadConditions, makeApproachTips } from '../utils/runScore';
import { GEAR_INFO } from '../utils/gearData';
import { clamp, round1 } from '../utils/helpers';
import { dewPointF, scoreLabel, scoreBasedTone } from '../utils/scoring';
import { handsLevelFromGear, handsLabel, handsTone } from '../utils/outfit/outfitHelpers';
import { calculateMoonPosition } from '../utils/solar';

// Import the outfitFor function - it should be extracted to utils
// For now, we'll import it from the constants or leave a placeholder

/**
 * Calculate moon phase and position
 * @param {number} timestamp - Time in milliseconds
 * @param {number} latitude - Latitude in degrees  
 * @param {number} longitude - Longitude in degrees
 * @returns {object} Moon phase data with position information
 */
function calculateMoonPhase(timestamp, latitude = null, longitude = null) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // Convert to Julian date
  let a = Math.floor((14 - month) / 12);
  let y = year + 4800 - a;
  let m = month + 12 * a - 3;
  let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  
  const daysSinceNew = jd - 2451549.5;
  const synodicMonth = 29.53058867;
  const phase = (daysSinceNew % synodicMonth) / synodicMonth;
  const illumination = (1 - Math.cos(phase * 2 * Math.PI)) / 2;
  
  let phaseName, emoji, phaseIndex;
  const isWaxing = phase < 0.5;
  
  if (phase < 0.0625 || phase >= 0.9375) {
    phaseName = "New Moon"; emoji = "🌑"; phaseIndex = 0;
  } else if (phase < 0.1875) {
    phaseName = "Waxing Crescent"; emoji = "🌒"; phaseIndex = 1;
  } else if (phase < 0.3125) {
    phaseName = "First Quarter"; emoji = "🌓"; phaseIndex = 2;
  } else if (phase < 0.4375) {
    phaseName = "Waxing Gibbous"; emoji = "🌔"; phaseIndex = 3;
  } else if (phase < 0.5625) {
    phaseName = "Full Moon"; emoji = "🌕"; phaseIndex = 4;
  } else if (phase < 0.6875) {
    phaseName = "Waning Gibbous"; emoji = "🌖"; phaseIndex = 5;
  } else if (phase < 0.8125) {
    phaseName = "Last Quarter"; emoji = "🌗"; phaseIndex = 6;
  } else {
    phaseName = "Waning Crescent"; emoji = "🌘"; phaseIndex = 7;
  }
  
  let daysToFull, daysToNew;
  if (phase < 0.5) {
    daysToFull = Math.round((0.5 - phase) * synodicMonth);
    daysToNew = Math.round((1 - phase) * synodicMonth);
  } else {
    daysToNew = Math.round((1 - phase) * synodicMonth);
    daysToFull = Math.round((0.5 + (1 - phase)) * synodicMonth);
  }
  
  // Calculate moon position if coordinates are provided
  let position = null;
  if (latitude !== null && longitude !== null) {
    position = calculateMoonPosition({ latitude, longitude, timestamp });
  }
  
  return {
    name: phaseName,
    emoji,
    phase,
    illumination,
    illuminationPct: Math.round(illumination * 100),
    isWaxing,
    daysToFull: Math.max(0, daysToFull),
    daysToNew: Math.max(0, daysToNew),
    phaseIndex,
    position, // { altitude, azimuth, isVisible, direction }
  };
}

/**
 * useRunConditions - Calculates outfit recommendations, scores, and running insights
 * 
 * Handles:
 * - Score calculations
 * - WBGT calculations
 * - Outfit recommendations (performance/comfort)
 * - Best run times
 * - Moon phase calculations
 * - Twilight times
 * - Forecast processing
 * - Road conditions
 * - Approach tips
 * 
 * @param {Object} wx - Weather data object
 * @param {string} unit - Temperature unit ('F' or 'C')
 * @param {string} runType - Type of run ('easy', 'workout', 'longRun')
 * @param {boolean} coldHands - User has cold hands preference
 * @param {string} gender - User gender ('Male' or 'Female')
 * @param {boolean} customTempEnabled - Manual temperature override enabled
 * @param {string} customTempInput - Manual temperature value
 * @param {string} twilightTerms - Twilight terminology preference
 * @param {number} tempSensitivity - User temperature sensitivity (-2 to +2)
 * @param {number} runnerBoldness - Runner confidence level (-2 to +2)
 * @param {number} runHoursStart - Start of preferred run hours
 * @param {number} runHoursEnd - End of preferred run hours
 * @param {Object} place - Location data with lat/lon
 * @param {Function} outfitFor - Outfit calculation function (imported from utils)
 * @param {Function} getDisplayedScore - Score display adjustment function
 * @param {Function} setSelectedHourData - Hour selection callback
 * @param {Function} setShowHourBreakdown - Modal visibility callback
 * 
 * @returns {Object} Running conditions data including scores, outfits, times, and recommendations
 * 
 * @example
 * const derived = useRunConditions(
 *   wx, unit, runType, coldHands, gender,
 *   customTempEnabled, customTempInput, twilightTerms,
 *   tempSensitivity, runnerBoldness, runHoursStart, runHoursEnd, place,
 *   outfitFor, getDisplayedScore, setSelectedHourData, setShowHourBreakdown
 * );
 */
export function useRunConditions(
  wx,
  unit,
  runType,
  coldHands,
  gender,
  customTempEnabled,
  customTempInput,
  twilightTerms,
  tempSensitivity,
  runnerBoldness,
  runHoursStart,
  runHoursEnd,
  place,
  outfitFor,
  getDisplayedScore,
  setSelectedHourData,
  setShowHourBreakdown
) {
  return useMemo(() => {
    if (!wx || !outfitFor) return null;
    
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

    // Calculate baseline outfit (for comparison)
    const baselineForWorkout = workout
      ? outfitFor(
          { apparentF: usedApparentF, humidity: wx.humidity, windMph: wx.wind, precipProb: wx.precipProb, precipIn: wx.precip, uvIndex: wx.uv, isDay: wx.isDay },
          false, coldHands, gender, false, wx.hourlyForecast || [], tempSensitivity
        )
      : null;

    const baselineForLongRun = longRun
      ? outfitFor(
          { apparentF: usedApparentF, humidity: wx.humidity, windMph: wx.wind, precipProb: wx.precipProb, precipIn: wx.precip, uvIndex: wx.uv, isDay: wx.isDay },
          false, coldHands, gender, false, wx.hourlyForecast || [], tempSensitivity
        )
      : null;

    // Calculate actual outfit recommendations
    const recs = outfitFor(
      { apparentF: usedApparentF, humidity: wx.humidity, windMph: wx.wind, precipProb: wx.precipProb, precipIn: wx.precip, uvIndex: wx.uv, isDay: wx.isDay },
      workout, coldHands, gender, longRun, wx.hourlyForecast || [], tempSensitivity
    );

    // Mark workout/longRun specific items
    if (workout && baselineForWorkout) {
      const baselineKeysA = new Set(baselineForWorkout.optionA.map((item) => item.key));
      const baselineKeysB = new Set(baselineForWorkout.optionB.map((item) => item.key));
      recs.optionA = recs.optionA.map((item) => baselineKeysA.has(item.key) ? item : { ...item, workout: true });
      recs.optionB = recs.optionB.map((item) => baselineKeysB.has(item.key) ? item : { ...item, workout: true });
    }
    
    if (longRun && baselineForLongRun) {
      const baselineKeysA = new Set(baselineForLongRun.optionA.map((item) => item.key));
      const baselineKeysB = new Set(baselineForLongRun.optionB.map((item) => item.key));
      recs.optionA = recs.optionA.map((item) => baselineKeysA.has(item.key) ? item : { ...item, longRun: true });
      recs.optionB = recs.optionB.map((item) => baselineKeysB.has(item.key) ? item : { ...item, longRun: true });
    }

    // Calculate score with weather data (blend future hours for long runs)
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
      const futureHours = wx.hourlyForecast.slice(1, 4);
      const avgTemp = futureHours.reduce((sum, h) => sum + (toF(h.temperature) || tempFWx), tempFWx) / (futureHours.length + 1);
      const avgApparent = futureHours.reduce((sum, h) => sum + (toF(h.apparent) || usedApparentF), usedApparentF) / (futureHours.length + 1);
      const avgHumidity = futureHours.reduce((sum, h) => sum + (h.humidity || wx.humidity), wx.humidity) / (futureHours.length + 1);
      const avgWind = futureHours.reduce((sum, h) => sum + (h.wind || wx.wind), wx.wind) / (futureHours.length + 1);
      const avgUV = futureHours.reduce((sum, h) => sum + (h.uv || wx.uv), wx.uv) / (futureHours.length + 1);
      const avgCloud = futureHours.reduce((sum, h) => sum + (h.cloud || wx.cloud || 50), wx.cloud || 50) / (futureHours.length + 1);
      const avgPressure = futureHours.reduce((sum, h) => sum + (h.pressure || wx.pressure || 1013), wx.pressure || 1013) / (futureHours.length + 1);
      const avgSolar = futureHours.reduce((sum, h) => sum + (h.solarRadiation || wx.solarRadiation || 0), wx.solarRadiation || 0) / (futureHours.length + 1);
      const maxPrecipProb = Math.max(wx.precipProb, ...futureHours.map(h => h.precipProb || 0));
      const totalPrecip = (wx.precip || 0) + futureHours.reduce((sum, h) => sum + (h.precip || 0), 0);
      
      scoreWeatherData = {
        tempF: avgTemp, apparentF: avgApparent, humidity: avgHumidity, windMph: avgWind,
        precipProb: maxPrecipProb, precipIn: totalPrecip, uvIndex: avgUV,
        cloudCover: avgCloud, pressure: avgPressure, solarRadiation: avgSolar,
      };
    }
    
    const breakdown = computeScoreBreakdown(scoreWeatherData, workout, coldHands, recs.handsLevel, longRun);
    const score = breakdown.score;

    // Calculate display temperatures
    const displayApparent = Number.isFinite(usedApparentF)
      ? (unit === "F" ? usedApparentF : ((usedApparentF - 32) * 5) / 9)
      : null;
    const dpF = dewPointF(tempFWx, wx.humidity);
    const dewPointDisplay = Number.isFinite(dpF) ? (unit === "F" ? dpF : (dpF - 32) * 5 / 9) : null;
    
    const wbgtF = breakdown?.wbF;
    const useWBGT = Number.isFinite(wbgtF) && usedApparentF >= 50;
    const effectiveTempF = useWBGT ? wbgtF : usedApparentF;
    const effectiveTempDisplay = Number.isFinite(effectiveTempF)
      ? (unit === "F" ? effectiveTempF : (effectiveTempF - 32) * 5 / 9)
      : null;
    const effectiveTempLabel = useWBGT ? "WBGT" : "Feels Like";

    // Calculate road conditions and approach tips
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

    // Calculate twilight times
    const parseTimes = (values) =>
      Array.isArray(values)
        ? values.map((value) => {
            if (value == null) return null;
            if (typeof value === "number") return Number.isFinite(value) ? value : null;
            const parsed = new Date(value).getTime();
            return Number.isFinite(parsed) ? parsed : null;
          }).filter((n) => n != null)
        : [];
    
    const sunriseMs = parseTimes(wx.sunriseTimes);
    const sunsetMs = parseTimes(wx.sunsetTimes);
    const dawnMs = parseTimes(wx.dawnTimes);
    const duskMs = parseTimes(wx.duskTimes);
    const now = Date.now();
    
    // Calculate moon phase with position data
    const moonPhase = calculateMoonPhase(
      now, 
      place?.lat || null, 
      place?.lon || null
    );
    const nextSunrise = sunriseMs.find((t) => t > now);
    const nextSunset = sunsetMs.find((t) => t > now);
    const nextDawn = dawnMs.find((t) => t > now);
    const nextDusk = duskMs.find((t) => t > now);

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
      const labelMap = { sunrise: "Sunrise", sunset: "Sunset", dawn: "Dawn", dusk: "Dusk" };
      return {
        type,
        label: labelMap[type] || type,
        in: countdownLabel(diff),
        at: formatClock(timestamp),
        icon,
      };
    };

    const isReasonablyClose = (timestamp) => timestamp && (timestamp - now) < 6 * 60 * 60 * 1000;

    let twilight = null;
    if (twilightTerms === "sunrise-sunset") {
      if (wx.isDay) {
        if (nextSunset != null) twilight = buildTwilight("sunset", nextSunset);
        else if (nextSunrise != null) twilight = buildTwilight("sunrise", nextSunrise);
      } else {
        if (nextSunrise != null) twilight = buildTwilight("sunrise", nextSunrise);
        else if (nextSunset != null) twilight = buildTwilight("sunset", nextSunset);
      }
    } else {
      if (wx.isDay) {
        if (nextDusk != null) twilight = buildTwilight("dusk", nextDusk);
        else if (nextSunset != null) twilight = buildTwilight("dusk", nextSunset);
        else if (nextDawn != null) twilight = buildTwilight("dawn", nextDawn);
      } else {
        if (nextDawn != null && isReasonablyClose(nextDawn)) {
          twilight = buildTwilight("dawn", nextDawn);
        } else if (nextSunrise != null && isReasonablyClose(nextSunrise)) {
          twilight = buildTwilight("sunrise", nextSunrise);
        } else if (nextDusk != null) {
          twilight = buildTwilight("dusk", nextDusk);
        } else if (nextDawn != null) {
          twilight = buildTwilight("dawn", nextDawn);
        }
      }
    }

    // Process hourly forecast
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
          { apparentF: slotApparentF, humidity: slotHumidity, windMph: slotWind, precipProb: slotPrecipProb, precipIn: slotPrecip, uvIndex: slotUv, isDay: wx.isDay },
          workout, coldHands, gender, false, [], tempSensitivity
        );

        const slotBreakdown = computeScoreBreakdown(
          { tempF: slotTempF, apparentF: slotApparentF, humidity: slotHumidity, windMph: slotWind, precipProb: slotPrecipProb, precipIn: slotPrecip, uvIndex: slotUv, cloudCover: slotCloud, pressure: typeof slot.pressure === "number" ? slot.pressure : wx.pressure, solarRadiation: typeof slot.solarRadiation === "number" ? slot.solarRadiation : 0 },
          workout, coldHands, slotOutfit.handsLevel
        );

        const slotScore = slotBreakdown.score;
        const slotLabel = scoreLabel(slotScore);
        const displaySlotScore = getDisplayedScore(slotScore, runnerBoldness);
        const tone = scoreBasedTone(displaySlotScore);
        const displayApparent = Number.isFinite(slotApparentF) ? (unit === "F" ? Math.round(slotApparentF) : Math.round(((slotApparentF - 32) * 5) / 9)) : null;

        const alerts = [];
        if (Number.isFinite(slotWind) && slotWind >= 15) alerts.push({ type: "wind", message: `${Math.round(slotWind)} mph wind` });
        if ((Number.isFinite(slotPrecipProb) && slotPrecipProb >= 40) || (Number.isFinite(slotPrecip) && slotPrecip >= 0.05)) {
          alerts.push({ type: "rain", message: `${Math.round(slotPrecipProb)}% / ${round1(slotPrecip)}"` });
        }
        if (Number.isFinite(slotUv) && slotUv >= 6) alerts.push({ type: "uv", message: `UV ${round1(slotUv)}` });

        const timeLabel = idx === 0 ? "Now" : (timeFormatter ? timeFormatter.format(new Date(slot.time)) : new Date(slot.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));

        return {
          time: slot.time,
          timeLabel,
          score: slotScore,
          label: slotLabel.text,
          tone,
          apparentDisplay: displayApparent != null ? `${displayApparent}°${unit}` : null,
          alerts,
          breakdown: slotBreakdown,
          weatherData: { tempF: slotTempF, apparentF: slotApparentF, humidity: slotHumidity, windMph: slotWind, precipProb: slotPrecipProb, precipIn: slotPrecip, uvIndex: slotUv },
        };
      })
      .filter(Boolean);

    const tone = scoreBasedTone(getDisplayedScore(score, runnerBoldness));
    
    // Find best run times
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
      
      const currentHour = new Date().getHours();
      if (currentHour >= runHoursStart && currentHour < runHoursEnd) {
        todayCandidates.push({ time: now, score: score, apparentF: usedApparentF, wind: wx.wind, precipProb: wx.precipProb, uv: wx.uv, isNow: true });
      }
      
      for (const slot of wx.hourlyForecast) {
        if (!slot || !slot.time) continue;
        const slotTime = typeof slot.time === 'number' ? slot.time : Date.parse(slot.time);
        if (!Number.isFinite(slotTime) || slotTime < now + 60 * 60 * 1000) continue;
        
        const slotDate = new Date(slotTime);
        const hour = slotDate.getHours();
        if (hour < runHoursStart || hour >= runHoursEnd) continue;
        
        const slotTemp = typeof slot.temperature === 'number' ? slot.temperature : slot.apparent;
        const slotApparentF = toF(slot.apparent);
        const slotHumidity = typeof slot.humidity === 'number' ? slot.humidity : wx.humidity;
        const slotWind = typeof slot.wind === 'number' ? slot.wind : wx.wind;
        const slotPrecipProb = typeof slot.precipProb === 'number' ? slot.precipProb : 0;
        const slotPrecip = typeof slot.precip === 'number' ? slot.precip : 0;
        const slotUv = typeof slot.uv === 'number' ? slot.uv : 0;
        
        if (!Number.isFinite(slotApparentF)) continue;
        
        const slotOutfit = outfitFor({ apparentF: slotApparentF, humidity: slotHumidity, windMph: slotWind, precipProb: slotPrecipProb, precipIn: slotPrecip, uvIndex: slotUv, isDay: true }, workout, coldHands, gender, false, [], tempSensitivity);
        const slotBreakdown = computeScoreBreakdown({ tempF: toF(slotTemp), apparentF: slotApparentF, humidity: slotHumidity, windMph: slotWind, precipProb: slotPrecipProb, precipIn: slotPrecip, uvIndex: slotUv, cloudCover: wx.cloud || 50, pressure: slot.pressure || wx.pressure, solarRadiation: slot.solarRadiation || 0 }, workout, coldHands, slotOutfit.handsLevel);
        
        const candidate = { time: slotTime, score: slotBreakdown.score, apparentF: slotApparentF, wind: slotWind, precipProb: slotPrecipProb, uv: slotUv };
        
        if (slotTime >= todayStart && slotTime < tomorrowStart && slotTime >= now) {
          todayCandidates.push(candidate);
        } else if (slotTime >= tomorrowStart && slotTime < tomorrowEnd) {
          tomorrowCandidates.push(candidate);
        }
      }
      
      let today = null;
      if (todayCandidates.length > 0) {
        todayCandidates.sort((a, b) => b.score - a.score);
        today = todayCandidates[0];
      }
      
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
      wbgtF,
      manualOn,
      hands: recs.handsLevel,
      handsText: handsLabel(recs.handsLevel),
      handsToneClass: handsTone(recs.handsLevel),
      socksLabel: recs.sockLevel === "double_socks" ? "Double socks" : recs.sockLevel === "heavy_socks" ? "Heavy socks" : "Light socks",
      breakdown,
      approach,
      roadConditions,
      twilight,
      forecast,
      moonPhase,
      bestRunTimes,
      onHourClick: (slot) => {
        if (setSelectedHourData) setSelectedHourData(slot);
        if (setShowHourBreakdown) setShowHourBreakdown(true);
      },
    };
  }, [
    wx, unit, runType, coldHands, gender, customTempEnabled, customTempInput,
    twilightTerms, tempSensitivity, runnerBoldness, runHoursStart, runHoursEnd,
    outfitFor, getDisplayedScore, setSelectedHourData, setShowHourBreakdown
  ]);
}

// Export calculateMoonPhase utility function (moon phase calculation is specific to this hook)
export { calculateMoonPhase };

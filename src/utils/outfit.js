
import { GEAR_INFO } from './gearData';

// --- Configurable Thresholds for Gear Logic ---
const TIGHTS_TEMP_THRESHOLD = 48;
// ... (all other gear-related constants) ...

// --- Core Outfit Logic ---
export function outfitFor({ apparentF, humidity, windMph, precipProb, precipIn, uvIndex, isDay = true }, workout, coldHands, gender, longRun = false, hourlyForecast = [], tempSensitivity = 0) {
  import { GEAR_INFO } from './gearData';

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

// --- Core Outfit Logic ---
export function outfitFor({ apparentF, humidity, windMph, precipProb, precipIn, uvIndex, isDay = true }, workout, coldHands, gender, longRun = false, hourlyForecast = [], tempSensitivity = 0) {
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
}

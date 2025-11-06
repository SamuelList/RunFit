/**
 * Outfit recommendation logic for running conditions
 * Refactored from App.jsx to reduce file size and improve maintainability
 */

// Temperature thresholds for glove recommendations
const LIGHT_GLOVES_TEMP_THRESHOLD = 55;
const MEDIUM_GLOVES_TEMP_THRESHOLD = 45;
const MITTENS_TEMP_THRESHOLD = 30;
const MITTENS_LINER_TEMP_THRESHOLD = 15;
const WIND_GLOVES_THRESHOLD = 8;
const WIND_MEDIUM_GLOVES_THRESHOLD = 12;
const WIND_MITTENS_THRESHOLD = 15;

// Cold hands preference thresholds (more sensitive)
const COLD_HANDS_LIGHT_GLOVES_THRESHOLD = 60;
const COLD_HANDS_MEDIUM_GLOVES_THRESHOLD = 42;
const COLD_HANDS_MITTENS_THRESHOLD = 30;
const COLD_HANDS_MITTENS_LINER_THRESHOLD = 18;
const COLD_HANDS_WIND_GLOVES_THRESHOLD = 5;
const COLD_HANDS_WIND_MEDIUM_THRESHOLD = 8;
const COLD_HANDS_WIND_MITTENS_THRESHOLD = 12;

/**
 * Determine hand protection level from gear list
 */
export function handsLevelFromGear(keys) {
  if (keys.includes("mittens") && keys.includes("mittens_liner")) return 4;
  if (keys.includes("mittens")) return 3;
  if (keys.includes("medium_gloves")) return 2;
  if (keys.includes("light_gloves")) return 1;
  return 0;
}

/**
 * Choose appropriate sock level based on conditions
 */
export function chooseSocks({ apparentF, precipIn, precipProb, windMph, humidity }) {
  let sockLevel = 'light_socks';
  
  if (apparentF <= 50) {
    sockLevel = 'heavy_socks';
  }
  
  if (apparentF <= 25 || 
      (apparentF <= 32 && (precipIn > 0 || precipProb >= 60)) || 
      (apparentF <= 30 && windMph >= 15)) {
    sockLevel = 'double_socks';
  }
  
  if (apparentF >= 70 || (apparentF >= 60 && humidity >= 75)) {
    sockLevel = 'light_socks';
  }
  
  return sockLevel;
}

/**
 * Calculate effective temperature considering all weather factors
 */
export function calculateEffectiveTemp({ apparentF, humidity, windMph, uvIndex, precipProb, isDay }, tempSensitivity = 0) {
  let effectiveTemp = apparentF;
  
  effectiveTemp += tempSensitivity * 5;
  
  if (apparentF < 50 && windMph > 10) {
    const windChillPenalty = Math.min((windMph - 10) * 0.3, 5);
    effectiveTemp -= windChillPenalty;
  }
  
  if (apparentF > 55 && humidity > 60) {
    const humidityPenalty = ((humidity - 60) / 40) * 8;
    effectiveTemp += humidityPenalty;
  }
  
  if (isDay && uvIndex > 3 && apparentF > 45) {
    const sunBonus = Math.min((uvIndex - 3) * 1.5, 6);
    effectiveTemp += sunBonus;
  }
  
  if (precipProb > 50 && apparentF < 60) {
    effectiveTemp -= 3;
  }
  
  return Math.round(effectiveTemp);
}

/**
 * Determine base layers based on temperature and gender
 */
export function baseLayersForTemp(adjT, gender) {
  const base = new Set();
  if (gender === 'Female') base.add('sports_bra');

  if (adjT < 0) {
    base.add('thermal_tights');
    base.add('long_sleeve');
    base.add('insulated_jacket');
    base.add('balaclava');
    base.add('beanie');
    base.add('neck_gaiter');
    base.add('mittens');
    base.add('mittens_liner');
  }
  else if (adjT < 10) {
    base.add('thermal_tights');
    base.add('long_sleeve');
    base.add('insulated_jacket');
    base.add('balaclava');
    base.add('neck_gaiter');
    base.add('mittens');
    base.add('mittens_liner');
  }
  else if (adjT < 20) {
    base.add('thermal_tights');
    base.add('long_sleeve');
    base.add('insulated_jacket');
    base.add('beanie');
    base.add('neck_gaiter');
    base.add('mittens');
  }
  else if (adjT < 32) {
    base.add('thermal_tights');
    base.add('long_sleeve');
    base.add('vest');
    base.add('beanie');
    base.add('medium_gloves');
    base.add('neck_gaiter');
  }
  else if (adjT < 38) {
    base.add('tights');
    base.add('long_sleeve');
    base.add('vest');
    base.add('headband');
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
    base.add('tank_top');
  }

  return base;
}

/**
 * Main outfit recommendation function
 */
export function outfitFor({ apparentF, humidity, windMph, precipProb, precipIn, uvIndex, isDay = true }, workout, coldHands, gender, longRun = false, hourlyForecast = [], tempSensitivity = 0) {
  const coldHandSeed = new Set();
  const T = apparentF;
  
  const effectiveT = calculateEffectiveTemp({ apparentF, humidity, windMph, uvIndex, precipProb, isDay }, tempSensitivity);
  
  let tempChange = 0;
  let maxPrecipProb = precipProb;
  let maxUV = uvIndex;
  let willRain = precipProb > 50 || precipIn > 0.05;
  
  if (longRun && hourlyForecast.length > 1) {
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
  
  const adjT = workout ? effectiveT + 10 : longRun ? effectiveT + Math.min(tempChange * 0.5, 5) : effectiveT;
  const baseGear = baseLayersForTemp(adjT, gender);
  const gear = new Set(baseGear);

  if (effectiveT <= 35 && !gear.has('light_jacket') && (windMph >= 10 || precipProb > 30 || precipIn > 0.02)) {
    gear.add('light_jacket');
  }
  if (effectiveT <= 42 && !gear.has('vest') && windMph >= 8) {
    gear.add('vest');
  }

  if (precipProb > 50 || precipIn > 0.05 || (longRun && willRain)) { 
    gear.add("rain_shell").add("brim_cap"); 
  }
  
  const ambientTemp = apparentF;
  
  if (ambientTemp < 60) {
    const needsWindbreaker = (() => {
      if (ambientTemp >= 55) {
        return longRun && windMph >= 20;
      }
      
      if (ambientTemp >= 50) {
        return windMph >= 10 && !gear.has("rain_shell");
      }
      
      if (ambientTemp >= 40) {
        return !gear.has("rain_shell") && !gear.has("light_jacket");
      }
      
      if (ambientTemp >= 35) {
        if (!gear.has("long_sleeve") && !gear.has("light_jacket")) {
          gear.add("long_sleeve");
        }
        return !gear.has("rain_shell") && !gear.has("light_jacket");
      }
      
      if (ambientTemp < 35) {
        return false;
      }
      
      return false;
    })();
    
    if (needsWindbreaker) {
      gear.add("windbreaker");
    }
  }
  
  if (windMph >= 15 && ambientTemp < 35 && !gear.has("windbreaker") && !gear.has("rain_shell") && !gear.has("light_jacket")) {
    gear.add("vest");
  }
  
  if (uvIndex >= 7 || (longRun && maxUV >= 6)) { 
    if (!gear.has("brim_cap")) {
      gear.add("cap");
    }
    gear.add("sunglasses").add("sunscreen");
  }
  if (humidity >= 75 && T >= 65) { gear.add("anti_chafe").add("hydration"); }
  
  const feelsLike = effectiveT;
  const isLowHumidity = humidity < 50;
  const isHighHumidity = humidity >= 75;
  
  let needsArmSleeves = false;
  let armSleevesOptional = false;
  
  if (feelsLike < 45) {
    needsArmSleeves = true;
  } else if (feelsLike >= 45 && feelsLike <= 60) {
    armSleevesOptional = true;
  }
  
  if (uvIndex >= 8) {
    needsArmSleeves = true;
  } else if (uvIndex >= 3 && uvIndex < 8) {
    if (feelsLike <= 60 || (longRun && maxUV >= 6)) {
      needsArmSleeves = true;
    } else if (feelsLike > 60) {
      armSleevesOptional = true;
    }
  }
  
  if (feelsLike > 60 && isLowHumidity && uvIndex >= 3) {
    needsArmSleeves = true;
    armSleevesOptional = false;
  }
  
  if (feelsLike > 60 && isHighHumidity && uvIndex < 8) {
    needsArmSleeves = false;
    armSleevesOptional = uvIndex >= 3;
  }
  
  if (feelsLike < 60 && windMph >= 15) {
    needsArmSleeves = true;
    armSleevesOptional = false;
  }
  
  if (longRun) {
    if (tempChange > 8) {
      armSleevesOptional = true;
    }
    if (maxUV >= 6 && feelsLike <= 65) {
      needsArmSleeves = true;
    }
  }
  
  if (!gear.has("long_sleeve")) {
    if (needsArmSleeves) {
      gear.add("arm_sleeves");
    } else if (armSleevesOptional) {
      gear.add("arm_sleeves_optional");
    }
  }
  
  const calculateWindChill = (temp, wind) => {
    if (temp > 50 || wind < 3) return temp;
    return 35.74 + 0.6215 * temp - 35.75 * Math.pow(wind, 0.16) + 0.4275 * temp * Math.pow(wind, 0.16);
  };
  
  const windChill = calculateWindChill(effectiveT, windMph);
  
  if (effectiveT <= 20 && windMph >= 15) {
    if (workout) {
      gear.add("balaclava");
      gear.delete("beanie");
    } else if (longRun) {
      gear.add("neck_gaiter");
    } else {
      gear.add("neck_gaiter");
    }
  }
  
  if (effectiveT <= 10) {
    if (workout) {
      gear.add("balaclava");
      gear.delete("beanie");
    } else {
      gear.add("balaclava");
      if (longRun) {
        gear.add("neck_gaiter");
      }
    }
  }
  
  if (effectiveT <= 0 || windChill <= 0) {
    gear.add("balaclava");
    if (!workout) {
      gear.add("beanie");
    }
    gear.add("neck_gaiter");
  }
  
  if (workout && effectiveT > 20 && effectiveT < 35) {
    if (gear.has("beanie") && windMph < 10) {
      gear.delete("beanie");
      gear.add("headband");
    }
  }
  
  if (longRun) {
    gear.add("hydration");
    gear.add("anti_chafe");
    if (T > 50) gear.add("energy_nutrition");
    if (maxPrecipProb > 50 && !gear.has("rain_shell")) {
      gear.add("rain_shell");
    }
  }

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
  
  const gloveAdjT = coldHands ? adjT - 3 : adjT;
  
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
  
  if (requiredLevel) {
    gear.delete("light_gloves");
    gear.delete("medium_gloves");
    gear.delete("mittens");
    gear.delete("mittens_liner");
    
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

  const labels = {
    thermal_tights: "Thermal tights", long_sleeve: "Long-sleeve base", insulated_jacket: "Insulated jacket", neck_gaiter: "Neck gaiter", mittens: "Mittens", mittens_liner: "Glove liner (under mittens)",
    tights: "Running tights", vest: "Short-sleeve tech tee", light_jacket: "Light jacket", light_gloves: "Light gloves", medium_gloves: "Medium gloves", headband: "Ear band",
    shorts: "Shorts", split_shorts: "Split shorts", short_sleeve: "Short-sleeve tech tee", tank_top: "Tank top", sports_bra: "Sports bra",
    cap: "Cap", brim_cap: "Cap for rain", rain_shell: "Packable rain shell", windbreaker: "Windbreaker", sunglasses: "Sunglasses", sunscreen: "Sunscreen",
    hydration: "Bring water", anti_chafe: "Anti-chafe balm", light_socks: "Light socks", heavy_socks: "Heavy socks", double_socks: "Double socks (layered)", beanie: "Beanie", balaclava: "Balaclava",
    arm_sleeves: "Arm sleeves", arm_sleeves_optional: "Arm sleeves (Optional)", energy_nutrition: "Energy gels/chews",
  };
  const perfOrder = ["sports_bra", "tank_top", "short_sleeve", "long_sleeve", "vest", "light_jacket", "insulated_jacket", "split_shorts", "shorts", "tights", "thermal_tights", "cap", "brim_cap", "headband", "beanie", "arm_sleeves", "arm_sleeves_optional", "light_gloves", "medium_gloves", "mittens", "mittens_liner", "windbreaker", "rain_shell", "sunglasses", "sunscreen", "hydration", "energy_nutrition", "anti_chafe", "light_socks", "heavy_socks", "double_socks", "neck_gaiter", "balaclava"];
  const comfortOrder = ["sports_bra", "short_sleeve", "long_sleeve", "tank_top", "light_jacket", "insulated_jacket", "vest", "tights", "thermal_tights", "shorts", "split_shorts", "beanie", "headband", "cap", "brim_cap", "arm_sleeves", "arm_sleeves_optional", "mittens", "mittens_liner", "medium_gloves", "light_gloves", "heavy_socks", "light_socks", "double_socks", "neck_gaiter", "windbreaker", "rain_shell", "sunglasses", "sunscreen", "hydration", "energy_nutrition", "anti_chafe", "balaclava"];

  const perf = new Set(gear);
  const cozy = new Set(gear);
  const perfTags = new Set(coldHandSeed);
  const cozyTags = new Set(coldHandSeed);

  if (perf.has('brim_cap') && perf.has('cap')) {
    perf.delete('cap');
  }
  if (cozy.has('brim_cap') && cozy.has('cap')) {
    cozy.delete('cap');
  }

  if (perf.has('rain_shell') && perf.has('windbreaker')) {
    perf.delete('windbreaker');
  }
  if (cozy.has('rain_shell') && cozy.has('windbreaker')) {
    cozy.delete('windbreaker');
  }

  if (perf.has('insulated_jacket') && (workout || effectiveT > 15)) { perf.delete('insulated_jacket'); perf.add('light_jacket'); }
  if (perf.has('vest') && perf.has('light_jacket')) perf.delete('vest');
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

  if (effectiveT <= 35 && !cozy.has('light_jacket')) cozy.add('light_jacket');
  if (effectiveT <= 42 && !cozy.has('vest')) cozy.add('vest');
  if (cozy.has('light_jacket') && (windMph >= 10 || effectiveT < 45)) cozy.add('vest');
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
  if (gender === 'Male' && adjT >= 70 && !cozy.has('tank_top')) cozy.add('short_sleeve');

  const sockLevel = chooseSocks({ apparentF: T, precipIn, precipProb, windMph, humidity });
  [
    { set: perf, tags: perfTags },
    { set: cozy, tags: cozyTags },
  ].forEach(({ set, tags }) => {
    set.delete('light_socks');
    set.delete('heavy_socks');
    set.delete('double_socks');
    set.add(sockLevel);
  });

  const sortByOrder = (keys, order) => keys.sort((a, b) => (order.indexOf(a) ?? 99) - (order.indexOf(b) ?? 99));

  const formatOptionList = (set, order, tags) =>
    sortByOrder(Array.from(set), order).map((k) => ({
      key: k,
      label: labels[k] || k,
      coldHands: tags.has(k),
    }));

  const optionA = formatOptionList(perf, perfOrder, perfTags);
  const optionB = formatOptionList(cozy, comfortOrder, cozyTags);
  return { optionA, optionB, handsLevel: handsLevelFromGear(Array.from(cozy)), sockLevel };
}

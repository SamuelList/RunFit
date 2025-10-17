/**
 * Running condition assessment and scoring utilities
 * Provides performance-focused guidance with research-backed thresholds
 */

/**
 * Get running condition assessment based on WBGT (warm) or feels-like temp (cool)
 * Returns performance-focused guidance with research-backed thresholds
 * 
 * @param {number} tempF - Temperature in Fahrenheit (WBGT for warm, feels-like for cool)
 * @param {boolean} isWBGT - Whether using WBGT (wet bulb globe temp) vs feels-like
 * @returns {Object} Condition assessment with text, styling, performance, and action
 */
export function getRunningCondition(tempF, isWBGT = false) {
  // Warm weather (using WBGT): Research-based heat stress zones
  if (isWBGT) {
    // WBGT >82°F: Extreme Heat - Danger (Black Flag)
    if (tempF > 82) {
      return { 
        text: "Extreme danger — races cancelled, training strongly discouraged", 
        textClass: "text-rose-900 dark:text-rose-200", 
        badgeClass: "bg-rose-200/90 text-rose-900 border-rose-400/80 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800/60",
        performance: "Life-threatening heat stress risk. Body cannot dissipate heat fast enough.",
        action: "Cancel outdoor run. Heat stroke risk far outweighs any training benefit."
      };
    }
    
    // WBGT 73-82°F: Hot - High Risk (Red Flag)
    if (tempF >= 73) {
      return { 
        text: "High risk — dramatically slower times, heat illness common", 
        textClass: "text-rose-700 dark:text-rose-300", 
        badgeClass: "bg-rose-100/80 text-rose-700 border-rose-300/60 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40",
        performance: "Expect 3-5%+ slower pace. Heat exhaustion and heat stroke spike in this range.",
        action: "Only if heat-acclimated. Shorten distance 30-50%, add 60-90s/mile, take walk breaks every 10 min."
      };
    }
    
    // WBGT 65-73°F: Warm - Caution (Yellow Flag)
    if (tempF >= 65) {
      return { 
        text: "Caution — performance declines ~0.3-0.4% per degree", 
        textClass: "text-amber-600 dark:text-amber-400", 
        badgeClass: "bg-amber-100/80 text-amber-700 border-amber-300/60 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40",
        performance: "Expect 1-3% slower pace. Heat loss less efficient, fatigue comes sooner.",
        action: "Slow easy pace 20-40s/mile, hydrate every 15 min, seek shade, monitor closely."
      };
    }
    
    // WBGT 50-65°F: Cool/Neutral - Ideal (Green Flag)
    return { 
      text: "Ideal — peak performance, minimal heat stress", 
      textClass: "text-emerald-600 dark:text-emerald-400", 
      badgeClass: "bg-emerald-100/80 text-emerald-700 border-emerald-300/60 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
      performance: "Optimal zone for fast times. Body regulates temperature easily.",
      action: "Go for it! Conditions support your best effort with minimal adjustments."
    };
  }
  
  // Cool weather (using feels-like temp): Cold stress and performance zones
  
  // Feels-like 41-54°F: PR Sweet Spot
  if (tempF >= 41) {
    return { 
      text: "PR conditions — optimal for fast times", 
      textClass: "text-emerald-600 dark:text-emerald-400", 
      badgeClass: "bg-emerald-100/80 text-emerald-700 border-emerald-300/60 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40",
      performance: "Perfect racing weather. Cool enough to prevent overheating, warm enough for muscle function.",
      action: "Great day for tempo runs, intervals, or races. Dress light — you'll warm up fast."
    };
  }
  
  // Feels-like 30-40°F: Fast but Chilly
  if (tempF >= 30) {
    return { 
      text: "Fast conditions — dress in layers", 
      textClass: "text-sky-600 dark:text-sky-400", 
      badgeClass: "bg-sky-100/80 text-sky-700 border-sky-300/60 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40",
      performance: "Still good for performance. Extend warm-up 5-10 min, expect slight stiffness initially.",
      action: "Layer appropriately, protect hands. You'll feel great once warmed up."
    };
  }
  
  // Feels-like 20-29°F: Cold
  if (tempF >= 20) {
    return { 
      text: "Cold — performance impacted, discomfort increases", 
      textClass: "text-blue-600 dark:text-blue-400", 
      badgeClass: "bg-blue-100/80 text-blue-700 border-blue-300/60 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40",
      performance: "Expect 1-2% slower pace. Muscles need longer to warm up, breathing may be uncomfortable.",
      action: "15 min warm-up, layer carefully, protect face/hands. Ease into your pace."
    };
  }
  
  // Feels-like 10-19°F: Very Cold
  if (tempF >= 10) {
    return { 
      text: "Very cold — significant performance challenge", 
      textClass: "text-indigo-600 dark:text-indigo-400", 
      badgeClass: "bg-indigo-100/80 text-indigo-700 border-indigo-300/60 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/40",
      performance: "Expect 2-4% slower pace. Cold air strains breathing, extremities lose function.",
      action: "Cover all skin, windproof layers critical. Shorten distance, focus on effort not pace."
    };
  }
  
  // Feels-like 0-9°F: Bitter
  if (tempF >= 0) {
    return { 
      text: "Bitter cold — severe conditions", 
      textClass: "text-violet-700 dark:text-violet-400", 
      badgeClass: "bg-violet-100/80 text-violet-700 border-violet-300/60 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/40",
      performance: "Performance severely compromised. Breathing painful, frostbite risk on exposed skin.",
      action: "Advanced runners only. Full face coverage, run near shelter, bring phone. Consider treadmill."
    };
  }
  
  // Feels-like -1 to -24°F: High Risk (Frostbite ~30 min)
  if (tempF >= -24) {
    return { 
      text: "High risk — frostbite in ~30 min on exposed skin", 
      textClass: "text-fuchsia-800 dark:text-fuchsia-300", 
      badgeClass: "bg-fuchsia-100/80 text-fuchsia-800 border-fuchsia-300/60 dark:bg-fuchsia-950/40 dark:text-fuchsia-200 dark:border-fuchsia-800/60",
      performance: "Performance irrelevant. Survival and injury prevention are priorities.",
      action: "Treadmill strongly recommended. Outside: full coverage, run loops near warmth, alert someone."
    };
  }
  
  // Feels-like ≤-25°F: Danger (Frostbite ~15 min)
  return { 
    text: "Extreme danger — frostbite in ~15 min, training not recommended", 
    textClass: "text-fuchsia-900 dark:text-fuchsia-200", 
    badgeClass: "bg-fuchsia-200/90 text-fuchsia-900 border-fuchsia-400/80 dark:bg-fuchsia-950/40 dark:text-fuchsia-200 dark:border-fuchsia-800/60",
    performance: "Life-threatening cold exposure. No performance benefit possible.",
    action: "Cancel outdoor run. Extreme frostbite and hypothermia risk."
  };
}

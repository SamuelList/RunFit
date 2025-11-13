const MASTER_GEAR_LIST = [
  'Sports Bra', 'Tank Top', 'Short-Sleeve Tech Tee', 'Long-Sleeve Base', 'extra layer Short-Sleeve Tech Tee',
  'Light Jacket', 'Insulated Jacket', 'Split Shorts', 'Running Shorts', 'Running Tights', 'Thermal Tights',
  'Cap', 'Cap for rain', 'Ear Band', 'Running Beanie', 'Balaclava', 'Light Gloves', 'Mid-weight Gloves',
  'Running Mittens', 'Glove Liner (under mittens)', 'Arm Sleeves', 'Neck Gaiter', 'Windbreaker',
  'Packable Rain Shell', 'Sunglasses', 'Sunscreen', 'Light Running Socks', 'Heavy Running Socks', 'Double Socks (layered)'
].join(', ');

const analyzeWeatherTrend = (runType, hourlyForecast) => {
  if (!hourlyForecast || hourlyForecast.length < 2) {
    return { trendSummary: 'No forecast data available to analyze trends.' };
  }

  const current = hourlyForecast[0];
  let futureHours;
  let trendDescription;

  if (runType === 'longRun') {
    futureHours = hourlyForecast.slice(1, 4);
    trendDescription = 'over the next ~3 hours';
  } else {
    futureHours = hourlyForecast.slice(1, 2);
    trendDescription = 'in the next hour';
  }

  if (futureHours.length === 0) {
    return { trendSummary: `Conditions are expected to be stable ${trendDescription}.` };
  }

  const future = futureHours.reduce((acc, hour) => {
    return {
      temp: acc.temp + hour.temperature,
      precipProb: Math.max(acc.precipProb, hour.precipProb),
      wind: acc.wind + hour.wind,
    };
  }, { temp: 0, precipProb: 0, wind: 0 });

  future.temp /= futureHours.length;
  future.wind /= futureHours.length;

  const currentTemp = current.temperature;
  const tempChange = future.temp - currentTemp;
  const precipStarts = future.precipProb > 60 && current.precipProb < 30;
  const windIncreases = future.wind > current.wind + 6;

  const changes = [];
  if (Math.abs(tempChange) > 5) {
    changes.push(`${tempChange > 0 ? '+' : ''}${Math.round(tempChange)}°`);
  }
  if (precipStarts) {
    changes.push(`rain likely`);
  }
  if (windIncreases) {
    changes.push(`wind →${Math.round(future.wind)}mph`);
  }

  if (changes.length === 0) {
    return { trendSummary: `Stable conditions ${trendDescription}.` };
  }

  return {
    trendSummary: `${changes.join(', ')} ${trendDescription}`
  };
};

const getDynamicPrinciples = (runType, weatherData, adjustedTemp, solarStatus) => {
  const isDaytime = solarStatus === 'Above Horizon';
  const isHot = adjustedTemp > 75;
  const isCold = adjustedTemp < 45;
  const isRainy = weatherData.precipProb > 30;
  const isWindy = weatherData.wind > 12;
  const isSunny = weatherData.cloud < 30 && isDaytime;

  let gearPrinciple = '';
  let strategyPrinciple = '';

  if (runType === 'workout') {
    gearPrinciple = 'The runner will generate significant body heat. Prioritize breathability and minimalism. Select gear to be slightly cool at the start, as the runner will heat up quickly. Avoid overdressing.';
    
    if (isHot) {
      strategyPrinciple = 'Focus on managing heat stress, maintaining hydration, and adjusting pace for temperature conditions.';
    } else if (isCold) {
      strategyPrinciple = 'Focus on proper warm-up, maintaining intensity despite cold, and managing breathing in cool air.';
    } else {
      strategyPrinciple = 'Focus on maintaining target pace, proper pacing strategy, and managing effort throughout the workout.';
    }

  } else if (runType === 'easy') {
    // --- MODIFICATION START ---
    // The previous principle was too vague. This new one explicitly tells the AI to
    // avoid overdressing, just like the 'workout' principle does.
    gearPrinciple = 'The runner will generate low-to-moderate body heat, but this is still significant. Prioritize comfort and **avoid overdressing**. Select gear to be **slightly cool for the first 5-10 minutes**, as the runner will warm up. It is better to be slightly cool than too warm.';
    // --- MODIFICATION END ---
    
    if (isHot) {
      strategyPrinciple = 'Focus on staying relaxed in the heat, managing effort to avoid overheating, and enjoying the surroundings.';
    } else if (isCold) {
      strategyPrinciple = 'Focus on maintaining a comfortable, relaxed effort and staying warm in the cool conditions.';
    } else {
      strategyPrinciple = 'Focus on maintaining a comfortable, relaxed pace and enjoying the run.';
    }

  } else { // longRun
    gearPrinciple = 'The runner will generate steady heat over a long duration. Prioritize moisture management, versatility, and chafe-prevention. Gear must be comfortable for an extended period.';
    
    if (isHot) {
      strategyPrinciple = 'Focus on hydration, electrolyte management, and adjusting pace for heat over the long duration.';
    } else if (isCold) {
      strategyPrinciple = 'Focus on consistent pacing, staying fueled, and managing the cool conditions throughout the run.';
    } else {
      strategyPrinciple = 'Focus on pacing, hydration, fueling strategy, and maintaining consistent effort.';
    }
  }

  // Add condition-specific adjustments
  if (isRainy) {
    strategyPrinciple += ' Be prepared for wet conditions and adjust footing accordingly.';
  }
  if (isWindy) {
    strategyPrinciple += ' Manage effort into headwinds and use tailwinds strategically.';
  }
  if (isSunny && isHot) {
    strategyPrinciple += ' Seek shade when possible and prioritize sun protection.';
  }

  return { gearPrinciple, strategyPrinciple };
};

export function buildHourPrompt({ hourData, unit = 'F', gender = 'Male', runType = 'easy', tempSensitivity = 0, currentLocation = '' }) {
  if (!hourData) return '';

  const getDayWithSuffix = (d) => {
    if (d > 3 && d < 21) return `${d}th`;
    switch (d % 10) {
      case 1: return `${d}st`;
      case 2: return `${d}nd`;
      case 3: return `${d}rd`;
      default: return `${d}th`;
    }
  };

  // Parse the hour time
  const hourTime = new Date(hourData.time);
  const month = hourTime.toLocaleDateString('en-US', { month: 'long' });
  const day = getDayWithSuffix(hourTime.getDate());
  const time = hourTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '');
  const timestamp = `${month} ${day}, ${time}`;

  // Get weather data from hourData
  const tempF = hourData.weatherData?.tempF || 0;
  const apparentF = hourData.weatherData?.apparentF || tempF;
  const humidity = hourData.weatherData?.humidity || 0;
  const windMph = hourData.weatherData?.windMph || 0;
  const precipProb = hourData.weatherData?.precipProb || 0;
  const precipIn = hourData.weatherData?.precipIn || 0;
  const uvIndex = hourData.weatherData?.uvIndex || 0;

  // Calculate derived values
  const adjustedTemp = unit === 'F' ? tempF + tempSensitivity * 5 : ((tempF - 32) * 5/9) + tempSensitivity * 5;
  const adjustedApparent = unit === 'F' ? apparentF + tempSensitivity * 5 : ((apparentF - 32) * 5/9) + tempSensitivity * 5;
  
  // Calculate dew point approximation using Magnus formula
  const a = 17.27;
  const b = 237.7;
  const tempC = (tempF - 32) * 5/9;
  const alpha = ((a * tempC) / (b + tempC)) + Math.log(humidity / 100);
  const dewPointC = (b * alpha) / (a - alpha);
  const dewPointF = (dewPointC * 9/5) + 32;
  const dewPointDisplay = unit === 'F' ? dewPointF : dewPointC;

  // Estimate solar elevation based on hour (simplified)
  const hour = hourTime.getHours();
  const isMorning = hour >= 6 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 18;
  const isDaytime = hour >= 6 && hour < 20;
  const solarElevation = isDaytime ? (isMorning ? (hour - 6) * 10 : isAfternoon ? 60 - ((hour - 12) * 10) : 5) : -5;
  const solarStatus = solarElevation > 0 ? 'Above Horizon' : 'Below Horizon';
  
  // Estimate cloud cover and solar radiation from available data
  const cloudCover = precipProb > 60 ? 80 : precipProb > 30 ? 50 : 20;
  const baseSolarRadiation = Math.max(0, Math.sin((solarElevation * Math.PI) / 180) * 1000);
  const solarRadiation = baseSolarRadiation * ((100 - cloudCover) / 100);

  const { gearPrinciple, strategyPrinciple } = getDynamicPrinciples(
    runType,
    { precipProb, wind: windMph, cloud: cloudCover },
    adjustedTemp,
    solarStatus
  );

  return `

Role and Goal: Act as an expert running coach. Your task is to provide a gear recommendation and run strategy based on the data I provide.

Core Rules:
1. Use the data provided in the "Input Data" section as your primary source.
2. You may use any available tools (including code execution, calculations, etc.) to analyze the data.
3. Perform explicit mathematical calculations to determine effective temperature and thermal needs.
4. Show your work - calculate wind chill effects, solar radiation impact, and heat generation.
5. Adhere strictly to the "Required Output Format." 

1. Input Data:
* Timestamp: ${timestamp}${currentLocation ? `\n* Location: ${currentLocation}` : ''}
* Weather (Forecast Hour):
    * Air Temp: ${adjustedTemp.toFixed(1)}°${unit}
    * UTCI: ${adjustedApparent.toFixed(1)}°${unit}
    * Dew Point: ${dewPointDisplay.toFixed(1)}°${unit}
    * Humidity: ${humidity.toFixed(0)}%
    * Wind: ${windMph.toFixed(1)} mph
    * Solar Angle: ${solarStatus} (${solarElevation.toFixed(1)}°)
    * Solar Radiation: ${solarRadiation.toFixed(0)} W/m² (estimated)
    * Cloud Cover: ${cloudCover.toFixed(0)}% (estimated)
    * Precipitation %: ${precipProb.toFixed(0)}%
    * Precipitation amount (in): ${precipIn.toFixed(2)}in
    * UV: ${uvIndex.toFixed(1)}
* Runner Profile:
    * Sex: ${gender || 'Male'}
    * Effort: ${runType === 'easy' ? 'Easy Run' : runType === 'workout' ? 'Hard Workout' : 'Long Run'}
* Master Gear List (Choose only from these items):
    * ${MASTER_GEAR_LIST}

2. Layering Logic Framework:
You must reason through gear selection using these principles, not follow prescriptive templates:

Core Principle: Runners generate significant body heat during activity. The primary goal is to START slightly cool (not comfortable standing still) because body temperature will rise 10-20°F within 10-15 minutes of running.

Physiological Heat Generation by Effort:
- Easy Run: Moderate heat generation (~10°F internal warming)
- Hard Workout: High heat generation (~15°F internal warming)
- Long Run: Sustained moderate heat generation (similar to easy, but must prevent chafing)

Environmental Factors Analysis:

Wind Effect:
- Wind increases convective heat loss exponentially
- Each 10 mph of wind can make it feel 5-10°F colder
- Wind penetrates gaps between layers and through fabric weave
- Question to answer: "Will wind overwhelm the insulation I'm choosing?"

Solar Radiation Effect:
- Direct sun can add 5-15°F to perceived temperature depending on intensity
- Dark clothing absorbs more heat; light clothing reflects it
- Solar radiation only matters when sun is above horizon
- Question to answer: "Is the sun strong enough to compensate for one less layer?"

Humidity Effect:
- High humidity (>70%) impairs evaporative cooling
- Makes warm conditions feel hotter and requires more breathable fabrics
- Low humidity (<30%) enhances evaporative cooling
- Question to answer: "Will sweat evaporate effectively or trap heat?"

Precipitation Effect:
- Rain dramatically increases heat loss through wet fabric
- Wet clothing loses ~90% of insulation value
- Wind + rain = extreme heat loss
- Question to answer: "Do I need a waterproof shell to maintain core temp?"

Gear Selection Reasoning Process:

1. Calculate Effective Temperature:
   - Start with air temperature
   - Add internal heat generation based on effort level
   - Subtract for wind chill (stronger wind = colder feel)
   - Add for solar radiation (sun above horizon = warmer feel)
   - Adjust for humidity (high = warmer, low = cooler)

2. Determine Base Layer Coverage:
   - Ask: "What skin coverage is needed for this effective temperature?"
   - Extremities (hands, head, ears) lose heat disproportionately
   - Consider: shorts vs tights, short sleeve vs long sleeve

3. Determine Insulation Needs:
   - Ask: "How much trapped air do I need to maintain warmth?"
   - More layers = more trapped air = more insulation
   - Consider: single layer, base + jacket, multiple layers

4. Determine Wind/Rain Protection:
   - Ask: "Do I need a shell to block wind or rain?"
   - Shells block convective heat loss but reduce breathability

5. Verify Against Overdressing:
   - Critical check: "Will I overheat after 15 minutes?"
   - If in doubt, choose less rather than more
   - Remember: You can always run faster to warm up, but can't easily cool down

Gender Considerations:
- Female runners often prefer slightly more coverage in cold conditions
- Sports bra + tank = equivalent to male tank
- Consider layering preferences and cold sensitivity

3. Required Output Format:
Provide your response in these three sections:

## Weather Analysis
Perform calculations to determine effective temperature:
- Calculate wind chill effect on perceived temperature
- Calculate solar radiation impact (if sun is above horizon)
- Calculate internal heat generation from effort level
- Sum these factors for final effective temperature
- Show your work with numbers

Analyze what this means for the run considering sun position and cloud cover.

## Gear Recommendation
Briefly state your effective temperature and reasoning (2-3 sentences max).

Then output your gear list with this exact format:
--- GEAR LIST START ---
[Item Name 1]
[Item Name 2]
[Item Name 3]
--- GEAR LIST END ---

Rules: Use exact names from Master Gear List. One item per line. No bullets, numbers, or extra text. Each item must be on its own separate line between the START and END markers.

## Run Strategy
In 30-50 words, provide a specific strategy tip for managing this ${runType === 'easy' ? 'easy run' : runType === 'workout' ? 'hard workout' : 'long run'} in these conditions. Explain how the chosen clothing will work effectively for this effort level and weather.

`.trim();
}

export function buildGeminiPrompt({ derived, wx, unit = 'F', gender = 'Male', runType = 'easy', tempSensitivity = 0 }) {
  if (!derived || !wx) return '';

  const getDayWithSuffix = (d) => {
    if (d > 3 && d < 21) return `${d}th`;
    switch (d % 10) {
      case 1: return `${d}st`;
      case 2: return `${d}nd`;
      case 3: return `${d}rd`;
      default: return `${d}th`;
    }
  };

  const now = new Date();
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  const day = getDayWithSuffix(now.getDate());
  const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '');
  const timestamp = `${month} ${day}, ${time}`;
  const solarStatus = derived.solarElevation > 0 ? 'Above Horizon' : 'Below Horizon';

  const { trendSummary } = analyzeWeatherTrend(runType, wx.hourlyForecast);
  const adjustedTemp = derived.tempDisplay + tempSensitivity * 5;
  
  const { gearPrinciple, strategyPrinciple } = getDynamicPrinciples(
    runType, 
    {
      precipProb: wx.precipProb,
      wind: wx.wind,
      cloud: wx.cloud
    }, 
    adjustedTemp, 
    solarStatus
  );

  return `

Role and Goal: Act as an expert running coach. Your task is to provide a gear recommendation and run strategy based on the data I provide.

Core Rules:
1. Use the data provided in the "Input Data" section as your primary source.
2. You may use any available tools (including code execution, calculations, etc.) to analyze the data.
3. Perform explicit mathematical calculations to determine effective temperature and thermal needs.
4. Show your work - calculate wind chill effects, solar radiation impact, and heat generation.
5. Adhere strictly to the "Required Output Format." 

1. Input Data:
* Timestamp: ${timestamp}
* Weather (Current):
    * Air Temp: ${adjustedTemp.toFixed(1)}°${unit}${solarStatus === 'Above Horizon' ? `\n    * UTCI: ${derived.utci?.toFixed(1)}°${unit}` : ''}
    * Dew Point: ${derived.dewPointDisplay?.toFixed(1)}°${unit}
    * Humidity: ${wx.humidity?.toFixed(0)}%
    * Wind: ${wx.wind?.toFixed(1)} mph
    * Solar Angle: ${solarStatus} (${derived.solarElevation?.toFixed(1)}°)
    * Solar Radiation: ${wx.solarRadiation?.toFixed(0)} W/m2
    * Cloud Cover: ${wx.cloud?.toFixed(0)}%
    * Precipitation %: ${wx.precipProb?.toFixed(0)}%
    * Precipitation amount (in): ${wx.precip?.toFixed(2)}in
    * UV: ${wx.uv?.toFixed(1)}
* Weather Trend:
    * ${trendSummary}
* Runner Profile:
    * Sex: ${gender || 'Male'}
    * Effort: ${runType === 'easy' ? 'Easy Run' : runType === 'workout' ? 'Hard Workout' : 'Long Run'}
* Master Gear List (Choose only from these items):
    * ${MASTER_GEAR_LIST}

2. Layering Logic Framework:
You must reason through gear selection using these principles, not follow prescriptive templates:

Core Principle: Runners generate significant body heat during activity. The primary goal is to START slightly cool (not comfortable standing still) because body temperature will rise 10-20°F within 10-15 minutes of running.

Physiological Heat Generation by Effort:
- Easy Run: Moderate heat generation (~10°F internal warming)
- Hard Workout: High heat generation (~15°F internal warming)
- Long Run: Sustained moderate heat generation (similar to easy, but must prevent chafing)

Environmental Factors Analysis:

Wind Effect:
- Wind increases convective heat loss exponentially
- Each 10 mph of wind can make it feel 5-10°F colder
- Wind penetrates gaps between layers and through fabric weave
- Question to answer: "Will wind overwhelm the insulation I'm choosing?"

Solar Radiation Effect:
- Direct sun can add 5-15°F to perceived temperature depending on intensity
- Dark clothing absorbs more heat; light clothing reflects it
- Solar radiation only matters when sun is above horizon
- Question to answer: "Is the sun strong enough to compensate for one less layer?"

Humidity Effect:
- High humidity (>70%) impairs evaporative cooling
- Makes warm conditions feel hotter and requires more breathable fabrics
- Low humidity (<30%) enhances evaporative cooling
- Question to answer: "Will sweat evaporate effectively or trap heat?"

Precipitation Effect:
- Rain dramatically increases heat loss through wet fabric
- Wet clothing loses ~90% of insulation value
- Wind + rain = extreme heat loss
- Question to answer: "Do I need a waterproof shell to maintain core temp?"

Gear Selection Reasoning Process:

1. Calculate Effective Temperature:
   - Start with air temperature
   - Add internal heat generation based on effort level
   - Subtract for wind chill (stronger wind = colder feel)
   - Add for solar radiation (sun above horizon = warmer feel)
   - Adjust for humidity (high = warmer, low = cooler)

2. Determine Base Layer Coverage:
   - Ask: "What skin coverage is needed for this effective temperature?"
   - Extremities (hands, head, ears) lose heat disproportionately
   - Consider: shorts vs tights, short sleeve vs long sleeve

3. Determine Insulation Needs:
   - Ask: "How much trapped air do I need to maintain warmth?"
   - More layers = more trapped air = more insulation
   - Consider: single layer, base + jacket, multiple layers

4. Determine Wind/Rain Protection:
   - Ask: "Do I need a shell to block wind or rain?"
   - Shells block convective heat loss but reduce breathability

5. Verify Against Overdressing:
   - Critical check: "Will I overheat after 15 minutes?"
   - If in doubt, choose less rather than more
   - Remember: You can always run faster to warm up, but can't easily cool down

Gender Considerations:
- Female runners often prefer slightly more coverage in cold conditions
- Sports bra + tank = equivalent to male tank
- Consider layering preferences and cold sensitivity

3. Required Output Format:
Provide your response in these three sections:

## Weather Analysis
Perform calculations to determine effective temperature:
- Calculate wind chill effect on perceived temperature
- Calculate solar radiation impact (if sun is above horizon)
- Calculate internal heat generation from effort level
- Sum these factors for final effective temperature
- Show your work with numbers
- Comment on weather trend implications

Analyze what this means for the run considering sun position, cloud cover, and how conditions may change over time. Be thorough.

## Gear Recommendation
Briefly state your effective temperature and reasoning (2-3 sentences max).

Then output your gear list with this exact format:
--- GEAR LIST START ---
[Item Name 1]
[Item Name 2]
[Item Name 3]
--- GEAR LIST END ---

Rules: Use exact names from Master Gear List. One item per line. No bullets, numbers, or extra text. Each item must be on its own separate line between the START and END markers.

## Run Strategy
In 30-50 words, provide a specific strategy tip for managing this ${runType === 'easy' ? 'easy run' : runType === 'workout' ? 'hard workout' : 'long run'} in these conditions. Explain how the chosen clothing will work effectively for this effort level and weather.

`.trim();
}

export default buildGeminiPrompt;
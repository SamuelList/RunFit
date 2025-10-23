const MASTER_GEAR_LIST = [
  'Sports Bra', 'Tank Top', 'Short-Sleeve Tech Tee', 'Long-Sleeve Base', 'extra layer Short-Sleeve Tech Tee',
  'Light Jacket', 'Insulated Jacket', 'Split Shorts', 'Running Shorts', 'Running Tights', 'Thermal Tights',
  'Cap', 'Cap for rain', 'Ear Band', 'Running Beanie', 'Balaclava', 'Light Gloves', 'Mid-weight Gloves',
  'Running Mittens', 'Glove Liner (under mittens)', 'Arm Sleeves', 'Neck Gaiter', 'Windbreaker',
  'Packable Rain Shell', 'Sunglasses', 'Sunscreen', 'Water/Hydration', 'Energy Gels/Chews',
  'Anti-Chafe Balm', 'Light Running Socks', 'Heavy Running Socks', 'Double Socks (layered)'
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
  const precipStarts = future.precipProb > 50 && current.precipProb < 30;
  const windIncreases = future.wind > current.wind + 8;

  const changes = [];
  if (Math.abs(tempChange) > 8) {
    changes.push(`temperature will ${tempChange > 0 ? 'rise' : 'fall'} by ~${Math.round(Math.abs(tempChange))}°`);
  }
  if (precipStarts) {
    changes.push(`rain is likely to start (chance increases to ${Math.round(future.precipProb)}%)`);
  }
  if (windIncreases) {
    changes.push(`wind will pick up to ~${Math.round(future.wind)} mph`);
  }

  if (changes.length === 0) {
    return { trendSummary: `Conditions are expected to be stable ${trendDescription}.` };
  }

  return {
    trendSummary: `Weather will change ${trendDescription}: ${changes.join(', ')}.`
  };
};

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
  let gearPrinciple = '';
  let strategyPrinciple = '';

  if (runType === 'workout') {
    gearPrinciple = 'The runner will generate significant body heat. Prioritize breathability and minimalism. Select gear to be slightly cool at the start, as the runner will heat up quickly. Avoid overdressing.';
    strategyPrinciple = 'Focus on managing the high intensity, visibility in the dark, and breathing in the cool air.';
  } else if (runType === 'easy') {
    gearPrinciple = 'The runner will generate low-to-moderate body heat. Prioritize warmth and comfort. Select gear that protects from the wind chill, as the runner will not be generating as much heat.';
    strategyPrinciple = 'Focus on maintaining a comfortable, relaxed effort and enjoying the run despite the dark and cool conditions.';
  } else { // longRun
    gearPrinciple = 'The runner will generate steady heat over a long duration. Prioritize moisture management, versatility, and chafe-prevention. Gear must be comfortable for an extended period.';
    strategyPrinciple = 'Focus on pacing, hydration, and potential fueling. Advise on how to manage the cool conditions for the entire duration.';
  }

  return `
Improved Prompt

Role and Goal: Act as an expert running coach. Your task is to provide a gear recommendation and run strategy based only on the data I provide.
Core Rules:
1. Use only the data provided in the "Input Data" section.
2. Do not use any external tools, web searches, or real-time data.
3. Your response must be based on reasoning and inference from the provided data alone.
4. Adhere strictly to the "Required Output Format." 

1. Input Data:
* Timestamp: ${timestamp}
* Weather (Current):
    * Air Temp: ${adjustedTemp.toFixed(1)}°${unit}
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

2. Required Output Format:
You must structure your response in these three exact sections:

Weather Analysis
First, analyze the "Feels Like" effect (do not perform a mathematical calculation). Synthesize all relevant weather data to estimate the perceived temperature. Explain your reasoning for this perceived feel. Thoroughly analyze what this means for the run. Finally, comment on the weather trend and how its stability simplifies gear choice.

Gear Recommendation (${runType === 'easy' ? 'Easy Run' : runType === 'workout' ? 'Hard Workout' : 'Long Run'})
Based on your Weather Analysis and the Adaptive Logic for the given Effort, create a simple, clean list of items selected only from the Master Gear List.
* Guiding Principle: ${gearPrinciple}
* Strategy Principle: ${strategyPrinciple}
* This list must be ordered from head to toe.
* Do not include any extra text, explanations, or bullet points in this section—just the list of item names.

Run Strategy
In 30-50 words, provide a helpful run strategy tip for an experienced runner based on these specific weather conditions. Incorporate advice on how to manage the "${runType === 'easy' ? 'Easy Run' : runType === 'workout' ? 'Hard Workout' : 'Long Run'}" effort in these conditions at this time.

`.trim();
}

export default buildGeminiPrompt;

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { Button } from './Button';

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
    futureHours = hourlyForecast.slice(1, 4); // Next 3 hours
    trendDescription = 'over the next ~3 hours';
  } else { // 'easy' or 'workout'
    futureHours = hourlyForecast.slice(1, 2); // Next hour
    trendDescription = 'in the next hour';
  }

  if (futureHours.length === 0) {
    return { trendSummary: `Conditions are expected to be stable ${trendDescription}.` };
  }

  // Average the future conditions
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

const CopyWeatherButton = ({ derived, wx, unit, gender, runType, tempSensitivity }) => {
  const [isCopied, setIsCopied] = useState(false);

  const getRunTypeLabel = (type) => {
    switch (type) {
      case 'easy': return 'Easy Run';
      case 'workout': return 'Hard Workout';
      case 'longRun': return 'Long Run';
      default: return 'Easy Run';
    }
  };

  const getTempSensitivityLabel = (sensitivity) => {
    switch (sensitivity) {
      case -2: return 'Runs Cold';
      case -1: return 'Runs Slightly Cold';
      case 0: return 'Standard';
      case 1: return 'Runs Slightly Hot';
      case 2: return 'Runs Hot';
      default: return 'Standard';
    }
  };

  const handleCopy = () => {
    if (!derived || !wx) return;

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

    const promptText = `
Act as an expert running coach. Your task is to provide a gear recommendation and run strategy based only on the data I provide. Do not use any external tools or web searches; use reasoning alone.
1. Input Data:
• Timestamp: ${timestamp}
• Weather (Current):
• Air Temp: ${adjustedTemp.toFixed(1)}°${unit} (Adjusted for runner's preference)
• Dew Point: ${derived.dewPointDisplay?.toFixed(1)}°${unit}
• Humidity: ${wx.humidity?.toFixed(0)}%
• Wind: ${wx.wind?.toFixed(1)} mph
• Solar Angle: ${solarStatus} (${derived.solarElevation?.toFixed(1)}°)
• Solar Radiation: ${wx.solarRadiation?.toFixed(0)} W/m2
• Cloud Cover: ${wx.cloud?.toFixed(0)}%
• Precipitation %: ${wx.precipProb?.toFixed(0)}%
• Precipitation amount (in): ${wx.precip?.toFixed(2)}in
• UV: ${wx.uv?.toFixed(1)}
• Weather Trend:
• ${trendSummary}
• Runner Profile:
• Sex: ${gender || 'Male'}
• Effort: ${getRunTypeLabel(runType)}
• Master Gear List (Choose only from these items):
• ${MASTER_GEAR_LIST}
2. Required Output Format:
You must structure your response in these three exact sections:
Weather Analysis
First, calculate the "Feels Like" temperature, by analyzing all the weather data . Thoroughly analyze what this means for the run. Note your all your calculations, and explain how that influences the feel and gear choices (e.g., no sun for warmth, visibility). Also, comment on the weather trend and how it will affect the run.
Gear Recommendation (${getRunTypeLabel(runType)})
Based on your analysis and the Runner Profile (including their temperature preference), create a simple, clean list of items selected only from the Master Gear List. The gear should be adaptable to the changing conditions noted in the weather trend.
• This list must be ordered from head to toe.
• Do not include any extra text, explanations, or bullet points in this section—just the list of item names.
Run Strategy
In 20-40 words, provide a helpful run strategy tip for an experienced runner based on these specific conditions. Incorporate advice on how to manage the changing weather conditions (e.g., when to shed a layer, how to handle increasing wind/rain).
    `.trim();

    navigator.clipboard.writeText(promptText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <Button
        variant="outline"
        onClick={handleCopy}
        className="w-full"
        disabled={!derived || !wx}
      >
        {isCopied ? (
          <>
            <Check className="h-4 w-4 mr-2 text-green-500" />
            Copied Prompt
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 mr-2" />
            Copy Prompt
          </>
        )}
      </Button>
    </motion.div>
  );
};

export default CopyWeatherButton;

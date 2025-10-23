import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { Button } from './Button';
import { buildGeminiPrompt } from '../../utils/geminiPrompt';

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

    const promptText = buildGeminiPrompt({ derived, wx, unit, gender, runType, tempSensitivity });

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

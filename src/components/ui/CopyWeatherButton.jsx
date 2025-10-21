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

const CopyWeatherButton = ({ derived, wx, unit, gender, runType }) => {
  const [isCopied, setIsCopied] = useState(false);

  const getRunTypeLabel = (type) => {
    switch (type) {
      case 'easy': return 'Easy Run';
      case 'workout': return 'Hard Workout';
      case 'longRun': return 'Long Run';
      default: return 'Easy Run';
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

    const promptText = `
Act as an expert running coach. Your task is to provide a gear recommendation and run strategy based only on the data I provide. Do not use any external tools or web searches; use reasoning alone.
1. Input Data:
• Timestamp: ${timestamp}
• Weather:
• Air Temp: ${derived.tempDisplay?.toFixed(1)}°${unit}
• Dew Point: ${derived.dewPointDisplay?.toFixed(1)}°${unit}
• Humidity: ${wx.humidity?.toFixed(0)}%
• Wind: ${wx.wind?.toFixed(1)} mph
• Solar Angle: ${solarStatus} (${derived.solarElevation?.toFixed(1)}°)
• Solar Radiation: ${wx.solarRadiation?.toFixed(0)} W/m2
• Cloud Cover: ${wx.cloud?.toFixed(0)}%
• Precipitation %: ${wx.precipProb?.toFixed(0)}%
• Precipitation amount (in): ${wx.precip?.toFixed(2)}in
• UV: ${wx.uv?.toFixed(1)}
• Runner Profile:
• Sex: ${gender || 'Male'}
• Effort: ${getRunTypeLabel(runType)}
• Master Gear List (Choose only from these items):
• ${MASTER_GEAR_LIST}
2. Required Output Format:
You must structure your response in these three exact sections:
Weather Analysis
First, calculate the "Feels Like" temperature, factoring in the ${wx.wind?.toFixed(1)} mph wind. Briefly analyze what this means for the run. Note the solar angle is ${solarStatus.toLowerCase()}, and explain how that influences the feel and gear choices (e.g., no sun for warmth, visibility).
Gear Recommendation (${getRunTypeLabel(runType)})
Based on your analysis and the Runner Profile, create a simple, clean list of items selected only from the Master Gear List.
• This list must be ordered from head to toe.
• Do not include any extra text, explanations, or bullet points in this section—just the list of item names.
Run Strategy
In 20-40 words, provide a helpful run strategy tip for an experienced runner based on these specific conditions (especially the wind and darkness).
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

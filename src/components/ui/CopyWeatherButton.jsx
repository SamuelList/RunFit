import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { Button } from './Button';

const CopyWeatherButton = ({ derived, wx, unit }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (!derived || !wx) return;

    const weatherText = `
Air temp: ${derived.tempDisplay?.toFixed(1)}°${unit}
dew point: ${derived.dewPointDisplay?.toFixed(1)}°${unit}
Humidity: ${wx.humidity?.toFixed(0)}%
Wind: ${wx.wind?.toFixed(1)} mph
Solar angle: ${derived.solarElevation?.toFixed(1)}°
cloud cover: ${wx.cloud?.toFixed(0)}%
Precip %: ${wx.precipProb?.toFixed(0)}%
UV: ${wx.uv?.toFixed(1)}
    `.trim();

    navigator.clipboard.writeText(weatherText).then(() => {
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
            Copied to Clipboard
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 mr-2" />
            Copy Weather Data
          </>
        )}
      </Button>
    </motion.div>
  );
};

export default CopyWeatherButton;

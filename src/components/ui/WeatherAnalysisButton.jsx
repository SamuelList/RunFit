import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudRain, X } from 'lucide-react';
import { Button } from './Button';

const WeatherAnalysisButton = ({ aiData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const extractWeatherAnalysis = (text) => {
    if (!text) return 'No weather analysis available.';
    
    // Same extraction pattern as Run Strategy (which works reliably)
    const analysisMatch = text.match(/##?\s*Weather\s+Analysis[:\s]*(.*?)(?=##|$)/is);
    if (analysisMatch && analysisMatch[1]) {
      return analysisMatch[1].trim();
    }
    
    // Fallback: look for analysis without header (same as Run Strategy fallback)
    const lines = text.split('\n');
    const analysisStart = lines.findIndex(l => /weather\s+analysis/i.test(l));
    if (analysisStart >= 0) {
      const nextSection = lines.slice(analysisStart + 1).findIndex(l => /^#+/.test(l));
      const endIdx = nextSection >= 0 ? analysisStart + 1 + nextSection : lines.length;
      return lines.slice(analysisStart + 1, endIdx).join('\n').trim();
    }
    
    return 'No weather analysis found in AI output.';
  };

  const weatherAnalysis = extractWeatherAnalysis(aiData);

  return (
    <>
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Button
          variant="outline"
          onClick={() => setIsModalOpen(true)}
          className="w-full text-sm"
        >
          <CloudRain className="h-4 w-4 mr-2" />
          Weather Analysis
        </Button>
      </motion.div>

      <AnimatePresence>
        {isModalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[9999]"
              onClick={() => setIsModalOpen(false)}
            />
            
            {/* Modal */}
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-2xl"
              >
                {/* Close Button */}
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-gray-500 dark:text-slate-400" />
                </button>

                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-500/20">
                      <CloudRain className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Weather Analysis</h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400">AI-Powered Insights</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30">
                    <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {weatherAnalysis}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default WeatherAnalysisButton;

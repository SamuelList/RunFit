import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudRain, X } from 'lucide-react';
import { Button } from './Button';

const WeatherAnalysisButton = ({ aiData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const extractWeatherAnalysis = (text) => {
    if (!text) return 'No weather analysis available.';
    
    // Try to extract "Weather Analysis" section from AI output
    const analysisMatch = text.match(/##?\s*Weather\s+Analysis[:\s]*(.*?)(?=##|$)/is);
    if (analysisMatch && analysisMatch[1]) {
      return analysisMatch[1].trim();
    }
    
    // Fallback: look for analysis without header
    const lines = text.split('\n');
    const analysisStart = lines.findIndex(l => /weather\s+analysis/i.test(l));
    if (analysisStart >= 0) {
      const nextSection = lines.slice(analysisStart + 1).findIndex(l => /^#+/.test(l));
      const endIdx = nextSection >= 0 ? analysisStart + 1 + nextSection : lines.length;
      return lines.slice(analysisStart + 1, endIdx).join('\n').trim();
    }
    
    return 'No weather analysis section found in AI output.';
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setIsModalOpen(false)}
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-2xl md:w-full z-50"
            >
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-br from-sky-50/50 to-blue-50/50 dark:from-sky-900/20 dark:to-blue-900/20">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-500">
                      <CloudRain className="h-4 w-4 text-white" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                      Weather Analysis
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-600 dark:text-slate-300" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-sm text-gray-800 dark:text-slate-200 leading-relaxed">
                      {weatherAnalysis}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                  <Button
                    onClick={() => setIsModalOpen(false)}
                    className="w-full"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default WeatherAnalysisButton;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudRain, X } from 'lucide-react';
import { Button } from './Button';

const WeatherAnalysisButton = ({ aiData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const extractWeatherAnalysis = (text) => {
    if (!text) return 'No weather analysis available.';
    
    // Try to extract "Weather Analysis" section from AI output
    // Match "## Weather Analysis" or "Weather Analysis:" followed by content until next section
    const analysisMatch = text.match(/##?\s*Weather\s+Analysis[:\s]*\n*(.*?)(?=\n##\s|\n\*\*[A-Z]|$)/is);
    if (analysisMatch && analysisMatch[1]) {
      return analysisMatch[1].trim();
    }
    
    // Fallback: look for analysis without header
    const lines = text.split('\n');
    const analysisStart = lines.findIndex(l => /weather\s+analysis/i.test(l));
    if (analysisStart >= 0) {
      // Find next section header (## or **) to stop
      const remaining = lines.slice(analysisStart + 1);
      const nextSectionIdx = remaining.findIndex(l => /^##\s|^\*\*[A-Z]/.test(l));
      const endIdx = nextSectionIdx >= 0 ? analysisStart + 1 + nextSectionIdx : lines.length;
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
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 shadow-lg">
                      <CloudRain className="h-5 w-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                      Weather Analysis
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group"
                    aria-label="Close"
                  >
                    <X className="h-6 w-6 text-gray-500 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-200" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5 overflow-y-auto flex-1">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-base text-gray-700 dark:text-slate-300 leading-relaxed">
                      {weatherAnalysis}
                    </div>
                  </div>
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

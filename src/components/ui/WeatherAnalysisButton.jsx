import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudRain, X } from 'lucide-react';
import { Button } from './Button';

const WeatherAnalysisButton = ({ aiData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const extractWeatherAnalysis = (text) => {
    if (!text) return 'No weather analysis available.';
    
    // Strategy 1: Match ## Weather Analysis (with content until next ## or **Gear/**Run)
    let match = text.match(/##\s*Weather\s+Analysis\s*\n+([\s\S]*?)(?=\n*##\s*Gear|\n*\*\*Gear|\n*##\s*Run|\n*\*\*Run|$)/i);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
    
    // Strategy 2: Match **Weather Analysis** (bold markdown)
    match = text.match(/\*\*Weather\s+Analysis\*\*\s*\n+([\s\S]*?)(?=\n*\*\*Gear\s+Recommendation|\n*\*\*Run\s+Strategy|\n*##\s*Gear|\n*##\s*Run|$)/i);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
    
    // Strategy 3: Line-by-line extraction (handles variations in formatting)
    const lines = text.split('\n');
    const startIdx = lines.findIndex(l => 
      /^##\s*Weather\s+Analysis/i.test(l) || 
      /^\*\*Weather\s+Analysis\*\*/i.test(l)
    );
    
    if (startIdx !== -1) {
      // Find where the next section starts
      let endIdx = -1;
      for (let i = startIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        // Stop at next major section
        if (
          /^##\s*Gear/i.test(line) ||
          /^##\s*Run/i.test(line) ||
          /^\*\*Gear\s+Recommendation/i.test(line) ||
          /^\*\*Run\s+Strategy/i.test(line) ||
          /^\*\*\*$/i.test(line) // Stop at horizontal rule
        ) {
          endIdx = i;
          break;
        }
      }
      
      const contentLines = endIdx === -1 
        ? lines.slice(startIdx + 1)
        : lines.slice(startIdx + 1, endIdx);
      
      const content = contentLines.join('\n').trim();
      if (content) {
        return content;
      }
    }
    
    return 'Weather analysis not found in response.';
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
              onClick={() => setIsModalOpen(false)}
            />
            
            {/* Modal */}
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-2xl pointer-events-auto"
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

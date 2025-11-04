import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudRain, X } from 'lucide-react';
import { Button } from './Button';

const WeatherAnalysisButton = ({ aiData }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const extractWeatherAnalysis = (text) => {
    if (!text) return 'No weather analysis available.';
    
    console.log('=== RAW AI RESPONSE ===');
    console.log(text);
    console.log('=== END RAW AI RESPONSE ===');
    
    // Strategy 1: Try to find ANY text between the start and the next major section
    // This is more forgiving than looking for exact header formats
    const lines = text.split('\n');
    let startIdx = -1;
    let endIdx = -1;
    
    // Find start - look for any line containing "weather" and "analysis" (case insensitive)
    // OR just the beginning if no section headers are found
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase().trim();
      if (line.includes('weather') && line.includes('analysis')) {
        startIdx = i;
        console.log('Found Weather Analysis header at line', i, ':', lines[i]);
        break;
      }
    }
    
    // If no explicit "Weather Analysis" header found, assume it starts at the beginning
    if (startIdx === -1) {
      console.log('No explicit Weather Analysis header found, checking from start');
      startIdx = -1; // Will use 0 when slicing
    }
    
    // Find end - look for next section (Gear, Run, or horizontal rule)
    const searchStart = startIdx === -1 ? 0 : startIdx + 1;
    for (let i = searchStart; i < lines.length; i++) {
      const line = lines[i].trim().toLowerCase();
      if (
        line.startsWith('##') ||
        line.startsWith('**gear') ||
        line.startsWith('**run') ||
        line.includes('gear recommendation') ||
        line.includes('run strategy') ||
        /^\*\*\*+\s*$/.test(line) // horizontal rule
      ) {
        endIdx = i;
        console.log('Found next section at line', i, ':', lines[i]);
        break;
      }
    }
    
    // Extract content
    const contentStart = startIdx === -1 ? 0 : startIdx + 1;
    const contentLines = endIdx === -1 
      ? lines.slice(contentStart)
      : lines.slice(contentStart, endIdx);
    
    const content = contentLines.join('\n').trim();
    console.log('Extracted content length:', content.length);
    console.log('Extracted content preview:', content.substring(0, 200));
    
    if (!content) {
      return 'Weather analysis section is empty.';
    }
    
    return content;
  };

  const weatherAnalysis = extractWeatherAnalysis(aiData);

  // Render modal in a portal to ensure it's on top of everything
  const modalContent = (
    <AnimatePresence>
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[99999]"
            onClick={() => setIsModalOpen(false)}
          />
          
          {/* Modal */}
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors z-10"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-slate-400" />
              </button>

              {/* Header */}
              <div className="mb-4 pr-8">
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
              <div className="p-4 rounded-lg bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30">
                <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {weatherAnalysis}
                </p>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

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

      {/* Render modal in a portal at document.body level */}
      {typeof document !== 'undefined' && ReactDOM.createPortal(modalContent, document.body)}
    </>
  );
};

export default WeatherAnalysisButton;

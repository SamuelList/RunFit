import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Thermometer, Wind, Droplets, X, Copy, Check } from 'lucide-react';
import { buildHourPrompt } from '../../utils/geminiPrompt';

/**
 * HourBreakdownModal Component
 * 
 * Modal displaying detailed breakdown of a specific forecast hour including
 * weather conditions, score factors, and calculation results.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Close modal callback
 * @param {Object} props.hourData - Selected hour data with breakdown
 * @param {Object} props.hourDisplay - Display data (score, label, tone)
 * @param {Function} props.getDisplayedScore - Score adjustment function
 * @param {number} props.runnerBoldness - Runner boldness setting
 * @param {Object} props.variants - Animation variants
 * @returns {JSX.Element|null}
 */
const HourBreakdownModal = ({ 
  isOpen, 
  onClose, 
  hourData, 
  hourDisplay,
  getDisplayedScore,
  runnerBoldness,
  variants = {},
  unit = 'F',
  gender = 'Male',
  runType = 'easy',
  tempSensitivity = 0,
  currentLocation = ''
}) => {
  const [isCopied, setIsCopied] = useState(false);
  
  if (!isOpen || !hourData) return null;

  const { backdropVariants = {}, modalVariants = {}, staggerContainer = {}, listItemVariants = {} } = variants;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" 
          onClick={onClose}
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div 
            className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Header with Score */}
            <div className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                      {hourData.timeLabel} Performance Score
                    </h2>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-extrabold" style={hourDisplay?.tone?.textStyle}>
                      {hourDisplay ? hourDisplay.score : (hourData.score ? getDisplayedScore(hourData.score, runnerBoldness) : '--')}
                    </div>
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400">/100</div>
                  </div>
                </div>
                <motion.button 
                  onClick={onClose} 
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>
              {/* Score bar */}
              <div className="px-6 pb-4">
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
                  <motion.div 
                    className="h-full rounded-full"
                    style={hourDisplay?.tone?.badgeStyle}
                    initial={{ width: 0 }}
                    animate={{ width: `${hourDisplay?.score ?? (hourData.score ? getDisplayedScore(hourData.score, runnerBoldness) : 0)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 180px)' }}>
              <motion.div 
                className="space-y-6"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {/* Weather Summary */}
                <div className="flex flex-wrap gap-4 items-center p-4 rounded-xl bg-white/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Feels like {hourData.apparentDisplay}
                    </span>
                  </div>
                  {hourData.weatherData.windMph > 0 && (
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {Math.round(hourData.weatherData.windMph)} mph wind
                      </span>
                    </div>
                  )}
                  {hourData.weatherData.humidity > 0 && (
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {Math.round(hourData.weatherData.humidity)}% humidity
                      </span>
                    </div>
                  )}
                </div>

                {/* Factor Cards Grid */}
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                    {hourData.breakdown.useWBGT ? 'WBGT Calculation Factors' : 'UTCI Calculation Factors'}
                  </h3>
                  <motion.div 
                    className="grid grid-cols-1 md:grid-cols-2 gap-3"
                    variants={staggerContainer}
                  >
                    {hourData.breakdown.parts.map((part) => {
                      const impactColors = {
                        high: 'border-rose-200/60 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/10',
                        medium: 'border-amber-200/60 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10',
                        low: 'border-emerald-200/60 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10'
                      };
                      const impactBadgeColors = {
                        high: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700',
                        medium: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
                        low: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                      };
                      
                      return (
                        <motion.div 
                          key={part.key} 
                          className={`rounded-xl border p-4 ${impactColors[part.impact]}`}
                          variants={listItemVariants}
                          whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-bold text-gray-900 dark:text-slate-100">{part.label}</span>
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${impactBadgeColors[part.impact]}`}>
                                  {part.impact} impact
                                </span>
                              </div>
                              <div className="text-2xl font-extrabold text-gray-900 dark:text-slate-100">
                                {part.value}
                              </div>
                              {part.dewPoint && (
                                <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                  Dew point: {part.dewPoint}
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs leading-relaxed text-gray-700 dark:text-slate-300">{part.description}</p>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                  
                  {/* Result Summary */}
                  {hourData.breakdown.result && (
                    <motion.div 
                      className="mt-4 rounded-xl border-2 border-violet-300 dark:border-violet-600 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 p-4"
                      variants={listItemVariants}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-bold text-violet-900 dark:text-violet-200 mb-1">
                            {hourData.breakdown.result.label}
                          </div>
                          <div className="text-3xl font-extrabold text-violet-700 dark:text-violet-300">
                            {hourData.breakdown.result.value}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-violet-600 dark:text-violet-400 mb-1">Impact on Score</div>
                          <div className="text-2xl font-bold text-violet-900 dark:text-violet-200">
                            {hourData.breakdown.result.description.match(/Score: (\d+)/)?.[1] || hourDisplay?.score || '--'}/100
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-violet-800 dark:text-violet-300">{hourData.breakdown.result.description}</p>
                    </motion.div>
                  )}
                </div>

                {/* Copy Prompt Button */}
                <motion.button
                  onClick={() => {
                    const promptText = buildHourPrompt({
                      hourData,
                      unit,
                      gender,
                      runType,
                      tempSensitivity,
                      currentLocation
                    });
                    navigator.clipboard.writeText(promptText).then(() => {
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    });
                  }}
                  className="w-full rounded-xl border-2 border-sky-300 dark:border-sky-600 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/40 px-6 py-3 font-semibold text-sky-900 dark:text-sky-100 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  variants={listItemVariants}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    {isCopied ? (
                      <>
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span>Prompt Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-5 w-5" />
                        <span>Copy Prompt for AI</span>
                      </>
                    )}
                  </div>
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HourBreakdownModal;

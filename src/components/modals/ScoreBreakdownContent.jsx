import React from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Wind, Droplets } from 'lucide-react';

/**
 * ScoreBreakdownContent Component
 * 
 * Reusable content component for displaying score breakdown information
 * Used in both Insights Modal and Hour Breakdown Modal
 * 
 * @param {Object} props
 * @param {Object} props.breakdown - Score breakdown data
 * @param {Array} props.breakdown.parts - Array of factor objects
 * @param {Object} props.breakdown.result - Result summary
 * @param {Object} props.weatherSummary - Optional weather summary data
 * @param {number} props.score - Score value for display
 * @param {Object} props.variants - Animation variants
 * @returns {JSX.Element}
 */
export const ScoreBreakdownContent = ({ 
  breakdown, 
  weatherSummary,
  score,
  variants = {}
}) => {
  const { staggerContainer = {}, listItemVariants = {} } = variants;

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
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Weather Summary (optional) */}
      {weatherSummary && (
        <div className="flex flex-wrap gap-4 items-center p-4 rounded-xl bg-white/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Feels like {weatherSummary.apparentDisplay}
            </span>
          </div>
          {weatherSummary.windMph > 0 && (
            <div className="flex items-center gap-2">
              <Wind className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {Math.round(weatherSummary.windMph)} mph wind
              </span>
            </div>
          )}
          {weatherSummary.humidity > 0 && (
            <div className="flex items-center gap-2">
              <Droplets className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {Math.round(weatherSummary.humidity)}% humidity
              </span>
            </div>
          )}
        </div>
      )}

      {/* Factor Cards Grid */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
          {breakdown.useWBGT ? 'WBGT Calculation Factors' : 'UTCI Calculation Factors'}
        </h3>
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
          variants={staggerContainer}
        >
          {breakdown.parts.map((part) => (
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
          ))}
        </motion.div>
        
        {/* Result Summary */}
        {breakdown.result && (
          <motion.div 
            className="mt-4 rounded-xl border-2 border-violet-300 dark:border-violet-600 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 p-4"
            variants={listItemVariants}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-violet-900 dark:text-violet-200 mb-1">
                  {breakdown.result.label}
                </div>
                <div className="text-3xl font-extrabold text-violet-700 dark:text-violet-300">
                  {breakdown.result.value}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-violet-600 dark:text-violet-400 mb-1">Impact on Score</div>
                <div className="text-2xl font-bold text-violet-900 dark:text-violet-200">
                  {breakdown.result.description.match(/Score: (\d+)/)?.[1] || score || '--'}/100
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-violet-800 dark:text-violet-300">{breakdown.result.description}</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default ScoreBreakdownContent;

import { motion } from 'framer-motion';

/**
 * ScoreBreakdown Component
 * 
 * Displays a grid of factor cards showing how each environmental and temporal
 * factor contributes to the overall running performance score. Each card shows
 * the penalty amount, impact level, reason, and optional tip for improvement.
 * 
 * Impact Levels:
 * - High (rose/red): Significant negative impact on running conditions
 * - Medium (amber/orange): Moderate impact worth considering
 * - Low (emerald/green): Minor impact, still favorable conditions
 * 
 * Features:
 * - Responsive grid layout (1-2 columns)
 * - Color-coded impact severity
 * - Animated penalty progress bars
 * - Staggered entrance animations
 * - Hover scale effects
 * - Optional tips for managing each factor
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Array} props.breakdownParts - Array of factor breakdown objects
 * @param {string} props.breakdownParts[].key - Unique identifier for factor
 * @param {string} props.breakdownParts[].label - Display name of factor
 * @param {number} props.breakdownParts[].penalty - Points deducted (0-max)
 * @param {number} props.breakdownParts[].max - Maximum possible penalty
 * @param {string} props.breakdownParts[].why - Explanation of penalty
 * @param {string} [props.breakdownParts[].tip] - Optional improvement tip
 * 
 * @example
 * <ScoreBreakdown 
 *   breakdownParts={[
 *     {
 *       key: 'temp',
 *       label: 'Temperature',
 *       penalty: 8,
 *       max: 15,
 *       why: 'Outside ideal range',
 *       tip: 'Adjust pace for heat'
 *     }
 *   ]}
 * />
 */
const ScoreBreakdown = ({ breakdownParts }) => {
  // Container animation for staggered children
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  };

  // Individual card animation
  const listItemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: 'spring', damping: 20, stiffness: 300 }
    }
  };

  /**
   * Determines impact level based on penalty as percentage of max
   * @param {number} penalty - Current penalty value
   * @param {number} max - Maximum possible penalty
   * @returns {string} Impact level: 'high', 'medium', or 'low'
   */
  const getImpactLevel = (penalty, max) => {
    if (!max || max === 0) return 'low';
    const percentage = (penalty / max) * 100;
    if (percentage >= 60) return 'high';
    if (percentage >= 30) return 'medium';
    return 'low';
  };

  /**
   * Gets color classes based on impact level
   * @param {string} level - Impact level from getImpactLevel
   * @returns {Object} Color classes for different elements
   */
  const getImpactColors = (level) => {
    switch (level) {
      case 'high':
        return {
          border: 'border-rose-300 dark:border-rose-500/40',
          bg: 'bg-rose-50 dark:bg-rose-500/10',
          text: 'text-rose-900 dark:text-rose-200',
          badge: 'bg-rose-200 dark:bg-rose-500/30 text-rose-800 dark:text-rose-200',
          progress: 'bg-rose-500 dark:bg-rose-400'
        };
      case 'medium':
        return {
          border: 'border-amber-300 dark:border-amber-500/40',
          bg: 'bg-amber-50 dark:bg-amber-500/10',
          text: 'text-amber-900 dark:text-amber-200',
          badge: 'bg-amber-200 dark:bg-amber-500/30 text-amber-800 dark:text-amber-200',
          progress: 'bg-amber-500 dark:bg-amber-400'
        };
      default: // low
        return {
          border: 'border-emerald-300 dark:border-emerald-500/40',
          bg: 'bg-emerald-50 dark:bg-emerald-500/10',
          text: 'text-emerald-900 dark:text-emerald-200',
          badge: 'bg-emerald-200 dark:bg-emerald-500/30 text-emerald-800 dark:text-emerald-200',
          progress: 'bg-emerald-500 dark:bg-emerald-400'
        };
    }
  };

  if (!breakdownParts || breakdownParts.length === 0) {
    return (
      <div className="text-center text-slate-500 dark:text-slate-400">
        No breakdown data available
      </div>
    );
  }

  return (
    <motion.div
      className="grid gap-4 md:grid-cols-2"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {breakdownParts.map((part) => {
        const impactLevel = getImpactLevel(part.penalty, part.max);
        const colors = getImpactColors(impactLevel);
        const penaltyPercentage = part.max > 0 ? (part.penalty / part.max) * 100 : 0;

        return (
          <motion.div
            key={part.key}
            className={`rounded-xl border p-4 ${colors.border} ${colors.bg}`}
            variants={listItemVariants}
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', damping: 20, stiffness: 400 }}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3 className={`font-semibold ${colors.text}`}>
                {part.label}
              </h3>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${colors.badge}`}>
                {impactLevel}
              </span>
            </div>

            <div className="mb-2 flex items-baseline gap-2">
              <span className={`text-2xl font-black ${colors.text}`}>
                -{part.penalty}
              </span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                / {part.max} pts
              </span>
            </div>

            {/* Penalty Progress Bar */}
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <motion.div
                className={`h-full rounded-full ${colors.progress}`}
                initial={{ width: 0 }}
                animate={{ width: `${penaltyPercentage}%` }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
              />
            </div>

            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {part.why}
            </p>

            {part.tip && (
              <div className="mt-3 rounded-lg bg-white/60 p-2.5 dark:bg-slate-900/40">
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  💡 <span className="font-medium">{part.tip}</span>
                </p>
              </div>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default ScoreBreakdown;

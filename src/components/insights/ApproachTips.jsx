import { motion } from 'framer-motion';

/**
 * ApproachTips Component
 * 
 * Displays strategic running tips based on current conditions, run type,
 * and environmental factors. Highlights road warnings with special styling
 * and provides numbered guidance for complex conditions.
 * 
 * Features:
 * - Numbered tips for multi-step guidance
 * - Special styling for road warnings (ice, surface issues)
 * - Severity-based color coding (danger/warning/caution)
 * - Staggered entrance animations
 * - Pace adjustment guidance
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Array<string>} props.tips - Array of tip strings to display
 * @param {Object} props.roadConditions - Road safety information
 * @param {string} props.roadConditions.severity - Severity level: 'danger', 'warning', or 'caution'
 * @param {boolean} props.roadConditions.hasWarnings - Whether road warnings exist
 * @param {string} props.paceAdj - Pace adjustment guidance text
 * 
 * @example
 * <ApproachTips
 *   tips={[
 *     'Start conservatively and assess how you feel',
 *     '⚠️ Ice danger: Temperature near freezing with wet conditions'
 *   ]}
 *   roadConditions={{ severity: 'danger', hasWarnings: true }}
 *   paceAdj="Reduce pace by 15-30 seconds per mile"
 * />
 */
const ApproachTips = ({ tips, roadConditions, paceAdj }) => {
  if (!tips || tips.length === 0) {
    return null;
  }

  /**
   * Determines if a tip is a road warning based on ⚠️ prefix
   * @param {string} tip - Tip text to check
   * @returns {boolean} True if tip is a road warning
   */
  const isRoadWarning = (tip) => {
    return tip.startsWith('⚠️');
  };

  /**
   * Gets styling classes based on road conditions severity
   * @param {boolean} isWarning - Whether this is a road warning tip
   * @returns {string} Tailwind classes for the tip container
   */
  const getTipStyles = (isWarning) => {
    if (!isWarning) {
      return 'border-sky-200/40 bg-white/60 dark:border-sky-800/40 dark:bg-slate-900/40';
    }

    const { severity } = roadConditions || {};
    
    switch (severity) {
      case 'danger':
        return 'border-red-300/60 bg-red-50/80 dark:border-red-500/30 dark:bg-red-500/10';
      case 'warning':
        return 'border-orange-300/60 bg-orange-50/80 dark:border-orange-500/30 dark:bg-orange-500/10';
      default: // caution
        return 'border-yellow-300/60 bg-yellow-50/80 dark:border-yellow-500/30 dark:bg-yellow-500/10';
    }
  };

  /**
   * Gets text styling for tips
   * @param {boolean} isWarning - Whether this is a road warning tip
   * @returns {string} Tailwind classes for tip text
   */
  const getTipTextStyles = (isWarning) => {
    return isWarning 
      ? 'text-gray-900 dark:text-slate-100 font-medium'
      : 'text-gray-800 dark:text-slate-200';
  };

  return (
    <div className="space-y-3">
      {tips.map((tip, idx) => {
        const isWarning = isRoadWarning(tip);
        const showNumbers = tips.length > 2 && !isWarning;

        return (
          <motion.div
            key={idx}
            className={`flex items-start gap-2 rounded-lg border p-3 ${getTipStyles(isWarning)}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            {showNumbers && (
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-500/20">
                <span className="text-xs font-bold text-sky-700 dark:text-sky-400">
                  {idx + 1}
                </span>
              </div>
            )}
            <p className={`text-sm leading-relaxed ${getTipTextStyles(isWarning)}`}>
              {tip}
            </p>
          </motion.div>
        );
      })}
      
      {/* Pace Guidance */}
      {paceAdj && (
        <motion.div
          className="mt-4 rounded-lg border border-indigo-200/60 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/10 p-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: tips.length * 0.1 }}
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
            Pace Guidance
          </div>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-slate-100">
            {paceAdj}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default ApproachTips;

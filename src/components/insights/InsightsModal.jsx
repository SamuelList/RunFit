import { AnimatePresence, motion } from 'framer-motion';
import { Info, X } from 'lucide-react';
import ScoreBreakdown from './ScoreBreakdown';

/**
 * InsightsModal Component
 * 
 * Displays a detailed breakdown of the running performance score, showing
 * all contributing factors, their impact levels, and penalty values. Provides
 * runners with transparency about why their score is what it is and what
 * factors are most significantly affecting running conditions.
 * 
 * Features:
 * - Full-screen modal with animated backdrop
 * - Score display with animated progress bar
 * - Detailed factor breakdown with impact levels
 * - Color-coded severity indicators (rose/amber/emerald)
 * - Smooth entrance/exit animations
 * - Click-outside-to-close functionality
 * 
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.showInsights - Controls modal visibility
 * @param {Function} props.onClose - Callback to close modal
 * @param {Object} props.breakdown - Score breakdown data from computeScoreBreakdown
 * @param {Array} props.breakdown.parts - Array of factor objects with penalty data
 * @param {number} props.score - Overall performance score (0-100)
 * @param {Object} props.displayedScoreProps - Score display properties (label, tone)
 * @param {string} props.displayedScoreProps.tone.badgeStyle - Badge styling for score
 * 
 * @example
 * <InsightsModal
 *   showInsights={showInsights}
 *   onClose={() => setShowInsights(false)}
 *   breakdown={breakdown}
 *   score={derived.displayedScore}
 *   displayedScoreProps={displayedScoreProps}
 * />
 */
const InsightsModal = ({ 
  showInsights, 
  onClose, 
  breakdown, 
  score, 
  displayedScoreProps 
}) => {
  // Backdrop animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  // Modal animation variants
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: 'spring', damping: 25, stiffness: 300 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: 20,
      transition: { duration: 0.2 }
    }
  };

  return (
    <AnimatePresence>
      {showInsights && breakdown && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200/50 bg-white shadow-2xl dark:border-slate-700/50 dark:bg-slate-800"
            variants={modalVariants}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-gradient-to-br from-slate-50/95 to-slate-100/95 px-6 py-5 backdrop-blur-sm dark:border-slate-700/80 dark:from-slate-800/95 dark:to-slate-900/95">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                    <Info className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                      Performance Score Breakdown!
                    </h2>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span 
                        className="text-4xl font-black" 
                        style={displayedScoreProps?.tone?.badgeStyle}
                      >
                        {score}
                      </span>
                      <span className="text-xl font-semibold text-slate-500 dark:text-slate-400">
                        /100
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-slate-200"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Score Progress Bar */}
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <motion.div
                  className="h-full rounded-full"
                  style={displayedScoreProps?.tone?.badgeStyle}
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                />
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div 
              className="max-h-[calc(90vh-180px)] overflow-y-auto px-6 py-6"
              style={{ scrollbarGutter: 'stable' }}
            >
              <ScoreBreakdown breakdownParts={breakdown.parts} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InsightsModal;

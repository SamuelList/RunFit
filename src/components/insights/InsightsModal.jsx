import React from 'react';
import { Info } from 'lucide-react';
import { DynamicModal, ScoreBreakdownContent } from '../modals';

/**
 * InsightsModal (wrapper)
 *
 * Thin wrapper that renders the shared DynamicModal with ScoreBreakdown content.
 */
const InsightsModal = ({
  showInsights,
  onClose,
  breakdown,
  score,
  displayedScoreProps,
  derived
}) => {
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

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
    <DynamicModal
      isOpen={showInsights}
      onClose={onClose}
      title="Performance Score Breakdown"
      icon={Info}
      headerRight={
        <div className="flex items-baseline gap-2">
          <div className="text-4xl font-extrabold" style={displayedScoreProps?.tone?.textStyle}>
            {displayedScoreProps ? Math.max(1, Math.round(displayedScoreProps.score / 10)) : (typeof score === 'number' ? Math.max(1, Math.round(score / 10)) : '--')}
          </div>
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">/ 10</div>
        </div>
      }
      scoreBar={derived && {
        value: displayedScoreProps?.score ?? 0,
        style: displayedScoreProps?.tone?.badgeStyle
      }}
      variants={{ backdropVariants, modalVariants }}
    >
      {breakdown ? (
        <ScoreBreakdownContent
          breakdown={breakdown}
          score={score}
          variants={{}}
        />
      ) : (
        <p className="text-slate-500 dark:text-slate-300">Fetching conditions…</p>
      )}
    </DynamicModal>
  );
};

export default InsightsModal;

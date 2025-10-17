/**
 * RoadConditions Component
 * 
 * Displays road safety alerts as a badge indicator, warning runners about
 * ice danger, wet surfaces, or other hazardous running conditions.
 * 
 * Severity Levels:
 * - danger (red): Critical conditions requiring extreme caution
 * - warning (orange): Significant hazards to be aware of
 * - caution (yellow): Minor concerns worth noting
 * 
 * Features:
 * - Compact badge display
 * - Color-coded severity levels
 * - Warning emoji indicator
 * - Dark mode support
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.roadConditions - Road safety information
 * @param {boolean} props.roadConditions.hasWarnings - Whether warnings exist
 * @param {string} props.roadConditions.severity - Severity level: 'danger', 'warning', or 'caution'
 * @param {string} [props.roadConditions.message] - Optional warning message
 * 
 * @example
 * <RoadConditions
 *   roadConditions={{
 *     hasWarnings: true,
 *     severity: 'danger',
 *     message: 'Ice danger possible'
 *   }}
 * />
 */
const RoadConditions = ({ roadConditions }) => {
  if (!roadConditions?.hasWarnings) {
    return null;
  }

  const { severity } = roadConditions;

  /**
   * Gets styling classes based on severity level
   * @returns {string} Tailwind classes for badge styling
   */
  const getSeverityStyles = () => {
    switch (severity) {
      case 'danger':
        return 'border-red-300 bg-red-100 text-red-800 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-200';
      case 'warning':
        return 'border-orange-300 bg-orange-100 text-orange-800 dark:border-orange-500/40 dark:bg-orange-500/20 dark:text-orange-200';
      default: // caution
        return 'border-yellow-300 bg-yellow-100 text-yellow-800 dark:border-yellow-500/40 dark:bg-yellow-500/20 dark:text-yellow-200';
    }
  };

  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${getSeverityStyles()}`}
      title={roadConditions.message || 'Road conditions warning'}
    >
      ⚠️ Road Alert
    </span>
  );
};

export default RoadConditions;

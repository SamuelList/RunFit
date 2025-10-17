/**
 * VisibilityMetrics Component
 * 
 * Displays detailed breakdown of night visibility calculations including
 * moon illumination, sky clarity, and atmospheric penalties (fog/haze).
 * Shows the formula: Effective Visibility = (Moon × Sky Clarity) × Fog Factor
 * 
 * Features:
 * - Moon light percentage with quality label
 * - Sky clarity with cloud cover description
 * - Fog/haze penalty detection and display
 * - Animated progress bar for effective visibility
 * - Color-coded metrics cards
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.moonPhase - Moon phase data
 * @param {number} props.moonPhase.illuminationPct - Moon illumination percentage
 * @param {number} props.moonPhase.illumination - Moon illumination decimal (0-1)
 * @param {Object} props.wx - Weather data
 * @param {number} props.wx.cloud - Cloud cover percentage
 * @param {number} props.wx.humidity - Humidity percentage
 * @param {number} props.wx.temperature - Current temperature
 * @param {number} props.effectiveVis - Calculated effective visibility percentage
 * @param {number} props.skyClarity - Sky clarity percentage (100 - cloud)
 * @param {number} props.dewPoint - Dew point temperature
 * 
 * @example
 * <VisibilityMetrics
 *   moonPhase={{ illuminationPct: 85, illumination: 0.85 }}
 *   wx={{ cloud: 20, humidity: 65, temperature: 52 }}
 *   effectiveVis={68}
 *   skyClarity={80}
 *   dewPoint={45}
 * />
 */
const VisibilityMetrics = ({ moonPhase, wx, effectiveVis, skyClarity, dewPoint }) => {
  if (!moonPhase || !wx) return null;

  const humidity = wx.humidity || 0;
  const tempDewDiff = Math.abs((wx.temperature || 0) - (dewPoint || 0));
  const isFoggy = humidity > 85 && tempDewDiff < 5;
  const isHazy = humidity > 90 && tempDewDiff < 8 && !isFoggy;

  /**
   * Gets moon light quality description
   */
  const getMoonLightQuality = () => {
    if (moonPhase.illumination >= 0.75) return 'Very bright';
    if (moonPhase.illumination >= 0.5) return 'Moderate';
    if (moonPhase.illumination >= 0.25) return 'Dim';
    return 'Very dark';
  };

  /**
   * Gets sky clarity description
   */
  const getSkyClarityDescription = () => {
    const cloud = wx.cloud || 0;
    if (cloud < 20) return 'Clear skies';
    if (cloud < 50) return 'Partly cloudy';
    if (cloud < 80) return 'Mostly cloudy';
    return 'Overcast';
  };

  return (
    <>
      {/* Moon Light & Sky Clarity Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-indigo-200/50 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-500/10 dark:to-purple-500/5 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
            Moon Light
          </div>
          <div className="mt-1 text-3xl font-bold text-indigo-900 dark:text-indigo-100">
            {moonPhase.illuminationPct}%
          </div>
          <div className="mt-1 text-xs text-gray-600 dark:text-slate-400">
            {getMoonLightQuality()}
          </div>
        </div>
        
        <div className="rounded-xl border border-blue-200/50 dark:border-blue-500/30 bg-gradient-to-br from-blue-50/50 to-sky-50/30 dark:from-blue-500/10 dark:to-sky-500/5 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
            Sky Clarity
          </div>
          <div className="mt-1 text-3xl font-bold text-blue-900 dark:text-blue-100">
            {skyClarity.toFixed(1)}%
          </div>
          <div className="mt-1 text-xs text-gray-600 dark:text-slate-400">
            {getSkyClarityDescription()}
          </div>
        </div>
      </div>

      {/* Effective Visibility Calculation */}
      <div className="rounded-xl border-2 border-purple-200/60 dark:border-purple-500/40 bg-gradient-to-br from-purple-50/60 via-fuchsia-50/40 to-pink-50/30 dark:from-purple-500/15 dark:via-fuchsia-500/10 dark:to-pink-500/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-purple-900 dark:text-purple-200">
            Effective Night Visibility
          </div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {effectiveVis}%
          </div>
        </div>
        
        <div className="space-y-1.5 text-xs text-gray-700 dark:text-slate-300">
          <div className="flex justify-between">
            <span>Moon illumination:</span>
            <span className="font-medium">{moonPhase.illuminationPct}%</span>
          </div>
          <div className="flex justify-between">
            <span>Sky clarity:</span>
            <span className="font-medium">{skyClarity.toFixed(1)}%</span>
          </div>
          {isFoggy && (
            <div className="flex justify-between text-amber-700 dark:text-amber-300">
              <span>Fog penalty:</span>
              <span className="font-medium">-70%</span>
            </div>
          )}
          {isHazy && (
            <div className="flex justify-between text-amber-600 dark:text-amber-400">
              <span>Haze penalty:</span>
              <span className="font-medium">-40%</span>
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 transition-all duration-700"
            style={{ width: `${effectiveVis}%` }}
          />
        </div>
      </div>
    </>
  );
};

export default VisibilityMetrics;

/**
 * VisibilityMetrics Component
 * 
 * Displays detailed breakdown of night visibility calculations including
 * moon illumination, sky clarity, moon position, and atmospheric penalties (fog/haze).
 * Shows the formula: Effective Visibility = (Moon × Sky Clarity × Altitude Factor) × Fog Factor
 * Uses SunCalc.org data for accurate moon position and rise/set times.
 * 
 * Features:
 * - Moon light percentage with quality label
 * - Sky clarity with cloud cover description
 * - Moon position (altitude and direction)
 * - Moonrise/moonset times
 * - Fog/haze penalty detection and display
 * - Animated progress bar for effective visibility
 * - Color-coded metrics cards
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.moonPhase - Moon phase data from SunCalc
 * @param {number} props.moonPhase.illuminationPct - Moon illumination percentage
 * @param {number} props.moonPhase.illumination - Moon illumination decimal (0-1)
 * @param {Object} [props.moonPosition] - Moon position data from SunCalc
 * @param {number} props.moonPosition.altitude - Moon elevation above horizon in degrees
 * @param {number} props.moonPosition.azimuth - Moon direction from north (0-360 degrees)
 * @param {boolean} props.moonPosition.isVisible - Whether moon is above horizon
 * @param {string} props.moonPosition.direction - Cardinal direction (N, NE, E, etc.)
 * @param {Date} [props.moonPosition.rise] - Moonrise time
 * @param {Date} [props.moonPosition.set] - Moonset time
 * @param {boolean} [props.moonPosition.alwaysUp] - Moon never sets today
 * @param {boolean} [props.moonPosition.alwaysDown] - Moon never rises today
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
 *   moonPosition={{ 
 *     altitude: 45, 
 *     azimuth: 135, 
 *     isVisible: true, 
 *     direction: "SE",
 *     rise: new Date(),
 *     set: new Date()
 *   }}
 *   wx={{ cloud: 20, humidity: 65, temperature: 52 }}
 *   effectiveVis={68}
 *   skyClarity={80}
 *   dewPoint={45}
 * />
 */
const VisibilityMetrics = ({ moonPhase, moonPosition, wx, effectiveVis, skyClarity, dewPoint }) => {
  if (!moonPhase || !wx) return null;

  const humidity = wx.humidity || 0;
  const tempDewDiff = Math.abs((wx.temperature || 0) - (dewPoint || 0));
  const isFoggy = humidity > 85 && tempDewDiff < 5;
  const isHazy = humidity > 90 && tempDewDiff < 8 && !isFoggy;

  /**
   * Format time for moonrise/moonset display
   */
  const formatMoonTime = (date) => {
    if (!date || !(date instanceof Date)) return null;
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(date);
    } catch {
      return null;
    }
  };

  return (
    <>
      {/* Moon Position (if available) */}
      {moonPosition && (
        <div className="rounded-xl border border-slate-200/50 dark:border-slate-600/50 bg-gradient-to-br from-slate-50/50 to-gray-50/30 dark:from-slate-500/10 dark:to-gray-500/5 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-2">
            Moon Position • SunCalc.org
          </div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <div className="text-xs text-gray-600 dark:text-slate-400">Altitude</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {moonPosition.isVisible ? `${Math.round(moonPosition.altitude)}°` : 'Below horizon'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-600 dark:text-slate-400">Direction</div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {moonPosition.isVisible ? moonPosition.direction : '—'}
              </div>
            </div>
          </div>
          
          {/* Moonrise/Moonset times */}
          {(moonPosition.alwaysUp || moonPosition.alwaysDown || moonPosition.rise || moonPosition.set) && (
            <div className="border-t border-slate-200/50 dark:border-slate-600/50 pt-3 space-y-1.5">
              {moonPosition.alwaysUp && (
                <div className="text-xs text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                  <span>⭕</span>
                  <span>Moon never sets today (circumpolar)</span>
                </div>
              )}
              {moonPosition.alwaysDown && (
                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <span>⭕</span>
                  <span>Moon never rises today</span>
                </div>
              )}
              {!moonPosition.alwaysUp && !moonPosition.alwaysDown && (
                <>
                  {moonPosition.rise && formatMoonTime(moonPosition.rise) && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-slate-400">Moonrise:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {formatMoonTime(moonPosition.rise)}
                      </span>
                    </div>
                  )}
                  {moonPosition.set && formatMoonTime(moonPosition.set) && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600 dark:text-slate-400">Moonset:</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {formatMoonTime(moonPosition.set)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          
          {!moonPosition.isVisible && !moonPosition.alwaysDown && (
            <div className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              Moon has set • Zero moonlight available
            </div>
          )}
        </div>
      )}

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
          {moonPosition && (
            <div className="flex justify-between">
              <span>Moon altitude factor:</span>
              <span className="font-medium">
                {moonPosition.isVisible && moonPosition.altitude > 0
                  ? `${Math.round(Math.min(1.0, (moonPosition.altitude / 60) * 0.85 + 0.15) * 100)}%`
                  : '0% (below horizon)'}
              </span>
            </div>
          )}
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

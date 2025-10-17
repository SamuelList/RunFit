/**
 * MoonPhaseVisual Component
 * 
 * SVG-based moon phase visualization showing accurate illumination patterns.
 * Renders the moon with precise crescent, quarter, gibbous, and full phases
 * using SVG paths and clip masks.
 * 
 * Features:
 * - Accurate moon phase rendering (waxing/waning)
 * - Gradient illumination effects
 * - Phase emoji overlay
 * - Illumination percentage display
 * - Days to full/new moon countdown
 * - Waxing/waning indicator
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.moonPhase - Moon phase data
 * @param {number} props.moonPhase.illumination - Decimal illumination (0-1)
 * @param {number} props.moonPhase.illuminationPct - Percentage illumination (0-100)
 * @param {number} props.moonPhase.phase - Phase value (0-1)
 * @param {boolean} props.moonPhase.isWaxing - Whether moon is waxing
 * @param {string} props.moonPhase.emoji - Moon phase emoji
 * @param {number} props.moonPhase.daysToFull - Days until full moon
 * @param {number} props.moonPhase.daysToNew - Days until new moon
 * 
 * @example
 * <MoonPhaseVisual
 *   moonPhase={{
 *     illumination: 0.75,
 *     illuminationPct: 75,
 *     phase: 0.25,
 *     isWaxing: true,
 *     emoji: "🌔",
 *     daysToFull: 3,
 *     daysToNew: 11
 *   }}
 * />
 */
const MoonPhaseVisual = ({ moonPhase }) => {
  if (!moonPhase) return null;

  const { illumination, illuminationPct, phase, isWaxing, emoji, daysToFull, daysToNew } = moonPhase;

  /**
   * Generates SVG clip path for illuminated portion of moon
   * Handles all phase types: new, crescent, quarter, gibbous, full
   */
  const getIlluminatedClipPath = () => {
    // Full moon - show complete circle
    if (illumination >= 0.99) {
      return <circle cx="50" cy="50" r="48" />;
    }
    
    // New moon - show nothing
    if (illumination <= 0.01) {
      return null;
    }
    
    // Quarter moon - show exact half
    if (illumination === 0.5) {
      return isWaxing 
        ? <rect x="50" y="2" width="48" height="96" />
        : <rect x="2" y="2" width="48" height="96" />;
    }
    
    // Crescent or gibbous - use ellipse
    let xOffset = 50;
    let rx = 48;
    
    if (phase < 0.5) {
      // Waxing (0 to 0.5) - light on right
      rx = 48 * (illumination * 2); // Scale from 0 to 48
      xOffset = 50 + (48 - rx);
    } else {
      // Waning (0.5 to 1) - light on left
      const waningIllum = 1 - ((phase - 0.5) * 2);
      rx = 48 * waningIllum;
      xOffset = 50 - (48 - rx);
    }
    
    return <ellipse cx={xOffset} cy="50" rx={rx} ry="48" />;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* SVG Moon */}
      <div className="relative flex h-40 w-40 items-center justify-center">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          {/* Gradient Definitions */}
          <defs>
            <radialGradient id="moonLight">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="50%" stopColor="#FDE68A" />
              <stop offset="100%" stopColor="#FCD34D" />
            </radialGradient>
            <radialGradient id="moonDark">
              <stop offset="0%" stopColor="#64748B" />
              <stop offset="100%" stopColor="#1E293B" />
            </radialGradient>
            <clipPath id="illuminatedPart">
              {getIlluminatedClipPath()}
            </clipPath>
          </defs>
          
          {/* Moon base (dark side) */}
          <circle 
            cx="50" 
            cy="50" 
            r="48" 
            fill="url(#moonDark)" 
            className="drop-shadow-2xl" 
          />
          
          {/* Moon illuminated portion */}
          <circle 
            cx="50" 
            cy="50" 
            r="48" 
            fill="url(#moonLight)" 
            clipPath="url(#illuminatedPart)"
          />
          
          {/* Outer ring */}
          <circle 
            cx="50" 
            cy="50" 
            r="48" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="0.5" 
            className="text-gray-300 dark:text-slate-600"
          />
        </svg>
        
        {/* Phase emoji overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-5xl drop-shadow-lg">{emoji}</span>
        </div>
      </div>
      
      {/* Phase Info */}
      <div className="text-center">
        <div className="text-xl font-bold text-gray-800 dark:text-slate-100">
          {illuminationPct}% Illuminated
        </div>
        <div className="text-sm text-gray-600 dark:text-slate-300">
          {daysToFull < daysToNew
            ? `${daysToFull} ${daysToFull === 1 ? 'day' : 'days'} until full moon`
            : `${daysToNew} ${daysToNew === 1 ? 'day' : 'days'} until new moon`}
        </div>
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-slate-400">
          <span>{isWaxing ? 'Waxing' : 'Waning'}</span>
          <span>{isWaxing ? '→' : '←'}</span>
          <span className="text-amber-500">●</span>
        </div>
      </div>
    </div>
  );
};

export default MoonPhaseVisual;

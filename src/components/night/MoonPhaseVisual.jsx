/**
 * MoonPhaseVisual Component
 * 
 * Beautiful moon phase visualization using clean SVG rendering.
 * Displays accurate moon phase appearance based on SunCalc.org data.
 * 
 * Features:
 * - Clean SVG moon phase rendering
 * - Accurate phase based on SunCalc data
 * - Atmospheric glow effects
 * - Illumination percentage display
 * - Days to full/new moon countdown
 * - No external dependencies
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.moonPhase - Moon phase data from SunCalc
 * @param {number} props.moonPhase.illumination - Decimal illumination (0-1)
 * @param {number} props.moonPhase.illuminationPct - Percentage illumination (0-100)
 * @param {number} props.moonPhase.phase - Phase value (0-1)
 * @param {string} props.moonPhase.name - Moon phase name
 * @param {number} props.moonPhase.daysToFull - Days until full moon
 * @param {number} props.moonPhase.daysToNew - Days until new moon
 */
const MoonPhaseVisual = ({ moonPhase }) => {
  if (!moonPhase) return null;

  const { illumination, illuminationPct, phase, name, daysToFull, daysToNew } = moonPhase;
  
  // Calculate the illuminated portion of the moon
  const getIlluminatedPath = () => {
    const radius = 48;
    const cx = 50;
    const cy = 50;
    
    // Full moon - complete circle
    if (illumination >= 0.99) {
      return `M ${cx},${cy - radius} A ${radius},${radius} 0 1,1 ${cx},${cy + radius} A ${radius},${radius} 0 1,1 ${cx},${cy - radius} Z`;
    }
    
    // New moon - no illumination
    if (illumination <= 0.01) {
      return '';
    }
    
    // Calculate ellipse for terminator based on phase
    const phaseAngle = phase * 2 * Math.PI;
    const ellipseRx = Math.abs(Math.cos(phaseAngle)) * radius;
    
    // Determine if waxing (0 to 0.5) or waning (0.5 to 1)
    const isWaxing = phase < 0.5;
    
    if (isWaxing) {
      // Waxing moon - illuminated on the right
      if (phase < 0.25) {
        // New to first quarter - waxing crescent
        return `M ${cx},${cy - radius} A ${radius},${radius} 0 0,1 ${cx},${cy + radius} A ${ellipseRx},${radius} 0 0,0 ${cx},${cy - radius} Z`;
      } else {
        // First quarter to full - waxing gibbous
        return `M ${cx},${cy - radius} A ${radius},${radius} 0 0,1 ${cx},${cy + radius} A ${ellipseRx},${radius} 0 0,1 ${cx},${cy - radius} Z`;
      }
    } else {
      // Waning moon - illuminated on the left
      if (phase < 0.75) {
        // Full to last quarter - waning gibbous
        return `M ${cx},${cy - radius} A ${radius},${radius} 0 0,0 ${cx},${cy + radius} A ${ellipseRx},${radius} 0 0,1 ${cx},${cy - radius} Z`;
      } else {
        // Last quarter to new - waning crescent
        return `M ${cx},${cy - radius} A ${radius},${radius} 0 0,0 ${cx},${cy + radius} A ${ellipseRx},${radius} 0 0,0 ${cx},${cy - radius} Z`;
      }
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Moon visualization with atmospheric glow */}
      <div className="relative mb-4">
        {/* Outer glow effect - intensity based on moon illumination */}
        <div 
          className="absolute inset-0 rounded-full blur-2xl opacity-50"
          style={{
            background: `radial-gradient(circle, rgba(255, 255, 255, ${illumination * 0.3}) 0%, transparent 70%)`,
            transform: 'scale(1.5)'
          }}
        />
        
        {/* Moon SVG */}
        <svg
          width="192"
          height="192"
          viewBox="0 0 100 100"
          className="relative z-10"
        >
          <defs>
            {/* Gradient for the dark side of the moon */}
            <radialGradient id="moonDark" cx="50%" cy="50%" r="50%">
              <stop offset="0%" style={{ stopColor: '#3a3a3a', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#1a1a1a', stopOpacity: 1 }} />
            </radialGradient>
            
            {/* Gradient for the illuminated side */}
            <radialGradient id="moonLight" cx="40%" cy="40%" r="60%">
              <stop offset="0%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#f5f5f5', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#e0e0e0', stopOpacity: 1 }} />
            </radialGradient>
            
            {/* Subtle glow around the moon */}
            <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
              <stop offset="80%" style={{ stopColor: 'transparent', stopOpacity: 0 }} />
              <stop offset="100%" style={{ stopColor: '#ffffff', stopOpacity: 0.2 }} />
            </radialGradient>
          </defs>
          
          {/* Dark side of the moon (full circle) */}
          <circle cx="50" cy="50" r="48" fill="url(#moonDark)" />
          
          {/* Illuminated portion */}
          <path d={getIlluminatedPath()} fill="url(#moonLight)" />
          
          {/* Outer glow */}
          <circle cx="50" cy="50" r="49" fill="url(#moonGlow)" />
        </svg>
      </div>
      
      {/* Phase Info */}
      <div className="text-center space-y-2">
        <div className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-yellow-500 dark:from-amber-400 dark:to-yellow-300 bg-clip-text text-transparent">
          {name}
        </div>
        <div className="text-lg font-semibold text-gray-700 dark:text-slate-200">
          {illuminationPct}% Illuminated
        </div>
        <div className="text-sm text-gray-600 dark:text-slate-300">
          {daysToFull < daysToNew
            ? `${daysToFull} ${daysToFull === 1 ? 'day' : 'days'} until full moon`
            : `${daysToNew} ${daysToNew === 1 ? 'day' : 'days'} until new moon`}
        </div>
        <div className="mt-3 text-xs text-gray-500 dark:text-slate-400">
          Powered by SunCalc.org
        </div>
      </div>
    </div>
  );
};

export default MoonPhaseVisual;

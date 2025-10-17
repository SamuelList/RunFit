import { motion } from 'framer-motion';
import { Moon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import MoonPhaseVisual from './MoonPhaseVisual';
import VisibilityMetrics from './VisibilityMetrics';

/**
 * NightRunningCard Component
 * 
 * Comprehensive night running conditions display with moon phase visualization,
 * effective visibility calculations, and route recommendations. Provides runners
 * with detailed information about natural moonlight, sky clarity, and atmospheric
 * conditions affecting nighttime visibility.
 * 
 * Features:
 * - Moon phase visualization with SVG rendering
 * - Effective visibility calculation (moon × sky clarity × fog factor)
 * - Color-coded visibility assessment
 * - Route recommendations based on conditions
 * - Safety gear recommendations
 * - Smart positioning (top card for excellent visibility)
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.moonPhase - Moon phase data
 * @param {number} props.moonPhase.illuminationPct - Moon illumination percentage (0-100)
 * @param {number} props.moonPhase.illumination - Moon illumination decimal (0-1)
 * @param {string} props.moonPhase.name - Phase name (e.g., "Full Moon", "Waxing Gibbous")
 * @param {string} props.moonPhase.emoji - Moon phase emoji
 * @param {number} props.moonPhase.phase - Phase value (0-1)
 * @param {boolean} props.moonPhase.isWaxing - Whether moon is waxing
 * @param {number} props.moonPhase.daysToFull - Days until full moon
 * @param {number} props.moonPhase.daysToNew - Days until new moon
 * @param {Object} props.wx - Weather data
 * @param {number} props.wx.cloud - Cloud cover percentage
 * @param {number} props.wx.humidity - Humidity percentage
 * @param {number} props.wx.temperature - Current temperature
 * @param {boolean} props.wx.isDay - Whether it's daytime
 * @param {number} props.dewPoint - Dew point temperature
 * @param {boolean} [props.smartNightCard] - Smart positioning mode
 * @param {Object} [props.cardVariants] - Framer Motion animation variants
 * 
 * @example
 * <NightRunningCard
 *   moonPhase={{
 *     illuminationPct: 85,
 *     name: "Waxing Gibbous",
 *     emoji: "🌔"
 *   }}
 *   wx={{ cloud: 20, humidity: 65, temperature: 52, isDay: false }}
 *   dewPoint={45}
 * />
 */
const NightRunningCard = ({ 
  moonPhase, 
  wx, 
  dewPoint, 
  smartNightCard = false,
  cardVariants 
}) => {
  if (!moonPhase) return null;

  // Calculate effective visibility
  const moonLight = moonPhase.illuminationPct;
  const skyClarity = 100 - (wx?.cloud || 0);
  const humidity = wx?.humidity || 0;
  const tempDewDiff = Math.abs((wx?.temperature || 0) - (dewPoint || 0));
  const isFoggy = humidity > 85 && tempDewDiff < 5;
  const fogFactor = isFoggy ? 0.3 : humidity > 90 && tempDewDiff < 8 ? 0.6 : 1.0;
  const effectiveVis = Math.round((moonLight * skyClarity / 100) * fogFactor);
  
  // Check if it's nighttime
  const isNightTime = wx?.isDay === false;
  
  // Smart positioning logic
  const showAtTop = smartNightCard && isNightTime && effectiveVis > 75;
  const showAtBottom = !smartNightCard;
  
  // Don't render if smart mode is on but conditions aren't met
  if (smartNightCard && (!isNightTime || effectiveVis <= 75)) {
    return null;
  }
  
  // Don't render at all if conditions don't warrant showing
  if (!showAtTop && !showAtBottom) {
    return null;
  }

  /**
   * Gets visibility assessment data based on effective visibility percentage
   */
  const getVisibilityAssessment = () => {
    if (effectiveVis >= 70) {
      return {
        level: 'exceptional',
        title: '🌟 Exceptional Night Visibility',
        description: `Excellent natural moonlight (${effectiveVis}%). Trails and unlit paths are safe. Headlamp for shadows.`,
        borderColor: 'border-emerald-300 dark:border-emerald-500/50',
        bgColor: 'bg-emerald-50/50 dark:bg-emerald-500/10',
        iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
        iconText: 'text-emerald-700 dark:text-emerald-300',
        textColor: 'text-emerald-900 dark:text-emerald-100',
        routes: [
          { icon: '✓', color: 'text-green-500', text: 'Trails & unlit paths safe' },
          { icon: '✓', color: 'text-green-500', text: 'Parks & open spaces' }
        ]
      };
    } else if (effectiveVis >= 50) {
      return {
        level: 'good',
        title: '✅ Good Natural Light',
        description: `Good visibility (${effectiveVis}%). ${skyClarity < 70 ? 'Clouds reducing moonlight. ' : ''}Familiar routes clearly visible. Headlamp needed for dark spots.`,
        borderColor: 'border-green-300 dark:border-green-500/50',
        bgColor: 'bg-green-50/50 dark:bg-green-500/10',
        iconBg: 'bg-green-100 dark:bg-green-500/20',
        iconText: 'text-green-700 dark:text-green-300',
        textColor: 'text-green-900 dark:text-green-100',
        routes: [
          { icon: '✓', color: 'text-green-500', text: 'Familiar trails with headlamp' },
          { icon: '✓', color: 'text-green-500', text: 'Neighborhood loops ideal' }
        ]
      };
    } else if (effectiveVis >= 30) {
      return {
        level: 'moderate',
        title: '⚠️ Moderate Darkness',
        description: `Moderate darkness (${effectiveVis}%). ${isFoggy ? 'Fog reducing visibility. ' : humidity > 90 && tempDewDiff < 8 ? 'Haze blocking moonlight. ' : skyClarity < 40 ? 'Cloud cover blocking moon. ' : ''}Headlamp required. Stick to known routes, avoid technical trails.`,
        borderColor: 'border-yellow-300 dark:border-yellow-500/50',
        bgColor: 'bg-yellow-50/50 dark:bg-yellow-500/10',
        iconBg: 'bg-yellow-100 dark:bg-yellow-500/20',
        iconText: 'text-yellow-700 dark:text-yellow-300',
        textColor: 'text-yellow-900 dark:text-yellow-100',
        routes: [
          { icon: '✓', color: 'text-green-500', text: 'Well-known routes only' },
          { icon: '✗', color: 'text-red-500', text: 'Avoid trails & technical terrain' }
        ]
      };
    } else if (effectiveVis >= 15) {
      return {
        level: 'low',
        title: '🔦 Low Visibility',
        description: `Low visibility (${effectiveVis}%). ${isFoggy ? 'Fog + limited moon. ' : skyClarity < 30 ? 'Heavy overcast. ' : ''}Strong headlamp essential. High-vis clothing mandatory. Well-lit paths or very familiar routes only.`,
        borderColor: 'border-orange-300 dark:border-orange-500/50',
        bgColor: 'bg-orange-50/50 dark:bg-orange-500/10',
        iconBg: 'bg-orange-100 dark:bg-orange-500/20',
        iconText: 'text-orange-700 dark:text-orange-300',
        textColor: 'text-orange-900 dark:text-orange-100',
        routes: [
          { icon: '!', color: 'text-yellow-500', text: 'Lit paths only, short loops' },
          { icon: '✗', color: 'text-red-500', text: 'No trails or parks' }
        ]
      };
    } else {
      return {
        level: 'poor',
        title: '🚨 Very Poor Visibility',
        description: `Very poor visibility (${effectiveVis}%). ${isFoggy ? 'Dense fog + ' : ''}${skyClarity < 20 ? 'complete cloud cover + ' : ''}minimal moonlight = near-total darkness. Powerful headlamp (300+ lumens) + reflective gear required. Lit paths only. Consider treadmill or daylight run.`,
        borderColor: 'border-red-300 dark:border-red-500/50',
        bgColor: 'bg-red-50/50 dark:bg-red-500/10',
        iconBg: 'bg-red-100 dark:bg-red-500/20',
        iconText: 'text-red-700 dark:text-red-300',
        textColor: 'text-red-900 dark:text-red-100',
        routes: [
          { icon: '✗', color: 'text-red-500', text: 'Avoid unlit areas' },
          { icon: '!', color: 'text-yellow-500', text: 'Well-lit main streets only' },
          { icon: '→', color: 'text-blue-500', text: 'Consider treadmill or daylight' }
        ]
      };
    }
  };

  const assessment = getVisibilityAssessment();

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
    >
      <Card className="mt-6 overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-blue-500/10 dark:from-indigo-500/20 dark:via-purple-500/20 dark:to-blue-500/20">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500">
                <Moon className="h-4 w-4 text-white" />
              </div>
              Night Running Conditions
            </span>
            <span className="text-sm font-normal text-gray-600 dark:text-slate-400">
              {moonPhase.name}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: Moon Visualization & Metrics */}
            <div className="space-y-6">
              <MoonPhaseVisual moonPhase={moonPhase} />
              <VisibilityMetrics 
                moonPhase={moonPhase}
                wx={wx}
                effectiveVis={effectiveVis}
                skyClarity={skyClarity}
                dewPoint={dewPoint}
              />
            </div>

            {/* Right: Running Guidance */}
            <div className="space-y-4">
              {/* Visibility Assessment */}
              <div className={`rounded-xl border-2 p-5 ${assessment.borderColor} ${assessment.bgColor}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${assessment.iconBg} ${assessment.iconText}`}>
                    <Moon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-bold mb-2 ${assessment.textColor}`}>
                      {assessment.title}
                    </div>
                    <p className="text-sm leading-relaxed text-gray-700 dark:text-slate-200">
                      {assessment.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Route Recommendations */}
              <div className="rounded-xl border border-gray-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/40 p-4">
                <div className="text-sm font-semibold text-gray-800 dark:text-slate-100 mb-3">
                  Recommended Routes
                </div>
                <div className="space-y-2 text-sm">
                  {assessment.routes.map((route, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className={`${route.color} mt-0.5`}>{route.icon}</span>
                      <span className="text-gray-700 dark:text-slate-200">{route.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default NightRunningCard;

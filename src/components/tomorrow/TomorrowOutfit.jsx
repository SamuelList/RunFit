import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';

/**
 * TomorrowOutfit Component
 * 
 * Displays recommended outfit for tomorrow's run with weather conditions and score.
 * Simplified version that shows key info in a compact format.
 * 
 * @param {Object} props
 * @param {Object} props.wx - Current weather data with hourly forecast
 * @param {number} props.tomorrowRunHour - Hour of tomorrow's planned run (0-23)
 * @param {string} props.tomorrowCardRunType - Type of run ('easy', 'workout', 'longRun')
 * @param {Function} props.setTomorrowCardRunType - Callback to change run type
 * @param {Function} props.setTomorrowRunType - Callback to sync main run type
 * @param {Function} props.outfitFor - Function to calculate outfit recommendation
 * @param {Function} props.computeScoreBreakdown - Function to compute performance score
 * @param {Function} props.getDisplayedScore - Function to adjust score by boldness
 * @param {Function} props.scoreLabel - Function to get score label
 * @param {Function} props.scoreBasedTone - Function to get score styling
 * @param {boolean} props.coldHands - User preference for hand sensitivity
 * @param {string} props.gender - User gender for outfit recommendations
 * @param {number} props.runnerBoldness - User boldness setting
 * @param {number} props.tempSensitivity - User temperature sensitivity
 * @param {string} props.unit - Temperature unit ('F' or 'C')
 * @param {Object} props.cardVariants - Framer Motion animation variants
 * @returns {JSX.Element|null}
 */
const TomorrowOutfit = ({
  wx,
  tomorrowRunHour,
  tomorrowCardRunType,
  setTomorrowCardRunType,
  setTomorrowRunType,
  outfitFor,
  computeScoreBreakdown,
  getDisplayedScore,
  scoreLabel,
  scoreBasedTone,
  coldHands,
  gender,
  runnerBoldness,
  tempSensitivity,
  unit,
  cardVariants
}) => {
  const tomorrowData = useMemo(() => {
    if (!wx?.hourlyForecast?.length) return null;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(tomorrowRunHour, 0, 0, 0);
    
    const targetTime = tomorrow.getTime();
    
    // Find slots for the selected hour, hour before, and hour after
    const findClosestSlot = (targetOffset) => {
      const searchTime = targetTime + targetOffset * 60 * 60 * 1000;
      return wx.hourlyForecast
        .map(slot => ({
          slot,
          time: typeof slot.time === 'number' ? slot.time : Date.parse(slot.time)
        }))
        .filter(({ time }) => Math.abs(time - searchTime) <= 90 * 60 * 1000)
        .sort((a, b) => Math.abs(a.time - searchTime) - Math.abs(b.time - searchTime))[0]?.slot;
    };
    
    const hourBefore = findClosestSlot(-1);
    const mainHour = findClosestSlot(0);
    const hourAfter = findClosestSlot(1);
    
    if (!mainHour) return null;
    
    // Average weather values from available slots
    const slots = [hourBefore, mainHour, hourAfter].filter(Boolean);
    const toF = (v) => (unit === "F" ? v : (v * 9) / 5 + 32);
    
    const avgApparent = slots.reduce((sum, s) => sum + toF(s.apparent), 0) / slots.length;
    const avgTemp = slots.reduce((sum, s) => sum + toF(s.temperature), 0) / slots.length;
    const avgWind = slots.reduce((sum, s) => sum + (typeof s.wind === 'number' ? s.wind : wx.wind), 0) / slots.length;
    const avgHumidity = slots.reduce((sum, s) => sum + (typeof s.humidity === 'number' ? s.humidity : wx.humidity), 0) / slots.length;
    const avgPrecipProb = slots.reduce((sum, s) => sum + (typeof s.precipProb === 'number' ? s.precipProb : 0), 0) / slots.length;
    const avgPrecip = slots.reduce((sum, s) => sum + (typeof s.precip === 'number' ? s.precip : 0), 0) / slots.length;
    const avgUv = slots.reduce((sum, s) => sum + (typeof s.uv === 'number' ? s.uv : 0), 0) / slots.length;
    const avgPressure = slots.reduce((sum, s) => sum + (typeof s.pressure === 'number' ? s.pressure : wx.pressure), 0) / slots.length;
    const avgSolarRadiation = slots.reduce((sum, s) => sum + (typeof s.solarRadiation === 'number' ? s.solarRadiation : 0), 0) / slots.length;
    
    const outfit = outfitFor(
      {
        apparentF: avgApparent,
        humidity: avgHumidity,
        windMph: avgWind,
        precipProb: avgPrecipProb,
        precipIn: avgPrecip,
        uvIndex: avgUv,
        isDay: true
      },
      tomorrowCardRunType === 'workout',
      coldHands,
      gender,
      tomorrowCardRunType === 'longRun',
      wx.hourlyForecast || [],
      tempSensitivity
    );
    
    const breakdown = computeScoreBreakdown(
      {
        tempF: avgTemp,
        apparentF: avgApparent,
        humidity: avgHumidity,
        windMph: avgWind,
        precipProb: avgPrecipProb,
        precipIn: avgPrecip,
        uvIndex: avgUv,
        cloudCover: wx.cloud || 50,
        pressure: avgPressure,
        solarRadiation: avgSolarRadiation,
      },
      tomorrowCardRunType === 'workout',
      coldHands,
      outfit.handsLevel,
      tomorrowCardRunType === 'longRun'
    );
    
    const score = breakdown.score;
    const displayScore = getDisplayedScore(score, runnerBoldness);
    const label = scoreLabel(displayScore);
    const tone = scoreBasedTone(displayScore);
    const displayTemp = unit === "F" ? Math.round(avgApparent) : Math.round((avgApparent - 32) * 5 / 9);
    const items = outfit.optionA || [];
    
    return {
      tomorrow,
      displayScore,
      tone,
      displayTemp,
      items
    };
  }, [wx, tomorrowRunHour, tomorrowCardRunType, outfitFor, computeScoreBreakdown, getDisplayedScore, scoreLabel, scoreBasedTone, coldHands, gender, runnerBoldness, tempSensitivity, unit]);

  if (!tomorrowData) return null;

  const { tomorrow, displayScore, tone, displayTemp, items } = tomorrowData;

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      className="mt-6"
    >
      <Card className="border-slate-200 dark:border-slate-700">
        <CardHeader className="bg-slate-50 dark:bg-slate-900/50">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <span className="text-slate-700 dark:text-slate-200">Tomorrow's Run</span>
            </span>
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              {tomorrow.toLocaleDateString([], { weekday: 'short' })} @ {tomorrowRunHour === 0 ? '12 AM' : tomorrowRunHour < 12 ? `${tomorrowRunHour} AM` : tomorrowRunHour === 12 ? '12 PM' : `${tomorrowRunHour - 12} PM`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-4">
            {/* Run Type Selector */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setTomorrowCardRunType('easy');
                  setTomorrowRunType('easy');
                }}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tomorrowCardRunType === 'easy'
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                Easy
              </button>
              <button
                onClick={() => {
                  setTomorrowCardRunType('workout');
                  setTomorrowRunType('workout');
                }}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tomorrowCardRunType === 'workout'
                    ? 'bg-orange-600 text-white dark:bg-orange-500'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                Workout
              </button>
              <button
                onClick={() => {
                  setTomorrowCardRunType('longRun');
                  setTomorrowRunType('longRun');
                }}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  tomorrowCardRunType === 'longRun'
                    ? 'bg-purple-600 text-white dark:bg-purple-500'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                Long
              </button>
            </div>
            
            {/* Condensed Weather & Outfit Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Weather */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Conditions</div>
                    <div className="mt-0.5 text-xl font-bold text-slate-900 dark:text-slate-100">{displayTemp}°{unit}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={tone.textStyle}>{displayScore}</div>
                  </div>
                </div>
              </div>

              {/* Outfit */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Gear ({items.length})</div>
                <div className="space-y-1">
                  {items.slice(0, 4).map((item) => (
                    <div key={item.key} className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-700 dark:text-slate-300">{item.label}</span>
                    </div>
                  ))}
                  {items.length > 4 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">+{items.length - 4} more</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TomorrowOutfit;

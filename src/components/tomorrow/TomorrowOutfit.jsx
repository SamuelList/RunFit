import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, UserRound } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { GEAR_INFO, GEAR_ICONS } from '../../utils/gearData';
import { calculateSolarElevation } from '../../utils/solar';
import { calculateMRT } from '../../utils/mrt';
import { calculateUTCI } from '../../utils/utci';
import { getUTCIScoreBreakdown } from '../../utils/utciScore';

/**
 * TomorrowOutfit Component
 * 
 * Displays recommended outfit for tomorrow's run with weather conditions and score.
 * Two variants: 'prominent' (large evening card) and 'compact' (smaller bottom card).
 * 
 * @param {Object} props
 * @param {Object} props.wx - Current weather data with hourly forecast
 * @param {number} props.tomorrowRunHour - Hour of tomorrow's planned run (0-23)
 * @param {string} props.tomorrowCardRunType - Type of run ('easy', 'workout', 'longRun')
 * @param {string} props.tomorrowCardOption - Outfit option ('A' or 'B')
 * @param {Function} props.setTomorrowCardRunType - Callback to change run type
 * @param {Function} props.setTomorrowRunType - Callback to sync main run type
 * @param {Function} props.setTomorrowCardOption - Callback to change outfit option
 * @param {Function} props.setShowTimePickerModal - Callback to show time picker
 * @param {Function} props.outfitFor - Function to calculate outfit recommendation
 * @param {Function} props.getDisplayedScore - Function to adjust score by boldness
 * @param {Function} props.scoreLabel - Function to get score label
 * @param {Function} props.scoreBasedTone - Function to get score styling
 * @param {boolean} props.coldHands - User preference for hand sensitivity
 * @param {string} props.gender - User gender for outfit recommendations
 * @param {number} props.runnerBoldness - User boldness setting
 * @param {number} props.tempSensitivity - User temperature sensitivity
 * @param {string} props.unit - Temperature unit ('F' or 'C')
 * @param {string} props.variant - Display variant ('prominent' or 'compact')
 * @param {Object} props.cardVariants - Framer Motion animation variants
 * @returns {JSX.Element|null}
 */
const TomorrowOutfit = ({
  wx,
  tomorrowRunHour,
  tomorrowCardRunType,
  tomorrowCardOption,
  setTomorrowCardRunType,
  setTomorrowRunType,
  setTomorrowCardOption,
  setShowTimePickerModal,
  outfitFor,
  getDisplayedScore,
  scoreLabel,
  scoreBasedTone,
  coldHands,
  gender,
  runnerBoldness,
  tempSensitivity,
  unit,
  variant = 'compact',
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
    
    // Calculate UTCI-based score for tomorrow's conditions
    // (targetTime already declared above)
    
    // Calculate solar elevation for tomorrow's run time
    const solarElevation = wx.place?.lat != null && wx.place?.lon != null
      ? calculateSolarElevation({
          latitude: wx.place.lat,
          longitude: wx.place.lon,
          timestamp: targetTime,
        })
      : 0;
    
    // Calculate Mean Radiant Temperature
    const mrtData = calculateMRT({
      tempF: avgTemp,
      humidity: avgHumidity,
      solarRadiation: avgSolarRadiation,
      solarElevation: solarElevation ?? 0,
      cloudCover: wx.cloud || 50,
      windMph: avgWind
    });
    
    // Calculate UTCI
    const utciData = calculateUTCI({
      tempF: avgTemp,
      humidity: avgHumidity,
      windMph: avgWind,
      mrt: mrtData?.mrt || avgTemp,
      precipRate: avgPrecip || 0
    });
    
    // Get UTCI-based score breakdown
    const breakdown = utciData ? getUTCIScoreBreakdown(utciData, avgPrecip || 0) : {
      score: 50,
      label: 'Unknown',
      useWBGT: false,
      parts: [],
      result: null,
      total: 100,
      dominantKeys: []
    };
    
    const score = breakdown.score;
    const displayScore = getDisplayedScore(score, runnerBoldness);
    const label = scoreLabel(displayScore);
    const tone = scoreBasedTone(displayScore);
    const displayTemp = unit === "F" ? Math.round(avgApparent) : Math.round((avgApparent - 32) * 5 / 9);
    const items = variant === 'prominent' 
      ? (tomorrowCardOption === 'A' ? (outfit.optionA || []) : (outfit.optionB || []))
      : (outfit.optionA || []);
    
    return {
      tomorrow,
      displayScore,
      label,
      tone,
      displayTemp,
      items
    };
  }, [wx, tomorrowRunHour, tomorrowCardRunType, tomorrowCardOption, outfitFor, getDisplayedScore, scoreLabel, scoreBasedTone, coldHands, gender, runnerBoldness, tempSensitivity, unit, variant]);

  if (!tomorrowData) return null;

  const { tomorrow, displayScore, label, tone, displayTemp, items } = tomorrowData;

  // Prominent Evening Version - Large full-featured card
  if (variant === 'prominent') {
    return (
      <motion.div
        variants={cardVariants}
        initial="initial"
        animate="animate"
        className="mb-6"
      >
        <Card className={`overflow-hidden border-2 shadow-xl ${
          gender === "Female"
            ? "border-pink-300 dark:border-pink-500 bg-gradient-to-br from-pink-50 via-pink-50/50 to-pink-100/70 dark:from-pink-900/50 dark:via-pink-900/30 dark:to-pink-900/50"
            : "border-sky-400 dark:border-sky-600 bg-gradient-to-br from-sky-100 via-blue-50 to-sky-100 dark:from-sky-900/70 dark:via-blue-900/50 dark:to-sky-900/70"
        }`}>
          <CardHeader className={`pb-8 ${
            gender === "Female"
              ? "bg-gradient-to-r from-pink-500 to-pink-600 dark:from-pink-600 dark:to-pink-700"
              : "bg-gradient-to-r from-sky-600 to-blue-700 dark:from-sky-700 dark:to-blue-800"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/30 backdrop-blur-sm ring-2 ring-white/40">
                  <Calendar className="h-7 w-7 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">Tomorrow's Run</div>
                  <div className={`text-sm ${
                    gender === "Female"
                      ? "text-pink-100"
                      : "text-sky-100"
                  }`}>Lay out your gear tonight</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className={`text-xs font-medium ${
                    gender === "Female"
                      ? "text-pink-100"
                      : "text-sky-100"
                  }`}>
                    {tomorrow.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {tomorrowRunHour === 0 ? '12:00 AM' : tomorrowRunHour < 12 ? `${tomorrowRunHour}:00 AM` : tomorrowRunHour === 12 ? '12:00 PM' : `${tomorrowRunHour - 12}:00 PM`}
                  </div>
                </div>
                <motion.button
                  onClick={() => setShowTimePickerModal(true)}
                  className="rounded-lg bg-white/20 p-2 text-white hover:bg-white/30 transition-colors backdrop-blur-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Change run time"
                >
                  <Clock className="h-4 w-4" />
                </motion.button>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => { setTomorrowCardRunType('easy'); setTomorrowRunType('easy'); }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  tomorrowCardRunType === 'easy'
                    ? 'bg-white text-pink-600 shadow-sm dark:bg-white/95 dark:text-pink-700'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                Easy
              </button>
              <button
                onClick={() => { setTomorrowCardRunType('workout'); setTomorrowRunType('workout'); }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  tomorrowCardRunType === 'workout'
                    ? 'bg-white text-pink-600 shadow-sm dark:bg-white/95 dark:text-pink-700'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                Workout
              </button>
              <button
                onClick={() => { setTomorrowCardRunType('longRun'); setTomorrowRunType('longRun'); }}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  tomorrowCardRunType === 'longRun'
                    ? 'bg-white text-pink-600 shadow-sm dark:bg-white/95 dark:text-pink-700'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                Long Run
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Score display */}
              <div className="flex items-center justify-between rounded-xl bg-white/70 dark:bg-slate-800/50 p-4">
                <div>
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Run Score</div>
                  <div className="text-3xl font-extrabold mt-1" style={tone.textStyle}>{Math.max(1, Math.round(displayScore / 10))}</div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{label.text}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-400">Feels Like</div>
                  <div className="text-2xl font-bold text-slate-700 dark:text-slate-200 mt-1">{displayTemp}°{unit}</div>
                </div>
              </div>
            
            {/* Outfit items */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">Tomorrow's Outfit</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => setTomorrowCardOption('A')}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      tomorrowCardOption === 'A'
                        ? 'bg-sky-500 text-white dark:bg-sky-600'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Option A
                  </button>
                  <button
                    onClick={() => setTomorrowCardOption('B')}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      tomorrowCardOption === 'B'
                        ? 'bg-sky-500 text-white dark:bg-sky-600'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                    }`}
                  >
                    Option B
                  </button>
                </div>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {items.map((item) => {
                  const gearInfo = GEAR_INFO[item.key];
                  const Icon = GEAR_ICONS[item.key] || UserRound;
                  return (
                    <div
                      key={item.key}
                      className={`flex items-center gap-3 rounded-lg border p-3 ${
                        item.workout
                          ? 'border-orange-300 bg-orange-50/50 dark:border-orange-500/50 dark:bg-orange-500/10'
                          : item.longRun
                          ? 'border-purple-300 bg-purple-50/50 dark:border-purple-500/50 dark:bg-purple-500/10'
                          : 'border-slate-200 bg-white/50 dark:border-slate-700 dark:bg-slate-800/50'
                      }`}
                    >
                      {gearInfo?.image ? (
                        <img src={gearInfo.image} alt={item.label} className="h-10 w-10 flex-shrink-0 object-cover rounded-lg" />
                      ) : (
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-700">
                          <Icon className="h-5 w-5 text-gray-600 dark:text-slate-300" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-800 dark:text-slate-100">{item.label}</div>
                        {item.detail && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">{item.detail}</div>
                        )}
                        {item.workout && (
                          <div className="text-xs text-orange-600 dark:text-orange-400">Workout-specific</div>
                        )}
                        {item.longRun && (
                          <div className="text-xs text-purple-600 dark:text-purple-400">Long run essential</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Compact Bottom Version - Smaller card for non-evening display
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
                    <div className="text-2xl font-bold" style={tone.textStyle}>{Math.max(1, Math.round(displayScore / 10))}</div>
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

import React from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Droplets, Wind, CloudRain, Sun, Cloud, CloudFog, Sunrise, Info } from 'lucide-react';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { round1 } from '../../utils/helpers';

/**
 * Performance Score Component
 * 
 * Displays the run performance score with a radial gauge and detailed weather metrics.
 * 
 * @param {Object} props
 * @param {Object} props.displayedScoreProps - Score display properties (score, label, tone)
 * @param {Array} props.gaugeData - Data for the radial chart
 * @param {Function} props.setShowInsights - Function to show insights modal
 * @param {Object} props.wx - Weather data
 * @param {Object} props.derived - Derived weather calculations
 * @param {string} props.unit - Temperature unit ('F' or 'C')
 * @param {Object} props.staggerContainer - Framer motion stagger container variants
 * @param {Object} props.listItemVariants - Framer motion list item variants
 * @param {Object} props.cardVariants - Framer motion card variants
 */
const PerformanceScore = ({
  displayedScoreProps,
  gaugeData,
  setShowInsights,
  wx,
  derived,
  unit,
  staggerContainer,
  listItemVariants,
  cardVariants
}) => {
  return (
    <motion.div variants={cardVariants}>
      <Card className="relative lg:col-start-2">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl font-bold">Performance Score</CardTitle>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {displayedScoreProps ? displayedScoreProps.label.tone : "Loading conditions..."}
              </p>
            </div>
            {displayedScoreProps && (
              <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium`} style={displayedScoreProps.tone.badgeStyle}>
                {displayedScoreProps.label.text}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Gauge */}
          <div className="relative flex items-center justify-center">
            <RadialBarChart width={240} height={240} cx={120} cy={120} innerRadius={80} outerRadius={105} barSize={20} data={gaugeData} startAngle={225} endAngle={-45}>
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar minAngle={15} background dataKey="value" clockWise cornerRadius={20} />
            </RadialBarChart>
            <div className="pointer-events-none absolute text-center">
              <div className="text-6xl font-extrabold" style={displayedScoreProps?.tone?.textStyle}>
                {displayedScoreProps ? displayedScoreProps.score : "--"}
              </div>
              <div className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">out of 100</div>
            </div>
          </div>

          {/* View Insights Button */}
          <motion.button
            onClick={() => setShowInsights(true)}
            className="w-full rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50/60 dark:bg-sky-500/10 px-4 py-3 text-sm font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-100/80 dark:hover:bg-sky-500/20 transition-colors flex items-center justify-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Info className="h-4 w-4" />
            View Score Insights
          </motion.button>

          {/* Weather Details Grid */}
          <motion.div 
            className="grid grid-cols-2 gap-2.5"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* Temperature / Feels Like */}
            <motion.div 
              className="flex items-center gap-2.5 rounded-xl border border-gray-200/40 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-3"
              variants={listItemVariants}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100/80 dark:bg-sky-500/20">
                <Thermometer className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-gray-600 dark:text-slate-400">Temp / Feels</div>
                <div className="text-sm font-bold text-gray-700 dark:text-slate-100">
                  {wx && Number.isFinite(derived?.tempDisplay) && Number.isFinite(derived?.displayApparent) 
                    ? `${Math.round(derived.tempDisplay)}° / ${Math.round(derived.displayApparent)}°${unit}${derived.manualOn ? ' *' : ''}` 
                    : "--"}
                </div>
              </div>
            </motion.div>

            {/* Dew Point */}
            <motion.div 
              className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-3"
              variants={listItemVariants}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/20">
                <Droplets className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-gray-500 dark:text-slate-400">Dew Point</div>
                <div className="text-sm font-bold text-gray-800 dark:text-slate-100">
                  {wx && Number.isFinite(derived?.dewPointDisplay) ? `${round1(derived.dewPointDisplay)}°${unit}` : "--"}
                </div>
              </div>
            </motion.div>

            {/* WBGT (conditional) */}
            {derived?.effectiveTempLabel === "WBGT" && (
              <motion.div 
                className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-3"
                variants={listItemVariants}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-500/20">
                  <Thermometer className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-500 dark:text-slate-400">WBGT</div>
                  <div className="text-sm font-bold text-gray-800 dark:text-slate-100">
                    {wx && Number.isFinite(derived?.effectiveTempDisplay) ? `${round1(derived.effectiveTempDisplay)}°${unit}` : "--"}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Humidity */}
            <motion.div 
              className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-3"
              variants={listItemVariants}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/20">
                <Droplets className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-gray-500 dark:text-slate-400">Humidity</div>
                <div className="text-sm font-bold text-gray-800 dark:text-slate-100">
                  {wx ? `${round1(wx.humidity)}%` : "--"}
                </div>
              </div>
            </motion.div>

            {/* Wind */}
            <motion.div 
              className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-3"
              variants={listItemVariants}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/20">
                <Wind className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-gray-500 dark:text-slate-400">Wind</div>
                <div className="text-sm font-bold text-gray-800 dark:text-slate-100">
                  {wx ? `${round1(wx.wind)} mph` : "--"}
                </div>
              </div>
            </motion.div>

            {/* Precipitation */}
            <motion.div 
              className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-3"
              variants={listItemVariants}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/20">
                <CloudRain className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-gray-500 dark:text-slate-400">Precip</div>
                <div className="text-sm font-bold text-gray-800 dark:text-slate-100">
                  {wx ? `${round1(wx.precipProb)}%` : "--"}
                </div>
              </div>
            </motion.div>

            {/* UV Index */}
            <motion.div 
              className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-3"
              variants={listItemVariants}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/20">
                <Sun className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-gray-500 dark:text-slate-400">UV Index</div>
                <div className="text-sm font-bold text-gray-800 dark:text-slate-100">
                  {wx ? round1(wx.uv) : "--"}
                </div>
              </div>
            </motion.div>

            {/* Solar Elevation (conditional - only when sun is above horizon) */}
            {derived?.solarElevation != null && derived.solarElevation > 0 && (
              <motion.div 
                className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-3"
                variants={listItemVariants}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20">
                  <Sunrise className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-500 dark:text-slate-400">Solar Angle</div>
                  <div className="text-sm font-bold text-gray-800 dark:text-slate-100">
                    {round1(derived.solarElevation)}°
                  </div>
                </div>
              </motion.div>
            )}

            {/* Cloud Cover */}
            <motion.div 
              className="flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-3"
              variants={listItemVariants}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/20">
                <Cloud className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-gray-500 dark:text-slate-400">Cloud Cover</div>
                <div className="text-sm font-bold text-gray-800 dark:text-slate-100">
                  {wx ? `${round1(wx.cloud)}%` : "--"}
                </div>
              </div>
            </motion.div>

            {/* Fog Detection (conditional) */}
            {wx && (wx.humidity > 90 && Math.abs(wx.temperature - (derived?.dewPointDisplay || 0)) < 3) && (
              <motion.div 
                className="flex items-center gap-2.5 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-3"
                variants={listItemVariants}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20">
                  <CloudFog className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-amber-600 dark:text-amber-400">Fog Detected</div>
                  <div className="text-sm font-bold text-amber-800 dark:text-amber-200">
                    Low Visibility
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PerformanceScore;

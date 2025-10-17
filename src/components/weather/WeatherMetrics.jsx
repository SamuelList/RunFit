import React from "react";
import { motion } from "framer-motion";
import { Thermometer, Droplets, Wind, CloudRain, Sun, Cloud, CloudFog } from "lucide-react";

/**
 * WeatherMetrics Component
 * 
 * Displays a grid of weather metric cards including:
 * - Temperature / Feels Like
 * - Dew Point
 * - WBGT (conditional)
 * - Humidity
 * - Wind Speed
 * - Precipitation Probability
 * - UV Index
 * - Cloud Cover
 * - Fog Alert (conditional)
 * 
 * @param {Object} props
 * @param {Object} props.wx - Current weather data
 * @param {Object} props.derived - Derived weather calculations
 * @param {string} props.unit - Temperature unit (F/C)
 * @param {Object} props.listItemVariants - Framer Motion animation variants
 * @param {Object} props.staggerContainer - Framer Motion stagger container variants
 * @param {Function} props.round1 - Function to round to 1 decimal place
 */
const WeatherMetrics = ({ wx, derived, unit, listItemVariants, staggerContainer, round1 }) => {
  return (
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

      {/* Fog Alert (conditional) */}
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
  );
};

export default WeatherMetrics;

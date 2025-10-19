import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Thermometer, Droplets, Wind, CloudRain, Sun, Cloud, CloudFog, Sunrise, Info, X } from 'lucide-react';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import WeatherGauge from '../weather/WeatherGauge';
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
  const [showWBGTModal, setShowWBGTModal] = useState(false);
  const [showFeelsLikeModal, setShowFeelsLikeModal] = useState(false);
  const [showUTCIModal, setShowUTCIModal] = useState(false);

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
          <WeatherGauge
            gaugeData={gaugeData}
            displayedScoreProps={displayedScoreProps}
            setShowInsights={setShowInsights}
          />

          {/* Weather Details Grid */}
          <motion.div 
            className="grid grid-cols-2 gap-2.5"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* Feels Like */}
            <motion.div 
              className="flex items-center gap-2.5 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 p-3 cursor-pointer"
              variants={listItemVariants}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
              onClick={() => setShowFeelsLikeModal(true)}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-500/20">
                <Thermometer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-blue-600 dark:text-blue-400">Feels Like</div>
                <div className="text-sm font-bold text-blue-800 dark:text-blue-200">
                  {wx && Number.isFinite(derived?.displayApparent) 
                    ? `${Math.round(derived.displayApparent)}°${unit}${derived.manualOn ? ' *' : ''}` 
                    : "--"}
                </div>
              </div>
              <Info className="h-4 w-4 text-blue-400 dark:text-blue-500 opacity-60" />
            </motion.div>

            {/* WBGT (Wet Bulb Globe Temperature) */}
            {derived?.wbgt != null && (
              <motion.div 
                className="flex items-center gap-2.5 rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50/60 dark:bg-orange-500/10 p-3 cursor-pointer"
                variants={listItemVariants}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                onClick={() => setShowWBGTModal(true)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-500/20">
                  <Thermometer className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-orange-600 dark:text-orange-400">WBGT</div>
                  <div className="text-sm font-bold text-orange-800 dark:text-orange-200">
                    {round1(derived.wbgt)}°{unit}
                  </div>
                </div>
                <Info className="h-4 w-4 text-orange-400 dark:text-orange-500 opacity-60" />
              </motion.div>
            )}

            {/* UTCI (Universal Thermal Climate Index) */}
            {derived?.utci != null && (
              <motion.div 
                className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer ${
                  derived.utciCategory?.impact === 'extreme' || derived.utciCategory?.impact === 'very_high'
                    ? 'border-red-200 dark:border-red-500/30 bg-red-50/60 dark:bg-red-500/10'
                    : derived.utciCategory?.impact === 'high'
                    ? 'border-orange-200 dark:border-orange-500/30 bg-orange-50/60 dark:bg-orange-500/10'
                    : derived.utciCategory?.impact === 'moderate'
                    ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10'
                    : derived.utciCategory?.impact === 'minimal'
                    ? 'border-green-200 dark:border-green-500/30 bg-green-50/60 dark:bg-green-500/10'
                    : 'border-sky-200 dark:border-sky-500/30 bg-sky-50/60 dark:bg-sky-500/10'
                }`}
                variants={listItemVariants}
                whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                onClick={() => setShowUTCIModal(true)}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  derived.utciCategory?.impact === 'extreme' || derived.utciCategory?.impact === 'very_high'
                    ? 'bg-red-100 dark:bg-red-500/20'
                    : derived.utciCategory?.impact === 'high'
                    ? 'bg-orange-100 dark:bg-orange-500/20'
                    : derived.utciCategory?.impact === 'moderate'
                    ? 'bg-amber-100 dark:bg-amber-500/20'
                    : derived.utciCategory?.impact === 'minimal'
                    ? 'bg-green-100 dark:bg-green-500/20'
                    : 'bg-sky-100 dark:bg-sky-500/20'
                }`}>
                  <Thermometer className={`h-5 w-5 ${
                    derived.utciCategory?.impact === 'extreme' || derived.utciCategory?.impact === 'very_high'
                      ? 'text-red-600 dark:text-red-400'
                      : derived.utciCategory?.impact === 'high'
                      ? 'text-orange-600 dark:text-orange-400'
                      : derived.utciCategory?.impact === 'moderate'
                      ? 'text-amber-600 dark:text-amber-400'
                      : derived.utciCategory?.impact === 'minimal'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-sky-600 dark:text-sky-400'
                  }`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-xs ${
                    derived.utciCategory?.impact === 'extreme' || derived.utciCategory?.impact === 'very_high'
                      ? 'text-red-600 dark:text-red-400'
                      : derived.utciCategory?.impact === 'high'
                      ? 'text-orange-600 dark:text-orange-400'
                      : derived.utciCategory?.impact === 'moderate'
                      ? 'text-amber-600 dark:text-amber-400'
                      : derived.utciCategory?.impact === 'minimal'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-sky-600 dark:text-sky-400'
                  }`}>
                    UTCI
                  </div>
                  <div className={`text-sm font-bold ${
                    derived.utciCategory?.impact === 'extreme' || derived.utciCategory?.impact === 'very_high'
                      ? 'text-red-800 dark:text-red-200'
                      : derived.utciCategory?.impact === 'high'
                      ? 'text-orange-800 dark:text-orange-200'
                      : derived.utciCategory?.impact === 'moderate'
                      ? 'text-amber-800 dark:text-amber-200'
                      : derived.utciCategory?.impact === 'minimal'
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-sky-800 dark:text-sky-200'
                  }`}>
                    {round1(derived.utci)}°{unit}
                  </div>
                </div>
                <Info className={`h-4 w-4 opacity-60 ${
                  derived.utciCategory?.impact === 'extreme' || derived.utciCategory?.impact === 'very_high'
                    ? 'text-red-400 dark:text-red-500'
                    : derived.utciCategory?.impact === 'high'
                    ? 'text-orange-400 dark:text-orange-500'
                    : derived.utciCategory?.impact === 'moderate'
                    ? 'text-amber-400 dark:text-amber-500'
                    : derived.utciCategory?.impact === 'minimal'
                    ? 'text-green-400 dark:text-green-500'
                    : 'text-sky-400 dark:text-sky-500'
                }`} />
              </motion.div>
            )}

            {/* Temperature */}
            <motion.div 
              className="flex items-center gap-2.5 rounded-xl border border-gray-200/40 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-3"
              variants={listItemVariants}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100/80 dark:bg-sky-500/20">
                <Thermometer className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-gray-600 dark:text-slate-400">Temperature</div>
                <div className="text-sm font-bold text-gray-700 dark:text-slate-100">
                  {wx && Number.isFinite(derived?.tempDisplay) 
                    ? `${Math.round(derived.tempDisplay)}°${unit}` 
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

      {/* WBGT Details Modal */}
      <AnimatePresence>
        {showWBGTModal && derived?.wbgt != null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowWBGTModal(false)}
          >
            <motion.div
              className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowWBGTModal(false)}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-slate-400" />
              </button>

              {/* Header */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-500/20">
                    <Thermometer className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">WBGT</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Wet Bulb Globe Temperature</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {round1(derived.wbgt)}°{unit}
                </div>
              </div>

              {/* Weather components */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                    <Thermometer className="h-4 w-4" />
                    <span className="text-sm">Air Temperature</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {wx && Number.isFinite(derived.tempDisplay) ? `${round1(derived.tempDisplay)}°${unit}` : "--"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                    <Droplets className="h-4 w-4" />
                    <span className="text-sm">Humidity</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {wx ? `${round1(wx.humidity)}%` : "--"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                    <Wind className="h-4 w-4" />
                    <span className="text-sm">Wind Speed</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {wx ? `${round1(wx.wind)} mph` : "--"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                    <Sun className="h-4 w-4" />
                    <span className="text-sm">Solar Radiation</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {wx && wx.solarRadiation != null ? `${round1(wx.solarRadiation)} W/m²` : "--"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                    <Cloud className="h-4 w-4" />
                    <span className="text-sm">Cloud Cover</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {wx ? `${round1(wx.cloud)}%` : "--"}
                  </span>
                </div>
              </div>

              {/* Info note */}
              <div className="mt-4 p-3 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30">
                <p className="text-xs text-orange-800 dark:text-orange-200">
                  WBGT (Wet Bulb Globe Temperature) combines air temperature and humidity, then adjusts for solar radiation (heat gain), wind (cooling), and cloud cover. Used to assess heat stress during outdoor activities.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}  
      </AnimatePresence>

      {/* Feels Like Details Modal */}
      <AnimatePresence>
        {showFeelsLikeModal && derived?.displayApparent != null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFeelsLikeModal(false)}
          >
            <motion.div
              className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowFeelsLikeModal(false)}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-slate-400" />
              </button>

              {/* Header */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-500/20">
                    <Thermometer className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Feels Like</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Apparent Temperature</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {Math.round(derived.displayApparent)}°{unit}{derived.manualOn ? ' *' : ''}
                </div>
              </div>

              {/* Weather components */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                    <Thermometer className="h-4 w-4" />
                    <span className="text-sm">Air Temperature</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {wx && Number.isFinite(derived.tempDisplay) ? `${Math.round(derived.tempDisplay)}°${unit}` : "--"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                    <Droplets className="h-4 w-4" />
                    <span className="text-sm">Humidity</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {wx ? `${round1(wx.humidity)}%` : "--"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                    <Wind className="h-4 w-4" />
                    <span className="text-sm">Wind Speed</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {wx ? `${round1(wx.wind)} mph` : "--"}
                  </span>
                </div>
              </div>

              {/* Info note */}
              <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  {derived.manualOn 
                    ? "* Using custom temperature override. Feels Like uses wind chill (cold) or heat index (hot) formulas based on temperature, humidity, and wind speed."
                    : "Feels Like (Apparent Temperature) combines temperature with humidity and wind speed. Cold temps use wind chill formula, hot temps use heat index formula."}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}  
      </AnimatePresence>

      {/* UTCI Details Modal */}
      <AnimatePresence>
        {showUTCIModal && derived?.utci != null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowUTCIModal(false)}
          >
            <motion.div
              className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowUTCIModal(false)}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-slate-400" />
              </button>

              {/* Header */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    derived.utciCategory?.impact === 'extreme' || derived.utciCategory?.impact === 'very_high'
                      ? 'bg-red-100 dark:bg-red-500/20'
                      : derived.utciCategory?.impact === 'high'
                      ? 'bg-orange-100 dark:bg-orange-500/20'
                      : derived.utciCategory?.impact === 'moderate'
                      ? 'bg-amber-100 dark:bg-amber-500/20'
                      : derived.utciCategory?.impact === 'minimal'
                      ? 'bg-green-100 dark:bg-green-500/20'
                      : 'bg-sky-100 dark:bg-sky-500/20'
                  }`}>
                    <Thermometer className={`h-6 w-6 ${
                      derived.utciCategory?.impact === 'extreme' || derived.utciCategory?.impact === 'very_high'
                        ? 'text-red-600 dark:text-red-400'
                        : derived.utciCategory?.impact === 'high'
                        ? 'text-orange-600 dark:text-orange-400'
                        : derived.utciCategory?.impact === 'moderate'
                        ? 'text-amber-600 dark:text-amber-400'
                        : derived.utciCategory?.impact === 'minimal'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-sky-600 dark:text-sky-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">UTCI</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Universal Thermal Climate Index</p>
                  </div>
                </div>
                <div className={`text-3xl font-bold ${
                  derived.utciCategory?.impact === 'extreme' || derived.utciCategory?.impact === 'very_high'
                    ? 'text-red-600 dark:text-red-400'
                    : derived.utciCategory?.impact === 'high'
                    ? 'text-orange-600 dark:text-orange-400'
                    : derived.utciCategory?.impact === 'moderate'
                    ? 'text-amber-600 dark:text-amber-400'
                    : derived.utciCategory?.impact === 'minimal'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-sky-600 dark:text-sky-400'
                }`}>
                  {round1(derived.utci)}°{unit}
                </div>
                {derived.utciCategory?.label && (
                  <p className={`text-sm mt-1 font-medium ${
                    derived.utciCategory?.impact === 'extreme' || derived.utciCategory?.impact === 'very_high'
                      ? 'text-red-700 dark:text-red-300'
                      : derived.utciCategory?.impact === 'high'
                      ? 'text-orange-700 dark:text-orange-300'
                      : derived.utciCategory?.impact === 'moderate'
                      ? 'text-amber-700 dark:text-amber-300'
                      : derived.utciCategory?.impact === 'minimal'
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-sky-700 dark:text-sky-300'
                  }`}>
                    {derived.utciCategory.label}
                  </p>
                )}
              </div>

              {/* Weather components */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                    <Thermometer className="h-4 w-4" />
                    <span className="text-sm">Air Temperature</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {wx && Number.isFinite(derived.tempDisplay) ? `${round1(derived.tempDisplay)}°${unit}` : "--"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                    <Droplets className="h-4 w-4" />
                    <span className="text-sm">Humidity</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {wx ? `${round1(wx.humidity)}%` : "--"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                    <Wind className="h-4 w-4" />
                    <span className="text-sm">Wind Speed</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {wx ? `${round1(wx.wind)} mph` : "--"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                    <Sun className="h-4 w-4" />
                    <span className="text-sm">Mean Radiant Temp</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {derived?.mrt != null ? `${round1(unit === 'F' ? derived.mrt : (derived.mrt - 32) * 5 / 9)}°${unit}` : "--"}
                  </span>
                </div>

                {derived?.utciRainAdjustment != null && derived.utciRainAdjustment !== 0 && (
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                      <CloudRain className="h-4 w-4" />
                      <span className="text-sm">Rain Adjustment</span>
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {round1(derived.utciRainAdjustment)}°{unit}
                    </span>
                  </div>
                )}
              </div>

              {/* Info note */}
              <div className={`mt-4 p-3 rounded-lg border ${
                derived.utciCategory?.impact === 'extreme' || derived.utciCategory?.impact === 'very_high'
                  ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
                  : derived.utciCategory?.impact === 'high'
                  ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30'
                  : derived.utciCategory?.impact === 'moderate'
                  ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
                  : derived.utciCategory?.impact === 'minimal'
                  ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30'
                  : 'bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/30'
              }`}>
                <p className={`text-xs ${
                  derived.utciCategory?.impact === 'extreme' || derived.utciCategory?.impact === 'very_high'
                    ? 'text-red-800 dark:text-red-200'
                    : derived.utciCategory?.impact === 'high'
                    ? 'text-orange-800 dark:text-orange-200'
                    : derived.utciCategory?.impact === 'moderate'
                    ? 'text-amber-800 dark:text-amber-200'
                    : derived.utciCategory?.impact === 'minimal'
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-sky-800 dark:text-sky-200'
                }`}>
                  UTCI combines air temperature, humidity, wind, and radiant heat (from sun/surfaces) to provide a comprehensive thermal comfort assessment. Rain cooling effects are applied when precipitation is present.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}  
      </AnimatePresence>
    </motion.div>
  );
};

export default PerformanceScore;
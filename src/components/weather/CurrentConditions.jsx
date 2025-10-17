import React from "react";
import { motion } from "framer-motion";
import { MapPin, Gauge, RefreshCw, Info, Sunrise as SunriseIcon, Sunset as SunsetIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, SegmentedControl } from "../ui";

/**
 * CurrentConditions Component
 * 
 * Displays the main weather controls including:
 * - Location display with tap-to-refresh
 * - Current condition badge with hover tooltip
 * - Score display button
 * - Twilight info (sunrise/sunset)
 * - Run type selector (Easy/Workout/Long)
 * 
 * @param {Object} props
 * @param {Object} props.place - Location object with lat/lon
 * @param {boolean} props.loading - Loading state
 * @param {string} props.formattedPlaceName - Formatted location name
 * @param {boolean} props.debugActive - Debug mode active flag
 * @param {Object} props.derived - Derived weather data
 * @param {Object} props.condition - Current running condition assessment
 * @param {string} props.gender - User's gender for theming (Female/Male)
 * @param {Object} props.displayedScoreProps - Score display properties
 * @param {string} props.error - Error message if any
 * @param {string} props.runType - Current run type (easy/workout/long)
 * @param {string} props.activeOption - Active run type option
 * @param {Function} props.setShowInsights - Function to show insights modal
 * @param {Function} props.setRunType - Function to set run type
 * @param {Function} props.setActiveOption - Function to set active option
 * @param {Function} props.handleLocationRefresh - Function to refresh location
 * @param {Object} props.cardVariants - Framer Motion card animation variants
 */
const CurrentConditions = ({
  place,
  loading,
  formattedPlaceName,
  debugActive,
  derived,
  condition,
  gender,
  displayedScoreProps,
  error,
  runType,
  activeOption,
  setShowInsights,
  setRunType,
  setActiveOption,
  handleLocationRefresh,
  cardVariants
}) => {
  return (
    <motion.div variants={cardVariants}>
      <Card>
        <CardHeader className={`bg-gradient-to-br ${gender === "Female" ? "from-pink-500 to-pink-600" : "from-sky-500 to-blue-600"} text-white`}>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gauge className="h-5 w-5" />
            Run Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Section: Location & Score */}
            <div className="space-y-4 lg:col-span-2">
              {/* Location Display */}
              <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-gradient-to-br from-white/60 to-white/40 dark:from-slate-900/60 dark:to-slate-900/40 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-5 w-5 flex-shrink-0 text-gray-600 dark:text-slate-300" />
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-200 truncate">
                      {place ? formattedPlaceName : "Loading..."}
                    </span>
                    {debugActive && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 flex-shrink-0">
                        DEBUG
                      </span>
                    )}
                  </div>
                  <motion.button
                    onClick={handleLocationRefresh}
                    disabled={loading}
                    className="flex-shrink-0 ml-2 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-50"
                    whileHover={{ rotate: 180 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  </motion.button>
                </div>
              </div>

              {/* Condition Badge */}
              {derived && condition && (
                <motion.div
                  className="group relative cursor-help rounded-xl border border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 p-4"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl"
                      style={{
                        background: `linear-gradient(135deg, ${condition.tone?.bgStart || "#fff"}, ${condition.tone?.bgEnd || "#fff"})`
                      }}
                    >
                      {condition.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-bold text-gray-800 dark:text-slate-100">
                        {condition.label}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-slate-400">
                        Current Conditions
                      </div>
                    </div>
                  </div>
                  {/* Hover Tooltip */}
                  <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full opacity-0 transition-all group-hover:opacity-100 group-hover:-translate-y-full z-50">
                    <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-4 py-3 shadow-xl max-w-xs">
                      <div className="text-sm font-semibold text-gray-800 dark:text-slate-100 mb-1">
                        {condition.performance}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-slate-300">
                        {condition.action}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Score Display Button */}
              {displayedScoreProps && (
                <motion.button
                  onClick={() => setShowInsights(true)}
                  className="w-full group relative overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800 bg-gradient-to-br from-white/60 to-white/40 dark:from-slate-900/60 dark:to-slate-900/40 p-4"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <div className="text-xs text-gray-600 dark:text-slate-400 mb-1">
                        Current Score
                      </div>
                      <div className="text-4xl font-extrabold" style={displayedScoreProps.tone?.textStyle}>
                        {displayedScoreProps.score}
                      </div>
                      <div className="text-xs font-medium text-gray-500 dark:text-slate-400">
                        {displayedScoreProps.label}
                      </div>
                    </div>
                    <div className="text-gray-400 dark:text-slate-500">
                      <Info className="h-6 w-6" />
                    </div>
                  </div>
                </motion.button>
              )}

              {/* Twilight Info */}
              {derived?.twilight && (
                <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <SunriseIcon className="h-4 w-4 text-orange-500" />
                      <div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">Sunrise</div>
                        <div className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                          {derived.twilight.sunrise}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <SunsetIcon className="h-4 w-4 text-orange-500" />
                      <div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">Sunset</div>
                        <div className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                          {derived.twilight.sunset}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Section: Preferences */}
            <div className={`rounded-xl border border-gray-200 dark:border-slate-800 bg-gradient-to-br ${gender === "Female" ? "from-pink-50/80 to-pink-100/60 dark:from-pink-950/20 dark:to-pink-900/10" : "from-sky-50/80 to-blue-100/60 dark:from-sky-950/20 dark:to-blue-900/10"} p-4`}>
              <div className="mb-3">
                <div className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-1">
                  Run Type
                </div>
                <div className="text-xs text-gray-600 dark:text-slate-400">
                  Select your planned workout
                </div>
              </div>
              <SegmentedControl
                options={[
                  { value: "easy", label: "Easy Run" },
                  { value: "workout", label: "Hard Workout" },
                  { value: "long", label: "Long Run" }
                ]}
                value={activeOption}
                onChange={(val) => {
                  setRunType(val);
                  setActiveOption(val);
                }}
                gender={gender}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CurrentConditions;

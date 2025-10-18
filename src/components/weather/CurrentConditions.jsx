import React from "react";
import { motion } from "framer-motion";
import { MapPin, Gauge, Sunrise as SunriseIcon, Sunset as SunsetIcon } from "lucide-react";
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
 * @param {string} props.runType - Current run type (easy/workout/longRun)
 * @param {Function} props.setShowInsights - Function to show insights modal
 * @param {Function} props.setRunType - Function to set run type
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
  setShowInsights,
  onOpenHourBreakdown,
  setRunType,
  handleLocationRefresh,
  cardVariants
}) => {
  return (
    <motion.div variants={cardVariants}>
      <Card className="overflow-hidden">
        <CardHeader className={`bg-gradient-to-br py-3 ${
          gender === "Female"
            ? "from-pink-400/10 via-pink-500/10 to-pink-400/10 dark:from-pink-400/20 dark:via-pink-500/20 dark:to-pink-400/20"
            : "from-sky-500/10 via-blue-500/10 to-indigo-500/10 dark:from-sky-500/20 dark:via-blue-500/20 dark:to-indigo-500/20"
        }`}>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${
                gender === "Female"
                  ? "from-pink-400 to-pink-500 dark:from-pink-400 dark:to-pink-500"
                  : "from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500"
              }`}>
                <Gauge className="h-4 w-4 text-white" />
              </div>
              Run Controls
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-slate-800">
            
            {/* Location & Score Section */}
            <div className="p-5 lg:col-span-2">
              <div className="flex flex-wrap items-start gap-3 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Location</span>
                  </div>
                  <motion.button
                    onClick={handleLocationRefresh}
                    disabled={loading}
                    className="font-semibold text-lg text-gray-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left group"
                    title={`${place?.name} — Tap to refresh weather`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {formattedPlaceName || "Loading…"}
                      <svg className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </span>
                  </motion.button>
                  {debugActive && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Debug scenario
                    </span>
                  )}
                </div>
                
                {/* Condition Badge with Performance Details */}
                {derived && condition && (
                  <motion.div
                    className="group relative inline-block"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                  >
                    <span 
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-normal sm:whitespace-nowrap shrink-0 cursor-help ${condition.badgeClass}`}
                      title="Hover for performance details"
                    >
                      {condition.text}
                    </span>
                    
                    {/* Tooltip with performance and action details */}
                    {condition.performance && condition.action && (
                      <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity absolute z-50 left-0 top-full mt-2 w-80 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-xl">
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                              Performance Impact
                            </div>
                            <div className="text-sm text-gray-700 dark:text-slate-300">
                              {condition.performance}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                              Recommended Actions
                            </div>
                            <div className="text-sm text-gray-700 dark:text-slate-300">
                              {condition.action}
                            </div>
                          </div>
                        </div>
                        {/* Tooltip arrow */}
                        <div className="absolute -top-1 left-4 h-2 w-2 rotate-45 border-l border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Score & Twilight Row */}
              {derived && (
                <div className="flex flex-wrap items-center gap-3">
                  <motion.button 
                    onClick={() => {
                      if (typeof onOpenHourBreakdown === 'function') onOpenHourBreakdown();
                      else setShowInsights(true);
                    }}
                    className="flex items-center gap-2 rounded-xl border border-gray-200/60 dark:border-slate-700 bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800/60 dark:to-slate-900/60 px-4 py-3 shadow-sm hover:border-sky-300 dark:hover:border-sky-600 transition-colors cursor-pointer"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    title="Click to view Run Score Breakdown"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Score</span>
                      <span
  className="text-3xl font-extrabold"
  style={displayedScoreProps?.tone?.textStyle}
>
  {displayedScoreProps
    ? Math.max(1, Math.round(displayedScoreProps.score / 10))
    : '--'}
</span>

                    </div>
                  </motion.button>
                  
                  {derived.twilight && (
                    <motion.div 
                      className="flex items-center gap-2 rounded-xl border border-gray-200/60 dark:border-slate-700 bg-white/80 dark:bg-slate-800/60 px-4 py-3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-500/20 dark:to-orange-500/20">
                        {derived.twilight.icon === "sunset" ? (
                          <SunsetIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <SunriseIcon className="h-5 w-5 text-sky-500 dark:text-sky-400" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{derived.twilight.label}</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-bold text-gray-900 dark:text-slate-100">{derived.twilight.in}</span>
                          <span className="text-xs text-slate-400">({derived.twilight.at})</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Preferences Section */}
            <div className="p-5 bg-gradient-to-br from-gray-50/50 to-white dark:from-slate-900/50 dark:to-slate-900">
              <div className="space-y-3">
                <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-3">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-slate-400">Run Type</div>
                  <SegmentedControl
                    value={runType}
                    onChange={setRunType}
                    options={[
                      { label: "Easy Run", value: "easy" },
                      { label: "Hard Workout", value: "workout" },
                      { label: "Long Run", value: "longRun" },
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {error && (
            <motion.div 
              className="border-t border-gray-200 dark:border-slate-800 bg-red-50 dark:bg-red-500/10 px-5 py-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CurrentConditions;

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Cloud, Thermometer } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { scoreLabel, scoreBasedTone } from '../../utils/scoring';
import { FORECAST_ALERT_META } from '../../utils/constants';

/**
 * ForecastCard - Displays 6-hour weather forecast with scores and alerts
 * 
 * @param {Object} props
 * @param {Object} props.derived - Derived weather data with forecast array
 * @param {Function} props.getDisplayedScore - Function to adjust score based on runner boldness
 * @param {number} props.runnerBoldness - Runner confidence level adjustment
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
export function ForecastCard({ derived, getDisplayedScore, runnerBoldness, className = "" }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 dark:from-violet-600 dark:to-purple-700">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            6-hour outlook
          </span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Next 6 hours</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!derived ? (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-20 w-full animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/40" />
            ))}
          </div>
        ) : derived.forecast.length ? (
          <div className="space-y-2.5">
            {derived.forecast.slice(0, 6).map((slot, idx) => {
              const isNow = idx === 0;
              // Visual display values (adjusted by runner boldness)
              const displaySlotScore = typeof slot.score === 'number' ? getDisplayedScore(slot.score, runnerBoldness) : slot.score;
              const displaySlotLabel = scoreLabel(displaySlotScore);
              const displaySlotTone = scoreBasedTone(displaySlotScore);

              return (
                <motion.button
                  key={slot.time}
                  onClick={() => {
                    if (typeof derived.onHourClick === 'function') {
                      derived.onHourClick(slot);
                    }
                  }}
                  className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg w-full text-left cursor-pointer ${
                    isNow 
                      ? 'border-violet-300/60 bg-gradient-to-br from-violet-50 via-purple-50/80 to-fuchsia-50/60 dark:border-violet-500/40 dark:from-violet-500/15 dark:via-purple-500/10 dark:to-fuchsia-500/5'
                      : 'border-gray-200/50 bg-white/80 dark:border-slate-700/60 dark:bg-slate-900/40 hover:border-violet-200 dark:hover:border-violet-500/30'
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Accent bar */}
                  <div 
                    className="absolute left-0 top-0 h-full w-1 transition-all duration-300 group-hover:w-1.5"
                    style={{ background: displaySlotTone.fillColor }}
                  />
                  
                  {/* Content */}
                  <div className="flex items-center gap-3 p-3 pl-4">
                    {/* Time and Score */}
                    <div className="flex min-w-[100px] flex-col">
                      <div className={`text-xs font-bold uppercase tracking-wider ${
                        isNow 
                          ? 'text-violet-600 dark:text-violet-400' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        {slot.timeLabel}
                      </div>
                      <div className="mt-0.5 flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold leading-none" style={displaySlotTone.textStyle}>
                          {displaySlotScore}
                        </span>
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">/ 100</span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-12 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent dark:via-slate-600" />

                    {/* Badge and Temp */}
                    <div className="flex flex-1 flex-col items-start gap-1.5">
                      <span 
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm" 
                        style={displaySlotTone.badgeStyle}
                      >
                        {displaySlotLabel.text}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Thermometer className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          {slot.apparentDisplay ?? "—"}
                        </span>
                      </div>
                    </div>

                    {/* Alerts */}
                    {slot.alerts?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {slot.alerts.map((alert, alertIdx) => {
                          const meta = FORECAST_ALERT_META[alert.type];
                          if (!meta) return null;
                          const Icon = meta.Icon;
                          return (
                            <div
                              key={`${slot.time}-${alert.type}-${alertIdx}`}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${meta.badgeClass}`}
                              title={alert.message}
                            >
                              <Icon className={`h-3 w-3 ${meta.iconClass}`} />
                              <span className="hidden sm:inline">{meta.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  {/* Hover glow effect */}
                  <div 
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background: `radial-gradient(circle at left center, ${displaySlotTone.fillColor}15 0%, transparent 70%)`
                    }}
                  />
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 dark:border-slate-700 dark:bg-slate-800/30">
            <Cloud className="h-10 w-10 text-slate-400 dark:text-slate-600" />
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">No forecast data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

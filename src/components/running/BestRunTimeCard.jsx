import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui';
import { scoreLabel, scoreBasedTone } from '../../utils/scoring';

/**
 * BestRunTimeCard - Displays optimal run times for today and tomorrow
 * 
 * @param {Object} props
 * @param {Object} props.derived - Derived weather data with bestRunTimes
 * @param {string} props.unit - Temperature unit ('F' or 'C')
 * @param {Function} props.getDisplayedScore - Function to adjust score based on runner boldness
 * @param {number} props.runnerBoldness - Runner confidence level adjustment
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element|null}
 */
export function BestRunTimeCard({ derived, unit, getDisplayedScore, runnerBoldness, className = "" }) {
  if (!derived?.bestRunTimes?.today && !derived?.bestRunTimes?.tomorrow) return null;
  
  const { today, tomorrow } = derived.bestRunTimes;
  
  const renderTimeSlot = (slot, dayLabel) => {
    const { time, score, apparentF, wind, precipProb, uv, isNow } = slot;
    const date = new Date(time);
    const timeStr = isNow ? 'Now' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    
    const displayTemp = unit === "F" ? Math.round(apparentF) : Math.round((apparentF - 32) * 5 / 9);
    // Visual display values (adjusted by boldness)
    const displayScore = typeof score === 'number' ? getDisplayedScore(score, runnerBoldness) : score;
    const label = scoreLabel(displayScore);
    const tone = scoreBasedTone(displayScore);
    
    const highlights = [];
    if (displayScore >= 80) highlights.push("Excellent conditions");
    else if (displayScore >= 65) highlights.push("Great conditions");
    else if (displayScore >= 50) highlights.push("Good conditions");
    else highlights.push("Best available window");
    
    if (precipProb < 20) highlights.push("low precip risk");
    if (wind < 10) highlights.push("calm winds");
    if (uv < 3) highlights.push("low UV");
    else if (uv >= 6) highlights.push("high UV - sunscreen recommended");
    
    const isToday = dayLabel === "Today";
    const bgClass = isToday
      ? "border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-green-50/60 dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-green-500/5"
      : "border-sky-200/60 bg-gradient-to-br from-sky-50/80 to-blue-50/60 dark:border-sky-500/30 dark:from-sky-500/10 dark:to-blue-500/5";
    
    const textClass = isToday
      ? "text-emerald-700 dark:text-emerald-300"
      : "text-sky-700 dark:text-sky-300";
      
    const mainTextClass = isToday
      ? "text-emerald-900 dark:text-emerald-100"
      : "text-sky-900 dark:text-sky-100";
      
    const badgeClass = isToday
      ? "border-emerald-200 bg-white/60 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
      : "border-sky-200 bg-white/60 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200";
    
    return (
      <div key={dayLabel} className={`rounded-2xl border p-4 ${bgClass}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className={`text-xs font-medium uppercase tracking-wide ${textClass}`}>
              {dayLabel}
            </div>
            <div className={`mt-1 text-3xl font-bold ${mainTextClass}`}>
              {timeStr}
            </div>
            <div className="mt-2 text-sm text-gray-700 dark:text-slate-300">
              {displayTemp}°{unit} feels like • {highlights[0]}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-4xl font-bold" style={tone.textStyle}>
              {Math.max(1, Math.round(displayScore / 10))}
            </div>
            {/* <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium" style={tone.badgeStyle}>
              {label.text}
            </span> */}
          </div>
        </div>
        {highlights.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {highlights.slice(1).map((highlight, idx) => (
              <span key={idx} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}>
                {highlight}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span>Best times to run</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {today && renderTimeSlot(today, "Today")}
        {tomorrow && renderTimeSlot(tomorrow, "Tomorrow")}
        {!today && !tomorrow && (
          <div className="rounded-lg border border-slate-200/60 bg-slate-50/60 p-3 text-center text-xs text-slate-600 dark:border-slate-700/60 dark:bg-slate-800/40 dark:text-slate-400">
            No optimal run times found for today or tomorrow
          </div>
        )}
      </CardContent>
    </Card>
  );
}

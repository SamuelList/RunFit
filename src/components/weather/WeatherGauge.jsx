import React from "react";
import { motion } from "framer-motion";
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { Info } from "lucide-react";

/**
 * WeatherGauge Component
 * 
 * Displays a semicircular radial gauge showing the running score (0-100)
 * with a centered score display and "View Score Insights" button.
 * 
 * @param {Object} props
 * @param {Array} props.gaugeData - Chart data array with value property
 * @param {Object} props.displayedScoreProps - Score display properties (score, tone, label)
 * @param {Function} props.setShowInsights - Function to show insights modal
 */
const WeatherGauge = ({ gaugeData, displayedScoreProps, setShowInsights }) => {
  return (
    <div className="space-y-4">
      {/* Score Gauge */}
      <div className="relative flex items-center justify-center">
        <RadialBarChart 
          width={240} 
          height={240} 
          cx={120} 
          cy={120} 
          innerRadius={80} 
          outerRadius={105} 
          barSize={20} 
          data={gaugeData} 
          startAngle={225} 
          endAngle={-45}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar minAngle={15} background dataKey="value" clockWise cornerRadius={20} />
        </RadialBarChart>
                <div className="pointer-events-none absolute text-center">
          <div className="text-6xl font-extrabold" style={displayedScoreProps?.tone?.textStyle}>
            {displayedScoreProps ? Math.max(1, Math.round(displayedScoreProps.score / 10)) : "--"}
          </div>
          <div className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">out of 10</div>
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
    </div>
  );
};

export default WeatherGauge;

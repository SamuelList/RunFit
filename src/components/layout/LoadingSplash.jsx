import React from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';

/**
 * LoadingSplash - Full-screen loading splash with progress bar
 * 
 * @param {Object} props
 * @param {boolean} props.isLoading - Whether splash should be visible
 * @param {number} props.progress - Loading progress (0-100)
 * @param {string} props.stage - Current loading stage message
 * @returns {JSX.Element|null}
 */
export function LoadingSplash({ isLoading, progress = 0, stage = 'Initializing...' }) {
  if (!isLoading) return null;

  // Determine stage category for visual feedback
  const isLocationStage = stage.toLowerCase().includes('location') || stage.toLowerCase().includes('gps') || stage.toLowerCase().includes('ip');
  const isWeatherStage = stage.toLowerCase().includes('weather') || stage.toLowerCase().includes('forecast') || stage.toLowerCase().includes('connecting');
  const isProcessingStage = stage.toLowerCase().includes('processing') || stage.toLowerCase().includes('calculating') || stage.toLowerCase().includes('building');
  const isCompleteStage = stage.toLowerCase().includes('ready') || stage.toLowerCase().includes('complete') || progress >= 100;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-1/2 -left-1/2 h-full w-full rounded-full bg-white/5"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 h-full w-full rounded-full bg-white/5"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        {/* Logo/Icon */}
        <motion.div
          className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-2xl"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: isCompleteStage ? 1.1 : 1, 
            opacity: 1,
            rotate: isProcessingStage ? [0, 360] : 0
          }}
          transition={{ 
            duration: 0.5, 
            ease: 'easeOut',
            rotate: { duration: 2, repeat: isProcessingStage ? Infinity : 0, ease: 'linear' }
          }}
        >
          <Activity 
            className="h-10 w-10 text-white" 
            strokeWidth={2.5}
          />
        </motion.div>

        {/* App Name */}
        <motion.div
          className="text-center"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-lg">
            SamsFitCast
          </h1>
          <p className="mt-2 text-lg text-white/90">
            Smart running weather insights
          </p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          className="w-64"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="relative h-2 overflow-hidden rounded-full bg-white/20 backdrop-blur-sm">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background: isCompleteStage 
                  ? 'linear-gradient(to right, #10b981, #34d399)' 
                  : 'linear-gradient(to right, #ffffff, #e0f2fe)'
              }}
              initial={{ width: '0%' }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
            {/* Animated shimmer effect */}
            {!isCompleteStage && progress < 100 && (
              <motion.div
                className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['0%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                style={{ width: '50%' }}
              />
            )}
          </div>
          
          {/* Progress Text */}
          <motion.p
            className="mt-3 text-center text-sm font-medium text-white/90"
            key={stage}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
          >
            {stage}
          </motion.p>
          
          {/* Stage-specific details */}
          <motion.p
            className="mt-1 text-center text-xs text-white/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {isLocationStage && 'Determining your position...'}
            {isWeatherStage && 'Loading current conditions & forecast...'}
            {isProcessingStage && 'Computing run conditions & gear...'}
            {isCompleteStage && 'All systems ready!'}
            {!isLocationStage && !isWeatherStage && !isProcessingStage && !isCompleteStage && 'Preparing your dashboard...'}
          </motion.p>
        </motion.div>

        {/* Percentage */}
        <motion.div
          className="text-2xl font-bold text-white/80"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: 1,
            scale: isCompleteStage ? [1, 1.2, 1] : 1
          }}
          transition={{ 
            duration: 0.5, 
            delay: 0.6,
            scale: { duration: 0.5 }
          }}
        >
          {Math.round(Math.min(progress, 100))}%
        </motion.div>
      </div>
    </motion.div>
  );
}

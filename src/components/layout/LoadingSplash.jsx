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
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <Activity className="h-10 w-10 text-white" strokeWidth={2.5} />
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
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-white to-sky-100"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
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
        </motion.div>

        {/* Percentage */}
        <motion.div
          className="text-2xl font-bold text-white/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          {Math.round(progress)}%
        </motion.div>
      </div>
    </motion.div>
  );
}

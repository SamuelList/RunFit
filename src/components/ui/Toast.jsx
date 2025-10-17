import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Toast - Animated notification toast
 * 
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the toast
 * @param {string} props.message - Message to display
 * @param {string} props.type - Toast type: 'success' | 'error' | 'info' | 'warning'
 * @returns {JSX.Element}
 */
export function Toast({ show, message, type = 'success' }) {
  const typeStyles = {
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
    info: 'bg-blue-500',
    warning: 'bg-amber-500',
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed left-1/2 z-50 -translate-x-1/2"
          style={{ top: 'max(env(safe-area-inset-top) + 1rem, 5rem)' }}
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        >
          <div className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-white shadow-lg backdrop-blur-sm ${typeStyles[type]}`}>
            {type === 'success' && (
              <motion.svg 
                className="h-5 w-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <motion.path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2.5} 
                  d="M5 13l4 4L19 7"
                />
              </motion.svg>
            )}
            <span className="text-sm font-semibold">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

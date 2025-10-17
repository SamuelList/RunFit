import React from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon } from 'lucide-react';
import { Button } from '../ui';

/**
 * Header - App header with branding and settings button
 * 
 * @param {Object} props
 * @param {Function} props.onSettingsClick - Callback when settings button is clicked
 * @param {Object} props.cardVariants - Framer Motion animation variants
 * @returns {JSX.Element}
 */
export function Header({ onSettingsClick, cardVariants }) {
  return (
    <motion.header 
      className="mb-6 flex items-start justify-between gap-4"
      variants={cardVariants}
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100">
          SamsFitCast
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">
          Smart outfit picks for your run, based on real‑feel weather.
        </p>
      </motion.div>
      <motion.div
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        transition={{ duration: 0.2 }}
      >
        <Button
          variant="ghost"
          className="h-12 w-12 rounded-full border border-transparent text-slate-500 shadow-sm hover:border-slate-200 hover:text-slate-700 hover:shadow dark:text-slate-300 dark:hover:border-slate-700"
          onClick={onSettingsClick}
          aria-label="Open settings"
        >
          <SettingsIcon className="h-6 w-6" />
        </Button>
      </motion.div>
    </motion.header>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import { Toast } from '../ui';

/**
 * AppShell - Main application wrapper with safe areas and responsive layout
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {string} props.pageThemeClass - Theme class name for background
 * @param {Object} props.pageVariants - Framer Motion animation variants for page
 * @param {boolean} props.showRefreshToast - Whether to show refresh success toast
 * @returns {JSX.Element}
 */
export function AppShell({ children, pageThemeClass, pageVariants, showRefreshToast }) {
  return (
    <div 
      className={`min-h-screen min-h-[100dvh] w-full transition-colors ${pageThemeClass}`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        height: '100%',
      }}
    >
      {/* Refresh success toast */}
      <Toast show={showRefreshToast} message="Weather Refreshed!" type="success" />
      
      <motion.div 
        className="mx-auto max-w-6xl px-6 py-8"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        {children}
      </motion.div>
    </div>
  );
}

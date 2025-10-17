import React from 'react';

/**
 * Card - Shared card component with modern styling
 * 
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Card content
 * @returns {JSX.Element}
 */
export const Card = ({ className = "", children }) => (
  <div className={`rounded-2xl bg-white/95 backdrop-blur-sm border border-gray-200/60 shadow-lg shadow-gray-200/50 dark:bg-slate-900/80 dark:border-slate-800 dark:shadow-2xl dark:shadow-slate-950/60 ${className}`}>
    {children}
  </div>
);

/**
 * CardHeader - Card header section with border
 */
export const CardHeader = ({ className = "", children }) => (
  <div className={`border-b border-gray-200/50 dark:border-slate-800 px-5 py-4 ${className}`}>
    {children}
  </div>
);

/**
 * CardTitle - Card title with typography styling
 */
export const CardTitle = ({ className = "", children }) => (
  <div className={`text-sm font-semibold tracking-tight text-gray-700 dark:text-slate-100 ${className}`}>
    {children}
  </div>
);

/**
 * CardContent - Card content area with padding
 */
export const CardContent = ({ className = "", children }) => (
  <div className={`p-4 text-gray-700 dark:text-slate-100 ${className}`}>
    {children}
  </div>
);

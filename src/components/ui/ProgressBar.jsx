import React from 'react';

/**
 * ProgressBar - Simple progress indicator
 * 
 * @param {Object} props
 * @param {number} props.pct - Percentage (0-100)
 * @returns {JSX.Element}
 */
export function ProgressBar({ pct }) {
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
      <div 
        className="h-2 rounded-full bg-pink-500" 
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} 
      />
    </div>
  );
}

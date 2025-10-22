import React from 'react';

/**
 * SegmentedControl - Tab-like segmented control for option selection
 * 
 * @param {Object} props
 * @param {Array<{value: string, label: string}>} props.options - Array of option objects
 * @param {string} props.value - Currently selected value
 * @param {Function} props.onChange - Callback when selection changes
 * @param {string} props.gender - User gender for active color ('Female' | 'Male')
 * @returns {JSX.Element}
 */
export const SegmentedControl = ({ options, value, onChange, gender, className = '', buttonClassName = '' }) => {
  // active color depends on gender for theming
  const activeColor = gender === "Female"
    ? "text-pink-700 dark:text-pink-300"
    : "text-sky-700 dark:text-sky-300";
  
  // Combine container classes with optional external className
  const containerBase = 'inline-flex items-center rounded-lg bg-gray-100 dark:bg-slate-800 p-1 flex-wrap gap-1 max-w-full';

  return (
    <div className={`${containerBase} ${className}`.trim()}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 sm:px-3 py-1 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
            value === opt.value
              ? `bg-white shadow-sm dark:bg-slate-700 ${activeColor}`
              : 'text-gray-600 hover:bg-gray-200/50 dark:text-slate-300 dark:hover:bg-slate-700/80'
          } ${buttonClassName}`.trim()}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

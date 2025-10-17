import React from 'react';

/**
 * Input - Form input component with gender-aware focus colors
 * 
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.gender - User gender for focus ring color ('Female' | 'Male')
 * @returns {JSX.Element}
 */
export const Input = ({ className = "", gender, ...props }) => {
  const focusRing = gender === "Female"
    ? "focus:ring-pink-400/50 dark:focus:ring-pink-500"
    : "focus:ring-sky-400/50 dark:focus:ring-sky-500";
    
  return (
    <input 
      className={`w-full rounded-lg border border-gray-300/60 dark:border-slate-700 bg-white/80 dark:bg-slate-900 px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 disabled:opacity-50 text-gray-700 dark:text-slate-100 ${focusRing} ${className}`} 
      {...props} 
    />
  );
};

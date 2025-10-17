import React from 'react';

/**
 * Button - Versatile button component with multiple variants and gender-aware theming
 * 
 * @param {Object} props
 * @param {string} props.variant - Button style variant: 'default' | 'secondary' | 'outline' | 'ghost'
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.gender - User gender for color theming ('Female' | 'Male')
 * @returns {JSX.Element}
 */
export const Button = ({ variant = "default", className = "", gender, ...props }) => {
  const getColors = () => {
    if (variant === "default") {
      return gender === "Female"
        ? "bg-pink-600 hover:bg-pink-500"
        : "bg-sky-600 hover:bg-sky-500";
    }
    if (variant === "secondary") {
      return gender === "Female"
        ? "text-pink-700 ring-pink-100 hover:bg-pink-50 dark:text-pink-300 dark:ring-slate-700"
        : "text-sky-700 ring-sky-100 hover:bg-sky-50 dark:text-sky-300 dark:ring-slate-700";
    }
    return "";
  };
  
  const variantStyles = {
    default: `inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold shadow transition-colors text-white disabled:opacity-50 ${getColors()}`,
    secondary: `inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium shadow-sm bg-white ring-1 disabled:opacity-50 dark:bg-slate-900 dark:hover:bg-slate-800 ${getColors()}`,
    outline: "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium shadow-sm border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 disabled:opacity-50 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800",
    ghost: "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800",
  };
  
  return <button className={`${variantStyles[variant]} ${className}`} {...props} />;
};

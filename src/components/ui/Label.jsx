import React from 'react';

/**
 * Label - Form label component
 * 
 * @param {Object} props
 * @param {string} props.htmlFor - Associated input ID
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Label text
 * @returns {JSX.Element}
 */
export const Label = ({ htmlFor, className = "", children }) => (
  <label 
    htmlFor={htmlFor} 
    className={`text-sm text-gray-500 dark:text-slate-300 ${className}`}
  >
    {children}
  </label>
);

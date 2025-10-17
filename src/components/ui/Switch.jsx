import React from 'react';

/**
 * Switch - Toggle switch component with gender-aware active color
 * 
 * @param {Object} props
 * @param {boolean} props.checked - Switch state
 * @param {Function} props.onCheckedChange - Callback when switch is toggled
 * @param {string} props.id - Switch element ID
 * @param {string} props.gender - User gender for active color ('Female' | 'Male')
 * @returns {JSX.Element}
 */
export const Switch = ({ checked, onCheckedChange, id, gender }) => {
  const activeColor = gender === "Female" ? "bg-pink-500" : "bg-sky-500";
  
  return (
    <button 
      id={id} 
      role="switch" 
      aria-checked={checked} 
      onClick={() => onCheckedChange(!checked)} 
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? activeColor : 'bg-gray-200 dark:bg-slate-700'}`}
    >
      <span 
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-1'}`} 
      />
    </button>
  );
};

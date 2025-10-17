import React from "react";

// Card components
export const Card = ({ className = "", children }) => (
  <div className={`rounded-2xl bg-white/95 backdrop-blur-sm border border-gray-200/60 shadow-lg shadow-gray-200/50 dark:bg-slate-900/80 dark:border-slate-800 dark:shadow-2xl dark:shadow-slate-950/60 ${className}`}>{children}</div>
);

export const CardHeader = ({ className = "", children }) => (
  <div className={`border-b border-gray-200/50 dark:border-slate-800 px-5 py-4 ${className}`}>{children}</div>
);

export const CardTitle = ({ className = "", children }) => (
  <div className={`text-sm font-semibold tracking-tight text-gray-700 dark:text-slate-100 ${className}`}>{children}</div>
);

export const CardContent = ({ className = "", children }) => (
  <div className={`p-4 text-gray-700 dark:text-slate-100 ${className}`}>{children}</div>
);

// Button component
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
  
  const map = {
    default: `inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold shadow transition-colors text-white disabled:opacity-50 ${getColors()}`,
    secondary: `inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium shadow-sm bg-white ring-1 disabled:opacity-50 dark:bg-slate-900 dark:hover:bg-slate-800 ${getColors()}`,
    outline: "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium shadow-sm border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 disabled:opacity-50 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-800",
    ghost: "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:text-slate-200 dark:hover:bg-slate-800",
  };
  return <button className={`${map[variant]} ${className}`} {...props} />;
};

// Input component
export const Input = ({ className = "", gender, ...props }) => {
  const focusRing = gender === "Female"
    ? "focus:ring-pink-400/50 dark:focus:ring-pink-500"
    : "focus:ring-sky-400/50 dark:focus:ring-sky-500";
  return (
    <input className={`w-full rounded-lg border border-gray-300/60 dark:border-slate-700 bg-white/80 dark:bg-slate-900 px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 disabled:opacity-50 text-gray-700 dark:text-slate-100 ${focusRing} ${className}`} {...props} />
  );
};

// Label component
export const Label = ({ htmlFor, className = "", children }) => (
  <label htmlFor={htmlFor} className={`text-sm text-gray-500 dark:text-slate-300 ${className}`}>{children}</label>
);

// Switch component
export const Switch = ({ checked, onCheckedChange, id, gender }) => {
  const activeColor = gender === "Female" ? "bg-pink-500" : "bg-sky-500";
  return (
    <button id={id} role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? activeColor : 'bg-gray-200 dark:bg-slate-700'}`}>
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  );
};

// SegmentedControl component
export const SegmentedControl = ({ options, value, onChange, gender }) => {
  const activeColor = gender === "Female"
    ? "text-pink-700 dark:text-pink-300"
    : "text-sky-700 dark:text-sky-300";
  return (
    <div className="flex items-center rounded-lg bg-gray-100 dark:bg-slate-800 p-1">
      {options.map(opt => (
        <button key={opt.value} onClick={() => onChange(opt.value)} className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${value === opt.value ? `bg-white shadow-sm dark:bg-slate-700 ${activeColor}` : 'text-gray-600 hover:bg-gray-200/50 dark:text-slate-300 dark:hover:bg-slate-700/80'}`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
};

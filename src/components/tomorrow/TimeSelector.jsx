import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * TimeSelector Component
 * 
 * Modal for selecting the hour of tomorrow's planned run.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @param {number} props.selectedHour - Currently selected hour (0-23)
 * @param {Function} props.onSelectHour - Callback when hour is selected
 * @param {Object} props.variants - Framer Motion animation variants
 * @returns {JSX.Element}
 */
const TimeSelector = ({ isOpen, onClose, selectedHour, onSelectHour, variants }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const formatHour = (h) => {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={variants.backdrop}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            variants={variants.modal}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Select Run Time
              </h3>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-6 gap-2">
              {hours.map((h) => (
                <button
                  key={h}
                  onClick={() => {
                    onSelectHour(h);
                    onClose();
                  }}
                  className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                    h === selectedHour
                      ? 'bg-blue-600 text-white dark:bg-blue-500'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {formatHour(h)}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TimeSelector;

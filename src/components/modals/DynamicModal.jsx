import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * DynamicModal Component
 * 
 * A unified, reusable modal component that can display different types of content.
 * Handles animations, backdrop clicks, and provides consistent styling across the app.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Function} props.onClose - Close modal callback
 * @param {string} props.title - Modal title text
 * @param {JSX.Element} props.icon - Icon component to display in header
 * @param {JSX.Element} props.headerRight - Optional content for right side of header (e.g., score display)
 * @param {Object} props.scoreBar - Optional score bar configuration
 * @param {number} props.scoreBar.value - Score value (0-100)
 * @param {Object} props.scoreBar.style - Style object for the progress bar
 * @param {JSX.Element} props.children - Modal content
 * @param {string} props.maxWidth - Maximum width class (default: 'max-w-4xl')
 * @param {Object} props.variants - Custom animation variants (optional)
 * @returns {JSX.Element|null}
 */
export const DynamicModal = ({ 
  isOpen, 
  onClose, 
  title,
  icon: Icon,
  headerRight,
  scoreBar,
  children,
  maxWidth = 'max-w-4xl',
  variants
}) => {
  if (!isOpen) return null;

  // Default animation variants
  const defaultBackdropVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const defaultModalVariants = {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { type: 'spring', damping: 25, stiffness: 300 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      y: 20,
      transition: { duration: 0.2 }
    }
  };

  const backdropVariants = variants?.backdropVariants || defaultBackdropVariants;
  const modalVariants = variants?.modalVariants || defaultModalVariants;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" 
          onClick={onClose}
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div 
            className={`relative w-full ${maxWidth} max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-5 w-5 text-sky-600 dark:text-sky-400" />}
                    <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                      {title}
                    </h2>
                  </div>
                  {headerRight && headerRight}
                </div>
                <motion.button 
                  onClick={onClose} 
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="h-5 w-5" />
                </motion.button>
              </div>
              
              {/* Optional Score Bar */}
              {scoreBar && (
                <div className="px-6 pb-4">
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
                    <motion.div 
                      className="h-full rounded-full"
                      style={scoreBar.style}
                      initial={{ width: 0 }}
                      animate={{ width: `${scoreBar.value ?? 0}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 88px)' }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DynamicModal;

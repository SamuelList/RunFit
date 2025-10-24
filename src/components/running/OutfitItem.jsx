import React, { useState } from "react";
import { motion } from "framer-motion";
import { Flame, TrendingUp, Hand, UserRound, Sparkles } from "lucide-react";
import { GEAR_INFO, GEAR_ICONS } from "../../utils/gearData";

/**
 * OutfitItem Component
 * 
 * Displays a single gear item with icon/image, label, and optional badges
 * for workout, long run, or cold hands settings.
 * 
 * @param {Object} props
 * @param {Object} props.item - Gear item object
 * @param {string} props.item.key - Gear key for lookup in GEAR_INFO
 * @param {string} props.item.label - Display label
 * @param {boolean} props.item.coldHands - Show cold hands badge
 * @param {boolean} props.item.workout - Show workout badge
 * @param {boolean} props.item.longRun - Show long run badge
 * @param {boolean} props.item.isAiSuggested - Show AI suggestion badge
 * @param {Object} props.listItemVariants - Framer Motion animation variants
 * @param {Function} props.onClick - Click handler for item selection
 */
const OutfitItem = ({ item, listItemVariants, onClick }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const gearInfo = GEAR_INFO[item.key];
  const Icon = GEAR_ICONS[item.key] || UserRound;
  const hasBadges = item.coldHands || item.workout || item.longRun || item.isAiSuggested;

  return (
    <motion.div
      className="group relative rounded-xl border border-gray-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white to-gray-50/30 dark:from-slate-800/40 dark:to-slate-900/40 px-4 py-3 transition-all hover:shadow-sm hover:border-gray-300 dark:hover:border-slate-600 cursor-pointer"
      variants={listItemVariants}
      whileHover={{ x: 4, transition: { duration: 0.2 } }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {gearInfo?.image ? (
            <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700">
              <img
                src={gearInfo.image}
                alt={item.label}
                width={40}
                height={40}
                loading="lazy"
                decoding="async"
                fetchPriority="low"
                onLoad={() => setImgLoaded(true)}
                className={`h-10 w-10 rounded-lg object-cover transition-opacity duration-200 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
              {/* lightweight placeholder while image loads */}
              <div className={`${imgLoaded ? 'opacity-0' : 'opacity-100'} absolute inset-0 rounded-lg bg-gray-100 dark:bg-slate-700 transition-opacity duration-200`} aria-hidden="true" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-700">
              <Icon className="h-5 w-5 text-gray-600 dark:text-slate-300" />
            </div>
          )}
          <span className="text-sm font-semibold text-gray-800 dark:text-slate-100">
            {item.label}
          </span>
        </div>
        
        {hasBadges && (
          <div className="flex items-center gap-1">
            {item.isAiSuggested && (
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-200/60 dark:border-purple-500/40 bg-purple-50/80 dark:bg-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:text-purple-300">
                <Sparkles className="h-3 w-3" /> AI
              </span>
            )}
            {item.workout && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/60 dark:border-amber-500/40 bg-amber-50/80 dark:bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                <Flame className="h-3 w-3" /> Workout
              </span>
            )}
            {item.longRun && (
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200/60 dark:border-indigo-500/40 bg-indigo-50/80 dark:bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:text-indigo-300">
                <TrendingUp className="h-3 w-3" /> Long
              </span>
            )}
            {item.coldHands && (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-200/60 dark:border-sky-500/40 bg-sky-50/80 dark:bg-sky-500/20 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
                <Hand className="h-3 w-3" /> Cold
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default OutfitItem;

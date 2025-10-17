import React from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui";
import OutfitToggle from "./OutfitToggle";
import OutfitItem from "./OutfitItem";

/**
 * OutfitRecommendation Component
 * 
 * Displays the recommended running outfit with Performance vs Comfort options.
 * Shows a list of gear items with badges and an alignment message indicating
 * whether the two recommendation modes match or differ.
 * 
 * @param {Object} props
 * @param {Object} props.derived - Derived weather data
 * @param {boolean} props.optionsDiffer - Whether Performance and Comfort options differ
 * @param {string} props.optionTitle - Display title for the selected option
 * @param {string} props.activeOption - Currently selected option ('A' = Performance, 'B' = Comfort)
 * @param {Array} props.activeItems - Array of gear items for the active option
 * @param {Function} props.setActiveOption - Callback to change active option
 * @param {Function} props.setSelectedOutfitItem - Callback when gear item is clicked
 * @param {Object} props.staggerContainer - Framer Motion stagger container variants
 * @param {Object} props.listItemVariants - Framer Motion list item variants
 * @param {Object} props.cardVariants - Framer Motion card variants
 */
const OutfitRecommendation = ({
  derived,
  optionsDiffer,
  optionTitle,
  activeOption,
  activeItems,
  setActiveOption,
  setSelectedOutfitItem,
  staggerContainer,
  listItemVariants,
  cardVariants,
}) => {
  if (!derived) return null;

  return (
    <motion.div className="flex flex-col gap-6 lg:col-start-1" variants={cardVariants}>
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-gray-50/50 to-white dark:from-slate-900/50 dark:to-slate-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
              <CardTitle className="text-base">{optionTitle}</CardTitle>
            </div>
            <OutfitToggle
              optionsDiffer={optionsDiffer}
              activeOption={activeOption}
              onChange={setActiveOption}
            />
          </div>
        </CardHeader>

        <CardContent className="p-4">
          <motion.div
            className="space-y-2"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {activeItems.map((item) => (
              <OutfitItem
                key={item.key}
                item={item}
                listItemVariants={listItemVariants}
                onClick={() => setSelectedOutfitItem(item.key)}
              />
            ))}
          </motion.div>

          {/* Alignment Message */}
          {!optionsDiffer ? (
            <motion.div
              className="mt-4 rounded-xl border border-emerald-200/60 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 px-4 py-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-start gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 dark:bg-emerald-500/30 mt-0.5">
                  <svg
                    className="h-3 w-3 text-emerald-600 dark:text-emerald-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-xs font-medium leading-relaxed text-emerald-800 dark:text-emerald-200">
                  Perfect alignment! Performance and comfort recommendations match today—this outfit optimizes both.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="mt-4 rounded-xl border border-blue-200/60 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 px-4 py-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs font-medium leading-relaxed text-blue-800 dark:text-blue-200">
                  {activeOption === "A"
                    ? "Performance-focused: Optimized for speed and efficiency. May sacrifice some warmth/comfort."
                    : "Comfort-focused: Prioritizes warmth and protection. May feel slightly overdressed during hard efforts."}
                </p>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default OutfitRecommendation;

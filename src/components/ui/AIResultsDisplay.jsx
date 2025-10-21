import React from 'react';
import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { Button } from './Button';

const AIResultsDisplay = ({ result, loading, error }) => {
  const [isCopied, setIsCopied] = React.useState(false);

  if (!result && !loading && !error) {
    return null;
  }

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    }
  };

  // Parse the result into sections, but intentionally ignore Weather Analysis per user request
  const parseResult = (text) => {
    // Return empty sections if no text provided to avoid null deref in rendering
    if (!text) return { gearRecommendation: '', runStrategy: '' };

    const sections = {
      gearRecommendation: '',
      runStrategy: ''
    };

    // Try to extract Gear Recommendation and Run Strategy sections
    const gearMatch = text.match(/Gear Recommendation[^\n]*\s*([\s\S]*?)(?=Run Strategy|$)/i);
    const strategyMatch = text.match(/Run Strategy\s*([\s\S]*?)$/i);

    if (gearMatch) {
      sections.gearRecommendation = gearMatch[1].trim();
    } else {
      // Fallback: look for a headed line like "Gear Recommendation (Easy Run)"
      const altGearMatch = text.match(/\*\*Gear Recommendation[^*]*\*\*\s*([\s\S]*?)(?=\*\*Run Strategy|$)/i);
      if (altGearMatch) sections.gearRecommendation = altGearMatch[1].trim();
    }

    if (strategyMatch) sections.runStrategy = strategyMatch[1].trim();

    // If no explicit sections found, attempt to heuristically split by double-newline between list and strategy
    if (!sections.gearRecommendation) {
      const parts = text.split(/\n\n+/);
      if (parts.length >= 2) {
        sections.gearRecommendation = parts[0].trim();
        sections.runStrategy = sections.runStrategy || parts.slice(1).join('\n\n').trim();
      } else {
        // As last resort, show entire text as gearRecommendation
        sections.gearRecommendation = text.trim();
      }
    }

    return sections;
  };

  const sections = parseResult(result) || { gearRecommendation: '', runStrategy: '' };

  // Only display Gear Recommendation and Run Strategy (no Weather Analysis)
  const displayText = `${sections.gearRecommendation || ''}${sections.runStrategy ? `\n\nRun Strategy\n${sections.runStrategy}` : ''}`.trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 space-y-4"
    >
      {result && (
        <>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 rounded-lg p-4 border border-blue-200 dark:border-slate-700">
            <div className="space-y-4 text-sm">
              {sections.gearRecommendation && (
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Gear Recommendation</h4>
                  <div className="text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                    {sections.gearRecommendation}
                  </div>
                </div>
              )}

              {sections.runStrategy && (
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Run Strategy</h4>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{sections.runStrategy}</p>
                </div>
              )}
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Copy only the gear recommendation + run strategy, not weather analysis
                navigator.clipboard.writeText(displayText).then(() => {
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                });
              }}
              className="w-full"
            >
              {isCopied ? (
                <>
                  <Check className="h-3 w-3 mr-2 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-2" />
                  Copy Result
                </>
              )}
            </Button>
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

export default AIResultsDisplay;

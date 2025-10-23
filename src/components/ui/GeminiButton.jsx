import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { generateGearRecommendation, isGeminiAvailable } from '../../utils/geminiService';
import { mapAiOutput } from '../../utils/aiMapper';
import { buildGeminiPrompt } from '../../utils/geminiPrompt';
import { useAiCooldown } from '../context/AiCooldownContext.js';
import { formatMs } from '../../utils/aiCooldown';



const GeminiButton = ({ derived, wx, unit, gender, runType, tempSensitivity, onResultChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { remainingMs, isReady, startCooldown, COOLDOWN_MS } = useAiCooldown();

  const getRunTypeLabel = (type) => {
    switch (type) {
      case 'easy': return 'Easy Run';
      case 'workout': return 'Hard Workout';
      case 'longRun': return 'Long Run';
      default: return 'Easy Run';
    }
  };

  // Use centralized prompt builder from utils/geminiPrompt
  // buildGeminiPrompt({ derived, wx, unit, gender, runType, tempSensitivity })

  // Auto-log the prompt on mount / page refresh when data is available
  useEffect(() => {
    if (!derived || !wx) return;
    try {
      const promptText = buildGeminiPrompt({ derived, wx, unit, gender, runType, tempSensitivity });
      // Deliberately log prompt for debugging/audit (no secrets included)
      console.log('--- Gemini prompt (auto-logged on mount) ---\n', promptText);
    } catch (e) {
      console.warn('Failed to build AI prompt for logging:', e);
    }
    // Only log when the key inputs change
  }, [derived, wx, unit, gender, runType, tempSensitivity]);

  // Cooldown state provided by AiCooldownContext

  const handleGenerate = async () => {
    if (!derived || !wx) return;

    setIsLoading(true);
    setError(null);
    onResultChange?.({ loading: true });

    const prompt = buildGeminiPrompt({ derived, wx, unit, gender, runType, tempSensitivity });
    const result = await generateGearRecommendation(prompt);

    setIsLoading(false);

    if (result.success) {
      // Start the cooldown only after a successful response
      try { startCooldown(); } catch(e) { /* ignore */ }
      // Map AI text output to canonical gear keys
      let mapped = [];
      try {
        mapped = mapAiOutput(result.data || '');
      } catch (e) {
        console.warn('aiMapper failed:', e);
        mapped = [];
      }

      // Return both raw text and mapped suggestions to the caller for UI review
      onResultChange?.({ data: result.data, mapped, loading: false });
    } else {
      // If server returned cooldown error, do NOT start a new local cooldown here.
      // Instead, sync local UI to the server-provided remainingMs by calling startCooldown only when the context's polling detects it.
      if (result.error === 'Cooldown' && result.remainingMs) {
        setError(`Please wait ${formatMs(result.remainingMs)} before generating again.`);
      } else {
        setError(result.error);
      }
      onResultChange?.({ error: result.error, loading: false });
    }
  };

  const isCooldownActive = remainingMs > 0;
  const isDisabled = !derived || !wx || isLoading || isCooldownActive;

  return (
    <div className="space-y-2">
      <motion.div whileHover={{ scale: isDisabled ? 1 : 1.05 }} whileTap={{ scale: isDisabled ? 1 : 0.95 }}>
        <div className="relative">
          <Button
            variant="outline"
            onClick={handleGenerate}
            className={`w-full relative overflow-hidden ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            disabled={isDisabled}
          >
            {/* progress overlay */}
            {isCooldownActive && (
              <div
                aria-hidden
                className="absolute left-0 top-0 h-full bg-sky-400/30 dark:bg-sky-500/30"
                style={{ width: `${(1 - remainingMs / COOLDOWN_MS) * 100}%`, pointerEvents: 'none', transition: 'width 300ms linear' }}
              />
            )}

            <span className="relative z-10 flex items-center justify-center">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isCooldownActive ? formatMs(remainingMs) : 'Generate with AI'}
                </>
              )}
            </span>
          </Button>
        </div>
      </motion.div>
      
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}
    </div>
  );
};

export default GeminiButton;

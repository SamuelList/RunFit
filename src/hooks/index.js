/**
 * Custom Hooks Index
 * 
 * Re-exports all custom hooks for easy importing
 */

export { useSettings } from './useSettings';
export { useWeatherData } from './useWeatherData';
export { useRunConditions, calculateMoonPhase } from './useRunConditions';

// Re-export utility functions from their proper locations
export { scoreLabel, scoreBasedTone, dewPointF, scoreTone, computeRunningScore } from '../utils/scoring';
export { handsLabel, handsTone, handsLevelFromGear, chooseSocks, calculateEffectiveTemp } from '../utils/outfit/outfitHelpers';
export { getRunningCondition } from '../utils/conditions';

/**
 * Calculations Utilities
 * 
 * Central export file for all calculation utilities.
 * Organized by category: scoring, WBGT, dew point.
 */

// Scoring utilities
export {
  computeRunningScore,
  scoreLabel,
  scoreTone,
  scoreBasedTone,
  // Scoring constants
  HEAT_PENALTY_MAX_TEMP,
  COLD_PENALTY_MAX_MULTIPLIER,
  COLD_PENALTY_WIDTH_WORKOUT,
  COLD_PENALTY_WIDTH_EASY,
  IDEAL_TEMP_WORKOUT,
  IDEAL_TEMP_LONG_RUN,
  IDEAL_TEMP_EASY,
  DEW_POINT_COMFORTABLE,
  DEW_POINT_SLIGHTLY_MUGGY,
  DEW_POINT_MODERATE,
  DEW_POINT_MUGGY,
  DEW_POINT_VERY_HUMID,
  DEW_POINT_OPPRESSIVE,
} from './scoring';

// WBGT (Wet Bulb Globe Temperature) utilities
export {
  calculateWBGT,
  assessWBGTRisk,
  getWBGTFlag,
  calculateHeatIndex,
  WBGT_THRESHOLDS,
} from './wbgt';

// Dew point utilities
export {
  dewPointF,
  dewPointC,
  getDewPointComfortLevel,
  relativeHumidityFromDewPoint,
} from './dewPoint';

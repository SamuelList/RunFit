
import React from 'react';
import { motion } from 'framer-motion';
import { calculateSolarElevation } from './solar';
import { calculateMRT, getMRTCategory } from './mrt';
import { calculateUTCI, getUTCICategory } from './utci';
import { computeFeelsLike, msToMph, mmToInches, cToF } from './helpers';

// --- Tiny UI for the insights panel ---
export const ProgressBar = ({ pct }) => (
  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
    <div className="h-2 rounded-full bg-pink-500" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
  </div>
);

// Extract raw weather values from MET.no API response
export function extractMetNoRawData(first) {
  // ... (the entire extractMetNoRawData function) ...
}

// Convert raw weather data to user's preferred units
export function convertWeatherUnits(raw, unit) {
  // ... (the entire convertWeatherUnits function) ...
}

// Log comprehensive weather debug information with derived calculations
export function logWeatherDebug(weatherData, raw, location, unit) {
  // ... (the entire logWeatherDebug function) ...
}

// Helper: Get Beaufort wind scale description
export function getBeaufortScale(mph) {
  // ... (the entire getBeaufortScale function) ...
}

// Helper: Get sky description from cloud cover percentage
export function getSkyDescription(cloudPercent) {
  // ... (the entire getSkyDescription function) ...
}

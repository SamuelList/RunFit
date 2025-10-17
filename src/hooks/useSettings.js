import { useState, useEffect, useCallback } from 'react';
import { APP_VERSION, DEFAULT_SETTINGS } from '../utils/constants';

/**
 * Load settings from localStorage
 * Handles version migration and defaults
 */
function loadSettings() {
  try {
    const savedVersion = localStorage.getItem('runGearVersion');
    const saved = localStorage.getItem('runGearSettings');
    
    // If version mismatch, force complete reset to ensure new settings
    if (savedVersion !== APP_VERSION) {
      console.log('App updated to v' + APP_VERSION + ' - resetting to defaults with user preferences');
      localStorage.setItem('runGearVersion', APP_VERSION);
      
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Only keep core user preferences, force new features to default enabled
          const merged = {
            ...DEFAULT_SETTINGS,
            // Preserve user's location and preferences
            place: parsed.place || DEFAULT_SETTINGS.place,
            query: parsed.query || DEFAULT_SETTINGS.query,
            unit: parsed.unit || DEFAULT_SETTINGS.unit,
            coldHands: parsed.coldHands ?? DEFAULT_SETTINGS.coldHands,
            gender: parsed.gender || DEFAULT_SETTINGS.gender,
            theme: parsed.theme || DEFAULT_SETTINGS.theme,
            tempSensitivity: parsed.tempSensitivity ?? DEFAULT_SETTINGS.tempSensitivity,
            runnerBoldness: parsed.runnerBoldness ?? DEFAULT_SETTINGS.runnerBoldness,
            runHoursStart: parsed.runHoursStart ?? DEFAULT_SETTINGS.runHoursStart,
            runHoursEnd: parsed.runHoursEnd ?? DEFAULT_SETTINGS.runHoursEnd,
            // Force new settings to defaults (don't preserve old values)
            showTomorrowOutfit: DEFAULT_SETTINGS.showTomorrowOutfit,
            tomorrowRunHour: DEFAULT_SETTINGS.tomorrowRunHour,
            tomorrowRunType: DEFAULT_SETTINGS.tomorrowRunType,
            smartNightCard: DEFAULT_SETTINGS.smartNightCard,
          };
          // Immediately save the merged result
          localStorage.setItem('runGearSettings', JSON.stringify(merged));
          return merged;
        } catch (parseError) {
          console.warn('Could not parse saved settings, using defaults');
        }
      }
      return DEFAULT_SETTINGS;
    }
    
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load settings:', e);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings) {
  try {
    localStorage.setItem('runGearSettings', JSON.stringify(settings));
    localStorage.setItem('runGearVersion', APP_VERSION);
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}

/**
 * useSettings - Manages all app settings with localStorage persistence
 * 
 * Handles:
 * - Settings state management
 * - LocalStorage persistence
 * - Theme management
 * - User preferences
 * - Version migration
 * 
 * @returns {Object} Settings state and updater functions
 * 
 * @example
 * const { settings, updateSetting, resetToDefaults } = useSettings();
 */
export function useSettings() {
  const initialSettings = loadSettings();
  
  // Location & Weather
  const [place, setPlace] = useState(initialSettings.place);
  const [query, setQuery] = useState(initialSettings.query);
  const [unit, setUnit] = useState(initialSettings.unit);
  
  // User Preferences
  const [coldHands, setColdHands] = useState(initialSettings.coldHands);
  const [gender, setGender] = useState(initialSettings.gender);
  const [tempSensitivity, setTempSensitivity] = useState(initialSettings.tempSensitivity);
  const [runnerBoldness, setRunnerBoldness] = useState(initialSettings.runnerBoldness);
  
  // Run Timing
  const [runHoursStart, setRunHoursStart] = useState(initialSettings.runHoursStart);
  const [runHoursEnd, setRunHoursEnd] = useState(initialSettings.runHoursEnd);
  
  // Tomorrow's Outfit
  const [showTomorrowOutfit, setShowTomorrowOutfit] = useState(initialSettings.showTomorrowOutfit);
  const [tomorrowRunHour, setTomorrowRunHour] = useState(initialSettings.tomorrowRunHour);
  const [tomorrowRunType, setTomorrowRunType] = useState(initialSettings.tomorrowRunType);
  
  // UI Preferences
  const [theme, setTheme] = useState(initialSettings.theme);
  const [twilightTerms, setTwilightTerms] = useState(initialSettings.twilightTerms);
  const [smartNightCard, setSmartNightCard] = useState(initialSettings.smartNightCard ?? true);
  const [activeOption, setActiveOption] = useState(initialSettings.activeOption);
  
  // Custom Temperature
  const [customTempEnabled, setCustomTempEnabled] = useState(initialSettings.customTempEnabled);
  const [customTempInput, setCustomTempInput] = useState(initialSettings.customTempInput);
  
  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);
  
  // Save settings to localStorage whenever they change
  useEffect(() => {
    const settings = {
      place,
      query,
      unit,
      coldHands,
      gender,
      customTempEnabled,
      customTempInput,
      activeOption,
      theme,
      twilightTerms,
      tempSensitivity,
      runnerBoldness,
      runHoursStart,
      runHoursEnd,
      showTomorrowOutfit,
      tomorrowRunHour,
      tomorrowRunType,
      smartNightCard
    };
    saveSettings(settings);
  }, [
    place,
    query,
    unit,
    coldHands,
    gender,
    customTempEnabled,
    customTempInput,
    activeOption,
    theme,
    twilightTerms,
    tempSensitivity,
    runnerBoldness,
    runHoursStart,
    runHoursEnd,
    showTomorrowOutfit,
    tomorrowRunHour,
    tomorrowRunType,
    smartNightCard
  ]);
  
  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setPlace(DEFAULT_SETTINGS.place);
    setQuery(DEFAULT_SETTINGS.query);
    setUnit(DEFAULT_SETTINGS.unit);
    setColdHands(DEFAULT_SETTINGS.coldHands);
    setGender(DEFAULT_SETTINGS.gender);
    setCustomTempEnabled(DEFAULT_SETTINGS.customTempEnabled);
    setCustomTempInput(DEFAULT_SETTINGS.customTempInput);
    setActiveOption(DEFAULT_SETTINGS.activeOption);
    setTheme(DEFAULT_SETTINGS.theme);
    setTwilightTerms(DEFAULT_SETTINGS.twilightTerms);
    setTempSensitivity(DEFAULT_SETTINGS.tempSensitivity);
    setRunnerBoldness(DEFAULT_SETTINGS.runnerBoldness);
    setRunHoursStart(DEFAULT_SETTINGS.runHoursStart);
    setRunHoursEnd(DEFAULT_SETTINGS.runHoursEnd);
    setShowTomorrowOutfit(DEFAULT_SETTINGS.showTomorrowOutfit);
    setTomorrowRunHour(DEFAULT_SETTINGS.tomorrowRunHour);
    setTomorrowRunType(DEFAULT_SETTINGS.tomorrowRunType);
    setSmartNightCard(DEFAULT_SETTINGS.smartNightCard);
  }, []);
  
  return {
    // Location & Weather
    place,
    setPlace,
    query,
    setQuery,
    unit,
    setUnit,
    
    // User Preferences
    coldHands,
    setColdHands,
    gender,
    setGender,
    tempSensitivity,
    setTempSensitivity,
    runnerBoldness,
    setRunnerBoldness,
    
    // Run Timing
    runHoursStart,
    setRunHoursStart,
    runHoursEnd,
    setRunHoursEnd,
    
    // Tomorrow's Outfit
    showTomorrowOutfit,
    setShowTomorrowOutfit,
    tomorrowRunHour,
    setTomorrowRunHour,
    tomorrowRunType,
    setTomorrowRunType,
    
    // UI Preferences
    theme,
    setTheme,
    twilightTerms,
    setTwilightTerms,
    smartNightCard,
    setSmartNightCard,
    activeOption,
    setActiveOption,
    
    // Custom Temperature
    customTempEnabled,
    setCustomTempEnabled,
    customTempInput,
    setCustomTempInput,
    
    // Actions
    resetToDefaults,
  };
}

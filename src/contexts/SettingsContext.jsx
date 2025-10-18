import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * SettingsContext - Manages user preferences and settings
 * 
 * Provides:
 * - Temperature unit (F/C)
 * - Theme (light/dark/auto)
 * - Cold hands preference
 * - Gender setting
 * - Runner boldness
 * - Temperature sensitivity
 * - All other user preferences
 * - LocalStorage persistence
 */
const SettingsContext = createContext(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

const DEFAULT_SETTINGS = {
  unit: 'F',
  theme: 'auto',
  coldHands: false,
  gender: 'Male',
  runnerBoldness: 0,
  tempSensitivity: 0,
  manualHour: null,
  showTomorrowOutfit: true,
  tomorrowRunHour: 6,
  tomorrowRunType: 'easy',
  tomorrowCardRunType: 'easy',
  tomorrowCardOption: 'A',
  smartNightCard: true,
};

export const SettingsProvider = ({ children }) => {
  // Initialize from localStorage
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('runfit-settings');
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return DEFAULT_SETTINGS;
    }
  });

  // Persist to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem('runfit-settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [settings]);

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateSettings = useCallback((updates) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = {
    // Individual settings (for easy destructuring)
    unit: settings.unit,
    theme: settings.theme,
    coldHands: settings.coldHands,
    gender: settings.gender,
    runnerBoldness: settings.runnerBoldness,
    tempSensitivity: settings.tempSensitivity,
    manualHour: settings.manualHour,
    showTomorrowOutfit: settings.showTomorrowOutfit,
    tomorrowRunHour: settings.tomorrowRunHour,
    tomorrowRunType: settings.tomorrowRunType,
    tomorrowCardRunType: settings.tomorrowCardRunType,
    tomorrowCardOption: settings.tomorrowCardOption,
    smartNightCard: settings.smartNightCard,
    
    // All settings object
    settings,
    
    // Actions
    updateSetting,
    updateSettings,
    resetSettings,
    
    // Convenience setters
    setUnit: (unit) => updateSetting('unit', unit),
    setTheme: (theme) => updateSetting('theme', theme),
    setColdHands: (value) => updateSetting('coldHands', value),
    setGender: (gender) => updateSetting('gender', gender),
    setRunnerBoldness: (value) => updateSetting('runnerBoldness', value),
    setTempSensitivity: (value) => updateSetting('tempSensitivity', value),
    setManualHour: (hour) => updateSetting('manualHour', hour),
    setShowTomorrowOutfit: (show) => updateSetting('showTomorrowOutfit', show),
    setTomorrowRunHour: (hour) => updateSetting('tomorrowRunHour', hour),
    setTomorrowRunType: (type) => updateSetting('tomorrowRunType', type),
    setTomorrowCardRunType: (type) => updateSetting('tomorrowCardRunType', type),
    setTomorrowCardOption: (option) => updateSetting('tomorrowCardOption', option),
    setSmartNightCard: (value) => updateSetting('smartNightCard', value),
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

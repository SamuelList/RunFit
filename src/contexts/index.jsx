/**
 * Context providers barrel export
 * 
 * Provides centralized state management for the RunFit app using React Context.
 * 
 * Usage:
 * ```jsx
 * import { AppProviders, useWeather, useSettings, useUI } from './contexts';
 * 
 * // Wrap your app
 * <AppProviders>
 *   <App />
 * </AppProviders>
 * 
 * // Use in components
 * const { wx, loading } = useWeather();
 * const { unit, setUnit } = useSettings();
 * const { showSettings, openSettings } = useUI();
 * ```
 */

import React from 'react';
import { WeatherProvider } from './WeatherContext';
import { SettingsProvider } from './SettingsContext';
import { UIProvider } from './UIContext';

export { useWeather } from './WeatherContext';
export { useSettings } from './SettingsContext';
export { useUI } from './UIContext';

/**
 * AppProviders - Combines all context providers
 * 
 * Wraps the app with all necessary context providers in the correct order.
 */
export const AppProviders = ({ children }) => {
  return (
    <SettingsProvider>
      <WeatherProvider>
        <UIProvider>
          {children}
        </UIProvider>
      </WeatherProvider>
    </SettingsProvider>
  );
};

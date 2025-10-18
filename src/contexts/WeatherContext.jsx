import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * WeatherContext - Manages weather data and location state
 * 
 * Provides:
 * - Current weather data
 * - Location information
 * - Loading and error states
 * - Weather refresh functionality
 */
const WeatherContext = createContext(undefined);

export const useWeather = () => {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
};

export const WeatherProvider = ({ children }) => {
  const [wx, setWx] = useState(null);
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const updateWeather = useCallback((weatherData) => {
    setWx(weatherData);
    setLastRefresh(Date.now());
    setError(null);
  }, []);

  const updateLocation = useCallback((location) => {
    setPlace(location);
  }, []);

  const setLoadingState = useCallback((isLoading) => {
    setLoading(isLoading);
  }, []);

  const setErrorState = useCallback((errorMessage) => {
    setError(errorMessage);
    setLoading(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    // State
    wx,
    place,
    loading,
    error,
    lastRefresh,
    
    // Actions
    updateWeather,
    updateLocation,
    setLoading: setLoadingState,
    setError: setErrorState,
    clearError,
  };

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
};

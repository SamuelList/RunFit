import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * UIContext - Manages UI state (modals, panels, debug mode)
 * 
 * Provides:
 * - Modal visibility states
 * - Panel open/close states
 * - Debug mode
 * - Loading progress
 * - Toast notifications
 */
const UIContext = createContext(undefined);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

export const UIProvider = ({ children }) => {
  // Modal states
  const [showSettings, setShowSettings] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showGearGuide, setShowGearGuide] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [showHourBreakdown, setShowHourBreakdown] = useState(false);
  const [selectedHour, setSelectedHour] = useState(null);
  
  // Panel states
  const [show24HourForecast, setShow24HourForecast] = useState(false);
  
  // Debug mode
  const [debugActive, setDebugActive] = useState(false);
  
  // Loading state
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  
  // Toast/notification state
  const [toast, setToast] = useState(null);

  // Modal actions
  const openSettings = useCallback(() => setShowSettings(true), []);
  const closeSettings = useCallback(() => setShowSettings(false), []);
  
  const openInsights = useCallback(() => setShowInsights(true), []);
  const closeInsights = useCallback(() => setShowInsights(false), []);
  
  const openGearGuide = useCallback(() => setShowGearGuide(true), []);
  const closeGearGuide = useCallback(() => setShowGearGuide(false), []);
  
  const openTimePicker = useCallback(() => setShowTimePickerModal(true), []);
  const closeTimePicker = useCallback(() => setShowTimePickerModal(false), []);
  
  const openHourBreakdown = useCallback((hour) => {
    setSelectedHour(hour);
    setShowHourBreakdown(true);
  }, []);
  const closeHourBreakdown = useCallback(() => {
    setShowHourBreakdown(false);
    setSelectedHour(null);
  }, []);
  
  // Panel actions
  const toggle24HourForecast = useCallback(() => {
    setShow24HourForecast(prev => !prev);
  }, []);
  
  // Debug actions
  const toggleDebug = useCallback(() => {
    setDebugActive(prev => !prev);
  }, []);
  
  // Loading actions
  const updateLoadingProgress = useCallback((progress, stage) => {
    setLoadingProgress(progress);
    if (stage) setLoadingStage(stage);
  }, []);
  
  const resetLoading = useCallback(() => {
    setLoadingProgress(0);
    setLoadingStage('');
  }, []);
  
  // Toast actions
  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    setToast({ message, type, duration });
    if (duration > 0) {
      setTimeout(() => setToast(null), duration);
    }
  }, []);
  
  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const value = {
    // Modal states
    showSettings,
    showInsights,
    showGearGuide,
    showTimePickerModal,
    showHourBreakdown,
    selectedHour,
    
    // Panel states
    show24HourForecast,
    
    // Debug state
    debugActive,
    
    // Loading state
    loadingProgress,
    loadingStage,
    
    // Toast state
    toast,
    
    // Modal actions
    openSettings,
    closeSettings,
    setShowSettings,
    
    openInsights,
    closeInsights,
    setShowInsights,
    
    openGearGuide,
    closeGearGuide,
    setShowGearGuide,
    
    openTimePicker,
    closeTimePicker,
    setShowTimePickerModal,
    
    openHourBreakdown,
    closeHourBreakdown,
    setShowHourBreakdown,
    setSelectedHour,
    
    // Panel actions
    toggle24HourForecast,
    setShow24HourForecast,
    
    // Debug actions
    toggleDebug,
    setDebugActive,
    
    // Loading actions
    updateLoadingProgress,
    resetLoading,
    setLoadingProgress,
    setLoadingStage,
    
    // Toast actions
    showToast,
    hideToast,
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};

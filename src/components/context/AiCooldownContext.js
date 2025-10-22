import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import aiCooldown, { getRemainingMs, setLastUsed, COOLDOWN_MS } from '../../utils/aiCooldown.js';

const AiCooldownContext = createContext(null);

export const useAiCooldown = () => useContext(AiCooldownContext);

export const AiCooldownProvider = ({ children }) => {
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs());

  useEffect(() => {
    const tick = () => setRemainingMs(getRemainingMs());
    tick();
    const id = setInterval(tick, 500);
    const onUpdated = () => tick();
    window.addEventListener('aiCooldownUpdated', onUpdated);
    return () => {
      clearInterval(id);
      window.removeEventListener('aiCooldownUpdated', onUpdated);
    };
  }, []);

  const startCooldown = useCallback((ts = Date.now()) => {
    setLastUsed(ts);
    setRemainingMs(getRemainingMs());
  }, []);

  const value = {
    remainingMs,
    isReady: remainingMs === 0,
    startCooldown,
    COOLDOWN_MS,
  };

  // Avoid JSX in .js file to keep import analysis happy in Vite
  return React.createElement(AiCooldownContext.Provider, { value }, children);
};

export default AiCooldownContext;

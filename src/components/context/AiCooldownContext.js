import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import aiCooldown, { getRemainingMs, setLastUsed, COOLDOWN_MS } from '../../utils/aiCooldown.js';

const SERVER_COOLDOWN_URL = '/api/cooldown';

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

  // Start cooldown locally and notify server so other devices can sync
  const startCooldown = useCallback(async (ts = Date.now()) => {
    try {
      // set local state first for immediate UI feedback
      setLastUsed(ts);
      setRemainingMs(getRemainingMs());

      // notify server so other clients can read the same cooldown
      try {
        await fetch(SERVER_COOLDOWN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ts })
        });
      } catch (e) {
        // ignore network errors; local cooldown still works
        console.warn('Failed to notify server about cooldown:', e);
      }
    } catch (e) {
      console.warn('startCooldown failed:', e);
    }
  }, []);

  // Periodically poll server-side cooldown and update local state so all devices stay in sync
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const resp = await fetch(SERVER_COOLDOWN_URL);
        if (!resp.ok) return;
        const payload = await resp.json();
        if (!mounted) return;
        if (payload && typeof payload.remainingMs === 'number') {
          // If server indicates cooldown and client doesn't, sync local
          if (payload.remainingMs > 0 && getRemainingMs() === 0) {
            // set local last-used to now - (COOLDOWN_MS - remainingMs)
            const ts = Date.now() - (COOLDOWN_MS - payload.remainingMs);
            setLastUsed(ts);
            setRemainingMs(getRemainingMs());
          }
        }
      } catch (e) {
        // polling is best-effort
      }
    };

    poll();
    const id = setInterval(poll, 2000);
    return () => { mounted = false; clearInterval(id); };
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

const KEY = 'runfit_ai_last_used_v1';
export const COOLDOWN_MS = 60_000; // 1 minute

export function getLastUsed() {
  try {
    const v = localStorage.getItem(KEY);
    return v ? Number(v) : 0;
  } catch (e) {
    return 0;
  }
}

export function setLastUsed(ts = Date.now()) {
  try {
    localStorage.setItem(KEY, String(ts));
    // notify other tabs/components
    window.dispatchEvent(new CustomEvent('aiCooldownUpdated', { detail: { ts } }));
  } catch (e) {
    // ignore
  }
}

export function getRemainingMs() {
  const last = getLastUsed();
  const rem = COOLDOWN_MS - (Date.now() - last);
  return rem > 0 ? rem : 0;
}

export function isReady() {
  return getRemainingMs() === 0;
}

export function formatMs(ms) {
  const s = Math.ceil(ms / 1000);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return mm > 0 ? `${mm}:${String(ss).padStart(2, '0')}` : `${ss}s`;
}

export default {
  KEY,
  COOLDOWN_MS,
  getLastUsed,
  setLastUsed,
  getRemainingMs,
  isReady,
  formatMs,
};

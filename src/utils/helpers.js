// Math and conversion utilities
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const round1 = (v) => Math.round(v * 10) / 10;
export const msToMph = (ms) => ms * 2.2369362921;
export const mmToInches = (mm) => mm * 0.0393701;
export const cToF = (c) => (c * 9) / 5 + 32;
export const fToC = (f) => ((f - 32) * 5) / 9;

// Compute feels-like temperature with wind chill and heat index
export function computeFeelsLike(tempC, windMs, humidityPct) {
  const tempF = cToF(tempC);
  const windMph = msToMph(windMs);
  let feelsF = tempF;

  if (tempF <= 50 && windMph > 3) {
    const v16 = Math.pow(windMph, 0.16);
    feelsF = 35.74 + 0.6215 * tempF - 35.75 * v16 + 0.4275 * tempF * v16;
  } else if (tempF >= 80 && humidityPct >= 40) {
    const R = humidityPct;
    const T = tempF;
    const hi =
      -42.379 +
      2.04901523 * T +
      10.14333127 * R -
      0.22475541 * T * R -
      6.83783e-3 * T * T -
      5.481717e-2 * R * R +
      1.22874e-3 * T * T * R +
      8.5282e-4 * T * R * R -
      1.99e-6 * T * T * R * R;
    feelsF = Math.max(T, hi);
  }

  return { f: feelsF, c: fToC(feelsF) };
}

// Blend two weather data objects by averaging
export function blendWeather(primary, secondary) {
  const { provider: _pp, ...p } = primary;
  const { provider: _ps, ...s } = secondary || {};
  const avg = (a, b) => {
    if (typeof a === "number" && typeof b === "number") return (a + b) / 2;
    if (typeof a === "number") return a;
    if (typeof b === "number") return b;
    return undefined;
  };

  return {
    ...p,
    temperature: avg(p.temperature, s?.temperature),
    apparent: avg(p.apparent, s?.apparent),
    wind: avg(p.wind, s?.wind),
    humidity: avg(p.humidity, s?.humidity),
    precip: avg(p.precip, s?.precip),
    precipProb: avg(p.precipProb, s?.precipProb),
    uv: avg(p.uv, s?.uv),
    cloud: avg(p.cloud, s?.cloud),
    pressure: avg(p.pressure, s?.pressure), // Keep pressure for WBGT
    solarRadiation: avg(p.solarRadiation, s?.solarRadiation), // Keep solar radiation for WBGT
  };
}

// Map Open-Meteo hourly array to current hour index
export function getCurrentHourIndex(times) {
  if (!Array.isArray(times) || times.length === 0) return 0;
  const now = Date.now();
  let previousIdx = 0;

  for (let i = 0; i < times.length; i += 1) {
    const parsed = Date.parse(times[i]);
    if (!Number.isFinite(parsed)) continue;
    if (parsed > now) {
      return i === 0 ? 0 : previousIdx;
    }
    previousIdx = i;
  }

  return previousIdx;
}

// Determine the appropriate color classes based on the provided temperature
export function getTempColor(tempF) {
  if (tempF >= 85) return { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-500/30' };
  if (tempF >= 75) return { bg: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-500/30' };
  if (tempF >= 65) return { bg: 'bg-yellow-100 dark:bg-yellow-500/20', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-500/30' };
  if (tempF > 50) return { bg: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-500/30' };
  if (tempF > 35) return { bg: 'bg-sky-100 dark:bg-sky-500/20', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-200 dark:border-sky-500/30' };
  return { bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-500/30' };
}

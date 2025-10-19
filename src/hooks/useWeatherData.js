import { useState, useCallback } from 'react';
import { DEFAULT_PLACE, nominatimHeaders } from '../utils/constants';
import { cToF, msToMph, mmToInches, computeFeelsLike, blendWeather, getCurrentHourIndex } from '../utils/helpers';
import { computeSunEvents } from '../utils/solar';

/**
 * Fetch weather from MET Norway API
 */
async function fetchMetNoWeather(p, unit) {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${p.lat}&lon=${p.lon}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('MET Norway fetch failed');
  const data = await res.json();
  const first = data?.properties?.timeseries?.[0];
  if (!first?.data?.instant?.details) throw new Error('MET Norway missing data');

  const details = first.data.instant.details;
  const next1h = first.data.next_1_hours?.details;
  const next6h = first.data.next_6_hours?.details;

  const tempC = typeof details.air_temperature === 'number' ? details.air_temperature : null;
  const humidity = typeof details.relative_humidity === 'number' ? details.relative_humidity : null;
  const windMs = typeof details.wind_speed === 'number' ? details.wind_speed : null;
  const cloud = typeof details.cloud_area_fraction === 'number' ? details.cloud_area_fraction : null;
  const precipMm =
    typeof next1h?.precipitation_amount === 'number'
      ? next1h.precipitation_amount
      : typeof next6h?.precipitation_amount === 'number'
      ? next6h.precipitation_amount / 6
      : null;
  const precipProb =
    typeof next1h?.probability_of_precipitation === 'number'
      ? next1h.probability_of_precipitation
      : typeof next6h?.probability_of_precipitation === 'number'
      ? next6h.probability_of_precipitation
      : null;

  const feels = typeof tempC === 'number' ? computeFeelsLike(tempC, windMs ?? 0, humidity ?? 50) : null;

  const temperature = tempC == null ? undefined : unit === 'F' ? cToF(tempC) : tempC;
  const apparent = feels == null ? temperature : unit === 'F' ? feels.f : feels.c;
  const wind = windMs == null ? undefined : msToMph(windMs);
  const precip = precipMm == null ? undefined : mmToInches(precipMm);

  return {
    provider: 'MET Norway',
    temperature,
    apparent,
    wind,
    humidity,
    precip,
    precipProb,
    uv: undefined,
    cloud,
  };
}

/**
 * useWeatherData - Manages weather fetching, geolocation, and location search
 * 
 * Handles:
 * - Weather API calls (Open-Meteo + MET Norway)
 * - Geolocation (GPS + IP fallback)
 * - Location search (Nominatim)
 * - Data caching
 * - Loading states
 * - Error handling
 * 
 * @param {Object} place - Current location object
 * @param {Function} setPlace - Function to update location
 * @param {string} unit - Temperature unit ('F' or 'C')
 * 
 * @returns {Object} Weather data, loading state, and action functions
 * 
 * @example
 * const { 
 *   wx, 
 *   loading, 
 *   error, 
 *   fetchWeather, 
 *   searchCity,
 *   tryGeolocate,
 *   handleLocationRefresh
 * } = useWeatherData(place, setPlace, unit);
 */
export function useWeatherData(place, setPlace, unit) {
  const [wx, setWx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showRefreshToast, setShowRefreshToast] = useState(false);
  
  // Fetch weather from APIs
  const fetchWeather = useCallback(async (p = place, u = unit) => {
    setLoading(true);
    setError("");
    try {
      const tempUnit = u === "F" ? "fahrenheit" : "celsius";
      const primaryUrl = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current_weather=true&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,cloud_cover,uv_index,wind_speed_10m,surface_pressure,shortwave_radiation&daily=sunrise,sunset&temperature_unit=${tempUnit}&windspeed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=3`;

      const [primaryResult, secondaryResult] = await Promise.allSettled([
        fetch(primaryUrl).then((res) => {
          if (!res.ok) throw new Error("Weather fetch failed");
          return res.json();
        }),
        fetchMetNoWeather(p, u),
      ]);

      if (primaryResult.status !== 'fulfilled') throw primaryResult.reason;

      const data = primaryResult.value;
      const idx = getCurrentHourIndex(data?.hourly?.time || []);
      const currentTime = data?.hourly?.time?.[idx];
      const temp = data?.current_weather?.temperature;
      const wind = data?.current_weather?.windspeed;
      const apparent = data?.hourly?.apparent_temperature?.[idx] ?? temp;
      const timezone = typeof data?.timezone === "string" ? data.timezone : undefined;
      
      const fallbackSunrise = Array.isArray(data?.daily?.sunrise) ? data.daily.sunrise.filter(Boolean) : [];
      const fallbackSunset = Array.isArray(data?.daily?.sunset) ? data.daily.sunset.filter(Boolean) : [];

      const sunEvents = computeSunEvents({
        timestamp: Date.now(),
        latitude: p.lat,
        longitude: p.lon,
        timeZone: timezone,
      });

      const toIsoList = (arr = []) =>
        arr
          .filter((value) => typeof value === "number" && Number.isFinite(value))
          .map((value) => new Date(value).toISOString());

      const sunriseTimes = sunEvents.sunrise.length ? toIsoList(sunEvents.sunrise) : fallbackSunrise;
      const sunsetTimes = sunEvents.sunset.length ? toIsoList(sunEvents.sunset) : fallbackSunset;
      const dawnTimes = toIsoList(sunEvents.civilDawn);
      const duskTimes = toIsoList(sunEvents.civilDusk);

      const times = data?.hourly?.time || [];
      const hourlyForecast = [];
      for (let offset = 0; offset < 48; offset += 1) {
        const hIdx = idx + offset;
        if (!times[hIdx]) break;
        hourlyForecast.push({
          time: times[hIdx],
          temperature: data?.hourly?.temperature_2m?.[hIdx],
          apparent: data?.hourly?.apparent_temperature?.[hIdx] ?? data?.hourly?.temperature_2m?.[hIdx],
          humidity: data?.hourly?.relative_humidity_2m?.[hIdx],
          wind: data?.hourly?.wind_speed_10m?.[hIdx],
          precipProb: data?.hourly?.precipitation_probability?.[hIdx],
          precip: data?.hourly?.precipitation?.[hIdx],
          uv: data?.hourly?.uv_index?.[hIdx],
          cloud: data?.hourly?.cloud_cover?.[hIdx],
          pressure: data?.hourly?.surface_pressure?.[hIdx],
          solarRadiation: data?.hourly?.shortwave_radiation?.[hIdx],
        });

        // Calculate solar elevation for this hourly slot
        const slotSolarElevation = computeSunEvents({
          timestamp: Date.parse(times[hIdx]),
          latitude: p.lat,
          longitude: p.lon,
          timeZone: timezone,
        }).solarElevation;

        // Log a warning if solarRadiation is 0 or undefined but solarElevation is positive
        if ((data?.hourly?.shortwave_radiation?.[hIdx] === 0 || data?.hourly?.shortwave_radiation?.[hIdx] === undefined) && slotSolarElevation > 0) {
          console.warn(
            `⚠️ Hourly forecast for ${new Date(times[hIdx]).toISOString()}: ` +
            `solarRadiation is ${data?.hourly?.shortwave_radiation?.[hIdx]} but solarElevation is ${slotSolarElevation}. ` +
            `This may lead to an inaccurate MRT for this hour if solar data is missing.`
          );
        }
      }

      const primaryWx = {
        provider: 'Open-Meteo',
        temperature: temp,
        apparent,
        wind,
        humidity: data?.hourly?.relative_humidity_2m?.[idx] ?? 50,
        precipProb: data?.hourly?.precipitation_probability?.[idx] ?? 0,
        precip: data?.hourly?.precipitation?.[idx] ?? 0,
        cloud: data?.hourly?.cloud_cover?.[idx] ?? 0,
        uv: data?.hourly?.uv_index?.[idx] ?? 0,
        pressure: data?.hourly?.surface_pressure?.[idx] ?? 1013.25,
        solarRadiation: data?.hourly?.shortwave_radiation?.[idx] ?? 0,
        isDay: data?.current_weather?.is_day === 1,
        sunriseTimes,
        sunsetTimes,
        dawnTimes,
        duskTimes,
        timezone,
        hourlyForecast,
      };

      let combined = { ...primaryWx };
      const sources = { primary: primaryWx };

      if (secondaryResult.status === 'fulfilled') {
        const secondaryWx = secondaryResult.value;
        sources.secondary = secondaryWx;
        combined = {
          ...blendWeather(primaryWx, secondaryWx),
          isDay: primaryWx.isDay,
          sunriseTimes,
          sunsetTimes,
          dawnTimes,
          duskTimes,
          timezone,
        };
      } else if (secondaryResult.status === 'rejected') {
        console.warn('Secondary weather source unavailable', secondaryResult.reason);
      }

      combined.hourlyForecast = hourlyForecast;
      const { provider: _ignoredProvider, ...finalWx } = combined;
      setWx({ ...finalWx, sources });
      setLastUpdated(Date.now());
    } catch (e) {
      console.error(e);
      setError("Couldn't load weather. Try again.");
    } finally {
      setLoading(false);
    }
  }, [place, unit]);
  
  // Reverse geocode coordinates to place name
  const reverseGeocode = useCallback(async (lat, lon) => {
    try {
      const params = new URLSearchParams({ format: "jsonv2", lat: String(lat), lon: String(lon) });
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
        headers: nominatimHeaders(),
      });
      if (!res.ok) throw new Error("Nominatim reverse geocode failed");
      const data = await res.json();
      const addr = data?.address;
      const locality = addr?.city || addr?.town || addr?.village || addr?.hamlet || addr?.municipality || addr?.suburb;
      const region = addr?.state || addr?.state_district || addr?.county;
      const fallback = typeof data?.display_name === "string" ? data.display_name.split(",")[0] : "";
      const name = [locality || fallback, region].filter(Boolean).join(", ") || fallback;
      if (name) {
        setPlace((p) => ({ ...p, name }));
      }
      return name;
    } catch (e) {
      console.warn('Reverse geocode failed', e);
      return null;
    }
  }, [setPlace]);
  
  // IP-based location fallback
  const ipLocationFallback = useCallback(async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      const d = await res.json();
      if (!d?.latitude) throw new Error("IP API failed");
      const nameGuess = d.city && d.region ? `${d.city}, ${d.region}` : "Approximate location";
      const p = { name: nameGuess, lat: d.latitude, lon: d.longitude, source: 'ip' };
      setPlace(p);
      await fetchWeather(p, unit);
      setError("Using approximate location. For GPS, enable location permissions.");
    } catch (e) {
      setError("Couldn't get your location. Please search a city.");
      await fetchWeather(DEFAULT_PLACE, unit);
    }
  }, [setPlace, fetchWeather, unit]);
  
  // Try to get GPS location
  const tryGeolocate = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!("geolocation" in navigator) || !window.isSecureContext) {
        await ipLocationFallback();
        return;
      }
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      
      // Set temporary location and fetch weather immediately
      const p = { name: "Current location", lat: latitude, lon: longitude, source: 'gps' };
      setPlace(p);
      fetchWeather(p, unit);

      // Get better name in background
      reverseGeocode(latitude, longitude);
    } catch (err) {
      await ipLocationFallback();
    } finally {
      setLoading(false);
    }
  }, [setPlace, fetchWeather, unit, reverseGeocode, ipLocationFallback]);
  
  // Search for city by name
  const searchCity = useCallback(async (query, setQuery) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "1", addressdetails: "1" });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: nominatimHeaders(),
      });
      const results = await res.json();
      const hit = Array.isArray(results) ? results[0] : null;
      if (!hit) throw new Error("No results");
      
      const addr = hit.address || {};
      const displayLocality = typeof hit.display_name === "string" ? hit.display_name.split(",")[0] : undefined;
      const locality = addr.city || addr.town || addr.village || addr.hamlet || addr.municipality || addr.suburb || displayLocality;
      const region = addr.state || addr.state_district || addr.county;
      const name = [locality, region].filter(Boolean).join(", ") || hit.display_name || query;
      const lat = parseFloat(hit.lat);
      const lon = parseFloat(hit.lon);
      if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error("Invalid coordinates");
      const p = { name, lat, lon, source: 'manual' };
      setPlace(p);
      setQuery(name);
      fetchWeather(p, unit);
    } catch (e) {
      setError("Couldn't find that place.");
    } finally {
      setLoading(false);
    }
  }, [setPlace, fetchWeather, unit]);
  
  // Handle tap-to-refresh
  const handleLocationRefresh = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    setError("");
    
    try {
      // Check if geolocation is available
      if (!("geolocation" in navigator) || !window.isSecureContext) {
        // Fallback: just refresh current place
        await fetchWeather(place, unit);
        setShowRefreshToast(true);
        setTimeout(() => setShowRefreshToast(false), 2000);
        setLoading(false);
        return;
      }

      // Get current position
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      
      // Set temporary location and fetch weather immediately
      const p = { name: "Current location", lat: latitude, lon: longitude, source: 'gps' };
      setPlace(p);
      fetchWeather(p, unit);
      
      // Get better name in background
      reverseGeocode(latitude, longitude);
      
      setShowRefreshToast(true);
      setTimeout(() => setShowRefreshToast(false), 2000);
    } catch (err) {
      console.error("Geolocation error:", err);
      // Fallback: just refresh current place
      await fetchWeather(place, unit);
      setShowRefreshToast(true);
      setTimeout(() => setShowRefreshToast(false), 2000);
    } finally {
      setLoading(false);
    }
  }, [loading, place, unit, fetchWeather, setPlace, reverseGeocode]);
  
  return {
    wx,
    setWx,
    loading,
    error,
    setError,
    lastUpdated,
    showRefreshToast,
    fetchWeather,
    searchCity,
    tryGeolocate,
    handleLocationRefresh,
    reverseGeocode,
  };
}

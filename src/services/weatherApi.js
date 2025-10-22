import { computeFeelsLike, msToMph, mmToInches, cToF, blendWeather, getCurrentHourIndex } from "../utils/helpers";
import { computeSunEvents } from "../utils/solar";

/**
 * Weather API Service
 * 
 * Handles fetching weather data from multiple sources:
 * - Open-Meteo (primary source)
 * - MET Norway (secondary/backup source)
 */

/**
 * Fetch weather from MET Norway API
 * 
 * @param {Object} location - Location object with lat/lon
 * @param {number} location.lat - Latitude
 * @param {number} location.lon - Longitude
 * @param {string} unit - Temperature unit ('F' or 'C')
 * @returns {Promise<Object>} Weather data from MET Norway
 */
export async function fetchMetNoWeather(location, unit) {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${location.lat}&lon=${location.lon}`;
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
 * Fetch comprehensive weather data from Open-Meteo API
 * 
 * @param {Object} location - Location object with lat/lon
 * @param {number} location.lat - Latitude
 * @param {number} location.lon - Longitude
 * @param {string} unit - Temperature unit ('F' or 'C')
 * @returns {Promise<Object>} Comprehensive weather data including hourly forecasts
 */
export async function fetchOpenMeteoWeather(location, unit) {
  const tempUnit = unit === "F" ? "fahrenheit" : "celsius";
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current_weather=true&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,cloud_cover,uv_index,wind_speed_10m,surface_pressure,shortwave_radiation&daily=sunrise,sunset&temperature_unit=${tempUnit}&windspeed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=3`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather fetch failed");
  return res.json();
}

/**
 * Fetch weather from both sources and blend results
 * 
 * @param {Object} location - Location object with lat/lon
 * @param {number} location.lat - Latitude
 * @param {number} location.lon - Longitude
 * @param {string} unit - Temperature unit ('F' or 'C')
 * @returns {Promise<Object>} Blended weather data with hourly forecasts
 */
export async function fetchWeather(location, unit) {
  // Fetch from both sources in parallel
  const [primaryResult, secondaryResult] = await Promise.allSettled([
    fetchOpenMeteoWeather(location, unit),
    fetchMetNoWeather(location, unit),
  ]);

  if (primaryResult.status !== 'fulfilled') {
    throw primaryResult.reason;
  }

  const data = primaryResult.value;
  const idx = getCurrentHourIndex(data?.hourly?.time || []);
  const currentTime = data?.hourly?.time?.[idx];
  const temp = data?.current_weather?.temperature;
  const wind = data?.current_weather?.windspeed;
  const apparent = data?.hourly?.apparent_temperature?.[idx] ?? temp;
  const timezone = typeof data?.timezone === "string" ? data.timezone : undefined;

  // Debug: Check current hour index and solar radiation
  if (process.env.NODE_ENV === 'development') {
    const solarAtIdx = data?.hourly?.shortwave_radiation?.[idx];
    const next12Solar = Array.from({ length: 12 }, (_, i) =>
      data?.hourly?.shortwave_radiation?.[idx + i]
    );

    // Weather Debug Log - comprehensive weather data for troubleshooting
  //   console.log('========================================');
  //   console.log('🌤️ WEATHER DEBUG LOG');
  //   console.log('========================================');
  //   console.log('📍 Location:', {
  //     lat: location.lat,
  //     lon: location.lon,
  //     timezone: timezone
  //   });
  //   console.log('⏰ Timestamp:', {
  //     arrayIndex: idx,
  //     apiTime: currentTime,
  //     localTime: new Date().toISOString(),
  //     isDaytime: data?.current_weather?.is_day === 1
  //   });
  //   console.log('🌡️ Temperature:', {
  //     current: data?.hourly?.temperature_2m?.[idx] + '°C',
  //     apparent: data?.hourly?.apparent_temperature?.[idx] + '°C',
  //     dewPoint: data?.hourly?.dew_point_2m?.[idx] + '°C'
  //   });
  //   console.log('💧 Moisture:', {
  //     humidity: data?.hourly?.relative_humidity_2m?.[idx] + '%',
  //     precipProb: data?.hourly?.precipitation_probability?.[idx] + '%',
  //     precip: data?.hourly?.precipitation?.[idx] + ' mm'
  //   });
  //   console.log('💨 Wind:', {
  //     speed: data?.hourly?.wind_speed_10m?.[idx] + ' km/h',
  //     direction: data?.hourly?.wind_direction_10m?.[idx] + '°',
  //     gusts: data?.hourly?.wind_gusts_10m?.[idx] + ' km/h'
  //   });
  //   console.log('☁️ Sky:', {
  //     cloudCover: data?.hourly?.cloud_cover?.[idx] + '%',
  //     visibility: data?.hourly?.visibility?.[idx] + ' m',
  //     weatherCode: data?.hourly?.weather_code?.[idx]
  //   });
  //   console.log('☀️ Radiation:', {
  //     current: solarAtIdx + ' W/m²',
  //     uvIndex: data?.daily?.uv_index_max?.[0],
  //     next3Hours: next12Solar.slice(0, 3).map((s, i) => 
  //       data?.hourly?.time?.[idx + i] + ': ' + (s || 0).toFixed(1) + ' W/m²'
  //     )
  //   });
  //   console.log('🌅 Sun Events:', {
  //     sunrise: data?.daily?.sunrise?.[0],
  //     sunset: data?.daily?.sunset?.[0],
  //     daylight: data?.daily?.daylight_duration?.[0] + ' sec'
  //   });
  //   console.log('📊 Pressure:', {
  //     surfacePressure: data?.hourly?.surface_pressure?.[idx] + ' hPa',
  //     pressureMsl: data?.hourly?.pressure_msl?.[idx] + ' hPa'
  //   });
  //   console.log('========================================');
  // }

  const fallbackSunrise = Array.isArray(data?.daily?.sunrise) ? data.daily.sunrise.filter(Boolean) : [];
  const fallbackSunset = Array.isArray(data?.daily?.sunset) ? data.daily.sunset.filter(Boolean) : [];

  const sunEvents = computeSunEvents({
    timestamp: Date.now(),
    latitude: location.lat,
    longitude: location.lon,
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

  // Build hourly forecast (48 hours for tomorrow's outfit)
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

  // Blend with secondary source if available
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
  
  return { ...finalWx, sources };
}

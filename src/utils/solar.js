const DAY_MS = 24 * 60 * 60 * 1000;

const degToRad = (deg) => (deg * Math.PI) / 180;
const radToDeg = (rad) => (rad * 180) / Math.PI;

const wrap360 = (x) => {
  const wrapped = x % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
};

const julianDay = (year, month, day) => {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    B -
    1524.5
  );
};

const sunGeometry = (T) => {
  const M = wrap360(357.52911 + T * (35999.05029 - 0.0001537 * T));
  const C =
    (1.914602 - T * (0.004817 + 0.000014 * T)) * Math.sin(degToRad(M)) +
    (0.019993 - 0.000101 * T) * Math.sin(degToRad(2 * M)) +
    0.000289 * Math.sin(degToRad(3 * M));
  const lambda = wrap360(280.46646 + T * (36000.76983 + 0.0003032 * T) + C);
  const omega = 125.04 - 1934.136 * T;
  const lambdaApp = lambda - 0.00569 - 0.00478 * Math.sin(degToRad(omega));
  const U = T / 100;
  const eps0 =
    23 +
    (26 +
      (21.448 -
        U * (46.815 + U * (0.00059 - 0.001813 * U))) /
        60) /
      60;
  const eps = eps0 + 0.00256 * Math.cos(degToRad(omega));
  const sinDelta = Math.sin(degToRad(eps)) * Math.sin(degToRad(lambdaApp));
  const delta = radToDeg(Math.asin(sinDelta));

  const y = Math.tan(degToRad(eps / 2)) ** 2;
  const L0 = wrap360(280.46646 + T * (36000.76983 + 0.0003032 * T));
  const E =
    4 *
    radToDeg(
      y * Math.sin(degToRad(2 * L0)) -
        2 * 0.016708634 * Math.sin(degToRad(M)) +
        4 * 0.016708634 * y * Math.sin(degToRad(M)) * Math.cos(degToRad(2 * L0)) -
        0.5 * y * y * Math.sin(degToRad(4 * L0)) -
        1.25 * 0.016708634 ** 2 * Math.sin(degToRad(2 * M))
    );

  return { declination: delta, equationOfTimeMinutes: E };
};

const hourAngle = (latDeg, declinationDeg, altitudeDeg) => {
  const lat = degToRad(latDeg);
  const dec = degToRad(declinationDeg);
  const h0 = degToRad(altitudeDeg);
  const cosH =
    (Math.sin(h0) - Math.sin(lat) * Math.sin(dec)) /
    (Math.cos(lat) * Math.cos(dec));
  if (cosH < -1) return { angle: null, status: "always_above" };
  if (cosH > 1) return { angle: null, status: "never_reaches" };
  return { angle: radToDeg(Math.acos(cosH)), status: null };
};

const solarNoonUTC = (year, month, day, longitudeDeg, equationOfTimeMinutes) => {
  const minutes = 720 - 4 * longitudeDeg - equationOfTimeMinutes;
  const base = Date.UTC(year, month - 1, day);
  return new Date(base + minutes * 60 * 1000);
};

const solarEventTimeUTC = ({
  year,
  month,
  day,
  latitude,
  longitude,
  altitudeDeg,
  branch,
}) => {
  const jd = julianDay(year, month, day);
  const T = (jd - 2451545.0) / 36525.0;
  const { declination, equationOfTimeMinutes } = sunGeometry(T);
  const { angle, status } = hourAngle(latitude, declination, altitudeDeg);
  if (status || angle == null) return { time: null, status };

  const noonUtc = solarNoonUTC(year, month, day, longitude, equationOfTimeMinutes);
  const deltaHours = angle / 15;
  const modifier = branch === "rise" ? -1 : 1;
  const eventUtc = new Date(noonUtc.getTime() + modifier * deltaHours * 60 * 60 * 1000);
  return { time: eventUtc.getTime(), status: null };
};

const zonedDateFormatterCache = new Map();

const getZonedFormatter = (timeZone, optsKey, options) => {
  const key = `${timeZone}__${optsKey}`;
  if (zonedDateFormatterCache.has(key)) return zonedDateFormatterCache.get(key);
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone, ...options });
  zonedDateFormatterCache.set(key, formatter);
  return formatter;
};

const getZonedDateParts = (timeZone, timestamp) => {
  const formatter = getZonedFormatter(timeZone, "ymd", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date(timestamp));
  const data = {};
  for (const part of parts) {
    if (part.type === "year" || part.type === "month" || part.type === "day") {
      data[part.type] = Number(part.value);
    }
  }
  return data;
};

const normalizeTimeZone = (timeZone) => {
  if (typeof timeZone === "string" && timeZone.trim().length > 0) return timeZone;
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
};

export function computeSunEvents({ timestamp = Date.now(), latitude, longitude, timeZone }) {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return {
      sunrise: [],
      sunset: [],
      civilDawn: [],
      civilDusk: [],
    };
  }

  const tz = normalizeTimeZone(timeZone);
  const dayOffsets = [0, 1];
  const results = {
    sunrise: [],
    sunset: [],
    civilDawn: [],
    civilDusk: [],
  };

  for (const offset of dayOffsets) {
    const dayTimestamp = timestamp + offset * DAY_MS;
    const { year, month, day } = getZonedDateParts(tz, dayTimestamp);
    if (!year || !month || !day) continue;

    const baseArgs = { year, month, day, latitude, longitude };

    const sunrise = solarEventTimeUTC({
      ...baseArgs,
      altitudeDeg: -0.833,
      branch: "rise",
    });
    if (sunrise.time != null) results.sunrise.push(sunrise.time);

    const sunset = solarEventTimeUTC({
      ...baseArgs,
      altitudeDeg: -0.833,
      branch: "set",
    });
    if (sunset.time != null) results.sunset.push(sunset.time);

    const civilDawn = solarEventTimeUTC({
      ...baseArgs,
      altitudeDeg: -6,
      branch: "rise",
    });
    if (civilDawn.time != null) results.civilDawn.push(civilDawn.time);

    const civilDusk = solarEventTimeUTC({
      ...baseArgs,
      altitudeDeg: -6,
      branch: "set",
    });
    if (civilDusk.time != null) results.civilDusk.push(civilDusk.time);
  }

  const sortAsc = (arr) => arr.sort((a, b) => a - b);
  results.sunrise = sortAsc(results.sunrise);
  results.sunset = sortAsc(results.sunset);
  results.civilDawn = sortAsc(results.civilDawn);
  results.civilDusk = sortAsc(results.civilDusk);

  return results;
}

export function nextEventAfter(times = [], now = Date.now()) {
  return times.find((t) => t > now) ?? null;
}

/**
 * Calculate the current solar elevation angle (altitude) above the horizon
 * @param {number} latitude - Latitude in degrees
 * @param {number} longitude - Longitude in degrees
 * @param {number} timestamp - Time in milliseconds since epoch (default: now)
 * @returns {number} Solar elevation angle in degrees (-90 to +90). Negative values mean sun is below horizon.
 */
export function calculateSolarElevation({ latitude, longitude, timestamp = Date.now() }) {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();

  // Calculate Julian day
  const jd = julianDay(year, month, day);
  
  // Time in decimal hours (UTC)
  const utcTime = hours + minutes / 60 + seconds / 3600;
  
  // Julian centuries since J2000.0
  const T = (jd - 2451545.0) / 36525.0;
  
  // Get solar declination and equation of time
  const { declination, equationOfTimeMinutes } = sunGeometry(T);
  
  // Calculate local solar time
  // Solar time = UTC time + longitude correction + equation of time
  const longitudeCorrection = longitude / 15.0; // 15 degrees per hour
  const solarTime = utcTime + longitudeCorrection + equationOfTimeMinutes / 60.0; // eot in minutes
  
  // Hour angle in degrees (15 degrees per hour from solar noon)
  const hourAngleDeg = (solarTime - 12.0) * 15.0;
  
  // Convert to radians
  const latRad = degToRad(latitude);
  const decRad = degToRad(declination);
  const haRad = degToRad(hourAngleDeg);
  
  // Calculate solar elevation angle using the formula:
  // sin(elevation) = sin(latitude) * sin(declination) + cos(latitude) * cos(declination) * cos(hourAngle)
  const sinElevation = Math.sin(latRad) * Math.sin(decRad) + 
                       Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  
  const elevationRad = Math.asin(sinElevation);
  const elevationDeg = radToDeg(elevationRad);
  
  return elevationDeg;
}

/**
 * Calculate moon position (altitude and azimuth)
 * Based on simplified lunar position algorithm
 * @param {number} latitude - Latitude in degrees
 * @param {number} longitude - Longitude in degrees  
 * @param {number} timestamp - Time in milliseconds since epoch (default: now)
 * @returns {object} { altitude: degrees above horizon, azimuth: degrees from north, isVisible: boolean }
 */
export function calculateMoonPosition({ latitude, longitude, timestamp = Date.now() }) {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  const date = new Date(timestamp);
  
  // Julian day calculation
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  
  const jd = julianDay(year, month, day);
  const timeOfDay = hours / 24 + minutes / 1440 + seconds / 86400;
  const jdTotal = jd + timeOfDay;
  
  // Days since J2000.0
  const d = jdTotal - 2451545.0;
  
  // Simplified moon orbital elements
  // Mean longitude
  const L = wrap360(218.316 + 13.176396 * d);
  // Mean anomaly
  const M = wrap360(134.963 + 13.064993 * d);
  // Mean distance (argument of latitude)
  const F = wrap360(93.272 + 13.229350 * d);
  
  // Ecliptic longitude
  const lonEcl = wrap360(
    L + 
    6.289 * Math.sin(degToRad(M)) +
    1.274 * Math.sin(degToRad(2 * d - M)) +
    0.658 * Math.sin(degToRad(2 * d)) +
    0.214 * Math.sin(degToRad(2 * M))
  );
  
  // Ecliptic latitude
  const latEcl = 
    5.128 * Math.sin(degToRad(F)) +
    0.280 * Math.sin(degToRad(M + F)) +
    0.277 * Math.sin(degToRad(M - F));
  
  // Obliquity of ecliptic
  const obliq = 23.439 - 0.0000004 * d;
  
  // Convert ecliptic to equatorial coordinates
  const lonEclRad = degToRad(lonEcl);
  const latEclRad = degToRad(latEcl);
  const obliqRad = degToRad(obliq);
  
  // Right ascension
  const raRad = Math.atan2(
    Math.sin(lonEclRad) * Math.cos(obliqRad) - Math.tan(latEclRad) * Math.sin(obliqRad),
    Math.cos(lonEclRad)
  );
  const ra = radToDeg(raRad);
  
  // Declination
  const decRad = Math.asin(
    Math.sin(latEclRad) * Math.cos(obliqRad) + 
    Math.cos(latEclRad) * Math.sin(obliqRad) * Math.sin(lonEclRad)
  );
  const dec = radToDeg(decRad);
  
  // Calculate local sidereal time
  const gmst = wrap360(280.46061837 + 360.98564736629 * d + longitude);
  const lst = gmst;
  
  // Hour angle
  const ha = wrap360(lst - ra);
  const haRad = degToRad(ha);
  
  // Convert to horizontal coordinates (altitude and azimuth)
  const latRad = degToRad(latitude);
  
  // Altitude (elevation angle)
  const sinAlt = Math.sin(latRad) * Math.sin(decRad) + 
                 Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const altitude = radToDeg(Math.asin(sinAlt));
  
  // Azimuth (bearing from north)
  const azimuthRad = Math.atan2(
    Math.sin(haRad),
    Math.cos(haRad) * Math.sin(latRad) - Math.tan(decRad) * Math.cos(latRad)
  );
  const azimuth = wrap360(radToDeg(azimuthRad) + 180); // Convert to 0-360 from north
  
  // Moon is visible if altitude > -0.833 degrees (accounting for atmospheric refraction)
  const isVisible = altitude > -0.833;
  
  return {
    altitude: Math.round(altitude * 10) / 10, // Round to 1 decimal
    azimuth: Math.round(azimuth * 10) / 10,
    isVisible,
    direction: getCardinalDirection(azimuth)
  };
}

/**
 * Convert azimuth to cardinal direction
 * @param {number} azimuth - Azimuth in degrees (0-360)
 * @returns {string} Cardinal direction (N, NE, E, SE, S, SW, W, NW)
 */
function getCardinalDirection(azimuth) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(azimuth / 45) % 8;
  return directions[index];
}


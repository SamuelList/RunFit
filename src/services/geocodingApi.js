import { nominatimHeaders } from "../utils/constants";

/**
 * Geocoding API Service
 * 
 * Handles location services:
 * - Reverse geocoding (coordinates to place name)
 * - Forward geocoding (city search to coordinates)
 * - IP-based location fallback
 */

/**
 * Convert coordinates to a place name using Nominatim reverse geocoding
 * 
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<string>} Formatted place name (e.g., "Seattle, Washington")
 */
export async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
  const res = await fetch(url, { headers: nominatimHeaders() });
  if (!res.ok) return "";

  const data = await res.json();
  const addr = data?.address || {};
  const locality = addr.city || addr.town || addr.village || "";
  const region = addr.state || addr.county || "";

  if (!locality && !region) return "";
  if (!locality) return region;
  if (!region) return locality;
  return `${locality}, ${region}`;
}

/**
 * Search for a city and return its coordinates
 * 
 * @param {string} query - City name to search for
 * @returns {Promise<Object|null>} Location object {name, lat, lon, source: 'manual'} or null if not found
 */
export async function searchCity(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    query
  )}&format=jsonv2&limit=1&addressdetails=1`;
  const res = await fetch(url, { headers: nominatimHeaders() });
  if (!res.ok) throw new Error("Couldn't find that place.");

  const data = await res.json();
  if (!Array.isArray(data) || !data.length) throw new Error("Couldn't find that place.");

  const result = data[0];
  const addr = result?.address || {};
  const cityName =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.hamlet ||
    addr.municipality ||
    addr.suburb ||
    "";
  const stateName = addr.state || addr.county || "";

  const lat = parseFloat(result.lat);
  const lon = parseFloat(result.lon);

  if (isNaN(lat) || isNaN(lon)) {
    throw new Error("Couldn't find that place.");
  }

  let name = "";
  if (cityName && stateName) {
    name = `${cityName}, ${stateName}`;
  } else if (cityName) {
    name = cityName;
  } else if (stateName) {
    name = stateName;
  } else {
    name = result.display_name || "Unknown Location";
  }

  return { name, lat, lon, source: "manual" };
}

/**
 * Get approximate location using IP geolocation as fallback
 * 
 * @param {Object} defaultPlace - Default location to use if IP lookup fails
 * @returns {Promise<Object>} Location object {name, lat, lon, source: 'ip'}
 */
export async function ipLocationFallback(defaultPlace) {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) throw new Error("IP location failed");

    const data = await res.json();
    const lat = parseFloat(data.latitude);
    const lon = parseFloat(data.longitude);
    
    if (isNaN(lat) || isNaN(lon)) {
      throw new Error("Invalid coordinates from IP API");
    }

    const name = [data.city, data.region].filter(Boolean).join(", ") || "Your Location";
    
    return { 
      name, 
      lat, 
      lon, 
      source: "ip",
      isApproximate: true 
    };
  } catch (err) {
    console.warn("IP fallback failed, using default:", err);
    return { ...defaultPlace, source: "default" };
  }
}

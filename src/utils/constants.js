import { Wind, CloudRain, Sun } from "lucide-react";

// App version for cache management
export const APP_VERSION = "1.2.1";

// Default location
export const DEFAULT_PLACE = { 
  name: "Kansas City, MO", 
  lat: 39.0997, 
  lon: -94.5786, 
  source: 'default' 
};

// Default settings
export const DEFAULT_SETTINGS = {
  place: DEFAULT_PLACE,
  query: "Kansas City, MO",
  unit: "F",
  coldHands: false,
  gender: "Female",
  customTempEnabled: false,
  customTempInput: "",
  activeOption: "A",
  theme: "dark",
  twilightTerms: "dawn-dusk",
  tempSensitivity: 0,
  runnerBoldness: 0,
  runHoursStart: 4,
  runHoursEnd: 20,
  showTomorrowOutfit: true,
  tomorrowRunHour: 6,
  tomorrowRunType: "easy",
  smartNightCard: true
};

// Forecast alert metadata
export const FORECAST_ALERT_META = {
  wind: {
    Icon: Wind,
    badgeClass: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/20 dark:text-sky-200",
    iconClass: "text-sky-500 dark:text-sky-300",
    label: "Wind",
  },
  rain: {
    Icon: CloudRain,
    badgeClass: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/20 dark:text-indigo-200",
    iconClass: "text-indigo-500 dark:text-indigo-300",
    label: "Precip",
  },
  uv: {
    Icon: Sun,
    badgeClass: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-200",
    iconClass: "text-amber-500 dark:text-amber-300",
    label: "UV",
  },
};

// HTTP headers for Nominatim geocoding
export const nominatimHeaders = () => ({
  "User-Agent": `SamsFitCast/1.0 (${window.location.href})`,
  "Accept-Language": "en",
});

import { clamp } from './helpers';
import { 
  HEAT_PENALTY_MAX_TEMP, 
  COLD_PENALTY_MAX_MULTIPLIER, 
  COLD_PENALTY_WIDTH_WORKOUT, 
  COLD_PENALTY_WIDTH_EASY,
  IDEAL_TEMP_WORKOUT,
  IDEAL_TEMP_LONG_RUN,
  IDEAL_TEMP_EASY,
  DEW_POINT_COMFORTABLE,
  DEW_POINT_SLIGHTLY_MUGGY,
  DEW_POINT_MODERATE,
  DEW_POINT_MUGGY,
  DEW_POINT_VERY_HUMID,
  DEW_POINT_OPPRESSIVE,
  DEW_POINT_PENALTY_COMFORTABLE,
  DEW_POINT_PENALTY_SLIGHTLY_MUGGY,
  DEW_POINT_PENALTY_MODERATE,
  DEW_POINT_PENALTY_MUGGY,
  DEW_POINT_PENALTY_VERY_HUMID,
  DEW_POINT_PENALTY_OPPRESSIVE,
  DEW_POINT_PENALTY_DANGEROUS
} from '../App';

// Calculate dew point from temperature and humidity
function dewPointF(tempF, humidity) {
  const tempC = (tempF - 32) * 5 / 9;
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * tempC) / (b + tempC)) + Math.log(humidity / 100);
  const dewPointC = (b * alpha) / (a - alpha);
  return (dewPointC * 9 / 5) + 32;
}

/**
 * Feels-like temperature (standards-based, shade).
 *
 * Methods used:
 *  - Wind Chill (NWS/MSC 2001) when T <= 10°C and wind >= 4.8 km/h
 *  - Heat Index (NOAA/NWS Rothfusz + adjustments) when T >= 27°C (≈80°F)
 *    and humidity meaningfully contributes (RH >= ~40%)
 *  - Steadman Apparent Temperature (BoM) otherwise
 *
 * Inputs:
 *  tempC        : Air temperature in °C (2 m standard)
 *  relHum       : Relative humidity in % (0..100)
 *  windMps      : Wind speed in m/s measured near 10 m. If measured at ~2 m,
 *                 pass options.windHeightMeters=2 to scale to 10 m.
 *
 * Options:
 *  windHeightMeters : Height (m) your wind was measured at. Default 10.
 *  clamp            : Clamp RH to [0,100], wind >= 0. Default true.
 *
 * Returns:
 *  { feelsLikeC, feelsLikeF, method } // method ∈ "wind_chill" | "heat_index" | "apparent_temp"
 */
function feelsLike(tempC, relHum, windMps, options = {}) {
  const opt = { windHeightMeters: 10, clamp: true, ...options };

  // ---- Guards & cleaning ----
  let T = Number(tempC);
  let RH = Number(relHum);
  let V = Math.max(0, Number(windMps));

  if (opt.clamp) {
    if (!Number.isFinite(T)) T = 0;
    if (!Number.isFinite(RH)) RH = 0;
    RH = Math.max(0, Math.min(100, RH));
    if (!Number.isFinite(V)) V = 0;
  }

  // Scale wind to 10 m if needed (neutral log profile, short grass)
  V = scaleWindTo10m(V, opt.windHeightMeters);

  // ---- Choose method ----
  const windKmh = mpsToKmh(V);
  if (T <= 10 && windKmh >= 4.8) {
    const wc = windChillC(T, V);
    return { feelsLikeC: wc, feelsLikeF: cToF(wc), method: "wind_chill" };
  }

  if (T >= 27 && RH >= 40) {
    const hi = heatIndexC(T, RH);
    return { feelsLikeC: hi, feelsLikeF: cToF(hi), method: "heat_index" };
  }

  const at = apparentTempC(T, RH, V);
  return { feelsLikeC: at, feelsLikeF: cToF(at), method: "apparent_temp" };

  // ---- Helpers ----

  // Wind Chill (NWS/MSC 2001): valid for T<=10°C and V>=4.8 km/h
  function windChillC(tC, vMps) {
    const vKmh = mpsToKmh(vMps);
    // WCI (°C) = 13.12 + 0.6215*T - 11.37*V^0.16 + 0.3965*T*V^0.16  (V in km/h)
    const v016 = Math.pow(vKmh, 0.16);
    return 13.12 + 0.6215 * tC - 11.37 * v016 + 0.3965 * tC * v016;
  }

  // Heat Index (NOAA/NWS Rothfusz regression) in °C
  function heatIndexC(tC, rh) {
    const tF = cToF(tC);

    // Simple Steadman approximation for mild cases
    const simple = 0.5 * (tF + 61.0 + ((tF - 68.0) * 1.2) + (rh * 0.094));
    let hiF;
    if ((simple + tF) / 2 < 80) {
      hiF = simple;
    } else {
      // Rothfusz regression (T in °F, RH in %)
      hiF =
        -42.379 +
        2.04901523 * tF +
        10.14333127 * rh -
        0.22475541 * tF * rh -
        0.00683783 * tF * tF -
        0.05481717 * rh * rh +
        0.00122874 * tF * tF * rh +
        0.00085282 * tF * rh * rh -
        0.00000199 * tF * tF * rh * rh;

      // Adjustments per NWS
      if (rh < 13 && tF >= 80 && tF <= 112) {
        const adj =
          ((13 - rh) / 4) *
          Math.sqrt((17 - Math.abs(tF - 95)) / 17);
        hiF -= adj;
      } else if (rh > 85 && tF >= 80 && tF <= 87) {
        const adj =
          ((rh - 85) / 10) * ((87 - tF) / 5);
        hiF += adj;
      }
    }
    return fToC(hiF);
  }

  // Apparent Temperature (BoM Steadman, shade)
  // AT (°C) = T + 0.33*e - 0.70*wind - 4.00
  // where e is water vapour pressure in hPa: e = RH/100 * 6.105 * exp(17.27*T / (237.7 + T))
  // wind is m/s at 10 m
  function apparentTempC(tC, rh, vMps) {
    const e = (rh / 100) * 6.105 * Math.exp((17.27 * tC) / (237.7 + tC));
    return tC + 0.33 * e - 0.70 * vMps - 4.00;
  }

  // Wind height scaling to 10 m using neutral log profile; z0≈0.03 m (short grass)
  function scaleWindTo10m(vMps, measuredHeightM = 10) {
    if (!Number.isFinite(measuredHeightM) || measuredHeightM <= 0) return vMps;
    if (Math.abs(measuredHeightM - 10) < 1e-6) return vMps;
    const z0 = 0.03; // surface roughness (m), tweak if you know your site
    const factor = Math.log(10 / z0) / Math.log(measuredHeightM / z0);
    return vMps * factor;
  }

  // Unit helpers
  function mpsToKmh(v) { return v * 3.6; }
  function cToF(c) { return (c * 9) / 5 + 32; }
  function fToC(f) { return (f - 32) * 5 / 9; }
}


// Comprehensive WBGT calculation using Liljegren et al. (2008) physically-based model
// Gold standard estimation from standard weather inputs
// Returns WBGT for outdoor (sun) and indoor (shade) conditions
function wbgtFromMet({
  taC,                 // air temperature, °C
  rh = null,           // relative humidity, 0..1 (use either rh or tdC)
  tdC = null,          // dew point, °C
  windMs,              // wind speed at ~2 m, m/s
  pressureKPa = 101.325,  // barometric pressure, kPa
  shortwaveWm2 = 0,    // global horizontal solar, W/m^2 (0 for indoor/shade)
  cloudFraction = 0.3, // 0..1, used for sky emissivity tweak
  globeDiamM = 0.15,   // ISO globe diameter (150 mm)
  wickDiamM = 0.007,   // typical natural wet-bulb wick diameter (~7 mm)
} = {}) {
  // --- constants
  const sigma = 5.670374419e-8; // W m^-2 K^-4
  const Rd = 287.04;            // J kg^-1 K^-1
  const Rv = 461.5;             // J kg^-1 K^-1
  const cp = 1005;              // J kg^-1 K^-1 (dry air)
  const g = 9.80665;            // m s^-2
  const Pr = 0.71;              // Prandtl number (air, ~constant)
  const eps_globe = 0.95;       // emissivity, black globe
  const alpha_globe = 0.95;     // shortwave absorptivity, black globe
  const eps_wick = 0.95;        // emissivity of wet wick
  const alpha_wick = 0.95;      // shortwave absorptivity of wet wick
  const eps_ground = 0.97;      // emissivity of ground/walls
  const albedo_ground = 0.2;    // effective shortwave ground albedo
  const PPa = pressureKPa * 1000; // Pa
  const taK = taC + 273.15;

  // --- humidity / vapor pressure
  function esatPa(Tc) {
    // Magnus (over water), Pa
    return 611.21 * Math.exp((17.502 * Tc) / (240.97 + Tc));
  }
  const eaPa = (() => {
    if (tdC != null) return esatPa(tdC);
    if (rh != null) return rh * esatPa(taC);
    throw new Error("Provide either rh (0..1) or tdC.");
  })();

  // --- air properties at Ta
  function airProps(Tk) {
    // dynamic viscosity via Sutherland (kg m^-1 s^-1)
    const mu = 1.458e-6 * Math.pow(Tk, 1.5) / (Tk + 110.4);
    const rho = PPa / (Rd * Tk);
    const nu = mu / rho;                      // kinematic viscosity, m^2/s
    const k = 0.0241 + 7.72e-5 * (Tk - 273.15); // thermal conductivity, W m^-1 K^-1
    // water vapor diffusion coefficient in air (m^2/s), temperature dependent
    const Dv = 2.26e-5 * Math.pow(Tk / 273.15, 1.81);
    const Sc = nu / Dv;                       // Schmidt number
    return { mu, rho, nu, k, Dv, Sc };
  }
  const ap = airProps(taK);

  // --- sky longwave emissivity (clear-sky Brutsaert; cloud adjustment)
  function skyEmissivity(Tk, ea) {
    const e_hPa = ea / 100.0;
    const eps_clear = Math.min(1, 1.24 * Math.pow((e_hPa / Tk), 1 / 7)); // Brutsaert
    return (1 - cloudFraction) * eps_clear + cloudFraction * 1.0; // clouds ~ blackbody
  }
  const eps_sky = skyEmissivity(taK, eaPa);

  // --- helper: Nu, Sh for crossflow over cylinder / sphere
  // Sphere forced convection (Whitaker)
  function NuSphereForced(Re, Pr) {
    return 2 + (0.4 * Math.pow(Re, 0.5) + 0.06 * Math.pow(Re, 2 / 3)) * Math.pow(Pr, 0.4);
  }
  // Cylinder crossflow forced convection (Zukauskas/Churchill-Bernstein blend)
  function NuCylForced(Re, Pr) {
    // Churchill–Bernstein for cylinders across flow
    return 0.3 + (0.62 * Math.pow(Re, 0.5) * Math.pow(Pr, 1 / 3)) /
      Math.pow(1 + Math.pow(0.4 / Pr, 2 / 3), 1 / 4) *
      Math.pow(1 + Math.pow(Re / 282000, 5 / 8), 4 / 5);
  }
  // Natural convection contribution (cylinder/sphere, order-of-magnitude)
  function NuFree(Gr, Pr) {
    return 2 + 0.43 * Math.pow(Gr * Pr, 0.25);
  }
  // Combine forced + free (pow-3 sum)
  function combineNu(NuF, NuN) {
    return Math.pow(Math.pow(NuF, 3) + Math.pow(NuN, 3), 1 / 3);
  }

  // --- generic convective / mass-transfer coefficients
  function hConvSphere(TsK, D, v) {
    const filmK = 0.5 * (taK + TsK);
    const a = airProps(filmK);
    const Re = Math.max(1e-6, v * D / a.nu);
    const NuF = NuSphereForced(Re, Pr);
    // Grashof uses |ΔT|
    const beta = 1 / filmK;
    const Gr = (g * beta * Math.max(1, Math.abs(taK - TsK)) * Math.pow(D, 3)) / (a.nu * a.nu);
    const NuN = NuFree(Gr, Pr);
    const Nu = combineNu(NuF, NuN);
    return Nu * a.k / D; // W m^-2 K^-1
  }
  function hConvCyl(TsK, D, v) {
    const filmK = 0.5 * (taK + TsK);
    const a = airProps(filmK);
    const Re = Math.max(1e-6, v * D / a.nu);
    const NuF = NuCylForced(Re, Pr);
    const beta = 1 / filmK;
    const Gr = (g * beta * Math.max(1, Math.abs(taK - TsK)) * Math.pow(D, 3)) / (a.nu * a.nu);
    const NuN = NuFree(Gr, Pr);
    const Nu = combineNu(NuF, NuN);
    return Nu * a.k / D;
  }
  function hMass(D, v, TsK, isSphere) {
    // Sherwood via analogy (Sh ~ Nu with Pr→Sc), then km = Sh*Dv/D (m/s)
    const filmK = 0.5 * (taK + TsK);
    const a = airProps(filmK);
    const Re = Math.max(1e-6, v * D / a.nu);
    const Sc = a.Sc;
    const ShF = isSphere
      ? (2 + (0.4 * Math.pow(Re, 0.5) + 0.06 * Math.pow(Re, 2 / 3)) * Math.pow(Sc, 0.4))
      : (0.3 + (0.62 * Math.pow(Re, 0.5) * Math.pow(Sc, 1 / 3)) /
         Math.pow(1 + Math.pow(0.4 / Sc, 2 / 3), 1 / 4) *
         Math.pow(1 + Math.pow(Re / 282000, 5 / 8), 4 / 5));
    // free-convection analog (rough)
    const beta = 1 / filmK;
    const Gr = (g * beta * Math.max(1, Math.abs(taK - TsK)) * Math.pow(D, 3)) / (a.nu * a.nu);
    const ShN = 2 + 0.43 * Math.pow(Gr * Sc, 0.25);
    const Sh = combineNu(ShF, ShN); // same combiner
    return (Sh * a.Dv) / D; // m/s
  }

  // --- latent heat of vaporization (J/kg) at film temperature
  function Lv(Tk) {
    const Tc = Tk - 273.15;
    return (2.501e6 - 2.361e3 * Tc); // linear approx
  }

  // --- shortwave absorption per unit area
  // For a sphere/cylinder, the average projected area ≈ 1/4 of surface area.
  // Include a simple ground-reflected component via albedo.
  function absorbedShortwave(alpha, Kgh) {
    const view = 0.25; // geometric factor
    return alpha * Kgh * (view + view * albedo_ground); // W/m^2
  }

  // --- longwave exchange term with sky & ground at Ta (emissivities applied)
  function netLongwave(eps, TsK) {
    const Ldown = eps_sky * sigma * Math.pow(taK, 4);
    const Lup   = eps_ground * sigma * Math.pow(taK, 4);
    // two-sided view (sky + ground) minus emission
    return eps * (Ldown + Lup - 2 * sigma * Math.pow(TsK, 4));
  }

  // --- vapor concentration (kg/m^3) from partial pressure
  function rhoVapor(Tk, ePa) {
    return ePa / (Rv * Tk);
  }

  // --- Solve Tg (black globe) from energy balance: conv + longwave + shortwave = 0
  function solveGlobe() {
    const Kabs = absorbedShortwave(alpha_globe, shortwaveWm2);
    const D = globeDiamM;
    const v = Math.max(0.05, windMs); // prevent zero
    const f = (TgK) => {
      const hc = hConvSphere(TgK, D, v);
      const Hc = hc * (taK - TgK);
      const Hr = netLongwave(eps_globe, TgK);
      return Hc + Hr + Kabs; // = 0 at equilibrium
    };
    return bisectK(f, taK - 40, taK + 60) - 273.15;
  }

  // --- Solve Tnwb (natural wet-bulb) with energy balance: conv + longwave + shortwave - evaporative = 0
  function solveNWB() {
    const Kabs = absorbedShortwave(alpha_wick, shortwaveWm2);
    const D = wickDiamM;
    const v = Math.max(0.05, windMs);
    const f = (TwK) => {
      const hc = hConvCyl(TwK, D, v);
      const Hc = hc * (taK - TwK);
      const Hr = netLongwave(eps_wick, TwK);
      // mass-transfer (kg/m2/s): km * (rho_vs(Tw) - rho_va)
      const km = hMass(D, v, TwK, false);
      const rho_vs = rhoVapor(TwK, esatPa(TwK - 273.15));
      const rho_va = rhoVapor(taK, eaPa);
      const Evap = Lv(TwK) * km * Math.max(0, (rho_vs - rho_va)); // W/m^2
      return Hc + Hr + Kabs - Evap; // = 0 at equilibrium
    };
    // NWB must be <= Ta; bracket below Ta
    const lower = Math.max(taK - 60, 250);
    const upper = taK;
    return bisectK(f, lower, upper) - 273.15;
  }

  // --- robust bisection in Kelvin
  function bisectK(fn, aK, bK, tol = 1e-3, maxIt = 100) {
    let fa = fn(aK);
    let fb = fn(bK);
    if (fa * fb > 0) {
      // expand bracket if needed
      for (let i = 0; i < 20 && fa * fb > 0; i++) {
        aK -= 5; bK += 5;
        fa = fn(aK); fb = fn(bK);
      }
      if (fa * fb > 0) throw new Error("Could not bracket root.");
    }
    let lo = aK, hi = bK, flo = fa, fhi = fb;
    for (let i = 0; i < maxIt; i++) {
      const mid = 0.5 * (lo + hi);
      const fm = fn(mid);
      if (Math.abs(fm) < 1e-4 || (hi - lo) < tol) return mid;
      if (flo * fm <= 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
    }
    return 0.5 * (lo + hi);
  }

  const tgC = solveGlobe();
  const tnwC = solveNWB();

  const wbgt_outdoors = 0.7 * tnwC + 0.2 * tgC + 0.1 * taC; // ISO 7243 (sun)
  const wbgt_indoors  = 0.7 * tnwC + 0.3 * tgC;             // ISO 7243 (shade/indoors)

  return {
    WBGT_outdoors_C: wbgt_outdoors,
    WBGT_indoors_C: wbgt_indoors,
    components_C: { Tnwb: tnwC, Tg: tgC, Ta: taC }
  };
}

// Calculate WBGT with fallback to simple wet bulb approximation
// Returns WBGT in Fahrenheit
export function calculateWBGT({ tempF, humidity, windMph, pressureHPa = null, solarRadiationWm2 = null, cloudCover = 50 }) {
  const tempC = (tempF - 32) * (5 / 9);
  const windMs = windMph * 0.44704; // mph to m/s
  const rhDecimal = humidity / 100;
  const cloudFraction = cloudCover / 100;
  
  // Use simplified WBGT approximation (Australian BoM method)
  // WBGT ≈ 0.567×Ta + 0.393×e + 3.94 (where e = vapor pressure in hPa)
  // This empirical formula is widely used and validated for meteorological purposes
  
  // Calculate vapor pressure (Magnus formula)
  const eSat_hPa = 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
  const e_hPa = rhDecimal * eSat_hPa;
  
  // Simplified WBGT formula (°C)
  const wbgtSimple_C = 0.567 * tempC + 0.393 * e_hPa + 3.94;
  const wbgtSimple_F = (wbgtSimple_C * 9) / 5 + 32;
  
  return wbgtSimple_F;
}

// WBGT risk assessment based on research (ACSM, World Athletics, Outside Online)
// WBGT only matters above 60°F - below that, standard feels-like temperature is more relevant
// Returns: { level: 'ideal'|'caution'|'high-risk'|'danger', message: string }
function assessWBGTRisk(wbF, workout, longRun) {
  // WBGT not meaningful below 60°F - cool/cold conditions use feels-like temp instead
  if (wbF < 60) {
    return { level: 'ideal', message: 'Cool conditions - use feels-like temperature for guidance.' };
  }
  
  // Research-based WBGT thresholds:
  // 50-65°F: Ideal (peak performance, minimal risk)
  // 65-73°F: Warm/Caution (performance declines ~0.3-0.4% per °F, yellow flag)
  // 73-82°F: Hot/High Risk (serious heat stress, red flag, increased medical support)
  // >82°F: Extreme/Danger (races cancelled, heat stroke risk, black flag)
  
  if (workout) {
    // Hard workouts are most sensitive to heat - performance drops sharply above 60°F WBGT
    if (wbF >= 82) return { level: 'danger', message: 'WBGT ≥82°F—Extreme Heat. Organized events cancelled. Indoor workout strongly recommended.' };
    if (wbF >= 73) return { level: 'danger', message: 'WBGT 73-82°F—Hot/High Risk. Postpone hard workout. High heat illness risk during intervals.' };
    if (wbF >= 65) return { level: 'high-risk', message: 'WBGT 65-73°F—Warm/Caution. Reduce intensity. Performance declines ~0.3-0.4% per °F above ideal.' };
    if (wbF >= 60) return { level: 'caution', message: 'WBGT 60-65°F—Upper ideal range. Monitor effort, stay well hydrated.' };
    return { level: 'ideal', message: 'WBGT 50-60°F—Ideal for hard workouts. Optimal performance conditions.' };
  }
  
  if (longRun) {
    // Long runs: cumulative heat stress increases with duration
    if (wbF >= 82) return { level: 'danger', message: 'WBGT ≥82°F—Extreme Heat. Do not attempt long run. Extreme heat illness risk over time.' };
    if (wbF >= 73) return { level: 'danger', message: 'WBGT 73-82°F—Hot/High Risk. Postpone long run. Cumulative heat stress too high.' };
    if (wbF >= 65) return { level: 'high-risk', message: 'WBGT 65-73°F—Warm/Caution. Shorten by 25-30%. Heat stress compounds over duration.' };
    if (wbF >= 60) return { level: 'caution', message: 'WBGT 60-65°F—Manageable but monitor closely. Hydrate every 15-20 min.' };
    return { level: 'ideal', message: 'WBGT 50-60°F—Ideal for long runs. Optimal endurance conditions.' };
  }
  
  // Easy/recovery runs: more tolerant of heat but still risky at extremes
  if (wbF >= 82) return { level: 'danger', message: 'WBGT ≥82°F—Extreme Heat. Skip run or move indoors. Too hot even for easy pace.' };
  if (wbF >= 73) return { level: 'high-risk', message: 'WBGT 73-82°F—Hot/High Risk. Run very easy, stay in shade, bring extra water.' };
  if (wbF >= 65) return { level: 'caution', message: 'WBGT 65-73°F—Warm/Caution. Slow down significantly, use shaded routes.' };
  if (wbF >= 60) return { level: 'caution', message: 'WBGT 60-65°F—Warm but manageable. Pace by effort, not time.' };
  return { level: 'ideal', message: 'WBGT 50-60°F—Ideal running conditions. Comfortable and safe.' };
}

// Compute run score breakdown with all penalty factors
export function computeScoreBreakdown(
  { tempF, apparentF, humidity, windMph, precipProb, precipIn, uvIndex, cloudCover = 0, pressure = null, solarRadiation = null },
  workout,
  coldHands,
  handsLevel,
  longRun = false
) {
  // Use imported constants from App.jsx for consistency
  const ideal = workout ? IDEAL_TEMP_WORKOUT : longRun ? IDEAL_TEMP_LONG_RUN : IDEAL_TEMP_EASY;
  const coolWidth = workout ? COLD_PENALTY_WIDTH_WORKOUT : longRun ? 18 : COLD_PENALTY_WIDTH_EASY;
  const dpF = dewPointF(tempF, humidity);

  const diff = apparentF - ideal;
  const warmSpan = Math.max(5, HEAT_PENALTY_MAX_TEMP - ideal); // Uses shared constant from App.jsx
  
  // Calculate WBGT using comprehensive Liljegren model (when data available) or Stull approximation
  // WBGT is superior to Heat Index for assessing heat stress during physical activity
  const wbF = calculateWBGT({ 
    tempF, 
    humidity, 
    windMph, 
    pressureHPa: pressure, 
    solarRadiationWm2: solarRadiation, 
    cloudCover 
  });
  
  // Hybrid approach: use WBGT when hot (>65°F), apparent temp when cool
  // WBGT naturally accounts for humidity and radiant heat, superior metric for running
  const baseTemp = apparentF > 65 ? wbF : apparentF;
  
  // Note: When using comprehensive WBGT, solar radiation is already factored into the calculation
  // The simple solar adjustment below is only a fallback for when WBGT data is unavailable
  let solarAdjustment = 0;
  if (baseTemp > 60 && (pressure == null || solarRadiation == null)) {
    // Fallback solar adjustment when comprehensive WBGT unavailable
    // cloudCover: 0-100%, where 0 = clear sky (max solar), 100 = overcast (min solar)
    const solarExposure = 1 - (cloudCover / 100); // 1.0 = full sun, 0.0 = fully cloudy
    
    // Scale solar impact based on temperature (hotter = more impact)
    const tempFactor = Math.min((baseTemp - 60) / 25, 1); // Peaks at 85°F+
    
    // Solar penalty: up to 15°F equivalent in full sun at high temps
    solarAdjustment = solarExposure * tempFactor * 15;
  }
  
  const effectiveTemp = baseTemp + solarAdjustment;
  const effectiveDiff = effectiveTemp - ideal;
  
  // Enhanced cold penalty based on research thresholds:
  // 41-54°F: PR sweet spot (minimal penalty)
  // 30-40°F: Fast but chilly (light penalty)
  // 20-29°F: Cold (moderate penalty)
  // 10-19°F: Very cold (high penalty)
  // 0-9°F: Bitter (severe penalty)
  // -1 to -24°F: High risk - frostbite ~30 min (major penalty)
  // ≤-25°F: Danger - frostbite ~15 min (maximum penalty)
  
  let coldPenalty = 0;
  if (effectiveDiff < 0) {
    const absTemp = effectiveTemp; // actual feels-like temperature
    
    if (absTemp >= 41) {
      // PR sweet spot (41-54°F) - minimal penalty, just outside ideal
      coldPenalty = Math.pow(Math.abs(effectiveDiff) / 13, 1.5) * 5; // Very gentle penalty
    } else if (absTemp >= 30) {
      // Fast but chilly (30-40°F) - still good for running
      const baseline = 5;
      const additionalPenalty = Math.pow((41 - absTemp) / 11, 1.8) * 10;
      coldPenalty = baseline + additionalPenalty; // 5-15 penalty range
    } else if (absTemp >= 20) {
      // Cold (20-29°F) - performance impacted, discomfort increases
      const baseline = 15;
      const additionalPenalty = Math.pow((30 - absTemp) / 10, 2) * 15;
      coldPenalty = baseline + additionalPenalty; // 15-30 penalty range
    } else if (absTemp >= 10) {
      // Very cold (10-19°F) - significant challenge
      const baseline = 30;
      const additionalPenalty = Math.pow((20 - absTemp) / 10, 2) * 20;
      coldPenalty = baseline + additionalPenalty; // 30-50 penalty range
    } else if (absTemp >= 0) {
      // Bitter (0-9°F) - severe conditions
      const baseline = 50;
      const additionalPenalty = Math.pow((10 - absTemp) / 10, 2) * 25;
      coldPenalty = baseline + additionalPenalty; // 50-75 penalty range
    } else if (absTemp >= -24) {
      // High risk (-1 to -24°F) - frostbite risk ~30 min
      const baseline = 75;
      const additionalPenalty = Math.pow((0 - absTemp) / 24, 1.5) * 15;
      coldPenalty = baseline + additionalPenalty; // 75-90 penalty range
    } else {
      // Danger (≤-25°F) - frostbite risk ~15 min, extreme conditions
      coldPenalty = 99; // Maximum penalty
    }
  }
  
  // Determine if we're in warm weather (use WBGT) or cold weather
  const useWBGT = apparentF >= 50;
  
  // Enhanced temperature penalty with better curve
  // For warm weather: use WBGT-based penalty (consolidates temp + humidity + heat stress)
  // For cold weather: use traditional apparent temperature penalty
  let tempPenalty;
  let humidityPenalty = 0;
  
  if (useWBGT) {
    // WBGT-based penalty for warm weather
    // WBGT naturally integrates air temp, humidity, solar radiation, and wind
    const wbgtRisk = assessWBGTRisk(wbF, workout, longRun);
    // Use a single smooth mapping for warm-weather WBGT
    // Desired mapping: WBGT 50°F => score 100 (penalty 0)
    //                  WBGT 90°F => score 1   (penalty ~99)
    // We'll use a power curve for a smooth, tunable ramp.
    const wbgtIdeal = 50; // Ideal WBGT (no penalty)
    const wbgtCutoff = 90; // WBGT at which we apply maximum penalty

    if (wbF <= wbgtIdeal) {
      // At or below ideal: no penalty
      tempPenalty = 0;
    } else if (wbF >= wbgtCutoff) {
      // At or above cutoff: maximum penalty
      tempPenalty = 99;
    } else {
      // Smooth ramp from 0 → 99 across (wbgtIdeal, wbgtCutoff)
      const t = (wbF - wbgtIdeal) / (wbgtCutoff - wbgtIdeal); // 0..1
      const exponent = 1.6; // controls curvature (1 = linear, >1 = convex)
      tempPenalty = Math.pow(t, exponent) * 99;
    }
    // Humidity is already factored into WBGT, so humidityPenalty stays 0
  } else {
    // Cold weather: use traditional apparent temperature penalty
    tempPenalty = coldPenalty;
    
    // Smarter humidity penalty using dew point thresholds (only for cold weather)
    // Only penalize when dew point is actually uncomfortable
    if (dpF < DEW_POINT_COMFORTABLE) humidityPenalty = 0; // Dry air - no penalty
    else if (dpF < DEW_POINT_SLIGHTLY_MUGGY) humidityPenalty = 0; // Still comfortable
    else if (dpF < DEW_POINT_MODERATE) humidityPenalty = DEW_POINT_PENALTY_SLIGHTLY_MUGGY;
    else if (dpF < DEW_POINT_MUGGY) humidityPenalty = DEW_POINT_PENALTY_MODERATE;
    else if (dpF < DEW_POINT_VERY_HUMID) humidityPenalty = DEW_POINT_PENALTY_MUGGY;
    else if (dpF < DEW_POINT_OPPRESSIVE) humidityPenalty = DEW_POINT_PENALTY_VERY_HUMID;
    else humidityPenalty = DEW_POINT_PENALTY_OPPRESSIVE;
  }

  // Wind penalty/bonus - context dependent!
  // Warm + humid: light breeze HELPS by breaking up boundary layer and enhancing evaporative cooling
  // Cold: wind HURTS via wind chill
  // Strong winds: always a challenge regardless of temp
  let windPenalty = 0;
  
  if (apparentF >= 65 && dpF >= 55) {
    // Warm/humid conditions: light breeze is beneficial
    if (windMph >= 5 && windMph <= 12) {
      // Sweet spot: enough to enhance cooling, not enough to impede running
      windPenalty = -3; // Small bonus (negative penalty = bonus)
    } else if (windMph > 12 && windMph <= 15) {
      // Getting stronger but still helps cooling more than it hurts
      windPenalty = 0; // Neutral
    } else if (windMph > 15) {
      // Too strong: aerodynamic penalty outweighs cooling benefit
      windPenalty = Math.pow((windMph - 15) / 20, 2) * 15;
    }
    // else windMph < 5: still air, no bonus or penalty (already handled by humidity)
  } else if (apparentF < 50) {
    // Cold conditions: wind increases heat loss (wind chill)
    const windBasePenalty = Math.pow(Math.max(0, windMph - 3) / 25, 2) * 40;
    const coldMultiplier = apparentF < 35 ? 1.5 : apparentF < 40 ? 1.3 : 1.0;
    windPenalty = windBasePenalty * coldMultiplier;
  } else {
    // Moderate temps (50-65°F): wind is mostly neutral to slightly annoying
    if (windMph > 15) {
      windPenalty = Math.pow((windMph - 15) / 25, 2) * 20;
    }
  }

  // Enhanced precipitation penalty with ice danger and light rain cooling benefit
  // Very light chance of rain (5-15%) in hot/humid conditions can actually help cooling via evaporation
  const isHotHumid = apparentF >= 75 && dpF >= 60;
  const isLightRainChance = precipProb > 5 && precipProb <= 15 && precipIn < 0.01;
  
  let precipBasePenalty = Math.min(Math.max((precipProb / 100) * 15, 0), 15) +
    Math.min(Math.max(precipIn * 160, 0), 20);
  
  // Light rain bonus in hot/humid conditions (similar to breeze bonus)
  if (isLightRainChance && isHotHumid) {
    precipBasePenalty = Math.max(0, precipBasePenalty - 3); // -3 point bonus for light rain cooling
  }
  
  const iceDanger = apparentF <= 34 && precipIn > 0 ? 15 : apparentF <= 38 && precipProb > 40 ? 8 : 0;
  const precipPenalty = precipBasePenalty + iceDanger;

  // UV penalty with workout heat interaction
  let uvPenalty = Math.min(Math.max(Math.max(0, uvIndex - 7) * 2.5, 0), 10);
  if (workout && apparentF >= 70) uvPenalty += 5;
  if (longRun && uvIndex >= 8) uvPenalty += 3;

  // Cold synergy: wind + cold compounds risk
  const windChill = apparentF < 50 && windMph > 5 
    ? 35.74 + 0.6215 * apparentF - 35.75 * Math.pow(windMph, 0.16) + 0.4275 * apparentF * Math.pow(windMph, 0.16)
    : apparentF;
  const synergyCold = apparentF < 35 
    ? Math.max(0, (35 - windChill) * 0.5)
    : 0;

  // Heat synergy: only apply when NOT using WBGT (WBGT already accounts for heat + humidity)
  const heatStress = !useWBGT && apparentF > 75 && dpF > 60 
    ? Math.pow((apparentF - 75) / 10, 1.8) * Math.pow((dpF - 60) / 10, 1.5) * 15
    : 0;
  const synergyHeat = !useWBGT ? ((dpF > 70 ? (dpF - 70) * 0.1 : 0) + heatStress) : 0;

  // Cold hands personal penalty
  const coldHandsPenalty = coldHands ? (handsLevel || 0) * 2 : 0;

  let penalties =
    tempPenalty +
    humidityPenalty +
    windPenalty +
    precipPenalty +
    uvPenalty +
    synergyCold +
    synergyHeat +
    coldHandsPenalty;
  penalties = Math.min(Math.max(penalties, 0), 99);

  const rawScore = Math.round(100 - penalties);
  const score = Math.min(Math.max(rawScore, 0), 100);

  // Smart, context-aware explanations and tips
  const getTempTip = () => {
    const cloudContext = cloudCover > 70 ? " Overcast skies help by blocking solar radiation." : cloudCover < 30 ? " Full sun adds significant radiant heat—seek shade." : " Partial clouds provide some relief from direct sun.";
    const usingWetBulb = apparentF > 65;
    const wbgtRisk = usingWetBulb ? assessWBGTRisk(wbF, workout, longRun) : null;
    
    // Use WBGT-based guidance when hot (research-backed thresholds)
    if (wbgtRisk && wbgtRisk.level !== 'safe') {
      const prefix = wbgtRisk.level === 'dangerous' ? '🚨 ' : wbgtRisk.level === 'high-risk' ? '⚠️ ' : '⚡ ';
      return prefix + wbgtRisk.message + (cloudContext && cloudCover < 50 ? cloudContext : '');
    }
    
    // Standard temperature guidance for cooler conditions or safe WBGT
    if (effectiveDiff >= 0) {
      const wetBulbContext = usingWetBulb ? ` (WBGT: ${Math.round(wbF)}°F—within safe range)` : '';
      if (effectiveDiff > 35) return `Dangerous heat${wetBulbContext}—consider moving indoors. If outside: run very easy, take walk breaks every 5-10 min, pour water on head/neck.${apparentF > 75 ? cloudContext : ''}`;
      if (effectiveDiff > 25) return `Extreme heat stress${wetBulbContext}—shorten distance 30-50%, slow pace 60-90s/mile, run early morning (before 7am) or late evening only.${apparentF > 70 ? cloudContext : ''}`;
      if (effectiveDiff > 15) return `Significant heat${wetBulbContext}—reduce intensity, add 30-60s/mile to easy pace, walk through aid/water stops to keep heart rate controlled.${apparentF > 65 ? cloudContext : ''}`;
      if (effectiveDiff > 8) return `Moderately warm${wetBulbContext}—slow easy pace by 15-30s/mile, sip water every 15-20 min, choose shaded routes. Trees and building shade cut radiant heat significantly.${apparentF > 60 ? cloudContext : ''}`;
      return `Slightly warm—dress lighter than you think, stay hydrated, you'll feel great once you warm up.${apparentF > 60 && cloudCover < 30 ? ' Seek shade during peak sun hours.' : ''}`;
    } else {
      const absDiff = Math.abs(diff);
      if (absDiff > 25) return "Dangerous cold—indoor run strongly recommended. Outside: cover all skin, run loops near shelter, bring phone + tell someone your route.";
      if (absDiff > 15) return "Very cold—extend warm-up to 15 min, dress in layers, protect face + extremities. Watch for ice patches.";
      if (absDiff > 8) return "Cold start—add 5-10 min warm-up, wear gloves + hat, you'll shed layers after 10-15 min of running.";
      if (absDiff > 3) return "Slightly cool—ideal for faster paces once warmed up. One light extra layer for the first mile.";
      return "Perfect temperature—minimal adjustments needed.";
    }
  };

  const getHumidityTip = () => {
    if (dpF >= 75) return "Oppressive humidity—sweat won't evaporate. Slow pace 45-75s/mile, take walk breaks, hydrate every 10 min. Heat illness escalates fast.";
    if (dpF >= 70) return "Very humid—cooling is impaired. Reduce effort 10-15%, extra hydration, seek shade, plan bailout points.";
    if (dpF >= 65) return "Muggy conditions—expect to feel warmer than thermometer suggests. Slow 20-30s/mile, stay hydrated, use anti-chafe liberally.";
    if (dpF >= 60) return "Moderate humidity—slight impact on cooling. Stay on top of hydration, adjust pace by feel.";
    if (dpF >= 55) return "Comfortable humidity—minimal impact. Normal hydration strategy works fine.";
    return "Low humidity—optimal evaporative cooling. Great day for pushing pace.";
  };

  const getWindTip = () => {
    if (apparentF < 40 && windMph >= 15) return "Dangerous wind chill—frostbite possible in 30 min. Cover all skin, windproof outer layer required. Indoor run recommended.";
    if (windMph >= 20) return "Very strong winds—plan short out-and-back (start into wind). Accept 20-40s/mile slower into headwind. Use buildings/trees for wind breaks.";
    if (windMph >= 15) return "Strong winds—tactical route planning matters. Start into wind, finish with tailwind when tired. Effort > pace today.";
    if (apparentF >= 65 && dpF >= 55 && windMph >= 5 && windMph <= 12) return "Perfect breeze—enhances evaporative cooling in this heat/humidity. Natural air conditioning working in your favor.";
    if (windMph >= 10 && apparentF < 50) return "Breezy + cold combo—windproof layer helps. Face wind early, save tailwind for when you're fatigued.";
    if (windMph >= 10) return "Moderate winds—slight aerodynamic drag. Plan loops to alternate wind directions, or embrace it as resistance training.";
    return "Calm conditions—wind won't be a factor today.";
  };

  const getPrecipTip = () => {
    // Light rain cooling benefit in hot/humid conditions
    if (isLightRainChance && isHotHumid) return "Light rain chance may actually help—keeps you cooler via evaporation in this heat.";
    if (apparentF <= 34 && (precipProb >= 40 || precipIn > 0.02)) return "DANGER: Ice/freezing rain likely. Treadmill strongly recommended. Outside = high injury risk from falls.";
    if (precipProb >= 80 || precipIn > 0.25) return "Heavy rain expected—waterproof shell + cap mandatory. Change routes to avoid trail/unpaved (will be muddy). Dry socks + shoes ready post-run.";
    if (precipProb >= 60 || precipIn > 0.1) return "Likely rain—bring packable shell even if dry at start. Avoid painted road markings (slick when wet). Body Glide on feet prevents wet blisters.";
    if (precipProb >= 40) return "Rain possible—check radar before heading out. Cap keeps rain off face, rain shell in pocket as insurance.";
    if (precipProb >= 20) return "Slight rain chance—probably fine without rain gear, but check forecast right before you go.";
    return "Dry conditions expected—no rain gear needed.";
  };

  const getUVTip = () => {
    if (uvIndex >= 9) return "Extreme UV—skin damage in 15 min. SPF 50+ required, reapply if sweating heavily. Sunglasses + visor/cap mandatory. Run before 9am or after 5pm.";
    if (uvIndex >= 7) return "Very high UV—SPF 30+ sunscreen 20 min before run. Cover shoulders, wear hat + sunglasses. Early morning or evening strongly preferred.";
    if (uvIndex >= 5) return "High UV—sunscreen recommended for runs >30 min. Wear a cap, consider arm sleeves for long runs.";
    if (uvIndex >= 3) return "Moderate UV—sunscreen for runs >60 min or if fair-skinned. Less concern in early morning/evening.";
    return "Low UV—minimal sun protection needed today.";
  };

  // Build component-based breakdown
  // For warm weather (WBGT): show the factors that went into WBGT calculation
  // For cold weather (UTCI): show the factors that went into UTCI calculation (temp, wind, humidity, rain)
  let parts = [];
  
  if (useWBGT) {
    // Warm weather: Show WBGT calculation components only
    const wbgtRisk = assessWBGTRisk(wbF, workout, longRun);
    
    parts = [
      {
        key: "airTemp",
        label: "Air Temperature",
        value: `${Math.round(tempF)}°F`,
        impact: tempF > 80 ? 'high' : tempF > 70 ? 'medium' : 'low',
        description: `Base air temperature measurement`,
      },
      {
        key: "humidity",
        label: "Humidity",
        value: `${Math.round(humidity)}%`,
        dewPoint: `${Math.round(dpF)}°F`,
        impact: humidity > 75 ? 'high' : humidity > 60 ? 'medium' : 'low',
        description: `Dew point ${Math.round(dpF)}°F — ${dpF >= 70 ? 'oppressive' : dpF >= 60 ? 'muggy' : 'comfortable'}. Affects sweat evaporation.`,
      },
      {
        key: "solar",
        label: "Solar Radiation",
        value: solarRadiation != null && solarRadiation > 0 
          ? `${Math.round(solarRadiation)} W/m²`
          : cloudCover != null 
            ? `${Math.round(100 - cloudCover)}% sun exposure`
            : 'Not available',
        impact: (solarRadiation != null && solarRadiation > 600) || (cloudCover != null && cloudCover < 30) 
          ? 'high' 
          : (solarRadiation != null && solarRadiation > 300) || (cloudCover != null && cloudCover < 60)
            ? 'medium' 
            : 'low',
        description: cloudCover != null 
          ? `${Math.round(cloudCover)}% cloud cover. Radiant heat from sun.`
          : 'Direct sun adds significant heat stress.',
      },
      {
        key: "wind",
        label: "Wind Speed",
        value: `${Math.round(windMph)} mph`,
        impact: windMph < 5 ? 'high' : windMph < 12 ? 'low' : 'medium',
        description: windMph < 5 
          ? 'Still air reduces cooling efficiency'
          : windMph < 12
            ? 'Light breeze helps evaporative cooling'
            : 'Strong wind adds resistance but aids cooling',
      },
    ];
    
    // Add WBGT result summary
    parts.push({
      key: "wbgtResult",
      label: "WBGT Result",
      value: `${Math.round(wbF)}°F`,
      impact: wbF >= 82 ? 'high' : wbF >= 73 ? 'medium' : 'low',
      description: `Heat stress level: ${wbgtRisk?.level || 'safe'}. Score: ${score}/100 (penalty: ${Math.round(tempPenalty)} pts)`,
      isResult: true,
    });
  } else {
    // Cold weather: Show UTCI-like calculation components
    // TODO: Implement full UTCI calculation - for now show key factors
    parts = [
      {
        key: "airTemp",
        label: "Air Temperature", 
        value: `${Math.round(tempF)}°F`,
        impact: tempF < 20 ? 'high' : tempF < 32 ? 'medium' : 'low',
        description: `Actual air temperature measurement`,
      },
      {
        key: "windChill",
        label: "Wind Chill",
        value: apparentF < 50 && windMph > 5 ? `${Math.round(windChill)}°F` : 'N/A',
        impact: apparentF < 50 && windMph > 10 && windChill < 20 ? 'high' : windChill < 32 ? 'medium' : 'low',
        description: apparentF < 50 && windMph > 5
          ? `Wind makes it feel ${Math.round(apparentF - windChill)}°F colder. Frostbite risk increases.`
          : 'Wind chill not significant at this temperature',
      },
      {
        key: "humidity",
        label: "Humidity",
        value: `${Math.round(humidity)}%`,
        impact: humidity > 80 ? 'medium' : 'low',
        description: `Dew point ${Math.round(dpF)}°F. High humidity in cold weather feels damper.`,
      },
      {
        key: "precipitation",
        label: "Precipitation",
        value: precipIn > 0 
          ? `${precipIn.toFixed(2)}" (${Math.round(precipProb)}%)`
          : `${Math.round(precipProb)}% chance`,
        impact: (precipProb > 50 || precipIn > 0.05) && tempF <= 35 ? 'high' : precipProb > 30 ? 'medium' : 'low',
        description: tempF <= 32 && (precipProb > 30 || precipIn > 0)
          ? 'ICE DANGER: Freezing precipitation creates hazardous surfaces'
          : precipProb > 50
            ? 'Wet conditions reduce warmth and increase injury risk'
            : 'Minimal precipitation impact',
      },
    ];
    
    // Add effective temperature result
    parts.push({
      key: "utciResult",
      label: "Feels Like (UTCI)",
      value: `${Math.round(apparentF)}°F`,
      impact: apparentF < 0 ? 'high' : apparentF < 20 ? 'medium' : 'low',
      description: `Thermal comfort index. Score: ${score}/100 (penalty: ${Math.round(tempPenalty)} pts)`,
      isResult: true,
    });
  }

  // Filter to only show components (exclude result summary for parts array)
  const componentParts = parts.filter(p => !p.isResult);
  const resultPart = parts.find(p => p.isResult);

  const dominantKeys = componentParts
    .filter(p => p.impact === 'high')
    .map(p => p.key)
    .slice(0, 2);

  return { 
    score, 
    parts: componentParts,
    result: resultPart,
    total: tempPenalty, 
    ideal, 
    dpF, 
    wbF, 
    useWBGT,
    dominantKeys,
    // Legacy fields for backward compatibility
    tips: {
      temperature: getTempTip(),
      humidity: getHumidityTip(),
      wind: getWindTip(),
      precipitation: getPrecipTip(),
      uv: getUVTip(),
    }
  };
}

// Calculate road condition warnings based on weather
export function calculateRoadConditions({ tempF, apparentF, precipProb, precip, cloudCover }) {
  const warnings = [];
  let severity = 'safe'; // safe, caution, warning, danger
  
  // Freezing conditions with precipitation = ice risk
  if (tempF <= 32 && (precipProb > 20 || precip > 0)) {
    severity = 'danger';
    warnings.push({
      type: 'ice',
      level: 'danger',
      message: 'Black ice likely on roads and sidewalks',
      advice: 'Avoid running outdoors. Treadmill strongly recommended. If you must run outside, choose well-salted main roads and wear trail shoes with aggressive tread. Shorten your stride significantly.'
    });
  }
  // Near-freezing with recent/current precip
  else if (tempF > 32 && tempF <= 35 && precipProb > 40) {
    severity = severity === 'danger' ? 'danger' : 'warning';
    warnings.push({
      type: 'ice',
      level: 'warning',
      message: 'Potential for icy patches in shaded areas',
      advice: 'Use extreme caution on bridges, overpasses, and shaded sections. Test footing before committing to speed. Consider postponing to afternoon when temps rise.'
    });
  }
  
  // Heavy rain = slippery surfaces
  if (precipProb > 70 || precip > 0.2) {
    severity = severity === 'danger' ? 'danger' : 'warning';
    warnings.push({
      type: 'wet',
      level: 'warning',
      message: 'Slippery roads and reduced visibility',
      advice: 'Avoid painted road markings, manhole covers, and metal grates—extremely slippery when wet. Shorten stride and increase cadence for better traction. Stay visible with bright colors and reflective gear.'
    });
  }
  // Moderate rain
  else if (precipProb > 40 || precip > 0.05) {
    severity = severity === 'danger' || severity === 'warning' ? severity : 'caution';
    warnings.push({
      type: 'wet',
      level: 'caution',
      message: 'Wet road surfaces possible',
      advice: 'Watch for puddles hiding potholes. Leaves and debris become slippery when wet. Give extra space when crossing driveways (oil residue + water = slick).'
    });
  }
  
  // Low visibility conditions
  if (cloudCover > 85 && (precipProb > 50 || precip > 0.1)) {
    severity = severity === 'danger' ? 'danger' : severity === 'warning' ? 'warning' : 'caution';
    warnings.push({
      type: 'visibility',
      level: 'caution',
      message: 'Reduced visibility for drivers',
      advice: 'Wear bright/reflective clothing even during daytime. Make eye contact with drivers at intersections. Use sidewalks and crosswalks—don\'t assume you\'re seen.'
    });
  }
  
  // Heat = no road issues but surface heat warning
  if (apparentF >= 85) {
    severity = severity === 'danger' || severity === 'warning' ? severity : 'caution';
    warnings.push({
      type: 'heat',
      level: 'caution',
      message: 'Hot pavement can reach 140-160°F',
      advice: 'Choose light-colored asphalt or concrete over dark pavement where possible. Run on grass/dirt paths if available—significantly cooler. Peak surface temps occur 2-4pm; run early morning or evening.'
    });
  }
  
  return {
    severity,
    warnings,
    hasWarnings: warnings.length > 0
  };
}

// Generate coach-like approach tips based on score and conditions
export function makeApproachTips({ score, parts, dpF, apparentF, tempF, humidity, windMph, precipProb, workout, longRun = false, tempChange = 0, willRain = false, roadConditions = null, runnerBoldness = 0, cloudCover = 50 }) {
  const tops = parts.slice(0, 2).map((p) => p.key);
  const tips = [];

  // Adjust score thresholds based on runner boldness
  const boldnessAdjust = runnerBoldness * 7; // Each notch = 7 point adjustment
  const adjustedScore = score + boldnessAdjust;

  // Intelligent condition detection for multi-factor interactions
  const isExtremeCold = apparentF <= 10;
  const isVeryCold = apparentF <= 32;
  const isExtremeHeat = apparentF >= 85;
  const isVeryHot = apparentF >= 75;
  const isHumid = dpF >= 65;
  const isVeryHumid = dpF >= 70;
  const isWindy = windMph >= 15;
  const isVeryWindy = windMph >= 20;
  const isIcyConditions = apparentF <= 34 && (precipProb >= 30 || (parts.find(p => p.key === 'precip')?.penalty || 0) > 5);
  const heatHumidityDanger = isVeryHot && isVeryHumid;
  const coldWindDanger = isVeryCold && isWindy;

  // Natural, coach-like guidance - speak to the runner like a human (adjusted by boldness)
  if (adjustedScore >= 85) {
    // Perfect conditions - enthusiastic!
    if (workout) {
      tips.push("Great day for a hard workout! Conditions are dialed in.");
    } else if (longRun) {
      tips.push("Beautiful day for miles. Enjoy it out there.");
    } else {
      tips.push("Perfect running weather. Get after it!");
    }
  } else if (adjustedScore >= 70) {
    // Good conditions - just a heads up
    const topIssue = parts[0];
    const weatherContext = topIssue.key === 'temperature' 
      ? (apparentF > 60 ? `warmth` : `cold`)
      : topIssue.key === 'humidity' 
      ? `humidity`
      : topIssue.key === 'wind'
      ? `wind`
      : `conditions`;
    
    if (workout) {
      tips.push(`Solid conditions for speed work. The ${weatherContext} will make it feel a bit harder, but nothing major.`);
    } else if (longRun) {
      tips.push(`Good day for your long run. The ${weatherContext} will add some resistance, but you'll be fine.`);
    } else {
      tips.push(`Nice day for a run. The ${weatherContext} might slow you down slightly—just run by feel rather than chasing the watch.`);
    }
  } else if (adjustedScore >= 55) {
    // Getting challenging - real talk
    const topIssue = parts[0];
    const weatherReason = topIssue.key === 'temperature' && apparentF > 70
      ? `heat`
      : topIssue.key === 'temperature' && apparentF < 40
      ? `cold`
      : topIssue.key === 'humidity'
      ? `humidity making it hard to cool down`
      : topIssue.key === 'wind'
      ? `strong winds`
      : topIssue.key === 'heatSynergy'
      ? `heat and humidity combo`
      : topIssue.key === 'coldSynergy'
      ? `wind chill`
      : `weather`;
    
    if (workout) {
      tips.push(`Tough day for intervals with the ${weatherReason}. Shorten the reps or convert to a tempo if you're not feeling it. No shame in being smart.`);
    } else if (longRun) {
      tips.push(`The ${weatherReason} is going to make this a grind. Maybe trim a couple miles or slow down 30s/mile. Save the suffer-fest for race day.`);
    } else {
      tips.push(`The ${weatherReason} will make your run feel harder than it should. Let the pace drift and focus on time on feet instead.`);
    }
  } else if (adjustedScore >= 40) {
    // Poor conditions - clear advice
    const topIssues = parts.slice(0, 2);
    const weatherFactors = topIssues.map(p => {
      if (p.key === 'temperature' && apparentF > 75) return 'heat';
      if (p.key === 'temperature' && apparentF < 35) return 'cold';
      if (p.key === 'humidity') return 'oppressive humidity';
      if (p.key === 'wind') return 'high winds';
      if (p.key === 'precip') return 'rain/precipitation';
      if (p.key === 'heatSynergy') return 'dangerous heat index';
      if (p.key === 'coldSynergy') return 'severe wind chill';
      return null;
    }).filter(Boolean);
    const weatherList = weatherFactors.length > 1 
      ? `${weatherFactors[0]} and ${weatherFactors[1]}`
      : weatherFactors[0] || 'conditions';
    
    if (workout) {
      tips.push(`This is not the day for speed work with ${weatherList}. Either bail to the treadmill or just run easy. The workout can wait.`);
    } else if (longRun) {
      tips.push(`Rough conditions for a long run with ${weatherList}. Cut it by 30%, stay on short loops near home, and bring your phone. If things deteriorate—weather worsens, you feel off—you're close to shelter.`);
    } else {
      tips.push(`The ${weatherList} make it tough out there. Shorten it up today, stay on loops close to home so you can bail quickly if conditions worsen or you're not feeling it.`);
    }
  } else {
    // Dangerous - be direct
    const topIssues = parts.slice(0, 2);
    const criticalFactors = topIssues.map(p => {
      if (p.key === 'temperature' && apparentF > 85) return 'extreme heat';
      if (p.key === 'temperature' && apparentF < 20) return 'extreme cold';
      if (p.key === 'heatSynergy') return 'heat illness risk';
      if (p.key === 'coldSynergy') return 'frostbite risk';
      if (p.key === 'precip' && apparentF <= 34) return 'ice danger';
      if (p.key === 'wind' && apparentF < 35) return 'dangerous wind chill';
      return null;
    }).filter(Boolean);
    const dangerList = criticalFactors.length > 0 
      ? `with ${criticalFactors.join(' and ')}`
      : 'in these conditions';
    
    tips.push(`Seriously, hit the treadmill today ${dangerList}. If you absolutely have to go outside, tell someone your route and expected finish time, carry your phone, and run short loops—this keeps you near shelter if weather suddenly turns or you run into trouble.`);
  }

  // Compound conditions - real warnings when it matters (adjusted by boldness)
  if (heatHumidityDanger && runnerBoldness <= 0) {
    tips.push("🌡️ Heat + humidity combo prevents your body from cooling through sweat. This means core temp rises fast. Run early morning only, take walk breaks every 10 minutes to let your heart rate drop, and pour water on your head and neck. If you stop sweating or feel confused, you're in trouble—stop immediately.");
  } else if (heatHumidityDanger && runnerBoldness > 0) {
    tips.push("🌡️ Heat stress is real today. Early morning, walk breaks, aggressive hydration. Know the signs of heat illness.");
  }
  
  if (coldWindDanger && runnerBoldness <= 0) {
    tips.push("❄️ Wind chill accelerates heat loss from exposed skin—frostbite can happen in under 30 minutes on fingers, ears, and face. Cover every inch of skin, layer a windproof shell over insulation, and run short loops so you're never more than 5-10 minutes from shelter.");
  } else if (coldWindDanger && runnerBoldness > 0) {
    tips.push("❄️ Frostbite risk is real. Cover exposed skin, windproof up, and stay on short loops.");
  }

  if (isIcyConditions) {
    if (runnerBoldness <= 1) {
      tips.push("🧊 Ice or freezing rain creates slick surfaces where one wrong step means a hard fall (and potential injury). Traction devices (like Yaktrax) help, but treadmill is the smart call today.");
    } else {
      tips.push("🧊 Icy out there. Traction devices or treadmill.");
    }
  }

  // Long-run specific wisdom (adjusted by boldness)
  if (longRun) {
    // Add shade route recommendation for hot long runs
    if (apparentF >= 70 && cloudCover < 50 && runnerBoldness <= 0) {
      tips.push("☀️ Plan your route through shaded areas—parks with tree cover, north sides of buildings. Full sun can make it feel 10-15°F hotter than the air temperature. Your body will thank you.");
    } else if (apparentF >= 75 && cloudCover < 50 && runnerBoldness > 0) {
      tips.push("☀️ Route through shade when possible. Full sun adds major radiant heat.");
    }
    
    if (tempChange > 12 && runnerBoldness <= 0) {
      const isTempWarming = apparentF > (parts.find(p => p.key === 'temperature')?.why.includes('cooler') ? apparentF + tempChange : apparentF - tempChange);
      tips.push(`🌡️ Temperature's going to ${isTempWarming ? 'climb' : 'drop'} ${Math.round(tempChange)}°F during your run. ${isTempWarming ? 'What feels good at the start will get uncomfortable fast—start with layers you can peel off and tie around your waist as you heat up.' : 'You\'ll lose heat as temps drop—stash an extra layer at the finish, or bring a lightweight shell you can put on.'}`);
    } else if (tempChange > 15 && runnerBoldness > 0) {
      const isTempWarming = apparentF > (parts.find(p => p.key === 'temperature')?.why.includes('cooler') ? apparentF + tempChange : apparentF - tempChange);
      tips.push(`🌡️ Expect a ${Math.round(tempChange)}°F temp ${isTempWarming ? 'rise' : 'drop'}. Layer smart.`);
    }

    if ((willRain || (precipProb >= 60 && (parts.find(p => p.key === 'precip')?.penalty || 0) > 10)) && runnerBoldness <= 0) {
      tips.push("🌧️ Rain's coming during your run. Bring a shell and a cap, slap some Body Glide on your feet to prevent blisters, and change your shoes the second you finish.");
    } else if ((willRain || (precipProb >= 70 && (parts.find(p => p.key === 'precip')?.penalty || 0) > 10)) && runnerBoldness > 0) {
      tips.push("🌧️ Rain incoming. Shell, cap, done.");
    }

    if (adjustedScore < 60 && (isVeryHot || isHumid) && runnerBoldness <= 0) {
      tips.push("💧 You'll need water out there. Carry a bottle or plan stops every 3-4 miles. Drink every 15-20 minutes, not just when you're thirsty.");
    } else if (adjustedScore < 50 && (isVeryHot || isHumid) && runnerBoldness > 0) {
      tips.push("💧 Plan water stops or carry fluids.");
    }
  }

  // Extreme conditions - get specific (adjusted by boldness)
  if (tops.includes("temperature")) {
    if (isExtremeHeat && runnerBoldness <= 0) {
      const shadeTip = cloudCover < 50 ? " Seek heavily shaded routes—trees and buildings can drop radiant heat by 10-15°F vs full sun." : " Even with cloud cover, heat stress is severe."
      tips.push(`🔥 Extreme heat warning. Pre-cool with a cold shower, pour water on your head and neck every 10 minutes, and run short loops. If you feel confused or stop sweating, stop running immediately.${shadeTip}`);
    } else if (isExtremeHeat && runnerBoldness > 0) {
      tips.push(cloudCover < 50 ? "🔥 Extreme heat. Pre-cool, frequent water on head/neck, watch for heat illness. Full sun = seek shade." : "🔥 Extreme heat. Pre-cool, frequent water on head/neck, watch for heat illness.");
    }
    
    if (isExtremeCold && runnerBoldness <= 0) {
      tips.push("🥶 Extreme cold means business. Warm up indoors first, cover all skin including a balaclava for your face, and run short loops near shelter.");
    } else if (isExtremeCold && runnerBoldness > 0) {
      tips.push("🥶 Extreme cold. Cover everything, warm up indoors first.");
    }
  }

  if (tops.includes("wind") || tops.includes("coldSynergy")) {
    if (isVeryWindy && isVeryCold && runnerBoldness <= 0) {
      tips.push("💨 Wind chill is dangerous today. Windproof shell over everything, cover your face and ears, and start into the wind so you finish with it at your back. Check your fingers and face for numbness every 5 minutes.");
    } else if (isVeryWindy && isVeryCold && runnerBoldness > 0) {
      tips.push("💨 Wind chill warning. Windproof layers, cover face, start into wind.");
    } else if (isVeryWindy && runnerBoldness <= 1) {
      tips.push("💨 Strong winds today. Start into the wind and finish with a tailwind—trust me, you'll thank yourself. This is an effort run, not a pace run.");
    }
  }

  if (tops.includes("precip") && precipProb >= 70 && runnerBoldness <= 0) {
    tips.push("🌧️ Heavy rain expected. Use a cap to keep water off your face, good shell, and avoid painted road markings—they're slick as ice when wet.");
  } else if (tops.includes("precip") && precipProb >= 80 && runnerBoldness > 0) {
    tips.push("🌧️ Heavy rain. Cap, shell, watch painted surfaces.");
  }

  // Road condition warnings integration (only for cautious to balanced runners)
  if (roadConditions?.hasWarnings && runnerBoldness <= 0) {
    roadConditions.warnings.forEach(warning => {
      tips.push(`⚠️ ${warning.message}: ${warning.advice}`);
    });
  } else if (roadConditions?.severity === 'danger' && runnerBoldness > 0) {
    // Badass runners only get danger-level road warnings
    roadConditions.warnings.filter(w => w.level === 'danger').forEach(warning => {
      tips.push(`⚠️ ${warning.message}`);
    });
  }

  // WBGT-specific workout guidance (research-backed thresholds)
  if (workout && apparentF > 65) {
    const wbF = (tempF - 32) * (5 / 9) > 0 ? ((tempF - 32) * (5 / 9) * Math.atan(0.151977 * Math.sqrt((humidity / 100) * 100 + 8.313659)) + Math.atan((tempF - 32) * (5 / 9) + (humidity / 100) * 100) - Math.atan((humidity / 100) * 100 - 1.676331) + 0.00391838 * Math.pow((humidity / 100) * 100, 1.5) * Math.atan(0.023101 * (humidity / 100) * 100) - 4.686035) * (9 / 5) + 32 : apparentF;
    const wbgtRisk = assessWBGTRisk(wbF, true, false);
    if (wbgtRisk.level === 'dangerous') {
      tips.push(`🚨 Hard workout + heat: ${wbgtRisk.message} Performance suffers ~0.3-0.4% per °C above ideal WBGT—move to treadmill or reschedule.`);
    } else if (wbgtRisk.level === 'high-risk') {
      tips.push(`⚠️ Workout + heat: ${wbgtRisk.message} Consider converting to tempo effort instead of intervals, or postponing to cooler conditions.`);
    } else if (wbgtRisk.level === 'caution') {
      tips.push(`⚡ Workout + warmth: ${wbgtRisk.message} Extend recovery intervals by 30-60s, move hard reps to shaded areas.`);
    }
  }

  // WBGT-specific long run guidance (duration compounds risk)
  if (longRun && apparentF > 65) {
    const wbF = (tempF - 32) * (5 / 9) > 0 ? ((tempF - 32) * (5 / 9) * Math.atan(0.151977 * Math.sqrt((humidity / 100) * 100 + 8.313659)) + Math.atan((tempF - 32) * (5 / 9) + (humidity / 100) * 100) - Math.atan((humidity / 100) * 100 - 1.676331) + 0.00391838 * Math.pow((humidity / 100) * 100, 1.5) * Math.atan(0.023101 * (humidity / 100) * 100) - 4.686035) * (9 / 5) + 32 : apparentF;
    const wbgtRisk = assessWBGTRisk(wbF, false, true);
    if (wbgtRisk.level === 'dangerous' || wbgtRisk.level === 'high-risk') {
      tips.push(`🚨 Long run + heat: ${wbgtRisk.message} Research shows heat stress compounds over 60+ minutes—this is not a safe day for long distance.`);
    } else if (wbgtRisk.level === 'caution') {
      tips.push(`Long run heat management: ${wbgtRisk.message} Start slower than usual (first 2-3 mi at easy-easy pace), plan route with water/bailout points every 3-4 mi.`);
    }
  }

  // Pace guidance - conversational and practical (adjusted by boldness)
  let paceAdj;
  if (adjustedScore >= 85) {
    paceAdj = workout 
      ? "Hit your target paces. You've got this." 
      : "Run your normal pace. Nothing's holding you back today.";
  } else if (adjustedScore >= 70) {
    paceAdj = workout 
      ? "Add 5-15 seconds per mile to your interval paces. Respect the conditions, still get the work done." 
      : "Slow down 10-20 seconds per mile from your usual easy pace. It'll feel right.";
  } else if (adjustedScore >= 55) {
    paceAdj = workout
      ? "Tack on 15-30 seconds per mile to your workout paces, or just cut the volume by 20%. Quality over ego today." 
      : "Expect to slow down 25-40 seconds per mile. The effort's what counts, not the numbers.";
  } else if (adjustedScore >= 40) {
    paceAdj = workout
      ? (runnerBoldness >= 1 
          ? "Add 30-50 seconds per mile or seriously cut the reps. This isn't your day for a breakthrough." 
          : "Add 30-50 seconds per mile or just convert to an easy run. Better yet, hit the treadmill and actually get the workout done right.")
      : (runnerBoldness >= 1 
          ? "Slow down 45-75 seconds per mile. It's survival mode out there." 
          : "Slow down 45-75 seconds per mile, or just cut the distance by 30%. Don't be a hero.");
  } else {
    paceAdj = runnerBoldness >= 1 
      ? "Conditions are brutal. Manage expectations heavily or move indoors." 
      : "Seriously, just hop on the treadmill. There's no point suffering through this for a junk run.";
  }

  return { tips, paceAdj };
}

// Export feelsLike function for use in App.jsx
export { feelsLike };

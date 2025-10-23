import { UserRound, Cloud, Hand, Sun, Wind, CloudRain, Droplets } from "lucide-react";

// Gear icon mapping for outfit items
export const GEAR_ICONS = {
  // Tops
  singlet: UserRound,
  tShirt: UserRound,
  longSleeve: UserRound,
  jacket: Cloud,
  
  // Bottoms
  shorts: UserRound,
  tights: UserRound,
  
  // Accessories
  gloves: Hand,
  hat: UserRound,
  sunglasses: Sun,
  
  // Weather gear
  windbreaker: Wind,
  rainJacket: CloudRain,
  waterproof: CloudRain,
  
  // Hydration
  water: Droplets,
  hydration: Droplets,
};

// Aliases to help map free-text AI output to canonical gear keys.
// These are used by aiMapper to improve match accuracy.
export const GEAR_ALIASES = {
  'ear band': 'headband',
  'earband': 'headband',
  'ear-band': 'headband',
  'head band': 'headband',
  'cap for rain': 'brim_cap',
  'cap': 'cap',
  'sports bra': 'sports_bra',
  'running tights': 'tights',
  'light gloves': 'light_gloves',
  'gloves': 'light_gloves',
  'running socks': 'light_socks',
  'light running socks': 'light_socks',
  'sunglasses': 'sunglasses',
  'sunscreen': 'sunscreen',
  'windbreaker': 'windbreaker',
  'packable rain shell': 'rain_shell',
  'water': 'hydration',
  'water/hydration': 'hydration',
  'energy gels': 'energy_nutrition',
  'energy gels/chews': 'energy_nutrition',
  'anti-chafe balm': 'anti_chafe',
  'double socks': 'double_socks',
  'heavy running socks': 'heavy_socks'
};

// Comprehensive gear information database
export const GEAR_INFO = {
  // Tops
  sports_bra: {
    name: "Sports Bra",
    category: "Tops",
    description: "Essential foundation for female runners providing support and comfort during runs.",
    whenToWear: "Worn as a base layer in warm weather (70°F+) or under other layers in cooler conditions.",
    tips: "Choose high-impact for intense workouts, medium for easy runs. Look for moisture-wicking fabrics.",
    tempRange: "All temperatures as base layer",
    image: '/images/gear/sports_bra.png'
  },
  tank_top: {
    name: "Tank Top",
    category: "Tops",
    description: "Sleeveless running shirt for maximum ventilation and freedom of movement.",
    whenToWear: "Hot weather running (75°F+), especially in humid conditions or during hard workouts.",
    tips: "Great for summer racing. Apply sunscreen to exposed shoulders. Choose technical fabrics over cotton.",
    tempRange: "75°F and above",
    image: '/images/gear/tank_top.png'
  },
  short_sleeve: {
    name: "Short-Sleeve Tech Tee",
    category: "Tops",
    description: "Versatile moisture-wicking shirt suitable for a wide range of temperatures.",
    whenToWear: "Mild to warm weather (50-75°F). The go-to choice for most spring and fall runs.",
    tips: "Look for seamless construction to prevent chafing. Bright colors increase visibility.",
    tempRange: "50-75°F",
    image: '/images/gear/short_sleeve.png'
  },
  long_sleeve: {
    name: "Long-Sleeve Base",
    category: "Tops",
    description: "Technical long-sleeve shirt that provides warmth while wicking moisture away.",
    whenToWear: "Cool weather (40-55°F) or as a base layer in cold conditions.",
    tips: "Thumbholes keep sleeves in place. Can be layered under jackets for added warmth.",
    tempRange: "40-55°F",
    image: '/images/gear/long_sleeve.png'
  },
  vest: {
    name: "Short-Sleeve Tech Tee",
    category: "Top",
    description: "Additional lightweight short-sleeve shirt for extra warmth layer.",
    whenToWear: "Cool mornings (38-50°F) when you need extra warmth without bulk.",
    tips: "Layer over your base shirt. Easy to remove and tie around waist if you warm up.",
    tempRange: "38-50°F",
    image: '/images/gear/short_sleeve.png'
  },
  light_jacket: {
    name: "Light Jacket",
    category: "Outerwear",
    description: "Lightweight wind and water-resistant outer layer for cold weather protection.",
    whenToWear: "Cold weather (30-45°F) with wind or light precipitation.",
    tips: "Look for reflective details for visibility. Pit zips help regulate temperature.",
    tempRange: "30-45°F",
    image: '/images/gear/light_jacket.png'
  },
  insulated_jacket: {
    name: "Insulated Jacket",
    category: "Outerwear",
    description: "Heavy-duty jacket with thermal insulation for the coldest conditions.",
    whenToWear: "Very cold weather (below 25°F) or extreme wind chill.",
    tips: "May feel too warm during hard efforts. Best for easy runs in frigid temps.",
    tempRange: "Below 25°F",
    image: null, // Path to image file (e.g., '/images/gear/insulated_jacket.png')
  },
  
  // Bottoms
  split_shorts: {
    name: "Split Shorts",
    category: "Bottoms",
    description: "Lightweight racing shorts with side splits for maximum range of motion.",
    whenToWear: "Warm weather (60°F+), especially for speed workouts and races.",
    tips: "Built-in liner provides support. Short inseam increases ventilation and stride freedom.",
    tempRange: "60°F and above",
    image: '/images/gear/split_shorts.png'
  },
  shorts: {
    name: "Running Shorts",
    category: "Bottoms",
    description: "Standard running shorts offering comfort and breathability.",
    whenToWear: "Mild to warm weather (50-70°F). Year-round for some experienced runners.",
    tips: "5-7 inch inseam is most common. Pockets are handy for keys or energy gels.",
    tempRange: "50-70°F",
    image: '/images/gear/shorts.png'
  },
  tights: {
    name: "Running Tights",
    category: "Bottoms",
    description: "Form-fitting pants that provide muscle support and warmth.",
    whenToWear: "Cool to cold weather (30-50°F). Essential for winter running.",
    tips: "Compression tights aid recovery. Fleece-lined versions add extra warmth.",
    tempRange: "30-50°F",
    image: '/images/gear/tights.png'
  },
  thermal_tights: {
    name: "Thermal Tights",
    category: "Bottoms",
    description: "Insulated tights with thermal lining for extreme cold protection.",
    whenToWear: "Very cold weather (below 30°F) or high wind chill.",
    tips: "Double-layer construction traps heat. May need to size up for layering.",
    tempRange: "Below 30°F",
    image: '/images/gear/tights.png'
  },
  
  // Head & Hands
  cap: {
    name: "Cap",
    category: "Headwear",
    description: "Lightweight cap to shield eyes from sun and keep sweat out of your face.",
    whenToWear: "Sunny conditions with high UV index (6+). Useful in light rain too.",
    tips: "Mesh panels increase ventilation. Darker colors underneath bill reduce glare.",
    tempRange: "All temperatures",
    image: '/images/gear/cap.png'
  },
  brim_cap: {
    name: "Cap for rain",
    category: "Headwear",
    description: "Cap with brim for keeping rain off your face and glasses.",
    whenToWear: "Rain (40%+ chance). Essential for keeping vision clear in wet conditions.",
    tips: "Brim keeps rain off glasses. Look for water-resistant fabric.",
    tempRange: "All temperatures",
    image: '/images/gear/cap.png'
  },
  headband: {
    name: "Ear Band",
    category: "Headwear",
    description: "Covers ears while allowing heat to escape from the top of your head.",
    whenToWear: "Cool weather (35-45°F) when ears need protection but a beanie is too warm.",
    tips: "Perfect middle ground between bare head and beanie. Stays in place better than hats.",
    tempRange: "35-45°F",
    image: '/images/gear/headband.png'
  },
  beanie: {
    name: "Running Beanie",
    category: "Headwear",
    description: "Thermal hat that prevents significant heat loss from your head.",
    whenToWear: "Cold weather (below 35°F). Essential when temperature drops significantly.",
    tips: "You lose 10% of body heat through your head. Breathable fabric prevents overheating.",
    tempRange: "Below 35°F",
    image: '/images/gear/beanie.png'
  },
  balaclava: {
    name: "Balaclava",
    category: "Headwear",
    description: "Full head and face coverage protecting cheeks, nose, and neck from extreme cold and wind.",
    whenToWear: "Very cold weather (below 10°F) or extreme wind chill. Essential for preventing frostbite.",
    tips: "Look for breathable mesh mouth panel to reduce moisture and fogging. Can layer under beanie for extra warmth at 0°F.",
    tempRange: "Below 10°F or severe wind chill",
    image: null, // Path to image file (e.g., '/images/gear/balaclava.png')
  },
  light_gloves: {
    name: "Light Gloves",
    category: "Hands",
    description: "Thin, breathable gloves for mild cold protection.",
    whenToWear: "Cool mornings (40-50°F) when hands need light coverage.",
    tips: "Touch-screen compatible fingertips let you use your phone. Easy to pocket if you warm up.",
    tempRange: "40-50°F",
    image: '/images/gear/light_gloves.png'
  },
  medium_gloves: {
    name: "Medium Gloves",
    category: "Hands",
    description: "Insulated gloves providing solid cold weather protection.",
    whenToWear: "Cold weather (25-40°F) or windy conditions.",
    tips: "Windproof shell on palm side. Moisture-wicking liner keeps hands dry.",
    tempRange: "25-40°F",
    image: '/images/gear/medium_gloves.png'
  },
  mittens: {
    name: "Running Mittens",
    category: "Hands",
    description: "Maximum hand warmth by keeping fingers together to share heat.",
    whenToWear: "Very cold weather (below 25°F) or severe wind chill.",
    tips: "Warmer than gloves but less dexterity. Consider convertible mitten-glove hybrids.",
    tempRange: "Below 25°F",
    image: null, // Path to image file (e.g., '/images/gear/mittens.png')
  },
  mittens_liner: {
    name: "Glove Liner (under mittens)",
    category: "Hands",
    description: "Thin inner glove worn under mittens for extreme cold layering.",
    whenToWear: "Extreme cold (below 10°F) or frostbite-level wind chill.",
    tips: "Can be worn alone in milder cold. Adds versatility to your hand protection system.",
    tempRange: "Below 10°F",
    image: '/images/gear/light_gloves.png'
  },
  
  // Accessories
  arm_sleeves: {
    name: "Arm Sleeves",
    category: "Accessories",
    description: "Removable sleeves providing thermal protection in cold, UV protection in sun, and evaporative cooling in dry heat.",
    whenToWear: "Research-backed: ESSENTIAL below 45°F (thermal/brushed knit) or UV index 8+ (UPF 50+). RECOMMENDED for UV 3-7 (UPF 30-50+), windy/cool conditions, or full sun + dry air (evaporative cooling). OPTIONAL 45-60°F for comfort/warm-up. SKIP above 60°F unless UV dictates or in hot+humid conditions (reduces sweat evaporation).",
    tips: "Thermal sleeves for cold (<45°F), UPF 50+ for high UV (8+), UPF 30+ for moderate UV (3-7). Thin sleeves you can wet work best in dry air for evaporative cooling. Easy to remove and pocket mid-run. Permethrin-treated versions prevent tick/mosquito bites (0.5% per CDC). Compression versions may aid recovery but show no clear performance gains in latest research.",
    tempRange: "Below 45°F (thermal), 45-60°F (optional), any temp with UV 3+ (sun protection)",
    image: '/images/gear/arm_sleeves.png'
  },
  arm_sleeves_optional: {
    name: "Arm Sleeves (Optional)",
    category: "Accessories",
    description: "Optional removable sleeves for borderline conditions where they provide benefit but aren't essential.",
    whenToWear: "Moderate temps (45-60°F) for comfort, moderate UV (3-7) in warm weather, temperature swings on long runs, or personal preference scenarios.",
    tips: "Same as arm sleeves but recommended for comfort/preference rather than necessity. Great for warm-up miles - remove and pocket when you heat up. Consider if you tend to run cold or prefer extra sun protection.",
    tempRange: "45-60°F, or warm weather with moderate UV",
    image: '/images/gear/arm_sleeves.png'
  },
  neck_gaiter: {
    name: "Neck Gaiter",
    category: "Accessories",
    description: "Tube of fabric protecting neck and face from cold air and wind.",
    whenToWear: "Very cold (below 33°F) or very windy conditions (18+ mph).",
    tips: "Pull up over nose and mouth in extreme cold. Prevents breathing cold air directly.",
    tempRange: "Below 33°F",
    image: '/images/gear/neck_gaiter.png'
  },
  windbreaker: {
    name: "Windbreaker",
    category: "Outerwear",
    description: "Ultra-light wind-blocking layer that packs down small. Essential for protecting against wind chill while maintaining breathability.",
    whenToWear: "Research-backed guidelines: NEVER above 59°F (too warm). Optional at 55-59°F only for long runs with 20+ mph winds. Recommended with base layer at 50°F+ with 10+ mph winds, essential at 45°F and below, critical with midlayer at 35°F and below.",
    tips: "Packs into own pocket. Great insurance on long runs. Not waterproof. At 50°F+ pair with base layer; below 35°F add midlayer underneath for optimal warmth.",
    tempRange: "35-59°F with wind (10+ mph recommended at 50°F, essential below 45°F)",
    image: '/images/gear/windbreaker.png'
  },
  rain_shell: {
    name: "Packable Rain Shell",
    category: "Outerwear",
    description: "Waterproof jacket designed to keep you dry in wet conditions.",
    whenToWear: "Rain probability 40%+ or during precipitation.",
    tips: "Breathable fabric prevents overheating. Bright colors increase visibility in storms.",
    tempRange: "All temperatures in rain",
    image: null, // Path to image file (e.g., '/images/gear/rain_shell.png')
  },
  sunglasses: {
    name: "Sunglasses",
    category: "Accessories",
    description: "UV-protective eyewear reducing glare and eye strain.",
    whenToWear: "High UV index (7+) or very sunny conditions.",
    tips: "Polarized lenses reduce road glare. Secure fit prevents bouncing while running.",
    tempRange: "All temperatures",
    image: null, // Path to image file (e.g., '/images/gear/sunglasses.png')
  },
  sunscreen: {
    name: "Sunscreen",
    category: "Accessories",
    description: "SPF protection preventing sunburn on exposed skin.",
    whenToWear: "UV index 6+ or any long run over 1 hour in daylight.",
    tips: "Sport formula resists sweat. Reapply every 80 minutes on long runs. SPF 30+ minimum.",
    tempRange: "All temperatures",
    image: null, // Path to image file (e.g., '/images/gear/sunscreen.png')
  },
  
  // Nutrition & Care
  hydration: {
    name: "Water/Hydration",
    category: "Nutrition",
    description: "Fluid replacement essential for performance and safety.",
    whenToWear: "Runs over 45 minutes, hot weather (75°F+), or high humidity (75%+).",
    tips: "Handheld bottle, vest, or belt. Drink before you feel thirsty. Electrolytes for 90+ min runs.",
    tempRange: "All temperatures",
    image: '/images/gear/hydration.png'
  },
  energy_nutrition: {
    name: "Energy Gels/Chews",
    category: "Nutrition",
    description: "Quick-absorbing carbohydrates to fuel long runs.",
    whenToWear: "Long runs (90+ minutes) or runs over 50°F when body processes fuel efficiently.",
    tips: "Take with water. Start fueling at 45-60 minutes. 30-60g carbs per hour.",
    tempRange: "50°F and above",
    image: '/images/gear/energy_nutrition.png'
  },
  anti_chafe: {
    name: "Anti-Chafe Balm",
    category: "Care",
    description: "Lubricant preventing friction and chafing on long runs.",
    whenToWear: "Runs over 60 minutes, humid conditions (75%+), or anywhere skin rubs.",
    tips: "Apply to inner thighs, underarms, nipples. Reapply on very long runs (2+ hours).",
    tempRange: "All temperatures",
    image: '/images/gear/anti_chafe.png'
  },
  
  // Socks
  light_socks: {
    name: "Light Running Socks",
    category: "Socks",
    description: "Thin moisture-wicking socks for warm weather comfort.",
    whenToWear: "Warm, dry conditions (60°F+) or indoor running.",
    tips: "Moisture-wicking prevents blisters. Seamless toe reduces irritation.",
    tempRange: "60°F and above",
    image: '/images/gear/light_socks.png'
  },
  heavy_socks: {
    name: "Heavy Running Socks",
    category: "Socks",
    description: "Cushioned socks with extra warmth and protection.",
    whenToWear: "Cold weather (below 40°F) or when extra cushioning is needed.",
    tips: "Merino wool regulates temperature. Extra padding reduces impact on long runs.",
    tempRange: "Below 40°F",
    image: null, // Path to image file (e.g., '/images/gear/heavy_socks.png')
  },
  double_socks: {
    name: "Double Socks (layered)",
    category: "Socks",
    description: "Two layers of socks for extreme cold or blister prevention.",
    whenToWear: "Very cold/wet conditions (below 32°F) or high precipitation.",
    tips: "Thin liner sock under thicker outer sock. Helps manage moisture and adds warmth.",
    tempRange: "Below 32°F or wet conditions",
    image: '/images/gear/double_socks.png'
  },
};

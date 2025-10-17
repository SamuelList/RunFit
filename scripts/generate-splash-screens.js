#!/usr/bin/env node

/**
 * Generate iOS splash screens for RunFit PWA
 * 
 * This script creates simple splash screens for various iPhone sizes.
 * For production, consider using tools like:
 * - pwa-asset-generator: https://github.com/elegantapp/pwa-asset-generator
 * - @vite-pwa/assets-generator
 * 
 * Run: node scripts/generate-splash-screens.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Splash screen configurations for various iPhone sizes
const splashScreens = [
  { name: 'iphone-15-pro-max-portrait', width: 1290, height: 2796 },
  { name: 'iphone-15-pro-portrait', width: 1179, height: 2556 },
  { name: 'iphone-14-portrait', width: 1170, height: 2532 },
  { name: 'iphone-11-portrait', width: 828, height: 1792 },
  { name: 'iphone-se-portrait', width: 750, height: 1334 },
];

const outputDir = path.join(__dirname, '../public/splash');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate simple SVG splash screens
splashScreens.forEach(screen => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${screen.width}" height="${screen.height}" viewBox="0 0 ${screen.width} ${screen.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${screen.width}" height="${screen.height}" fill="url(#bg-gradient)"/>
  
  <!-- App Name -->
  <text 
    x="${screen.width / 2}" 
    y="${screen.height / 2}" 
    font-family="system-ui, -apple-system, sans-serif" 
    font-size="${Math.floor(screen.width / 10)}" 
    font-weight="800" 
    fill="#0ea5e9" 
    text-anchor="middle" 
    dominant-baseline="middle"
    opacity="0.9"
  >RunFit</text>
  
  <!-- Tagline -->
  <text 
    x="${screen.width / 2}" 
    y="${screen.height / 2 + Math.floor(screen.width / 12)}" 
    font-family="system-ui, -apple-system, sans-serif" 
    font-size="${Math.floor(screen.width / 30)}" 
    font-weight="400" 
    fill="#94a3b8" 
    text-anchor="middle" 
    dominant-baseline="middle"
    opacity="0.7"
  >Running Weather Companion</text>
</svg>`;

  const outputPath = path.join(outputDir, `${screen.name}.svg`);
  fs.writeFileSync(outputPath, svg);
  console.log(`✓ Generated ${screen.name}.svg`);
});

console.log('\n✨ Splash screens generated successfully!');
console.log('\nFor PNG conversion (optional):');
console.log('  npm install -D sharp');
console.log('  Then convert SVGs to PNGs using sharp or online tools');
console.log('\nOr use pwa-asset-generator for automatic generation:');
console.log('  npx pwa-asset-generator public/logo512.png public/splash -b "#0f172a"');

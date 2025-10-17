# RunFit PWA Setup Guide

## ✨ Progressive Web App Features

RunFit is now a full-featured Progressive Web App with native iOS app feel!

### 🎯 Features Implemented

#### 1. **Edge-to-Edge Display**
- Full-screen experience using `viewport-fit=cover`
- Safe area insets for iPhone notch and home indicator
- Dynamic viewport height (`100dvh`) for proper iOS handling

#### 2. **iOS Safe Area Support**
- Automatic padding for:
  - Top: Status bar and Dynamic Island
  - Bottom: Home indicator
  - Left/Right: Rounded corners
- CSS variables for custom layouts: `--sat`, `--sar`, `--sab`, `--sal`

#### 3. **Native iOS Feel**
- **Status Bar**: Black translucent style
- **Smooth Scrolling**: `-webkit-overflow-scrolling: touch`
- **Gestures**: Tap highlight removal, callout disabled
- **Overscroll**: Bounce disabled for native feel
- **Theme**: Dark mode by default with `#0f172a` background

#### 4. **Splash Screens**
- Custom splash screens for all iPhone sizes:
  - iPhone 15 Pro Max / 14 Pro Max
  - iPhone 15 Pro / 15 / 14 Pro
  - iPhone 14 / 13 / 12
  - iPhone 11 / XR
  - iPhone SE (3rd gen)
- Branded with RunFit name and tagline
- SVG format for crisp display at any resolution

#### 5. **Service Worker & Offline Support**
- Automatic caching of static assets
- Network-first for weather API calls
- Cache-first for app resources
- Offline fallback support

### 📱 Installation Instructions

#### On iOS (iPhone/iPad):

1. Open Safari and navigate to your RunFit URL
2. Tap the **Share** button (square with arrow pointing up)
3. Scroll down and tap **"Add to Home Screen"**
4. Customize the name if desired
5. Tap **"Add"**
6. The app will appear on your home screen with the RunFit icon
7. Launch from home screen for full-screen experience!

#### On Android:

1. Open Chrome and navigate to your RunFit URL
2. Tap the menu (three dots)
3. Tap **"Add to Home screen"** or **"Install app"**
4. Follow the prompts
5. Launch from home screen

### 🔧 Development

#### Generate Splash Screens

```bash
npm run generate-splash
# or
node scripts/generate-splash-screens.js
```

This creates SVG splash screens in `public/splash/` for all iPhone sizes.

#### Convert to PNG (Optional)

For better compatibility, you can convert SVGs to PNGs:

```bash
# Using pwa-asset-generator (recommended)
npx pwa-asset-generator public/logo512.png public/splash -b "#0f172a" --splash-only

# Or use online tools like:
# - https://svgtopng.com/
# - https://cloudconvert.com/svg-to-png
```

#### Service Worker

The service worker is automatically registered in `src/index.jsx` and provides:
- Offline caching
- Runtime caching for API calls
- Automatic updates

To disable service worker during development:
```javascript
// Comment out in src/index.jsx:
// if ('serviceWorker' in navigator) { ... }
```

### 🎨 Customization

#### Theme Colors

Update in `public/manifest.json`:
```json
{
  "theme_color": "#0ea5e9",
  "background_color": "#0f172a"
}
```

#### Safe Area Adjustments

Modify safe area padding in `src/App.jsx`:
```javascript
style={{
  paddingTop: 'env(safe-area-inset-top)',
  paddingBottom: 'env(safe-area-inset-bottom)',
  // Add extra padding if needed:
  paddingTop: 'calc(env(safe-area-inset-top) + 1rem)',
}}
```

#### iOS Status Bar Style

Update in `index.html`:
```html
<!-- Options: default, black, black-translucent -->
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

### 🧪 Testing

#### Test iOS Features:

1. **Safari DevTools**:
   - Enable responsive design mode
   - Select iPhone device
   - Check safe area insets

2. **Real Device**:
   - Install as PWA
   - Test edge-to-edge layout
   - Verify splash screen
   - Check offline functionality

3. **Lighthouse PWA Audit**:
   ```bash
   # In Chrome DevTools:
   # 1. Open DevTools (F12)
   # 2. Go to Lighthouse tab
   # 3. Select "Progressive Web App"
   # 4. Click "Generate report"
   ```

### 📊 PWA Checklist

- ✅ HTTPS deployment (required for service workers)
- ✅ Valid manifest.json with icons
- ✅ Service worker registered
- ✅ Apple touch icons
- ✅ iOS splash screens
- ✅ Safe area insets
- ✅ Viewport meta tag with `viewport-fit=cover`
- ✅ Theme color meta tags
- ✅ Standalone display mode
- ✅ Offline fallback

### 🚀 Deployment

For best PWA experience, ensure your hosting platform:
- Serves over HTTPS
- Sets proper caching headers
- Serves manifest.json with `application/manifest+json` MIME type
- Serves service worker from root path

Recommended platforms:
- **Vercel**: Zero-config PWA support
- **Netlify**: Automatic HTTPS and headers
- **Firebase Hosting**: Built-in PWA support
- **GitHub Pages**: Free HTTPS with custom domain

### 📱 Features by Platform

| Feature | iOS Safari | Chrome Android | Desktop |
|---------|-----------|----------------|---------|
| Standalone Mode | ✅ | ✅ | ✅ |
| Splash Screen | ✅ | ✅ | ❌ |
| Safe Areas | ✅ | ✅ | N/A |
| Service Worker | ✅ | ✅ | ✅ |
| Offline Mode | ✅ | ✅ | ✅ |
| Home Screen Icon | ✅ | ✅ | ✅ |
| Push Notifications | ❌ | ✅ | ✅ |

### 🐛 Troubleshooting

**Splash screen not showing?**
- Check media queries match your device
- Verify splash image paths are correct
- Try converting SVG to PNG

**Service worker not updating?**
- Hard reload: Shift + Cmd + R (Mac) or Shift + Ctrl + R (Windows)
- Clear application cache in DevTools
- Unregister service worker and reload

**Safe areas not working?**
- Ensure `viewport-fit=cover` is set
- Check iOS version (requires iOS 11+)
- Verify CSS uses `env(safe-area-inset-*)`

**Not installing on iOS?**
- Must use Safari browser
- Cannot install from in-app browsers (Gmail, Facebook, etc.)
- Requires HTTPS (except localhost)

### 📚 Resources

- [iOS PWA Guide](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [PWA Builder](https://www.pwabuilder.com/)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)
- [iOS Safe Areas](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)

---

**Built with ❤️ for runners**

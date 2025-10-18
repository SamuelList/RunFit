# React Context Migration Guide

## Overview

The RunFit app now uses React Context for centralized state management, replacing prop drilling and scattered useState hooks. This guide explains how to migrate components to use the new context system.

---

## 📚 Available Contexts

### 1. **WeatherContext** - Weather data and location
```jsx
import { useWeather } from './contexts';

const { wx, place, loading, error, updateWeather, updateLocation } = useWeather();
```

**State:**
- `wx` - Current weather data
- `place` - Location information
- `loading` - Weather loading state
- `error` - Error message (if any)
- `lastRefresh` - Timestamp of last refresh

**Actions:**
- `updateWeather(data)` - Update weather data
- `updateLocation(location)` - Update location
- `setLoading(boolean)` - Set loading state
- `setError(message)` - Set error message
- `clearError()` - Clear error

---

### 2. **SettingsContext** - User preferences
```jsx
import { useSettings } from './contexts';

const { 
  unit, setUnit,
  theme, setTheme,
  coldHands, setColdHands,
  gender, setGender,
  // ... all settings
} = useSettings();
```

**Settings:**
- `unit` - Temperature unit ('F' or 'C')
- `theme` - Theme mode ('light', 'dark', 'auto')
- `coldHands` - Cold hands preference
- `gender` - User gender ('Male', 'Female')
- `runnerBoldness` - Boldness slider value (-2 to 2)
- `tempSensitivity` - Temperature sensitivity (-2 to 2)
- `manualHour` - Manual hour override (for testing)
- `showTomorrowOutfit` - Show tomorrow's outfit card
- `tomorrowRunHour` - Tomorrow's run hour (0-23)
- `tomorrowRunType` - Tomorrow's run type ('easy', 'workout', 'longRun')
- `tomorrowCardRunType` - Tomorrow card run type
- `tomorrowCardOption` - Tomorrow card option ('A' or 'B')
- `smartNightCard` - Smart night card enabled

**Actions:**
- Individual setters: `setUnit()`, `setTheme()`, etc.
- `updateSetting(key, value)` - Update single setting
- `updateSettings(object)` - Update multiple settings
- `resetSettings()` - Reset to defaults

**Persistence:**
- Automatically saves to localStorage
- Loads from localStorage on mount

---

### 3. **UIContext** - UI state (modals, panels)
```jsx
import { useUI } from './contexts';

const { 
  showSettings, openSettings, closeSettings,
  showInsights, openInsights, closeInsights,
  debugActive, toggleDebug,
  // ... all UI state
} = useUI();
```

**Modal States:**
- `showSettings` - Settings modal
- `showInsights` - Insights modal
- `showGearGuide` - Gear guide modal
- `showTimePickerModal` - Time picker modal
- `showHourBreakdown` - Hour breakdown modal
- `selectedHour` - Selected hour for breakdown

**Panel States:**
- `show24HourForecast` - 24-hour forecast panel

**Debug:**
- `debugActive` - Debug mode enabled

**Loading:**
- `loadingProgress` - Loading progress (0-100)
- `loadingStage` - Loading stage message

**Toast:**
- `toast` - Toast notification object

**Actions:**
- Modal actions: `openSettings()`, `closeSettings()`, etc.
- Direct setters: `setShowSettings(boolean)`
- Panel actions: `toggle24HourForecast()`
- Debug: `toggleDebug()`
- Loading: `updateLoadingProgress(progress, stage)`, `resetLoading()`
- Toast: `showToast(message, type, duration)`, `hideToast()`

---

## 🔄 Migration Examples

### Before: Prop Drilling
```jsx
// App.jsx
function App() {
  const [unit, setUnit] = useState('F');
  const [wx, setWx] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  
  return (
    <Header 
      unit={unit} 
      setUnit={setUnit}
      wx={wx}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
    />
  );
}

// Header.jsx
function Header({ unit, setUnit, wx, showSettings, setShowSettings }) {
  // Deep prop drilling...
}
```

### After: Using Context
```jsx
// App.jsx
function App() {
  // No more prop drilling!
  return <Header />;
}

// Header.jsx
import { useWeather, useSettings, useUI } from '../contexts';

function Header() {
  const { wx } = useWeather();
  const { unit, setUnit } = useSettings();
  const { showSettings, setShowSettings } = useUI();
  
  // Direct access to state!
}
```

---

## 📝 Migration Checklist

### Step 1: Identify Component State
Determine which context(s) a component needs:
- Weather data? → `useWeather()`
- User preferences? → `useSettings()`
- Modal/UI state? → `useUI()`

### Step 2: Replace Props with Context
```jsx
// Before
function MyComponent({ unit, setUnit, wx, showModal, setShowModal }) {

// After
import { useWeather, useSettings, useUI } from '../contexts';

function MyComponent() {
  const { wx } = useWeather();
  const { unit, setUnit } = useSettings();
  const { showModal, setShowModal } = useUI();
```

### Step 3: Remove Prop Passing
Remove the props from parent component calls:
```jsx
// Before
<MyComponent 
  unit={unit}
  setUnit={setUnit}
  wx={wx}
  showModal={showModal}
  setShowModal={setShowModal}
/>

// After
<MyComponent />
```

### Step 4: Update Tests
Update tests to wrap components with providers:
```jsx
import { AppProviders } from '../contexts';

test('renders component', () => {
  render(
    <AppProviders>
      <MyComponent />
    </AppProviders>
  );
});
```

---

## 🎯 Priority Migration Order

### Phase 1: Settings (Easy Win)
Migrate settings-related state first as it's the simplest:
- SettingsModal
- Header (unit, theme)
- CurrentConditions (unit)
- All components using `unit`, `gender`, `coldHands`

### Phase 2: UI State (Modal Management)
Migrate modal and panel state:
- All modals (Settings, Insights, GearGuide, etc.)
- Header (modal triggers)
- 24-hour forecast panel toggle

### Phase 3: Weather Data (More Complex)
Migrate weather data access:
- All weather display components
- Weather fetching logic
- Location management

---

## 🔍 Finding Components to Migrate

### Search for Props
Find components receiving these props:
```bash
grep -r "unit, setUnit" src/
grep -r "showSettings" src/
grep -r "wx, " src/
grep -r "place, setPlace" src/
```

### Common Patterns
Look for these patterns in components:
- `{ unit, setUnit }` in props → Use `useSettings()`
- `{ wx, loading, error }` → Use `useWeather()`
- `{ showModal, setShowModal }` → Use `useUI()`

---

## ⚠️ Important Notes

### Don't Migrate Everything at Once
- Start with leaf components (no children)
- Work your way up the tree
- Test after each migration

### Keep App.jsx Logic for Now
The main App.jsx file still needs to:
- Fetch weather data
- Calculate derived values
- Handle business logic

We'll migrate this in later phases using custom hooks.

### Backward Compatibility
The contexts work alongside existing props:
- Components can use both props and context during migration
- Gradually remove props as you migrate

---

## 📖 Usage Examples

### Example 1: Settings Modal
```jsx
import { useSettings } from '../contexts';

function SettingsModal() {
  const { 
    unit, setUnit,
    theme, setTheme,
    gender, setGender,
    coldHands, setColdHands,
    resetSettings
  } = useSettings();
  
  return (
    <div>
      <select value={unit} onChange={(e) => setUnit(e.target.value)}>
        <option value="F">Fahrenheit</option>
        <option value="C">Celsius</option>
      </select>
      
      <button onClick={resetSettings}>Reset to Defaults</button>
    </div>
  );
}
```

### Example 2: Weather Display
```jsx
import { useWeather, useSettings } from '../contexts';

function CurrentConditions() {
  const { wx, loading, error } = useWeather();
  const { unit } = useSettings();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h2>{wx.temperature}°{unit}</h2>
    </div>
  );
}
```

### Example 3: Modal Management
```jsx
import { useUI } from '../contexts';

function Header() {
  const { openSettings, openInsights } = useUI();
  
  return (
    <div>
      <button onClick={openSettings}>Settings</button>
      <button onClick={openInsights}>Insights</button>
    </div>
  );
}
```

---

## 🚀 Next Steps

1. **Start with SettingsModal** - Easiest migration
2. **Migrate Header** - High-impact, visible change
3. **Update CurrentConditions** - Core weather display
4. **Migrate all modals** - Clean up modal state
5. **Weather components** - Complete the migration

After completing these migrations, we can:
- Remove useState hooks from App.jsx
- Simplify prop passing
- Improve component testability
- Reduce bundle size (less prop spreading)

---

## 📊 Progress Tracking

Create a checklist of components to migrate:

- [ ] SettingsModal → useSettings, useUI
- [ ] Header → useWeather, useSettings, useUI
- [ ] CurrentConditions → useWeather, useSettings
- [ ] OutfitRecommendation → useWeather, useSettings
- [ ] InsightsModal → useWeather, useSettings, useUI
- [ ] ForecastCard → useWeather, useSettings
- [ ] BestRunTimeCard → useWeather, useSettings
- [ ] NightRunningCard → useWeather, useSettings
- [ ] TomorrowOutfit → useWeather, useSettings
- [ ] PerformanceScore → useWeather, useSettings, useUI
- [ ] WeatherGauge → useWeather, useSettings
- [ ] WeatherMetrics → useWeather, useSettings

---

**Status**: Contexts implemented, ready for migration
**Next**: Start migrating components one-by-one

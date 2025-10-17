# RunFit App - Refactoring Plan

**Goal**: Transform the monolithic `App.jsx` into a clean, maintainable React application following best practices with modular components, proper separation of concerns, and comprehensive documentation.

---

## 📊 Current State Analysis

### Issues
- **6,000+ line monolithic `App.jsx`** - All logic, state, and UI in one file
- **Mixed concerns** - Weather fetching, outfit logic, scoring, and UI rendering combined
- **Repeated code** - Similar patterns duplicated across components
- **Hard to test** - Tightly coupled logic makes unit testing difficult
- **Poor discoverability** - Hard to find and modify specific features
- **State management** - 20+ useState hooks at the root level
- **Inline components** - ForecastCard, BestRunTimeCard defined inside App.jsx
- **Utils scattered** - Some logic in utils/, some in App.jsx

### Strengths to Preserve
- ✅ Excellent UX and animations (Framer Motion)
- ✅ Comprehensive weather scoring algorithm
- ✅ Thoughtful outfit recommendation system
- ✅ Strong accessibility features
- ✅ PWA implementation
- ✅ TypeScript configuration

---

## 🎯 Refactoring Phases

### **Phase 1: Extract Custom Hooks** (Week 1) DONE!
Move state management and side effects into reusable hooks.

#### Tasks
1. **`useWeatherData.js`**
   - Weather fetching logic
   - Geolocation handling
   - Location search
   - Data caching
   - Loading states

2. **`useSettings.js`**
   - Settings state management
   - LocalStorage persistence
   - Theme management
   - User preferences

3. **`useRunConditions.js`**
   - Score calculations
   - WBGT calculations
   - Outfit recommendations
   - Best run times
   - Moon phase calculations

4. **`useLoadingProgress.js`**
   - Loading state management
   - Progress tracking
   - Stage transitions

#### File Structure
```
src/
  hooks/
    useWeatherData.js
    useSettings.js
    useRunConditions.js
    useLoadingProgress.js
    useDebugMode.js
    index.js  // Re-export all hooks
```

---

### **Phase 2: Component Extraction** (Week 2)
Break down the monolithic App into smaller, focused components.

#### Core Layout Components DONE!
```
src/
  components/
    layout/ DONE!
      AppShell.jsx           // Main wrapper with safe areas
      Header.jsx             // Location, refresh, settings
      StatusBarOverlay.jsx   // Frosted glass effect
      LoadingSplash.jsx      // Splash screen with progress
```

#### Feature Components
```
src/
  components/
    weather/ DONE!
      CurrentConditions.jsx     // Main weather card
      WeatherGauge.jsx          // Radial score gauge
      WeatherMetrics.jsx        // Temp, humidity, wind, etc.
      ForecastCard.jsx          // 6-hour outlook
      HourlySlot.jsx            // Individual hour breakdown
      
    running/ DONE!
      OutfitRecommendation.jsx  // Main outfit display
      OutfitItem.jsx            // Individual gear item
      OutfitToggle.jsx          // Performance vs Comfort
      BestRunTimes.jsx          // Best times card
      RunTypeSelector.jsx       // Easy/Workout/Long
      
    insights/ DONE!
      InsightsModal.jsx         // Score breakdown modal
      ScoreBreakdown.jsx        // Detailed scoring
      ApproachTips.jsx          // Running tips
      RoadConditions.jsx        // Surface warnings
      
    night/ DONE!
      NightRunningCard.jsx      // Moon phase & visibility
      MoonPhaseVisual.jsx       // SVG moon display
      VisibilityMetrics.jsx     // Clarity calculations
      
    tomorrow/
      TomorrowOutfit.jsx        // Tomorrow's gear
      TimeSelector.jsx          // Hour picker
      
    modals/
      SettingsModal.jsx         // App settings
      GearGuideModal.jsx        // Gear information
      GearDetailModal.jsx       // Individual item details
      DebugModal.jsx            // Debug tools
      HourBreakdownModal.jsx    // Hour detail modal
      
    ui/ DONE!
      Card.jsx                  // Shared card component
      Button.jsx                // Button variants
      Input.jsx                 // Form inputs
      Switch.jsx                // Toggle switches
      SegmentedControl.jsx      // Tab-like control
      Label.jsx                 // Form labels
      ProgressBar.jsx           // Loading bars
      Toast.jsx                 // Notifications
```

---

### **Phase 3: Utilities & Services** (Week 3)
Organize and document utility functions and external services.

#### File Structure
```
src/
  services/ DONE!
    weatherApi.js           // Weather API calls
    geocodingApi.js         // Location services
    
  utils/ DONE!
    calculations/
      scoring.js            // Score calculation logic
      wbgt.js              // WBGT calculations
      dewPoint.js          // Dew point utilities
      
    outfit/
      outfitLogic.js       // Core outfit recommendations
      gearRules.js         // Gear selection rules
      handProtection.js    // Glove/mitten logic
      
    time/
      sunEvents.js         // Solar calculations
      moonPhase.js         // Moon calculations
      timeFormatting.js    // Time utilities
      
    formatting/
      temperature.js       // Unit conversions
      weather.js           // Weather formatting
      
    animations/
      variants.js          // Framer Motion variants
      transitions.js       // Shared animations
      
    constants/
      thresholds.js        // Temperature thresholds
      colors.js            // Theme colors
      config.js            // App configuration
      alerts.js            // Alert metadata
```

---

### **Phase 4: State Management** (Week 4)
Consider adding a state management solution for complex state.

#### Options
1. **React Context** (Lightweight)
   - WeatherContext
   - SettingsContext
   - UIContext

2. **Zustand** (Recommended)
   - Small bundle size
   - Simple API
   - No boilerplate

3. **Redux Toolkit** (If needed)
   - For very complex state
   - Time travel debugging

#### Proposed Store Structure (Zustand)
```javascript
// stores/weatherStore.js
export const useWeatherStore = create((set) => ({
  weather: null,
  loading: false,
  error: null,
  fetchWeather: async (location) => { /* ... */ }
}));

// stores/settingsStore.js
export const useSettingsStore = create(persist((set) => ({
  unit: 'F',
  theme: 'light',
  coldHands: false,
  // ...
})));

// stores/uiStore.js
export const useUIStore = create((set) => ({
  showSettings: false,
  showInsights: false,
  // ...
}));
```

---

### **Phase 5: Testing Infrastructure** (Week 5)
Add comprehensive testing.

#### Test Structure
```
src/
  __tests__/
    hooks/
      useWeatherData.test.js
      useSettings.test.js
      useRunConditions.test.js
      
    components/
      weather/
        CurrentConditions.test.jsx
        WeatherGauge.test.jsx
        
    utils/
      calculations/
        scoring.test.js
        wbgt.test.js
        
  __mocks__/
    weatherData.js
    settingsData.js
```

#### Testing Tools
- **Vitest** - Fast, Vite-native testing
- **React Testing Library** - Component testing
- **MSW** - API mocking
- **Playwright** - E2E testing

---

### **Phase 6: Documentation** (Week 6)
Comprehensive documentation for maintainability.

#### Documentation Files
```
docs/
  architecture/
    ARCHITECTURE.md       // System design
    COMPONENTS.md         // Component hierarchy
    STATE_FLOW.md         // Data flow diagrams
    
  api/
    WEATHER_API.md        // API documentation
    SCORING.md            // Scoring algorithm
    
  guides/
    CONTRIBUTING.md       // Contribution guide
    DEPLOYMENT.md         // Deploy instructions
    TESTING.md            // Testing guide
    
  features/
    OUTFIT_LOGIC.md       // Outfit recommendation rules
    WBGT_CALCULATION.md   // Heat index details
```

---

## 📁 Final Directory Structure

```
runfit/
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── splash/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   ├── weather/
│   │   ├── running/
│   │   ├── insights/
│   │   ├── night/
│   │   ├── tomorrow/
│   │   ├── modals/
│   │   └── ui/
│   ├── hooks/
│   │   ├── useWeatherData.js
│   │   ├── useSettings.js
│   │   ├── useRunConditions.js
│   │   └── index.js
│   ├── services/
│   │   ├── weatherApi.js
│   │   └── geocodingApi.js
│   ├── stores/
│   │   ├── weatherStore.js
│   │   ├── settingsStore.js
│   │   └── uiStore.js
│   ├── utils/
│   │   ├── calculations/
│   │   ├── outfit/
│   │   ├── time/
│   │   ├── formatting/
│   │   ├── animations/
│   │   └── constants/
│   ├── styles/
│   │   ├── index.css
│   │   └── animations.css
│   ├── types/
│   │   ├── weather.ts
│   │   ├── outfit.ts
│   │   └── settings.ts
│   ├── App.jsx
│   └── index.jsx
├── docs/
├── __tests__/
├── REFACTORING_PLAN.md
└── package.json
```

---

## 🎨 Code Style Guidelines

### Component Structure
```jsx
/**
 * ComponentName - Brief description
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Prop description
 * @returns {JSX.Element}
 */
import React from 'react';
import PropTypes from 'prop-types';

export function ComponentName({ title, onAction }) {
  // 1. Hooks (useState, useEffect, custom hooks)
  const [state, setState] = useState(null);
  
  // 2. Derived values (useMemo, useCallback)
  const computedValue = useMemo(() => {
    return calculateValue(state);
  }, [state]);
  
  // 3. Event handlers
  const handleClick = useCallback(() => {
    onAction(state);
  }, [state, onAction]);
  
  // 4. Effects
  useEffect(() => {
    // Effect logic
  }, []);
  
  // 5. Render
  return (
    <div className="component-name">
      {/* JSX */}
    </div>
  );
}

ComponentName.propTypes = {
  title: PropTypes.string.isRequired,
  onAction: PropTypes.func,
};

ComponentName.defaultProps = {
  onAction: () => {},
};
```

### Custom Hook Pattern
```javascript
/**
 * useHookName - Brief description
 * 
 * @param {Object} config - Hook configuration
 * @returns {Object} Hook return value
 */
export function useHookName(config) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Hook logic
  
  return {
    data: state,
    loading,
    error,
    refetch: () => {},
  };
}
```

### Utility Function Pattern
```javascript
/**
 * Calculate something useful
 * 
 * @param {number} value - Input value
 * @param {Object} options - Configuration options
 * @returns {number} Calculated result
 * 
 * @example
 * const result = calculateSomething(42, { precision: 2 });
 * // => 42.00
 */
export function calculateSomething(value, options = {}) {
  const { precision = 0 } = options;
  // Calculation logic
  return result;
}
```

---

## 📋 Implementation Checklist

### Phase 1: Custom Hooks
- [ ] Create `hooks/` directory
- [ ] Extract `useWeatherData` hook
- [ ] Extract `useSettings` hook
- [ ] Extract `useRunConditions` hook
- [ ] Extract `useLoadingProgress` hook
- [ ] Test all hooks independently
- [ ] Update App.jsx to use hooks

### Phase 2: Components
- [ ] Create component directory structure
- [ ] Extract layout components
- [ ] Extract weather components
- [ ] Extract running components
- [ ] Extract modal components
- [ ] Extract UI components
- [ ] Ensure all components are documented
- [ ] Test component rendering

### Phase 3: Utilities
- [ ] Reorganize utils/ directory
- [ ] Create services/ directory
- [ ] Extract API calls to services
- [ ] Document all utility functions
- [ ] Add JSDoc comments
- [ ] Create example usage

### Phase 4: State Management
- [ ] Choose state management solution
- [ ] Create stores
- [ ] Migrate complex state
- [ ] Test state updates
- [ ] Document state flow

### Phase 5: Testing
- [ ] Set up test infrastructure
- [ ] Write hook tests
- [ ] Write component tests
- [ ] Write utility tests
- [ ] Set up CI/CD for tests
- [ ] Achieve 80%+ coverage

### Phase 6: Documentation
- [ ] Write architecture docs
- [ ] Document component API
- [ ] Create contribution guide
- [ ] Add inline code comments
- [ ] Create deployment guide

---

## 🚀 Migration Strategy

### Incremental Approach
1. **Keep App.jsx working** - Don't break existing functionality
2. **Extract one piece at a time** - Gradual migration
3. **Test after each change** - Ensure stability
4. **Document as you go** - Don't defer documentation
5. **Review and iterate** - Get feedback on structure

### Feature Flags
Use feature flags to test refactored components:
```javascript
const USE_NEW_WEATHER_CARD = true;

{USE_NEW_WEATHER_CARD ? (
  <NewCurrentConditions {...props} />
) : (
  <OldWeatherCard {...props} />
)}
```

### Parallel Implementation
Keep both old and new code until new version is stable:
- Old: `App.jsx` (working version)
- New: `App.new.jsx` (refactored version)
- Switch when ready

---

## 🎯 Success Metrics

### Code Quality
- [ ] File size < 300 lines per component
- [ ] Cyclomatic complexity < 10 per function
- [ ] No duplicate code (DRY principle)
- [ ] All functions documented
- [ ] TypeScript coverage > 90%

### Performance
- [ ] Initial load < 2s
- [ ] Time to interactive < 3s
- [ ] Lighthouse score > 95
- [ ] Bundle size < 500KB

### Testing
- [ ] Unit test coverage > 80%
- [ ] Integration tests for critical flows
- [ ] E2E tests for user journeys
- [ ] No console errors

### Developer Experience
- [ ] Clear component API
- [ ] Easy to find code
- [ ] Quick to add features
- [ ] Simple to debug

---

## 📚 Resources & References

### React Best Practices
- [React Docs - Thinking in React](https://react.dev/learn/thinking-in-react)
- [React Docs - Component Composition](https://react.dev/learn/passing-props-to-a-component)
- [Patterns.dev - React Patterns](https://www.patterns.dev/posts/react-patterns)

### State Management
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Context](https://react.dev/learn/passing-data-deeply-with-context)

### Testing
- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright](https://playwright.dev/)

---

## 🤝 Contributing

When contributing to the refactoring effort:

1. **Pick a task** from the checklist above
2. **Create a feature branch** - `refactor/component-name`
3. **Make incremental changes** - Small, focused PRs
4. **Add tests** - Don't break existing tests
5. **Document your changes** - Update relevant docs
6. **Get review** - At least one review before merge

---

## 📝 Notes

### Priority Order
1. **Extract hooks first** - Easiest win, reduces App.jsx size
2. **Extract components second** - Visual improvements
3. **Organize utilities** - Better structure
4. **Add state management** - If needed
5. **Add tests** - Ensure stability
6. **Document** - Knowledge preservation

### Things to Preserve
- All existing functionality
- Animation smoothness
- PWA features
- Accessibility features
- Performance characteristics
- User preferences

### Things to Improve
- Code organization
- Component reusability
- Testing coverage
- Documentation
- Type safety
- Developer experience

---

**Last Updated**: October 16, 2025
**Status**: Planning Phase
**Next Steps**: Begin Phase 1 - Extract Custom Hooks

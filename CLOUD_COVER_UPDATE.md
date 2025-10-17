# Cloud Cover & Solar Radiation Integration

## Research Summary

Based on peer-reviewed research and weather service guidelines, we've integrated cloud cover and solar radiation effects into the scoring algorithm:

### Key Findings

1. **Solar Radiation Impact**: Full sun can make conditions feel **up to 15°F hotter** than the Heat Index suggests (Heat Index assumes shade)
   - Source: NOAA Heat Index guidelines

2. **Cloud Cover Benefits**: Clouds block incoming solar radiation, reducing mean radiant temperature significantly
   - Even without changing air temp, clouds make hot conditions more tolerable
   - Source: National Weather Service WBGT guidelines

3. **WBGT vs Heat Index**: Wet Bulb Globe Temperature (WBGT) is superior to Heat Index for running because it accounts for:
   - Temperature
   - Humidity  
   - Wind speed
   - **Solar radiation** (sun angle + cloud cover)
   - Source: NWS, ACSM Heat Guidelines

4. **Shade Effectiveness**: Trees and building shade substantially cut radiant load
   - Can reduce perceived heat by 10-15°F in full sun conditions
   - Source: PMC study on outdoor thermal comfort

5. **Performance Impact**: Running performance degrades ~0.4-0.7 min per °C above 15°C
   - Source: Nature study on elite marathon runners

## Implementation

### Temperature Penalty Adjustment

**New Solar Radiation Factor** in `runScore.js`:

```javascript
// Solar radiation adjustment: Full sun adds ~15°F to perceived heat vs shade
let solarAdjustment = 0;
if (apparentF > 60) {
  const solarExposure = 1 - (cloudCover / 100); // 1.0 = full sun, 0.0 = overcast
  const tempFactor = Math.min((apparentF - 60) / 25, 1); // Peaks at 85°F+
  solarAdjustment = solarExposure * tempFactor * 15; // Up to 15°F in full sun
}

const effectiveApparentF = apparentF + solarAdjustment;
```

**How it works:**
- Clear skies (0% cloud cover) + 85°F = +15°F solar penalty → feels like 100°F
- 50% cloud cover + 85°F = +7.5°F solar penalty → feels like 92.5°F  
- Overcast (100% cloud cover) + 85°F = 0°F solar penalty → feels like 85°F
- No adjustment below 60°F (solar radiation negligible in cool conditions)

### Enhanced Tips & Guidance

**Temperature Tips** now include cloud cover context:
- Full sun: "Full sun adds significant radiant heat—seek shade"
- Partial clouds: "Partial clouds provide some relief from direct sun"
- Overcast: "Overcast skies help by blocking solar radiation"

**New Shade-Seeking Recommendations:**
- Extreme heat: "Seek heavily shaded routes—trees and buildings can drop radiant heat by 10-15°F vs full sun"
- Long runs in heat: "Plan your route through shaded areas—parks with tree cover, north sides of buildings. Full sun can make it feel 10-15°F hotter than the air temperature"

### Updated Function Signatures

All scoring functions now accept `cloudCover` parameter (0-100%):

```javascript
computeScoreBreakdown({
  tempF, apparentF, humidity, windMph, 
  precipProb, precipIn, uvIndex, 
  cloudCover // NEW
}, workout, coldHands, handsLevel, longRun)

makeApproachTips({
  score, parts, dpF, apparentF, windMph, precipProb,
  workout, longRun, tempChange, willRain, roadConditions,
  runnerBoldness,
  cloudCover // NEW
})
```

## Example Impact

**Scenario: 85°F, 60% humidity, easy run**

| Cloud Cover | Solar Penalty | Effective Temp | Temp Penalty | Score |
|-------------|--------------|----------------|--------------|-------|
| 0% (Clear)  | +15°F        | 100°F          | ~99 points   | ~1    |
| 25%         | +11°F        | 96°F           | ~85 points   | ~15   |
| 50%         | +7.5°F       | 92.5°F         | ~70 points   | ~30   |
| 75%         | +4°F         | 89°F           | ~53 points   | ~47   |
| 100% (Overcast) | 0°F      | 85°F           | ~39 points   | ~61   |

**Key takeaway**: On an 85°F day, cloud cover can swing the score by **60 points** (1 → 61), completely changing run recommendations from "dangerous, avoid outdoor running" to "challenging but manageable with adjustments."

## References

1. [NWS WBGT Guidelines](https://www.weather.gov/tsa/wbgt)
2. [NOAA Heat Index](https://www.noaa.gov/jetstream/synoptic/heat-index)
3. [ScienceDirect: Cloud cover & nighttime heat](https://www.sciencedirect.com/science/article/pii/S2212094722000342)
4. [Nature: Marathon performance & warming](https://www.nature.com/articles/s41612-024-00637-x)
5. [PMC: Shade impact on thermal comfort](https://pmc.ncbi.nlm.nih.gov/articles/PMC5127889/)
6. [NWS Excessive Heat Guidelines](https://www.weather.gov/arx/wbgt4)
7. [ACSM Heat Guidelines for Running](https://rrm.com/acsm-heat-guidelines/)

## Testing

Use the debug modal to test different cloud cover scenarios:
1. Set temp to 85°F, humidity 60%
2. Set cloud cover to 0% → Should show ~1 score (dangerous)
3. Set cloud cover to 100% → Should show ~61 score (challenging but manageable)
4. Observe temperature penalty breakdown showing solar radiation impact

## Future Enhancements

Potential additions based on research:
- **Nighttime cloud trap**: Cloudy nights slow cooling, making dawn runs warmer
- **Time of day solar angle**: Morning/evening sun lower angle = less intense than noon
- **Route shade scoring**: Recommend specific shaded routes based on tree cover data
- **Real-time WBGT calculation**: Use cloud cover + sun angle for more accurate heat stress assessment

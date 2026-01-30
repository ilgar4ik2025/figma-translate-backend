# Estimated Remaining Time - Visual Demo

## Feature Overview

The estimated remaining time feature provides users with clear expectations about how long each generation stage will take.

---

## Visual Examples

### 1. Story Generation Stage (30s estimate)

```
┌─────────────────────────────────────────────┐
│  Screenshot Generator                       │
├─────────────────────────────────────────────┤
│                                             │
│  Generating story structure...              │
│  ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  Estimated time remaining: ~30s             │
│                                             │
└─────────────────────────────────────────────┘
```

### 2. Background Generation Stage (60s with live countdown)

**Initial State:**
```
┌─────────────────────────────────────────────┐
│  Screenshot Generator                       │
├─────────────────────────────────────────────┤
│                                             │
│  Generating backgrounds...                  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  Estimated time remaining: ~60s             │
│                                             │
└─────────────────────────────────────────────┘
```

**After 1 background (20% complete):**
```
┌─────────────────────────────────────────────┐
│  Screenshot Generator                       │
├─────────────────────────────────────────────┤
│                                             │
│  Generating backgrounds...                  │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  Estimated time remaining: ~48s             │
│                                             │
└─────────────────────────────────────────────┘
```

**After 3 backgrounds (60% complete):**
```
┌─────────────────────────────────────────────┐
│  Screenshot Generator                       │
├─────────────────────────────────────────────┤
│                                             │
│  Generating backgrounds...                  │
│  ████████████████████████░░░░░░░░░░░░░░░░  │
│  Estimated time remaining: ~24s             │
│                                             │
└─────────────────────────────────────────────┘
```

**After 4 backgrounds (80% complete):**
```
┌─────────────────────────────────────────────┐
│  Screenshot Generator                       │
├─────────────────────────────────────────────┤
│                                             │
│  Generating backgrounds...                  │
│  ████████████████████████████████░░░░░░░░  │
│  Estimated time remaining: ~12s             │
│                                             │
└─────────────────────────────────────────────┘
```

### 3. Composition Stage (10s estimate)

```
┌─────────────────────────────────────────────┐
│  Screenshot Generator                       │
├─────────────────────────────────────────────┤
│                                             │
│  Creating slides in Figma...                │
│  ████████████████████████████████████░░░░  │
│  Estimated time remaining: ~10s             │
│                                             │
└─────────────────────────────────────────────┘
```

### 4. Complete Stage

```
┌─────────────────────────────────────────────┐
│  Screenshot Generator                       │
├─────────────────────────────────────────────┤
│                                             │
│  Complete!                                  │
│  ████████████████████████████████████████  │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

### 5. Error State

```
┌─────────────────────────────────────────────┐
│  Screenshot Generator                       │
├─────────────────────────────────────────────┤
│                                             │
│  Generating backgrounds...                  │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ ⚠ Error                               │ │
│  │ Failed to generate background.        │ │
│  │ Please try again.                     │ │
│  └───────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Time Format Examples

The time display automatically formats based on duration:

| Seconds | Display Format |
|---------|----------------|
| 5 | `Estimated time remaining: ~5s` |
| 30 | `Estimated time remaining: ~30s` |
| 59 | `Estimated time remaining: ~59s` |
| 60 | `Estimated time remaining: ~1m` |
| 65 | `Estimated time remaining: ~1m 5s` |
| 90 | `Estimated time remaining: ~1m 30s` |
| 120 | `Estimated time remaining: ~2m` |
| 125 | `Estimated time remaining: ~2m 5s` |

---

## Countdown Behavior

### Background Generation Stage

The background generation stage features a **live countdown**:

```
Time: 0s  → "Estimated time remaining: ~60s"
Time: 1s  → "Estimated time remaining: ~59s"
Time: 2s  → "Estimated time remaining: ~58s"
...
Time: 30s → "Estimated time remaining: ~30s"
...
Time: 59s → "Estimated time remaining: ~1s"
Time: 60s → "" (cleared)
```

### Dynamic Updates

When backgrounds complete, the time is recalculated:

```
Background 1 complete → 4 remaining × 12s = 48s
Background 2 complete → 3 remaining × 12s = 36s
Background 3 complete → 2 remaining × 12s = 24s
Background 4 complete → 1 remaining × 12s = 12s
Background 5 complete → 0 remaining × 12s = 0s
```

---

## User Experience Flow

### Complete Generation Flow

```
1. User clicks "Generate Screenshots"
   ↓
2. Story Generation (30s)
   "Generating story structure..."
   "Estimated time remaining: ~30s"
   ↓
3. User reviews and edits story
   ↓
4. User clicks "Confirm and Generate Backgrounds"
   ↓
5. Background Generation (60s with countdown)
   "Generating backgrounds..."
   "Estimated time remaining: ~60s" → ~59s → ~58s → ...
   ↓
6. Composition (10s)
   "Creating slides in Figma..."
   "Estimated time remaining: ~10s"
   ↓
7. Complete!
   "Complete!"
   (time cleared)
```

---

## Technical Details

### Countdown Timer

- **Update Frequency:** Every 1 second
- **Precision:** 1 second
- **Cleanup:** Automatic on completion, error, or hide

### Time Calculation

```javascript
// Initial estimate for background generation
estimatedTime = 60 seconds (5 backgrounds × 12s each)

// Dynamic update when background completes
remainingBackgrounds = total - completed
estimatedTime = remainingBackgrounds × 12 seconds

// Example:
// 5 backgrounds total, 2 completed
// estimatedTime = (5 - 2) × 12 = 36 seconds
```

### Stage-Specific Behavior

| Stage | Initial Estimate | Countdown | Updates |
|-------|-----------------|-----------|---------|
| Story Generation | 30s | No | No |
| Background Generation | 60s | Yes ✓ | Yes ✓ |
| Composition | 10s | No | No |
| Complete | 0s | No | No |

---

## Testing Instructions

### Manual Testing

1. **Open Test File:**
   ```
   Open: figma-plugin/test-progress-time.html
   ```

2. **Test Story Generation:**
   - Click "Test Story Generation (30s)"
   - Verify: "Estimated time remaining: ~30s" appears
   - Verify: Time does NOT countdown automatically

3. **Test Background Generation:**
   - Click "Test Background Generation (60s)"
   - Verify: "Estimated time remaining: ~60s" appears
   - Verify: Time DOES countdown every second
   - Watch: ~60s → ~59s → ~58s → ...

4. **Test Background Progress:**
   - Click "Test Background Progress Updates"
   - Verify: Time updates as backgrounds complete
   - Verify: 48s → 36s → 24s → 12s → 0s

5. **Test Composition:**
   - Click "Test Composition (10s)"
   - Verify: "Estimated time remaining: ~10s" appears

6. **Test Complete:**
   - Click "Test Complete"
   - Verify: Time display is cleared

7. **Test Reset:**
   - Click "Reset"
   - Verify: Everything resets to initial state

### Integration Testing

Test with the full plugin:

1. Fill in app description
2. Click "Generate Screenshots"
3. Observe time estimates through all stages
4. Verify countdown during background generation
5. Verify time clears on completion

---

## Benefits

### For Users

✅ **Clear Expectations:** Know how long generation will take  
✅ **Reduced Anxiety:** See progress and remaining time  
✅ **Better Planning:** Can step away if needed  
✅ **Professional Feel:** Polished, modern UX  

### For Developers

✅ **Easy to Maintain:** Clean, well-documented code  
✅ **Extensible:** Easy to add new stages or adjust times  
✅ **Performant:** Minimal overhead, proper cleanup  
✅ **Testable:** Comprehensive test coverage  

---

## Conclusion

The estimated remaining time feature significantly improves the user experience by:

1. Setting clear expectations
2. Providing real-time feedback
3. Reducing user anxiety during long operations
4. Creating a professional, polished feel

The implementation is robust, well-tested, and ready for production use.

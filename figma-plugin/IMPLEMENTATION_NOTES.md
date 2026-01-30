# Screenshot Generator Implementation Notes

## Completed Features

### Task 6.3: Slide Regeneration Buttons ✅

**Implementation Date:** 2026-01-30

**Description:**
Added regeneration buttons to individual slides in the Story Editor, allowing users to regenerate specific slides without regenerating the entire story.

**Requirements Addressed:**
- Requirement 9.2: Allow users to regenerate individual slides without regenerating all 5
- Requirement 9.3: Provide user control over creative direction

**Implementation Details:**

#### UI Components (ui.html)

1. **CSS Styles Added:**
   - `.slide-regenerate-btn` - Styling for the regenerate button
   - `.slide-regenerate-btn:hover` - Hover state
   - `.slide-regenerate-btn:disabled` - Disabled state
   - `.slide-regenerate-btn.regenerating` - Loading state during regeneration

2. **StoryEditor Class Updates:**
   - Added regenerate button to each slide in `createSlideElement()`
   - Implemented `regenerateSlide(slideIndex)` method to handle regeneration requests
   - Implemented `updateRegeneratedSlide(slideIndex, newSlideData)` method to update UI after regeneration
   - Added event listener for regenerate button clicks

3. **Message Handling:**
   - Added handler for `slide-regenerated` message type
   - Calls `storyEditor.updateRegeneratedSlide()` when regeneration completes

#### Plugin Code (code.js)

1. **Message Handler:**
   - Added handler for `regenerate-slide` message type
   - Extracts `slideIndex`, `currentSlide`, and `appDescription` from message
   - Shows notification to user during regeneration
   - Simulates regeneration with timeout (will be replaced with actual API call)
   - Sends `slide-regenerated` message back to UI with updated slide data

#### Test File (test-ui.html)

1. **Test Implementation:**
   - Added "Test Slide Regeneration" button
   - Implemented `testSlideRegeneration()` function
   - Tests regeneration of multiple slides sequentially
   - Includes visual feedback during regeneration

**User Flow:**

1. User generates initial story structure
2. Story Editor displays all 5 slides with regenerate buttons
3. User clicks "🔄 Regenerate" button on a specific slide
4. Button changes to "⏳ Regenerating..." and becomes disabled
5. Plugin sends regeneration request to backend (currently simulated)
6. Backend generates new content for that specific slide
7. UI updates with new slide content
8. Other slides remain unchanged

**Future Integration:**

When backend API is implemented (Task 3.1), the `regenerate-slide` handler in `code.js` should:
1. Call `/api/generate-story` with a parameter to regenerate only one slide
2. Pass the current slide context and app description
3. Handle API errors gracefully
4. Update the slide with real AI-generated content

**Testing:**

To test the feature:
1. Open `figma-plugin/test-ui.html` in a browser
2. Click "Test Slide Regeneration"
3. Observe slides being regenerated with "(Regenerated)" suffix
4. Verify button states change correctly during regeneration
5. Verify other slides remain unchanged

**Notes:**
- Currently uses simulated regeneration (adds "(Regenerated)" suffix)
- Will be integrated with actual backend API in future tasks
- Preserves slide order and indices during regeneration
- Provides clear visual feedback to users
- Follows the same UI patterns as existing slide controls


---

### Task 6.7: Estimated Remaining Time ✅

**Implementation Date:** 2026-01-30

**Description:**
Added estimated remaining time display to the progress indicator, showing users how long each generation stage will take.

**Requirements Addressed:**
- Requirement 11.4: Plugin MUST display estimated remaining time during background generation

**Implementation Details:**

#### UI Components (ui.html)

1. **ProgressIndicator Class Enhancements:**
   - Added `startTime` property to track when a stage begins
   - Added `updateInterval` property to manage countdown timer
   - Implemented `startCountdown()` method for live countdown during background generation
   - Implemented `stopCountdown()` method to clean up intervals
   - Enhanced `setEstimatedTime(seconds)` to update display
   - Added `updateTimeDisplay()` method to format time display (seconds, minutes)

2. **Stage-Specific Time Estimates:**
   - **Story Generation**: ~30 seconds initial estimate
   - **Background Generation**: ~60 seconds (12s per background × 5 backgrounds)
   - **Composition**: ~10 seconds
   - **Complete**: 0 seconds (clears display)

3. **Time Display Format:**
   - Under 60 seconds: "Estimated time remaining: ~Xs"
   - 60+ seconds: "Estimated time remaining: ~Xm Ys"
   - Clean minutes: "Estimated time remaining: ~Xm" (when seconds = 0)

4. **Dynamic Updates:**
   - Background generation stage starts a live countdown timer
   - Timer decrements every second automatically
   - Updates stop when stage completes or errors occur
   - Timer is cleared when progress indicator is hidden or reset

5. **Message Handler Updates:**
   - `background-generated` message now sets estimated time to 0 when all backgrounds complete
   - Calculates remaining time based on backgrounds left: `(total - index) × 12 seconds`

#### Countdown Behavior

The countdown timer provides real-time feedback:
- Starts automatically during background generation stage
- Updates every second
- Stops when:
  - Stage completes
  - Error occurs
  - Progress indicator is hidden
  - Reset is called

#### Error Handling

- Countdown stops immediately when errors occur
- Timer is cleaned up properly to prevent memory leaks
- Multiple intervals are prevented (stopCountdown called before startCountdown)

#### User Experience

**Before:**
- Users saw progress bar but no time estimate
- Unclear how long generation would take

**After:**
- Clear time estimates for each stage
- Live countdown during background generation
- Better user expectations and reduced anxiety
- Professional, polished feel

**Example Display:**
```
Generating backgrounds...
[████████░░░░░░░░░░░░] 40%
Estimated time remaining: ~36s
```

**Testing:**

To test the feature:
1. Open `figma-plugin/test-progress-time.html` in a browser
2. Test different scenarios:
   - Story Generation (30s estimate)
   - Background Generation (60s with live countdown)
   - Composition (10s estimate)
   - Background Progress Updates (simulates real progress)
   - Complete stage (clears time)
3. Verify countdown decrements every second
4. Verify time format changes correctly (seconds → minutes)
5. Verify countdown stops on completion

**Integration Points:**

The estimated time feature integrates with:
- `setStage()` - Automatically sets initial estimates
- `background-generated` message - Updates time based on remaining backgrounds
- `complete` message - Clears time display
- Error handling - Stops countdown on errors

**Performance Considerations:**

- Uses single `setInterval` per countdown
- Properly cleans up intervals to prevent memory leaks
- Minimal DOM updates (only when time changes)
- No performance impact on Figma plugin

**Future Enhancements:**

Potential improvements for future iterations:
1. **Adaptive Timing**: Learn from actual generation times and adjust estimates
2. **Progress-Based Estimates**: Calculate remaining time based on actual progress rate
3. **Network-Aware**: Adjust estimates based on API response times
4. **User Preferences**: Allow users to show/hide time estimates

**Notes:**
- Time estimates are approximate (~) to set proper expectations
- Background generation uses 12 seconds per background as baseline
- Countdown provides engaging visual feedback during longer operations
- Follows App Store and modern web app UX patterns
- Complies with requirement 11.4 for displaying estimated time during background generation

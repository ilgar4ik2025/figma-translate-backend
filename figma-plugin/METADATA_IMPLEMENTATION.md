# Task 11.2 Implementation: Metadata for Element Identification

## Overview

Implemented comprehensive metadata system using Figma's `pluginData` API to store identification and tracking information on all elements created by the Screenshot Generator. This enables better element identification, persistence tracking, and integration with Tab 1 (Localizer).

**Status:** ✅ Completed  
**Date:** 2026-01-30  
**Requirements:** 10.2

---

## Metadata Schema

### Common Metadata Fields

All elements created by Screenshot Generator include these base metadata fields:

| Field | Type | Description |
|-------|------|-------------|
| `elementType` | string | Type of element (background, headline, subheadline, mockup, slide, etc.) |
| `slideIndex` | string | Index of the slide (0-4) |
| `generatedBy` | string | Always "screenshot-generator" |
| `createdAt` | string | ISO timestamp of creation |

### Element-Specific Metadata

#### Background Elements
```javascript
{
  elementType: 'background',
  slideIndex: '0',
  generatedBy: 'screenshot-generator',
  createdAt: '2026-01-30T...',
  preserve: 'true'  // Indicates element should not be modified during localization
}
```

#### Text Elements (Headline & Subheadline)
```javascript
{
  elementType: 'headline' | 'subheadline',
  slideIndex: '0',
  generatedBy: 'screenshot-generator',
  createdAt: '2026-01-30T...',
  localizable: 'true',  // Indicates element can be localized
  originalText: 'Transform Your Workflow'  // Original text for reference
}
```

#### Mockup Elements
```javascript
{
  elementType: 'mockup',
  slideIndex: '0',
  generatedBy: 'screenshot-generator',
  createdAt: '2026-01-30T...',
  preserve: 'true',
  hasScreenshot: 'true' | 'false'  // Whether mockup contains user screenshot
}
```

#### Screenshot/Placeholder Elements
```javascript
{
  elementType: 'screenshot' | 'placeholder',
  slideIndex: '0',
  generatedBy: 'screenshot-generator',
  preserve: 'true'  // For screenshots only
}
```

#### Slide Frame Elements
```javascript
{
  elementType: 'slide',
  slideIndex: '0',
  generatedBy: 'screenshot-generator',
  createdAt: '2026-01-30T...',
  sessionId: '1738238400000',  // Links slides from same generation session
  headline: 'Transform Your Workflow',
  subheadline: 'Boost productivity with AI',
  description: 'A modern workspace with AI elements'
}
```

#### Parent Frame (Collection)
```javascript
{
  elementType: 'screenshot-collection',
  generatedBy: 'screenshot-generator',
  createdAt: '2026-01-30T...',
  sessionId: '1738238400000',  // Unique session identifier
  slideCount: '5'
}
```

---

## Implementation Details

### Code Changes

#### 1. Updated `createBackground()` Method

Added metadata to background rectangles:

```javascript
async createBackground(imageBase64, slideIndex = 0) {
  // ... create rectangle ...
  
  // Add metadata for identification
  rect.setPluginData('elementType', 'background');
  rect.setPluginData('slideIndex', slideIndex.toString());
  rect.setPluginData('generatedBy', 'screenshot-generator');
  rect.setPluginData('createdAt', new Date().toISOString());
  rect.setPluginData('preserve', 'true');
  
  return rect;
}
```

#### 2. Updated `createTextElements()` Method

Added metadata to headline and subheadline text nodes:

```javascript
async createTextElements(headline, subheadline, slideIndex = 0) {
  // ... create headline node ...
  
  // Add metadata for identification
  headlineNode.setPluginData('elementType', 'headline');
  headlineNode.setPluginData('slideIndex', slideIndex.toString());
  headlineNode.setPluginData('generatedBy', 'screenshot-generator');
  headlineNode.setPluginData('createdAt', new Date().toISOString());
  headlineNode.setPluginData('localizable', 'true');
  headlineNode.setPluginData('originalText', headline);
  
  // ... similar for subheadline ...
}
```

#### 3. Updated `createiPhoneMockup()` Method

Added metadata to mockup frame and child elements:

```javascript
async createiPhoneMockup(screenshotBase64 = null, slideIndex = 0) {
  // ... create mockup frame ...
  
  // Add metadata for identification
  mockupFrame.setPluginData('elementType', 'mockup');
  mockupFrame.setPluginData('slideIndex', slideIndex.toString());
  mockupFrame.setPluginData('generatedBy', 'screenshot-generator');
  mockupFrame.setPluginData('createdAt', new Date().toISOString());
  mockupFrame.setPluginData('preserve', 'true');
  mockupFrame.setPluginData('hasScreenshot', screenshotBase64 ? 'true' : 'false');
  
  // Add metadata to screenshot/placeholder children
  if (screenshotBase64) {
    screenshotRect.setPluginData('elementType', 'screenshot');
    screenshotRect.setPluginData('slideIndex', slideIndex.toString());
    screenshotRect.setPluginData('generatedBy', 'screenshot-generator');
    screenshotRect.setPluginData('preserve', 'true');
  } else {
    placeholder.setPluginData('elementType', 'placeholder');
    placeholder.setPluginData('slideIndex', slideIndex.toString());
    placeholder.setPluginData('generatedBy', 'screenshot-generator');
  }
  
  return mockupFrame;
}
```

#### 4. Updated `createSingleSlide()` Method

Added metadata to slide frames:

```javascript
async createSingleSlide(slide, backgroundBase64, screenshotBase64 = null, index = 0) {
  // ... create slide frame ...
  
  // Add metadata to slide frame
  slideFrame.setPluginData('elementType', 'slide');
  slideFrame.setPluginData('slideIndex', index.toString());
  slideFrame.setPluginData('generatedBy', 'screenshot-generator');
  slideFrame.setPluginData('createdAt', new Date().toISOString());
  slideFrame.setPluginData('headline', slide.headline);
  slideFrame.setPluginData('subheadline', slide.subheadline);
  slideFrame.setPluginData('description', slide.description);
  
  // Pass slideIndex to child element creators
  const background = await this.createBackground(backgroundBase64, index);
  const textElements = await this.createTextElements(slide.headline, slide.subheadline, index);
  const mockup = await this.createiPhoneMockup(screenshotBase64, index);
  
  // ... append children ...
}
```

#### 5. Updated `createSlides()` Method

Added metadata to parent frame and session tracking:

```javascript
async createSlides(data) {
  // ... create parent frame ...
  
  // Add metadata to parent frame
  const sessionId = Date.now().toString();
  parentFrame.setPluginData('elementType', 'screenshot-collection');
  parentFrame.setPluginData('generatedBy', 'screenshot-generator');
  parentFrame.setPluginData('createdAt', new Date().toISOString());
  parentFrame.setPluginData('sessionId', sessionId);
  parentFrame.setPluginData('slideCount', '5');
  
  // Create each slide and link with sessionId
  for (let i = 0; i < story.slides.length; i++) {
    const slideFrame = await this.createSingleSlide(/* ... */, i);
    
    // Add session ID to link slides together
    slideFrame.setPluginData('sessionId', sessionId);
    
    parentFrame.appendChild(slideFrame);
  }
  
  return parentFrame;
}
```

---

## Benefits

### 1. Element Identification
- **Type Detection**: Quickly identify element type without parsing names
- **Slide Association**: Know which slide each element belongs to
- **Source Tracking**: Identify elements created by Screenshot Generator

### 2. Localization Integration
- **Localizable Flag**: Easily identify which elements can be translated
- **Original Text**: Reference original text after localization
- **Preserve Flag**: Identify elements that should not be modified

### 3. Session Tracking
- **Session ID**: Link all slides from the same generation session
- **Timestamp**: Track when elements were created
- **Slide Count**: Know how many slides in a collection

### 4. Future Enhancements
- **Element Persistence**: Track elements across tab switches (Task 11.4)
- **Regeneration**: Identify which elements to update during regeneration
- **Analytics**: Track usage patterns and element lifecycle

---

## Usage Examples

### Reading Metadata

```javascript
// Get element type
const elementType = node.getPluginData('elementType');

// Check if element is localizable
const isLocalizable = node.getPluginData('localizable') === 'true';

// Check if element should be preserved
const shouldPreserve = node.getPluginData('preserve') === 'true';

// Get slide index
const slideIndex = parseInt(node.getPluginData('slideIndex'));

// Get original text
const originalText = node.getPluginData('originalText');

// Get session ID
const sessionId = node.getPluginData('sessionId');
```

### Finding Elements by Metadata

```javascript
// Find all elements from Screenshot Generator
function findGeneratedElements(node) {
  const elements = [];
  
  if (node.getPluginData('generatedBy') === 'screenshot-generator') {
    elements.push(node);
  }
  
  if ('children' in node) {
    for (const child of node.children) {
      elements.push(...findGeneratedElements(child));
    }
  }
  
  return elements;
}

// Find all localizable text elements
function findLocalizableElements(node) {
  const elements = [];
  
  if (node.type === 'TEXT' && node.getPluginData('localizable') === 'true') {
    elements.push(node);
  }
  
  if ('children' in node) {
    for (const child of node.children) {
      elements.push(...findLocalizableElements(child));
    }
  }
  
  return elements;
}

// Find all slides from a session
function findSlidesBySession(sessionId) {
  const slides = [];
  
  for (const node of figma.currentPage.children) {
    if (node.getPluginData('sessionId') === sessionId && 
        node.getPluginData('elementType') === 'slide') {
      slides.push(node);
    }
  }
  
  return slides.sort((a, b) => {
    const indexA = parseInt(a.getPluginData('slideIndex'));
    const indexB = parseInt(b.getPluginData('slideIndex'));
    return indexA - indexB;
  });
}
```

---

## Testing

### Test Coverage

Created comprehensive test suite (`backend/lib/metadata.test.js`) with 21 tests covering:

1. **Background Element Metadata** (2 tests)
   - All required metadata fields
   - Slide index tracking

2. **Text Element Metadata** (4 tests)
   - Headline metadata fields
   - Subheadline metadata fields
   - Localizable flag
   - Original text storage

3. **Mockup Element Metadata** (4 tests)
   - Mockup frame metadata
   - Screenshot presence indicator
   - Screenshot child metadata
   - Placeholder metadata

4. **Slide Frame Metadata** (2 tests)
   - Slide frame metadata fields
   - Slide content storage

5. **Parent Frame Metadata** (2 tests)
   - Collection metadata fields
   - Session ID linking

6. **Metadata Consistency** (3 tests)
   - Consistent generatedBy value
   - Timestamp inclusion
   - Preserve flag consistency

7. **Requirement 10.2 Validation** (4 tests)
   - Element type identification
   - Slide index identification
   - Generator source identification
   - Localizable element identification

### Test Results

```
✓ Task 11.2: Metadata for Element Identification (21)
  ✓ Background Element Metadata (2)
  ✓ Text Element Metadata (4)
  ✓ Mockup Element Metadata (4)
  ✓ Slide Frame Metadata (2)
  ✓ Parent Frame Metadata (2)
  ✓ Metadata Consistency (3)
  ✓ Requirement 10.2: Element Identification (4)

Test Files  1 passed (1)
Tests  21 passed (21)
```

---

## Requirements Addressed

### ✅ Requirement 10.2: Text Elements Selectable for Localization

**Acceptance Criteria:**
> "Плагин ДОЛЖЕН обеспечить, чтобы сгенерированные текстовые элементы были выбираемыми для локализации Вкладки_1"

**Implementation:**
- All text elements have `localizable: 'true'` metadata
- Original text stored in `originalText` metadata field
- Element type clearly identified via `elementType` metadata
- Compatible with Tab 1's element selection logic

---

## Integration with Existing Features

### Tab 1 (Localizer) Integration

The metadata system enhances Tab 1 integration:

1. **Element Filtering**: Can filter elements by `localizable` flag
2. **Original Text Reference**: Can compare translated text with original
3. **Preserve Detection**: Can skip elements marked with `preserve: 'true'`
4. **Source Tracking**: Can identify elements from Screenshot Generator

### Future Task Support

This metadata system enables:

- **Task 11.4**: Element persistence tracking across tab switches
- **Task 11.6**: Additional protection flags for mockups
- **Slide Regeneration**: Identify and update specific slides
- **Analytics**: Track element lifecycle and usage patterns

---

## Summary

Task 11.2 successfully implements a comprehensive metadata system using Figma's `pluginData` API:

1. ✅ **All elements tagged** with identification metadata
2. ✅ **Consistent schema** across all element types
3. ✅ **Session tracking** to link related slides
4. ✅ **Localization support** with localizable flags and original text
5. ✅ **Preservation markers** for non-localizable elements
6. ✅ **Comprehensive tests** with 21 passing tests
7. ✅ **Documentation** for usage and integration

The metadata system provides a solid foundation for element identification, tracking, and future enhancements while maintaining full compatibility with Tab 1 (Localizer).

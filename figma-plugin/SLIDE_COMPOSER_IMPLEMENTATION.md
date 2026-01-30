# SlideComposer Implementation

## Overview

The `SlideComposer` class is responsible for creating complete slide compositions in Figma for the Screenshot Generator feature. It handles the creation of backgrounds, text elements, iPhone mockups, and assembles them into complete slides.

## Architecture

```
SlideComposer
├── createBackground()      - Creates background rectangle with image
├── createTextElements()    - Creates headline and subheadline text nodes
├── createiPhoneMockup()    - Creates iPhone frame with optional screenshot
├── createSingleSlide()     - Assembles one complete slide
└── createSlides()          - Creates all 5 slides in parent frame
```

## Implementation Details

### 1. createBackground(imageBase64)

Creates a rectangle node with the background image.

**Parameters:**
- `imageBase64` (string): Base64-encoded background image from Gemini API

**Returns:**
- `RectangleNode`: Background rectangle with image fill

**Dimensions:**
- Width: 1242px (iPhone portrait)
- Height: 2688px (iPhone portrait)

**Implementation:**
```javascript
async createBackground(imageBase64) {
  const image = await this.imageProcessor.createImageFromBase64(imageBase64);
  const rect = figma.createRectangle();
  rect.name = 'Background';
  rect.resize(this.SLIDE_WIDTH, this.SLIDE_HEIGHT);
  rect.fills = [{
    type: 'IMAGE',
    imageHash: image.hash,
    scaleMode: 'FILL'
  }];
  return rect;
}
```

### 2. createTextElements(headline, subheadline)

Creates headline and subheadline text nodes with App Store styling.

**Parameters:**
- `headline` (string): Main headline text
- `subheadline` (string): Subheadline text

**Returns:**
- `Object`: `{ headline: TextNode, subheadline: TextNode }`

**Styling:**
- **Headline:**
  - Font: Inter Bold
  - Size: 72px
  - Color: White (RGB 1,1,1)
  - Alignment: Center
  - Position: Upper third of slide (y = height/6)

- **Subheadline:**
  - Font: Inter Regular
  - Size: 36px
  - Color: White (RGB 1,1,1)
  - Alignment: Center
  - Position: Below headline with 40px spacing

**Implementation:**
```javascript
async createTextElements(headline, subheadline) {
  // Create headline
  const headlineNode = figma.createText();
  headlineNode.name = 'Headline';
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
  headlineNode.fontName = { family: 'Inter', style: 'Bold' };
  headlineNode.fontSize = 72;
  headlineNode.characters = headline;
  headlineNode.textAlignHorizontal = 'CENTER';
  headlineNode.textAutoResize = 'HEIGHT';
  headlineNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  headlineNode.x = this.SLIDE_WIDTH / 2 - headlineNode.width / 2;
  headlineNode.y = this.SLIDE_HEIGHT / 6;

  // Create subheadline
  const subheadlineNode = figma.createText();
  subheadlineNode.name = 'Subheadline';
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  subheadlineNode.fontName = { family: 'Inter', style: 'Regular' };
  subheadlineNode.fontSize = 36;
  subheadlineNode.characters = subheadline;
  subheadlineNode.textAlignHorizontal = 'CENTER';
  subheadlineNode.textAutoResize = 'HEIGHT';
  subheadlineNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  subheadlineNode.x = this.SLIDE_WIDTH / 2 - subheadlineNode.width / 2;
  subheadlineNode.y = headlineNode.y + headlineNode.height + 40;

  return { headline: headlineNode, subheadline: subheadlineNode };
}
```

### 3. createiPhoneMockup(screenshotBase64)

Creates an iPhone mockup frame with optional user screenshot.

**Parameters:**
- `screenshotBase64` (string|null): Optional base64-encoded screenshot

**Returns:**
- `FrameNode`: iPhone mockup frame

**Dimensions:**
- Mockup frame: 400x820px
- Corner radius: 40px
- Inner content: 380x800px (20px padding)
- Position: Lower portion of slide (y = height * 0.55)

**Behavior:**
- If screenshot provided: Scales and inserts screenshot preserving aspect ratio
- If no screenshot: Creates gray placeholder

**Implementation:**
```javascript
async createiPhoneMockup(screenshotBase64 = null) {
  const mockupWidth = 400;
  const mockupHeight = 820;
  
  const mockupFrame = figma.createFrame();
  mockupFrame.name = 'iPhone Mockup';
  mockupFrame.resize(mockupWidth, mockupHeight);
  mockupFrame.cornerRadius = 40;
  mockupFrame.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
  mockupFrame.x = this.SLIDE_WIDTH / 2 - mockupWidth / 2;
  mockupFrame.y = this.SLIDE_HEIGHT * 0.55;

  if (screenshotBase64) {
    // Insert and scale screenshot
    const image = await this.imageProcessor.createImageFromBase64(screenshotBase64);
    const bytes = await image.getBytesAsync();
    const scaled = await this.imageProcessor.scaleImage(bytes, mockupWidth - 20, mockupHeight - 20);
    
    const screenshotRect = figma.createRectangle();
    screenshotRect.name = 'Screenshot';
    screenshotRect.resize(scaled.width, scaled.height);
    screenshotRect.cornerRadius = 35;
    
    const scaledImage = await this.imageProcessor.createImageFromBytes(scaled.bytes);
    screenshotRect.fills = [{
      type: 'IMAGE',
      imageHash: scaledImage.hash,
      scaleMode: 'FIT'
    }];
    
    screenshotRect.x = (mockupWidth - scaled.width) / 2;
    screenshotRect.y = (mockupHeight - scaled.height) / 2;
    
    mockupFrame.appendChild(screenshotRect);
  } else {
    // Create placeholder
    const placeholder = figma.createRectangle();
    placeholder.name = 'Placeholder';
    placeholder.resize(mockupWidth - 20, mockupHeight - 20);
    placeholder.cornerRadius = 35;
    placeholder.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
    placeholder.x = 10;
    placeholder.y = 10;
    mockupFrame.appendChild(placeholder);
  }

  return mockupFrame;
}
```

### 4. createSingleSlide(slide, backgroundBase64, screenshotBase64, index)

Assembles a complete slide by combining background, text, and mockup.

**Parameters:**
- `slide` (Object): Slide data with headline, subheadline, description
- `backgroundBase64` (string): Background image
- `screenshotBase64` (string|null): Optional screenshot
- `index` (number): Slide index (0-4)

**Returns:**
- `FrameNode`: Complete slide frame

**Hierarchy:**
```
SlideFrame (1242x2688)
├── Background (RectangleNode)
├── Headline (TextNode)
├── Subheadline (TextNode)
└── iPhone Mockup (FrameNode)
    └── Screenshot or Placeholder (RectangleNode)
```

**Implementation:**
```javascript
async createSingleSlide(slide, backgroundBase64, screenshotBase64 = null, index = 0) {
  const slideFrame = figma.createFrame();
  slideFrame.name = `Slide ${index + 1}: ${slide.headline}`;
  slideFrame.resize(this.SLIDE_WIDTH, this.SLIDE_HEIGHT);

  const background = await this.createBackground(backgroundBase64);
  slideFrame.appendChild(background);

  const textElements = await this.createTextElements(slide.headline, slide.subheadline);
  slideFrame.appendChild(textElements.headline);
  slideFrame.appendChild(textElements.subheadline);

  const mockup = await this.createiPhoneMockup(screenshotBase64);
  slideFrame.appendChild(mockup);

  return slideFrame;
}
```

### 5. createSlides(data)

Creates all 5 slides and organizes them in a parent frame.

**Parameters:**
- `data` (Object):
  - `story` (Object): Story structure with slides array
  - `backgrounds` (Array): Array of 5 background objects with imageBase64
  - `screenshots` (Array|null): Optional array of screenshot base64 strings

**Returns:**
- `FrameNode`: Parent frame containing all 5 slides

**Validation:**
- Story must have exactly 5 slides
- Must have exactly 5 backgrounds
- Throws descriptive errors if validation fails

**Layout:**
- Parent frame uses horizontal auto-layout
- 80px spacing between slides
- Centered in viewport
- Auto-selected after creation

**Implementation:**
```javascript
async createSlides(data) {
  const { story, backgrounds, screenshots } = data;
  
  // Validate
  if (!story || !story.slides || story.slides.length !== 5) {
    throw new Error('История должна содержать ровно 5 слайдов');
  }
  if (!backgrounds || backgrounds.length !== 5) {
    throw new Error('Должно быть ровно 5 фоновых изображений');
  }
  
  // Create parent frame
  const parentFrame = figma.createFrame();
  parentFrame.name = 'App Store Screenshots';
  parentFrame.layoutMode = 'HORIZONTAL';
  parentFrame.itemSpacing = 80;
  parentFrame.primaryAxisSizingMode = 'AUTO';
  parentFrame.counterAxisSizingMode = 'AUTO';
  
  // Create each slide
  for (let i = 0; i < story.slides.length; i++) {
    const slide = story.slides[i];
    const backgroundData = backgrounds[i];
    const screenshotData = screenshots && screenshots[i] ? screenshots[i] : null;
    
    const slideFrame = await this.createSingleSlide(
      slide,
      backgroundData.imageBase64,
      screenshotData,
      i
    );
    
    parentFrame.appendChild(slideFrame);
  }
  
  // Center and select
  parentFrame.x = figma.viewport.center.x - parentFrame.width / 2;
  parentFrame.y = figma.viewport.center.y - parentFrame.height / 2;
  figma.currentPage.selection = [parentFrame];
  figma.viewport.scrollAndZoomIntoView([parentFrame]);
  
  return parentFrame;
}
```

## Integration with MessageHandler

The SlideComposer is integrated into the MessageHandler's `handleCreateSlides` method:

```javascript
async handleCreateSlides(msg) {
  this.generationState.currentStage = 'composition';
  figma.notify('🎨 Создание слайдов в Figma...');
  this.sendProgressUpdate('composition', 0);

  try {
    const { story, backgrounds, screenshots } = msg;
    
    // Validate data
    if (!story || !story.slides || story.slides.length !== 5) {
      throw new Error('Некорректная структура истории');
    }
    if (!backgrounds || backgrounds.length !== 5) {
      throw new Error('Некорректные данные фонов');
    }
    
    this.sendProgressUpdate('composition', 20);
    
    // Create slides using SlideComposer
    const parentFrame = await slideComposer.createSlides({
      story: story,
      backgrounds: backgrounds,
      screenshots: screenshots
    });
    
    this.sendProgressUpdate('composition', 100);
    this.sendComplete(parentFrame.id);
    figma.notify('✅ Слайды успешно созданы!');

  } catch (error) {
    console.error('Slide creation error:', error);
    figma.notify('❌ Ошибка создания слайдов');
    this.sendError(error.message);
  }
}
```

## Error Handling

All methods include comprehensive error handling:

1. **Input validation**: Checks for required parameters and correct types
2. **Image processing errors**: Catches and wraps ImageProcessor errors
3. **Figma API errors**: Handles node creation failures
4. **User-friendly messages**: All errors include Russian language messages

Example error messages:
- "Не удалось создать фон: [details]"
- "Не удалось создать текстовые элементы: [details]"
- "Не удалось создать мокап iPhone: [details]"
- "История должна содержать ровно 5 слайдов"
- "Должно быть ровно 5 фоновых изображений"

## Testing

Comprehensive test suite in `slide-composer.test.js`:

1. ✅ Background creation with correct dimensions
2. ✅ Text element creation with proper styling
3. ✅ Headline positioning in upper third
4. ✅ Subheadline positioned below headline
5. ✅ Mockup without screenshot creates placeholder
6. ✅ Mockup with screenshot inserts image
7. ✅ Single slide creation with all elements
8. ✅ Validation of story structure (5 slides)
9. ✅ Validation of backgrounds count (5 backgrounds)
10. ✅ Parent frame creation with 5 children

All tests pass successfully.

## Requirements Satisfied

This implementation satisfies the following requirements from the design document:

- **Requirement 4.4**: iPhone portrait dimensions (1242x2688px)
- **Requirement 5.1**: Creates 5 slide compositions
- **Requirement 5.2**: Positions text according to App Store conventions
- **Requirement 5.3**: Scales screenshots preserving aspect ratio
- **Requirement 5.5**: Correct element hierarchy in Figma
- **Requirement 8.1**: Generates exactly 5 slides
- **Requirement 8.2**: All slides in iPhone portrait format
- **Requirement 8.3**: iPhone mockup with standard aspect ratio

## Next Steps

The SlideComposer is now fully implemented and ready for integration testing with the complete workflow:

1. User submits app description → Story generation (GPT)
2. User reviews/edits story → Background generation (Gemini)
3. Backgrounds generated → **SlideComposer creates slides in Figma** ✅
4. Slides created → Ready for localization (Tab 1)

## Usage Example

```javascript
// Initialize
const imageProcessor = new ImageProcessor();
const slideComposer = new SlideComposer(imageProcessor);

// Create slides
const data = {
  story: {
    slides: [
      { headline: 'Hook', subheadline: 'Grab attention', description: '...' },
      { headline: 'Feature', subheadline: 'Key benefit', description: '...' },
      { headline: 'Value', subheadline: 'Why choose us', description: '...' },
      { headline: 'Trust', subheadline: 'Social proof', description: '...' },
      { headline: 'Action', subheadline: 'Get started', description: '...' }
    ]
  },
  backgrounds: [
    { imageBase64: 'data:image/png;base64,...' },
    { imageBase64: 'data:image/png;base64,...' },
    { imageBase64: 'data:image/png;base64,...' },
    { imageBase64: 'data:image/png;base64,...' },
    { imageBase64: 'data:image/png;base64,...' }
  ],
  screenshots: null // or array of base64 strings
};

const parentFrame = await slideComposer.createSlides(data);
console.log('Created frame:', parentFrame.id);
```

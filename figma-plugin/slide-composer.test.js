/**
 * Tests for SlideComposer
 * Note: These tests are designed to run in a Node.js environment with mocked Figma API
 */

// Mock Figma API for testing
global.figma = {
  createImage: (bytes) => {
    return {
      hash: 'mock-hash-' + bytes.length,
      width: 1242,
      height: 2688,
      getBytesAsync: async () => bytes
    };
  },
  createRectangle: () => {
    const rect = {
      name: '',
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      fills: [],
      cornerRadius: 0,
      resize: function(width, height) {
        this.width = width;
        this.height = height;
      },
      appendChild: () => {},
      remove: () => {}
    };
    return rect;
  },
  createFrame: () => {
    const frame = {
      name: '',
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      fills: [],
      cornerRadius: 0,
      layoutMode: null,
      itemSpacing: 0,
      primaryAxisSizingMode: null,
      counterAxisSizingMode: null,
      children: [],
      resize: function(width, height) {
        this.width = width;
        this.height = height;
      },
      appendChild: function(child) {
        this.children.push(child);
      }
    };
    return frame;
  },
  createText: () => {
    const text = {
      name: '',
      width: 100,
      height: 50,
      x: 0,
      y: 0,
      characters: '',
      fontName: null,
      fontSize: 12,
      fills: [],
      textAlignHorizontal: 'LEFT',
      textAutoResize: 'NONE'
    };
    return text;
  },
  loadFontAsync: async (fontName) => {
    return true;
  },
  currentPage: {
    selection: []
  },
  viewport: {
    center: { x: 0, y: 0 },
    scrollAndZoomIntoView: () => {}
  }
};

// Mock atob for Node.js environment
if (typeof atob === 'undefined') {
  global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
}

// ImageProcessor class (simplified for testing)
class ImageProcessor {
  async createImageFromBase64(base64) {
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    const bytes = this._base64ToUint8Array(base64Data);
    return await this.createImageFromBytes(bytes);
  }

  async createImageFromBytes(bytes) {
    if (!(bytes instanceof Uint8Array)) {
      throw new Error('Input must be a Uint8Array');
    }
    if (bytes.length === 0) {
      throw new Error('Image data is empty');
    }
    const image = figma.createImage(bytes);
    await image.getBytesAsync();
    return image;
  }

  async scaleImage(bytes, targetWidth, targetHeight) {
    const tempImage = await this.createImageFromBytes(bytes);
    const originalWidth = tempImage.width;
    const originalHeight = tempImage.height;

    const { width: newWidth, height: newHeight } = this._calculateScaledDimensions(
      originalWidth,
      originalHeight,
      targetWidth,
      targetHeight
    );

    return {
      width: newWidth,
      height: newHeight,
      bytes: bytes,
      originalWidth,
      originalHeight
    };
  }

  _calculateScaledDimensions(originalWidth, originalHeight, targetWidth, targetHeight) {
    const originalAspectRatio = originalWidth / originalHeight;
    const targetAspectRatio = targetWidth / targetHeight;

    let newWidth, newHeight;

    if (originalAspectRatio > targetAspectRatio) {
      newWidth = targetWidth;
      newHeight = targetWidth / originalAspectRatio;
    } else {
      newHeight = targetHeight;
      newWidth = targetHeight * originalAspectRatio;
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    };
  }

  _base64ToUint8Array(base64) {
    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (error) {
      throw new Error(`Некорректные данные base64: ${error.message}`);
    }
  }
}

// SlideComposer class
class SlideComposer {
  constructor(imageProcessor) {
    this.imageProcessor = imageProcessor;
    this.SLIDE_WIDTH = 1242;
    this.SLIDE_HEIGHT = 2688;
  }

  async createBackground(imageBase64) {
    try {
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
    } catch (error) {
      console.error('Error creating background:', error);
      throw new Error(`Не удалось создать фон: ${error.message}`);
    }
  }

  async createTextElements(headline, subheadline) {
    try {
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

      return {
        headline: headlineNode,
        subheadline: subheadlineNode
      };
    } catch (error) {
      console.error('Error creating text elements:', error);
      throw new Error(`Не удалось создать текстовые элементы: ${error.message}`);
    }
  }

  async createiPhoneMockup(screenshotBase64 = null) {
    try {
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
        const image = await this.imageProcessor.createImageFromBase64(screenshotBase64);
        const bytes = await image.getBytesAsync();
        const innerWidth = mockupWidth - 20;
        const innerHeight = mockupHeight - 20;
        const scaled = await this.imageProcessor.scaleImage(bytes, innerWidth, innerHeight);

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
    } catch (error) {
      console.error('Error creating iPhone mockup:', error);
      throw new Error(`Не удалось создать мокап iPhone: ${error.message}`);
    }
  }

  async createSingleSlide(slide, backgroundBase64, screenshotBase64 = null, index = 0) {
    try {
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
    } catch (error) {
      console.error(`Error creating slide ${index + 1}:`, error);
      throw new Error(`Не удалось создать слайд ${index + 1}: ${error.message}`);
    }
  }

  async createSlides(data) {
    try {
      const { story, backgrounds, screenshots } = data;

      if (!story || !story.slides || story.slides.length !== 5) {
        throw new Error('История должна содержать ровно 5 слайдов');
      }

      if (!backgrounds || backgrounds.length !== 5) {
        throw new Error('Должно быть ровно 5 фоновых изображений');
      }

      const parentFrame = figma.createFrame();
      parentFrame.name = 'App Store Screenshots';
      parentFrame.layoutMode = 'HORIZONTAL';
      parentFrame.itemSpacing = 80;
      parentFrame.primaryAxisSizingMode = 'AUTO';
      parentFrame.counterAxisSizingMode = 'AUTO';

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

      parentFrame.x = figma.viewport.center.x - parentFrame.width / 2;
      parentFrame.y = figma.viewport.center.y - parentFrame.height / 2;

      figma.currentPage.selection = [parentFrame];
      figma.viewport.scrollAndZoomIntoView([parentFrame]);

      return parentFrame;
    } catch (error) {
      console.error('Error creating slides:', error);
      throw new Error(`Не удалось создать слайды: ${error.message}`);
    }
  }
}

// Test suite
async function runTests() {
  const imageProcessor = new ImageProcessor();
  const slideComposer = new SlideComposer(imageProcessor);
  let passed = 0;
  let failed = 0;

  console.log('🧪 Running SlideComposer tests...\n');

  // Test 1: createBackground creates rectangle with correct dimensions
  try {
    const base64 = 'iVBORw0KGgo=';
    const background = await slideComposer.createBackground(base64);
    
    if (background.name === 'Background' && 
        background.width === 1242 && 
        background.height === 2688 &&
        background.fills.length > 0 &&
        background.fills[0].type === 'IMAGE') {
      console.log('✅ Test 1 passed: createBackground creates correct rectangle');
      passed++;
    } else {
      throw new Error('Background not created correctly');
    }
  } catch (error) {
    console.log('❌ Test 1 failed:', error.message);
    failed++;
  }

  // Test 2: createTextElements creates headline and subheadline
  try {
    const textElements = await slideComposer.createTextElements('Test Headline', 'Test Subheadline');
    
    if (textElements.headline && 
        textElements.subheadline &&
        textElements.headline.name === 'Headline' &&
        textElements.subheadline.name === 'Subheadline' &&
        textElements.headline.characters === 'Test Headline' &&
        textElements.subheadline.characters === 'Test Subheadline') {
      console.log('✅ Test 2 passed: createTextElements creates text nodes');
      passed++;
    } else {
      throw new Error('Text elements not created correctly');
    }
  } catch (error) {
    console.log('❌ Test 2 failed:', error.message);
    failed++;
  }

  // Test 3: Text positioning - headline in upper third
  try {
    const textElements = await slideComposer.createTextElements('Headline', 'Subheadline');
    const upperThirdLimit = slideComposer.SLIDE_HEIGHT / 3;
    
    if (textElements.headline.y < upperThirdLimit) {
      console.log('✅ Test 3 passed: Headline positioned in upper third');
      passed++;
    } else {
      throw new Error(`Headline y=${textElements.headline.y} not in upper third (< ${upperThirdLimit})`);
    }
  } catch (error) {
    console.log('❌ Test 3 failed:', error.message);
    failed++;
  }

  // Test 4: Text positioning - subheadline below headline
  try {
    const textElements = await slideComposer.createTextElements('Headline', 'Subheadline');
    
    if (textElements.subheadline.y > textElements.headline.y) {
      console.log('✅ Test 4 passed: Subheadline positioned below headline');
      passed++;
    } else {
      throw new Error('Subheadline not below headline');
    }
  } catch (error) {
    console.log('❌ Test 4 failed:', error.message);
    failed++;
  }

  // Test 5: createiPhoneMockup without screenshot creates placeholder
  try {
    const mockup = await slideComposer.createiPhoneMockup(null);
    
    if (mockup.name === 'iPhone Mockup' && 
        mockup.children.length === 1 &&
        mockup.children[0].name === 'Placeholder') {
      console.log('✅ Test 5 passed: Mockup without screenshot has placeholder');
      passed++;
    } else {
      throw new Error('Mockup placeholder not created correctly');
    }
  } catch (error) {
    console.log('❌ Test 5 failed:', error.message);
    failed++;
  }

  // Test 6: createiPhoneMockup with screenshot inserts image
  try {
    const base64 = 'iVBORw0KGgo=';
    const mockup = await slideComposer.createiPhoneMockup(base64);
    
    if (mockup.name === 'iPhone Mockup' && 
        mockup.children.length === 1 &&
        mockup.children[0].name === 'Screenshot') {
      console.log('✅ Test 6 passed: Mockup with screenshot inserts image');
      passed++;
    } else {
      throw new Error('Mockup screenshot not inserted correctly');
    }
  } catch (error) {
    console.log('❌ Test 6 failed:', error.message);
    failed++;
  }

  // Test 7: createSingleSlide creates frame with all elements
  try {
    const slide = {
      headline: 'Test Headline',
      subheadline: 'Test Subheadline',
      description: 'Test description'
    };
    const base64 = 'iVBORw0KGgo=';
    const slideFrame = await slideComposer.createSingleSlide(slide, base64, null, 0);
    
    if (slideFrame.name === 'Slide 1: Test Headline' &&
        slideFrame.width === 1242 &&
        slideFrame.height === 2688 &&
        slideFrame.children.length === 4) { // background, headline, subheadline, mockup
      console.log('✅ Test 7 passed: createSingleSlide creates complete slide');
      passed++;
    } else {
      throw new Error(`Slide not created correctly: ${slideFrame.children.length} children`);
    }
  } catch (error) {
    console.log('❌ Test 7 failed:', error.message);
    failed++;
  }

  // Test 8: createSlides validates story structure
  try {
    const invalidData = {
      story: { slides: [1, 2, 3] }, // Only 3 slides
      backgrounds: [1, 2, 3, 4, 5]
    };
    
    await slideComposer.createSlides(invalidData);
    console.log('❌ Test 8 failed: Should throw error for invalid story');
    failed++;
  } catch (error) {
    if (error.message.includes('5 слайдов')) {
      console.log('✅ Test 8 passed: Validates story has 5 slides');
      passed++;
    } else {
      console.log('❌ Test 8 failed: Wrong error message');
      failed++;
    }
  }

  // Test 9: createSlides validates backgrounds count
  try {
    const invalidData = {
      story: { slides: [1, 2, 3, 4, 5] },
      backgrounds: [1, 2, 3] // Only 3 backgrounds
    };
    
    await slideComposer.createSlides(invalidData);
    console.log('❌ Test 9 failed: Should throw error for invalid backgrounds');
    failed++;
  } catch (error) {
    if (error.message.includes('5 фоновых изображений')) {
      console.log('✅ Test 9 passed: Validates 5 backgrounds required');
      passed++;
    } else {
      console.log('❌ Test 9 failed: Wrong error message');
      failed++;
    }
  }

  // Test 10: createSlides creates parent frame with 5 children
  try {
    const base64 = 'iVBORw0KGgo=';
    const validData = {
      story: {
        slides: [
          { headline: 'H1', subheadline: 'S1', description: 'D1' },
          { headline: 'H2', subheadline: 'S2', description: 'D2' },
          { headline: 'H3', subheadline: 'S3', description: 'D3' },
          { headline: 'H4', subheadline: 'S4', description: 'D4' },
          { headline: 'H5', subheadline: 'S5', description: 'D5' }
        ]
      },
      backgrounds: [
        { imageBase64: base64 },
        { imageBase64: base64 },
        { imageBase64: base64 },
        { imageBase64: base64 },
        { imageBase64: base64 }
      ],
      screenshots: null
    };
    
    const parentFrame = await slideComposer.createSlides(validData);
    
    if (parentFrame.name === 'App Store Screenshots' &&
        parentFrame.children.length === 5 &&
        parentFrame.layoutMode === 'HORIZONTAL' &&
        parentFrame.itemSpacing === 80) {
      console.log('✅ Test 10 passed: createSlides creates parent with 5 slides');
      passed++;
    } else {
      throw new Error(`Parent frame incorrect: ${parentFrame.children.length} children`);
    }
  } catch (error) {
    console.log('❌ Test 10 failed:', error.message);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  return { passed, failed };
}

// Run tests
runTests().then(({ passed, failed }) => {
  process.exit(failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});

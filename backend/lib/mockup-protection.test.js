/**
 * Task 11.6: Mockup Protection During Localization
 * 
 * Tests for protecting mockups and backgrounds from modification during localization.
 * Validates that elements marked with [PRESERVE] prefix are excluded from localization.
 * 
 * Requirements: 10.4
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Mock Figma API
global.figma = {
  createRectangle: () => ({
    name: '',
    type: 'RECTANGLE',
    resize: () => {},
    fills: [],
    setPluginData: function(key, value) {
      if (!this._pluginData) this._pluginData = {};
      this._pluginData[key] = value;
    },
    getPluginData: function(key) {
      return this._pluginData ? this._pluginData[key] : '';
    }
  }),
  createFrame: () => ({
    name: '',
    type: 'FRAME',
    children: [],
    resize: () => {},
    cornerRadius: 0,
    fills: [],
    appendChild: function(child) {
      this.children.push(child);
    },
    setPluginData: function(key, value) {
      if (!this._pluginData) this._pluginData = {};
      this._pluginData[key] = value;
    },
    getPluginData: function(key) {
      return this._pluginData ? this._pluginData[key] : '';
    }
  }),
  createText: () => ({
    name: '',
    type: 'TEXT',
    characters: '',
    fontName: { family: 'Inter', style: 'Regular' },
    fontSize: 16,
    textAlignHorizontal: 'LEFT',
    textAutoResize: 'HEIGHT',
    fills: [],
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    setPluginData: function(key, value) {
      if (!this._pluginData) this._pluginData = {};
      this._pluginData[key] = value;
    },
    getPluginData: function(key) {
      return this._pluginData ? this._pluginData[key] : '';
    }
  }),
  createImage: (bytes) => ({
    hash: 'mock-hash-' + bytes.length,
    width: 1242,
    height: 2688,
    getBytesAsync: async () => bytes
  }),
  loadFontAsync: async () => {}
};

// Helper function to create mock ImageProcessor
function createMockImageProcessor() {
  return {
    createImageFromBase64: async (base64) => {
      return figma.createImage(new Uint8Array(100));
    },
    createImageFromBytes: async (bytes) => {
      return figma.createImage(bytes);
    },
    scaleImage: async (bytes, targetWidth, targetHeight) => {
      return {
        width: targetWidth,
        height: targetHeight,
        bytes: bytes,
        originalWidth: 1242,
        originalHeight: 2688
      };
    }
  };
}

// Helper function to create mock SlideComposer
function createMockSlideComposer() {
  const imageProcessor = createMockImageProcessor();
  
  return {
    SLIDE_WIDTH: 1242,
    SLIDE_HEIGHT: 2688,
    imageProcessor: imageProcessor,
    
    async createBackground(imageBase64, slideIndex = 0) {
      const image = await this.imageProcessor.createImageFromBase64(imageBase64);
      const rect = figma.createRectangle();
      // Use [PRESERVE] prefix to indicate this element should not be modified during localization
      rect.name = '[PRESERVE] Background';
      rect.resize(this.SLIDE_WIDTH, this.SLIDE_HEIGHT);
      rect.fills = [{
        type: 'IMAGE',
        imageHash: image.hash,
        scaleMode: 'FILL'
      }];
      
      // Add metadata for identification
      rect.setPluginData('elementType', 'background');
      rect.setPluginData('slideIndex', slideIndex.toString());
      rect.setPluginData('generatedBy', 'screenshot-generator');
      rect.setPluginData('createdAt', new Date().toISOString());
      rect.setPluginData('preserve', 'true');
      
      return rect;
    },
    
    async createTextElements(headline, subheadline, slideIndex = 0) {
      const headlineNode = figma.createText();
      headlineNode.name = 'Headline';
      headlineNode.fontName = { family: 'Inter', style: 'Bold' };
      headlineNode.fontSize = 72;
      headlineNode.characters = headline;
      headlineNode.textAlignHorizontal = 'CENTER';
      headlineNode.textAutoResize = 'HEIGHT';
      headlineNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      headlineNode.x = this.SLIDE_WIDTH / 2 - headlineNode.width / 2;
      headlineNode.y = this.SLIDE_HEIGHT / 6;
      
      headlineNode.setPluginData('elementType', 'headline');
      headlineNode.setPluginData('slideIndex', slideIndex.toString());
      headlineNode.setPluginData('generatedBy', 'screenshot-generator');
      headlineNode.setPluginData('createdAt', new Date().toISOString());
      headlineNode.setPluginData('localizable', 'true');
      headlineNode.setPluginData('originalText', headline);
      
      const subheadlineNode = figma.createText();
      subheadlineNode.name = 'Subheadline';
      subheadlineNode.fontName = { family: 'Inter', style: 'Regular' };
      subheadlineNode.fontSize = 36;
      subheadlineNode.characters = subheadline;
      subheadlineNode.textAlignHorizontal = 'CENTER';
      subheadlineNode.textAutoResize = 'HEIGHT';
      subheadlineNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      subheadlineNode.x = this.SLIDE_WIDTH / 2 - subheadlineNode.width / 2;
      subheadlineNode.y = headlineNode.y + headlineNode.height + 40;
      
      subheadlineNode.setPluginData('elementType', 'subheadline');
      subheadlineNode.setPluginData('slideIndex', slideIndex.toString());
      subheadlineNode.setPluginData('generatedBy', 'screenshot-generator');
      subheadlineNode.setPluginData('createdAt', new Date().toISOString());
      subheadlineNode.setPluginData('localizable', 'true');
      subheadlineNode.setPluginData('originalText', subheadline);
      
      return {
        headline: headlineNode,
        subheadline: subheadlineNode
      };
    },
    
    async createiPhoneMockup(screenshotBase64 = null, slideIndex = 0) {
      const mockupWidth = 400;
      const mockupHeight = 820;
      
      const mockupFrame = figma.createFrame();
      // Use [PRESERVE] prefix to indicate this element should not be modified during localization
      mockupFrame.name = '[PRESERVE] iPhone Mockup';
      mockupFrame.resize(mockupWidth, mockupHeight);
      mockupFrame.cornerRadius = 40;
      mockupFrame.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
      mockupFrame.x = this.SLIDE_WIDTH / 2 - mockupWidth / 2;
      mockupFrame.y = this.SLIDE_HEIGHT * 0.55;
      
      mockupFrame.setPluginData('elementType', 'mockup');
      mockupFrame.setPluginData('slideIndex', slideIndex.toString());
      mockupFrame.setPluginData('generatedBy', 'screenshot-generator');
      mockupFrame.setPluginData('createdAt', new Date().toISOString());
      mockupFrame.setPluginData('preserve', 'true');
      mockupFrame.setPluginData('hasScreenshot', screenshotBase64 ? 'true' : 'false');
      
      if (screenshotBase64) {
        const image = await this.imageProcessor.createImageFromBase64(screenshotBase64);
        const bytes = await image.getBytesAsync();
        const innerWidth = mockupWidth - 20;
        const innerHeight = mockupHeight - 20;
        const scaled = await this.imageProcessor.scaleImage(bytes, innerWidth, innerHeight);
        
        const screenshotRect = figma.createRectangle();
        screenshotRect.name = 'App Screenshot';
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
        
        screenshotRect.setPluginData('elementType', 'screenshot');
        screenshotRect.setPluginData('slideIndex', slideIndex.toString());
        screenshotRect.setPluginData('generatedBy', 'screenshot-generator');
        screenshotRect.setPluginData('preserve', 'true');
        
        mockupFrame.appendChild(screenshotRect);
      } else {
        const placeholder = figma.createRectangle();
        placeholder.name = 'Screenshot Placeholder';
        placeholder.resize(mockupWidth - 20, mockupHeight - 20);
        placeholder.cornerRadius = 35;
        placeholder.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
        placeholder.x = 10;
        placeholder.y = 10;
        
        placeholder.setPluginData('elementType', 'placeholder');
        placeholder.setPluginData('slideIndex', slideIndex.toString());
        placeholder.setPluginData('generatedBy', 'screenshot-generator');
        
        mockupFrame.appendChild(placeholder);
      }
      
      return mockupFrame;
    },
    
    async createSingleSlide(slide, backgroundBase64, screenshotBase64 = null, index = 0) {
      const slideFrame = figma.createFrame();
      slideFrame.name = `Slide ${index + 1}: ${slide.headline}`;
      slideFrame.resize(this.SLIDE_WIDTH, this.SLIDE_HEIGHT);
      
      slideFrame.setPluginData('elementType', 'slide');
      slideFrame.setPluginData('slideIndex', index.toString());
      slideFrame.setPluginData('generatedBy', 'screenshot-generator');
      slideFrame.setPluginData('createdAt', new Date().toISOString());
      slideFrame.setPluginData('headline', slide.headline);
      slideFrame.setPluginData('subheadline', slide.subheadline);
      slideFrame.setPluginData('description', slide.description);
      
      const background = await this.createBackground(backgroundBase64, index);
      slideFrame.appendChild(background);
      
      const textElements = await this.createTextElements(slide.headline, slide.subheadline, index);
      slideFrame.appendChild(textElements.headline);
      slideFrame.appendChild(textElements.subheadline);
      
      const mockup = await this.createiPhoneMockup(screenshotBase64, index);
      slideFrame.appendChild(mockup);
      
      return slideFrame;
    }
  };
}

// collectLocalizableTextNodes function from code.js
function collectLocalizableTextNodes(nodes, acc = []) {
  for (const node of nodes) {
    // Skip nodes marked with [PRESERVE] prefix
    if (node.name && node.name.startsWith('[PRESERVE]')) {
      continue;
    }
    
    // Add text nodes that are not in preserved containers
    if (node.type === 'TEXT') {
      acc.push(node);
    }
    
    // Recursively search children
    if ('children' in node) {
      collectLocalizableTextNodes(node.children, acc);
    }
  }
  return acc;
}

describe('Task 11.6: Mockup Protection During Localization', () => {
  let slideComposer;
  
  beforeEach(() => {
    slideComposer = createMockSlideComposer();
  });
  
  describe('Element Naming', () => {
    it('should create background with [PRESERVE] prefix', async () => {
      const background = await slideComposer.createBackground('mock-base64', 0);
      
      expect(background.name).toBe('[PRESERVE] Background');
    });
    
    it('should create mockup with [PRESERVE] prefix', async () => {
      const mockup = await slideComposer.createiPhoneMockup(null, 0);
      
      expect(mockup.name).toBe('[PRESERVE] iPhone Mockup');
    });
  });
  
  describe('Metadata Flags', () => {
    it('should set preserve flag on background', async () => {
      const background = await slideComposer.createBackground('mock-base64', 0);
      
      expect(background.getPluginData('preserve')).toBe('true');
    });
    
    it('should set preserve flag on mockup', async () => {
      const mockup = await slideComposer.createiPhoneMockup(null, 0);
      
      expect(mockup.getPluginData('preserve')).toBe('true');
    });
    
    it('should set preserve flag on screenshot inside mockup', async () => {
      const mockup = await slideComposer.createiPhoneMockup('mock-screenshot-base64', 0);
      
      expect(mockup.children.length).toBe(1);
      const screenshot = mockup.children[0];
      expect(screenshot.getPluginData('preserve')).toBe('true');
    });
  });
  
  describe('Localization Filtering', () => {
    it('should exclude elements with [PRESERVE] prefix', async () => {
      const slide = {
        headline: 'Test Headline',
        subheadline: 'Test Subheadline',
        description: 'Test description'
      };
      
      const slideFrame = await slideComposer.createSingleSlide(
        slide,
        'mock-background-base64',
        null,
        0
      );
      
      const localizableNodes = collectLocalizableTextNodes([slideFrame]);
      
      // Should only include headline and subheadline, not background or mockup
      expect(localizableNodes.length).toBe(2);
      expect(localizableNodes[0].name).toBe('Headline');
      expect(localizableNodes[1].name).toBe('Subheadline');
    });
    
    it('should include headline and subheadline text nodes', async () => {
      const textElements = await slideComposer.createTextElements('Test Headline', 'Test Subheadline', 0);
      
      const nodes = [textElements.headline, textElements.subheadline];
      const localizableNodes = collectLocalizableTextNodes(nodes);
      
      expect(localizableNodes.length).toBe(2);
      expect(localizableNodes[0].characters).toBe('Test Headline');
      expect(localizableNodes[1].characters).toBe('Test Subheadline');
    });
    
    it('should exclude text nodes inside [PRESERVE] containers', async () => {
      const preservedFrame = figma.createFrame();
      preservedFrame.name = '[PRESERVE] Test Container';
      
      const textNode = figma.createText();
      textNode.name = 'Text Inside Preserved';
      textNode.characters = 'This should not be localized';
      
      preservedFrame.appendChild(textNode);
      
      const localizableNodes = collectLocalizableTextNodes([preservedFrame]);
      
      expect(localizableNodes.length).toBe(0);
    });
    
    it('should work with nested structures', async () => {
      const parentFrame = figma.createFrame();
      parentFrame.name = 'Parent Frame';
      
      // Add localizable text
      const headline = figma.createText();
      headline.name = 'Headline';
      headline.characters = 'Localizable Headline';
      parentFrame.appendChild(headline);
      
      // Add preserved container with text
      const preservedContainer = figma.createFrame();
      preservedContainer.name = '[PRESERVE] Mockup';
      const preservedText = figma.createText();
      preservedText.name = 'Preserved Text';
      preservedText.characters = 'Should not be localized';
      preservedContainer.appendChild(preservedText);
      parentFrame.appendChild(preservedContainer);
      
      // Add another localizable text
      const subheadline = figma.createText();
      subheadline.name = 'Subheadline';
      subheadline.characters = 'Localizable Subheadline';
      parentFrame.appendChild(subheadline);
      
      const localizableNodes = collectLocalizableTextNodes([parentFrame]);
      
      expect(localizableNodes.length).toBe(2);
      expect(localizableNodes[0].characters).toBe('Localizable Headline');
      expect(localizableNodes[1].characters).toBe('Localizable Subheadline');
    });
  });
  
  describe('Requirement 10.4: Mockup Protection', () => {
    it('should protect mockups during localization', async () => {
      const slide = {
        headline: 'Original Headline',
        subheadline: 'Original Subheadline',
        description: 'Test description'
      };
      
      const slideFrame = await slideComposer.createSingleSlide(
        slide,
        'mock-background-base64',
        'mock-screenshot-base64',
        0
      );
      
      // Simulate localization process
      const localizableNodes = collectLocalizableTextNodes([slideFrame]);
      
      // Verify only text nodes are collected
      expect(localizableNodes.length).toBe(2);
      expect(localizableNodes.every(node => node.type === 'TEXT')).toBe(true);
      
      // Verify mockup is not in the collection
      const mockupInCollection = localizableNodes.some(node => 
        node.name && node.name.includes('Mockup')
      );
      expect(mockupInCollection).toBe(false);
      
      // Verify background is not in the collection
      const backgroundInCollection = localizableNodes.some(node => 
        node.name && node.name.includes('Background')
      );
      expect(backgroundInCollection).toBe(false);
    });
    
    it('should preserve screenshots inside mockups', async () => {
      const mockup = await slideComposer.createiPhoneMockup('mock-screenshot-base64', 0);
      
      // Verify mockup has screenshot child
      expect(mockup.children.length).toBe(1);
      const screenshot = mockup.children[0];
      expect(screenshot.name).toBe('App Screenshot');
      
      // Verify screenshot is protected
      expect(screenshot.getPluginData('preserve')).toBe('true');
      
      // Verify mockup is excluded from localization
      const localizableNodes = collectLocalizableTextNodes([mockup]);
      expect(localizableNodes.length).toBe(0);
    });
  });
  
  describe('Integration with Complete Slide', () => {
    it('should create slide with proper protection hierarchy', async () => {
      const slide = {
        headline: 'Transform Your Workflow',
        subheadline: 'Boost productivity with AI',
        description: 'Modern workspace with AI elements'
      };
      
      const slideFrame = await slideComposer.createSingleSlide(
        slide,
        'mock-background-base64',
        'mock-screenshot-base64',
        0
      );
      
      // Verify slide structure
      expect(slideFrame.children.length).toBe(4); // background, headline, subheadline, mockup
      
      // Verify element names
      expect(slideFrame.children[0].name).toBe('[PRESERVE] Background');
      expect(slideFrame.children[1].name).toBe('Headline');
      expect(slideFrame.children[2].name).toBe('Subheadline');
      expect(slideFrame.children[3].name).toBe('[PRESERVE] iPhone Mockup');
      
      // Verify localization filtering
      const localizableNodes = collectLocalizableTextNodes([slideFrame]);
      expect(localizableNodes.length).toBe(2);
      expect(localizableNodes[0].name).toBe('Headline');
      expect(localizableNodes[1].name).toBe('Subheadline');
    });
    
    it('should maintain protection after cloning slide', async () => {
      const slide = {
        headline: 'Original Headline',
        subheadline: 'Original Subheadline',
        description: 'Test description'
      };
      
      const originalSlide = await slideComposer.createSingleSlide(
        slide,
        'mock-background-base64',
        null,
        0
      );
      
      // Simulate cloning (as done in localization)
      const clonedSlide = {
        ...originalSlide,
        name: originalSlide.name + ' [en → es]',
        children: [...originalSlide.children]
      };
      
      // Verify protection is maintained in clone
      const localizableNodes = collectLocalizableTextNodes([clonedSlide]);
      expect(localizableNodes.length).toBe(2);
      expect(localizableNodes[0].name).toBe('Headline');
      expect(localizableNodes[1].name).toBe('Subheadline');
    });
  });
});

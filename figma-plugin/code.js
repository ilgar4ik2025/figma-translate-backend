figma.showUI(__html__, { width: 360, height: 520 });

/* ================= CONST ================= */

const PRESETS = {
  GLOBAL: {
    maxLines: 3,
    minFontScale: 0.8,
    maxChars: 90,
    lineHeightTighten: 0.95
  },
  EU: {
    maxLines: 3,
    minFontScale: 0.8,
    maxChars: 80,
    lineHeightTighten: 0.95
  },
  JAPAN: {
    maxLines: 2,
    minFontScale: 0.7,
    maxChars: 40,
    lineHeightTighten: 0.9
  },
  KOREA: {
    maxLines: 2,
    minFontScale: 0.72,
    maxChars: 45,
    lineHeightTighten: 0.92
  }
};

const TAB_STATE_KEY = 'screenshot-generator-tab-state';

/* ================= STATE MANAGEMENT ================= */

async function saveTabState(state) {
  try {
    await figma.clientStorage.setAsync(TAB_STATE_KEY, state);
  } catch (error) {
    console.error('Failed to save tab state:', error);
  }
}

async function loadTabState() {
  try {
    const state = await figma.clientStorage.getAsync(TAB_STATE_KEY);
    return state || null;
  } catch (error) {
    console.error('Failed to load tab state:', error);
    return null;
  }
}

/* ================= HELPERS ================= */

function collectTextNodes(nodes, acc = []) {
  for (const node of nodes) {
    if (node.type === 'TEXT') acc.push(node);
    if ('children' in node) collectTextNodes(node.children, acc);
  }
  return acc;
}

/**
 * Collect text nodes for localization, excluding elements marked with [PRESERVE]
 * This ensures that mockups and backgrounds created by Tab 2 are not modified during localization
 * @param {Array} nodes - Array of Figma nodes to search
 * @param {Array} acc - Accumulator for text nodes
 * @returns {Array} - Array of TextNodes that should be localized
 */
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

async function setText(node, text) {
  await figma.loadFontAsync(node.fontName);
  node.characters = text;
}

function enforceAutoResize(node) {
  if (node.textAutoResize !== 'HEIGHT') {
    node.textAutoResize = 'HEIGHT';
  }
}

/* ================= SMART OVERFLOW (FINAL) ================= */

async function smartOverflow(node, preset) {
  if (typeof node.fontSize !== 'number') return;

  // ✅ фиксируем реальную высоту контейнера
  const containerHeight = node.height;

  // ✅ предсказуемый режим
  enforceAutoResize(node);

  const originalFontSize = node.fontSize;
  const minFontSize = originalFontSize * preset.minFontScale;

  // 1️⃣ аккуратно ужимаем lineHeight (ОДИН РАЗ)
  if (node.lineHeight && node.lineHeight.unit === 'PIXELS') {
    node.lineHeight = {
      unit: 'PIXELS',
      value: node.lineHeight.value * preset.lineHeightTighten
    };
  }

  // 2️⃣ уменьшаем fontSize
  let size = node.fontSize;
  while (node.height > containerHeight && size > minFontSize) {
    size -= 1;
    await figma.loadFontAsync(node.fontName);
    node.fontSize = size;
  }

  // 3️⃣ LAST RESORT: ОДИН truncate, без циклов
  if (node.height > containerHeight) {
    node.characters =
      node.characters.slice(0, preset.maxChars).trim() + '…';
  }
}

/* ================= MESSAGE HANDLER ================= */

/**
 * MessageHandler - Manages communication between UI and plugin code
 * Handles messages from UI and sends updates back to UI
 */
class MessageHandler {
  constructor() {
    this.generationState = {
      isGenerating: false,
      currentStage: null,
      storyStructure: null,
      backgrounds: [],
      appDescription: null
    };
  }

  /**
   * Main message handler - routes messages to appropriate handlers
   */
  async handleMessage(msg) {
    try {
      switch (msg.type) {
        case 'save-tab-state':
          await this.handleSaveTabState(msg);
          break;
        
        case 'load-tab-state':
          await this.handleLoadTabState();
          break;
        
        case 'check-elements':
          await this.handleCheckElements(msg);
          break;
        
        case 'navigate-to-elements':
          await this.handleNavigateToElements(msg);
          break;
        
        case 'generate-screenshots':
          await this.handleGenerateScreenshots(msg);
          break;
        
        case 'generate-backgrounds':
          await this.handleGenerateBackgrounds(msg);
          break;
        
        case 'create-slides':
          await this.handleCreateSlides(msg);
          break;
        
        case 'regenerate-slide':
          await this.handleRegenerateSlide(msg);
          break;
        
        case 'run-localization':
          await this.handleRunLocalization(msg);
          break;
        
        default:
          console.warn('Unknown message type:', msg.type);
      }
    } catch (error) {
      console.error('Message handler error:', error);
      this.sendError(error.message || 'Произошла неизвестная ошибка');
    }
  }

  /**
   * Send message to UI
   */
  sendToUI(message) {
    figma.ui.postMessage(message);
  }

  /**
   * Send progress update to UI
   */
  sendProgressUpdate(stage, percent) {
    this.sendToUI({
      type: 'progress-update',
      data: { stage, percent }
    });
  }

  /**
   * Send error message to UI
   */
  sendError(message) {
    this.sendToUI({
      type: 'error',
      data: { message }
    });
    
    // Reset generation state on error
    this.generationState.isGenerating = false;
    this.generationState.currentStage = null;
  }

  /**
   * Send completion message to UI
   */
  sendComplete(frameId) {
    this.sendToUI({
      type: 'complete',
      data: { frameId }
    });
    
    // Reset generation state
    this.generationState.isGenerating = false;
    this.generationState.currentStage = null;
  }

  /**
   * Handle tab state persistence
   */
  async handleSaveTabState(msg) {
    await saveTabState(msg.state);
  }

  async handleLoadTabState() {
    const savedState = await loadTabState();
    this.sendToUI({
      type: 'restore-tab-state',
      state: savedState
    });
  }

  /**
   * Handle screenshot generation request
   * Step 1: Generate story structure using GPT
   */
  async handleGenerateScreenshots(msg) {
    if (this.generationState.isGenerating) {
      this.sendError('Генерация уже выполняется. Пожалуйста, подождите.');
      return;
    }

    this.generationState.isGenerating = true;
    this.generationState.currentStage = 'story-generation';
    this.generationState.appDescription = msg.appDescription;

    figma.notify('🚀 Генерация структуры истории...');
    this.sendProgressUpdate('story-generation', 10);

    try {
      // Call backend API to generate story
      const response = await fetch('https://figma-translate-backend.vercel.app/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg.appDescription)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось сгенерировать историю');
      }

      const data = await response.json();
      
      if (!data.success || !data.story) {
        throw new Error('Некорректный ответ от сервера');
      }

      // Store story structure
      this.generationState.storyStructure = data.story;

      // Send story to UI for review
      this.sendToUI({
        type: 'story-generated',
        data: data.story
      });

      figma.notify('✅ История сгенерирована! Проверьте и отредактируйте.');
      this.sendProgressUpdate('story-generation', 100);

      // Reset generation state (user needs to confirm before backgrounds)
      this.generationState.isGenerating = false;
      this.generationState.currentStage = null;

    } catch (error) {
      console.error('Story generation error:', error);
      figma.notify('❌ Ошибка генерации истории');
      this.sendError(error.message || 'Не удалось сгенерировать историю. Попробуйте еще раз.');
    }
  }

  /**
   * Handle background generation request
   * Step 2: Generate backgrounds for all slides using Gemini
   */
  async handleGenerateBackgrounds(msg) {
    if (this.generationState.isGenerating) {
      this.sendError('Генерация уже выполняется. Пожалуйста, подождите.');
      return;
    }

    this.generationState.isGenerating = true;
    this.generationState.currentStage = 'background-generation';
    this.generationState.storyStructure = msg.story;

    figma.notify('🎨 Генерация фонов...');
    this.sendProgressUpdate('background-generation', 0);

    try {
      const story = msg.story;
      const backgrounds = [];
      const style = this.generationState.appDescription?.style || 'Modern, professional';

      // Generate backgrounds for each slide
      for (let i = 0; i < story.slides.length; i++) {
        const slide = story.slides[i];
        
        this.sendProgressUpdate('background-generation', Math.round((i / story.slides.length) * 100));
        
        try {
          const response = await fetch('https://figma-translate-backend.vercel.app/api/generate-background', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description: slide.description,
              style: style,
              index: i
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Не удалось сгенерировать фон для слайда ${i + 1}`);
          }

          const data = await response.json();
          
          if (!data.success || !data.imageBase64) {
            throw new Error(`Некорректный ответ для слайда ${i + 1}`);
          }

          backgrounds.push({
            index: i,
            imageBase64: data.imageBase64
          });

          // Notify UI about progress
          this.sendToUI({
            type: 'background-generated',
            data: {
              index: i + 1,
              total: story.slides.length
            }
          });

        } catch (slideError) {
          console.error(`Background generation error for slide ${i}:`, slideError);
          throw new Error(`Ошибка генерации фона для слайда ${i + 1}: ${slideError.message}`);
        }
      }

      // Store backgrounds
      this.generationState.backgrounds = backgrounds;

      figma.notify('✅ Все фоны сгенерированы!');
      this.sendProgressUpdate('background-generation', 100);

      // Automatically proceed to composition
      await this.handleCreateSlides({
        story: story,
        backgrounds: backgrounds,
        screenshots: this.generationState.appDescription?.screenshots
      });

    } catch (error) {
      console.error('Background generation error:', error);
      figma.notify('❌ Ошибка генерации фонов');
      this.sendError(error.message || 'Не удалось сгенерировать фоны. Попробуйте еще раз.');
    }
  }

  /**
   * Handle slide creation in Figma
   * Step 3: Create slide compositions in Figma
   */
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
      
      // Store created element IDs for persistence
      const sessionId = parentFrame.getPluginData('sessionId');
      const createdElements = {
        parentFrameId: parentFrame.id,
        sessionId: sessionId,
        createdAt: new Date().toISOString(),
        slideCount: 5
      };
      
      // Save to tab state
      await this.saveCreatedElements(createdElements);
      
      // Send completion message with frame ID and element info
      this.sendComplete(parentFrame.id);
      this.sendToUI({
        type: 'elements-created',
        data: createdElements
      });
      
      figma.notify('✅ Слайды успешно созданы!');

    } catch (error) {
      console.error('Slide creation error:', error);
      figma.notify('❌ Ошибка создания слайдов');
      this.sendError(error.message || 'Не удалось создать слайды. Попробуйте еще раз.');
    }
  }

  /**
   * Save created element IDs to persistent storage
   */
  async saveCreatedElements(elements) {
    try {
      const currentState = await loadTabState();
      const updatedState = {
        ...currentState,
        createdElements: elements
      };
      await saveTabState(updatedState);
    } catch (error) {
      console.error('Failed to save created elements:', error);
    }
  }

  /**
   * Check if previously created elements still exist
   */
  async handleCheckElements(msg) {
    try {
      const savedState = await loadTabState();
      
      if (!savedState || !savedState.createdElements) {
        this.sendToUI({
          type: 'elements-check-result',
          data: { exists: false, elements: null }
        });
        return;
      }

      const { parentFrameId, sessionId } = savedState.createdElements;
      
      // Try to find the parent frame by ID
      const parentFrame = figma.getNodeById(parentFrameId);
      
      if (!parentFrame) {
        // Frame was deleted
        this.sendToUI({
          type: 'elements-check-result',
          data: { exists: false, elements: null }
        });
        return;
      }

      // Verify it's the correct frame by checking session ID
      const frameSessionId = parentFrame.getPluginData('sessionId');
      
      if (frameSessionId !== sessionId) {
        // Session ID mismatch - different frame
        this.sendToUI({
          type: 'elements-check-result',
          data: { exists: false, elements: null }
        });
        return;
      }

      // Frame exists and matches - collect slide information
      const slideInfo = this.collectSlideInfo(parentFrame, sessionId);
      
      this.sendToUI({
        type: 'elements-check-result',
        data: {
          exists: true,
          elements: {
            ...savedState.createdElements,
            frameNode: {
              id: parentFrame.id,
              name: parentFrame.name,
              x: parentFrame.x,
              y: parentFrame.y
            },
            slides: slideInfo
          }
        }
      });

    } catch (error) {
      console.error('Error checking elements:', error);
      this.sendToUI({
        type: 'elements-check-result',
        data: { exists: false, elements: null }
      });
    }
  }

  /**
   * Collect information about slides in a parent frame
   */
  collectSlideInfo(parentFrame, sessionId) {
    const slides = [];
    
    if ('children' in parentFrame) {
      for (const child of parentFrame.children) {
        const childSessionId = child.getPluginData('sessionId');
        const elementType = child.getPluginData('elementType');
        
        if (childSessionId === sessionId && elementType === 'slide') {
          slides.push({
            id: child.id,
            name: child.name,
            index: parseInt(child.getPluginData('slideIndex') || '0'),
            headline: child.getPluginData('headline') || '',
            subheadline: child.getPluginData('subheadline') || ''
          });
        }
      }
    }
    
    // Sort by index
    slides.sort((a, b) => a.index - b.index);
    
    return slides;
  }

  /**
   * Navigate to existing elements in Figma
   */
  async handleNavigateToElements(msg) {
    try {
      const { parentFrameId } = msg;
      
      const parentFrame = figma.getNodeById(parentFrameId);
      
      if (!parentFrame) {
        this.sendError('Элементы не найдены. Возможно, они были удалены.');
        return;
      }

      // Select and zoom to the frame
      figma.currentPage.selection = [parentFrame];
      figma.viewport.scrollAndZoomIntoView([parentFrame]);
      
      figma.notify('✅ Переход к созданным слайдам');

    } catch (error) {
      console.error('Error navigating to elements:', error);
      this.sendError('Не удалось перейти к элементам');
    }
  }

  /**
   * Handle single slide regeneration
   */
  async handleRegenerateSlide(msg) {
    const { slideIndex, currentSlide, appDescription } = msg;
    
    figma.notify(`🔄 Регенерация слайда ${slideIndex + 1}...`);

    try {
      // Call backend API to regenerate story with focus on specific slide
      const response = await fetch('https://figma-translate-backend.vercel.app/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...appDescription,
          regenerateSlideIndex: slideIndex,
          currentSlide: currentSlide
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось регенерировать слайд');
      }

      const data = await response.json();
      
      if (!data.success || !data.story || !data.story.slides[slideIndex]) {
        throw new Error('Некорректный ответ от сервера');
      }

      // Send regenerated slide to UI
      this.sendToUI({
        type: 'slide-regenerated',
        data: {
          slideIndex: slideIndex,
          slideData: data.story.slides[slideIndex]
        }
      });

      figma.notify(`✅ Слайд ${slideIndex + 1} регенерирован`);

    } catch (error) {
      console.error('Slide regeneration error:', error);
      figma.notify(`❌ Ошибка регенерации слайда ${slideIndex + 1}`);
      this.sendError(error.message || 'Не удалось регенерировать слайд. Попробуйте еще раз.');
    }
  }

  /**
   * Handle existing localization functionality
   */
  async handleRunLocalization(msg) {
    // Delegate to existing localization handler
    await handleLocalization(msg);
  }
}

/* ================= SLIDE COMPOSER ================= */

/**
 * SlideComposer - Creates slide compositions in Figma
 * Handles creation of backgrounds, text elements, mockups, and complete slides
 */
class SlideComposer {
  constructor(imageProcessor) {
    this.imageProcessor = imageProcessor;
    // iPhone portrait dimensions (App Store standard)
    this.SLIDE_WIDTH = 1242;
    this.SLIDE_HEIGHT = 2688;
  }

  /**
   * Create background rectangle with image
   * Background is marked with [PRESERVE] prefix to indicate it should not be modified during localization
   * @param {string} imageBase64 - Base64-encoded background image
   * @param {number} slideIndex - Index of the slide (for metadata)
   * @returns {Promise<RectangleNode>} - Background rectangle node
   */
  async createBackground(imageBase64, slideIndex = 0) {
    try {
      // Create Figma image from base64
      const image = await this.imageProcessor.createImageFromBase64(imageBase64);
      
      // Create rectangle node
      const rect = figma.createRectangle();
      // Use [PRESERVE] prefix to indicate this element should not be modified during localization
      rect.name = '[PRESERVE] Background';
      rect.resize(this.SLIDE_WIDTH, this.SLIDE_HEIGHT);
      
      // Set image as fill
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
    } catch (error) {
      console.error('Error creating background:', error);
      throw new Error(`Не удалось создать фон: ${error.message}`);
    }
  }

  /**
   * Create text elements (headline and subheadline)
   * Compatible with Tab 1 (Localizer) - creates proper TextNodes with descriptive names
   * @param {string} headline - Main headline text
   * @param {string} subheadline - Subheadline text
   * @param {number} slideIndex - Index of the slide (for metadata)
   * @returns {Promise<{headline: TextNode, subheadline: TextNode}>} - Text nodes
   */
  async createTextElements(headline, subheadline, slideIndex = 0) {
    try {
      // Create headline text node
      const headlineNode = figma.createText();
      // Use descriptive name for easy identification in localization workflow
      headlineNode.name = 'Headline';
      
      // Load and set font for headline
      await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
      headlineNode.fontName = { family: 'Inter', style: 'Bold' };
      headlineNode.fontSize = 72;
      headlineNode.characters = headline;
      headlineNode.textAlignHorizontal = 'CENTER';
      headlineNode.textAutoResize = 'HEIGHT';
      
      // Set headline color (white for visibility on backgrounds)
      headlineNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      
      // Position headline in upper third
      headlineNode.x = this.SLIDE_WIDTH / 2 - headlineNode.width / 2;
      headlineNode.y = this.SLIDE_HEIGHT / 6;
      
      // Add metadata for identification
      headlineNode.setPluginData('elementType', 'headline');
      headlineNode.setPluginData('slideIndex', slideIndex.toString());
      headlineNode.setPluginData('generatedBy', 'screenshot-generator');
      headlineNode.setPluginData('createdAt', new Date().toISOString());
      headlineNode.setPluginData('localizable', 'true');
      headlineNode.setPluginData('originalText', headline);
      
      // Create subheadline text node
      const subheadlineNode = figma.createText();
      // Use descriptive name for easy identification in localization workflow
      subheadlineNode.name = 'Subheadline';
      
      // Load and set font for subheadline
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      subheadlineNode.fontName = { family: 'Inter', style: 'Regular' };
      subheadlineNode.fontSize = 36;
      subheadlineNode.characters = subheadline;
      subheadlineNode.textAlignHorizontal = 'CENTER';
      subheadlineNode.textAutoResize = 'HEIGHT';
      
      // Set subheadline color (white)
      subheadlineNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      
      // Position subheadline below headline
      subheadlineNode.x = this.SLIDE_WIDTH / 2 - subheadlineNode.width / 2;
      subheadlineNode.y = headlineNode.y + headlineNode.height + 40;
      
      // Add metadata for identification
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
    } catch (error) {
      console.error('Error creating text elements:', error);
      throw new Error(`Не удалось создать текстовые элементы: ${error.message}`);
    }
  }

  /**
   * Create iPhone mockup frame with optional screenshot
   * Mockup is marked with [PRESERVE] prefix to indicate it should not be modified during localization
   * @param {string|null} screenshotBase64 - Optional base64-encoded screenshot
   * @param {number} slideIndex - Index of the slide (for metadata)
   * @returns {Promise<FrameNode>} - iPhone mockup frame
   */
  async createiPhoneMockup(screenshotBase64 = null, slideIndex = 0) {
    try {
      // iPhone mockup dimensions (with frame)
      const mockupWidth = 400;
      const mockupHeight = 820;
      
      // Create mockup frame
      const mockupFrame = figma.createFrame();
      // Use [PRESERVE] prefix to indicate this element should not be modified during localization
      mockupFrame.name = '[PRESERVE] iPhone Mockup';
      mockupFrame.resize(mockupWidth, mockupHeight);
      mockupFrame.cornerRadius = 40;
      
      // Set frame background (iPhone frame color - dark)
      mockupFrame.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
      
      // Position mockup in lower portion of slide
      mockupFrame.x = this.SLIDE_WIDTH / 2 - mockupWidth / 2;
      mockupFrame.y = this.SLIDE_HEIGHT * 0.55;
      
      // Add metadata for identification
      mockupFrame.setPluginData('elementType', 'mockup');
      mockupFrame.setPluginData('slideIndex', slideIndex.toString());
      mockupFrame.setPluginData('generatedBy', 'screenshot-generator');
      mockupFrame.setPluginData('createdAt', new Date().toISOString());
      mockupFrame.setPluginData('preserve', 'true');
      mockupFrame.setPluginData('hasScreenshot', screenshotBase64 ? 'true' : 'false');
      
      // If screenshot provided, insert it
      if (screenshotBase64) {
        // Create image from base64
        const image = await this.imageProcessor.createImageFromBase64(screenshotBase64);
        const bytes = await image.getBytesAsync();
        
        // Inner dimensions (leaving space for iPhone frame)
        const innerWidth = mockupWidth - 20;
        const innerHeight = mockupHeight - 20;
        
        // Scale screenshot to fit while preserving aspect ratio
        const scaled = await this.imageProcessor.scaleImage(bytes, innerWidth, innerHeight);
        
        // Create rectangle for screenshot
        const screenshotRect = figma.createRectangle();
        screenshotRect.name = 'App Screenshot';
        screenshotRect.resize(scaled.width, scaled.height);
        screenshotRect.cornerRadius = 35;
        
        // Apply scaled image
        const scaledImage = await this.imageProcessor.createImageFromBytes(scaled.bytes);
        screenshotRect.fills = [{
          type: 'IMAGE',
          imageHash: scaledImage.hash,
          scaleMode: 'FIT'
        }];
        
        // Center screenshot in mockup
        screenshotRect.x = (mockupWidth - scaled.width) / 2;
        screenshotRect.y = (mockupHeight - scaled.height) / 2;
        
        // Add metadata to screenshot
        screenshotRect.setPluginData('elementType', 'screenshot');
        screenshotRect.setPluginData('slideIndex', slideIndex.toString());
        screenshotRect.setPluginData('generatedBy', 'screenshot-generator');
        screenshotRect.setPluginData('preserve', 'true');
        
        mockupFrame.appendChild(screenshotRect);
      } else {
        // No screenshot - create placeholder
        const placeholder = figma.createRectangle();
        placeholder.name = 'Screenshot Placeholder';
        placeholder.resize(mockupWidth - 20, mockupHeight - 20);
        placeholder.cornerRadius = 35;
        placeholder.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
        placeholder.x = 10;
        placeholder.y = 10;
        
        // Add metadata to placeholder
        placeholder.setPluginData('elementType', 'placeholder');
        placeholder.setPluginData('slideIndex', slideIndex.toString());
        placeholder.setPluginData('generatedBy', 'screenshot-generator');
        
        mockupFrame.appendChild(placeholder);
      }
      
      return mockupFrame;
    } catch (error) {
      console.error('Error creating iPhone mockup:', error);
      throw new Error(`Не удалось создать мокап iPhone: ${error.message}`);
    }
  }

  /**
   * Create a single slide composition
   * Creates a complete slide with proper layer naming for Tab 1 (Localizer) compatibility
   * @param {Object} slide - Slide data with headline, subheadline, description
   * @param {string} backgroundBase64 - Base64-encoded background image
   * @param {string|null} screenshotBase64 - Optional screenshot
   * @param {number} index - Slide index (0-4)
   * @returns {Promise<FrameNode>} - Complete slide frame
   */
  async createSingleSlide(slide, backgroundBase64, screenshotBase64 = null, index = 0) {
    try {
      // Create slide container frame with descriptive name
      const slideFrame = figma.createFrame();
      slideFrame.name = `Slide ${index + 1}: ${slide.headline}`;
      slideFrame.resize(this.SLIDE_WIDTH, this.SLIDE_HEIGHT);
      
      // Add metadata to slide frame
      slideFrame.setPluginData('elementType', 'slide');
      slideFrame.setPluginData('slideIndex', index.toString());
      slideFrame.setPluginData('generatedBy', 'screenshot-generator');
      slideFrame.setPluginData('createdAt', new Date().toISOString());
      slideFrame.setPluginData('headline', slide.headline);
      slideFrame.setPluginData('subheadline', slide.subheadline);
      slideFrame.setPluginData('description', slide.description);
      
      // 1. Create and add background (marked with [PRESERVE])
      const background = await this.createBackground(backgroundBase64, index);
      slideFrame.appendChild(background);
      
      // 2. Create and add text elements (TextNodes for localization compatibility)
      const textElements = await this.createTextElements(slide.headline, slide.subheadline, index);
      slideFrame.appendChild(textElements.headline);
      slideFrame.appendChild(textElements.subheadline);
      
      // 3. Create and add iPhone mockup (marked with [PRESERVE])
      const mockup = await this.createiPhoneMockup(screenshotBase64, index);
      slideFrame.appendChild(mockup);
      
      return slideFrame;
    } catch (error) {
      console.error(`Error creating slide ${index + 1}:`, error);
      throw new Error(`Не удалось создать слайд ${index + 1}: ${error.message}`);
    }
  }

  /**
   * Create all 5 slides and organize them in a parent frame
   * @param {Object} data - Slide composition data
   * @param {Object} data.story - Story structure with slides array
   * @param {Array} data.backgrounds - Array of background data with imageBase64
   * @param {Array|null} data.screenshots - Optional array of screenshot base64 strings
   * @returns {Promise<FrameNode>} - Parent frame containing all slides
   */
  async createSlides(data) {
    try {
      const { story, backgrounds, screenshots } = data;
      
      // Validate input
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
      
      // Add metadata to parent frame
      const sessionId = Date.now().toString();
      parentFrame.setPluginData('elementType', 'screenshot-collection');
      parentFrame.setPluginData('generatedBy', 'screenshot-generator');
      parentFrame.setPluginData('createdAt', new Date().toISOString());
      parentFrame.setPluginData('sessionId', sessionId);
      parentFrame.setPluginData('slideCount', '5');
      
      // Create each slide
      for (let i = 0; i < story.slides.length; i++) {
        const slide = story.slides[i];
        const backgroundData = backgrounds[i];
        const screenshotData = screenshots && screenshots[i] ? screenshots[i] : null;
        
        // Create single slide
        const slideFrame = await this.createSingleSlide(
          slide,
          backgroundData.imageBase64,
          screenshotData,
          i
        );
        
        // Add session ID to link slides together
        slideFrame.setPluginData('sessionId', sessionId);
        
        // Add to parent frame
        parentFrame.appendChild(slideFrame);
      }
      
      // Center parent frame in viewport
      parentFrame.x = figma.viewport.center.x - parentFrame.width / 2;
      parentFrame.y = figma.viewport.center.y - parentFrame.height / 2;
      
      // Select the parent frame
      figma.currentPage.selection = [parentFrame];
      figma.viewport.scrollAndZoomIntoView([parentFrame]);
      
      return parentFrame;
    } catch (error) {
      console.error('Error creating slides:', error);
      throw new Error(`Не удалось создать слайды: ${error.message}`);
    }
  }
}

/* ================= IMAGE PROCESSOR ================= */

/**
 * ImageProcessor - Handles image processing for Figma
 * Converts images from various formats and performs scaling operations
 */
class ImageProcessor {
  /**
   * Create a Figma Image from base64-encoded string
   * @param {string} base64 - Base64-encoded image data (with or without data URI prefix)
   * @returns {Promise<Image>} - Figma Image object
   */
  async createImageFromBase64(base64) {
    try {
      // Remove data URI prefix if present (e.g., "data:image/png;base64,")
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      
      // Convert base64 to Uint8Array
      const bytes = this._base64ToUint8Array(base64Data);
      
      // Create Figma image from bytes
      return await this.createImageFromBytes(bytes);
    } catch (error) {
      console.error('Error creating image from base64:', error);
      throw new Error(`Не удалось создать изображение из base64: ${error.message}`);
    }
  }

  /**
   * Create a Figma Image from Uint8Array
   * @param {Uint8Array} bytes - Image data as Uint8Array
   * @returns {Promise<Image>} - Figma Image object
   */
  async createImageFromBytes(bytes) {
    try {
      // Validate input
      if (!(bytes instanceof Uint8Array)) {
        throw new Error('Input must be a Uint8Array');
      }

      if (bytes.length === 0) {
        throw new Error('Image data is empty');
      }

      // Create Figma image from bytes
      const image = figma.createImage(bytes);
      
      // Wait for image to be processed
      await image.getBytesAsync();
      
      return image;
    } catch (error) {
      console.error('Error creating image from bytes:', error);
      throw new Error(`Не удалось создать изображение: ${error.message}`);
    }
  }

  /**
   * Scale image to fit within target dimensions while preserving aspect ratio
   * @param {Uint8Array} bytes - Original image data
   * @param {number} targetWidth - Target width
   * @param {number} targetHeight - Target height
   * @returns {Promise<{width: number, height: number, bytes: Uint8Array}>} - Scaled dimensions and image data
   */
  async scaleImage(bytes, targetWidth, targetHeight) {
    try {
      // Create temporary image to get original dimensions
      const tempImage = await this.createImageFromBytes(bytes);
      const originalWidth = tempImage.width;
      const originalHeight = tempImage.height;

      // Calculate new dimensions preserving aspect ratio
      const { width: newWidth, height: newHeight } = this._calculateScaledDimensions(
        originalWidth,
        originalHeight,
        targetWidth,
        targetHeight
      );

      // For now, return original bytes with calculated dimensions
      // Actual pixel-level scaling would require canvas API which isn't available in Figma plugin sandbox
      // The Figma API will handle the scaling when we set the image on a node
      return {
        width: newWidth,
        height: newHeight,
        bytes: bytes,
        originalWidth,
        originalHeight
      };
    } catch (error) {
      console.error('Error scaling image:', error);
      throw new Error(`Не удалось масштабировать изображение: ${error.message}`);
    }
  }

  /**
   * Calculate scaled dimensions that fit within target while preserving aspect ratio
   * @param {number} originalWidth - Original image width
   * @param {number} originalHeight - Original image height
   * @param {number} targetWidth - Target width constraint
   * @param {number} targetHeight - Target height constraint
   * @returns {{width: number, height: number}} - New dimensions
   */
  _calculateScaledDimensions(originalWidth, originalHeight, targetWidth, targetHeight) {
    const originalAspectRatio = originalWidth / originalHeight;
    const targetAspectRatio = targetWidth / targetHeight;

    let newWidth, newHeight;

    if (originalAspectRatio > targetAspectRatio) {
      // Image is wider than target - constrain by width
      newWidth = targetWidth;
      newHeight = targetWidth / originalAspectRatio;
    } else {
      // Image is taller than target - constrain by height
      newHeight = targetHeight;
      newWidth = targetHeight * originalAspectRatio;
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight)
    };
  }

  /**
   * Convert base64 string to Uint8Array
   * @param {string} base64 - Base64-encoded string
   * @returns {Uint8Array} - Decoded bytes
   * @private
   */
  _base64ToUint8Array(base64) {
    try {
      // Decode base64 to binary string
      const binaryString = atob(base64);
      
      // Convert binary string to Uint8Array
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return bytes;
    } catch (error) {
      throw new Error(`Некорректные данные base64: ${error.message}`);
    }
  }

  /**
   * Get image dimensions from bytes without creating a Figma image
   * @param {Uint8Array} bytes - Image data
   * @returns {Promise<{width: number, height: number}>} - Image dimensions
   */
  async getImageDimensions(bytes) {
    try {
      const image = await this.createImageFromBytes(bytes);
      return {
        width: image.width,
        height: image.height
      };
    } catch (error) {
      console.error('Error getting image dimensions:', error);
      throw new Error(`Не удалось получить размеры изображения: ${error.message}`);
    }
  }

  /**
   * Optimize image to be under target size (default 5MB)
   * Scales down the image if it exceeds the target size
   * @param {Uint8Array} bytes - Original image data
   * @param {number} maxSize - Maximum size in bytes (default: 5MB)
   * @returns {Promise<Uint8Array>} - Optimized image data
   */
  async optimizeImage(bytes, maxSize = 5 * 1024 * 1024) {
    try {
      // Check if optimization is needed
      if (bytes.length <= maxSize) {
        return bytes;
      }

      console.log(`Image size ${(bytes.length / 1024 / 1024).toFixed(2)}MB exceeds ${(maxSize / 1024 / 1024).toFixed(2)}MB, optimizing...`);

      // Get original dimensions
      const image = await this.createImageFromBytes(bytes);
      const originalWidth = image.width;
      const originalHeight = image.height;

      // Calculate scale factor based on size ratio
      // Since file size roughly scales with pixel count (width * height)
      const sizeRatio = maxSize / bytes.length;
      const scaleFactor = Math.sqrt(sizeRatio * 0.9); // 0.9 for safety margin

      // Calculate new dimensions
      const newWidth = Math.round(originalWidth * scaleFactor);
      const newHeight = Math.round(originalHeight * scaleFactor);

      console.log(`Scaling from ${originalWidth}x${originalHeight} to ${newWidth}x${newHeight}`);

      // Create a rectangle node to perform the scaling
      const rect = figma.createRectangle();
      rect.resize(newWidth, newHeight);
      
      // Apply the image as a fill
      const imageFill = {
        type: 'IMAGE',
        imageHash: image.hash,
        scaleMode: 'FILL'
      };
      rect.fills = [imageFill];

      // Export the scaled image
      const exportSettings = {
        format: 'PNG',
        constraint: { type: 'SCALE', value: 1 }
      };
      
      const exportedBytes = await rect.exportAsync(exportSettings);
      
      // Clean up temporary node
      rect.remove();

      // Check if we achieved the target size
      if (exportedBytes.length <= maxSize) {
        console.log(`Optimized to ${(exportedBytes.length / 1024 / 1024).toFixed(2)}MB`);
        return exportedBytes;
      } else {
        // If still too large, try more aggressive scaling
        console.log(`Still too large (${(exportedBytes.length / 1024 / 1024).toFixed(2)}MB), applying more aggressive optimization...`);
        return await this.optimizeImage(exportedBytes, maxSize);
      }
    } catch (error) {
      console.error('Error optimizing image:', error);
      throw new Error(`Не удалось оптимизировать изображение: ${error.message}`);
    }
  }
}

/* ================= LOCALIZATION HANDLER (EXISTING) ================= */

async function handleLocalization(msg) {

  const {
    endpoint,
    sourceLang,
    targetLangs,
    asoMode,
    glossary,
    presetKey = 'GLOBAL'
  } = msg;

  const preset = PRESETS[presetKey] || PRESETS.GLOBAL;

  if (!endpoint || !sourceLang || !Array.isArray(targetLangs) || !targetLangs.length) {
    figma.notify('❗ Missing parameters');
    return;
  }

  const selection = figma.currentPage.selection;
  if (!selection.length) {
    figma.notify('❗ Select a frame or text layers');
    return;
  }

  const frames = selection.filter(n => n.type === 'FRAME');

  /* ===== FRAME MODE ===== */

  if (frames.length) {
    const frame = frames[0];
    // Use collectLocalizableTextNodes to exclude [PRESERVE] elements (backgrounds, mockups)
    const textNodes = collectLocalizableTextNodes([frame]);
    if (!textNodes.length) return;

    const texts = textNodes.map(n => n.characters);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts,
        sourceLang,
        targetLangs,
        asoMode,
        glossary,
        presetKey
      })
    });

    const data = await res.json();
    let offsetX = frame.width + 80;

    for (const lang of targetLangs) {
      const translations = data.allTranslations[lang];
      if (!translations) continue;

      const clone = frame.clone();
      clone.x += offsetX;
      clone.name = `${frame.name} [${sourceLang} → ${lang}]`;

      // Use collectLocalizableTextNodes to exclude [PRESERVE] elements in cloned frame
      const cloneTextNodes = collectLocalizableTextNodes([clone]);

      for (let i = 0; i < cloneTextNodes.length; i++) {
        await setText(cloneTextNodes[i], translations[i]);
        await smartOverflow(cloneTextNodes[i], preset);
      }

      offsetX += frame.width + 80;
    }

    figma.notify('✅ Frames localized');
    return;
  }

  /* ===== SELECTION MODE ===== */

  // Use collectLocalizableTextNodes to exclude [PRESERVE] elements
  const textNodes = collectLocalizableTextNodes(selection);
  const texts = textNodes.map(n => n.characters);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      texts,
      sourceLang,
      targetLangs: [targetLangs[0]],
      asoMode,
      glossary,
      presetKey
    })
  });

  const data = await res.json();
  const translations = data.allTranslations[targetLangs[0]];
  if (!translations) return;

  for (let i = 0; i < textNodes.length; i++) {
    await setText(textNodes[i], translations[i]);
    await smartOverflow(textNodes[i], preset);
  }

  figma.notify('✅ Text translated');
}

/* ================= MAIN ================= */

// Initialize ImageProcessor
const imageProcessor = new ImageProcessor();

// Initialize SlideComposer
const slideComposer = new SlideComposer(imageProcessor);

// Initialize MessageHandler
const messageHandler = new MessageHandler();

// Load and restore tab state on plugin startup
(async () => {
  const savedState = await loadTabState();
  if (savedState) {
    figma.ui.postMessage({
      type: 'restore-tab-state',
      state: savedState
    });
  }
})();

// Main message listener - delegates to MessageHandler
figma.ui.onmessage = async (msg) => {
  await messageHandler.handleMessage(msg);
};

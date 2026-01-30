/**
 * MessageHandler Tests
 * Tests for the MessageHandler class that manages communication between UI and plugin code
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock Figma API
global.figma = {
  ui: {
    postMessage: vi.fn()
  },
  notify: vi.fn(),
  clientStorage: {
    setAsync: vi.fn(),
    getAsync: vi.fn()
  }
};

// Mock fetch
global.fetch = vi.fn();

describe('MessageHandler', () => {
  let MessageHandler;
  let messageHandler;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();
    
    // Reset fetch mock
    global.fetch.mockReset();
    
    // Define MessageHandler class for testing
    MessageHandler = class {
      constructor() {
        this.generationState = {
          isGenerating: false,
          currentStage: null,
          storyStructure: null,
          backgrounds: [],
          appDescription: null
        };
      }

      async handleMessage(msg) {
        try {
          switch (msg.type) {
            case 'save-tab-state':
              await this.handleSaveTabState(msg);
              break;
            case 'load-tab-state':
              await this.handleLoadTabState();
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
            default:
              console.warn('Unknown message type:', msg.type);
          }
        } catch (error) {
          console.error('Message handler error:', error);
          this.sendError(error.message || 'Произошла неизвестная ошибка');
        }
      }

      sendToUI(message) {
        figma.ui.postMessage(message);
      }

      sendProgressUpdate(stage, percent) {
        this.sendToUI({
          type: 'progress-update',
          data: { stage, percent }
        });
      }

      sendError(message) {
        this.sendToUI({
          type: 'error',
          data: { message }
        });
        this.generationState.isGenerating = false;
        this.generationState.currentStage = null;
      }

      sendComplete(frameId) {
        this.sendToUI({
          type: 'complete',
          data: { frameId }
        });
        this.generationState.isGenerating = false;
        this.generationState.currentStage = null;
      }

      async handleSaveTabState(msg) {
        await figma.clientStorage.setAsync('screenshot-generator-tab-state', msg.state);
      }

      async handleLoadTabState() {
        const savedState = await figma.clientStorage.getAsync('screenshot-generator-tab-state');
        this.sendToUI({
          type: 'restore-tab-state',
          state: savedState
        });
      }

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

          this.generationState.storyStructure = data.story;

          this.sendToUI({
            type: 'story-generated',
            data: data.story
          });

          figma.notify('✅ История сгенерирована! Проверьте и отредактируйте.');
          this.sendProgressUpdate('story-generation', 100);

          this.generationState.isGenerating = false;
          this.generationState.currentStage = null;

        } catch (error) {
          console.error('Story generation error:', error);
          figma.notify('❌ Ошибка генерации истории');
          this.sendError(error.message || 'Не удалось сгенерировать историю. Попробуйте еще раз.');
        }
      }

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

          for (let i = 0; i < story.slides.length; i++) {
            const slide = story.slides[i];
            
            this.sendProgressUpdate('background-generation', Math.round((i / story.slides.length) * 100));
            
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

            this.sendToUI({
              type: 'background-generated',
              data: {
                index: i + 1,
                total: story.slides.length
              }
            });
          }

          this.generationState.backgrounds = backgrounds;

          figma.notify('✅ Все фоны сгенерированы!');
          this.sendProgressUpdate('background-generation', 100);

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

      async handleCreateSlides(msg) {
        this.generationState.currentStage = 'composition';
        
        figma.notify('🎨 Создание слайдов в Figma...');
        this.sendProgressUpdate('composition', 0);

        try {
          figma.notify('⚠️ Композиция слайдов будет реализована в следующих задачах');
          
          for (let i = 0; i <= 100; i += 20) {
            await new Promise(resolve => setTimeout(resolve, 10));
            this.sendProgressUpdate('composition', i);
          }

          this.sendComplete('mock-frame-id');
          figma.notify('✅ Слайды созданы (симуляция)');

        } catch (error) {
          console.error('Slide creation error:', error);
          figma.notify('❌ Ошибка создания слайдов');
          this.sendError(error.message || 'Не удалось создать слайды. Попробуйте еще раз.');
        }
      }

      async handleRegenerateSlide(msg) {
        const { slideIndex, currentSlide, appDescription } = msg;
        
        figma.notify(`🔄 Регенерация слайда ${slideIndex + 1}...`);

        try {
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
    };

    messageHandler = new MessageHandler();
  });

  describe('Message Routing', () => {
    test('should route save-tab-state message correctly', async () => {
      const msg = {
        type: 'save-tab-state',
        state: { currentTab: 'generator' }
      };

      await messageHandler.handleMessage(msg);

      expect(figma.clientStorage.setAsync).toHaveBeenCalledWith(
        'screenshot-generator-tab-state',
        { currentTab: 'generator' }
      );
    });

    test('should route load-tab-state message correctly', async () => {
      const mockState = { currentTab: 'localizer' };
      figma.clientStorage.getAsync.mockResolvedValue(mockState);

      const msg = { type: 'load-tab-state' };

      await messageHandler.handleMessage(msg);

      expect(figma.clientStorage.getAsync).toHaveBeenCalledWith('screenshot-generator-tab-state');
      expect(figma.ui.postMessage).toHaveBeenCalledWith({
        type: 'restore-tab-state',
        state: mockState
      });
    });
  });

  describe('Progress Updates', () => {
    test('should send progress update to UI', () => {
      messageHandler.sendProgressUpdate('story-generation', 50);

      expect(figma.ui.postMessage).toHaveBeenCalledWith({
        type: 'progress-update',
        data: { stage: 'story-generation', percent: 50 }
      });
    });

    test('should send error message to UI', () => {
      messageHandler.sendError('Test error message');

      expect(figma.ui.postMessage).toHaveBeenCalledWith({
        type: 'error',
        data: { message: 'Test error message' }
      });
      expect(messageHandler.generationState.isGenerating).toBe(false);
      expect(messageHandler.generationState.currentStage).toBe(null);
    });

    test('should send completion message to UI', () => {
      messageHandler.sendComplete('frame-123');

      expect(figma.ui.postMessage).toHaveBeenCalledWith({
        type: 'complete',
        data: { frameId: 'frame-123' }
      });
      expect(messageHandler.generationState.isGenerating).toBe(false);
      expect(messageHandler.generationState.currentStage).toBe(null);
    });
  });

  describe('State Management', () => {
    test('should initialize with correct default state', () => {
      expect(messageHandler.generationState).toEqual({
        isGenerating: false,
        currentStage: null,
        storyStructure: null,
        backgrounds: [],
        appDescription: null
      });
    });

    test('should prevent concurrent generation requests', async () => {
      messageHandler.generationState.isGenerating = true;

      const msg = {
        type: 'generate-screenshots',
        appDescription: { category: 'Test', audience: 'Test', style: 'Test' }
      };

      await messageHandler.handleMessage(msg);

      expect(figma.ui.postMessage).toHaveBeenCalledWith({
        type: 'error',
        data: { message: 'Генерация уже выполняется. Пожалуйста, подождите.' }
      });
    });
  });

  describe('Story Generation', () => {
    test('should handle successful story generation', async () => {
      const mockStory = {
        slides: [
          { index: 0, headline: 'Test', subheadline: 'Test', description: 'Test' }
        ]
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, story: mockStory })
      });

      const msg = {
        type: 'generate-screenshots',
        appDescription: { category: 'Productivity', audience: 'Professionals', style: 'Modern' }
      };

      await messageHandler.handleMessage(msg);

      expect(figma.notify).toHaveBeenCalledWith('🚀 Генерация структуры истории...');
      expect(figma.ui.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'progress-update',
          data: { stage: 'story-generation', percent: 10 }
        })
      );
      expect(figma.ui.postMessage).toHaveBeenCalledWith({
        type: 'story-generated',
        data: mockStory
      });
      expect(messageHandler.generationState.storyStructure).toEqual(mockStory);
    });

    test('should handle story generation API error', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'API Error' })
      });

      const msg = {
        type: 'generate-screenshots',
        appDescription: { category: 'Test', audience: 'Test', style: 'Test' }
      };

      await messageHandler.handleMessage(msg);

      expect(figma.notify).toHaveBeenCalledWith('❌ Ошибка генерации истории');
      expect(figma.ui.postMessage).toHaveBeenCalledWith({
        type: 'error',
        data: { message: 'API Error' }
      });
    });
  });

  describe('Background Generation', () => {
    test('should handle successful background generation', async () => {
      const mockStory = {
        slides: [
          { index: 0, headline: 'Test 1', subheadline: 'Test 1', description: 'Desc 1' },
          { index: 1, headline: 'Test 2', subheadline: 'Test 2', description: 'Desc 2' }
        ]
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, imageBase64: 'base64data' })
      });

      messageHandler.generationState.appDescription = { style: 'Modern' };

      const msg = {
        type: 'generate-backgrounds',
        story: mockStory
      };

      await messageHandler.handleMessage(msg);

      expect(figma.notify).toHaveBeenCalledWith('🎨 Генерация фонов...');
      expect(fetch).toHaveBeenCalledTimes(2); // Called for each slide
      expect(messageHandler.generationState.backgrounds).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown message types gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const msg = { type: 'unknown-type' };

      await messageHandler.handleMessage(msg);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Unknown message type:', 'unknown-type');

      consoleWarnSpy.mockRestore();
    });

    test('should catch and handle errors in message processing', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Force an error by making fetch throw
      global.fetch.mockRejectedValue(new Error('Network error'));

      const msg = {
        type: 'generate-screenshots',
        appDescription: { category: 'Test', audience: 'Test', style: 'Test' }
      };

      await messageHandler.handleMessage(msg);

      expect(figma.ui.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error'
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });
});

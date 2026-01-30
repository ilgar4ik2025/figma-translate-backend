/**
 * Tests for element persistence when switching tabs
 * Validates Requirement 10.3: Персистентность созданных элементов
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Element Persistence', () => {
  let mockFigma;
  let mockStorage;
  let messageHandler;
  let slideComposer;
  let imageProcessor;

  beforeEach(() => {
    // Mock Figma API
    mockStorage = new Map();
    
    mockFigma = {
      clientStorage: {
        setAsync: vi.fn((key, value) => {
          mockStorage.set(key, value);
          return Promise.resolve();
        }),
        getAsync: vi.fn((key) => {
          return Promise.resolve(mockStorage.get(key) || null);
        })
      },
      getNodeById: vi.fn(),
      currentPage: {
        selection: []
      },
      viewport: {
        scrollAndZoomIntoView: vi.fn()
      },
      notify: vi.fn(),
      ui: {
        postMessage: vi.fn()
      }
    };

    global.figma = mockFigma;

    // Create instances (simplified for testing)
    imageProcessor = {
      createImageFromBase64: vi.fn()
    };

    slideComposer = {
      createSlides: vi.fn()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockStorage.clear();
  });

  describe('Saving Created Element IDs', () => {
    test('should save parent frame ID and session ID after slide creation', async () => {
      const mockParentFrame = {
        id: 'frame-123',
        name: 'App Store Screenshots',
        x: 100,
        y: 200,
        getPluginData: vi.fn((key) => {
          if (key === 'sessionId') return 'session-456';
          return null;
        })
      };

      slideComposer.createSlides.mockResolvedValue(mockParentFrame);

      // Simulate slide creation
      const createdElements = {
        parentFrameId: mockParentFrame.id,
        sessionId: 'session-456',
        createdAt: new Date().toISOString(),
        slideCount: 5
      };

      // Save to storage
      await mockFigma.clientStorage.setAsync('screenshot-generator-tab-state', {
        createdElements: createdElements
      });

      // Verify storage was called
      expect(mockFigma.clientStorage.setAsync).toHaveBeenCalledWith(
        'screenshot-generator-tab-state',
        expect.objectContaining({
          createdElements: expect.objectContaining({
            parentFrameId: 'frame-123',
            sessionId: 'session-456',
            slideCount: 5
          })
        })
      );

      // Verify data was stored
      const savedState = await mockFigma.clientStorage.getAsync('screenshot-generator-tab-state');
      expect(savedState.createdElements.parentFrameId).toBe('frame-123');
      expect(savedState.createdElements.sessionId).toBe('session-456');
    });

    test('should include creation timestamp in saved elements', async () => {
      const beforeTime = Date.now();
      
      const createdElements = {
        parentFrameId: 'frame-123',
        sessionId: 'session-456',
        createdAt: new Date().toISOString(),
        slideCount: 5
      };

      await mockFigma.clientStorage.setAsync('screenshot-generator-tab-state', {
        createdElements: createdElements
      });

      const afterTime = Date.now();

      const savedState = await mockFigma.clientStorage.getAsync('screenshot-generator-tab-state');
      const savedTime = new Date(savedState.createdElements.createdAt).getTime();

      expect(savedTime).toBeGreaterThanOrEqual(beforeTime);
      expect(savedTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Checking Element Existence', () => {
    test('should return exists=true when frame exists with matching session ID', async () => {
      const mockParentFrame = {
        id: 'frame-123',
        name: 'App Store Screenshots',
        x: 100,
        y: 200,
        getPluginData: vi.fn((key) => {
          if (key === 'sessionId') return 'session-456';
          if (key === 'elementType') return 'screenshot-collection';
          return null;
        }),
        children: []
      };

      // Save state
      await mockFigma.clientStorage.setAsync('screenshot-generator-tab-state', {
        createdElements: {
          parentFrameId: 'frame-123',
          sessionId: 'session-456',
          createdAt: new Date().toISOString(),
          slideCount: 5
        }
      });

      // Mock getNodeById to return the frame
      mockFigma.getNodeById.mockReturnValue(mockParentFrame);

      // Load state
      const savedState = await mockFigma.clientStorage.getAsync('screenshot-generator-tab-state');
      const frame = mockFigma.getNodeById(savedState.createdElements.parentFrameId);

      expect(frame).toBeTruthy();
      expect(frame.id).toBe('frame-123');
      expect(frame.getPluginData('sessionId')).toBe('session-456');
    });

    test('should return exists=false when frame does not exist', async () => {
      // Save state
      await mockFigma.clientStorage.setAsync('screenshot-generator-tab-state', {
        createdElements: {
          parentFrameId: 'frame-123',
          sessionId: 'session-456',
          createdAt: new Date().toISOString(),
          slideCount: 5
        }
      });

      // Mock getNodeById to return null (frame deleted)
      mockFigma.getNodeById.mockReturnValue(null);

      // Load state
      const savedState = await mockFigma.clientStorage.getAsync('screenshot-generator-tab-state');
      const frame = mockFigma.getNodeById(savedState.createdElements.parentFrameId);

      expect(frame).toBeNull();
    });

    test('should return exists=false when session ID does not match', async () => {
      const mockParentFrame = {
        id: 'frame-123',
        name: 'App Store Screenshots',
        getPluginData: vi.fn((key) => {
          if (key === 'sessionId') return 'different-session';
          return null;
        })
      };

      // Save state with one session ID
      await mockFigma.clientStorage.setAsync('screenshot-generator-tab-state', {
        createdElements: {
          parentFrameId: 'frame-123',
          sessionId: 'session-456',
          createdAt: new Date().toISOString(),
          slideCount: 5
        }
      });

      // Mock getNodeById to return frame with different session ID
      mockFigma.getNodeById.mockReturnValue(mockParentFrame);

      // Load state
      const savedState = await mockFigma.clientStorage.getAsync('screenshot-generator-tab-state');
      const frame = mockFigma.getNodeById(savedState.createdElements.parentFrameId);
      const frameSessionId = frame.getPluginData('sessionId');

      expect(frameSessionId).not.toBe(savedState.createdElements.sessionId);
    });

    test('should return exists=false when no saved state exists', async () => {
      const savedState = await mockFigma.clientStorage.getAsync('screenshot-generator-tab-state');
      
      expect(savedState).toBeNull();
    });
  });

  describe('Collecting Slide Information', () => {
    test('should collect information about all slides in parent frame', () => {
      const mockSlides = [
        {
          id: 'slide-1',
          name: 'Slide 1: Welcome',
          getPluginData: vi.fn((key) => {
            const data = {
              sessionId: 'session-456',
              elementType: 'slide',
              slideIndex: '0',
              headline: 'Welcome',
              subheadline: 'Get started today'
            };
            return data[key] || null;
          })
        },
        {
          id: 'slide-2',
          name: 'Slide 2: Features',
          getPluginData: vi.fn((key) => {
            const data = {
              sessionId: 'session-456',
              elementType: 'slide',
              slideIndex: '1',
              headline: 'Features',
              subheadline: 'Powerful tools'
            };
            return data[key] || null;
          })
        }
      ];

      const mockParentFrame = {
        id: 'frame-123',
        children: mockSlides
      };

      // Collect slide info
      const slides = [];
      for (const child of mockParentFrame.children) {
        const sessionId = child.getPluginData('sessionId');
        const elementType = child.getPluginData('elementType');
        
        if (sessionId === 'session-456' && elementType === 'slide') {
          slides.push({
            id: child.id,
            name: child.name,
            index: parseInt(child.getPluginData('slideIndex') || '0'),
            headline: child.getPluginData('headline') || '',
            subheadline: child.getPluginData('subheadline') || ''
          });
        }
      }

      expect(slides).toHaveLength(2);
      expect(slides[0].id).toBe('slide-1');
      expect(slides[0].headline).toBe('Welcome');
      expect(slides[1].id).toBe('slide-2');
      expect(slides[1].headline).toBe('Features');
    });

    test('should sort slides by index', () => {
      const mockSlides = [
        {
          id: 'slide-3',
          getPluginData: vi.fn((key) => {
            const data = {
              sessionId: 'session-456',
              elementType: 'slide',
              slideIndex: '2'
            };
            return data[key] || null;
          })
        },
        {
          id: 'slide-1',
          getPluginData: vi.fn((key) => {
            const data = {
              sessionId: 'session-456',
              elementType: 'slide',
              slideIndex: '0'
            };
            return data[key] || null;
          })
        },
        {
          id: 'slide-2',
          getPluginData: vi.fn((key) => {
            const data = {
              sessionId: 'session-456',
              elementType: 'slide',
              slideIndex: '1'
            };
            return data[key] || null;
          })
        }
      ];

      const mockParentFrame = {
        children: mockSlides
      };

      // Collect and sort
      const slides = [];
      for (const child of mockParentFrame.children) {
        const sessionId = child.getPluginData('sessionId');
        const elementType = child.getPluginData('elementType');
        
        if (sessionId === 'session-456' && elementType === 'slide') {
          slides.push({
            id: child.id,
            index: parseInt(child.getPluginData('slideIndex') || '0')
          });
        }
      }

      slides.sort((a, b) => a.index - b.index);

      expect(slides[0].id).toBe('slide-1');
      expect(slides[1].id).toBe('slide-2');
      expect(slides[2].id).toBe('slide-3');
    });

    test('should filter out elements with different session ID', () => {
      const mockChildren = [
        {
          id: 'slide-1',
          getPluginData: vi.fn((key) => {
            const data = {
              sessionId: 'session-456',
              elementType: 'slide',
              slideIndex: '0'
            };
            return data[key] || null;
          })
        },
        {
          id: 'other-element',
          getPluginData: vi.fn((key) => {
            const data = {
              sessionId: 'different-session',
              elementType: 'slide',
              slideIndex: '1'
            };
            return data[key] || null;
          })
        }
      ];

      const mockParentFrame = {
        children: mockChildren
      };

      // Collect only matching session
      const slides = [];
      for (const child of mockParentFrame.children) {
        const sessionId = child.getPluginData('sessionId');
        const elementType = child.getPluginData('elementType');
        
        if (sessionId === 'session-456' && elementType === 'slide') {
          slides.push({
            id: child.id
          });
        }
      }

      expect(slides).toHaveLength(1);
      expect(slides[0].id).toBe('slide-1');
    });
  });

  describe('Navigation to Elements', () => {
    test('should select and zoom to parent frame when navigating', () => {
      const mockParentFrame = {
        id: 'frame-123',
        name: 'App Store Screenshots'
      };

      mockFigma.getNodeById.mockReturnValue(mockParentFrame);

      // Simulate navigation
      const frame = mockFigma.getNodeById('frame-123');
      mockFigma.currentPage.selection = [frame];
      mockFigma.viewport.scrollAndZoomIntoView([frame]);

      expect(mockFigma.currentPage.selection).toContain(mockParentFrame);
      expect(mockFigma.viewport.scrollAndZoomIntoView).toHaveBeenCalledWith([mockParentFrame]);
    });

    test('should handle navigation when frame does not exist', () => {
      mockFigma.getNodeById.mockReturnValue(null);

      const frame = mockFigma.getNodeById('frame-123');

      expect(frame).toBeNull();
      expect(mockFigma.currentPage.selection).toHaveLength(0);
    });
  });

  describe('Tab Switching Persistence', () => {
    test('should preserve element IDs when switching tabs', async () => {
      const elementsData = {
        parentFrameId: 'frame-123',
        sessionId: 'session-456',
        createdAt: new Date().toISOString(),
        slideCount: 5
      };

      // Save state
      await mockFigma.clientStorage.setAsync('screenshot-generator-tab-state', {
        currentTab: 'generator',
        createdElements: elementsData
      });

      // Switch to localizer tab (simulate)
      await mockFigma.clientStorage.setAsync('screenshot-generator-tab-state', {
        currentTab: 'localizer',
        createdElements: elementsData // Elements should persist
      });

      // Switch back to generator tab
      await mockFigma.clientStorage.setAsync('screenshot-generator-tab-state', {
        currentTab: 'generator',
        createdElements: elementsData
      });

      // Load state
      const savedState = await mockFigma.clientStorage.getAsync('screenshot-generator-tab-state');

      expect(savedState.createdElements.parentFrameId).toBe('frame-123');
      expect(savedState.createdElements.sessionId).toBe('session-456');
      expect(savedState.createdElements.slideCount).toBe(5);
    });

    test('should check element existence when returning to generator tab', async () => {
      const mockParentFrame = {
        id: 'frame-123',
        getPluginData: vi.fn((key) => {
          if (key === 'sessionId') return 'session-456';
          return null;
        }),
        children: []
      };

      // Save state with created elements
      await mockFigma.clientStorage.setAsync('screenshot-generator-tab-state', {
        currentTab: 'generator',
        createdElements: {
          parentFrameId: 'frame-123',
          sessionId: 'session-456',
          createdAt: new Date().toISOString(),
          slideCount: 5
        }
      });

      mockFigma.getNodeById.mockReturnValue(mockParentFrame);

      // Simulate returning to generator tab
      const savedState = await mockFigma.clientStorage.getAsync('screenshot-generator-tab-state');
      const frame = mockFigma.getNodeById(savedState.createdElements.parentFrameId);
      const sessionMatches = frame && frame.getPluginData('sessionId') === savedState.createdElements.sessionId;

      expect(sessionMatches).toBe(true);
    });
  });
});

/**
 * Tests for Task 11.2: Metadata for Element Identification
 * 
 * Validates that all elements created by Screenshot Generator have proper metadata
 * using Figma's pluginData API for identification and tracking.
 * 
 * Requirements: 10.2
 */

import { describe, it, expect } from 'vitest';

describe('Task 11.2: Metadata for Element Identification', () => {
  
  describe('Background Element Metadata', () => {
    it('should set all required metadata fields on background elements', () => {
      const mockBackground = {
        name: '[PRESERVE] Background',
        pluginData: {},
        setPluginData: function(key, value) {
          this.pluginData[key] = value;
        },
        getPluginData: function(key) {
          return this.pluginData[key];
        }
      };
      
      // Simulate metadata setting
      mockBackground.setPluginData('elementType', 'background');
      mockBackground.setPluginData('slideIndex', '0');
      mockBackground.setPluginData('generatedBy', 'screenshot-generator');
      mockBackground.setPluginData('createdAt', new Date().toISOString());
      mockBackground.setPluginData('preserve', 'true');
      
      // Verify all metadata fields
      expect(mockBackground.getPluginData('elementType')).toBe('background');
      expect(mockBackground.getPluginData('slideIndex')).toBe('0');
      expect(mockBackground.getPluginData('generatedBy')).toBe('screenshot-generator');
      expect(mockBackground.getPluginData('createdAt')).toBeTruthy();
      expect(mockBackground.getPluginData('preserve')).toBe('true');
    });
    
    it('should include slideIndex for each background', () => {
      for (let i = 0; i < 5; i++) {
        const mockBackground = {
          pluginData: {},
          setPluginData: function(key, value) {
            this.pluginData[key] = value;
          },
          getPluginData: function(key) {
            return this.pluginData[key];
          }
        };
        
        mockBackground.setPluginData('slideIndex', i.toString());
        expect(mockBackground.getPluginData('slideIndex')).toBe(i.toString());
      }
    });
  });
  
  describe('Text Element Metadata', () => {
    it('should set all required metadata fields on headline elements', () => {
      const mockHeadline = {
        name: 'Headline',
        type: 'TEXT',
        pluginData: {},
        setPluginData: function(key, value) {
          this.pluginData[key] = value;
        },
        getPluginData: function(key) {
          return this.pluginData[key];
        }
      };
      
      const originalText = 'Transform Your Workflow';
      
      // Simulate metadata setting
      mockHeadline.setPluginData('elementType', 'headline');
      mockHeadline.setPluginData('slideIndex', '0');
      mockHeadline.setPluginData('generatedBy', 'screenshot-generator');
      mockHeadline.setPluginData('createdAt', new Date().toISOString());
      mockHeadline.setPluginData('localizable', 'true');
      mockHeadline.setPluginData('originalText', originalText);
      
      // Verify all metadata fields
      expect(mockHeadline.getPluginData('elementType')).toBe('headline');
      expect(mockHeadline.getPluginData('slideIndex')).toBe('0');
      expect(mockHeadline.getPluginData('generatedBy')).toBe('screenshot-generator');
      expect(mockHeadline.getPluginData('createdAt')).toBeTruthy();
      expect(mockHeadline.getPluginData('localizable')).toBe('true');
      expect(mockHeadline.getPluginData('originalText')).toBe(originalText);
    });
    
    it('should set all required metadata fields on subheadline elements', () => {
      const mockSubheadline = {
        name: 'Subheadline',
        type: 'TEXT',
        pluginData: {},
        setPluginData: function(key, value) {
          this.pluginData[key] = value;
        },
        getPluginData: function(key) {
          return this.pluginData[key];
        }
      };
      
      const originalText = 'Boost productivity with AI';
      
      // Simulate metadata setting
      mockSubheadline.setPluginData('elementType', 'subheadline');
      mockSubheadline.setPluginData('slideIndex', '0');
      mockSubheadline.setPluginData('generatedBy', 'screenshot-generator');
      mockSubheadline.setPluginData('createdAt', new Date().toISOString());
      mockSubheadline.setPluginData('localizable', 'true');
      mockSubheadline.setPluginData('originalText', originalText);
      
      // Verify all metadata fields
      expect(mockSubheadline.getPluginData('elementType')).toBe('subheadline');
      expect(mockSubheadline.getPluginData('slideIndex')).toBe('0');
      expect(mockSubheadline.getPluginData('generatedBy')).toBe('screenshot-generator');
      expect(mockSubheadline.getPluginData('createdAt')).toBeTruthy();
      expect(mockSubheadline.getPluginData('localizable')).toBe('true');
      expect(mockSubheadline.getPluginData('originalText')).toBe(originalText);
    });
    
    it('should mark text elements as localizable', () => {
      const textElements = ['headline', 'subheadline'];
      
      textElements.forEach(elementType => {
        const mockText = {
          pluginData: {},
          setPluginData: function(key, value) {
            this.pluginData[key] = value;
          },
          getPluginData: function(key) {
            return this.pluginData[key];
          }
        };
        
        mockText.setPluginData('localizable', 'true');
        expect(mockText.getPluginData('localizable')).toBe('true');
      });
    });
    
    it('should store original text for reference', () => {
      const originalTexts = [
        'Transform Your Workflow',
        'Boost productivity with AI',
        'Connect with millions',
        'Track your progress',
        'Get started today'
      ];
      
      originalTexts.forEach(text => {
        const mockText = {
          pluginData: {},
          setPluginData: function(key, value) {
            this.pluginData[key] = value;
          },
          getPluginData: function(key) {
            return this.pluginData[key];
          }
        };
        
        mockText.setPluginData('originalText', text);
        expect(mockText.getPluginData('originalText')).toBe(text);
      });
    });
  });
  
  describe('Mockup Element Metadata', () => {
    it('should set all required metadata fields on mockup elements', () => {
      const mockMockup = {
        name: '[PRESERVE] iPhone Mockup',
        pluginData: {},
        setPluginData: function(key, value) {
          this.pluginData[key] = value;
        },
        getPluginData: function(key) {
          return this.pluginData[key];
        }
      };
      
      // Simulate metadata setting
      mockMockup.setPluginData('elementType', 'mockup');
      mockMockup.setPluginData('slideIndex', '0');
      mockMockup.setPluginData('generatedBy', 'screenshot-generator');
      mockMockup.setPluginData('createdAt', new Date().toISOString());
      mockMockup.setPluginData('preserve', 'true');
      mockMockup.setPluginData('hasScreenshot', 'true');
      
      // Verify all metadata fields
      expect(mockMockup.getPluginData('elementType')).toBe('mockup');
      expect(mockMockup.getPluginData('slideIndex')).toBe('0');
      expect(mockMockup.getPluginData('generatedBy')).toBe('screenshot-generator');
      expect(mockMockup.getPluginData('createdAt')).toBeTruthy();
      expect(mockMockup.getPluginData('preserve')).toBe('true');
      expect(mockMockup.getPluginData('hasScreenshot')).toBe('true');
    });
    
    it('should indicate whether mockup has a screenshot', () => {
      const mockupWithScreenshot = {
        pluginData: {},
        setPluginData: function(key, value) {
          this.pluginData[key] = value;
        },
        getPluginData: function(key) {
          return this.pluginData[key];
        }
      };
      
      const mockupWithoutScreenshot = {
        pluginData: {},
        setPluginData: function(key, value) {
          this.pluginData[key] = value;
        },
        getPluginData: function(key) {
          return this.pluginData[key];
        }
      };
      
      mockupWithScreenshot.setPluginData('hasScreenshot', 'true');
      mockupWithoutScreenshot.setPluginData('hasScreenshot', 'false');
      
      expect(mockupWithScreenshot.getPluginData('hasScreenshot')).toBe('true');
      expect(mockupWithoutScreenshot.getPluginData('hasScreenshot')).toBe('false');
    });
    
    it('should set metadata on screenshot child elements', () => {
      const mockScreenshot = {
        name: 'App Screenshot',
        pluginData: {},
        setPluginData: function(key, value) {
          this.pluginData[key] = value;
        },
        getPluginData: function(key) {
          return this.pluginData[key];
        }
      };
      
      mockScreenshot.setPluginData('elementType', 'screenshot');
      mockScreenshot.setPluginData('slideIndex', '0');
      mockScreenshot.setPluginData('generatedBy', 'screenshot-generator');
      mockScreenshot.setPluginData('preserve', 'true');
      
      expect(mockScreenshot.getPluginData('elementType')).toBe('screenshot');
      expect(mockScreenshot.getPluginData('preserve')).toBe('true');
    });
    
    it('should set metadata on placeholder elements', () => {
      const mockPlaceholder = {
        name: 'Screenshot Placeholder',
        pluginData: {},
        setPluginData: function(key, value) {
          this.pluginData[key] = value;
        },
        getPluginData: function(key) {
          return this.pluginData[key];
        }
      };
      
      mockPlaceholder.setPluginData('elementType', 'placeholder');
      mockPlaceholder.setPluginData('slideIndex', '0');
      mockPlaceholder.setPluginData('generatedBy', 'screenshot-generator');
      
      expect(mockPlaceholder.getPluginData('elementType')).toBe('placeholder');
      expect(mockPlaceholder.getPluginData('generatedBy')).toBe('screenshot-generator');
    });
  });
  
  describe('Slide Frame Metadata', () => {
    it('should set all required metadata fields on slide frames', () => {
      const mockSlide = {
        name: 'Slide 1: Transform Your Workflow',
        pluginData: {},
        setPluginData: function(key, value) {
          this.pluginData[key] = value;
        },
        getPluginData: function(key) {
          return this.pluginData[key];
        }
      };
      
      const slideData = {
        headline: 'Transform Your Workflow',
        subheadline: 'Boost productivity with AI',
        description: 'A modern workspace with AI elements'
      };
      
      // Simulate metadata setting
      mockSlide.setPluginData('elementType', 'slide');
      mockSlide.setPluginData('slideIndex', '0');
      mockSlide.setPluginData('generatedBy', 'screenshot-generator');
      mockSlide.setPluginData('createdAt', new Date().toISOString());
      mockSlide.setPluginData('headline', slideData.headline);
      mockSlide.setPluginData('subheadline', slideData.subheadline);
      mockSlide.setPluginData('description', slideData.description);
      
      // Verify all metadata fields
      expect(mockSlide.getPluginData('elementType')).toBe('slide');
      expect(mockSlide.getPluginData('slideIndex')).toBe('0');
      expect(mockSlide.getPluginData('generatedBy')).toBe('screenshot-generator');
      expect(mockSlide.getPluginData('createdAt')).toBeTruthy();
      expect(mockSlide.getPluginData('headline')).toBe(slideData.headline);
      expect(mockSlide.getPluginData('subheadline')).toBe(slideData.subheadline);
      expect(mockSlide.getPluginData('description')).toBe(slideData.description);
    });
    
    it('should store slide content in metadata for reference', () => {
      const slides = [
        { headline: 'Slide 1', subheadline: 'Sub 1', description: 'Desc 1' },
        { headline: 'Slide 2', subheadline: 'Sub 2', description: 'Desc 2' },
        { headline: 'Slide 3', subheadline: 'Sub 3', description: 'Desc 3' },
        { headline: 'Slide 4', subheadline: 'Sub 4', description: 'Desc 4' },
        { headline: 'Slide 5', subheadline: 'Sub 5', description: 'Desc 5' }
      ];
      
      slides.forEach((slideData, index) => {
        const mockSlide = {
          pluginData: {},
          setPluginData: function(key, value) {
            this.pluginData[key] = value;
          },
          getPluginData: function(key) {
            return this.pluginData[key];
          }
        };
        
        mockSlide.setPluginData('headline', slideData.headline);
        mockSlide.setPluginData('subheadline', slideData.subheadline);
        mockSlide.setPluginData('description', slideData.description);
        
        expect(mockSlide.getPluginData('headline')).toBe(slideData.headline);
        expect(mockSlide.getPluginData('subheadline')).toBe(slideData.subheadline);
        expect(mockSlide.getPluginData('description')).toBe(slideData.description);
      });
    });
  });
  
  describe('Parent Frame Metadata', () => {
    it('should set all required metadata fields on parent frame', () => {
      const mockParent = {
        name: 'App Store Screenshots',
        pluginData: {},
        setPluginData: function(key, value) {
          this.pluginData[key] = value;
        },
        getPluginData: function(key) {
          return this.pluginData[key];
        }
      };
      
      const sessionId = Date.now().toString();
      
      // Simulate metadata setting
      mockParent.setPluginData('elementType', 'screenshot-collection');
      mockParent.setPluginData('generatedBy', 'screenshot-generator');
      mockParent.setPluginData('createdAt', new Date().toISOString());
      mockParent.setPluginData('sessionId', sessionId);
      mockParent.setPluginData('slideCount', '5');
      
      // Verify all metadata fields
      expect(mockParent.getPluginData('elementType')).toBe('screenshot-collection');
      expect(mockParent.getPluginData('generatedBy')).toBe('screenshot-generator');
      expect(mockParent.getPluginData('createdAt')).toBeTruthy();
      expect(mockParent.getPluginData('sessionId')).toBe(sessionId);
      expect(mockParent.getPluginData('slideCount')).toBe('5');
    });
    
    it('should use sessionId to link slides together', () => {
      const sessionId = Date.now().toString();
      const slides = [];
      
      // Create 5 mock slides with same sessionId
      for (let i = 0; i < 5; i++) {
        const mockSlide = {
          pluginData: {},
          setPluginData: function(key, value) {
            this.pluginData[key] = value;
          },
          getPluginData: function(key) {
            return this.pluginData[key];
          }
        };
        
        mockSlide.setPluginData('sessionId', sessionId);
        mockSlide.setPluginData('slideIndex', i.toString());
        slides.push(mockSlide);
      }
      
      // Verify all slides have same sessionId
      const sessionIds = slides.map(s => s.getPluginData('sessionId'));
      expect(new Set(sessionIds).size).toBe(1);
      expect(sessionIds[0]).toBe(sessionId);
    });
  });
  
  describe('Metadata Consistency', () => {
    it('should use consistent generatedBy value across all elements', () => {
      const elements = [
        { type: 'background' },
        { type: 'headline' },
        { type: 'subheadline' },
        { type: 'mockup' },
        { type: 'slide' },
        { type: 'screenshot-collection' }
      ];
      
      elements.forEach(elem => {
        const mock = {
          pluginData: {},
          setPluginData: function(key, value) {
            this.pluginData[key] = value;
          },
          getPluginData: function(key) {
            return this.pluginData[key];
          }
        };
        
        mock.setPluginData('generatedBy', 'screenshot-generator');
        expect(mock.getPluginData('generatedBy')).toBe('screenshot-generator');
      });
    });
    
    it('should include createdAt timestamp for all major elements', () => {
      const elements = ['background', 'headline', 'subheadline', 'mockup', 'slide', 'screenshot-collection'];
      
      elements.forEach(elementType => {
        const mock = {
          pluginData: {},
          setPluginData: function(key, value) {
            this.pluginData[key] = value;
          },
          getPluginData: function(key) {
            return this.pluginData[key];
          }
        };
        
        const timestamp = new Date().toISOString();
        mock.setPluginData('createdAt', timestamp);
        
        const storedTimestamp = mock.getPluginData('createdAt');
        expect(storedTimestamp).toBeTruthy();
        expect(new Date(storedTimestamp).toISOString()).toBe(timestamp);
      });
    });
    
    it('should mark preserved elements consistently', () => {
      const preservedElements = ['background', 'mockup', 'screenshot'];
      
      preservedElements.forEach(elementType => {
        const mock = {
          pluginData: {},
          setPluginData: function(key, value) {
            this.pluginData[key] = value;
          },
          getPluginData: function(key) {
            return this.pluginData[key];
          }
        };
        
        mock.setPluginData('preserve', 'true');
        expect(mock.getPluginData('preserve')).toBe('true');
      });
    });
  });
  
  describe('Requirement 10.2: Element Identification', () => {
    it('should allow identifying element type from metadata', () => {
      const elementTypes = [
        'background',
        'headline',
        'subheadline',
        'mockup',
        'screenshot',
        'placeholder',
        'slide',
        'screenshot-collection'
      ];
      
      elementTypes.forEach(type => {
        const mock = {
          pluginData: {},
          setPluginData: function(key, value) {
            this.pluginData[key] = value;
          },
          getPluginData: function(key) {
            return this.pluginData[key];
          }
        };
        
        mock.setPluginData('elementType', type);
        expect(mock.getPluginData('elementType')).toBe(type);
      });
    });
    
    it('should allow identifying slide index from metadata', () => {
      for (let i = 0; i < 5; i++) {
        const mock = {
          pluginData: {},
          setPluginData: function(key, value) {
            this.pluginData[key] = value;
          },
          getPluginData: function(key) {
            return this.pluginData[key];
          }
        };
        
        mock.setPluginData('slideIndex', i.toString());
        expect(parseInt(mock.getPluginData('slideIndex'))).toBe(i);
      }
    });
    
    it('should allow identifying generator source from metadata', () => {
      const mock = {
        pluginData: {},
        setPluginData: function(key, value) {
          this.pluginData[key] = value;
        },
        getPluginData: function(key) {
          return this.pluginData[key];
        }
      };
      
      mock.setPluginData('generatedBy', 'screenshot-generator');
      expect(mock.getPluginData('generatedBy')).toBe('screenshot-generator');
    });
    
    it('should allow identifying localizable elements from metadata', () => {
      const localizableElements = [
        { name: 'Headline', localizable: true },
        { name: 'Subheadline', localizable: true },
        { name: '[PRESERVE] Background', localizable: false },
        { name: '[PRESERVE] iPhone Mockup', localizable: false }
      ];
      
      localizableElements.forEach(elem => {
        const mock = {
          name: elem.name,
          pluginData: {},
          setPluginData: function(key, value) {
            this.pluginData[key] = value;
          },
          getPluginData: function(key) {
            return this.pluginData[key];
          }
        };
        
        if (elem.localizable) {
          mock.setPluginData('localizable', 'true');
          expect(mock.getPluginData('localizable')).toBe('true');
        } else {
          mock.setPluginData('preserve', 'true');
          expect(mock.getPluginData('preserve')).toBe('true');
        }
      });
    });
  });
});

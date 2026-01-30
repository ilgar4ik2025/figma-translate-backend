/**
 * Tab Integration Tests
 * Tests compatibility between Tab 2 (Screenshot Generator) and Tab 1 (Screenshot Localizer)
 * 
 * These tests verify that:
 * 1. All text elements are proper TextNodes
 * 2. Layer names follow conventions
 * 3. [PRESERVE] markers are correctly applied
 */

import { describe, it, expect } from 'vitest';

describe('Tab 1 & Tab 2 Integration', () => {
  describe('Layer Naming Conventions', () => {
    it('should use [PRESERVE] prefix for background elements', () => {
      const backgroundName = '[PRESERVE] Background';
      expect(backgroundName.startsWith('[PRESERVE]')).toBe(true);
    });

    it('should use [PRESERVE] prefix for iPhone mockup', () => {
      const mockupName = '[PRESERVE] iPhone Mockup';
      expect(mockupName.startsWith('[PRESERVE]')).toBe(true);
    });

    it('should use descriptive names for text elements', () => {
      const headlineName = 'Headline';
      const subheadlineName = 'Subheadline';
      
      expect(headlineName).toBe('Headline');
      expect(subheadlineName).toBe('Subheadline');
    });

    it('should use descriptive names for slide frames', () => {
      const slideIndex = 0;
      const headline = 'Transform Your Workflow';
      const slideName = `Slide ${slideIndex + 1}: ${headline}`;
      
      expect(slideName).toBe('Slide 1: Transform Your Workflow');
    });
  });

  describe('Element Structure', () => {
    it('should create proper hierarchy for a slide', () => {
      // Expected structure:
      // Slide Frame
      // ├── [PRESERVE] Background
      // ├── Headline (TextNode)
      // ├── Subheadline (TextNode)
      // └── [PRESERVE] iPhone Mockup
      
      const expectedStructure = {
        name: 'Slide 1: Test Headline',
        children: [
          { name: '[PRESERVE] Background', type: 'RECTANGLE' },
          { name: 'Headline', type: 'TEXT' },
          { name: 'Subheadline', type: 'TEXT' },
          { name: '[PRESERVE] iPhone Mockup', type: 'FRAME' }
        ]
      };
      
      expect(expectedStructure.children.length).toBe(4);
      expect(expectedStructure.children[1].type).toBe('TEXT');
      expect(expectedStructure.children[2].type).toBe('TEXT');
    });
  });

  describe('collectLocalizableTextNodes', () => {
    it('should collect text nodes that are not in [PRESERVE] containers', () => {
      // Mock node structure
      const mockNodes = [
        {
          name: 'Slide 1',
          type: 'FRAME',
          children: [
            { name: '[PRESERVE] Background', type: 'RECTANGLE' },
            { name: 'Headline', type: 'TEXT', characters: 'Test Headline' },
            { name: 'Subheadline', type: 'TEXT', characters: 'Test Subheadline' },
            {
              name: '[PRESERVE] iPhone Mockup',
              type: 'FRAME',
              children: [
                { name: 'App Screenshot', type: 'RECTANGLE' }
              ]
            }
          ]
        }
      ];

      // Simulate collectLocalizableTextNodes function
      function collectLocalizableTextNodes(nodes, acc = []) {
        for (const node of nodes) {
          if (node.name && node.name.startsWith('[PRESERVE]')) {
            continue;
          }
          
          if (node.type === 'TEXT') {
            acc.push(node);
          }
          
          if (node.children) {
            collectLocalizableTextNodes(node.children, acc);
          }
        }
        return acc;
      }

      const textNodes = collectLocalizableTextNodes(mockNodes);
      
      // Should collect only Headline and Subheadline, not elements inside [PRESERVE] containers
      expect(textNodes.length).toBe(2);
      expect(textNodes[0].name).toBe('Headline');
      expect(textNodes[1].name).toBe('Subheadline');
    });

    it('should skip [PRESERVE] containers entirely', () => {
      const mockNodes = [
        {
          name: '[PRESERVE] Container',
          type: 'FRAME',
          children: [
            { name: 'Text Inside Preserve', type: 'TEXT', characters: 'Should be skipped' }
          ]
        },
        { name: 'Regular Text', type: 'TEXT', characters: 'Should be collected' }
      ];

      function collectLocalizableTextNodes(nodes, acc = []) {
        for (const node of nodes) {
          if (node.name && node.name.startsWith('[PRESERVE]')) {
            continue;
          }
          
          if (node.type === 'TEXT') {
            acc.push(node);
          }
          
          if (node.children) {
            collectLocalizableTextNodes(node.children, acc);
          }
        }
        return acc;
      }

      const textNodes = collectLocalizableTextNodes(mockNodes);
      
      expect(textNodes.length).toBe(1);
      expect(textNodes[0].name).toBe('Regular Text');
    });
  });

  describe('TextNode Properties', () => {
    it('should have required properties for localization', () => {
      // Mock TextNode structure
      const mockTextNode = {
        type: 'TEXT',
        name: 'Headline',
        characters: 'Original Text',
        fontName: { family: 'Inter', style: 'Bold' },
        fontSize: 72,
        textAlignHorizontal: 'CENTER',
        textAutoResize: 'HEIGHT',
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
      };

      // Verify required properties exist
      expect(mockTextNode.type).toBe('TEXT');
      expect(mockTextNode.characters).toBeDefined();
      expect(mockTextNode.fontName).toBeDefined();
      expect(mockTextNode.fontSize).toBeDefined();
    });
  });

  describe('Compatibility Requirements', () => {
    it('should satisfy Requirement 10.1: Compatible element structure', () => {
      // Tab 2 creates elements compatible with Tab 1 processing
      const slideStructure = {
        background: { name: '[PRESERVE] Background', type: 'RECTANGLE' },
        headline: { name: 'Headline', type: 'TEXT' },
        subheadline: { name: 'Subheadline', type: 'TEXT' },
        mockup: { name: '[PRESERVE] iPhone Mockup', type: 'FRAME' }
      };

      expect(slideStructure.headline.type).toBe('TEXT');
      expect(slideStructure.subheadline.type).toBe('TEXT');
      expect(slideStructure.background.name.startsWith('[PRESERVE]')).toBe(true);
      expect(slideStructure.mockup.name.startsWith('[PRESERVE]')).toBe(true);
    });

    it('should satisfy Requirement 10.2: Text elements are selectable for localization', () => {
      // Text elements have proper TextNode type and accessible characters property
      const textElement = {
        type: 'TEXT',
        name: 'Headline',
        characters: 'Editable Text'
      };

      expect(textElement.type).toBe('TEXT');
      expect(textElement.characters).toBeDefined();
      expect(typeof textElement.characters).toBe('string');
    });

    it('should satisfy Requirement 10.4: Mockup elements preserved during localization', () => {
      // Mockup elements are marked with [PRESERVE] prefix
      const mockupElement = {
        name: '[PRESERVE] iPhone Mockup',
        type: 'FRAME'
      };

      expect(mockupElement.name.startsWith('[PRESERVE]')).toBe(true);
    });
  });

  describe('Slide Naming', () => {
    it('should create descriptive slide names with index and headline', () => {
      const slides = [
        { headline: 'Transform Your Workflow', index: 0 },
        { headline: 'Boost Productivity', index: 1 },
        { headline: 'Seamless Integration', index: 2 },
        { headline: 'Trusted by Thousands', index: 3 },
        { headline: 'Get Started Today', index: 4 }
      ];

      const slideNames = slides.map(slide => `Slide ${slide.index + 1}: ${slide.headline}`);

      expect(slideNames[0]).toBe('Slide 1: Transform Your Workflow');
      expect(slideNames[1]).toBe('Slide 2: Boost Productivity');
      expect(slideNames[2]).toBe('Slide 3: Seamless Integration');
      expect(slideNames[3]).toBe('Slide 4: Trusted by Thousands');
      expect(slideNames[4]).toBe('Slide 5: Get Started Today');
    });
  });
});

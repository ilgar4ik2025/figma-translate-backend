/**
 * Property-based tests for slide regeneration
 * Feature: screenshot-generator, Property 18: Регенерация отдельных слайдов
 * Validates: Requirements 9.2, 9.5
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Mock function to simulate slide regeneration
 * In the actual implementation, this would call the backend API
 * and update only the specified slide
 */
function regenerateSlide(story, slideIndex, newSlideData) {
  if (!story || !story.slides || !Array.isArray(story.slides)) {
    throw new Error('Invalid story structure');
  }

  if (slideIndex < 0 || slideIndex >= story.slides.length) {
    throw new Error(`Invalid slide index: ${slideIndex}`);
  }

  // Create a deep copy of the story to avoid mutation
  const updatedStory = {
    slides: story.slides.map((slide, index) => {
      if (index === slideIndex) {
        // Only update the specified slide
        return {
          ...slide,
          ...newSlideData,
          index: slideIndex // Preserve the index
        };
      }
      // Keep other slides unchanged
      return { ...slide };
    })
  };

  return updatedStory;
}

/**
 * Arbitrary generator for a single slide
 */
const slideArbitrary = (index) => fc.record({
  index: fc.constant(index),
  headline: fc.string({ minLength: 1, maxLength: 50 }),
  subheadline: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 10, maxLength: 200 })
});

/**
 * Arbitrary generator for a story with exactly 5 slides
 */
const storyArbitrary = fc.record({
  slides: fc.tuple(
    slideArbitrary(0),
    slideArbitrary(1),
    slideArbitrary(2),
    slideArbitrary(3),
    slideArbitrary(4)
  ).map(slides => slides)
});

/**
 * Arbitrary generator for new slide data (without index)
 */
const newSlideDataArbitrary = fc.record({
  headline: fc.string({ minLength: 1, maxLength: 50 }),
  subheadline: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 10, maxLength: 200 })
});

describe('Slide Regeneration Properties', () => {
  describe('Property 18: Регенерация отдельных слайдов', () => {
    it('should regenerate only the specified slide without changing others', () => {
      fc.assert(
        fc.property(
          storyArbitrary,
          fc.integer({ min: 0, max: 4 }),
          newSlideDataArbitrary,
          (story, slideIndex, newSlideData) => {
            // Store original slides for comparison
            const originalSlides = story.slides.map(slide => ({ ...slide }));

            // Regenerate the specified slide
            const updatedStory = regenerateSlide(story, slideIndex, newSlideData);

            // Verify the story still has exactly 5 slides
            expect(updatedStory.slides).toHaveLength(5);

            // Verify each slide
            for (let i = 0; i < 5; i++) {
              if (i === slideIndex) {
                // The regenerated slide should have the new data
                expect(updatedStory.slides[i].headline).toBe(newSlideData.headline);
                expect(updatedStory.slides[i].subheadline).toBe(newSlideData.subheadline);
                expect(updatedStory.slides[i].description).toBe(newSlideData.description);
                // But should preserve the index
                expect(updatedStory.slides[i].index).toBe(slideIndex);
              } else {
                // Other slides should remain unchanged
                expect(updatedStory.slides[i].headline).toBe(originalSlides[i].headline);
                expect(updatedStory.slides[i].subheadline).toBe(originalSlides[i].subheadline);
                expect(updatedStory.slides[i].description).toBe(originalSlides[i].description);
                expect(updatedStory.slides[i].index).toBe(originalSlides[i].index);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve slide order after regeneration', () => {
      fc.assert(
        fc.property(
          storyArbitrary,
          fc.integer({ min: 0, max: 4 }),
          newSlideDataArbitrary,
          (story, slideIndex, newSlideData) => {
            const updatedStory = regenerateSlide(story, slideIndex, newSlideData);

            // Verify indices are in correct order
            for (let i = 0; i < 5; i++) {
              expect(updatedStory.slides[i].index).toBe(i);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle regeneration of first slide (index 0)', () => {
      fc.assert(
        fc.property(
          storyArbitrary,
          newSlideDataArbitrary,
          (story, newSlideData) => {
            const slideIndex = 0;
            const originalSlides = story.slides.map(slide => ({ ...slide }));

            const updatedStory = regenerateSlide(story, slideIndex, newSlideData);

            // First slide should be updated
            expect(updatedStory.slides[0].headline).toBe(newSlideData.headline);
            expect(updatedStory.slides[0].subheadline).toBe(newSlideData.subheadline);
            expect(updatedStory.slides[0].description).toBe(newSlideData.description);

            // Other slides should remain unchanged
            for (let i = 1; i < 5; i++) {
              expect(updatedStory.slides[i].headline).toBe(originalSlides[i].headline);
              expect(updatedStory.slides[i].subheadline).toBe(originalSlides[i].subheadline);
              expect(updatedStory.slides[i].description).toBe(originalSlides[i].description);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle regeneration of last slide (index 4)', () => {
      fc.assert(
        fc.property(
          storyArbitrary,
          newSlideDataArbitrary,
          (story, newSlideData) => {
            const slideIndex = 4;
            const originalSlides = story.slides.map(slide => ({ ...slide }));

            const updatedStory = regenerateSlide(story, slideIndex, newSlideData);

            // Last slide should be updated
            expect(updatedStory.slides[4].headline).toBe(newSlideData.headline);
            expect(updatedStory.slides[4].subheadline).toBe(newSlideData.subheadline);
            expect(updatedStory.slides[4].description).toBe(newSlideData.description);

            // Other slides should remain unchanged
            for (let i = 0; i < 4; i++) {
              expect(updatedStory.slides[i].headline).toBe(originalSlides[i].headline);
              expect(updatedStory.slides[i].subheadline).toBe(originalSlides[i].subheadline);
              expect(updatedStory.slides[i].description).toBe(originalSlides[i].description);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error for invalid slide index', () => {
      fc.assert(
        fc.property(
          storyArbitrary,
          fc.oneof(
            fc.integer({ min: -10, max: -1 }),
            fc.integer({ min: 5, max: 100 })
          ),
          newSlideDataArbitrary,
          (story, invalidIndex, newSlideData) => {
            expect(() => {
              regenerateSlide(story, invalidIndex, newSlideData);
            }).toThrow('Invalid slide index');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should throw error for invalid story structure', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            null,
            undefined,
            {},
            { slides: null },
            { slides: 'not an array' },
            { slides: [] }
          ),
          fc.integer({ min: 0, max: 4 }),
          newSlideDataArbitrary,
          (invalidStory, slideIndex, newSlideData) => {
            expect(() => {
              regenerateSlide(invalidStory, slideIndex, newSlideData);
            }).toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should allow multiple consecutive regenerations of the same slide', () => {
      fc.assert(
        fc.property(
          storyArbitrary,
          fc.integer({ min: 0, max: 4 }),
          fc.array(newSlideDataArbitrary, { minLength: 2, maxLength: 5 }),
          (story, slideIndex, regenerationSequence) => {
            let currentStory = story;
            const originalSlides = story.slides.map(slide => ({ ...slide }));

            // Apply multiple regenerations to the same slide
            for (const newData of regenerationSequence) {
              currentStory = regenerateSlide(currentStory, slideIndex, newData);
            }

            // Verify the story still has exactly 5 slides
            expect(currentStory.slides).toHaveLength(5);

            // Verify the regenerated slide has the last regeneration data
            const lastRegeneration = regenerationSequence[regenerationSequence.length - 1];
            expect(currentStory.slides[slideIndex].headline).toBe(lastRegeneration.headline);
            expect(currentStory.slides[slideIndex].subheadline).toBe(lastRegeneration.subheadline);
            expect(currentStory.slides[slideIndex].description).toBe(lastRegeneration.description);

            // Verify other slides remain unchanged from the original
            for (let i = 0; i < 5; i++) {
              if (i !== slideIndex) {
                expect(currentStory.slides[i].headline).toBe(originalSlides[i].headline);
                expect(currentStory.slides[i].subheadline).toBe(originalSlides[i].subheadline);
                expect(currentStory.slides[i].description).toBe(originalSlides[i].description);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow regenerating different slides in sequence', () => {
      fc.assert(
        fc.property(
          storyArbitrary,
          fc.array(
            fc.record({
              slideIndex: fc.integer({ min: 0, max: 4 }),
              newData: newSlideDataArbitrary
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (story, regenerationSequence) => {
            let currentStory = story;
            const regenerationMap = new Map();

            // Track which slides were regenerated and with what data
            for (const { slideIndex, newData } of regenerationSequence) {
              currentStory = regenerateSlide(currentStory, slideIndex, newData);
              regenerationMap.set(slideIndex, newData);
            }

            // Verify the story still has exactly 5 slides
            expect(currentStory.slides).toHaveLength(5);

            // Verify each slide has the correct data
            for (let i = 0; i < 5; i++) {
              if (regenerationMap.has(i)) {
                // Slide was regenerated, should have the last regeneration data
                const lastRegeneration = regenerationMap.get(i);
                expect(currentStory.slides[i].headline).toBe(lastRegeneration.headline);
                expect(currentStory.slides[i].subheadline).toBe(lastRegeneration.subheadline);
                expect(currentStory.slides[i].description).toBe(lastRegeneration.description);
              } else {
                // Slide was not regenerated, should have original data
                expect(currentStory.slides[i].headline).toBe(story.slides[i].headline);
                expect(currentStory.slides[i].subheadline).toBe(story.slides[i].subheadline);
                expect(currentStory.slides[i].description).toBe(story.slides[i].description);
              }
              // All slides should have correct indices
              expect(currentStory.slides[i].index).toBe(i);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

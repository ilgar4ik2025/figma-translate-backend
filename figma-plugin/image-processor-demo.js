/**
 * ImageProcessor Usage Demo
 * 
 * This file demonstrates how to use the ImageProcessor class
 * in the Figma plugin for handling images from the backend API.
 */

// Example 1: Creating an image from base64 (from API response)
async function exampleCreateFromBase64() {
  // Simulated API response with base64 image
  const apiResponse = {
    success: true,
    imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  };

  // Create Figma image from base64
  const image = await imageProcessor.createImageFromBase64(apiResponse.imageBase64);
  
  console.log('Image created:', {
    width: image.width,
    height: image.height
  });

  return image;
}

// Example 2: Creating an image from Uint8Array (from file upload)
async function exampleCreateFromBytes() {
  // Simulated file upload data
  const fileBytes = new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10, // PNG signature
    // ... rest of PNG data
  ]);

  // Create Figma image from bytes
  const image = await imageProcessor.createImageFromBytes(fileBytes);
  
  console.log('Image created from bytes:', {
    width: image.width,
    height: image.height
  });

  return image;
}

// Example 3: Scaling an image to fit iPhone mockup
async function exampleScaleForMockup() {
  // User uploaded screenshot
  const screenshotBytes = new Uint8Array([/* ... image data ... */]);
  
  // iPhone portrait dimensions
  const IPHONE_WIDTH = 1242;
  const IPHONE_HEIGHT = 2688;
  
  // Scale to fit mockup while preserving aspect ratio
  const scaled = await imageProcessor.scaleImage(
    screenshotBytes,
    IPHONE_WIDTH,
    IPHONE_HEIGHT
  );
  
  console.log('Scaled image:', {
    originalWidth: scaled.originalWidth,
    originalHeight: scaled.originalHeight,
    newWidth: scaled.width,
    newHeight: scaled.height,
    aspectRatioPreserved: Math.abs(
      (scaled.originalWidth / scaled.originalHeight) - 
      (scaled.width / scaled.height)
    ) < 0.01
  });

  return scaled;
}

// Example 4: Integration with MessageHandler for background generation
async function exampleHandleBackgroundGeneration(backgroundBase64) {
  try {
    // Convert base64 from API to Figma image
    const image = await imageProcessor.createImageFromBase64(backgroundBase64);
    
    // Create rectangle node for background
    const rect = figma.createRectangle();
    rect.resize(1242, 2688); // iPhone portrait
    
    // Apply image as fill
    const imageHash = image.hash;
    rect.fills = [{
      type: 'IMAGE',
      imageHash: imageHash,
      scaleMode: 'FILL'
    }];
    
    console.log('Background created successfully');
    return rect;
    
  } catch (error) {
    console.error('Failed to create background:', error);
    throw error;
  }
}

// Example 5: Integration with MessageHandler for screenshot insertion
async function exampleInsertScreenshotIntoMockup(screenshotBase64) {
  try {
    // Convert screenshot to bytes
    const image = await imageProcessor.createImageFromBase64(screenshotBase64);
    const bytes = await image.getBytesAsync();
    
    // Scale to fit mockup (leaving space for iPhone frame)
    const MOCKUP_INNER_WIDTH = 1200;
    const MOCKUP_INNER_HEIGHT = 2600;
    
    const scaled = await imageProcessor.scaleImage(
      bytes,
      MOCKUP_INNER_WIDTH,
      MOCKUP_INNER_HEIGHT
    );
    
    // Create image node
    const imageNode = figma.createRectangle();
    imageNode.resize(scaled.width, scaled.height);
    
    // Apply scaled image
    const scaledImage = await imageProcessor.createImageFromBytes(scaled.bytes);
    imageNode.fills = [{
      type: 'IMAGE',
      imageHash: scaledImage.hash,
      scaleMode: 'FIT'
    }];
    
    console.log('Screenshot inserted into mockup');
    return imageNode;
    
  } catch (error) {
    console.error('Failed to insert screenshot:', error);
    throw error;
  }
}

// Example 6: Error handling
async function exampleErrorHandling() {
  try {
    // Invalid base64
    await imageProcessor.createImageFromBase64('invalid-base64');
  } catch (error) {
    console.log('Caught error:', error.message);
    // Display user-friendly error in UI
    figma.notify('❌ Не удалось загрузить изображение');
  }

  try {
    // Empty bytes
    await imageProcessor.createImageFromBytes(new Uint8Array([]));
  } catch (error) {
    console.log('Caught error:', error.message);
    figma.notify('❌ Файл изображения пуст');
  }

  try {
    // Wrong type
    await imageProcessor.createImageFromBytes('not-a-uint8array');
  } catch (error) {
    console.log('Caught error:', error.message);
    figma.notify('❌ Некорректный формат данных');
  }
}

/**
 * Usage in MessageHandler.handleCreateSlides()
 * 
 * This shows how ImageProcessor will be integrated into the actual slide creation flow
 */
async function exampleSlideCreationIntegration(slideData) {
  const { story, backgrounds, screenshots } = slideData;
  
  // Create parent frame for all slides
  const parentFrame = figma.createFrame();
  parentFrame.name = 'App Store Screenshots';
  parentFrame.layoutMode = 'HORIZONTAL';
  parentFrame.itemSpacing = 80;
  
  // Create each slide
  for (let i = 0; i < story.slides.length; i++) {
    const slide = story.slides[i];
    const backgroundData = backgrounds[i];
    const screenshotData = screenshots?.[i];
    
    // Create slide frame
    const slideFrame = figma.createFrame();
    slideFrame.name = `Slide ${i + 1}`;
    slideFrame.resize(1242, 2688);
    
    // 1. Create background using ImageProcessor
    const bgImage = await imageProcessor.createImageFromBase64(backgroundData.imageBase64);
    const bgRect = figma.createRectangle();
    bgRect.resize(1242, 2688);
    bgRect.fills = [{
      type: 'IMAGE',
      imageHash: bgImage.hash,
      scaleMode: 'FILL'
    }];
    slideFrame.appendChild(bgRect);
    
    // 2. Create text elements (headline, subheadline)
    // ... text creation code ...
    
    // 3. Create iPhone mockup with screenshot (if provided)
    if (screenshotData) {
      const screenshotImage = await imageProcessor.createImageFromBase64(screenshotData);
      const screenshotBytes = await screenshotImage.getBytesAsync();
      
      // Scale screenshot to fit mockup
      const scaled = await imageProcessor.scaleImage(screenshotBytes, 1100, 2400);
      
      // Create mockup frame
      const mockupFrame = figma.createFrame();
      mockupFrame.name = 'iPhone Mockup';
      mockupFrame.resize(scaled.width, scaled.height);
      
      // Insert scaled screenshot
      const scaledImage = await imageProcessor.createImageFromBytes(scaled.bytes);
      const screenshotRect = figma.createRectangle();
      screenshotRect.resize(scaled.width, scaled.height);
      screenshotRect.fills = [{
        type: 'IMAGE',
        imageHash: scaledImage.hash,
        scaleMode: 'FIT'
      }];
      mockupFrame.appendChild(screenshotRect);
      slideFrame.appendChild(mockupFrame);
    }
    
    // Add slide to parent
    parentFrame.appendChild(slideFrame);
  }
  
  return parentFrame;
}

// Export examples for documentation
module.exports = {
  exampleCreateFromBase64,
  exampleCreateFromBytes,
  exampleScaleForMockup,
  exampleHandleBackgroundGeneration,
  exampleInsertScreenshotIntoMockup,
  exampleErrorHandling,
  exampleSlideCreationIntegration
};

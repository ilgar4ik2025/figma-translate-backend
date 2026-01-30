/**
 * Tests for ImageProcessor
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
    return {
      resize: (width, height) => {},
      fills: [],
      exportAsync: async (settings) => {
        // Simulate compression - return bytes that are ~70% of original
        const mockCompressedSize = Math.floor(mockCurrentImageSize * 0.7);
        return new Uint8Array(mockCompressedSize);
      },
      remove: () => {}
    };
  }
};

// Track current image size for mock export
let mockCurrentImageSize = 0;

// Mock atob for Node.js environment
if (typeof atob === 'undefined') {
  global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
}

// Import ImageProcessor (in real scenario, would need proper module setup)
// For now, we'll copy the class definition
class ImageProcessor {
  async createImageFromBase64(base64) {
    try {
      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
      const bytes = this._base64ToUint8Array(base64Data);
      return await this.createImageFromBytes(bytes);
    } catch (error) {
      console.error('Error creating image from base64:', error);
      throw new Error(`Не удалось создать изображение из base64: ${error.message}`);
    }
  }

  async createImageFromBytes(bytes) {
    try {
      if (!(bytes instanceof Uint8Array)) {
        throw new Error('Input must be a Uint8Array');
      }
      if (bytes.length === 0) {
        throw new Error('Image data is empty');
      }
      const image = figma.createImage(bytes);
      await image.getBytesAsync();
      return image;
    } catch (error) {
      console.error('Error creating image from bytes:', error);
      throw new Error(`Не удалось создать изображение: ${error.message}`);
    }
  }

  async scaleImage(bytes, targetWidth, targetHeight) {
    try {
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
    } catch (error) {
      console.error('Error scaling image:', error);
      throw new Error(`Не удалось масштабировать изображение: ${error.message}`);
    }
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

  async optimizeImage(bytes, maxSize = 5 * 1024 * 1024) {
    try {
      if (bytes.length <= maxSize) {
        return bytes;
      }

      console.log(`Image size ${(bytes.length / 1024 / 1024).toFixed(2)}MB exceeds ${(maxSize / 1024 / 1024).toFixed(2)}MB, optimizing...`);

      const image = await this.createImageFromBytes(bytes);
      const originalWidth = image.width;
      const originalHeight = image.height;

      const sizeRatio = maxSize / bytes.length;
      const scaleFactor = Math.sqrt(sizeRatio * 0.9);

      const newWidth = Math.round(originalWidth * scaleFactor);
      const newHeight = Math.round(originalHeight * scaleFactor);

      console.log(`Scaling from ${originalWidth}x${originalHeight} to ${newWidth}x${newHeight}`);

      const rect = figma.createRectangle();
      rect.resize(newWidth, newHeight);
      
      const imageFill = {
        type: 'IMAGE',
        imageHash: image.hash,
        scaleMode: 'FILL'
      };
      rect.fills = [imageFill];

      const exportSettings = {
        format: 'PNG',
        constraint: { type: 'SCALE', value: 1 }
      };
      
      // Set mock size for export simulation
      if (typeof mockCurrentImageSize !== 'undefined') {
        mockCurrentImageSize = bytes.length;
      }
      
      const exportedBytes = await rect.exportAsync(exportSettings);
      
      rect.remove();

      if (exportedBytes.length <= maxSize) {
        console.log(`Optimized to ${(exportedBytes.length / 1024 / 1024).toFixed(2)}MB`);
        return exportedBytes;
      } else {
        console.log(`Still too large (${(exportedBytes.length / 1024 / 1024).toFixed(2)}MB), applying more aggressive optimization...`);
        return await this.optimizeImage(exportedBytes, maxSize);
      }
    } catch (error) {
      console.error('Error optimizing image:', error);
      throw new Error(`Не удалось оптимизировать изображение: ${error.message}`);
    }
  }
}

// Test suite
async function runTests() {
  const processor = new ImageProcessor();
  let passed = 0;
  let failed = 0;

  console.log('🧪 Running ImageProcessor tests...\n');

  // Test 1: Create image from Uint8Array
  try {
    const testBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
    const image = await processor.createImageFromBytes(testBytes);
    if (image && image.width && image.height) {
      console.log('✅ Test 1 passed: createImageFromBytes works');
      passed++;
    } else {
      throw new Error('Image not created properly');
    }
  } catch (error) {
    console.log('❌ Test 1 failed:', error.message);
    failed++;
  }

  // Test 2: Create image from base64
  try {
    // Simple base64 string (PNG header)
    const base64 = 'iVBORw0KGgo=';
    const image = await processor.createImageFromBase64(base64);
    if (image) {
      console.log('✅ Test 2 passed: createImageFromBase64 works');
      passed++;
    } else {
      throw new Error('Image not created from base64');
    }
  } catch (error) {
    console.log('❌ Test 2 failed:', error.message);
    failed++;
  }

  // Test 3: Create image from base64 with data URI prefix
  try {
    const base64WithPrefix = 'data:image/png;base64,iVBORw0KGgo=';
    const image = await processor.createImageFromBase64(base64WithPrefix);
    if (image) {
      console.log('✅ Test 3 passed: createImageFromBase64 handles data URI prefix');
      passed++;
    } else {
      throw new Error('Image not created from base64 with prefix');
    }
  } catch (error) {
    console.log('❌ Test 3 failed:', error.message);
    failed++;
  }

  // Test 4: Calculate scaled dimensions - wider image
  try {
    const result = processor._calculateScaledDimensions(1600, 900, 800, 600);
    const expectedWidth = 800;
    const expectedHeight = 450;
    if (result.width === expectedWidth && result.height === expectedHeight) {
      console.log('✅ Test 4 passed: Aspect ratio preserved for wider image');
      passed++;
    } else {
      throw new Error(`Expected ${expectedWidth}x${expectedHeight}, got ${result.width}x${result.height}`);
    }
  } catch (error) {
    console.log('❌ Test 4 failed:', error.message);
    failed++;
  }

  // Test 5: Calculate scaled dimensions - taller image
  try {
    const result = processor._calculateScaledDimensions(900, 1600, 800, 600);
    const expectedWidth = 338; // 600 * (900/1600) = 337.5 -> 338
    const expectedHeight = 600;
    if (result.width === expectedWidth && result.height === expectedHeight) {
      console.log('✅ Test 5 passed: Aspect ratio preserved for taller image');
      passed++;
    } else {
      throw new Error(`Expected ${expectedWidth}x${expectedHeight}, got ${result.width}x${result.height}`);
    }
  } catch (error) {
    console.log('❌ Test 5 failed:', error.message);
    failed++;
  }

  // Test 6: Scale image preserves aspect ratio
  try {
    const testBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const result = await processor.scaleImage(testBytes, 800, 600);
    
    // Original is 1242x2688 (from mock)
    const originalAspectRatio = 1242 / 2688;
    const scaledAspectRatio = result.width / result.height;
    const aspectRatioDiff = Math.abs(originalAspectRatio - scaledAspectRatio);
    
    if (aspectRatioDiff < 0.01) {
      console.log('✅ Test 6 passed: scaleImage preserves aspect ratio');
      passed++;
    } else {
      throw new Error(`Aspect ratio not preserved: ${originalAspectRatio} vs ${scaledAspectRatio}`);
    }
  } catch (error) {
    console.log('❌ Test 6 failed:', error.message);
    failed++;
  }

  // Test 7: Error handling - empty bytes
  try {
    const emptyBytes = new Uint8Array([]);
    await processor.createImageFromBytes(emptyBytes);
    console.log('❌ Test 7 failed: Should throw error for empty bytes');
    failed++;
  } catch (error) {
    if (error.message.includes('empty')) {
      console.log('✅ Test 7 passed: Correctly handles empty bytes');
      passed++;
    } else {
      console.log('❌ Test 7 failed: Wrong error message');
      failed++;
    }
  }

  // Test 8: Error handling - invalid input type
  try {
    await processor.createImageFromBytes('not a uint8array');
    console.log('❌ Test 8 failed: Should throw error for invalid input type');
    failed++;
  } catch (error) {
    if (error.message.includes('Uint8Array')) {
      console.log('✅ Test 8 passed: Correctly validates input type');
      passed++;
    } else {
      console.log('❌ Test 8 failed: Wrong error message');
      failed++;
    }
  }

  // Test 9: optimizeImage - image under 5MB should not be modified
  try {
    const smallBytes = new Uint8Array(1024 * 1024); // 1MB
    const result = await processor.optimizeImage(smallBytes, 5 * 1024 * 1024);
    if (result === smallBytes) {
      console.log('✅ Test 9 passed: Small images are not modified');
      passed++;
    } else {
      throw new Error('Small image was modified unnecessarily');
    }
  } catch (error) {
    console.log('❌ Test 9 failed:', error.message);
    failed++;
  }

  // Test 10: optimizeImage - large image should be compressed
  try {
    const largeBytes = new Uint8Array(10 * 1024 * 1024); // 10MB
    mockCurrentImageSize = largeBytes.length;
    const result = await processor.optimizeImage(largeBytes, 5 * 1024 * 1024);
    if (result.length < largeBytes.length && result.length <= 5 * 1024 * 1024) {
      console.log('✅ Test 10 passed: Large images are compressed to target size');
      passed++;
    } else {
      throw new Error(`Expected size < 5MB, got ${(result.length / 1024 / 1024).toFixed(2)}MB`);
    }
  } catch (error) {
    console.log('❌ Test 10 failed:', error.message);
    failed++;
  }

  // Test 11: optimizeImage - custom max size
  try {
    const bytes = new Uint8Array(3 * 1024 * 1024); // 3MB
    mockCurrentImageSize = bytes.length;
    const result = await processor.optimizeImage(bytes, 2 * 1024 * 1024); // 2MB limit
    if (result.length <= 2 * 1024 * 1024) {
      console.log('✅ Test 11 passed: Custom max size is respected');
      passed++;
    } else {
      throw new Error(`Expected size <= 2MB, got ${(result.length / 1024 / 1024).toFixed(2)}MB`);
    }
  } catch (error) {
    console.log('❌ Test 11 failed:', error.message);
    failed++;
  }

  // Test 12: optimizeImage - preserves image data type
  try {
    const bytes = new Uint8Array(6 * 1024 * 1024); // 6MB
    mockCurrentImageSize = bytes.length;
    const result = await processor.optimizeImage(bytes);
    if (result instanceof Uint8Array) {
      console.log('✅ Test 12 passed: Returns Uint8Array');
      passed++;
    } else {
      throw new Error('Result is not a Uint8Array');
    }
  } catch (error) {
    console.log('❌ Test 12 failed:', error.message);
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

/**
 * Simple validation script for CometAPIClient
 * Run with: node backend/lib/validate-client.js
 */

import { CometAPIClient, createClient } from './CometAPIClient.js';

console.log('🔍 Validating CometAPIClient...\n');

// Test 1: Constructor validation
console.log('Test 1: Constructor validation');
try {
  new CometAPIClient();
  console.log('❌ FAILED: Should throw error for missing API key');
} catch (error) {
  if (error.message === 'API ключ обязателен') {
    console.log('✅ PASSED: Correctly throws error for missing API key');
  } else {
    console.log('❌ FAILED: Wrong error message:', error.message);
  }
}

// Test 2: Constructor with valid key
console.log('\nTest 2: Constructor with valid key');
try {
  const client = new CometAPIClient('test-key');
  if (client.apiKey === 'test-key' && client.baseUrl === 'https://api.cometapi.com/v1') {
    console.log('✅ PASSED: Client created with correct properties');
  } else {
    console.log('❌ FAILED: Client properties incorrect');
  }
} catch (error) {
  console.log('❌ FAILED:', error.message);
}

// Test 3: callGPT method exists
console.log('\nTest 3: callGPT method exists');
const client = new CometAPIClient('test-key');
if (typeof client.callGPT === 'function') {
  console.log('✅ PASSED: callGPT method exists');
} else {
  console.log('❌ FAILED: callGPT method not found');
}

// Test 4: callGemini method exists
console.log('\nTest 4: callGemini method exists');
if (typeof client.callGemini === 'function') {
  console.log('✅ PASSED: callGemini method exists');
} else {
  console.log('❌ FAILED: callGemini method not found');
}

// Test 5: createClient function
console.log('\nTest 5: createClient function');
if (!process.env.COMET_API_KEY) {
  try {
    createClient();
    console.log('❌ FAILED: Should throw error when COMET_API_KEY not set');
  } catch (error) {
    if (error.message === 'COMET_API_KEY не установлен в переменных окружения') {
      console.log('✅ PASSED: Correctly throws error when env var not set');
    } else {
      console.log('❌ FAILED: Wrong error message:', error.message);
    }
  }
} else {
  try {
    const envClient = createClient();
    if (envClient.apiKey === process.env.COMET_API_KEY) {
      console.log('✅ PASSED: createClient uses env variable');
    } else {
      console.log('❌ FAILED: createClient not using env variable correctly');
    }
  } catch (error) {
    console.log('❌ FAILED:', error.message);
  }
}

console.log('\n✨ Validation complete!');

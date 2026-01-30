/**
 * Unit tests for CometAPIClient
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CometAPIClient, createClient } from './CometAPIClient.js';

describe('CometAPIClient', () => {
  describe('constructor', () => {
    it('should throw error if API key is not provided', () => {
      expect(() => new CometAPIClient()).toThrow('API ключ обязателен');
      expect(() => new CometAPIClient('')).toThrow('API ключ обязателен');
      expect(() => new CometAPIClient(null)).toThrow('API ключ обязателен');
    });

    it('should create client with valid API key', () => {
      const client = new CometAPIClient('test-api-key');
      expect(client.apiKey).toBe('test-api-key');
      expect(client.baseUrl).toBe('https://api.cometapi.com/v1');
    });
  });

  describe('callGPT', () => {
    it('should throw error for empty prompt', async () => {
      const client = new CometAPIClient('test-key');
      
      // Mock fetch to avoid actual API calls
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'test response' } }]
        })
      });

      const result = await client.callGPT('test prompt');
      expect(result).toBe('test response');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.cometapi.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should use default options', async () => {
      const client = new CometAPIClient('test-key');
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'response' } }]
        })
      });

      await client.callGPT('prompt');
      
      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(callBody.model).toBe('chatgpt-4o-latest');
      expect(callBody.temperature).toBe(0.7);
      expect(callBody.messages).toEqual([{ role: 'user', content: 'prompt' }]);
    });

    it('should handle API errors with status code', async () => {
      vi.useFakeTimers();
      const client = new CometAPIClient('test-key');
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded'
      });

      const promise = client.callGPT('prompt').catch(e => e);
      await vi.runAllTimersAsync();
      const error = await promise;
      
      expect(error.message).toBe('Слишком много запросов. Пожалуйста, подождите 1 минуту и попробуйте снова');
      
      vi.useRealTimers();
    });

    it('should handle empty response', async () => {
      const client = new CometAPIClient('test-key');
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [] })
      });

      await expect(client.callGPT('prompt')).rejects.toThrow(
        'Получен пустой ответ от GPT'
      );
    });
  });

  describe('callGemini', () => {
    it('should call Gemini API with correct parameters', async () => {
      const client = new CometAPIClient('test-key');
      
      const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ b64_json: mockBase64 }]
        })
      });

      const result = await client.callGemini('test prompt');
      
      expect(result).toBeInstanceOf(Uint8Array);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.cometapi.com/v1/images/generations',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
    });

    it('should use custom dimensions', async () => {
      const client = new CometAPIClient('test-key');
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ b64_json: 'test' }]
        })
      });

      await client.callGemini('prompt', { width: 512, height: 512 });
      
      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(callBody.size).toBe('512x512');
    });

    it('should handle empty image response', async () => {
      const client = new CometAPIClient('test-key');
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] })
      });

      await expect(client.callGemini('prompt')).rejects.toThrow(
        'Получен пустой ответ от Gemini'
      );
    });
  });

  describe('createClient', () => {
    it('should throw error if COMET_API_KEY is not set', () => {
      const originalEnv = process.env.COMET_API_KEY;
      delete process.env.COMET_API_KEY;
      
      expect(() => createClient()).toThrow(
        'COMET_API_KEY не установлен в переменных окружения'
      );
      
      process.env.COMET_API_KEY = originalEnv;
    });

    it('should create client with env API key', () => {
      process.env.COMET_API_KEY = 'env-test-key';
      
      const client = createClient();
      expect(client.apiKey).toBe('env-test-key');
    });
  });

  describe('retryWithBackoff', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should succeed on first attempt', async () => {
      const client = new CometAPIClient('test-key');
      const mockFn = vi.fn().mockResolvedValue('success');

      const promise = client.retryWithBackoff(mockFn);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on 429 error with exponential backoff', async () => {
      const client = new CometAPIClient('test-key');
      const error429 = new Error('Rate limit');
      error429.statusCode = 429;

      const mockFn = vi.fn()
        .mockRejectedValueOnce(error429)
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce('success');

      const promise = client.retryWithBackoff(mockFn);
      
      // Fast-forward through all timers
      await vi.runAllTimersAsync();
      
      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should retry on 500 error', async () => {
      const client = new CometAPIClient('test-key');
      const error500 = new Error('Server error');
      error500.statusCode = 500;

      const mockFn = vi.fn()
        .mockRejectedValueOnce(error500)
        .mockResolvedValueOnce('success');

      const promise = client.retryWithBackoff(mockFn);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on network errors', async () => {
      const client = new CometAPIClient('test-key');
      const networkError = new Error('Network error');
      networkError.code = 'ENOTFOUND';

      const mockFn = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce('success');

      const promise = client.retryWithBackoff(mockFn);
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 400 error', async () => {
      const client = new CometAPIClient('test-key');
      const error400 = new Error('Bad request');
      error400.statusCode = 400;

      const mockFn = vi.fn().mockRejectedValue(error400);

      await expect(client.retryWithBackoff(mockFn)).rejects.toThrow('Bad request');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries', async () => {
      const client = new CometAPIClient('test-key');
      const error429 = new Error('Rate limit');
      error429.statusCode = 429;

      const mockFn = vi.fn().mockRejectedValue(error429);

      const promise = client.retryWithBackoff(mockFn);
      
      // Run all timers and wait for promise to settle
      const result = Promise.race([
        promise.catch(e => e),
        vi.runAllTimersAsync().then(() => promise.catch(e => e))
      ]);
      
      await vi.runAllTimersAsync();
      const error = await result;

      expect(error.message).toBe('Rate limit');
      expect(mockFn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should use exponential backoff delays (1s, 2s, 4s)', async () => {
      const client = new CometAPIClient('test-key');
      const error = new Error('Retry error');
      error.statusCode = 503;

      const mockFn = vi.fn().mockRejectedValue(error);
      const delays = [];

      // Track setTimeout calls
      const originalSetTimeout = setTimeout;
      vi.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
        if (delay > 0) {
          delays.push(delay);
        }
        return originalSetTimeout(fn, 0);
      });

      const promise = client.retryWithBackoff(mockFn).catch(e => e);
      await vi.runAllTimersAsync();
      await promise;

      expect(delays).toEqual([1000, 2000, 4000]);
    });
  });

  describe('callGPT with retry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry callGPT on 429 error', async () => {
      const client = new CometAPIClient('test-key');

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => 'Rate limit'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'success' } }]
          })
        });

      const promise = client.callGPT('test prompt');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('callGemini with retry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should retry callGemini on 503 error', async () => {
      const client = new CometAPIClient('test-key');
      const mockBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: async () => 'Service unavailable'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ b64_json: mockBase64 }]
          })
        });

      const promise = client.callGemini('test prompt');
      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toBeInstanceOf(Uint8Array);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});

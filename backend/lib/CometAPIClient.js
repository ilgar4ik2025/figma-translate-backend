/**
 * CometAPIClient - Клиент для взаимодействия с CometAPI
 * Предоставляет методы для вызова GPT и Gemini через CometAPI
 */

/**
 * Класс для взаимодействия с CometAPI
 */
export class CometAPIClient {
  /**
   * @param {string} apiKey - API ключ для аутентификации
   */
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('API ключ обязателен');
    }
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.cometapi.com/v1';
    this.baseUrlBeta = 'https://api.cometapi.com/v1beta';
  }

  /**
   * Повторная попытка выполнения функции с экспоненциальной задержкой
   * @param {Function} fn - Функция для выполнения
   * @param {number} maxRetries - Максимальное количество повторных попыток (по умолчанию 3)
   * @returns {Promise<any>} - Результат выполнения функции
   */
  async retryWithBackoff(fn, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Не повторяем попытку, если это последняя попытка
        if (attempt === maxRetries) {
          break;
        }
        
        // Проверяем, является ли ошибка повторяемой
        const isRetryable = 
          error.statusCode === 429 || // Rate limiting
          error.statusCode === 500 || // Server error
          error.statusCode === 502 || // Bad gateway
          error.statusCode === 503 || // Service unavailable
          error.statusCode === 504 || // Gateway timeout
          error.code === 'ENOTFOUND' ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ETIMEDOUT' ||
          error.name === 'AbortError';
        
        if (!isRetryable) {
          // Не повторяем попытку для неповторяемых ошибок
          throw error;
        }
        
        // Вычисляем задержку: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        
        // Ждем перед следующей попыткой
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Если все попытки исчерпаны, выбрасываем последнюю ошибку
    throw lastError;
  }

  /**
   * Вызов GPT для текстовой генерации
   * @param {string} prompt - Промпт для GPT
   * @param {Object} options - Опции для GPT
   * @param {string} options.model - Модель GPT (по умолчанию 'chatgpt-4o-latest')
   * @param {number} options.temperature - Температура (по умолчанию 0.7)
   * @param {number} options.maxTokens - Максимальное количество токенов
   * @returns {Promise<string>} - Ответ от GPT
   */
  async callGPT(prompt, options = {}) {
    return this.retryWithBackoff(async () => {
      return this._callGPTInternal(prompt, options);
    });
  }

  /**
   * Внутренний метод для вызова GPT (без retry логики)
   * @private
   */
  async _callGPTInternal(prompt, options = {}) {
    const {
      model = 'chatgpt-4o-latest',
      temperature = 0.7,
      maxTokens
    } = options;

    try {
      const body = {
        model,
        temperature,
        messages: [{ role: 'user', content: prompt }]
      };

      if (maxTokens) {
        body.max_tokens = maxTokens;
      }

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(
          response.status === 429
            ? 'Слишком много запросов. Пожалуйста, подождите 1 минуту и попробуйте снова'
            : `Ошибка API: ${response.status}`
        );
        error.statusCode = response.status;
        error.details = errorText;
        throw error;
      }

      const json = await response.json();
      const content = json.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Получен пустой ответ от GPT');
      }

      return content;
    } catch (error) {
      // Обработка сетевых ошибок
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        const netError = new Error('Не удалось подключиться к серверу. Проверьте интернет-соединение');
        netError.originalError = error;
        throw netError;
      }
      
      if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
        const timeoutError = new Error('Запрос занял слишком много времени. Попробуйте еще раз');
        timeoutError.originalError = error;
        throw timeoutError;
      }

      throw error;
    }
  }

  /**
   * Вызов Gemini для генерации изображений
   * @param {string} prompt - Промпт для Gemini
   * @param {Object} options - Опции для Gemini
   * @param {string} options.model - Модель Gemini (по умолчанию 'gemini-2.5-flash-image')
   * @returns {Promise<Uint8Array>} - Изображение в формате Uint8Array
   */
  async callGemini(prompt, options = {}) {
    return this.retryWithBackoff(async () => {
      return this._callGeminiInternal(prompt, options);
    });
  }

  /**
   * Внутренний метод для вызова Gemini (без retry логики)
   * @private
   */
  async _callGeminiInternal(prompt, options = {}) {
    const {
      model = 'gemini-2.5-flash-image'
    } = options;

    try {
      console.log('🎨 Calling Gemini Image Generation API...');
      console.log('Model:', model);
      console.log('Prompt:', prompt.substring(0, 100) + '...');

      // Используем правильный эндпоинт для Gemini через CometAPI
      const url = `${this.baseUrlBeta}/models/${model}:generateContent`;
      console.log('URL:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        const error = new Error(
          response.status === 429
            ? 'Слишком много запросов. Пожалуйста, подождите 1 минуту и попробуйте снова'
            : `Ошибка API: ${response.status} - ${errorText}`
        );
        error.statusCode = response.status;
        error.details = errorText;
        throw error;
      }

      const json = await response.json();
      console.log('Response received, parsing...');

      // Парсим ответ от Gemini
      // Формат: { candidates: [{ content: { parts: [{ inlineData: { mimeType, data } }] } }] }
      const candidate = json.candidates?.[0];
      if (!candidate) {
        console.error('No candidates in response:', JSON.stringify(json).substring(0, 200));
        throw new Error('Получен пустой ответ от Gemini');
      }

      const parts = candidate.content?.parts;
      if (!parts || parts.length === 0) {
        console.error('No parts in response:', JSON.stringify(json).substring(0, 200));
        throw new Error('Нет данных изображения в ответе');
      }

      // Ищем inline_data с изображением
      let imageBase64 = null;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          imageBase64 = part.inlineData.data;
          console.log('✅ Image found, mime type:', part.inlineData.mimeType);
          break;
        }
      }

      if (!imageBase64) {
        console.error('No inline_data in parts:', JSON.stringify(parts).substring(0, 200));
        throw new Error('Изображение не найдено в ответе');
      }

      console.log('✅ Image received, size:', imageBase64.length, 'chars');

      // Конвертация base64 в Uint8Array
      const binaryString = Buffer.from(imageBase64, 'base64');
      return new Uint8Array(binaryString);
    } catch (error) {
      // Обработка сетевых ошибок
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        const netError = new Error('Не удалось подключиться к серверу. Проверьте интернет-соединение');
        netError.originalError = error;
        throw netError;
      }
      
      if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
        const timeoutError = new Error('Запрос занял слишком много времени. Попробуйте еще раз');
        timeoutError.originalError = error;
        throw timeoutError;
      }

      throw error;
    }
  }
}

/**
 * Создание экземпляра клиента с API ключом из переменных окружения
 * @returns {CometAPIClient}
 */
export function createClient() {
  const apiKey = process.env.COMET_API_KEY;
  if (!apiKey) {
    throw new Error('COMET_API_KEY не установлен в переменных окружения');
  }
  return new CometAPIClient(apiKey);
}

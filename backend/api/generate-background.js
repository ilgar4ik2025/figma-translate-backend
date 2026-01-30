import { createClient } from '../lib/CometAPIClient.js';

/**
 * Повторная попытка с экспоненциальной задержкой
 * @param {Function} fn - Функция для выполнения
 * @param {number} maxRetries - Максимальное количество повторов (по умолчанию 3)
 * @returns {Promise} - Результат выполнения функции
 */
async function retryWithBackoff(fn, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Не повторяем для ошибок валидации (4xx)
      if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }
      
      // Если это последняя попытка, выбрасываем ошибку
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Экспоненциальная задержка: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  try {
    const { description, style, index } = req.body;

    // Валидация входных параметров
    if (!description || typeof description !== 'string' || description.trim() === '') {
      return res.status(400).json({ error: 'Описание слайда обязательно' });
    }
    if (!style || typeof style !== 'string' || style.trim() === '') {
      return res.status(400).json({ error: 'Стиль обязателен' });
    }
    if (typeof index !== 'number' || index < 0 || index > 4) {
      return res.status(400).json({ error: 'Индекс должен быть числом от 0 до 4' });
    }

    // Формирование промпта для Gemini
    const prompt = `Create a professional App Store screenshot background in iPhone portrait format (1242x2688px).

Visual Description: ${description}
Style: ${style}

Requirements:
- Clean, modern App Store aesthetic
- Suitable as background for text overlay
- Professional gradient or abstract design
- Colors should not be too saturated
- Leave space for text in upper and middle sections
- High quality, crisp details
- Portrait orientation (vertical)

Generate a visually appealing background that matches the description while maintaining readability for overlaid text.`;

    // Создание клиента
    const client = createClient();

    // Вызов CometAPI (Gemini) с повторными попытками
    const generateImage = async () => {
      const imageBytes = await client.callGemini(prompt, {
        model: 'gemini-2.5-flash-image'
      });
      return imageBytes;
    };

    // Выполнение с повторными попытками
    const imageBytes = await retryWithBackoff(generateImage, 3);

    // Конвертация в base64
    const imageBase64 = Buffer.from(imageBytes).toString('base64');

    res.status(200).json({ 
      success: true, 
      imageBase64,
      index 
    });

  } catch (error) {
    console.error('GENERATE BACKGROUND ERROR:', error);
    
    // Понятные сообщения об ошибках
    let userMessage = 'Произошла ошибка при генерации фона';
    let statusCode = 500;
    
    if (error.statusCode) {
      statusCode = error.statusCode;
    }
    
    if (error.message) {
      userMessage = error.message;
    }
    
    res.status(statusCode).json({ error: userMessage });
  }
}

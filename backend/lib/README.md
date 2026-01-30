# CometAPIClient

Клиент для взаимодействия с CometAPI, предоставляющий унифицированный интерфейс для вызова GPT и Gemini моделей.

## Использование

### Создание клиента

```javascript
import { CometAPIClient, createClient } from './CometAPIClient.js';

// Вариант 1: Создание с явным API ключом
const client = new CometAPIClient('your-api-key');

// Вариант 2: Создание с использованием переменной окружения COMET_API_KEY
const client = createClient();
```

### Вызов GPT для текстовой генерации

```javascript
const prompt = 'Create a story for an app...';

// С параметрами по умолчанию
const response = await client.callGPT(prompt);

// С кастомными параметрами
const response = await client.callGPT(prompt, {
  model: 'chatgpt-4o-latest',
  temperature: 0.7,
  maxTokens: 2000
});
```

### Вызов Gemini для генерации изображений

```javascript
const prompt = 'Create a professional background...';

// С параметрами по умолчанию (1024x1792)
const imageBytes = await client.callGemini(prompt);

// С кастомными размерами
const imageBytes = await client.callGemini(prompt, {
  model: 'gemini-2.5-pro',
  width: 1242,
  height: 2688
});

// Конвертация в base64 для отправки клиенту
const base64 = Buffer.from(imageBytes).toString('base64');
```

## Обработка ошибок

Клиент автоматически обрабатывает различные типы ошибок:

- **Rate limiting (429)**: Возвращает понятное сообщение на русском
- **Сетевые ошибки**: Обрабатывает ENOTFOUND, ECONNREFUSED
- **Таймауты**: Обрабатывает ETIMEDOUT, AbortError
- **Пустые ответы**: Валидирует наличие контента в ответе

Все ошибки содержат понятные сообщения на русском языке для пользователей.

## Интеграция с API handlers

Клиент уже интегрирован в следующие API handlers:

- `backend/api/generate-story.js` - использует `callGPT()`
- `backend/api/generate-background.js` - использует `callGemini()`

## Валидация

Для проверки корректности работы клиента запустите:

```bash
node backend/lib/validate-client.js
```

## Требования

- Node.js с поддержкой ES modules
- Переменная окружения `COMET_API_KEY` (для `createClient()`)

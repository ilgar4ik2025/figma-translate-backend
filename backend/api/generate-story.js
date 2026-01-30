import { createClient } from '../lib/CometAPIClient.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не поддерживается' });

  try {
    const { category, audience, style } = req.body;

    // Валидация входных параметров
    if (!category || typeof category !== 'string' || category.trim() === '') {
      return res.status(400).json({ error: 'Категория приложения обязательна' });
    }
    if (!audience || typeof audience !== 'string' || audience.trim() === '') {
      return res.status(400).json({ error: 'Целевая аудитория обязательна' });
    }
    if (!style || typeof style !== 'string' || style.trim() === '') {
      return res.status(400).json({ error: 'Стилевые предпочтения обязательны' });
    }

    // Формирование промпта для GPT
    const prompt = `You are an App Store marketing expert. Create a compelling 5-slide story for an app with the following details:

Category: ${category}
Target Audience: ${audience}
Style Preferences: ${style}

For each of the 5 slides, provide:
1. A short, impactful headline (max 6 words)
2. A descriptive subheadline (max 12 words)
3. A detailed visual description for background generation (2-3 sentences)

The slides should follow App Store best practices:
- Slide 1: Hook/Problem
- Slide 2: Solution/Key Feature
- Slide 3: Benefit/Value Proposition
- Slide 4: Social Proof/Trust
- Slide 5: Call to Action

Return the response as JSON in this format:
{
  "slides": [
    {
      "index": 0,
      "headline": "...",
      "subheadline": "...",
      "description": "..."
    },
    ...
  ]
}`;

    // Создание клиента и вызов GPT
    const client = createClient();
    const content = await client.callGPT(prompt, {
      model: 'chatgpt-4o-latest',
      temperature: 0.7
    });

    // Парсинг ответа в StoryStructure
    let story;
    try {
      // Извлечение JSON из ответа (может быть обернут в markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON не найден в ответе');
      }
      story = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Parse error:', parseError, 'Content:', content);
      return res.status(500).json({ 
        error: 'Не удалось обработать ответ AI. Попробуйте еще раз.' 
      });
    }

    // Валидация структуры ответа
    if (!story.slides || !Array.isArray(story.slides)) {
      return res.status(500).json({ 
        error: 'Некорректная структура ответа от AI' 
      });
    }

    if (story.slides.length !== 5) {
      return res.status(500).json({ 
        error: `Ожидалось 5 слайдов, получено ${story.slides.length}` 
      });
    }

    // Валидация каждого слайда
    for (let i = 0; i < story.slides.length; i++) {
      const slide = story.slides[i];
      if (typeof slide.index !== 'number' || 
          !slide.headline || typeof slide.headline !== 'string' ||
          !slide.subheadline || typeof slide.subheadline !== 'string' ||
          !slide.description || typeof slide.description !== 'string') {
        return res.status(500).json({ 
          error: `Слайд ${i} имеет некорректную структуру` 
        });
      }
    }

    res.status(200).json({ success: true, story });

  } catch (error) {
    console.error('GENERATE STORY ERROR:', error);
    
    // Понятные сообщения об ошибках
    let userMessage = 'Произошла ошибка при генерации истории';
    
    if (error.message) {
      userMessage = error.message;
    }
    
    res.status(500).json({ error: userMessage });
  }
}

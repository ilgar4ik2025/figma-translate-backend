# Документ дизайна: Screenshot Generator

## Обзор

Screenshot Generator - это вторая вкладка в существующем Figma-плагине "App Store Screenshot Translator PRO", которая позволяет пользователям генерировать профессиональные скриншоты для App Store с нуля, используя AI. Система использует философию совместного творчества: пользователь контролирует концепцию, а AI выполняет визуальную реализацию.

Архитектура основана на двух AI-моделях через CometAPI:
- **GPT (chatgpt-4o-latest)**: создание структуры истории из 5 слайдов, генерация заголовков и подзаголовков
- **Gemini 2.5 Pro**: генерация визуальных фонов с эстетикой App Store

Результат: 5 слайдов в портретном формате iPhone, каждый содержит AI-сгенерированный фон, заголовок, подзаголовок и мокап iPhone с опциональным скриншотом пользователя.

## Архитектура

### Общая структура

```
┌─────────────────────────────────────────────────────────┐
│                    Figma Plugin UI                       │
│  ┌──────────────┐              ┌──────────────────────┐ │
│  │   Вкладка 1  │              │     Вкладка 2        │ │
│  │  Localizer   │              │  Screenshot Gen      │ │
│  │  (existing)  │              │     (NEW)            │ │
│  └──────────────┘              └──────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Figma Plugin Code (code.ts)                 │
│  - Обработка сообщений от UI                            │
│  - Создание Figma-элементов (frames, rectangles, text)  │
│  - Управление состоянием                                │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│         Vercel Serverless Functions (Backend)            │
│  ┌────────────────────────────────────────────────────┐ │
│  │  /api/generate-story                               │ │
│  │  - Принимает: описание приложения                  │ │
│  │  - Вызывает: GPT через CometAPI                    │ │
│  │  - Возвращает: структура из 5 слайдов              │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  /api/generate-background                          │ │
│  │  - Принимает: описание слайда                      │ │
│  │  - Вызывает: Gemini через CometAPI                 │ │
│  │  - Возвращает: изображение фона (base64)           │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                      CometAPI                            │
│  ┌──────────────────┐      ┌──────────────────────────┐│
│  │  GPT Service     │      │  Gemini Service          ││
│  │  (text/story)    │      │  (image generation)      ││
│  └──────────────────┘      └──────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Поток данных

1. **Ввод пользователя** → UI собирает описание приложения, стиль, опциональные скриншоты
2. **Генерация структуры** → Backend вызывает GPT для создания 5-слайдовой истории
3. **Редактирование** → Пользователь может редактировать заголовки/подзаголовки
4. **Генерация фонов** → Backend параллельно вызывает Gemini для каждого слайда
5. **Композиция** → Plugin создает Figma-элементы: фон + текст + мокап
6. **Интеграция** → Результат готов для локализации через Вкладку 1

## Компоненты и интерфейсы

### 1. UI Components (ui.html)

#### TabManager
Управляет переключением между вкладками и сохранением состояния.

```typescript
interface TabManager {
  // Переключение на указанную вкладку
  switchTab(tabId: 'localizer' | 'generator'): void
  
  // Получение текущей активной вкладки
  getCurrentTab(): 'localizer' | 'generator'
  
  // Сохранение состояния неактивной вкладки
  saveTabState(tabId: string, state: any): void
  
  // Восстановление состояния вкладки
  restoreTabState(tabId: string): any
}
```

#### GeneratorForm
Форма для ввода описания приложения и загрузки скриншотов.

```typescript
interface GeneratorForm {
  // Данные формы
  appCategory: string          // Категория приложения
  targetAudience: string       // Целевая аудитория
  stylePreferences: string     // Стилевые предпочтения
  uploadedScreenshots: File[]  // Загруженные скриншоты (0-5)
  
  // Валидация формы
  validate(): ValidationResult
  
  // Получение данных для отправки
  getFormData(): AppDescription
  
  // Сброс формы
  reset(): void
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

interface AppDescription {
  category: string
  audience: string
  style: string
  screenshots?: string[]  // base64-encoded images
}
```

#### StoryEditor
Интерфейс для просмотра и редактирования сгенерированной структуры истории.

```typescript
interface StoryEditor {
  // Отображение структуры истории
  displayStory(story: StoryStructure): void
  
  // Редактирование слайда
  editSlide(slideIndex: number, updates: Partial<Slide>): void
  
  // Изменение порядка слайдов
  reorderSlides(newOrder: number[]): void
  
  // Регенерация отдельного слайда
  regenerateSlide(slideIndex: number): Promise<Slide>
  
  // Получение финальной структуры
  getFinalStory(): StoryStructure
}

interface StoryStructure {
  slides: Slide[]
}

interface Slide {
  index: number
  headline: string
  subheadline: string
  description: string  // Описание для генерации фона
  backgroundUrl?: string  // URL сгенерированного фона
}
```

#### ProgressIndicator
Отображение прогресса генерации.

```typescript
interface ProgressIndicator {
  // Установка текущего этапа
  setStage(stage: GenerationStage): void
  
  // Обновление прогресса (0-100)
  updateProgress(percent: number): void
  
  // Отображение оценочного времени
  setEstimatedTime(seconds: number): void
  
  // Отображение ошибки
  showError(message: string): void
  
  // Скрытие индикатора
  hide(): void
}

type GenerationStage = 
  | 'story-generation'
  | 'background-generation'
  | 'composition'
  | 'complete'
```

### 2. Plugin Code (code.ts)

#### MessageHandler
Обработка сообщений между UI и plugin code.

```typescript
interface MessageHandler {
  // Обработка входящих сообщений
  handleMessage(message: PluginMessage): Promise<void>
  
  // Отправка сообщения в UI
  sendToUI(message: UIMessage): void
}

type PluginMessage = 
  | { type: 'generate-story', data: AppDescription }
  | { type: 'generate-backgrounds', data: StoryStructure }
  | { type: 'create-slides', data: SlideCompositionData }
  | { type: 'regenerate-slide', data: { index: number, description: string } }

type UIMessage =
  | { type: 'story-generated', data: StoryStructure }
  | { type: 'background-generated', data: { index: number, url: string } }
  | { type: 'progress-update', data: { stage: GenerationStage, percent: number } }
  | { type: 'error', data: { message: string } }
  | { type: 'complete', data: { frameId: string } }
```

#### SlideComposer
Создание композиций слайдов в Figma.

```typescript
interface SlideComposer {
  // Создание всех 5 слайдов
  createSlides(data: SlideCompositionData): Promise<FrameNode>
  
  // Создание отдельного слайда
  createSingleSlide(slide: Slide, screenshot?: Uint8Array): Promise<FrameNode>
  
  // Создание фона
  createBackground(imageData: Uint8Array, width: number, height: number): Promise<RectangleNode>
  
  // Создание текстовых элементов
  createTextElements(headline: string, subheadline: string): Promise<TextNode[]>
  
  // Создание мокапа iPhone
  createiPhoneMockup(screenshot?: Uint8Array): Promise<FrameNode>
}

interface SlideCompositionData {
  story: StoryStructure
  screenshots?: Uint8Array[]
  dimensions: {
    width: number   // iPhone portrait width (1242px)
    height: number  // iPhone portrait height (2688px)
  }
}
```

#### ImageProcessor
Обработка изображений для Figma.

```typescript
interface ImageProcessor {
  // Создание изображения из base64
  createImageFromBase64(base64: string): Promise<Image>
  
  // Создание изображения из Uint8Array
  createImageFromBytes(bytes: Uint8Array): Promise<Image>
  
  // Оптимизация изображения для Figma
  optimizeImage(bytes: Uint8Array, maxSize: number): Promise<Uint8Array>
  
  // Масштабирование изображения
  scaleImage(bytes: Uint8Array, targetWidth: number, targetHeight: number): Promise<Uint8Array>
}
```

### 3. Backend API (Vercel Functions)

#### /api/generate-story

```typescript
interface GenerateStoryRequest {
  appDescription: AppDescription
}

interface GenerateStoryResponse {
  success: boolean
  story?: StoryStructure
  error?: string
}

// Функция обработки
async function generateStory(req: Request): Promise<Response> {
  // 1. Валидация входных данных
  // 2. Формирование промпта для GPT
  // 3. Вызов CometAPI (GPT)
  // 4. Парсинг ответа в StoryStructure
  // 5. Возврат результата
}
```

**Промпт для GPT:**
```
You are an App Store marketing expert. Create a compelling 5-slide story for an app with the following details:

Category: {category}
Target Audience: {audience}
Style Preferences: {style}

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
}
```

#### /api/generate-background

```typescript
interface GenerateBackgroundRequest {
  description: string
  style: string
  index: number
}

interface GenerateBackgroundResponse {
  success: boolean
  imageBase64?: string
  error?: string
}

// Функция обработки
async function generateBackground(req: Request): Promise<Response> {
  // 1. Валидация входных данных
  // 2. Формирование промпта для Gemini
  // 3. Вызов CometAPI (Gemini)
  // 4. Получение изображения
  // 5. Конвертация в base64
  // 6. Возврат результата
}
```

**Промпт для Gemini:**
```
Create a professional App Store screenshot background in iPhone portrait format (1242x2688px).

Visual Description: {description}
Style: {style}

Requirements:
- Clean, modern App Store aesthetic
- Suitable as background for text overlay
- Professional gradient or abstract design
- Colors should not be too saturated
- Leave space for text in upper and middle sections
- High quality, crisp details
- Portrait orientation (vertical)

Generate a visually appealing background that matches the description while maintaining readability for overlaid text.
```

#### CometAPIClient
Клиент для взаимодействия с CometAPI.

```typescript
interface CometAPIClient {
  // Вызов GPT
  callGPT(prompt: string, options?: GPTOptions): Promise<string>
  
  // Вызов Gemini для генерации изображения
  callGemini(prompt: string, options?: GeminiOptions): Promise<Uint8Array>
  
  // Обработка ошибок с повторными попытками
  retryWithBackoff<T>(fn: () => Promise<T>, maxRetries: number): Promise<T>
}

interface GPTOptions {
  model?: string  // default: 'chatgpt-4o-latest'
  temperature?: number
  maxTokens?: number
}

interface GeminiOptions {
  model?: string  // default: 'gemini-2.5-pro'
  width?: number
  height?: number
}
```

## Модели данных

### AppDescription
```typescript
interface AppDescription {
  category: string          // Категория приложения (e.g., "Productivity", "Health")
  audience: string          // Целевая аудитория (e.g., "Busy professionals")
  style: string            // Стилевые предпочтения (e.g., "Modern, minimalist")
  screenshots?: string[]   // Опциональные скриншоты (base64)
}
```

### StoryStructure
```typescript
interface StoryStructure {
  slides: Slide[]  // Всегда 5 слайдов
}

interface Slide {
  index: number              // 0-4
  headline: string           // Основной заголовок (max 6 слов)
  subheadline: string        // Подзаголовок (max 12 слов)
  description: string        // Описание для генерации фона
  backgroundUrl?: string     // URL сгенерированного фона (после генерации)
}
```

### SlideComposition
```typescript
interface SlideComposition {
  background: RectangleNode   // Фоновое изображение
  headline: TextNode          // Заголовок
  subheadline: TextNode       // Подзаголовок
  mockup: FrameNode          // iPhone мокап
  container: FrameNode        // Контейнер всего слайда
}
```

### PluginState
```typescript
interface PluginState {
  currentTab: 'localizer' | 'generator'
  generatorState: GeneratorState
  localizerState: any  // Существующее состояние
}

interface GeneratorState {
  appDescription?: AppDescription
  storyStructure?: StoryStructure
  generationProgress: {
    stage: GenerationStage
    percent: number
  }
  cache: {
    [key: string]: any  // Кэш для избежания повторных API-вызовов
  }
}
```

## Свойства корректности

*Свойство - это характеристика или поведение, которое должно выполняться во всех допустимых выполнениях системы - по сути, формальное утверждение о том, что система должна делать. Свойства служат мостом между человекочитаемыми спецификациями и машинно-проверяемыми гарантиями корректности.*

### Прework-анализ завершен

На основе анализа критериев приемки, я выявил следующие тестируемые свойства и устранил избыточность:

**Объединенные свойства:**
- 8.2 и 8.4 → Одно свойство о размерах изображений
- 9.2 и 9.5 → Одно свойство о регенерации слайдов
- 3.2 и 8.1 → Одно свойство о количестве слайдов
- 6.4 и 11.2 → Одно свойство об обработке ошибок

### Свойства корректности

**Свойство 1: Сохранение состояния вкладок**
*Для любого* состояния вкладки, если пользователь переключается на другую вкладку и затем возвращается обратно, состояние должно быть полностью восстановлено (включая значения полей формы, загруженные файлы, сгенерированный контент).
**Валидирует: Требования 1.3**

**Свойство 2: Валидация обязательных полей**
*Для любого* ввода формы, где хотя бы одно обязательное поле (категория, аудитория, стиль) пусто или содержит только пробелы, валидация должна провалиться и вернуть соответствующее сообщение об ошибке.
**Валидирует: Требования 2.2**

**Свойство 3: Валидация формата изображений**
*Для любого* загружаемого файла, если его MIME-тип не является одним из поддерживаемых форматов изображений (image/png, image/jpeg, image/jpg), валидация должна провалиться и вернуть сообщение об ошибке.
**Валидирует: Требования 2.4**

**Свойство 4: Генерация ровно 5 слайдов**
*Для любого* валидного описания приложения, система должна сгенерировать структуру истории, содержащую ровно 5 слайдов, и создать ровно 5 композиций в Figma.
**Валидирует: Требования 3.2, 8.1**

**Свойство 5: Полнота данных слайда**
*Для любого* слайда в сгенерированной структуре истории, слайд должен содержать непустые значения для полей headline, subheadline и description.
**Валидирует: Требования 3.3**

**Свойство 6: Количество фонов соответствует количеству слайдов**
*Для любого* запроса на генерацию фонов для N слайдов, система должна вернуть ровно N фоновых изображений.
**Валидирует: Требования 4.2**

**Свойство 7: Размеры изображений iPhone portrait**
*Для любого* сгенерированного фонового изображения или созданного слайда, размеры должны соответствовать портретной ориентации iPhone (ширина 1242px, высота 2688px, соотношение сторон ~9:19.5).
**Валидирует: Требования 4.4, 8.2, 8.4, 8.3**

**Свойство 8: Логика повторных попыток при ошибках**
*Для любого* API-запроса, который возвращает ошибку, система должна повторить запрос максимум 3 раза с экспоненциальной задержкой (1s, 2s, 4s) перед окончательным провалом.
**Валидирует: Требования 4.5, 6.5**

**Свойство 9: Создание композиций для всех слайдов**
*Для любого* успешно завершенного процесса генерации, в Figma должно быть создано ровно 5 FrameNode, каждый содержащий фон, заголовок, подзаголовок и мокап.
**Валидирует: Требования 5.1**

**Свойство 10: Позиционирование текстовых элементов**
*Для любого* созданного слайда, заголовок должен быть позиционирован в верхней трети слайда (y < height/3), а подзаголовок должен быть ниже заголовка (y_subheadline > y_headline).
**Валидирует: Требования 5.2**

**Свойство 11: Вставка скриншотов с сохранением пропорций**
*Для любого* загруженного пользователем скриншота, при вставке в мокап iPhone изображение должно быть масштабировано с сохранением исходного соотношения сторон (aspect ratio).
**Валидирует: Требования 5.3**

**Свойство 12: Иерархия элементов в Figma**
*Для любого* завершенного процесса генерации, все 5 слайдов должны быть дочерними элементами одного родительского FrameNode, и каждый слайд должен содержать ровно 4 дочерних элемента (фон, заголовок, подзаголовок, мокап).
**Валидирует: Требования 5.5**

**Свойство 13: Обработка ошибок API**
*Для любой* ошибки API (сетевая ошибка, таймаут, ошибка сервера), система должна отобразить пользователю понятное сообщение об ошибке на русском языке, описывающее проблему и возможные действия.
**Валидирует: Требования 6.4, 11.2**

**Свойство 14: Контракт API для генерации истории**
*Для любого* валидного AppDescription, отправленного в /api/generate-story, ответ должен содержать объект StoryStructure с массивом slides длиной 5, где каждый элемент имеет поля index, headline, subheadline, description.
**Валидирует: Требования 7.2**

**Свойство 15: Контракт API для генерации фона**
*Для любого* валидного описания слайда, отправленного в /api/generate-background, ответ должен содержать base64-encoded изображение или объект ошибки с полем error.
**Валидирует: Требования 7.3**

**Свойство 16: Валидация входных параметров API**
*Для любого* запроса к serverless-функциям с невалидными или отсутствующими обязательными параметрами, функция должна вернуть HTTP 400 с описанием ошибки валидации.
**Валидирует: Требования 7.4**

**Свойство 17: Совместимость с локализацией**
*Для любого* слайда, созданного Вкладкой_2, все текстовые элементы должны быть типа TextNode с доступным для редактирования свойством characters, чтобы Вкладка_1 могла их обработать.
**Валидирует: Требования 8.5, 10.1, 10.2**

**Свойство 18: Регенерация отдельных слайдов**
*Для любого* слайда с индексом i (0 ≤ i < 5), система должна позволить регенерировать только этот слайд без изменения остальных 4 слайдов.
**Валидирует: Требования 9.2, 9.5**

**Свойство 19: Изменение порядка слайдов**
*Для любой* перестановки индексов [0,1,2,3,4], система должна переупорядочить слайды согласно новому порядку, сохраняя все данные каждого слайда.
**Валидирует: Требования 9.4**

**Свойство 20: Персистентность созданных элементов**
*Для любого* набора слайдов, созданных Вкладкой_2, после переключения на Вкладку_1 и обратно на Вкладку_2, все созданные FrameNode должны оставаться в документе Figma с теми же ID.
**Валидирует: Требования 10.3**

**Свойство 21: Сохранение мокапов при локализации**
*Для любого* слайда, содержащего мокап iPhone, после применения локализации текста через Вкладку_1, структура и содержимое мокапа (включая вставленный скриншот) должны остаться неизменными.
**Валидирует: Требования 10.4**

**Свойство 22: Сохранение ввода при ошибке**
*Для любого* состояния формы GeneratorForm, если генерация завершается ошибкой, все поля формы (category, audience, style, uploadedScreenshots) должны сохранить свои значения для повторной попытки.
**Валидирует: Требования 11.3**

**Свойство 23: Производительность генерации истории**
*Для любого* валидного описания приложения, время выполнения запроса к /api/generate-story должно быть меньше 30 секунд.
**Валидирует: Требования 12.1**

**Свойство 24: Оптимизация больших изображений**
*Для любого* изображения размером больше 5MB, система должна оптимизировать его (сжатие, изменение размера) до размера меньше 5MB перед вставкой в Figma, сохраняя визуальное качество.
**Валидирует: Требования 12.4**

**Свойство 25: Кэширование контента**
*Для любого* повторного запроса того же контента (тот же AppDescription или тот же slide description), система должна вернуть закэшированный результат без выполнения нового API-запроса к CometAPI.
**Валидирует: Требования 12.5**

## Обработка ошибок

### Категории ошибок

1. **Ошибки валидации пользовательского ввода**
   - Пустые обязательные поля
   - Неподдерживаемые форматы файлов
   - Слишком большие файлы (>10MB)
   - Обработка: Отображение сообщения об ошибке в UI, блокировка кнопки отправки

2. **Ошибки API**
   - Сетевые ошибки (нет соединения)
   - Таймауты (>30s для GPT, >60s для Gemini)
   - Ошибки сервера (5xx)
   - Rate limiting (429)
   - Обработка: Повторные попытки с экспоненциальной задержкой, затем понятное сообщение пользователю

3. **Ошибки Figma API**
   - Невозможность создать элемент
   - Недостаточно памяти
   - Обработка: Откат изменений, сообщение об ошибке, предложение уменьшить размер изображений

4. **Ошибки парсинга**
   - Невалидный JSON от API
   - Отсутствующие обязательные поля в ответе
   - Обработка: Логирование ошибки, повторная попытка, сообщение пользователю

### Стратегия обработки

```typescript
interface ErrorHandler {
  // Обработка ошибки с контекстом
  handleError(error: Error, context: ErrorContext): ErrorResponse
  
  // Определение, можно ли повторить операцию
  isRetryable(error: Error): boolean
  
  // Получение понятного сообщения для пользователя
  getUserMessage(error: Error): string
}

interface ErrorContext {
  operation: string  // Название операции
  attempt: number    // Номер попытки
  data?: any        // Контекстные данные
}

interface ErrorResponse {
  shouldRetry: boolean
  retryDelay?: number  // Задержка в мс
  userMessage: string
  logMessage: string
}
```

### Примеры сообщений об ошибках

- **Валидация**: "Пожалуйста, заполните все обязательные поля: категория, аудитория, стиль"
- **Формат файла**: "Поддерживаются только изображения в форматах PNG и JPEG"
- **API таймаут**: "Генерация заняла слишком много времени. Попробуйте упростить описание или повторите попытку"
- **Rate limit**: "Слишком много запросов. Пожалуйста, подождите 1 минуту и попробуйте снова"
- **Сетевая ошибка**: "Не удалось подключиться к серверу. Проверьте интернет-соединение"

## Стратегия тестирования

### Двойной подход к тестированию

Система требует как unit-тестов, так и property-based тестов для комплексного покрытия:

**Unit-тесты** проверяют:
- Конкретные примеры корректного поведения
- Граничные случаи (пустые массивы, максимальные размеры)
- Интеграционные точки между компонентами
- Условия ошибок

**Property-based тесты** проверяют:
- Универсальные свойства, которые должны выполняться для всех входных данных
- Комплексное покрытие входных данных через рандомизацию
- Инварианты системы

### Конфигурация property-based тестов

- **Библиотека**: fast-check (для TypeScript/JavaScript)
- **Минимум итераций**: 100 на каждый property-тест
- **Формат тега**: `Feature: screenshot-generator, Property {number}: {property_text}`

### Примеры тестов

#### Unit-тест: Валидация формы
```typescript
describe('GeneratorForm validation', () => {
  it('should reject empty required fields', () => {
    const form = new GeneratorForm({
      appCategory: '',
      targetAudience: 'Professionals',
      stylePreferences: 'Modern'
    });
    
    const result = form.validate();
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Категория приложения обязательна');
  });
  
  it('should accept valid form data', () => {
    const form = new GeneratorForm({
      appCategory: 'Productivity',
      targetAudience: 'Professionals',
      stylePreferences: 'Modern'
    });
    
    const result = form.validate();
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
```

#### Property-тест: Генерация ровно 5 слайдов
```typescript
import fc from 'fast-check';

// Feature: screenshot-generator, Property 4: Генерация ровно 5 слайдов
describe('Story generation properties', () => {
  it('should always generate exactly 5 slides', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          category: fc.string({ minLength: 1, maxLength: 50 }),
          audience: fc.string({ minLength: 1, maxLength: 100 }),
          style: fc.string({ minLength: 1, maxLength: 100 })
        }),
        async (appDescription) => {
          const story = await generateStory(appDescription);
          expect(story.slides).toHaveLength(5);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

#### Property-тест: Сохранение пропорций изображения
```typescript
// Feature: screenshot-generator, Property 11: Вставка скриншотов с сохранением пропорций
describe('Image scaling properties', () => {
  it('should preserve aspect ratio when scaling screenshots', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          width: fc.integer({ min: 100, max: 4000 }),
          height: fc.integer({ min: 100, max: 4000 }),
          imageData: fc.uint8Array({ minLength: 1000, maxLength: 10000 })
        }),
        async ({ width, height, imageData }) => {
          const originalAspectRatio = width / height;
          const scaled = await scaleImageForMockup(imageData, width, height);
          const newAspectRatio = scaled.width / scaled.height;
          
          // Допускаем погрешность 0.01 из-за округления
          expect(Math.abs(originalAspectRatio - newAspectRatio)).toBeLessThan(0.01);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

#### Property-тест: Логика повторных попыток
```typescript
// Feature: screenshot-generator, Property 8: Логика повторных попыток при ошибках
describe('Retry logic properties', () => {
  it('should retry exactly 3 times with exponential backoff', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          let attemptCount = 0;
          const timestamps: number[] = [];
          
          const mockApiCall = jest.fn().mockImplementation(() => {
            attemptCount++;
            timestamps.push(Date.now());
            throw new Error('API Error');
          });
          
          try {
            await retryWithBackoff(mockApiCall, 3);
          } catch (e) {
            // Ожидаем ошибку после всех попыток
          }
          
          expect(attemptCount).toBe(4); // 1 начальная + 3 повтора
          
          // Проверяем экспоненциальные задержки
          if (timestamps.length >= 2) {
            const delay1 = timestamps[1] - timestamps[0];
            const delay2 = timestamps[2] - timestamps[1];
            const delay3 = timestamps[3] - timestamps[2];
            
            expect(delay1).toBeGreaterThanOrEqual(900); // ~1s
            expect(delay2).toBeGreaterThanOrEqual(1900); // ~2s
            expect(delay3).toBeGreaterThanOrEqual(3900); // ~4s
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Тестирование интеграции

Для проверки взаимодействия между компонентами:

1. **Mock CometAPI**: Использовать моки для API-вызовов в тестах
2. **Mock Figma API**: Использовать моки для создания элементов Figma
3. **E2E тесты**: Минимальный набор end-to-end тестов для критических путей

### Покрытие кода

Целевые показатели:
- **Общее покрытие**: >80%
- **Критические пути** (генерация, композиция): >90%
- **Обработка ошибок**: >85%

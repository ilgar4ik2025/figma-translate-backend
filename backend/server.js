import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import API handlers
import generateStory from './api/generate-story.js';
import generateBackground from './api/generate-background.js';
import translate from './api/translate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Figma Screenshot Generator Backend',
    endpoints: [
      '/api/generate-story',
      '/api/generate-background',
      '/api/translate'
    ]
  });
});

// API Routes - wrap Vercel-style handlers for Express
app.post('/api/generate-story', async (req, res) => {
  try {
    await generateStory(req, res);
  } catch (error) {
    console.error('Error in generate-story:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/generate-background', async (req, res) => {
  try {
    await generateBackground(req, res);
  } catch (error) {
    console.error('Error in generate-background:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/translate', async (req, res) => {
  try {
    await translate(req, res);
  } catch (error) {
    console.error('Error in translate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle OPTIONS requests
app.options('*', cors());

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/`);
});

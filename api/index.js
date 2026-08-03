const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api', (req, res) => {
  res.send('TTS Сервер Vercel работает!');
});

app.post('/api', async (req, res) => {
  try {
    const { text, voice = 'ru-RU-SvetlanaNeural' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Поле text обязательно' });
    }

    // Безопасная кодировка текста
    const encodedText = encodeURIComponent(text);
    
    // Прямой запрос к надежному публичному эндпоинту Edge TTS
    const ttsUrl = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodedText}`;

    const response = await fetch(ttsUrl);

    if (!response.ok) {
      throw new Error(`Ошибка генерации звука на стороне TTS: status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'inline; filename="speech.mp3"');
    res.send(audioBuffer);

  } catch (error) {
    console.error('Ошибка генерации TTS:', error);
    res.status(500).json({ error: 'Ошибка генерации речи', details: error.message });
  }
});

module.exports = app;
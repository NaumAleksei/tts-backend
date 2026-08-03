const express = require('express');
const cors = require('cors');
const { EdgeTTS } = require('edge-tts');

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api', async (req, res) => {
  try {
    const { text, voice = 'ru-RU-SvetlanaNeural' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Поле text обязательно' });
    }

    const tts = new EdgeTTS({
      voice: voice,
      lang: 'ru-RU',
      outputFormat: 'audio-24khz-96kbitrate-mono-mp3'
    });

    await tts.synthesis(text);
    const audioBuffer = tts.getAudio();

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'inline; filename="speech.mp3"');
    res.send(audioBuffer);

  } catch (error) {
    console.error('Ошибка генерации TTS:', error);
    res.status(500).json({ error: 'Ошибка генерации речи', details: error.message });
  }
});

module.exports = app;
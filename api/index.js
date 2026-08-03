const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api', (req, res) => {
  res.status(200).send('TTS Server is active');
});

app.post('/api', async (req, res) => {
  try {
    const { text, voice = 'ru-RU-SvetlanaNeural' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const encodedText = encodeURIComponent(text);
    const url = `https://api.streamelements.com/kappa/v2/speech?voice=${voice}&text=${encodedText}`;

    https.get(url, (apiRes) => {
      if (apiRes.statusCode !== 200) {
        res.status(500).json({ error: `TTS Provider HTTP ${apiRes.statusCode}` });
        return;
      }

      const chunks = [];
      apiRes.on('data', (chunk) => chunks.push(chunk));
      apiRes.on('end', () => {
        const audioBuffer = Buffer.concat(chunks);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioBuffer.length);
        res.send(audioBuffer);
      });
    }).on('error', (err) => {
      console.error('HTTPS Error:', err);
      res.status(500).json({ error: 'Failed to request TTS', details: err.message });
    });

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

module.exports = app;
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Вспомогательная функция синтеза через официальный WebSocket Edge
function generateSpeech(text, voice) {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomBytes(16).toString('hex').toUpperCase();
    const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EA5E40818322388D65D16F91&ConnectionId=${requestId}`;

    const ws = new WebSocket(wsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Origin': 'chrome-extension://jdiccldimpdaibocqbgmlgpfmnnogmlb'
      }
    });

    const audioChunks = [];

    ws.on('open', () => {
      // 1. Конфигурация формата аудио
      const configMessage = 
        `X-Timestamp:${new Date().toISOString()}\r\n` +
        `Content-Type:application/json; charset=utf-8\r\n` +
        `Path:speech.config\r\n\r\n` +
        `{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-96kbitrate-mono-mp3"}}}}`;

      ws.send(configMessage);

      // 2. Шаблон SSML с текстом и голосом
      const ssml = 
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ru-RU'>` +
        `<voice name='${voice}'>${text}</voice>` +
        `</speak>`;

      const ssmlMessage = 
        `X-RequestId:${requestId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `Path:ssml\r\n\r\n` +
        `${ssml}`;

      ws.send(ssmlMessage);
    });

    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        // Пропускаем заголовок пакета (начинается после маркера Path:audio\r\n)
        const strData = data.toString('utf-8', 0, 100);
        const headerIndex = strData.indexOf('Path:audio\r\n');
        if (headerIndex !== -1) {
          const bodyStart = data.indexOf(Buffer.from('\r\n\r\n', 'utf-8'), headerIndex) + 4;
          if (bodyStart > 4) {
            audioChunks.push(data.subarray(bodyStart));
          }
        }
      }
    });

    ws.on('close', () => {
      if (audioChunks.length > 0) {
        resolve(Buffer.concat(audioChunks));
      } else {
        reject(new Error('Не удалось получить аудиоданные от сервиса Edge.'));
      }
    });

    ws.on('error', (err) => {
      reject(err);
    });
  });
}

app.post('/api', async (req, res) => {
  try {
    const { text, voice = 'ru-RU-SvetlanaNeural' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Поле text обязательно' });
    }

    const audioBuffer = await generateSpeech(text, voice);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'inline; filename="speech.mp3"');
    res.send(audioBuffer);

  } catch (error) {
    console.error('Ошибка генерации TTS:', error);
    res.status(500).json({ error: 'Ошибка генерации речи', details: error.message });
  }
});

module.exports = app;
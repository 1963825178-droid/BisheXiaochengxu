const express = require('express');
const emotionRouter = require('./routes/emotion');
const { PORT } = require('./config/env');

const app = express();

app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/emotion', emotionRouter);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Emotion server listening on http://127.0.0.1:${PORT}`);
  });
}

module.exports = app;

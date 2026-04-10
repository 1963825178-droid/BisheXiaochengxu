const express = require('express');
const emotionProvider = require('../services/emotionProvider');
const { normalizeEmotionResult } = require('../services/normalizeEmotionResult');
const { applyRiskGuard } = require('../services/riskGuard');

const router = express.Router();

function resolveStatus(code) {
  if (code === 'INVALID_INPUT') {
    return 400;
  }
  if (code === 'AI_PROVIDER_FAILED' || code === 'AI_RESPONSE_INVALID' || code === 'AI_PROVIDER_NOT_CONFIGURED') {
    return 502;
  }
  return 500;
}

router.post('/analyze', async (req, res) => {
  const rawInput = req.body && typeof req.body.rawInput === 'string' ? req.body.rawInput.trim() : '';
  if (!rawInput) {
    return res.status(400).json({
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'rawInput 不能为空'
      }
    });
  }

  try {
    const providerResult = await emotionProvider.analyze(rawInput);
    const normalized = normalizeEmotionResult(providerResult, rawInput);
    const safeResult = applyRiskGuard(normalized);

    return res.json({
      ok: true,
      data: safeResult
    });
  } catch (error) {
    const code = error && error.code ? error.code : 'INTERNAL_ERROR';
    return res.status(resolveStatus(code)).json({
      ok: false,
      error: {
        code,
        message: error && error.message ? error.message : '情绪分析服务暂时不可用'
      }
    });
  }
});

module.exports = router;

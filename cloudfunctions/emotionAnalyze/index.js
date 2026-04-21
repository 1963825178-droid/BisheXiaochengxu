const cloud = require('wx-server-sdk');
const emotionProvider = require('./services/emotionProvider');
const { normalizeEmotionResult } = require('./services/normalizeEmotionResult');
const { applyRiskGuard } = require('./services/riskGuard');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

function resolveError(error) {
  if (!error) {
    return {
      code: 'INTERNAL_ERROR',
      message: '情绪分析服务暂时不可用'
    };
  }

  return {
    code: error.code || 'INTERNAL_ERROR',
    message: error.message || '情绪分析服务暂时不可用'
  };
}

exports.main = async (event) => {
  const rawInput = event && typeof event.rawInput === 'string' ? event.rawInput.trim() : '';
  if (!rawInput) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'rawInput 不能为空'
      }
    };
  }

  try {
    const providerResult = await emotionProvider.analyze(rawInput);
    const normalized = normalizeEmotionResult(providerResult, rawInput);
    const safeResult = applyRiskGuard(normalized);

    return {
      ok: true,
      data: safeResult
    };
  } catch (error) {
    return {
      ok: false,
      error: resolveError(error)
    };
  }
};

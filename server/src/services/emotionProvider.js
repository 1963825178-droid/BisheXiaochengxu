const { AI_PROVIDER } = require('../config/env');
const stubProvider = require('./providers/stubProvider');
const deepseekProvider = require('./providers/deepseekProvider');
const openaiCompatibleProvider = require('./providers/openaiCompatibleProvider');

function getProvider() {
  if (AI_PROVIDER === 'deepseek') {
    return deepseekProvider;
  }

  if (AI_PROVIDER === 'openai-compatible') {
    return openaiCompatibleProvider;
  }

  return stubProvider;
}

function shouldUseFallback(error) {
  const code = error && error.code ? error.code : '';
  return [
    'AI_PROVIDER_TIMEOUT',
    'AI_PROVIDER_BUSY',
    'AI_PROVIDER_FAILED',
    'AI_RESPONSE_INVALID',
    'AI_PROVIDER_NOT_CONFIGURED'
  ].indexOf(code) > -1;
}

async function analyze(rawInput) {
  const provider = getProvider();
  try {
    return await provider.analyze(rawInput);
  } catch (error) {
    if (provider === stubProvider || !shouldUseFallback(error)) {
      throw error;
    }

    console.warn('emotion provider fallback', {
      code: error && error.code ? error.code : 'UNKNOWN_ERROR',
      message: error && error.message ? error.message : '真实分析失败'
    });

    const fallbackResult = await stubProvider.analyze(rawInput);
    return Object.assign({}, fallbackResult, {
      source: 'mock'
    });
  }
}

module.exports = {
  analyze
};

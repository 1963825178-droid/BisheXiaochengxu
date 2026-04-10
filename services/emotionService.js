const { ALLOW_MOCK_DEMO } = require('../config/env');
const apiClient = require('./apiClient');
const { normalizeEmotionResult } = require('./emotionEngine');
const { analyzeEmotionText } = require('./mockEmotion');

function normalizeError(error) {
  if (!error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: '真实分析暂时不可用，请稍后再试'
    };
  }

  return {
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message || '真实分析暂时不可用，请稍后再试'
  };
}

async function analyze(rawInput) {
  try {
    const response = await apiClient.post('/api/emotion/analyze', {
      rawInput
    });

    if (!response || response.ok !== true || !response.data) {
      throw {
        code: 'INVALID_RESPONSE',
        message: '分析结果格式异常，请稍后再试'
      };
    }

    return normalizeEmotionResult(response.data, {
      defaultSource: 'ai'
    });
  } catch (error) {
    throw normalizeError(error);
  }
}

function analyzeWithMock(rawInput) {
  return normalizeEmotionResult(analyzeEmotionText(rawInput), {
    defaultSource: 'mock'
  });
}

function canUseMockDemo() {
  return ALLOW_MOCK_DEMO;
}

module.exports = {
  analyze,
  analyzeWithMock,
  canUseMockDemo,
  normalizeError
};

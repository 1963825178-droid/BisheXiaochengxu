const { ALLOW_MOCK_DEMO, BACKEND_MODE } = require('../utils/runtimeConfig');
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

async function analyzeWithLocalHttp(rawInput) {
  const response = await apiClient.post('/api/emotion/analyze', {
    rawInput
  });

  if (!response || response.ok !== true || !response.data) {
    throw {
      code: 'INVALID_RESPONSE',
      message: '分析结果格式异常，请稍后再试'
    };
  }

  return response.data;
}

async function analyzeWithCloudFunction(rawInput) {
  if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') {
    throw {
      code: 'CLOUD_NOT_AVAILABLE',
      message: '当前环境未启用云开发能力，请稍后再试'
    };
  }

  const response = await wx.cloud.callFunction({
    name: 'emotionAnalyze',
    data: { rawInput }
  });

  const result = response && response.result ? response.result : null;
  if (!result || result.ok !== true || !result.data) {
    const error = result && result.error ? result.error : null;
    throw {
      code: error && error.code ? error.code : 'INVALID_RESPONSE',
      message: error && error.message ? error.message : '分析结果格式异常，请稍后再试'
    };
  }

  return result.data;
}

async function analyze(rawInput) {
  try {
    const payload = BACKEND_MODE === 'local-http'
      ? await analyzeWithLocalHttp(rawInput)
      : await analyzeWithCloudFunction(rawInput);

    return normalizeEmotionResult(payload, {
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

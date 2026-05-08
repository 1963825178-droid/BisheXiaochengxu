const https = require('https');
const { DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL } = require('../env');
const { SYSTEM_PROMPT, buildUserPrompt } = require('../emotionPrompt');

const PROVIDER_TIMEOUT_MS = 18000;

function extractJsonText(content) {
  if (typeof content !== 'string') {
    return '';
  }

  const trimmed = content.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }

  return trimmed;
}

function isProviderBusy(statusCode, message) {
  return (
    statusCode === 429 ||
    statusCode === 503 ||
    /service is too busy|temporarily switch|too many requests|rate limit|overloaded/i.test(message || '')
  );
}

function requestJson(url, options, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({
          statusCode: res.statusCode || 500,
          body: text
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      const error = new Error('真实分析服务响应超时，请稍后重试，或先使用演示分析。');
      error.code = 'AI_PROVIDER_TIMEOUT';
      req.destroy(error);
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

async function analyze(rawInput) {
  if (!DEEPSEEK_API_KEY || !DEEPSEEK_BASE_URL || !DEEPSEEK_MODEL) {
    const error = new Error('DeepSeek provider 尚未完成配置');
    error.code = 'AI_PROVIDER_NOT_CONFIGURED';
    throw error;
  }

  const requestBody = JSON.stringify({
    model: DEEPSEEK_MODEL,
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: buildUserPrompt(rawInput)
      }
    ],
    response_format: {
      type: 'json_object'
    },
    temperature: 0.2,
    max_tokens: 900,
    stream: false
  });

  let response;
  try {
    response = await requestJson(
      `${DEEPSEEK_BASE_URL.replace(/\/$/, '')}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`
        }
      },
      requestBody,
      PROVIDER_TIMEOUT_MS
    );
  } catch (requestError) {
    const isTimeout = requestError && requestError.code === 'AI_PROVIDER_TIMEOUT';
    const error = new Error(
      isTimeout
        ? '真实分析服务响应超时，请稍后重试，或先使用演示分析。'
        : 'DeepSeek 服务请求失败，请检查网络或稍后再试'
    );
    error.code = isTimeout ? 'AI_PROVIDER_TIMEOUT' : 'AI_PROVIDER_FAILED';
    throw error;
  }

  let payload = null;
  try {
    payload = response.body ? JSON.parse(response.body) : null;
  } catch (parseError) {
    const error = new Error('DeepSeek 返回内容不是合法 JSON');
    error.code = 'AI_RESPONSE_INVALID';
    throw error;
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    const providerMessage = payload && payload.error && payload.error.message
      ? payload.error.message
      : 'DeepSeek 服务请求失败';
    const busy = isProviderBusy(response.statusCode, providerMessage);
    const error = new Error(busy ? '真实分析服务当前繁忙，请稍后重试，或先使用演示分析。' : providerMessage);
    error.code = busy
      ? 'AI_PROVIDER_BUSY'
      : response.statusCode === 401 || response.statusCode === 403
      ? 'AI_PROVIDER_AUTH_FAILED'
      : 'AI_PROVIDER_FAILED';
    throw error;
  }

  const choice = payload && payload.choices && payload.choices[0] ? payload.choices[0] : null;
  if (!choice || !choice.message) {
    const error = new Error('DeepSeek 返回内容缺少 message');
    error.code = 'AI_RESPONSE_INVALID';
    throw error;
  }

  if (choice.finish_reason === 'length') {
    const error = new Error('DeepSeek 返回内容被截断，请稍后重试');
    error.code = 'AI_RESPONSE_INVALID';
    throw error;
  }

  const jsonText = extractJsonText(choice.message.content);
  if (!jsonText) {
    const error = new Error('DeepSeek 返回内容为空');
    error.code = 'AI_RESPONSE_INVALID';
    throw error;
  }

  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    const error = new Error('DeepSeek 返回 JSON 解析失败');
    error.code = 'AI_RESPONSE_INVALID';
    throw error;
  }
}

module.exports = {
  analyze
};

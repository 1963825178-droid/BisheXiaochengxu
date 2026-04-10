const { AI_BASE_URL, AI_API_KEY, AI_MODEL } = require('../../config/env');
const { SYSTEM_PROMPT, buildUserPrompt } = require('../emotionPrompt');

function extractJsonText(content) {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        if (item && typeof item.text === 'string') {
          return item.text;
        }
        return '';
      })
      .join('');
  }

  return '';
}

async function analyze(rawInput) {
  if (!AI_BASE_URL || !AI_API_KEY || !AI_MODEL) {
    const error = new Error('真实 AI provider 尚未完成配置');
    error.code = 'AI_PROVIDER_NOT_CONFIGURED';
    throw error;
  }

  const response = await fetch(`${AI_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`
    },
    body: JSON.stringify({
      model: AI_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: buildUserPrompt(rawInput)
        }
      ]
    })
  });

  if (!response.ok) {
    const error = new Error('AI 服务请求失败');
    error.code = 'AI_PROVIDER_FAILED';
    throw error;
  }

  const payload = await response.json();
  const content = payload && payload.choices && payload.choices[0] && payload.choices[0].message
    ? payload.choices[0].message.content
    : '';

  const jsonText = extractJsonText(content);
  if (!jsonText) {
    const error = new Error('AI 返回内容为空');
    error.code = 'AI_RESPONSE_INVALID';
    throw error;
  }

  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    const error = new Error('AI 返回 JSON 解析失败');
    error.code = 'AI_RESPONSE_INVALID';
    throw error;
  }
}

module.exports = {
  analyze
};

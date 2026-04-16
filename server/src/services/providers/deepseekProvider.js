const { DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL } = require('../../config/env');
const { SYSTEM_PROMPT, buildUserPrompt } = require('../emotionPrompt');

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

async function analyze(rawInput) {
  if (!DEEPSEEK_API_KEY || !DEEPSEEK_BASE_URL || !DEEPSEEK_MODEL) {
    const error = new Error('DeepSeek provider 灏氭湭瀹屾垚閰嶇疆');
    error.code = 'AI_PROVIDER_NOT_CONFIGURED';
    throw error;
  }

  let response;
  try {
    response = await fetch(`${DEEPSEEK_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
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
        max_tokens: 1200,
        stream: false
      })
    });
  } catch (requestError) {
    const error = new Error('DeepSeek 鏈嶅姟璇锋眰澶辫触锛岃妫€鏌ョ綉缁滄垨绋嶅悗鍐嶈瘯');
    error.code = 'AI_PROVIDER_FAILED';
    throw error;
  }

  const responseText = await response.text();
  let payload = null;
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch (parseError) {
    const error = new Error('DeepSeek 杩斿洖鍐呭涓嶆槸鍚堟硶 JSON');
    error.code = 'AI_RESPONSE_INVALID';
    throw error;
  }

  if (!response.ok) {
    const providerMessage = payload && payload.error && payload.error.message ? payload.error.message : 'DeepSeek 鏈嶅姟璇锋眰澶辫触';
    const error = new Error(providerMessage);
    error.code = response.status === 401 || response.status === 403 ? 'AI_PROVIDER_AUTH_FAILED' : 'AI_PROVIDER_FAILED';
    throw error;
  }

  const choice = payload && payload.choices && payload.choices[0] ? payload.choices[0] : null;
  if (!choice || !choice.message) {
    const error = new Error('DeepSeek 杩斿洖鍐呭缂哄皯 message');
    error.code = 'AI_RESPONSE_INVALID';
    throw error;
  }

  if (choice.finish_reason === 'length') {
    const error = new Error('DeepSeek response was truncated. Please try again later.');
    error.code = 'AI_RESPONSE_INVALID';
    throw error;
  }

  const jsonText = extractJsonText(choice.message.content);
  if (!jsonText) {
    const error = new Error('DeepSeek 杩斿洖鍐呭涓虹┖');
    error.code = 'AI_RESPONSE_INVALID';
    throw error;
  }

  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    const error = new Error('DeepSeek 杩斿洖 JSON 瑙ｆ瀽澶辫触');
    error.code = 'AI_RESPONSE_INVALID';
    throw error;
  }
}

module.exports = {
  analyze
};

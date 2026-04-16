function ensureArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function ensureString(value, fallbackValue) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallbackValue;
}

function normalizeEmotionResult(payload, rawInput) {
  const safePayload = payload && typeof payload === 'object' ? payload : null;
  if (!safePayload) {
    const error = new Error('AI 返回结果不是合法对象');
    error.code = 'AI_RESPONSE_INVALID';
    throw error;
  }

  const mainEmotion = ensureString(safePayload.mainEmotion, '茫然');
  const subEmotions = ensureArray(safePayload.subEmotions).slice(0, 5);
  const explanations = ensureObject(safePayload.explanations);

  [mainEmotion].concat(subEmotions).filter(Boolean).forEach((emotion) => {
    if (!explanations[emotion]) {
      explanations[emotion] = `「${emotion}」是这段表达里比较突出的感受，需要结合上下文继续理解。`;
    }
  });

  return {
    rawInput,
    mainEmotion,
    subEmotions,
    explanations,
    analysis: ensureString(safePayload.analysis, '这段表达里有比较复杂的情绪拉扯，值得被认真对待。'),
    isNegative: typeof safePayload.isNegative === 'boolean' ? safePayload.isNegative : true,
    isHighRisk: Boolean(safePayload.isHighRisk),
    suggestion: ensureString(safePayload.suggestion, '先把情绪放稳，再决定下一步要怎么做。'),
    source: 'ai'
  };
}

module.exports = {
  normalizeEmotionResult
};
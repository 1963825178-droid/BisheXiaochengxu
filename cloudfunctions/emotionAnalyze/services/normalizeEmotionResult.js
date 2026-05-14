function ensureArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function ensureString(value, fallbackValue) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallbackValue;
}

function normalizeRiskLevel(value, fallbackValue) {
  const allowedLevels = ['none', 'mild', 'medium', 'high'];
  if (allowedLevels.includes(value)) {
    return value;
  }

  return allowedLevels.includes(fallbackValue) ? fallbackValue : 'none';
}

function normalizeRiskType(value, fallbackValue) {
  const allowedTypes = ['none', 'self_harm', 'harm_others', 'crisis', 'abuse'];
  if (allowedTypes.includes(value)) {
    return value;
  }

  return allowedTypes.includes(fallbackValue) ? fallbackValue : 'none';
}

function normalizeForeignEmotionWord(value) {
  const source = ensureObject(value);
  const word = ensureString(source.word, '');
  const language = ensureString(source.language, '');
  const meaning = ensureString(source.meaning, '');

  if (!word || !language || !meaning) {
    return null;
  }

  return {
    word,
    language,
    meaning
  };
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
  const fallbackRiskLevel = safePayload.isHighRisk ? 'high' : 'none';
  const riskLevel = normalizeRiskLevel(safePayload.riskLevel, fallbackRiskLevel);
  const riskType = normalizeRiskType(safePayload.riskType, riskLevel === 'high' ? 'crisis' : 'none');
  const riskSignal = typeof safePayload.riskSignal === 'boolean'
    ? safePayload.riskSignal
    : riskLevel !== 'none';

  [mainEmotion].concat(subEmotions).filter(Boolean).forEach((emotion) => {
    if (!explanations[emotion]) {
      explanations[emotion] = `“${emotion}”在这段表达里比较突出，像是在提醒你：这份感受已经值得被看见。`;
    }
  });

  return {
    rawInput,
    mainEmotion,
    subEmotions,
    explanations,
    foreignEmotionWord: normalizeForeignEmotionWord(safePayload.foreignEmotionWord),
    analysis: ensureString(safePayload.analysis, '这段表达里有比较复杂的情绪拉扯，值得被认真对待。'),
    isNegative: typeof safePayload.isNegative === 'boolean' ? safePayload.isNegative : true,
    riskLevel,
    riskType,
    riskSignal,
    riskReason: ensureString(safePayload.riskReason, ''),
    isHighRisk: riskLevel === 'high',
    suggestion: ensureString(safePayload.suggestion, '先把情绪放稳，再决定下一步要怎么做。'),
    source: ensureString(safePayload.source, 'ai')
  };
}

module.exports = {
  normalizeEmotionResult
};

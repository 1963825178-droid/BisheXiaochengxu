const { formatDateKey } = require('../utils/time');

const HIGH_RISK_SUGGESTION =
  '如果你已经有伤害自己或结束生命的想法，请优先联系身边可信任的人陪着你，或尽快联系当地心理援助热线、医院急诊或紧急求助渠道。先确保自己不是一个人。';
const HARM_OTHERS_HIGH_RISK_SUGGESTION =
  '先尽量远离冲突对象，暂停继续发送攻击性信息。可以联系可信任的人、辅导员、家人、老师或相关人员帮助介入。如果你担心自己会失控伤人，请立即寻求现实紧急帮助。';

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeRiskLevel(value, fallbackValue) {
  const allowedLevels = ['none', 'mild', 'medium', 'high'];
  if (allowedLevels.indexOf(value) > -1) {
    return value;
  }

  return allowedLevels.indexOf(fallbackValue) > -1 ? fallbackValue : 'none';
}

function normalizeRiskType(value, fallbackValue) {
  const allowedTypes = ['none', 'self_harm', 'harm_others', 'crisis', 'abuse'];
  if (allowedTypes.indexOf(value) > -1) {
    return value;
  }

  return allowedTypes.indexOf(fallbackValue) > -1 ? fallbackValue : 'none';
}

function normalizeForeignEmotionWord(value) {
  const source = toObject(value);
  const word = toTrimmedString(source.word);
  const language = toTrimmedString(source.language);
  const meaning = toTrimmedString(source.meaning);

  if (!word || !language || !meaning) {
    return null;
  }

  return {
    word,
    language,
    meaning
  };
}

function buildDiaryText(payload) {
  const keywordLine = [payload.mainEmotion].concat(payload.subEmotions).filter(Boolean).join(' | ');
  const suggestionTitle = payload.riskLevel === 'high' ? '支持提示' : '此刻可以试试';
  const foreignWordLine = payload.foreignEmotionWord
    ? `更贴近的外文词：${payload.foreignEmotionWord.word}（${payload.foreignEmotionWord.language}）：${payload.foreignEmotionWord.meaning}`
    : '';

  return [
    `你的记录：${payload.rawInput}`,
    `关键词：${keywordLine}`,
    foreignWordLine,
    `情绪解析：${payload.analysis}`,
    `${suggestionTitle}：${payload.suggestion}`
  ].filter(Boolean).join('\n');
}

function ensureExplanations(mainEmotion, subEmotions, explanations) {
  const safeMap = Object.assign({}, explanations);

  [mainEmotion].concat(subEmotions).filter(Boolean).forEach((emotion) => {
    if (!safeMap[emotion]) {
      safeMap[emotion] = `“${emotion}”在这段表达里比较突出，像是在提醒你：这份感受已经值得被看见。`;
    }
  });

  return safeMap;
}

function normalizeEmotionResult(payload, options) {
  const safePayload = payload || {};
  const now = options && options.now ? new Date(options.now) : new Date();
  const createdDate = safePayload.createdAt ? new Date(safePayload.createdAt) : now;
  const mainEmotion = safePayload.mainEmotion || '茫然';
  const subEmotions = toArray(safePayload.subEmotions);
  const riskLevel = normalizeRiskLevel(safePayload.riskLevel, safePayload.isHighRisk ? 'high' : 'none');
  const riskType = normalizeRiskType(safePayload.riskType, riskLevel === 'high' ? 'crisis' : 'none');
  const riskSignal = typeof safePayload.riskSignal === 'boolean'
    ? safePayload.riskSignal
    : riskLevel !== 'none';
  const isHighRisk = riskLevel === 'high';
  const suggestion = isHighRisk
    ? (riskType === 'harm_others' ? HARM_OTHERS_HIGH_RISK_SUGGESTION : HIGH_RISK_SUGGESTION)
    : (safePayload.suggestion || '先把情绪放稳，再决定下一步要怎么做。');

  const result = {
    rawInput: safePayload.rawInput || safePayload.sourceText || '',
    mainEmotion,
    subEmotions,
    explanations: ensureExplanations(mainEmotion, subEmotions, toObject(safePayload.explanations)),
    foreignEmotionWord: normalizeForeignEmotionWord(safePayload.foreignEmotionWord),
    analysis: safePayload.analysis || '这段表达里有比较复杂的情绪拉扯，值得被认真对待。',
    isNegative: typeof safePayload.isNegative === 'boolean' ? safePayload.isNegative : true,
    riskLevel,
    riskType,
    riskSignal,
    riskReason: toTrimmedString(safePayload.riskReason),
    isHighRisk,
    suggestion,
    source: safePayload.source || (options && options.defaultSource) || 'ai',
    createdAt: createdDate.toISOString(),
    dateKey: formatDateKey(createdDate)
  };

  result.diaryText = safePayload.diaryText || buildDiaryText(result);
  return result;
}

module.exports = {
  HIGH_RISK_SUGGESTION,
  HARM_OTHERS_HIGH_RISK_SUGGESTION,
  normalizeEmotionResult
};

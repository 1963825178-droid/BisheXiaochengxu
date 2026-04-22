const { formatDateKey } = require('../utils/time');

const HIGH_RISK_SUGGESTION =
  '如果你已经有伤害自己或结束生命的想法，请优先联系身边可信任的人陪着你，或尽快联系当地心理援助热线、医院急诊或紧急求助渠道。先确保自己不是一个人。';

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function buildDiaryText(payload) {
  const keywordLine = [payload.mainEmotion].concat(payload.subEmotions).filter(Boolean).join(' | ');
  const suggestionTitle = payload.isHighRisk ? '支持提示' : '此刻可以试试';

  return [
    `你的记录：${payload.rawInput}`,
    `关键词：${keywordLine}`,
    `情绪解析：${payload.analysis}`,
    `${suggestionTitle}：${payload.suggestion}`
  ].join('\n');
}

function ensureExplanations(mainEmotion, subEmotions, explanations) {
  const safeMap = Object.assign({}, explanations);

  [mainEmotion].concat(subEmotions).filter(Boolean).forEach((emotion) => {
    if (!safeMap[emotion]) {
      safeMap[emotion] = `“${emotion}”是这段表达里比较突出的感受，需要结合上下文继续理解。`;
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
  const isHighRisk = Boolean(safePayload.isHighRisk);
  const suggestion = isHighRisk
    ? HIGH_RISK_SUGGESTION
    : (safePayload.suggestion || '先把情绪放稳，再决定下一步要怎么做。');

  const result = {
    rawInput: safePayload.rawInput || safePayload.sourceText || '',
    mainEmotion,
    subEmotions,
    explanations: ensureExplanations(mainEmotion, subEmotions, toObject(safePayload.explanations)),
    analysis: safePayload.analysis || '这段表达里有比较复杂的情绪拉扯，值得被认真对待。',
    isNegative: typeof safePayload.isNegative === 'boolean' ? safePayload.isNegative : true,
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
  normalizeEmotionResult
};

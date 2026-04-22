const { cloneDate, formatDateKey, formatMonthLabel, isSameMonth } = require('../utils/time');

const JOURNAL_STORAGE_KEY = 'emotion-keyword-journals-v2';
const PENDING_ANALYSIS_KEY = 'emotion-keyword-pending-analysis-v2';
const PENDING_INPUT_KEY = 'emotion-keyword-pending-input-v2';

const LEGACY_SAMPLE_TEXTS = [
  '今天被领导说了，感觉有点委屈，但我又知道他说得也不算全错。',
  '最近没发生什么事，可我就是提不起劲，连想做的事情都变少了。',
  '快毕业了，选工作还是继续读书都拿不准，越想越迷茫。',
  '这周要和很重要的人见面，我其实挺期待，但也一直有点不安。',
  '和朋友因为小事吵了一架，嘴上很硬，心里其实又烦又堵。',
  '这几天项目节奏很快，我经常觉得脑子转不过来，好像一直慢半拍。'
];

function readStorage(key, fallbackValue) {
  try {
    const value = wx.getStorageSync(key);
    if (value === '' || value === undefined || value === null) {
      return fallbackValue;
    }
    return value;
  } catch (error) {
    return fallbackValue;
  }
}

function writeStorage(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (error) {
    return null;
  }
  return value;
}

function removeStorage(key) {
  try {
    wx.removeStorageSync(key);
  } catch (error) {
    return null;
  }
  return null;
}

function buildKeywordLine(journal) {
  return [journal.mainEmotion].concat(journal.subEmotions || []).filter(Boolean).join(' · ');
}

function attachJournalMeta(journal) {
  return Object.assign({}, journal, {
    id: journal.id || journal._id || '',
    keywordLine: buildKeywordLine(journal)
  });
}

function ensureLegacyJournalShape(journal) {
  if (!journal || typeof journal !== 'object') {
    return null;
  }

  const createdAt = journal.createdAt || new Date().toISOString();
  const createdDate = new Date(createdAt);

  return attachJournalMeta({
    id: journal.id || '',
    rawInput: journal.rawInput || '',
    mainEmotion: journal.mainEmotion || '',
    subEmotions: Array.isArray(journal.subEmotions) ? journal.subEmotions.slice() : [],
    explanations: journal.explanations && typeof journal.explanations === 'object' ? Object.assign({}, journal.explanations) : {},
    analysis: journal.analysis || '',
    suggestion: journal.suggestion || '',
    isNegative: typeof journal.isNegative === 'boolean' ? journal.isNegative : true,
    isHighRisk: Boolean(journal.isHighRisk),
    diaryText: journal.diaryText || '',
    createdAt,
    dateKey: journal.dateKey || formatDateKey(createdDate),
    displayDateTime: journal.displayDateTime || '',
    source: journal.source || 'mock'
  });
}

function readLegacyJournalsRaw() {
  const stored = readStorage(JOURNAL_STORAGE_KEY, []);
  return Array.isArray(stored) ? stored : [];
}

function getLegacyLocalJournals() {
  return readLegacyJournalsRaw()
    .map(ensureLegacyJournalShape)
    .filter(Boolean)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function isLegacySampleJournal(journal) {
  return Boolean(
    journal &&
    journal.source === 'mock' &&
    LEGACY_SAMPLE_TEXTS.includes(journal.rawInput)
  );
}

function getMigratableLocalJournals() {
  return getLegacyLocalJournals().filter((journal) => !isLegacySampleJournal(journal));
}

function initializeStore() {
  return true;
}

function setPendingRawInput(rawInput) {
  writeStorage(PENDING_INPUT_KEY, rawInput);
  return rawInput;
}

function getPendingRawInput() {
  return readStorage(PENDING_INPUT_KEY, '');
}

function clearPendingRawInput() {
  return removeStorage(PENDING_INPUT_KEY);
}

function setPendingAnalysis(result) {
  writeStorage(PENDING_ANALYSIS_KEY, result);
  return result;
}

function getPendingAnalysis() {
  return readStorage(PENDING_ANALYSIS_KEY, null);
}

function clearPendingAnalysis() {
  return removeStorage(PENDING_ANALYSIS_KEY);
}

function markPendingAnalysisSaved(savedId) {
  const current = getPendingAnalysis();
  if (!current) {
    return null;
  }

  const next = Object.assign({}, current, { savedId });
  setPendingAnalysis(next);
  return next;
}

function buildCalendarMonthView(entries, year, month, preferredDateKey) {
  const safeEntries = Array.isArray(entries) ? entries.map(attachJournalMeta) : [];
  const monthStart = new Date(year, month - 1, 1);
  const gridStart = new Date(year, month - 1, 1 - monthStart.getDay());
  const grouped = {};

  safeEntries.forEach((journal) => {
    if (!grouped[journal.dateKey]) {
      grouped[journal.dateKey] = [];
    }
    grouped[journal.dateKey].push(journal);
  });

  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const dateKey = formatDateKey(date);
    const dateEntries = grouped[dateKey] || [];
    cells.push({
      dateKey,
      day: date.getDate(),
      isCurrentMonth: isSameMonth(date, year, month),
      hasEntry: dateEntries.length > 0,
      count: dateEntries.length
    });
  }

  const firstDateWithEntry = cells.find((cell) => cell.isCurrentMonth && cell.hasEntry);
  const selectedDateKey = preferredDateKey || (firstDateWithEntry ? firstDateWithEntry.dateKey : '');

  return {
    year,
    month,
    monthLabel: formatMonthLabel(year, month),
    totalEntries: safeEntries.length,
    cells,
    selectedDateKey,
    selectedTitle: selectedDateKey ? `${selectedDateKey} 的记录` : '先选择一个日期',
    selectedEntries: selectedDateKey ? (grouped[selectedDateKey] || []) : []
  };
}

function getEmotionColor(emotion) {
  const palette = {
    委屈: '#C98C5F',
    不甘: '#B17A56',
    疲惫: '#7D8B84',
    困惑: '#8195A1',
    低落: '#72817D',
    空心感: '#9B8D8D',
    无力: '#8A9887',
    迟缓: '#98A68F',
    迷茫: '#7A86A9',
    压力: '#C78B64',
    犹豫: '#A0806A',
    自我怀疑: '#8B7A8B',
    期待: '#D8A85D',
    不安: '#A28176',
    心动: '#C57C73',
    谨慎: '#7D8770',
    愤懑: '#B76B5D',
    受伤: '#97736F',
    防御: '#7C7F89',
    紧绷: '#62756F',
    茫然: '#7A9088',
    分心: '#90A1A0',
    极度低落: '#8D7474'
  };

  return palette[emotion] || '#6F8E83';
}

function buildMonthlyStats(entries, year, month) {
  const safeEntries = Array.isArray(entries) ? entries.map(attachJournalMeta) : [];
  const emotionCounter = {};
  const mainEmotionCounter = {};

  safeEntries.forEach((journal) => {
    mainEmotionCounter[journal.mainEmotion] = (mainEmotionCounter[journal.mainEmotion] || 0) + 1;
    [journal.mainEmotion].concat(journal.subEmotions).forEach((emotion) => {
      emotionCounter[emotion] = (emotionCounter[emotion] || 0) + 1;
    });
  });

  const totalMentions = Object.keys(emotionCounter).reduce((sum, key) => sum + emotionCounter[key], 0);
  const topEmotions = Object.keys(emotionCounter)
    .map((name) => ({
      name,
      count: emotionCounter[name],
      percent: totalMentions ? Math.max(8, Math.round((emotionCounter[name] / totalMentions) * 100)) : 0,
      color: getEmotionColor(name)
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);

  const negativeCount = safeEntries.filter((entry) => entry.isNegative).length;
  const positiveCount = safeEntries.length - negativeCount;
  const negativeRatio = safeEntries.length ? Math.round((negativeCount / safeEntries.length) * 100) : 0;

  return {
    year,
    month,
    monthLabel: formatMonthLabel(year, month),
    totalEntries: safeEntries.length,
    topEmotions,
    mainEmotionRanks: Object.keys(mainEmotionCounter)
      .map((name) => ({
        name,
        count: mainEmotionCounter[name]
      }))
      .sort((left, right) => right.count - left.count),
    negativeCount,
    positiveCount,
    negativeRatio,
    positiveRatio: safeEntries.length ? 100 - negativeRatio : 0,
    summary: safeEntries.length
      ? `本月你最常出现的情绪是「${topEmotions[0].name}」${topEmotions[1] ? `与「${topEmotions[1].name}」` : ''}，整体状态更偏${negativeCount >= positiveCount ? '紧绷' : '平衡'}。`
      : '这个月还没有保存记录，先写下第一条心情，我们就能开始生成月度情绪画像。',
    latestEntries: safeEntries.slice(0, 4)
  };
}

module.exports = {
  JOURNAL_STORAGE_KEY,
  LEGACY_SAMPLE_TEXTS,
  attachJournalMeta,
  buildCalendarMonthView,
  buildKeywordLine,
  buildMonthlyStats,
  clearPendingAnalysis,
  clearPendingRawInput,
  getLegacyLocalJournals,
  getMigratableLocalJournals,
  getPendingAnalysis,
  getPendingRawInput,
  initializeStore,
  isLegacySampleJournal,
  markPendingAnalysisSaved,
  setPendingAnalysis,
  setPendingRawInput
};

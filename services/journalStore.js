const { analyzeEmotionText } = require('./mockEmotion');
const { cloneDate, formatDateKey, formatDateTime, formatMonthLabel, isSameMonth } = require('../utils/time');

const JOURNAL_STORAGE_KEY = 'emotion-keyword-journals-v1';
const PENDING_STORAGE_KEY = 'emotion-keyword-pending-v1';

const SAMPLE_TEXTS = [
  {
    text: '今天被领导说了，感觉有点委屈，但我又知道他说得也不算全错。',
    offsetDays: 1,
    hour: 22,
    minute: 5
  },
  {
    text: '最近没发生什么事，可我就是提不起劲，连想做的事情都变少了。',
    offsetDays: 3,
    hour: 20,
    minute: 18
  },
  {
    text: '快毕业了，选工作还是继续读书都拿不准，越想越迷茫。',
    offsetDays: 6,
    hour: 23,
    minute: 12
  },
  {
    text: '这周要和喜欢的人单独见面，我其实挺期待，但也一直有点不安。',
    offsetDays: 9,
    hour: 21,
    minute: 26
  },
  {
    text: '和朋友因为小事吵了一架，嘴上很硬，心里其实又烦又堵。',
    offsetDays: 13,
    hour: 19,
    minute: 42
  },
  {
    text: '这几天项目节奏很快，我经常觉得脑子转不过来，好像一直慢半拍。',
    offsetDays: 29,
    hour: 22,
    minute: 10
  }
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
  wx.setStorageSync(key, value);
}

function createJournalId(now) {
  return `journal_${now.getTime()}_${Math.floor(Math.random() * 10000)}`;
}

function attachJournalMeta(journal) {
  return Object.assign({}, journal, {
    keywordLine: [journal.mainEmotion].concat(journal.subEmotions).join('｜')
  });
}

function createJournalFromResult(result, now) {
  const createdDate = cloneDate(now);
  return {
    id: createJournalId(createdDate),
    sourceText: result.sourceText,
    mainEmotion: result.mainEmotion,
    subEmotions: result.subEmotions.slice(),
    explanations: Object.assign({}, result.explanations),
    analysis: result.analysis,
    suggestion: result.suggestion,
    isNegative: result.isNegative,
    isHighRisk: result.isHighRisk,
    diaryText: result.diaryText,
    createdAt: createdDate.toISOString(),
    dateKey: formatDateKey(createdDate),
    displayDateTime: formatDateTime(createdDate)
  };
}

function readJournalsRaw() {
  const existing = readStorage(JOURNAL_STORAGE_KEY, []);
  if (existing && existing.length) {
    return existing;
  }

  const now = new Date();
  const seeds = SAMPLE_TEXTS.map((item) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - item.offsetDays, item.hour, item.minute, 0);
    return createJournalFromResult(analyzeEmotionText(item.text, { now: date }), date);
  });

  writeStorage(JOURNAL_STORAGE_KEY, seeds);
  return seeds;
}

function writeJournalsRaw(journals) {
  writeStorage(JOURNAL_STORAGE_KEY, journals);
}

function initializeStore() {
  readJournalsRaw();
}

function getAllJournals() {
  return readJournalsRaw()
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .map(attachJournalMeta);
}

function getRecentJournals(limit) {
  return getAllJournals().slice(0, limit || 3);
}

function getJournalById(journalId) {
  return getAllJournals().find((journal) => journal.id === journalId) || null;
}

function setPendingAnalysis(result) {
  writeStorage(PENDING_STORAGE_KEY, result);
  return result;
}

function getPendingAnalysis() {
  return readStorage(PENDING_STORAGE_KEY, null);
}

function analyzeAndStore(text) {
  const result = analyzeEmotionText(text);
  setPendingAnalysis(result);
  return result;
}

function savePendingAnalysis() {
  const pending = getPendingAnalysis();
  if (!pending) {
    return null;
  }

  const journals = readJournalsRaw();
  if (pending.savedId) {
    const existing = journals.find((journal) => journal.id === pending.savedId);
    return existing ? attachJournalMeta(existing) : null;
  }

  const createdDate = pending.createdAt ? new Date(pending.createdAt) : new Date();
  const journal = createJournalFromResult(pending, createdDate);
  journals.unshift(journal);
  writeJournalsRaw(journals);
  setPendingAnalysis(Object.assign({}, pending, { savedId: journal.id }));
  return attachJournalMeta(journal);
}

function getEntriesByDate(dateKey) {
  return getAllJournals().filter((journal) => journal.dateKey === dateKey);
}

function buildCalendarMonth(year, month) {
  const monthStart = new Date(year, month - 1, 1);
  const gridStart = new Date(year, month - 1, 1 - monthStart.getDay());
  const journals = getAllJournals();
  const grouped = {};

  journals.forEach((journal) => {
    if (!grouped[journal.dateKey]) {
      grouped[journal.dateKey] = [];
    }
    grouped[journal.dateKey].push(journal);
  });

  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const dateKey = formatDateKey(date);
    const entries = grouped[dateKey] || [];
    cells.push({
      dateKey,
      day: date.getDate(),
      isCurrentMonth: isSameMonth(date, year, month),
      hasEntry: entries.length > 0,
      count: entries.length
    });
  }

  return {
    year,
    month,
    monthLabel: formatMonthLabel(year, month),
    totalEntries: journals.filter((journal) => {
      const createdDate = new Date(journal.createdAt);
      return isSameMonth(createdDate, year, month);
    }).length,
    cells
  };
}

function getMonthlyStats(year, month) {
  const entries = getAllJournals().filter((journal) => {
    const createdDate = new Date(journal.createdAt);
    return isSameMonth(createdDate, year, month);
  });

  const emotionCounter = {};
  const mainEmotionCounter = {};

  entries.forEach((journal) => {
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

  const negativeCount = entries.filter((entry) => entry.isNegative).length;
  const positiveCount = entries.length - negativeCount;

  return {
    year,
    month,
    monthLabel: formatMonthLabel(year, month),
    totalEntries: entries.length,
    topEmotions,
    mainEmotionRanks: Object.keys(mainEmotionCounter)
      .map((name) => ({
        name,
        count: mainEmotionCounter[name]
      }))
      .sort((left, right) => right.count - left.count),
    negativeCount,
    positiveCount,
    negativeRatio: entries.length ? Math.round((negativeCount / entries.length) * 100) : 0,
    positiveRatio: entries.length ? 100 - Math.round((negativeCount / entries.length) * 100) : 0,
    summary: entries.length
      ? `本月你最常出现的情绪是「${topEmotions[0].name}」${topEmotions[1] ? `与「${topEmotions[1].name}」` : ''}，整体状态更偏${negativeCount >= positiveCount ? '紧绷' : '平衡'}。`
      : '这个月还没有保存记录，先写下第一条心情，我们就能开始生成月度情绪画像。',
    latestEntries: entries.slice(0, 4)
  };
}

function getEmotionColor(emotion) {
  const palette = {
    '委屈': '#C98C5F',
    '不甘': '#B17A56',
    '疲惫': '#7D8B84',
    '困惑': '#8195A1',
    '低落': '#72817D',
    '空心感': '#9B8D8D',
    '无力': '#8A9887',
    '迟缓': '#98A68F',
    '迷茫': '#7A86A9',
    '压力': '#C78B64',
    '犹豫': '#A0806A',
    '自我怀疑': '#8B7A8B',
    '期待': '#D8A85D',
    '不安': '#A28176',
    '心动': '#C57C73',
    '谨慎': '#7D8770',
    '愤懑': '#B76B5D',
    '受伤': '#97736F',
    '防御': '#7C7F89',
    '紧绷': '#62756F',
    '茫然': '#7A9088',
    '分心': '#90A1A0',
    '绝望': '#8D7474'
  };

  return palette[emotion] || '#6F8E83';
}

module.exports = {
  analyzeAndStore,
  buildCalendarMonth,
  getAllJournals,
  getEntriesByDate,
  getJournalById,
  getMonthlyStats,
  getPendingAnalysis,
  getRecentJournals,
  initializeStore,
  savePendingAnalysis
};

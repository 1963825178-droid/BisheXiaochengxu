const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

function padNumber(value) {
  return String(value).padStart(2, '0');
}

function formatMonthLabel(year, month) {
  return `${year}年${month}月`;
}

function formatDateKeyFromDate(date) {
  return [date.getFullYear(), padNumber(date.getMonth() + 1), padNumber(date.getDate())].join('-');
}

function getMonthDateRange(year, month) {
  const start = `${year}-${padNumber(month)}-01`;
  const endDate = new Date(year, month, 0);
  const end = formatDateKeyFromDate(endDate);
  return { start, end };
}

function buildKeywordLine(journal) {
  return [journal.mainEmotion].concat(journal.subEmotions || []).filter(Boolean).join(' · ');
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

function serializeJournal(doc) {
  if (!doc) {
    return null;
  }

  return {
    id: doc._id,
    rawInput: doc.rawInput || '',
    mainEmotion: doc.mainEmotion || '',
    subEmotions: Array.isArray(doc.subEmotions) ? doc.subEmotions : [],
    explanations: doc.explanations && typeof doc.explanations === 'object' ? doc.explanations : {},
    analysis: doc.analysis || '',
    suggestion: doc.suggestion || '',
    isNegative: typeof doc.isNegative === 'boolean' ? doc.isNegative : true,
    isHighRisk: Boolean(doc.isHighRisk),
    diaryText: doc.diaryText || '',
    createdAt: doc.createdAt || '',
    dateKey: doc.dateKey || '',
    source: doc.source || 'ai',
    keywordLine: buildKeywordLine(doc)
  };
}

async function countUserJournals(openid) {
  const countResult = await db.collection('journals').where({
    openid,
    isDeleted: false
  }).count();

  return countResult.total || 0;
}

async function refreshUserJournalCount(openid) {
  const journalCount = await countUserJournals(openid);
  await db.collection('users').where({ openid }).update({
    data: {
      journalCount
    }
  });
  return journalCount;
}

async function fetchCurrentUser(openid) {
  const userResult = await db.collection('users').where({ openid }).limit(1).get();
  if (!userResult.data.length) {
    const error = new Error('用户档案不存在，请重新进入小程序');
    error.code = 'USER_NOT_FOUND';
    throw error;
  }
  return userResult.data[0];
}

function ensureSavablePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    const error = new Error('保存内容不能为空');
    error.code = 'INVALID_PAYLOAD';
    throw error;
  }

  if (!payload.rawInput || !payload.mainEmotion || !payload.analysis || !payload.createdAt) {
    const error = new Error('当前结果还不能保存，请先完成分析');
    error.code = 'INVALID_PAYLOAD';
    throw error;
  }
}

async function createJournal(openid, payload) {
  ensureSavablePayload(payload);
  const now = new Date().toISOString();

  const addResult = await db.collection('journals').add({
    data: {
      openid,
      clientMigrationKey: payload.clientMigrationKey || '',
      rawInput: payload.rawInput,
      mainEmotion: payload.mainEmotion,
      subEmotions: Array.isArray(payload.subEmotions) ? payload.subEmotions : [],
      explanations: payload.explanations && typeof payload.explanations === 'object' ? payload.explanations : {},
      analysis: payload.analysis,
      suggestion: payload.suggestion || '',
      isNegative: typeof payload.isNegative === 'boolean' ? payload.isNegative : true,
      isHighRisk: Boolean(payload.isHighRisk),
      diaryText: payload.diaryText || '',
      source: payload.source || 'ai',
      createdAt: payload.createdAt,
      dateKey: payload.dateKey,
      updatedAt: now,
      isDeleted: false,
      deletedAt: ''
    }
  });

  const fresh = await db.collection('journals').doc(addResult._id).get();
  const journalCount = await refreshUserJournalCount(openid);
  return {
    journal: serializeJournal(fresh.data),
    journalCount
  };
}

async function listRecentJournals(openid, payload) {
  const limit = Math.max(1, Math.min(Number(payload.limit || 3), 20));
  const result = await db.collection('journals')
    .where({
      openid,
      isDeleted: false
    })
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return {
    entries: result.data.map(serializeJournal)
  };
}

async function listMonthJournals(openid, payload) {
  const year = Number(payload.year);
  const month = Number(payload.month);
  if (!year || !month) {
    const error = new Error('月份参数不完整');
    error.code = 'INVALID_PAYLOAD';
    throw error;
  }

  const { start, end } = getMonthDateRange(year, month);
  const result = await db.collection('journals')
    .where({
      openid,
      isDeleted: false,
      dateKey: _.gte(start).and(_.lte(end))
    })
    .orderBy('createdAt', 'desc')
    .get();

  return {
    year,
    month,
    monthLabel: formatMonthLabel(year, month),
    entries: result.data.map(serializeJournal)
  };
}

async function getJournalDetail(openid, payload) {
  if (!payload.id) {
    const error = new Error('日记 ID 缺失');
    error.code = 'INVALID_PAYLOAD';
    throw error;
  }

  const result = await db.collection('journals')
    .where({
      _id: payload.id,
      openid,
      isDeleted: false
    })
    .limit(1)
    .get();

  if (!result.data.length) {
    const error = new Error('没有找到这条日记');
    error.code = 'JOURNAL_NOT_FOUND';
    throw error;
  }

  return {
    journal: serializeJournal(result.data[0])
  };
}

async function statsByMonth(openid, payload) {
  const monthData = await listMonthJournals(openid, payload);
  const entries = monthData.entries;
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
  const negativeRatio = entries.length ? Math.round((negativeCount / entries.length) * 100) : 0;

  return {
    year: monthData.year,
    month: monthData.month,
    monthLabel: monthData.monthLabel,
    totalEntries: entries.length,
    topEmotions,
    mainEmotionRanks: Object.keys(mainEmotionCounter)
      .map((name) => ({
        name,
        count: mainEmotionCounter[name]
      }))
      .sort((left, right) => right.count - left.count),
    negativeCount,
    positiveCount: entries.length - negativeCount,
    negativeRatio,
    positiveRatio: entries.length ? 100 - negativeRatio : 0,
    summary: entries.length
      ? `本月你最常出现的情绪是「${topEmotions[0].name}」${topEmotions[1] ? `与「${topEmotions[1].name}」` : ''}，整体状态更偏${negativeCount >= entries.length - negativeCount ? '紧绷' : '平衡'}。`
      : '这个月还没有保存记录，先写下第一条心情，我们就能开始生成月度情绪画像。',
    latestEntries: entries.slice(0, 4)
  };
}

async function deleteJournal(openid, payload) {
  if (!payload.id) {
    const error = new Error('日记 ID 缺失');
    error.code = 'INVALID_PAYLOAD';
    throw error;
  }

  const now = new Date().toISOString();
  const existing = await db.collection('journals')
    .where({
      _id: payload.id,
      openid,
      isDeleted: false
    })
    .limit(1)
    .get();

  if (!existing.data.length) {
    const error = new Error('没有找到可删除的日记');
    error.code = 'JOURNAL_NOT_FOUND';
    throw error;
  }

  await db.collection('journals').doc(payload.id).update({
    data: {
      isDeleted: true,
      deletedAt: now,
      updatedAt: now
    }
  });

  const journalCount = await refreshUserJournalCount(openid);
  return {
    deleted: true,
    journalCount
  };
}

async function migrateLocal(openid, payload) {
  const journals = Array.isArray(payload.journals) ? payload.journals : [];
  const migratedEntries = [];
  const collection = db.collection('journals');

  for (const journal of journals) {
    if (!journal || !journal.id || !journal.rawInput || !journal.mainEmotion || !journal.createdAt) {
      continue;
    }

    const duplicate = await collection.where({
      openid,
      clientMigrationKey: journal.id
    }).limit(1).get();

    if (duplicate.data.length) {
      continue;
    }

    const addResult = await collection.add({
      data: {
        openid,
        clientMigrationKey: journal.id,
        rawInput: journal.rawInput,
        mainEmotion: journal.mainEmotion,
        subEmotions: Array.isArray(journal.subEmotions) ? journal.subEmotions : [],
        explanations: journal.explanations && typeof journal.explanations === 'object' ? journal.explanations : {},
        analysis: journal.analysis || '',
        suggestion: journal.suggestion || '',
        isNegative: typeof journal.isNegative === 'boolean' ? journal.isNegative : true,
        isHighRisk: Boolean(journal.isHighRisk),
        diaryText: journal.diaryText || '',
        source: journal.source || 'mock',
        createdAt: journal.createdAt,
        dateKey: journal.dateKey,
        updatedAt: new Date().toISOString(),
        isDeleted: false,
        deletedAt: ''
      }
    });

    const fresh = await collection.doc(addResult._id).get();
    migratedEntries.push(serializeJournal(fresh.data));
  }

  const journalCount = await refreshUserJournalCount(openid);
  await db.collection('users').where({ openid }).update({
    data: {
      localMigrationDone: true
    }
  });

  const user = await fetchCurrentUser(openid);

  return {
    migratedCount: migratedEntries.length,
    migratedEntries,
    journalCount,
    user: {
      openid: '',
      nickname: user.nickname || '微信用户',
      avatarUrl: user.avatarUrl || '',
      localMigrationDone: true,
      journalCount,
      createdAt: user.createdAt || '',
      lastLoginAt: user.lastLoginAt || ''
    }
  };
}

function resolveActionHandler(action) {
  const actionMap = {
    create: createJournal,
    recentList: listRecentJournals,
    listByMonth: listMonthJournals,
    detail: getJournalDetail,
    statsByMonth,
    delete: deleteJournal,
    migrateLocal
  };

  return actionMap[action];
}

exports.main = async (event) => {
  try {
    const { OPENID } = cloud.getWXContext();
    if (!OPENID) {
      return {
        ok: false,
        error: {
          code: 'OPENID_MISSING',
          message: '当前用户身份不可用，请稍后再试'
        }
      };
    }

    const action = event && event.action ? event.action : '';
    const payload = event && event.payload ? event.payload : {};
    const handler = resolveActionHandler(action);

    if (!handler) {
      return {
        ok: false,
        error: {
          code: 'UNSUPPORTED_ACTION',
          message: '不支持的日记操作'
        }
      };
    }

    const data = await handler(OPENID, payload);
    return {
      ok: true,
      data
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: error && error.code ? error.code : 'JOURNAL_SERVICE_FAILED',
        message: error && error.message ? error.message : '日记服务暂时不可用，请稍后再试'
      }
    };
  }
};

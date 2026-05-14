const https = require('https');
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

function normalizeForeignEmotionWord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const word = typeof value.word === 'string' ? value.word.trim() : '';
  const language = typeof value.language === 'string' ? value.language.trim() : '';
  const meaning = typeof value.meaning === 'string' ? value.meaning.trim() : '';

  if (!word || !language || !meaning) {
    return null;
  }

  return {
    word,
    language,
    meaning
  };
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

  const riskLevel = normalizeRiskLevel(doc.riskLevel, doc.isHighRisk ? 'high' : 'none');
  const riskType = normalizeRiskType(doc.riskType, riskLevel === 'high' ? 'crisis' : 'none');
  const riskSignal = typeof doc.riskSignal === 'boolean' ? doc.riskSignal : riskLevel !== 'none';

  return {
    id: doc._id,
    rawInput: doc.rawInput || '',
    mainEmotion: doc.mainEmotion || '',
    subEmotions: Array.isArray(doc.subEmotions) ? doc.subEmotions : [],
    explanations: doc.explanations && typeof doc.explanations === 'object' ? doc.explanations : {},
    foreignEmotionWord: normalizeForeignEmotionWord(doc.foreignEmotionWord),
    analysis: doc.analysis || '',
    suggestion: doc.suggestion || '',
    isNegative: typeof doc.isNegative === 'boolean' ? doc.isNegative : true,
    riskLevel,
    riskType,
    riskSignal,
    riskReason: typeof doc.riskReason === 'string' ? doc.riskReason.trim() : '',
    isHighRisk: riskLevel === 'high',
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
  const riskLevel = normalizeRiskLevel(payload.riskLevel, payload.isHighRisk ? 'high' : 'none');
  const riskType = normalizeRiskType(payload.riskType, riskLevel === 'high' ? 'crisis' : 'none');
  const riskSignal = typeof payload.riskSignal === 'boolean' ? payload.riskSignal : riskLevel !== 'none';

  const addResult = await db.collection('journals').add({
    data: {
      openid,
      clientMigrationKey: payload.clientMigrationKey || '',
      rawInput: payload.rawInput,
      mainEmotion: payload.mainEmotion,
      subEmotions: Array.isArray(payload.subEmotions) ? payload.subEmotions : [],
      explanations: payload.explanations && typeof payload.explanations === 'object' ? payload.explanations : {},
      foreignEmotionWord: normalizeForeignEmotionWord(payload.foreignEmotionWord),
      analysis: payload.analysis,
      suggestion: payload.suggestion || '',
      isNegative: typeof payload.isNegative === 'boolean' ? payload.isNegative : true,
      riskLevel,
      riskType,
      riskSignal,
      riskReason: typeof payload.riskReason === 'string' ? payload.riskReason.trim() : '',
      isHighRisk: riskLevel === 'high',
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
      percent: totalMentions ? Math.round((emotionCounter[name] / totalMentions) * 100) : 0,
      color: getEmotionColor(name)
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);

  const negativeCount = entries.filter((entry) => entry.isNegative).length;
  const negativeRatio = entries.length ? Math.round((negativeCount / entries.length) * 100) : 0;
  const mainEmotionRanks = Object.keys(mainEmotionCounter)
    .map((name) => ({
      name,
      count: mainEmotionCounter[name]
    }))
    .sort((left, right) => right.count - left.count);

  const templateSummary = generateSummary(entries.length, mainEmotionRanks, negativeCount);

  const result = {
    year: monthData.year,
    month: monthData.month,
    monthLabel: monthData.monthLabel,
    totalEntries: entries.length,
    topEmotions,
    mainEmotionRanks,
    negativeCount,
    positiveCount: entries.length - negativeCount,
    negativeRatio,
    positiveRatio: entries.length ? 100 - negativeRatio : 0,
    summary: templateSummary,
    latestEntries: entries.slice(0, 4)
  };

  // 尝试用 AI 总结替换模板总结（失败时静默降级，保留模板）
  if (entries.length > 0) {
    try {
      const aiSummary = await getOrGenerateAISummary(openid, monthData.year, monthData.month, result);
      if (aiSummary) {
        result.summary = aiSummary;
      }
    } catch (e) {
      console.warn('[AISummary] AI 总结异常，使用模板:', e.message);
    }
  }

  return result;
}

function generateSummary(totalEntries, mainEmotionRanks, negativeCount) {
  if (!totalEntries) {
    return '这个月还没有保存记录，先写下第一条心情，我们就能开始生成月度情绪画像。';
  }

  const total = totalEntries;
  const ranks = mainEmotionRanks;
  const rankLen = ranks.length;

  // === 情绪描述：分布较平均时不强行说"最常出现" ===
  let emotionPart;
  if (rankLen >= 2 && ranks[0].count - ranks[1].count <= 1) {
    // Top1 和 Top2 差距 ≤1 → 分布较平均，用多样性的描述
    const list = [ranks[0].name];
    if (ranks[1]) list.push(ranks[1].name);
    if (rankLen >= 3 && ranks[1].count - ranks[2].count <= 1) {
      list.push(ranks[2].name);
    }
    emotionPart = `本月你的情绪体验比较多样，主要感受到了「${list.join('」「')}」等多种情绪`;
  } else if (rankLen >= 1) {
    // 有明显的最值情绪
    const topName = ranks[0].name;
    const secondName = rankLen >= 2 ? ranks[1].name : null;
    emotionPart = `本月你最常出现的情绪是「${topName}」${secondName ? `与「${secondName}」` : ''}`;
  } else {
    emotionPart = '';
  }

  // === 整体状态倾向 ===
  const negRatio = negativeCount / total;
  let tonePart;
  if (negRatio >= 0.7) {
    tonePart = '整体状态偏紧绷，记得给自己一些放松的空间。';
  } else if (negRatio >= 0.4) {
    tonePart = '情绪有起有落，这是很正常的。';
  } else {
    tonePart = '整体状态偏积极平稳，继续好好照顾自己。';
  }

  return `${emotionPart}，${tonePart}`;
}

// ===== AI 月度总结相关函数 =====

/**
 * 调用 DeepSeek Chat API
 * @param {Array<{role: string, content: string}>} messages - 对话消息列表
 * @param {number} timeoutMs - 超时毫秒数（默认 10000）
 * @returns {Promise<string|null>} - AI 返回的文本内容，失败返回 null
 */
async function callDeepSeekAPI(messages, timeoutMs = 10000) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'api.deepseek.com').replace(/\/+$/, '');
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  if (!apiKey) {
    console.warn('[AISummary] DEEPSEEK_API_KEY 未配置，跳过 AI 总结');
    return null;
  }

  const postData = JSON.stringify({
    model,
    messages,
    temperature: 0.7,
    max_tokens: 300
  });

  return new Promise((resolve) => {
    const req = https.request({
      hostname: baseUrl,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: timeoutMs
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const content = parsed.choices?.[0]?.message?.content?.trim();
          if (!content) {
            console.warn('[AISummary] API 返回内容为空');
            resolve(null);
          } else {
            resolve(content);
          }
        } catch (e) {
          console.warn('[AISummary] 解析 API 响应失败:', e.message);
          resolve(null);
        }
      });
    });
    req.on('error', (e) => {
      console.warn('[AISummary] 请求异常:', e.message);
      resolve(null);
    });
    req.on('timeout', () => {
      req.destroy();
      console.warn('[AISummary] 请求超时');
      resolve(null);
    });
    req.write(postData);
    req.end();
  });
}

/**
 * 构建总结 prompt - 将情绪统计数据格式化为结构化文本
 * @param {Object} stats - statsByMonth 计算出的统计数据对象
 * @returns {Array<{role: string, content: string}>} - DeepSeek 消息列表
 */
function buildSummaryPrompt(stats) {
  const systemPrompt = '你是一个温暖、有洞察力的情绪陪伴者。请根据用户的月度情绪统计数据，用自然、有温度的中文撰写1-3句话的月度情绪总结。语气亲切但不过度，像一位了解对方的好友在回顾这个月。不要使用列表或标记，直接输出连贯的段落文字。';

  const topEmotionsText = (stats.topEmotions || [])
    .map(e => `${e.name}（${e.count}次）`)
    .join('、');

  const latestSnippets = (stats.latestEntries || [])
    .slice(0, 3)
    .map(e => {
      const text = (e.rawInput || '').substring(0, 50);
      return `- ${text}`;
    })
    .join('\n');

  const userPrompt = [
    `月份：${stats.monthLabel}`,
    `本月记录总数：${stats.totalEntries}条`,
    `出现最多的情绪：${topEmotionsText || '暂无数据'}`,
    `正面情绪占比：${stats.positiveRatio}%，负面情绪占比：${stats.negativeRatio}%`,
    `最近日记片段：\n${latestSnippets || '（无记录）'}`
  ].join('\n');

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
}

/**
 * 基于情绪统计数据调用 DeepSeek 生成 AI 月度总结
 * @param {Object} stats - statsByMonth 计算出的统计数据对象
 * @returns {Promise<string|null>} - AI 总结文案，失败返回 null
 */
async function generateAISummary(stats) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.warn('[AISummary] DEEPSEEK_API_KEY 未配置，跳过 AI 生成');
    return null;
  }

  const messages = buildSummaryPrompt(stats);
  const content = await callDeepSeekAPI(messages, 10000);
  if (content) {
    console.log('[AISummary] AI 总结生成成功');
    return content;
  }
  return null;
}

/**
 * 带缓存的 AI 月度总结获取 - 先查云数据库缓存，没有再调用 AI 生成并持久化
 * @param {string} openid - 用户 openid
 * @param {number} year - 年份
 * @param {number} month - 月份
 * @param {Object} stats - 统计数据对象（传给 AI prompt）
 * @returns {Promise<string|null>} - AI 总结文案（缓存/新生成），失败返回 null
 */
async function getOrGenerateAISummary(openid, year, month, stats) {
  try {
    // 1. 查询 monthly_ai_summaries 缓存
    const cacheResult = await db.collection('monthly_ai_summaries')
      .where({ openid, year, month })
      .limit(1)
      .get();

    if (cacheResult.data.length > 0) {
      const record = cacheResult.data[0];
      const generatedAt = record.generatedAt instanceof Date ? record.generatedAt : new Date(record.generatedAt);
      const now = new Date();
      const isToday = generatedAt.getFullYear() === now.getFullYear()
        && generatedAt.getMonth() === now.getMonth()
        && generatedAt.getDate() === now.getDate();

      if (isToday) {
        console.log('[AISummary] 命中当日缓存，直接返回');
        return record.summary;
      }
      console.log('[AISummary] 缓存非当日生成，重新生成');
    }

    // 2. 缓存未命中/过期，调用 AI 生成
    const aiSummary = await generateAISummary(stats);
    if (!aiSummary) {
      return null;
    }

    // 3. 持久化到云数据库（upsert 模式）
    const now = new Date();
    const collection = db.collection('monthly_ai_summaries');
    const existingQuery = await collection.where({ openid, year, month }).limit(1).get();

    if (existingQuery.data.length > 0) {
      await collection.doc(existingQuery.data[0]._id).update({
        data: { summary: aiSummary, generatedAt: now }
      });
    } else {
      await collection.add({
        data: { openid, year, month, summary: aiSummary, generatedAt: now }
      });
    }
    console.log('[AISummary] AI 总结已持久化到数据库');
    return aiSummary;
  } catch (e) {
    console.warn('[AISummary] 缓存/生成过程异常:', e.message);
    return null;
  }
}

/**
 * 强制刷新月度 AI 总结（内测用） - 不走缓存，直接调用 AI 生成并更新数据库
 */
async function refreshAISummary(openid, payload) {
  const year = Number(payload.year);
  const month = Number(payload.month);
  if (!year || !month) {
    const error = new Error('月份参数不完整');
    error.code = 'INVALID_PAYLOAD';
    throw error;
  }

  // 1. 获取当月统计数据
  const monthData = await listMonthJournals(openid, { year, month });
  const entries = monthData.entries;
  if (entries.length === 0) {
    return { summary: '', monthLabel: monthData.monthLabel, totalEntries: 0 };
  }

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
      percent: totalMentions ? Math.round((emotionCounter[name] / totalMentions) * 100) : 0,
      color: getEmotionColor(name)
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);

  const negativeCount = entries.filter((entry) => entry.isNegative).length;
  const negativeRatio = entries.length ? Math.round((negativeCount / entries.length) * 100) : 0;
  const mainEmotionRanks = Object.keys(mainEmotionCounter)
    .map((name) => ({ name, count: mainEmotionCounter[name] }))
    .sort((left, right) => right.count - left.count);

  const stats = {
    year,
    month,
    monthLabel: monthData.monthLabel,
    totalEntries: entries.length,
    topEmotions,
    mainEmotionRanks,
    negativeCount,
    positiveCount: entries.length - negativeCount,
    negativeRatio,
    positiveRatio: entries.length ? 100 - negativeRatio : 0,
    latestEntries: entries.slice(0, 4)
  };

  // 2. 强制调用 AI 生成（不走缓存）
  const aiSummary = await generateAISummary(stats);
  if (!aiSummary) {
    const error = new Error('AI 总结生成失败，请稍后重试');
    error.code = 'AI_SUMMARY_FAILED';
    throw error;
  }

  // 3. 覆盖缓存
  const now = new Date();
  const collection = db.collection('monthly_ai_summaries');
  const existingQuery = await collection.where({ openid, year, month }).limit(1).get();
  if (existingQuery.data.length > 0) {
    await collection.doc(existingQuery.data[0]._id).update({
      data: { summary: aiSummary, generatedAt: now }
    });
  } else {
    await collection.add({
      data: { openid, year, month, summary: aiSummary, generatedAt: now }
    });
  }

  console.log('[AISummary] 内测强制刷新 AI 总结成功');
  return { summary: aiSummary };
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

    const riskLevel = normalizeRiskLevel(journal.riskLevel, journal.isHighRisk ? 'high' : 'none');
    const riskType = normalizeRiskType(journal.riskType, riskLevel === 'high' ? 'crisis' : 'none');
    const riskSignal = typeof journal.riskSignal === 'boolean' ? journal.riskSignal : riskLevel !== 'none';
    const addResult = await collection.add({
      data: {
        openid,
        clientMigrationKey: journal.id,
        rawInput: journal.rawInput,
        mainEmotion: journal.mainEmotion,
        subEmotions: Array.isArray(journal.subEmotions) ? journal.subEmotions : [],
        explanations: journal.explanations && typeof journal.explanations === 'object' ? journal.explanations : {},
        foreignEmotionWord: normalizeForeignEmotionWord(journal.foreignEmotionWord),
        analysis: journal.analysis || '',
        suggestion: journal.suggestion || '',
        isNegative: typeof journal.isNegative === 'boolean' ? journal.isNegative : true,
        riskLevel,
        riskType,
        riskSignal,
        riskReason: typeof journal.riskReason === 'string' ? journal.riskReason.trim() : '',
        isHighRisk: riskLevel === 'high',
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
    refreshAISummary,
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

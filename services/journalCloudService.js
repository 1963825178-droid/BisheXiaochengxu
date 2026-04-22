const { attachJournalMeta } = require('./journalStore');

function normalizeError(error, fallbackMessage) {
  if (!error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: fallbackMessage
    };
  }

  return {
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message || fallbackMessage
  };
}

function ensureCloudAvailable() {
  if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') {
    throw {
      code: 'CLOUD_NOT_AVAILABLE',
      message: '当前环境未启用云开发能力，请稍后再试'
    };
  }
}

async function callJournalService(action, payload, fallbackMessage) {
  ensureCloudAvailable();

  try {
    const response = await wx.cloud.callFunction({
      name: 'journalService',
      data: {
        action,
        payload: payload || {}
      }
    });

    const result = response && response.result ? response.result : null;
    if (!result || result.ok !== true) {
      const error = result && result.error ? result.error : null;
      throw {
        code: error && error.code ? error.code : 'INVALID_RESPONSE',
        message: error && error.message ? error.message : fallbackMessage
      };
    }

    return result.data || {};
  } catch (error) {
    throw normalizeError(error, fallbackMessage);
  }
}

function normalizeJournal(journal) {
  return attachJournalMeta(journal || {});
}

async function createJournal(result) {
  const data = await callJournalService('create', result, '保存到云端失败，请稍后再试');
  return normalizeJournal(data.journal);
}

async function getRecentJournals(limit) {
  const data = await callJournalService('recentList', { limit: limit || 3 }, '读取最近记录失败，请稍后再试');
  return Array.isArray(data.entries) ? data.entries.map(normalizeJournal) : [];
}

async function getMonthEntries(year, month) {
  const data = await callJournalService('listByMonth', { year, month }, '读取月度日记失败，请稍后再试');
  return Array.isArray(data.entries) ? data.entries.map(normalizeJournal) : [];
}

async function getJournalDetail(id) {
  const data = await callJournalService('detail', { id }, '读取日记详情失败，请稍后再试');
  return data.journal ? normalizeJournal(data.journal) : null;
}

async function getMonthStats(year, month) {
  const data = await callJournalService('statsByMonth', { year, month }, '读取月度统计失败，请稍后再试');
  return Object.assign({}, data, {
    latestEntries: Array.isArray(data.latestEntries) ? data.latestEntries.map(normalizeJournal) : []
  });
}

async function deleteJournal(id) {
  const data = await callJournalService('delete', { id }, '删除日记失败，请稍后再试');
  return Object.assign({}, data, {
    journal: data.journal ? normalizeJournal(data.journal) : null
  });
}

async function migrateLocalJournals(journals) {
  const data = await callJournalService(
    'migrateLocal',
    {
      journals: Array.isArray(journals) ? journals : []
    },
    '同步本地记录失败，请稍后再试'
  );

  return Object.assign({}, data, {
    migratedEntries: Array.isArray(data.migratedEntries) ? data.migratedEntries.map(normalizeJournal) : []
  });
}

module.exports = {
  createJournal,
  deleteJournal,
  getJournalDetail,
  getMonthEntries,
  getMonthStats,
  getRecentJournals,
  migrateLocalJournals,
  normalizeError
};

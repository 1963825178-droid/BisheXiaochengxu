const journalCloudService = require('./journalCloudService');
const { getMigratableLocalJournals } = require('./journalStore');

let currentUser = null;
let bootstrapPromise = null;

function storeCurrentUser(user) {
  currentUser = user;
  try {
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.currentUser = user;
    }
  } catch (error) {
    return null;
  }
  return user;
}

function normalizeUser(user) {
  const safeUser = user || {};
  return {
    openid: safeUser.openid || '',
    nickname: safeUser.nickname || '微信用户',
    avatarUrl: safeUser.avatarUrl || '',
    localMigrationDone: Boolean(safeUser.localMigrationDone),
    journalCount: Number(safeUser.journalCount || 0),
    createdAt: safeUser.createdAt || '',
    lastLoginAt: safeUser.lastLoginAt || ''
  };
}

function getAccountInitial(user) {
  const nickname = user && user.nickname ? String(user.nickname).trim() : '';
  return nickname ? nickname.slice(0, 1) : '我';
}

async function callUserBootstrap(fallbackMessage) {
  if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') {
    throw {
      code: 'CLOUD_NOT_AVAILABLE',
      message: '当前环境未启用云开发能力，请稍后再试'
    };
  }

  try {
    const response = await wx.cloud.callFunction({
      name: 'userBootstrap',
      data: {}
    });

    const result = response && response.result ? response.result : null;
    if (!result || result.ok !== true || !result.data) {
      const error = result && result.error ? result.error : null;
      throw {
        code: error && error.code ? error.code : 'INVALID_RESPONSE',
        message: error && error.message ? error.message : fallbackMessage
      };
    }

    return normalizeUser(result.data);
  } catch (error) {
    throw {
      code: error.code || 'USER_BOOTSTRAP_FAILED',
      message: error.message || fallbackMessage
    };
  }
}

async function runLocalMigrationIfNeeded(user, force) {
  const shouldMigrate = force || !user.localMigrationDone;
  if (!shouldMigrate) {
    return user;
  }

  const localJournals = getMigratableLocalJournals();
  try {
    await journalCloudService.migrateLocalJournals(localJournals);
  } catch (error) {
    if (!force) {
      return user;
    }
    throw error;
  }

  return callUserBootstrap('同步用户信息失败，请稍后再试');
}

async function bootstrapCurrentUser(options) {
  const config = Object.assign(
    {
      force: false,
      forceMigration: false
    },
    options || {}
  );

  if (currentUser && !config.force && !config.forceMigration) {
    return currentUser;
  }

  if (bootstrapPromise && !config.force && !config.forceMigration) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    const user = await callUserBootstrap('获取用户信息失败，请稍后再试');
    storeCurrentUser(user);
    const migratedUser = await runLocalMigrationIfNeeded(user, config.forceMigration);
    storeCurrentUser(migratedUser);
    return migratedUser;
  })();

  try {
    return await bootstrapPromise;
  } finally {
    bootstrapPromise = null;
  }
}

function ensureCurrentUser() {
  return bootstrapCurrentUser();
}

function getCurrentUserSync() {
  return currentUser;
}

async function refreshCurrentUser() {
  return bootstrapCurrentUser({ force: true });
}

async function rerunLocalMigration() {
  return bootstrapCurrentUser({
    force: true,
    forceMigration: true
  });
}

module.exports = {
  bootstrapCurrentUser,
  ensureCurrentUser,
  getAccountInitial,
  getCurrentUserSync,
  refreshCurrentUser,
  rerunLocalMigration
};

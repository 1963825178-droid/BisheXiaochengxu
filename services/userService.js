const journalCloudService = require('./journalCloudService');
const { getMigratableLocalJournals } = require('./journalStore');
const { CLOUD_ENV_ID } = require('../utils/runtimeConfig');

const DEFAULT_NICKNAME = '\u5fae\u4fe1\u7528\u6237';
const DEFAULT_INITIAL = '\u6211';

const MESSAGE_CLOUD_UNAVAILABLE = '\u5f53\u524d\u73af\u5883\u672a\u542f\u7528\u4e91\u5f00\u53d1\u80fd\u529b\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002';
const MESSAGE_BOOTSTRAP_FAILED = '\u83b7\u53d6\u7528\u6237\u4fe1\u606f\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5';
const MESSAGE_SYNC_USER_FAILED = '\u540c\u6b65\u7528\u6237\u4fe1\u606f\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5';
const MESSAGE_UPLOAD_AVATAR_FAILED = '\u5934\u50cf\u4e0a\u4f20\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5';
const MESSAGE_SAVE_PROFILE_FAILED = '\u4fdd\u5b58\u8d44\u6599\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5';
const MESSAGE_REQUEST_TIMEOUT = '\u8bf7\u6c42\u8d85\u65f6\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u540e\u91cd\u8bd5';
const MESSAGE_FUNCTION_NOT_FOUND = '\u4e91\u51fd\u6570\u672a\u90e8\u7f72\u6216\u540d\u79f0\u4e0d\u5339\u914d\uff0c\u8bf7\u5728\u5fae\u4fe1\u5f00\u53d1\u8005\u5de5\u5177\u91cc\u91cd\u65b0\u90e8\u7f72 userProfile \u4e91\u51fd\u6570';
const MESSAGE_INVALID_NICKNAME = '\u8bf7\u5148\u586b\u5199\u6635\u79f0';

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
    nickname: safeUser.nickname || DEFAULT_NICKNAME,
    avatarUrl: safeUser.avatarUrl || '',
    avatarDisplayUrl: '',
    localMigrationDone: Boolean(safeUser.localMigrationDone),
    journalCount: Number(safeUser.journalCount || 0),
    createdAt: safeUser.createdAt || '',
    lastLoginAt: safeUser.lastLoginAt || ''
  };
}

function isCloudFileId(value) {
  return /^cloud:\/\//i.test(String(value || '').trim());
}

function isLegacyCloudAvatarUrl(value) {
  return /^https?:\/\/[^/]+\.tcb\.qcloud\.la\/.+/i.test(String(value || '').trim());
}

function buildFileIdFromLegacyAvatarUrl(avatarUrl) {
  if (!CLOUD_ENV_ID) {
    return '';
  }

  const matched = String(avatarUrl || '').trim().match(/^https?:\/\/([^/]+)\.tcb\.qcloud\.la\/([^?#]+)/i);
  if (!matched) {
    return '';
  }

  const bucketName = matched[1];
  const cloudPath = matched[2].replace(/^\/+/, '');
  if (!bucketName || !cloudPath) {
    return '';
  }

  return `cloud://${CLOUD_ENV_ID}.${bucketName}/${cloudPath}`;
}

async function getAvatarTempFileURL(fileID) {
  if (!fileID) {
    return '';
  }

  try {
    ensureCloudAvailable();

    const response = await wx.cloud.getTempFileURL({
      fileList: [fileID]
    });

    const fileList = response && Array.isArray(response.fileList) ? response.fileList : [];
    const firstFile = fileList.length ? fileList[0] : null;
    return firstFile && typeof firstFile.tempFileURL === 'string' ? firstFile.tempFileURL : '';
  } catch (error) {
    return '';
  }
}

async function resolveAvatarDisplayUrl(avatarUrl) {
  const rawAvatarUrl = String(avatarUrl || '').trim();
  if (!rawAvatarUrl) {
    return '';
  }

  if (isCloudFileId(rawAvatarUrl)) {
    return getAvatarTempFileURL(rawAvatarUrl);
  }

  if (isLegacyCloudAvatarUrl(rawAvatarUrl)) {
    const fileID = buildFileIdFromLegacyAvatarUrl(rawAvatarUrl);
    if (!fileID) {
      return '';
    }

    return getAvatarTempFileURL(fileID);
  }

  return rawAvatarUrl;
}

async function hydrateUser(user) {
  const normalizedUser = normalizeUser(user);
  normalizedUser.avatarDisplayUrl = await resolveAvatarDisplayUrl(normalizedUser.avatarUrl);
  return normalizedUser;
}

function getAccountInitial(user) {
  const nickname = user && user.nickname ? String(user.nickname).trim() : '';
  return nickname ? nickname.slice(0, 1) : DEFAULT_INITIAL;
}

function ensureCloudAvailable() {
  if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') {
    throw {
      code: 'CLOUD_NOT_AVAILABLE',
      message: MESSAGE_CLOUD_UNAVAILABLE
    };
  }
}

function isTimeoutError(error) {
  const rawCode = error && error.code ? String(error.code).toLowerCase() : '';
  const rawMessage = error && error.message ? String(error.message).toLowerCase() : '';
  return rawCode.includes('timeout') || rawMessage.includes('timeout') || rawMessage.includes('\u8d85\u65f6');
}

function isFunctionNotFoundError(error) {
  const rawCode = error && error.code ? String(error.code).toLowerCase() : '';
  const rawMessage = error && error.message ? String(error.message).toLowerCase() : '';
  return rawCode.includes('-501000') || rawMessage.includes('function_not_found') || rawMessage.includes('could not be found');
}

function normalizeError(error, fallbackMessage) {
  if (isTimeoutError(error)) {
    return {
      code: error && error.code ? error.code : 'TIMEOUT',
      message: MESSAGE_REQUEST_TIMEOUT
    };
  }

  if (isFunctionNotFoundError(error)) {
    return {
      code: error && error.code ? error.code : 'FUNCTION_NOT_FOUND',
      message: MESSAGE_FUNCTION_NOT_FOUND
    };
  }

  return {
    code: error && error.code ? error.code : 'UNKNOWN_ERROR',
    message: error && error.message ? error.message : fallbackMessage
  };
}

async function callUserBootstrap(fallbackMessage) {
  ensureCloudAvailable();

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

    return hydrateUser(result.data);
  } catch (error) {
    throw normalizeError(error, fallbackMessage);
  }
}

async function callUserProfile(payload, fallbackMessage) {
  ensureCloudAvailable();

  try {
    const response = await wx.cloud.callFunction({
      name: 'userProfile',
      data: payload || {}
    });

    const result = response && response.result ? response.result : null;
    if (!result || result.ok !== true || !result.data) {
      const error = result && result.error ? result.error : null;
      throw {
        code: error && error.code ? error.code : 'INVALID_RESPONSE',
        message: error && error.message ? error.message : fallbackMessage
      };
    }

    return hydrateUser(result.data);
  } catch (error) {
    throw normalizeError(error, fallbackMessage);
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

  return callUserBootstrap(MESSAGE_SYNC_USER_FAILED);
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
    const user = await callUserBootstrap(MESSAGE_BOOTSTRAP_FAILED);
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

function getAvatarExtension(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    return '.png';
  }

  const match = filePath.match(/\.[a-zA-Z0-9]+$/);
  return match ? match[0].toLowerCase() : '.png';
}

function buildAvatarCloudPath(tempFilePath) {
  const extension = getAvatarExtension(tempFilePath);
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `user-avatars/${timestamp}-${randomSuffix}${extension}`;
}

function compressAvatar(tempFilePath) {
  if (!tempFilePath || typeof wx.compressImage !== 'function') {
    return Promise.resolve(tempFilePath);
  }

  return new Promise((resolve) => {
    wx.compressImage({
      src: tempFilePath,
      quality: 72,
      success(result) {
        resolve(result && result.tempFilePath ? result.tempFilePath : tempFilePath);
      },
      fail() {
        resolve(tempFilePath);
      }
    });
  });
}

async function uploadAvatar(tempFilePath) {
  ensureCloudAvailable();

  if (!tempFilePath) {
    return '';
  }

  try {
    const uploadFilePath = await compressAvatar(tempFilePath);
    const uploadResult = await wx.cloud.uploadFile({
      cloudPath: buildAvatarCloudPath(tempFilePath),
      filePath: uploadFilePath
    });

    return uploadResult && uploadResult.fileID ? uploadResult.fileID : '';
  } catch (error) {
    throw normalizeError(error, MESSAGE_UPLOAD_AVATAR_FAILED);
  }
}

async function saveUserProfile(profile) {
  const current = await ensureCurrentUser();
  const nextNickname = String((profile && profile.nickname) || '').trim() || current.nickname || '';

  if (!nextNickname) {
    throw {
      code: 'INVALID_NICKNAME',
      message: MESSAGE_INVALID_NICKNAME
    };
  }

  let avatarUrl = current.avatarUrl || '';
  if (profile && profile.avatarTempPath) {
    avatarUrl = await uploadAvatar(profile.avatarTempPath);
  } else if (profile && typeof profile.avatarUrl === 'string') {
    avatarUrl = profile.avatarUrl;
  }

  const user = await callUserProfile(
    {
      nickname: nextNickname,
      avatarUrl
    },
    MESSAGE_SAVE_PROFILE_FAILED
  );

  return storeCurrentUser(user);
}

module.exports = {
  bootstrapCurrentUser,
  ensureCurrentUser,
  getAccountInitial,
  getCurrentUserSync,
  refreshCurrentUser,
  rerunLocalMigration,
  saveUserProfile
};

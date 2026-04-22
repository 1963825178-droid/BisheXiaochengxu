const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function maskOpenid(openid) {
  if (!openid || openid.length < 8) {
    return '******';
  }

  return `${openid.slice(0, 3)}***${openid.slice(-3)}`;
}

function normalizeUserRecord(record, journalCount) {
  return {
    openid: maskOpenid(record.openid),
    nickname: record.nickname || '微信用户',
    avatarUrl: record.avatarUrl || '',
    localMigrationDone: Boolean(record.localMigrationDone),
    journalCount: Number(journalCount || 0),
    createdAt: record.createdAt || '',
    lastLoginAt: record.lastLoginAt || ''
  };
}

async function countActiveJournals(openid) {
  const countResult = await db.collection('journals').where({
    openid,
    isDeleted: false
  }).count();

  return countResult.total || 0;
}

function normalizeNickname(value) {
  return String(value || '').trim();
}

exports.main = async (event) => {
  try {
    const { OPENID } = cloud.getWXContext();
    if (!OPENID) {
      return {
        ok: false,
        error: {
          code: 'OPENID_MISSING',
          message: '当前用户身份不可用，请稍后再试。'
        }
      };
    }

    const nickname = normalizeNickname(event && event.nickname);
    const avatarUrl = event && typeof event.avatarUrl === 'string' ? event.avatarUrl : '';

    if (!nickname) {
      return {
        ok: false,
        error: {
          code: 'INVALID_NICKNAME',
          message: '请先填写昵称'
        }
      };
    }

    const now = new Date().toISOString();
    const collection = db.collection('users');
    const existing = await collection.where({ openid: OPENID }).limit(1).get();
    const journalCount = await countActiveJournals(OPENID);

    let userRecord = null;

    if (!existing.data.length) {
      userRecord = {
        openid: OPENID,
        nickname,
        avatarUrl,
        createdAt: now,
        lastLoginAt: now,
        localMigrationDone: false,
        journalCount
      };

      await collection.add({
        data: userRecord
      });
    } else {
      userRecord = Object.assign({}, existing.data[0], {
        nickname,
        avatarUrl
      });

      await collection.doc(existing.data[0]._id).update({
        data: {
          nickname,
          avatarUrl,
          journalCount
        }
      });
    }

    return {
      ok: true,
      data: normalizeUserRecord(userRecord, journalCount)
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: error && error.code ? error.code : 'USER_PROFILE_UPDATE_FAILED',
        message: error && error.message ? error.message : '保存资料失败，请稍后再试'
      }
    };
  }
};

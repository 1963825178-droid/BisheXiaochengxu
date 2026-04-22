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

exports.main = async () => {
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

    const now = new Date().toISOString();
    const collection = db.collection('users');
    const existing = await collection.where({ openid: OPENID }).limit(1).get();

    let userRecord = null;
    if (!existing.data.length) {
      const freshUser = {
        openid: OPENID,
        nickname: '微信用户',
        avatarUrl: '',
        createdAt: now,
        lastLoginAt: now,
        localMigrationDone: false,
        journalCount: 0
      };

      await collection.add({
        data: freshUser
      });
      userRecord = freshUser;
    } else {
      userRecord = existing.data[0];
      await collection.doc(userRecord._id).update({
        data: {
          lastLoginAt: now
        }
      });
      userRecord.lastLoginAt = now;
    }

    const journalCount = await countActiveJournals(OPENID);
    await collection.where({ openid: OPENID }).update({
      data: {
        journalCount
      }
    });

    return {
      ok: true,
      data: normalizeUserRecord(userRecord, journalCount)
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: error && error.code ? error.code : 'USER_BOOTSTRAP_FAILED',
        message: error && error.message ? error.message : '获取用户信息失败，请稍后再试'
      }
    };
  }
};

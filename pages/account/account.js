const userService = require('../../services/userService');

const DEFAULT_ACCOUNT_TEXT = '\u6211';
const DEFAULT_NICKNAME = '\u5fae\u4fe1\u7528\u6237';
const AVATAR_PICKER_LOCK_MS = 1800;

const MESSAGE_LOADING_USER_FAILED = '\u6682\u65f6\u65e0\u6cd5\u8bfb\u53d6\u8d26\u53f7\u4fe1\u606f';
const MESSAGE_LOCAL_SYNCED = '\u672c\u5730\u5386\u53f2\u8bb0\u5f55\u5df2\u540c\u6b65\u5230\u4e91\u7aef';
const MESSAGE_LOCAL_PENDING = '\u672c\u5730\u5386\u53f2\u8bb0\u5f55\u5f85\u540c\u6b65';
const MESSAGE_NICKNAME_REQUIRED = '\u6635\u79f0\u672a\u4fdd\u5b58\uff0c\u8bf7\u91cd\u65b0\u9009\u62e9';
const MESSAGE_PROFILE_SAVED = '\u6635\u79f0\u5df2\u66f4\u65b0';
const MESSAGE_PROFILE_SAVE_FAILED = '\u4fdd\u5b58\u6635\u79f0\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5';
const MESSAGE_AVATAR_SAVED = '\u5934\u50cf\u5df2\u66f4\u65b0';
const MESSAGE_AVATAR_SAVE_FAILED = '\u4fdd\u5b58\u5934\u50cf\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5';
const MESSAGE_SYNCING = '\u540c\u6b65\u4e2d';
const MESSAGE_SYNC_DONE = '\u540c\u6b65\u5b8c\u6210';
const MESSAGE_SYNC_FAILED = '\u540c\u6b65\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5';

function normalizeNickname(value, fallbackValue) {
  const nextValue = String(value || '').trim();
  if (nextValue) {
    return nextValue;
  }

  return String(fallbackValue || '').trim();
}

function getSavedNickname(user) {
  return normalizeNickname(user && user.nickname, DEFAULT_NICKNAME);
}

function getEditableNickname(user) {
  const savedNickname = normalizeNickname(user && user.nickname, '');
  return savedNickname && savedNickname !== DEFAULT_NICKNAME ? savedNickname : '';
}

function hasNicknameChange(user, editingNickname) {
  if (!user) {
    return false;
  }

  const draftNickname = String(editingNickname || '').trim();
  if (!draftNickname) {
    return false;
  }

  return draftNickname !== getSavedNickname(user);
}

Page({
  data: {
    user: null,
    accountAvatarText: DEFAULT_ACCOUNT_TEXT,
    avatarPreviewUrl: '',
    editingNickname: '',
    canSubmitNickname: false,
    syncStatusText: MESSAGE_LOCAL_PENDING,
    syncButtonText: '\u91cd\u65b0\u540c\u6b65\u672c\u5730\u8bb0\u5f55',
    isSavingAvatar: false,
    isSavingNickname: false,
    isAvatarPickerActive: false
  },

  async onShow() {
    await this.loadUserProfile();
  },

  onHide() {
    this.releaseAvatarPickerLock();
  },

  onUnload() {
    this.releaseAvatarPickerLock();
  },

  async loadUserProfile() {
    try {
      const user = await userService.refreshCurrentUser();
      this.applyUser(user);
    } catch (error) {
      this.setData({
        user: null,
        accountAvatarText: DEFAULT_ACCOUNT_TEXT,
        avatarPreviewUrl: '',
        editingNickname: '',
        canSubmitNickname: false,
        isSavingAvatar: false,
        isSavingNickname: false,
        isAvatarPickerActive: false,
        syncStatusText: MESSAGE_LOADING_USER_FAILED
      });
    }
  },

  applyUser(user, options) {
    const config = Object.assign({}, options || {});
    const editingNickname = typeof config.editingNickname === 'string'
      ? config.editingNickname
      : getEditableNickname(user);

    const nextState = {
      user,
      accountAvatarText: userService.getAccountInitial(user),
      avatarPreviewUrl: user && user.avatarDisplayUrl ? user.avatarDisplayUrl : '',
      editingNickname,
      isSavingAvatar: false,
      isSavingNickname: false,
      isAvatarPickerActive: false,
      syncStatusText: user.localMigrationDone ? MESSAGE_LOCAL_SYNCED : MESSAGE_LOCAL_PENDING
    };

    nextState.canSubmitNickname = this.recomputeCanSubmitNickname(nextState);
    this.setData(nextState);
  },

  recomputeCanSubmitNickname(nextState) {
    const user = nextState && Object.prototype.hasOwnProperty.call(nextState, 'user')
      ? nextState.user
      : this.data.user;
    const editingNickname = nextState && Object.prototype.hasOwnProperty.call(nextState, 'editingNickname')
      ? nextState.editingNickname
      : this.data.editingNickname;

    return hasNicknameChange(user, editingNickname);
  },

  updateNicknameDraft(value) {
    const nextState = {
      editingNickname: typeof value === 'string' ? value : ''
    };
    nextState.canSubmitNickname = this.recomputeCanSubmitNickname(nextState);
    this.setData(nextState);
  },

  getNicknameValueFromEvent(event) {
    return event && event.detail && typeof event.detail.value === 'string'
      ? event.detail.value
      : '';
  },

  startAvatarPickerLock() {
    if (this.avatarPickerLocked || this.data.isSavingAvatar) {
      return false;
    }

    this.avatarPickerLocked = true;
    if (this.avatarPickerLockTimer) {
      clearTimeout(this.avatarPickerLockTimer);
    }

    this.setData({
      isAvatarPickerActive: true
    });

    this.avatarPickerLockTimer = setTimeout(() => {
      this.releaseAvatarPickerLock();
    }, AVATAR_PICKER_LOCK_MS);

    return true;
  },

  releaseAvatarPickerLock() {
    this.avatarPickerLocked = false;

    if (this.avatarPickerLockTimer) {
      clearTimeout(this.avatarPickerLockTimer);
      this.avatarPickerLockTimer = null;
    }

    if (this.data.isAvatarPickerActive) {
      this.setData({
        isAvatarPickerActive: false
      });
    }
  },

  handleAvatarPickerTap() {
    this.startAvatarPickerLock();
  },

  handleAvatarPickerTouchStart() {
    this.startAvatarPickerLock();
  },

  handleAvatarImageError() {
    this.setData({
      avatarPreviewUrl: ''
    });
  },

  async handleChooseAvatar(event) {
    this.releaseAvatarPickerLock();

    const avatarTempPath = event && event.detail && event.detail.avatarUrl
      ? event.detail.avatarUrl
      : '';

    if (!avatarTempPath || this.data.isSavingAvatar) {
      return;
    }

    const draftNickname = this.data.editingNickname;
    const preserveNicknameDraft = hasNicknameChange(this.data.user, draftNickname);

    this.setData({
      avatarPreviewUrl: avatarTempPath,
      isSavingAvatar: true
    });

    try {
      const user = await userService.saveUserProfile({
        nickname: getSavedNickname(this.data.user),
        avatarTempPath,
        avatarUrl: this.data.user && this.data.user.avatarUrl ? this.data.user.avatarUrl : ''
      });

      if (preserveNicknameDraft) {
        this.applyUser(user, {
          editingNickname: draftNickname
        });
      } else {
        this.applyUser(user);
      }

      wx.showToast({
        title: MESSAGE_AVATAR_SAVED,
        icon: 'success'
      });
    } catch (error) {
      const nextState = {
        isSavingAvatar: false,
        avatarPreviewUrl: this.data.user && this.data.user.avatarDisplayUrl ? this.data.user.avatarDisplayUrl : ''
      };

      if (preserveNicknameDraft) {
        nextState.editingNickname = draftNickname;
      }

      nextState.canSubmitNickname = this.recomputeCanSubmitNickname(nextState);
      this.setData(nextState);

      wx.showToast({
        title: error.message || MESSAGE_AVATAR_SAVE_FAILED,
        icon: 'none'
      });
    } finally {
      this.releaseAvatarPickerLock();
    }
  },

  handleNicknameInput(event) {
    this.updateNicknameDraft(this.getNicknameValueFromEvent(event));
  },

  async handleNicknameBlur(event) {
    await this.commitNicknameFromEvent(event);
  },

  async commitNicknameFromEvent(event) {
    if (this.data.isSavingNickname || this.data.isSavingAvatar) {
      return;
    }

    const previousDraft = this.data.editingNickname;
    const editingNickname = this.getNicknameValueFromEvent(event);
    const hadPendingNickname = hasNicknameChange(this.data.user, previousDraft);

    this.updateNicknameDraft(editingNickname);

    if (!String(editingNickname || '').trim()) {
      if (previousDraft || hadPendingNickname) {
        wx.showToast({
          title: MESSAGE_NICKNAME_REQUIRED,
          icon: 'none'
        });
      }
      return;
    }

    if (!hasNicknameChange(this.data.user, editingNickname)) {
      return;
    }

    await this.saveNickname(editingNickname, {
      notifyWhenEmpty: false
    });
  },

  async handleNicknameKeyboardConfirm(event) {
    await this.commitNicknameFromEvent(event);
  },

  async saveNickname(nextNicknameValue, options) {
    const config = Object.assign(
      {
        notifyWhenEmpty: true
      },
      options || {}
    );

    const nickname = String(nextNicknameValue || '').trim();
    if (!nickname) {
      this.setData({
        editingNickname: '',
        canSubmitNickname: false
      });

      if (config.notifyWhenEmpty) {
        wx.showToast({
          title: MESSAGE_NICKNAME_REQUIRED,
          icon: 'none'
        });
      }
      return;
    }

    const savedNickname = getSavedNickname(this.data.user);
    const nextState = {
      editingNickname: nickname
    };
    nextState.canSubmitNickname = nickname !== savedNickname;
    this.setData(nextState);

    if (nickname === savedNickname) {
      return;
    }

    this.setData({
      isSavingNickname: true
    });

    try {
      const user = await userService.saveUserProfile({
        nickname,
        avatarUrl: this.data.user && this.data.user.avatarUrl ? this.data.user.avatarUrl : ''
      });

      this.applyUser(user);
      wx.showToast({
        title: MESSAGE_PROFILE_SAVED,
        icon: 'success'
      });
    } catch (error) {
      const failedState = {
        isSavingNickname: false,
        editingNickname: nickname
      };
      failedState.canSubmitNickname = this.recomputeCanSubmitNickname(failedState);
      this.setData(failedState);

      wx.showToast({
        title: error.message || MESSAGE_PROFILE_SAVE_FAILED,
        icon: 'none'
      });
    }
  },

  async syncLocalJournals() {
    wx.showLoading({
      title: MESSAGE_SYNCING
    });

    try {
      const user = await userService.rerunLocalMigration();
      this.applyUser(user);
      wx.showToast({
        title: MESSAGE_SYNC_DONE,
        icon: 'success'
      });
    } catch (error) {
      wx.showToast({
        title: error.message || MESSAGE_SYNC_FAILED,
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  goCalendar() {
    wx.navigateTo({
      url: '/pages/calendar/calendar'
    });
  },

  goStats() {
    wx.navigateTo({
      url: '/pages/stats/stats'
    });
  }
});

const userService = require('../../services/userService');

const DEFAULT_ACCOUNT_TEXT = '\u6211';
const DEFAULT_NICKNAME = '\u5fae\u4fe1\u7528\u6237';

const MESSAGE_LOADING_USER_FAILED = '\u6682\u65f6\u65e0\u6cd5\u8bfb\u53d6\u8d26\u53f7\u4fe1\u606f';
const MESSAGE_LOCAL_SYNCED = '\u672c\u5730\u5386\u53f2\u8bb0\u5f55\u5df2\u540c\u6b65\u5230\u4e91\u7aef';
const MESSAGE_LOCAL_PENDING = '\u672c\u5730\u5386\u53f2\u8bb0\u5f55\u5f85\u540c\u6b65';
const MESSAGE_NICKNAME_REQUIRED = '\u8bf7\u5148\u786e\u8ba4\u6635\u79f0';
const MESSAGE_PROFILE_SAVED = '\u8d44\u6599\u5df2\u66f4\u65b0';
const MESSAGE_PROFILE_SAVE_FAILED = '\u4fdd\u5b58\u8d44\u6599\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5';
const MESSAGE_SYNCING = '\u540c\u6b65\u4e2d';
const MESSAGE_SYNC_DONE = '\u540c\u6b65\u5b8c\u6210';
const MESSAGE_SYNC_FAILED = '\u540c\u6b65\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5';

function normalizeNickname(value, fallbackValue) {
  const nextValue = String(value || '').trim();
  return nextValue || String(fallbackValue || '').trim();
}

Page({
  data: {
    user: null,
    accountAvatarText: DEFAULT_ACCOUNT_TEXT,
    avatarPreviewUrl: '',
    avatarTempPath: '',
    editingNickname: '',
    showNicknameModal: false,
    nicknameModalFocus: false,
    canConfirmNickname: false,
    syncStatusText: MESSAGE_LOCAL_PENDING,
    syncButtonText: '\u91cd\u65b0\u540c\u6b65\u672c\u5730\u8bb0\u5f55',
    isSavingProfile: false
  },

  async onShow() {
    await this.loadUserProfile();
  },

  noop() {},

  async loadUserProfile() {
    try {
      const user = await userService.refreshCurrentUser();
      this.applyUser(user);
    } catch (error) {
      this.setData({
        user: null,
        accountAvatarText: DEFAULT_ACCOUNT_TEXT,
        avatarPreviewUrl: '',
        avatarTempPath: '',
        editingNickname: '',
        showNicknameModal: false,
        nicknameModalFocus: false,
        canConfirmNickname: false,
        isSavingProfile: false,
        syncStatusText: MESSAGE_LOADING_USER_FAILED
      });
    }
  },

  applyUser(user) {
    this.setData({
      user,
      accountAvatarText: userService.getAccountInitial(user),
      avatarPreviewUrl: user.avatarUrl || '',
      avatarTempPath: '',
      editingNickname: user.nickname || DEFAULT_NICKNAME,
      showNicknameModal: false,
      nicknameModalFocus: false,
      canConfirmNickname: true,
      isSavingProfile: false,
      syncStatusText: user.localMigrationDone ? MESSAGE_LOCAL_SYNCED : MESSAGE_LOCAL_PENDING
    });
  },

  recomputeCanConfirm(nextState) {
    const user = nextState && nextState.user ? nextState.user : this.data.user;
    const editingNickname = nextState && Object.prototype.hasOwnProperty.call(nextState, 'editingNickname')
      ? nextState.editingNickname
      : this.data.editingNickname;

    const currentNickname = normalizeNickname(user && user.nickname, DEFAULT_NICKNAME);
    const draftNickname = normalizeNickname(editingNickname, currentNickname);
    return Boolean(draftNickname);
  },

  handleChooseAvatar(event) {
    const avatarTempPath = event.detail && event.detail.avatarUrl ? event.detail.avatarUrl : '';
    if (!avatarTempPath) {
      return;
    }

    const nextState = {
      avatarTempPath,
      avatarPreviewUrl: avatarTempPath,
      showNicknameModal: true,
      nicknameModalFocus: true
    };
    nextState.canConfirmNickname = this.recomputeCanConfirm(nextState);
    this.setData(nextState);
  },

  handleNicknameInput(event) {
    const editingNickname = event.detail && typeof event.detail.value === 'string'
      ? event.detail.value
      : '';

    const nextState = { editingNickname };
    nextState.canConfirmNickname = this.recomputeCanConfirm(nextState);
    this.setData(nextState);
  },

  handleNicknameKeyboardConfirm(event) {
    const editingNickname = event && event.detail && typeof event.detail.value === 'string'
      ? event.detail.value
      : this.data.editingNickname;

    const nextState = {
      editingNickname,
      nicknameModalFocus: false
    };
    nextState.canConfirmNickname = this.recomputeCanConfirm(nextState);
    this.setData(nextState, () => {
      this.handleNicknameModalConfirm();
    });
  },

  async handleNicknameModalConfirm() {
    if (this.data.isSavingProfile) {
      return;
    }

    const nickname = normalizeNickname(
      this.data.editingNickname,
      this.data.user && this.data.user.nickname ? this.data.user.nickname : DEFAULT_NICKNAME
    );

    if (!nickname) {
      wx.showToast({
        title: MESSAGE_NICKNAME_REQUIRED,
        icon: 'none'
      });
      this.setData({
        nicknameModalFocus: true
      });
      return;
    }

    this.setData({
      editingNickname: nickname,
      nicknameModalFocus: false
    });

    await this.saveProfile();
  },

  async saveProfile() {
    if (this.data.isSavingProfile) {
      return;
    }

    const nickname = normalizeNickname(
      this.data.editingNickname,
      this.data.user && this.data.user.nickname ? this.data.user.nickname : DEFAULT_NICKNAME
    );

    if (!nickname) {
      wx.showToast({
        title: MESSAGE_NICKNAME_REQUIRED,
        icon: 'none'
      });
      return;
    }

    this.setData({
      isSavingProfile: true
    });

    try {
      const user = await userService.saveUserProfile({
        nickname,
        avatarTempPath: this.data.avatarTempPath || '',
        avatarUrl: this.data.user && this.data.user.avatarUrl ? this.data.user.avatarUrl : ''
      });

      this.applyUser(user);
      wx.showToast({
        title: MESSAGE_PROFILE_SAVED,
        icon: 'success'
      });
    } catch (error) {
      this.setData({
        isSavingProfile: false,
        showNicknameModal: true,
        nicknameModalFocus: true,
        canConfirmNickname: this.recomputeCanConfirm()
      });

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

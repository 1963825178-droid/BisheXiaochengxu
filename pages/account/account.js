const userService = require('../../services/userService');

Page({
  data: {
    user: null,
    accountAvatarText: '我',
    syncStatusText: '未开始同步',
    syncButtonText: '重新同步本地记录'
  },

  async onShow() {
    await this.loadUserProfile();
  },

  async loadUserProfile() {
    try {
      const user = await userService.refreshCurrentUser();
      this.applyUser(user);
    } catch (error) {
      this.setData({
        user: null,
        accountAvatarText: '我',
        syncStatusText: '暂时无法读取账号信息'
      });
    }
  },

  applyUser(user) {
    this.setData({
      user,
      accountAvatarText: userService.getAccountInitial(user),
      syncStatusText: user.localMigrationDone ? '本地历史记录已同步到云端' : '本地历史记录待同步'
    });
  },

  async syncLocalJournals() {
    wx.showLoading({
      title: '同步中'
    });

    try {
      const user = await userService.rerunLocalMigration();
      this.applyUser(user);
      wx.showToast({
        title: '同步完成',
        icon: 'success'
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '同步失败，请稍后再试',
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

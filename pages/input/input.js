const {
  clearPendingAnalysis,
  setPendingRawInput
} = require('../../services/journalStore');
const journalCloudService = require('../../services/journalCloudService');
const userService = require('../../services/userService');

Page({
  data: {
    inputText: '',
    canSubmit: false,
    recentJournals: [],
    accountAvatarText: '我',
    accountAvatarUrl: ''
  },

  async onShow() {
    try {
      const user = await userService.ensureCurrentUser();
      const recentJournals = await journalCloudService.getRecentJournals(3);

      this.setData({
        recentJournals,
        accountAvatarText: userService.getAccountInitial(user),
        accountAvatarUrl: user.avatarDisplayUrl || ''
      });
    } catch (error) {
      this.setData({
        recentJournals: [],
        accountAvatarText: '我',
        accountAvatarUrl: ''
      });
    }
  },

  handleInput(event) {
    const inputText = event.detail.value;
    this.setData({
      inputText,
      canSubmit: Boolean(inputText.trim())
    });
  },

  submitText() {
    const text = this.data.inputText.trim();
    if (!text) {
      wx.showToast({
        title: '先写下一点感受',
        icon: 'none'
      });
      return;
    }

    clearPendingAnalysis();
    setPendingRawInput(text);

    wx.navigateTo({
      url: '/pages/result/result'
    });
  },

  handleAccountAvatarError() {
    this.setData({
      accountAvatarUrl: ''
    });
  },

  openAccount() {
    wx.navigateTo({
      url: '/pages/account/account'
    });
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
  },

  openDetail(event) {
    const { id } = event.currentTarget.dataset;
    if (!id) {
      return;
    }

    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  }
});

const journalCloudService = require('../../services/journalCloudService');
const userService = require('../../services/userService');

Page({
  data: {
    year: 0,
    month: 0,
    monthLabel: '',
    totalEntries: 0,
    summary: '',
    topEmotions: [],
    negativeRatio: 0,
    positiveRatio: 0,
    latestEntries: []
  },

  onLoad() {
    const now = new Date();
    this.loadMonth(now.getFullYear(), now.getMonth() + 1);
  },

  onShow() {
    if (this.data.year && this.data.month) {
      this.loadMonth(this.data.year, this.data.month);
    }
  },

  async loadMonth(year, month) {
    try {
      await userService.ensureCurrentUser();
      const stats = await journalCloudService.getMonthStats(year, month);
      this.setData(stats);
    } catch (error) {
      this.setData({
        year,
        month,
        monthLabel: `${year}年${month}月`,
        totalEntries: 0,
        summary: '读取月度统计失败，请稍后再试',
        topEmotions: [],
        negativeRatio: 0,
        positiveRatio: 0,
        latestEntries: []
      });
      wx.showToast({
        title: error.message || '读取月度统计失败，请稍后再试',
        icon: 'none'
      });
    }
  },

  changeMonth(event) {
    const delta = Number(event.currentTarget.dataset.delta);
    const baseDate = new Date(this.data.year, this.data.month - 1 + delta, 1);
    this.loadMonth(baseDate.getFullYear(), baseDate.getMonth() + 1);
  },

  openDetail(event) {
    const { id } = event.currentTarget.dataset;
    if (!id) {
      return;
    }

    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  goCalendar() {
    wx.navigateTo({
      url: '/pages/calendar/calendar'
    });
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/input/input'
    });
  }
});

const { getMonthlyStats } = require('../../services/journalStore');

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

  loadMonth(year, month) {
    this.setData(getMonthlyStats(year, month));
  },

  changeMonth(event) {
    const delta = Number(event.currentTarget.dataset.delta);
    const baseDate = new Date(this.data.year, this.data.month - 1 + delta, 1);
    this.loadMonth(baseDate.getFullYear(), baseDate.getMonth() + 1);
  },

  openDetail(event) {
    const { id } = event.currentTarget.dataset;
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

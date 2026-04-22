const { buildCalendarMonthView } = require('../../services/journalStore');
const journalCloudService = require('../../services/journalCloudService');
const userService = require('../../services/userService');

Page({
  data: {
    weekLabels: ['日', '一', '二', '三', '四', '五', '六'],
    year: 0,
    month: 0,
    monthLabel: '',
    cells: [],
    totalEntries: 0,
    selectedDateKey: '',
    selectedTitle: '先选择一个日期',
    selectedEntries: [],
    monthEntries: []
  },

  onLoad() {
    const now = new Date();
    this.loadMonth(now.getFullYear(), now.getMonth() + 1);
  },

  onShow() {
    if (this.data.year && this.data.month) {
      this.loadMonth(this.data.year, this.data.month, this.data.selectedDateKey);
    }
  },

  async loadMonth(year, month, preferredDateKey) {
    try {
      await userService.ensureCurrentUser();
      const entries = await journalCloudService.getMonthEntries(year, month);
      this.applyMonthEntries(entries, year, month, preferredDateKey);
    } catch (error) {
      this.setData({
        year,
        month,
        monthLabel: `${year}年${month}月`,
        cells: [],
        totalEntries: 0,
        selectedDateKey: '',
        selectedTitle: '读取失败',
        selectedEntries: [],
        monthEntries: []
      });
      wx.showToast({
        title: error.message || '读取日历失败，请稍后再试',
        icon: 'none'
      });
    }
  },

  applyMonthEntries(entries, year, month, preferredDateKey) {
    const viewState = buildCalendarMonthView(entries, year, month, preferredDateKey);
    this.setData(Object.assign({}, viewState, {
      monthEntries: entries
    }));
  },

  changeMonth(event) {
    const delta = Number(event.currentTarget.dataset.delta);
    const baseDate = new Date(this.data.year, this.data.month - 1 + delta, 1);
    this.loadMonth(baseDate.getFullYear(), baseDate.getMonth() + 1);
  },

  selectDay(event) {
    const { dateKey, isCurrentMonth } = event.currentTarget.dataset;
    if (!dateKey || !isCurrentMonth) {
      return;
    }

    this.applyMonthEntries(this.data.monthEntries, this.data.year, this.data.month, dateKey);
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

  goHome() {
    wx.reLaunch({
      url: '/pages/input/input'
    });
  },

  goStats() {
    wx.navigateTo({
      url: '/pages/stats/stats'
    });
  }
});

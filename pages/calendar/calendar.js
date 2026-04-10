const { buildCalendarMonth, getEntriesByDate } = require('../../services/journalStore');

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
    selectedEntries: []
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

  loadMonth(year, month, preferredDateKey) {
    const monthData = buildCalendarMonth(year, month);
    const firstDateWithEntry = monthData.cells.find((cell) => cell.isCurrentMonth && cell.hasEntry);
    const selectedDateKey = preferredDateKey || (firstDateWithEntry ? firstDateWithEntry.dateKey : '');

    this.setData({
      year,
      month,
      monthLabel: monthData.monthLabel,
      cells: monthData.cells,
      totalEntries: monthData.totalEntries,
      selectedDateKey,
      selectedTitle: selectedDateKey ? `${selectedDateKey} 的记录` : '先选择一个日期',
      selectedEntries: selectedDateKey ? getEntriesByDate(selectedDateKey) : []
    });
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

    this.setData({
      selectedDateKey: dateKey,
      selectedTitle: `${dateKey} 的记录`,
      selectedEntries: getEntriesByDate(dateKey)
    });
  },

  openDetail(event) {
    const { id } = event.currentTarget.dataset;
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

const { analyzeAndStore, getRecentJournals } = require('../../services/journalStore');

Page({
  data: {
    inputText: '',
    canSubmit: false,
    examples: [
      '今天被领导说了，感觉有点委屈但又觉得他说得没错',
      '最近什么都没发生，但就是提不起劲',
      '这周要见很重要的人，我期待又有点不安'
    ],
    recentJournals: []
  },

  onShow() {
    this.setData({
      recentJournals: getRecentJournals(3)
    });
  },

  handleInput(event) {
    const inputText = event.detail.value;
    this.setData({
      inputText,
      canSubmit: Boolean(inputText.trim())
    });
  },

  fillExample(event) {
    const inputText = event.currentTarget.dataset.text;
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

    analyzeAndStore(text);
    wx.navigateTo({
      url: '/pages/result/result'
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
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  }
});

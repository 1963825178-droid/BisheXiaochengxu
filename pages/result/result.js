const { getPendingAnalysis, savePendingAnalysis } = require('../../services/journalStore');

Page({
  data: {
    result: null,
    explanationPairs: [],
    savedId: '',
    saveButtonText: '保存这条情绪日记',
    suggestionTitle: '轻量疏导'
  },

  onShow() {
    const result = getPendingAnalysis();
    if (!result) {
      this.setData({
        result: null,
        explanationPairs: [],
        savedId: '',
        saveButtonText: '保存这条情绪日记',
        suggestionTitle: '轻量疏导'
      });
      return;
    }

    this.setData({
      result,
      explanationPairs: this.buildExplanationPairs(result),
      savedId: result.savedId || '',
      saveButtonText: result.savedId ? '已保存到本地' : '保存这条情绪日记',
      suggestionTitle: result.isHighRisk ? '高风险支持提示' : '轻量疏导'
    });
  },

  buildExplanationPairs(result) {
    return [result.mainEmotion].concat(result.subEmotions).map((emotion) => ({
      emotion,
      description: result.explanations[emotion]
    }));
  },

  saveJournal() {
    const journal = savePendingAnalysis();
    if (!journal) {
      wx.showToast({
        title: '没有可保存的记录',
        icon: 'none'
      });
      return;
    }

    this.setData({
      savedId: journal.id,
      saveButtonText: '已保存到本地'
    });

    wx.showToast({
      title: '已保存到本地',
      icon: 'success'
    });
  },

  openDetail() {
    if (!this.data.savedId) {
      return;
    }

    wx.navigateTo({
      url: `/pages/detail/detail?id=${this.data.savedId}`
    });
  },

  backToInput() {
    wx.navigateBack({
      delta: 1
    });
  },

  goCalendar() {
    wx.navigateTo({
      url: '/pages/calendar/calendar'
    });
  }
});

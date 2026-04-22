const { getJournalById } = require('../../services/journalStore');

Page({
  data: {
    journal: null,
    explanationPairs: [],
    suggestionTitle: '轻量疏导',
    sourceLabel: ''
  },

  onLoad(options) {
    const journal = getJournalById(options.id);
    if (!journal) {
      this.setData({
        journal: null,
        explanationPairs: [],
        suggestionTitle: '轻量疏导',
        sourceLabel: ''
      });
      return;
    }

    this.setData({
      journal,
      sourceLabel: journal.source === 'mock' ? '演示结果' : '',
      suggestionTitle: journal.isHighRisk ? '支持提示' : '轻量疏导',
      explanationPairs: [journal.mainEmotion].concat(journal.subEmotions).map((emotion) => ({
        emotion,
        description: journal.explanations[emotion]
      }))
    });
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/input/input'
    });
  }
});

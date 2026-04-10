const { getJournalById } = require('../../services/journalStore');

Page({
  data: {
    journal: null,
    explanationPairs: [],
    suggestionTitle: '轻量疏导'
  },

  onLoad(options) {
    const journal = getJournalById(options.id);
    if (!journal) {
      this.setData({
        journal: null,
        explanationPairs: [],
        suggestionTitle: '轻量疏导'
      });
      return;
    }

    this.setData({
      journal,
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

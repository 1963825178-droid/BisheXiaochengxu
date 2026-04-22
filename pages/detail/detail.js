const journalCloudService = require('../../services/journalCloudService');
const userService = require('../../services/userService');

Page({
  data: {
    journalId: '',
    journal: null,
    explanationPairs: [],
    suggestionTitle: '轻量疏导',
    sourceLabel: ''
  },

  async onLoad(options) {
    const journalId = options.id || '';
    this.setData({ journalId });
    await this.loadJournal();
  },

  async loadJournal() {
    if (!this.data.journalId) {
      this.setData({
        journal: null,
        explanationPairs: [],
        suggestionTitle: '轻量疏导',
        sourceLabel: ''
      });
      return;
    }

    try {
      await userService.ensureCurrentUser();
      const journal = await journalCloudService.getJournalDetail(this.data.journalId);

      this.setData({
        journal,
        sourceLabel: journal.source === 'mock' ? '演示结果' : '',
        suggestionTitle: journal.isHighRisk ? '支持提示' : '轻量疏导',
        explanationPairs: [journal.mainEmotion].concat(journal.subEmotions).map((emotion) => ({
          emotion,
          description: journal.explanations[emotion]
        }))
      });
    } catch (error) {
      this.setData({
        journal: null,
        explanationPairs: [],
        suggestionTitle: '轻量疏导',
        sourceLabel: ''
      });
      wx.showToast({
        title: error.message || '读取日记失败，请稍后再试',
        icon: 'none'
      });
    }
  },

  deleteJournal() {
    if (!this.data.journalId) {
      return;
    }

    wx.showModal({
      title: '删除日记',
      content: '删除后将不再出现在你的日记列表中，确定继续吗？',
      confirmColor: '#b86759',
      success: async (res) => {
        if (!res.confirm) {
          return;
        }

        wx.showLoading({
          title: '删除中'
        });

        try {
          await journalCloudService.deleteJournal(this.data.journalId);
          wx.showToast({
            title: '已删除',
            icon: 'success'
          });
          wx.navigateBack({
            delta: 1,
            fail() {
              wx.reLaunch({
                url: '/pages/input/input'
              });
            }
          });
        } catch (error) {
          wx.showToast({
            title: error.message || '删除失败，请稍后再试',
            icon: 'none'
          });
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

  goHome() {
    wx.reLaunch({
      url: '/pages/input/input'
    });
  }
});

const emotionService = require('../../services/emotionService');
const journalCloudService = require('../../services/journalCloudService');
const userService = require('../../services/userService');
const { formatDateTimeValue } = require('../../utils/time');
const {
  getPendingAnalysis,
  getPendingRawInput,
  markPendingAnalysisSaved,
  setPendingAnalysis
} = require('../../services/journalStore');

Page({
  data: {
    status: 'idle',
    result: null,
    explanationPairs: [],
    errorMessage: '',
    canUseMockFallback: emotionService.canUseMockDemo(),
    savedId: '',
    saveButtonText: '保存这条情绪日记',
    suggestionTitle: '轻量疏导',
    sourceLabel: ''
  },

  onShow() {
    if (this.data.status === 'succeeded' && this.data.result) {
      return;
    }

    const existing = getPendingAnalysis();
    const rawInput = getPendingRawInput();

    if (existing && existing.rawInput && (!rawInput || existing.rawInput === rawInput)) {
      this.applyResult(existing);
      return;
    }

    if (!rawInput) {
      this.setData({
        status: 'idle',
        result: null,
        explanationPairs: [],
        errorMessage: ''
      });
      return;
    }

    this.runAnalysis(rawInput);
  },

  buildExplanationPairs(result) {
    return [result.mainEmotion].concat(result.subEmotions).map((emotion) => ({
      emotion,
      description: result.explanations[emotion]
    }));
  },

  applyResult(result) {
    const nextResult = Object.assign({}, result, {
      displayTimeText: formatDateTimeValue(result.createdAt)
    });

    this.setData({
      status: 'succeeded',
      result: nextResult,
      explanationPairs: this.buildExplanationPairs(nextResult),
      errorMessage: '',
      savedId: nextResult.savedId || '',
      saveButtonText: nextResult.savedId ? '已保存到云端' : '保存这条情绪日记',
      suggestionTitle: nextResult.isHighRisk ? '高风险支持提示' : '轻量疏导',
      sourceLabel: nextResult.source === 'mock' ? '演示结果' : ''
    });
  },

  async runAnalysis(rawInput) {
    this.setData({
      status: 'analyzing',
      result: null,
      explanationPairs: [],
      errorMessage: '',
      savedId: '',
      saveButtonText: '保存这条情绪日记',
      suggestionTitle: '轻量疏导',
      sourceLabel: ''
    });

    try {
      const result = await emotionService.analyze(rawInput);
      setPendingAnalysis(result);
      this.applyResult(result);
    } catch (error) {
      this.setData({
        status: 'failed',
        result: null,
        explanationPairs: [],
        errorMessage: error.message || '真实分析暂时不可用，请稍后再试。',
        savedId: '',
        sourceLabel: ''
      });
    }
  },

  retryAnalysis() {
    const rawInput = getPendingRawInput();
    if (!rawInput) {
      return;
    }

    this.runAnalysis(rawInput);
  },

  useMockDemo() {
    const rawInput = getPendingRawInput();
    if (!rawInput) {
      return;
    }

    const result = emotionService.analyzeWithMock(rawInput);
    setPendingAnalysis(result);
    this.applyResult(result);
  },

  async saveJournal() {
    if (this.data.status !== 'succeeded' || this.data.savedId) {
      return;
    }

    wx.showLoading({
      title: '保存中'
    });

    try {
      await userService.ensureCurrentUser();
      const journal = await journalCloudService.createJournal(this.data.result);
      const nextResult = Object.assign({}, this.data.result, { savedId: journal.id });

      setPendingAnalysis(nextResult);
      markPendingAnalysisSaved(journal.id);

      this.setData({
        result: nextResult,
        savedId: journal.id,
        saveButtonText: '已保存到云端'
      });

      wx.showToast({
        title: '已保存到云端',
        icon: 'success'
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '保存失败，请稍后再试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
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

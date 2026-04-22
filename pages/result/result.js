const emotionService = require('../../services/emotionService');
const {
  getPendingAnalysis,
  getPendingRawInput,
  savePendingAnalysis,
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
    this.setData({
      status: 'succeeded',
      result,
      explanationPairs: this.buildExplanationPairs(result),
      errorMessage: '',
      savedId: result.savedId || '',
      saveButtonText: result.savedId ? '已保存到本地' : '保存这条情绪日记',
      suggestionTitle: result.isHighRisk ? '高风险支持提示' : '轻量疏导',
      sourceLabel: result.source === 'mock' ? '演示结果' : ''
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
        errorMessage: error.message || '真实分析暂时不可用，请稍后再试',
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

  saveJournal() {
    if (this.data.status !== 'succeeded') {
      return;
    }

    const journal = savePendingAnalysis();
    if (!journal) {
      wx.showToast({
        title: '当前结果还不能保存',
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

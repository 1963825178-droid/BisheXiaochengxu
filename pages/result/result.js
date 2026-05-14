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
    isAutoSaving: false,
    autoSaveErrorMessage: '',
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
      isAutoSaving: false,
      autoSaveErrorMessage: '',
      suggestionTitle: nextResult.riskLevel === 'high' ? '高风险支持提示' : '轻量疏导',
      sourceLabel: nextResult.source === 'mock' ? '演示结果' : ''
    }, () => {
      this.autoSaveJournal(nextResult);
    });
  },

  async runAnalysis(rawInput) {
    this.setData({
      status: 'analyzing',
      result: null,
      explanationPairs: [],
      errorMessage: '',
      savedId: '',
      isAutoSaving: false,
      autoSaveErrorMessage: '',
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
        isAutoSaving: false,
        autoSaveErrorMessage: '',
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

  async autoSaveJournal(resultToSave) {
    if (!resultToSave || resultToSave.savedId || this.autoSaveInFlight) {
      return;
    }

    this.autoSaveInFlight = true;
    this.setData({
      isAutoSaving: true,
      autoSaveErrorMessage: ''
    });

    try {
      await userService.ensureCurrentUser();
      const journal = await journalCloudService.createJournal(resultToSave);
      const nextResult = Object.assign({}, resultToSave, { savedId: journal.id });

      setPendingAnalysis(nextResult);
      markPendingAnalysisSaved(journal.id);

      this.setData({
        result: nextResult,
        savedId: journal.id,
        isAutoSaving: false,
        autoSaveErrorMessage: ''
      });

      wx.showToast({
        title: '已自动保存',
        icon: 'success'
      });
    } catch (error) {
      const message = error.message || '保存失败，请稍后再试';
      this.setData({
        isAutoSaving: false,
        autoSaveErrorMessage: message
      });
      wx.showToast({
        title: '自动保存失败',
        icon: 'none'
      });
    } finally {
      this.autoSaveInFlight = false;
    }
  },

  backToInput() {
    wx.navigateBack({
      delta: 1,
      fail() {
        wx.reLaunch({
          url: '/pages/input/input'
        });
      }
    });
  },

  goCalendar() {
    wx.navigateTo({
      url: '/pages/calendar/calendar'
    });
  }
});

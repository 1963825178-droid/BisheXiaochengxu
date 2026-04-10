const { formatDateKey, formatDateTime } = require('../utils/time');

const HIGH_RISK_PATTERN = /自杀|自残|自伤|不想活|想死|结束自己|活着没意思|伤害自己|撑不下去/;

const DEFAULT_TEMPLATE = {
  mainEmotion: '茫然',
  subEmotions: ['疲惫', '迟滞', '分心'],
  explanations: {
    '茫然': '你感觉自己在经历一些情绪波动，但还没有完全找到它的名字。',
    '疲惫': '这更像是一种被消耗后的迟缓，做事的启动成本变高了。',
    '迟滞': '你不是没有想法，而是暂时很难把状态切换到行动上。',
    '分心': '注意力容易飘走，常见于压力累积或情绪没有被说清的时候。'
  },
  analysis:
    '这段感受里最明显的是一种说不清的内耗。你未必正被单一事件困住，更像是被许多小压力慢慢拉低了能量，所以才会出现提不起劲、难以聚焦的感觉。',
  isNegative: true,
  suggestion:
    '先不要逼自己一次性把原因想清楚。也许可以从一件最小的动作开始，比如喝口水、离开屏幕两分钟，给情绪一点缓冲空间。'
};

const TEMPLATES = [
  {
    keywords: ['领导', '批评', '委屈', '说了', '评价', '误解'],
    mainEmotion: '委屈',
    subEmotions: ['不甘', '疲惫', '困惑'],
    explanations: {
      '委屈': '你感到被评价或误解，同时又没有足够空间完整表达自己。',
      '不甘': '你知道事情本可以更好，所以心里会反复想“如果当时再做一点会不会不同”。',
      '疲惫': '这种拉扯会消耗很多注意力，让身体和情绪一起变沉。',
      '困惑': '你一边理解对方的立场，一边又不确定该怎样安放自己的感受。'
    },
    analysis:
      '你在这件事情里既体验到了被指出问题的不舒服，也隐约知道对方可能不全是错的，于是形成了一种“想解释却解释不尽”的委屈。它往往会和不甘、疲惫一起出现。',
    isNegative: true,
    suggestion:
      '你现在的不舒服是可以理解的，不需要立刻把自己调整成“没事”。先把感受放稳，再决定要不要沟通，会更省力。'
  },
  {
    keywords: ['提不起劲', '没意思', '空', '低落', '不想动', '无精打采'],
    mainEmotion: '低落',
    subEmotions: ['空心感', '无力', '迟缓'],
    explanations: {
      '低落': '你的情绪能量整体往下走，很多事情会失去原本的吸引力。',
      '空心感': '不是一定发生了坏事，而是心里像被抽掉了一块，难以连接到热情。',
      '无力': '你知道要做什么，却很难在当下提起行动的力气。',
      '迟缓': '情绪和身体像被放慢了一拍，连反应都变得更慢。'
    },
    analysis:
      '这更像是一种持续性的情绪走低，不一定有明确导火索，却会影响行动感和兴趣感。它不吵闹，但会让人慢慢失去对日常的连接。',
    isNegative: true,
    suggestion:
      '先别把目标放在“重新振作”，把它换成“让自己稍微好一点点”会更温和。比如去窗边站一分钟，或者只完成一件两分钟以内的小事。'
  },
  {
    keywords: ['未来', '毕业', '选择', '迷茫', '方向', '怎么办'],
    mainEmotion: '迷茫',
    subEmotions: ['压力', '犹豫', '自我怀疑'],
    explanations: {
      '迷茫': '你正在面对不确定，却暂时看不见清晰的方向。',
      '压力': '选择越重要，心里承担的结果想象就越多。',
      '犹豫': '每个选项都像有代价，所以你很难轻松做决定。',
      '自我怀疑': '你会开始反复检视自己，担心能力或判断不够。'
    },
    analysis:
      '你现在更像是被“未来还没成形”的不确定感包围。它不只是选项多，而是每个选择都牵着后续结果，所以压力和自我怀疑会一起冒出来。',
    isNegative: true,
    suggestion:
      '不必一下子选出终局答案。先把最近一周能推进的一小步列出来，会比一直卡在“大方向”里更容易缓解压力。'
  },
  {
    keywords: ['期待', '不安', '见面', '开始', '喜欢', '关系'],
    mainEmotion: '期待',
    subEmotions: ['不安', '心动', '谨慎'],
    explanations: {
      '期待': '你对接下来的事情有投入感，也愿意往前走一步。',
      '不安': '越在意，越容易担心结果不如预期。',
      '心动': '这份关系或变化对你来说是有吸引力和想象空间的。',
      '谨慎': '你并不是退缩，而是在努力保护自己不被轻易伤到。'
    },
    analysis:
      '这是一种很典型的混合情绪。你在向前靠近的同时，也担心自己投入后会失望，所以“期待”和“不安”会一起存在，并不矛盾。',
    isNegative: false,
    suggestion:
      '允许自己一边期待、一边保留分寸就好。你不需要逼自己现在就确定答案，慢一点观察关系的发展也很正常。'
  },
  {
    keywords: ['吵架', '生气', '火大', '烦', '争执', '冲突'],
    mainEmotion: '愤懑',
    subEmotions: ['受伤', '防御', '紧绷'],
    explanations: {
      '愤懑': '你不只是生气，更像是觉得边界被踩到了。',
      '受伤': '强烈情绪下面常常包着被忽视或被冒犯的不舒服。',
      '防御': '你会下意识绷起来，避免自己再被进一步影响。',
      '紧绷': '身体和情绪都处在随时准备应对的状态，难以放松。'
    },
    analysis:
      '这段情绪里最突出的不是单纯的火气，而是冲突带来的受伤和防御感。你可能已经进入了“先保护自己”的状态，所以很难马上平静下来。',
    isNegative: true,
    suggestion:
      '如果情绪还很高，可以先让自己离开争执现场一会儿。等身体不再那么绷，再决定要不要继续沟通，通常会更有效。'
  }
];

function cloneExplanations(source) {
  const result = {};
  Object.keys(source).forEach((key) => {
    result[key] = source[key];
  });
  return result;
}

function findTemplate(text) {
  let bestMatch = DEFAULT_TEMPLATE;
  let bestScore = 0;

  TEMPLATES.forEach((template) => {
    const score = template.keywords.reduce((count, keyword) => {
      return count + (text.indexOf(keyword) > -1 ? 1 : 0);
    }, 0);

    if (score > bestScore) {
      bestMatch = template;
      bestScore = score;
    }
  });

  return bestMatch;
}

function createDiaryText(payload) {
  const keywordLine = [payload.mainEmotion].concat(payload.subEmotions).join('｜');
  const suggestionTitle = payload.isHighRisk ? '支持提示' : '此刻可以试试';
  return [
    `你的记录：${payload.sourceText}`,
    `关键词：${keywordLine}`,
    `情绪解析：${payload.analysis}`,
    `${suggestionTitle}：${payload.suggestion}`
  ].join('\n');
}

function buildResult(sourceText, template, now, extra) {
  const payload = Object.assign({}, template, extra || {});
  return {
    sourceText,
    mainEmotion: payload.mainEmotion,
    subEmotions: payload.subEmotions.slice(),
    explanations: cloneExplanations(payload.explanations),
    analysis: payload.analysis,
    isNegative: payload.isNegative,
    isHighRisk: Boolean(payload.isHighRisk),
    suggestion: payload.suggestion,
    createdAt: now.toISOString(),
    dateKey: formatDateKey(now),
    displayDateTime: formatDateTime(now),
    diaryText: createDiaryText({
      sourceText,
      mainEmotion: payload.mainEmotion,
      subEmotions: payload.subEmotions,
      analysis: payload.analysis,
      suggestion: payload.suggestion,
      isHighRisk: Boolean(payload.isHighRisk)
    })
  };
}

function analyzeEmotionText(text, options) {
  const normalizedText = (text || '').trim();
  const now = options && options.now ? options.now : new Date();

  if (HIGH_RISK_PATTERN.test(normalizedText)) {
    return buildResult(
      normalizedText,
      {
        mainEmotion: '极度低落',
        subEmotions: ['失控感', '绝望', '孤立感'],
        explanations: {
          '极度低落': '你现在的情绪负荷已经很重，单靠硬撑可能会越来越困难。',
          '失控感': '很多事情像从手里滑出去，让你难以稳住自己。',
          '绝望': '你可能会觉得眼前没有出口，这种感受值得被认真对待。',
          '孤立感': '人在极端低落时，很容易觉得自己只能一个人扛。'
        },
        analysis:
          '这段表达已经超出了普通的情绪波动，说明你正承受非常高的痛苦和压力。现在最重要的不是继续分析，而是尽快让自己回到有人能支持你的环境里。',
        isNegative: true,
        isHighRisk: true,
        suggestion:
          '如果你已经有伤害自己的念头，请优先联系身边可信任的人陪着你，或尽快联系当地心理援助热线、医院急诊或紧急求助渠道。先确保自己不是一个人。'
      },
      now
    );
  }

  return buildResult(normalizedText, findTemplate(normalizedText), now);
}

module.exports = {
  analyzeEmotionText
};

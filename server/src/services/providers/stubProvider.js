function selectTemplate(rawInput) {
  const text = rawInput || '';

  if (/领导|批评|委屈|评价|误解/.test(text)) {
    return {
      mainEmotion: '委屈',
      subEmotions: ['不甘', '疲惫', '困惑'],
      explanations: {
        '委屈': '你感到被评价或误解，同时又没有完全表达开的空间。',
        '不甘': '你觉得事情本可以更好，所以心里还在拉扯。',
        '疲惫': '这种拉扯会持续消耗你的能量。',
        '困惑': '你一边理解对方，一边又放不下自己的感受。'
      },
      analysis: '你既感到被指出问题的不舒服，也意识到对方可能并非全错，因此出现了复杂的委屈和内耗。',
      isNegative: true,
      isHighRisk: false,
      suggestion: '你现在的不舒服是可以理解的，先不用急着证明自己，给情绪一点缓冲时间。'
    };
  }

  if (/提不起劲|没意思|低落|不想动|无精打采/.test(text)) {
    return {
      mainEmotion: '低落',
      subEmotions: ['无力', '空心感', '迟缓'],
      explanations: {
        '低落': '你的情绪能量整体往下走，很多事情都变得没有吸引力。',
        '无力': '你知道要做什么，却很难在当下提起行动的力气。',
        '空心感': '心里像被抽掉了一块，难以连接到热情。',
        '迟缓': '情绪和身体都像慢了一拍。'
      },
      analysis: '这更像是一种持续性的情绪走低，不一定有明确导火索，却会影响行动感和兴趣感。',
      isNegative: true,
      isHighRisk: false,
      suggestion: '先别把目标放在“重新振作”，把它换成“让自己稍微好一点点”会更温和。'
    };
  }

  if (/自杀|自残|自伤|不想活|想死|结束自己/.test(text)) {
    return {
      mainEmotion: '极度低落',
      subEmotions: ['失控感', '绝望', '孤立感'],
      explanations: {
        '极度低落': '你现在的情绪负荷已经很重，单靠硬撑可能会越来越困难。',
        '失控感': '很多事情像从手里滑出去，让你难以稳住自己。',
        '绝望': '你可能会觉得眼前没有出口，这种感受值得被认真对待。',
        '孤立感': '人在极端低落时，很容易觉得自己只能一个人扛。'
      },
      analysis: '这段表达说明你正承受非常高的痛苦和压力，现在最重要的是优先保证安全。',
      isNegative: true,
      isHighRisk: true,
      suggestion: '请尽快联系可信任的人、当地心理援助热线或医院急诊，先确保自己不是一个人。'
    };
  }

  return {
    mainEmotion: '茫然',
    subEmotions: ['疲惫', '迟滞', '分心'],
    explanations: {
      '茫然': '你感觉自己在经历一些情绪波动，但还没有完全找到它的名字。',
      '疲惫': '这更像是一种被消耗后的迟缓。',
      '迟滞': '你不是没有想法，而是暂时很难切换到行动状态。',
      '分心': '注意力容易飘走，常见于压力累积的时候。'
    },
    analysis: '这段感受里最明显的是一种说不清的内耗，像是许多小压力一起堆了上来。',
    isNegative: true,
    isHighRisk: false,
    suggestion: '先不要逼自己一次性把原因想清楚，可以先从一个最小的动作开始。'
  };
}

async function analyze(rawInput) {
  return selectTemplate(rawInput);
}

module.exports = {
  analyze
};

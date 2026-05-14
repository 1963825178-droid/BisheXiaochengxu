function selectTemplate(rawInput) {
  const text = rawInput || '';
  const risk = classifyStubRisk(text);

  if (risk.riskLevel === 'high') {
    return {
      mainEmotion: risk.riskType === 'harm_others' ? '强烈愤怒' : '极度低落',
      subEmotions: risk.riskType === 'harm_others' ? ['报复冲动', '失控感', '敌意'] : ['失控感', '绝望', '孤立感'],
      explanations: {
        '极度低落': '你现在的情绪负荷已经很重，单靠硬撑可能会越来越困难。',
        '强烈愤怒': '这段表达里愤怒和攻击冲动已经很强，需要先拉开现实距离。',
        '报复冲动': '你把痛苦指向了具体对象，并出现了报复性表达。',
        '敌意': '语言里包含明确攻击和威胁，需要先停止升级。',
        '失控感': '很多事情像从手里滑出去，让你难以稳住自己。',
        '绝望': '你可能会觉得眼前没有出口，这种感受值得被认真对待。',
        '孤立感': '人在极端低落时，很容易觉得自己只能一个人扛。'
      },
      foreignEmotionWord: null,
      analysis: risk.riskType === 'harm_others'
        ? '这段表达包含明确伤害他人的威胁和升级信号，当前最重要的是让冲突降温，并尽快让现实中的第三方介入。'
        : '这段表达说明你正承受非常高的痛苦和压力，现在最重要的是优先保证安全。',
      isNegative: true,
      riskLevel: risk.riskLevel,
      riskType: risk.riskType,
      riskSignal: risk.riskSignal,
      riskReason: risk.riskReason,
      isHighRisk: true,
      suggestion: risk.riskType === 'harm_others'
        ? '先尽量远离冲突对象，暂停继续发送攻击性信息。可以联系可信任的人、辅导员、家人、老师或相关人员帮助介入。如果你担心自己会失控伤人，请立即寻求现实紧急帮助。'
        : '请尽快联系可信任的人、当地心理援助热线或医院急诊，先确保自己不是一个人。'
    };
  }

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
      foreignEmotionWord: {
        word: 'lítost',
        language: '捷克语',
        meaning: '一种被伤害后的委屈、羞恼、自怜和不甘交织在一起的感受。'
      },
      analysis: '你既感到被指出问题的不舒服，也意识到对方可能并非全错，因此出现了复杂的委屈和内耗。',
      isNegative: true,
      riskLevel: risk.riskLevel,
      riskType: risk.riskType,
      riskSignal: risk.riskSignal,
      riskReason: risk.riskReason,
      isHighRisk: risk.riskLevel === 'high',
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
      foreignEmotionWord: {
        word: 'acedia',
        language: '拉丁语',
        meaning: '一种精神上的倦怠、提不起劲和与生活暂时断开连接的状态。'
      },
      analysis: '这更像是一种持续性的情绪走低，不一定有明确导火索，却会影响行动感和兴趣感。',
      isNegative: true,
      riskLevel: risk.riskLevel,
      riskType: risk.riskType,
      riskSignal: risk.riskSignal,
      riskReason: risk.riskReason,
      isHighRisk: risk.riskLevel === 'high',
      suggestion: '先别把目标放在“重新振作”，把它换成“让自己稍微好一点点”会更温和。'
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
    foreignEmotionWord: {
      word: 'ennui',
      language: '法语',
      meaning: '一种说不清缘由的倦怠、空虚和兴趣减退感。'
    },
    analysis: '这段感受里最明显的是一种说不清的内耗，像是许多小压力一起堆了上来。',
    isNegative: true,
    riskLevel: risk.riskLevel,
    riskType: risk.riskType,
    riskSignal: risk.riskSignal,
    riskReason: risk.riskReason,
    isHighRisk: risk.riskLevel === 'high',
    suggestion: '先不要逼自己一次性把原因想清楚，可以先从一个最小的动作开始。'
  };
}

function classifyStubRisk(text) {
  if (/(?:我)?(?:真|真的|现在|马上|等会儿|一会儿)?(?:想|要|准备|打算|决定|必须|一定要).{0,10}(?:把你|将你|对你).{0,8}(?:杀了|弄死|砍死|打死|废了)|杀了你|弄死你|砍死你|打死你|废了你|捅死你|宰了你|(?:你|他|她|这个人|那个人).{0,8}(?:必须|一定要|就该|该).{0,8}(?:死在我手里|被我弄死|被我杀了)|(?:再有一次|你再这样|你再|再敢|下次再).{0,18}(?:杀了你|弄死你|砍死你|打死你|废了你|死在我手里|必须死)/.test(text)) {
    return {
      riskLevel: 'high',
      riskType: 'harm_others',
      riskSignal: true,
      riskReason: '表达中出现明确伤害他人的对象、威胁、条件式升级或致死表达。'
    };
  }

  if (/准备自杀|打算自杀|决定自杀|计划自杀|今晚.*结束自己|今天.*结束自己|想跳楼|想跳河|想割腕|(?:今晚|今天|现在|马上|等会儿|一会儿|明天).{0,16}从.{0,8}(楼上|楼顶|天台|桥上|窗户|高处).{0,8}跳下去|(?:我|自己).{0,8}(?:想|要|准备|打算|决定|计划).{0,12}从.{0,8}(楼上|楼顶|天台|桥上|窗户|高处).{0,8}跳下去|买好了?药|药.{0,8}买好了?|买了安眠药|安眠药.{0,8}买了|写好了?遗书|遗书.{0,8}写好了?|永别了|这是我最后一次/.test(text)) {
    return {
      riskLevel: 'high',
      riskType: 'self_harm',
      riskSignal: true,
      riskReason: '表达中出现明确自伤/自杀意图、方法、准备行为或告别表达。'
    };
  }

  if (/想死|去死了|直接去死|不想活|撑不下去|活着没意思|原地消失|要跳了|想跳了|真要跳了|难懂得要死|难懂的要死|难听得要死|难听的要死|累死了|烦死了|气死了|困死了|累死|烦死/.test(text)) {
    const hasAmbiguousJump = /要跳了|想跳了|真要跳了/.test(text);
    return {
      riskLevel: hasAmbiguousJump ? 'medium' : /加班|工作|考试|考试周|作业|论文|毕设|bug|Bug|BUG|代码|改得|累得|忙得|烦得|太难|老师|课程|这课|听完|难懂|难听|拖/.test(text) ? 'mild' : 'medium',
      riskType: 'self_harm',
      riskSignal: true,
      riskReason: '表达中有弱风险词，但语义上更接近压力宣泄或自怨自艾，没有明确计划、方法或准备行为。'
    };
  }

  if (/杀了我|要把我干死|把我干死|把我干死了|干死我|气得想打人|想骂人|想揍人/.test(text)) {
    return {
      riskLevel: 'mild',
      riskType: 'abuse',
      riskSignal: true,
      riskReason: '表达中出现攻击性或危险词，但没有明确伤害他人的对象、计划或真实意图。'
    };
  }

  return {
    riskLevel: 'none',
    riskType: 'none',
    riskSignal: false,
    riskReason: '没有出现明确自伤意图、计划、方法、准备行为或告别表达。'
  };
}

async function analyze(rawInput) {
  return selectTemplate(rawInput);
}

module.exports = {
  analyze
};

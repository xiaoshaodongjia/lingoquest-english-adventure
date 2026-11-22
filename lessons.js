// Age and English proficiency are separate choices in the application.
// These lessons use a small, reusable phrase in three different activities.
// Accepted expressions are examples, not an exhaustive language assessment.
export const ZONES = [
  { id: 'hello', title: '日常相遇', subtitle: '从一句你好开始', icon: 'hello', color: 'green', description: '打招呼、认识朋友，说出自己的喜好。', story: {"title": "欢迎广场的新伙伴", "introduction": "米娜正在为探险小队招募新伙伴。说出名字，接住一句问候，再找个共同爱好。", "conclusion": "里奥和诺拉认识了你，小队找到共同话题，准备一起出发。", "badge": "相遇同行章"} },
  { id: 'daily', title: '生活小镇', subtitle: '让英语派上用场', icon: 'cup', color: 'orange', description: '点饮料、问价格，在日常生活中表达需要。', story: {"title": "集市里的半日小逛", "introduction": "小队来到生活小镇的集市。先点饮料，问清纪念品价格，再为伙伴准备午餐。", "conclusion": "饮料、纪念品和午餐都安排好了，你能用英语说出日常需要了。", "badge": "集市生活章"} },
  { id: 'travel', title: '旅行港湾', subtitle: '带着英语去看看', icon: 'plane', color: 'blue', description: '问路、买餐、确认预订，完成旅途中的小任务。', story: {"title": "港湾出发的一天", "introduction": "从港湾去下一座小岛。找到车站，带上餐点，到目的地确认预订。", "conclusion": "你问清了方向，带好餐点并安顿晚餐，旅途顺利了一点。", "badge": "港湾旅人章"} },
  { id: 'story', title: '兴趣星球', subtitle: '聊你喜欢的世界', icon: 'play', color: 'purple', description: '聊歌曲、游戏和故事，把兴趣变成开口的理由。', story: {"title": "和林林的兴趣午后", "introduction": "林林带来歌曲、合作游戏和冒险故事。聊喜好，发邀请，再问下一段剧情。", "conclusion": "喜欢的内容成了可以分享的话题，林林已经是你的兴趣伙伴。", "badge": "兴趣伙伴章"} },
  { id: 'study', title: '学习工坊', subtitle: '不会也可以问', icon: 'book', color: 'yellow', description: '请人重复、理解生词，学会主动求助。', story: {"title": "把问号带回工坊", "introduction": "米拉带你读探险地图。听不清就请她重复，生词问意思，没懂的问题说清楚。", "conclusion": "遇到听不清、生词和疑问，你都有办法主动求助，让交流继续。", "badge": "好奇求助章"} },
  { id: 'work', title: '职场城市', subtitle: '一起把事情做好', icon: 'briefcase', color: 'teal', description: '问候团队、约时间、请人帮忙，练习实用沟通。', story: {"title": "和乔合作的小项目", "introduction": "和乔一起推进一个小项目。先问候，约下一次交流，再把需要帮助的事情说清楚。", "conclusion": "你和乔约好了时间，也找到了合作的方法，项目可以继续推进。", "badge": "协作同行章"} },
];

function copyRecallValue(value) {
  if (Array.isArray(value)) return value.map(copyRecallValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, copyRecallValue(child)]));
  }
  return value;
}

/** Select a review scenario without sharing mutable arrays or responses with the course. */
export function getRecallStep(lesson, variationIndex = 0) {
  const recall = Array.isArray(lesson?.steps) ? lesson.steps.find(step => step?.type === 'recall') : null;
  if (!recall) return null;
  const variations = Array.isArray(recall.variations) ? recall.variations : [];
  const requested = typeof variationIndex === 'number' && Number.isFinite(variationIndex)
    ? Math.trunc(variationIndex) : 0;
  const count = variations.length + 1;
  const index = ((requested % count) + count) % count;
  const variation = index === 0 ? null : variations[index - 1];
  const override = variation && typeof variation === 'object' && !Array.isArray(variation) ? variation : {};
  return copyRecallValue({ ...recall, ...override, type: 'recall' });
}

export const LESSONS = [
  {
    id: 'hello-1', zoneId: 'hello', order: 0, title: '第一声你好', subtitle: '友好地介绍自己', level: 'starter', minutes: 3,
    phrase: "Hello! I'm Alex.", translation: '你好！我是 Alex。',
    learningGoal: '见到新伙伴时，打招呼并说出自己的名字。', takeaway: "Hello! I'm … = 你好！我是……。",
    vocabulary: [{ word: 'hello', meaning: '你好' }, { word: "I'm", meaning: '我是（I am 的简写）' }],
    storyBeat: "从米娜手里拿到探险名牌，来到欢迎广场。",
    pitfall: "介绍自己用 I'm 或 I am；You're 是“你是”，别把自己说成对方。",
    rewardText: "里奥记住了你的名字，你们正式认识了。",
    steps: [
      {
        type: 'choice', prompt: '这关你扮演 Alex。先向米娜打个招呼，再介绍自己。', context: '欢迎广场上，向导米娜挥了挥手，等着认识你。', speaker: '向导米娜', english: 'Hi!',
        shortPrompt: '先打招呼，再介绍自己叫 Alex。', shortContext: '广场上，向导米娜等你自我介绍。',
        options: [
          { text: "Hello! I'm Alex.", correct: true, feedback: "可以！Hello 是你好，I'm Alex 是我是 Alex。" },
          { text: "Hello! You're Alex.", correct: false, feedback: "You're 是你是。介绍自己时，用 I'm。" },
          { text: "Goodbye! I'm Alex.", correct: false, feedback: 'Goodbye 是再见。见面打招呼可以用 Hello。' },
        ], hint: "Hello = 你好；I'm = 我是。",
      },
      {
        type: 'order', prompt: '对米娜说：你好！我是 Alex。', context: '米娜递来一张探险名牌。介绍完自己，就能出发了。', speaker: '向导米娜',
        shortPrompt: '告诉米娜：你好，我是 Alex。', shortContext: '米娜递来名牌，等你说出名字。',
        tokens: ['Hello', "I'm", 'Alex'], answer: "Hello! I'm Alex.", hint: '先打招呼，再说自己是谁。', explanation: "Hello! I'm Alex. 一句问候，加一句介绍。",
      },
      {
        type: 'recall', prompt: '换一张角色名牌：这次你叫 Sam。向新伙伴介绍自己吧。', context: '在广场另一边，伙伴里奥主动和你打招呼。', speaker: '伙伴里奥', english: 'Hi there!',
        translation: "你好！我是 Sam。",
        response: {"english": "Nice to meet you, Sam!", "translation": "很高兴认识你，Sam！", "speaker": "伙伴里奥"},
        shortPrompt: '这次叫 Sam，向新伙伴介绍自己。', shortContext: '里奥在广场另一边和你打招呼。',
        accepted: ["Hello! I'm Sam.", "Hi! I'm Sam.", "Hello, I am Sam.", "Hi, I am Sam.", 'Hello! My name is Sam.', 'Hi! My name is Sam.', "I'm Sam.", 'I am Sam.', 'My name is Sam.', "Hey! I'm Sam.", 'Hey, I am Sam.', 'Hey! My name is Sam.', "Hi there! I'm Sam.", "Hello there! I'm Sam.", 'Hi there! My name is Sam.'],
        reference: "Hello! I'm Sam.", hint: "把 Alex 换成 Sam：Hello! I'm …", explanation: "I'm 可以换成 I am；My name is Sam 也是自然的自我介绍。",
        variations: [
          {
            "type": "recall",
            "prompt": "到了读书角，需要签到。你在这次任务里仍叫 Sam，向诺拉介绍自己吧。",
            "shortPrompt": "读书角签到，介绍自己叫 Sam。",
            "context": "诺拉准备写下你的名字，欢迎你加入读书角。",
            "shortContext": "诺拉在读书角等你介绍名字。",
            "speaker": "伙伴诺拉",
            "english": "Welcome!",
            "reference": "Hello! I'm Sam.",
            "translation": "你好！我是 Sam。",
            "accepted": [
              "Hello! I'm Sam.",
              "Hi! I'm Sam.",
              "Hey! I'm Sam.",
              "Hello, I am Sam.",
              "Hi, I am Sam.",
              "Hello! My name is Sam.",
              "Hi! My name is Sam.",
              "I'm Sam.",
              "I am Sam.",
              "My name is Sam.",
              "Hi Nora, I'm Sam.",
              "Hello Nora, my name is Sam."
            ],
            "hint": "从 Hello! I'm … 开始，把这次的名字 Sam 放进去。",
            "explanation": "介绍名字不只用在初次见面，签到或加入活动时也能用。",
            "response": {
              "english": "Welcome to the book club, Sam!",
              "translation": "欢迎加入读书角，Sam！",
              "speaker": "伙伴诺拉"
            }
          }
        ],
      },
    ],
  },
  {
    id: 'hello-2', zoneId: 'hello', order: 1, title: '认识新朋友', subtitle: '把问候接下去', level: 'basic', minutes: 3,
    phrase: 'Nice to meet you.', translation: '很高兴认识你。',
    learningGoal: '认识新朋友时，表达高兴并回应对方的问候。', takeaway: 'Nice to meet you. 加 too，可以回应“我也很高兴认识你”。',
    vocabulary: [{ word: 'meet', meaning: '见面、认识' }, { word: 'too', meaning: '也' }],
    storyBeat: "米娜把里奥和诺拉介绍给你，小队又多了伙伴。",
    pitfall: "回“我也很高兴认识你”时，too 放在句末：Nice to meet you too。",
    rewardText: "诺拉回应了你的问候，你有了新的小队伙伴。",
    steps: [
      {
        type: 'choice', prompt: '米娜介绍你认识里奥。告诉他“很高兴认识你”吧。', context: '拿好名牌后，米娜带你加入今天的探险小队。', speaker: '伙伴里奥',
        shortPrompt: '告诉里奥：很高兴认识你。', shortContext: '米娜带你认识小队伙伴里奥。',
        options: [
          { text: 'See you tomorrow.', correct: false, feedback: '这句是明天见，适合道别时说。' },
          { text: 'Nice to meet you.', correct: true, feedback: '对了！认识新朋友时，可以说 Nice to meet you。' },
          { text: "What's your name?", correct: false, feedback: '这句是在问你叫什么名字。表达高兴认识对方，用 Nice to meet you。' },
        ], hint: 'meet 是见面、认识；Nice to meet you 是一句常用问候。',
      },
      {
        type: 'order', prompt: '里奥也很高兴认识你。回一句“我也很高兴认识你”。', context: '里奥伸出手，友好地说“很高兴认识你”。', speaker: '伙伴里奥', english: 'Nice to meet you.',
        shortPrompt: '回一句：我也很高兴认识你。', shortContext: '里奥伸出手，向你表达友好问候。',
        tokens: ['Nice', 'to', 'meet', 'you', 'too'], answer: 'Nice to meet you too.', hint: 'too 表示也，放在这句的最后。', explanation: '加上 too，就可以回应对方的友好问候。',
      },
      {
        type: 'recall', prompt: '小队又来了一位伙伴诺拉。她作完介绍，告诉她你很高兴认识她。', context: '诺拉把名字写在名牌上，说：“你好，我是诺拉。”', speaker: '伙伴诺拉', english: "Hi! I'm Nora.",
        translation: "很高兴认识你。",
        response: {"english": "Nice to meet you too!", "translation": "我也很高兴认识你！", "speaker": "伙伴诺拉"},
        shortPrompt: '告诉诺拉：很高兴认识你。', shortContext: '新伙伴诺拉刚介绍了自己的名字。',
        accepted: ['Nice to meet you.', 'It is nice to meet you.', "It's nice to meet you.", 'Pleased to meet you.', 'Great to meet you.', 'Glad to meet you.', 'Hi! Nice to meet you.', 'Hello! Nice to meet you.', 'Hey! Nice to meet you.', "It's great to meet you.", 'Nice to meet you, Nora.', 'Hi Nora, nice to meet you.', 'Hello Nora, nice to meet you.', "I'm pleased to meet you."],
        reference: 'Nice to meet you.', hint: '用这一关开始学到的问候，告诉诺拉你很高兴认识她。', explanation: '第一次认识时可以说 Nice to meet you。对方先说这句时，可以加 too 回应。',
        variations: [
          {
            "type": "recall",
            "prompt": "活动结束，里奥说很高兴认识你。回一句“我也很高兴认识你”。",
            "shortPrompt": "回应里奥：我也很高兴认识你。",
            "context": "离开广场前，里奥挥挥手，说认识你真高兴。",
            "shortContext": "离开广场前，里奥向你友好道别。",
            "speaker": "伙伴里奥",
            "english": "Great to meet you.",
            "reference": "Nice to meet you too.",
            "translation": "我也很高兴认识你。",
            "accepted": [
              "Nice to meet you too.",
              "It's nice to meet you too.",
              "It is nice to meet you too.",
              "Great to meet you too.",
              "Pleased to meet you too.",
              "Glad to meet you too.",
              "You too.",
              "Likewise.",
              "Hi, nice to meet you too.",
              "Nice to meet you too, Leo."
            ],
            "hint": "想起 Nice to meet you，再加表示“也”的 too。",
            "explanation": "对方先表达高兴认识你时，加 too 可以把同样的友好回应回去。",
            "response": {
              "english": "See you soon!",
              "translation": "回头见！",
              "speaker": "伙伴里奥"
            }
          }
        ],
      },
    ],
  },
  {
    id: 'hello-3', zoneId: 'hello', order: 2, title: '聊聊你的喜好', subtitle: '用一句话打开话题', level: 'stretch', minutes: 3,
    phrase: 'I like reading.', translation: '我喜欢阅读。',
    learningGoal: '向伙伴介绍喜欢的活动，并换个爱好继续聊。', takeaway: 'I like … = 我喜欢……；and 可以连接两个爱好。',
    vocabulary: [{ word: 'reading', meaning: '阅读' }, { word: 'music', meaning: '音乐' }, { word: 'and', meaning: '和、并且' }],
    storyBeat: "聊天从名字转向爱好，你和里奥发现都喜欢音乐。",
    pitfall: "说喜欢阅读用 I like reading，不说 I like read；喜欢音乐则说 I like music。",
    rewardText: "里奥也喜欢音乐，你们找到了共同话题。",
    steps: [
      {
        type: 'choice', prompt: '诺拉在选兴趣小队。告诉她“我喜欢阅读”。', context: '欢迎广场旁有读书角和音乐角，诺拉想知道你喜欢什么。', speaker: '伙伴诺拉',
        shortPrompt: '告诉诺拉：我喜欢阅读。', shortContext: '广场旁有读书角和音乐角。',
        options: [
          { text: 'I like drawing.', correct: false, feedback: 'drawing 是画画。阅读是 reading。' },
          { text: 'I like running.', correct: false, feedback: 'running 是跑步。阅读是 reading。' },
          { text: 'I like reading.', correct: true, feedback: '对了！I like … 可以用来说你喜欢的事物。' },
        ], hint: 'reading = 阅读；I like … = 我喜欢……。',
      },
      {
        type: 'order', prompt: '多分享一个爱好：我喜欢阅读，也喜欢音乐。', context: '诺拉正把你的喜好写在小队卡片上。music 是音乐。', speaker: '伙伴诺拉',
        shortPrompt: '我喜欢阅读，也喜欢音乐。', shortContext: '诺拉在记喜好；music 是音乐。',
        tokens: ['I', 'like', 'reading', 'and', 'I', 'like', 'music'], answer: 'I like reading, and I like music.', hint: '先拼 I like reading，再接 and I like music。and 表示和、并且。', explanation: '两次 I like 分别介绍一个爱好，用 and 把它们自然地接起来。',
      },
      {
        type: 'recall', prompt: '里奥邀你去音乐角。告诉他：我喜欢音乐。', context: '读书角聊完了，你们又走到音乐角。里奥问起你的喜好。', speaker: '伙伴里奥', english: 'What do you like?',
        translation: "我喜欢音乐。",
        response: {"english": "I like music too!", "translation": "我也喜欢音乐！", "speaker": "伙伴里奥"},
        shortPrompt: '告诉里奥：我喜欢音乐。', shortContext: '走到音乐角；music 是音乐。',
        accepted: ['I like music.', 'I love music.', 'I enjoy music.', 'I like listening to music.', 'I love listening to music.', 'I enjoy listening to music.', 'I really like music.', 'I like music a lot.', 'I really enjoy music.', 'Well, I like music.', 'Hey, I like music.', 'I like reading and music.', 'I like reading, and I like music.'],
        reference: 'I like music.', hint: '保留 I like，把 reading 换成 music。', explanation: 'music 是音乐。I love music 表达更强的喜欢，也是一种自然说法。',
        variations: [
          {
            "type": "recall",
            "prompt": "回到读书角，诺拉问你的爱好。告诉她：我喜欢阅读。",
            "shortPrompt": "告诉诺拉：我喜欢阅读。",
            "context": "音乐角聊完了，诺拉想给你推荐一本书。reading 是阅读。",
            "shortContext": "诺拉想荐书；reading 是阅读。",
            "speaker": "伙伴诺拉",
            "english": "What do you like to do?",
            "reference": "I like reading.",
            "translation": "我喜欢阅读。",
            "accepted": [
              "I like reading.",
              "I love reading.",
              "I enjoy reading.",
              "I like to read.",
              "I love to read.",
              "I like books.",
              "I love books.",
              "I really like reading.",
              "I like reading a lot.",
              "Well, I like reading.",
              "I like reading books."
            ],
            "hint": "用 I like … 说爱好，这次的爱好是 reading。",
            "explanation": "同一个 I like 句型可以在不同活动里聊喜好；reading 表示阅读这件事。",
            "response": {
              "english": "Me too! Here's a book for you.",
              "translation": "我也喜欢！这本书给你。",
              "speaker": "伙伴诺拉"
            }
          }
        ],
      },
    ],
  },
  {
    id: 'daily-1', zoneId: 'daily', order: 0, title: '点一杯饮料', subtitle: '完成你的第一份订单', level: 'starter', minutes: 3,
    phrase: 'A coffee, please.', translation: '请给我一杯咖啡。',
    learningGoal: '在饮料摊礼貌点单，把饮料换成自己想喝的。', takeaway: 'A …, please. = 请给我一份／一杯……。',
    vocabulary: [{ word: 'coffee', meaning: '咖啡' }, { word: 'tea', meaning: '茶' }, { word: 'please', meaning: '请' }],
    storyBeat: "小队走进集市，你先在艾米的饮料摊点一杯热饮。",
    pitfall: "点一杯茶可说 A tea, please 或 A cup of tea, please；别说 a cup tea，cup 后要有 of。",
    rewardText: "艾米递来了茶，你完成了自己的点单。",
    steps: [
      {
        type: 'choice', prompt: '先在饮料摊歇一会儿。告诉艾米，你想要一杯咖啡。', context: '小镇集市刚开门。店员艾米微笑着等你点单。', speaker: '店员艾米',
        shortPrompt: '告诉艾米：请给我一杯咖啡。', shortContext: '集市开门，艾米等你点饮料。',
        options: [
          { text: 'A tea, please.', correct: false, feedback: 'tea 是茶。想要咖啡，找 coffee。' },
          { text: 'A coffee, please.', correct: true, feedback: '点到了！A coffee, please 是自然、简短的点单方式。' },
          { text: 'A juice, please.', correct: false, feedback: 'juice 是果汁。想要咖啡，找 coffee。' },
        ], hint: 'coffee = 咖啡；please 让请求更礼貌。',
      },
      {
        type: 'order', prompt: '对艾米说：请给我一杯咖啡。', context: '艾米拿好杯子，等着记下你的订单。', speaker: '店员艾米',
        shortPrompt: '对艾米说：请给我一杯咖啡。', shortContext: '艾米拿好杯子，等着记下订单。',
        tokens: ['A', 'coffee', 'please'], answer: 'A coffee, please.', hint: '饮料的名字放在中间，please 放在最后。', explanation: '这里 a coffee 指一杯咖啡。点单时也可以简短地说 Coffee, please。',
      },
      {
        type: 'recall', prompt: '逛了一会儿，你想换成茶。自己向艾米点一杯茶吧。', context: 'tea 是茶。艾米问：“这次想喝点什么？”', speaker: '店员艾米', english: 'What would you like?',
        translation: "请给我一杯茶。",
        response: {"english": "Here's your tea!", "translation": "茶来了，给你！", "speaker": "店员艾米"},
        shortPrompt: '这次换成茶，自己点一杯吧。', shortContext: '回到饮料摊；tea 是茶。',
        accepted: ['A tea, please.', 'Tea, please.', 'A cup of tea, please.', "I'd like a tea, please.", 'I would like a tea, please.', "I'd like some tea, please.", 'I would like some tea, please.', 'Can I have a tea, please?', 'Can I have some tea, please?', 'Could I have a tea, please?', 'Could I have some tea, please?', 'I would like a cup of tea, please.', "I'd like a cup of tea, please.", 'May I have some tea, please?', 'May I have a tea, please?', 'May I have a cup of tea, please?', 'Could I get a cup of tea, please?', 'Can I get a cup of tea, please?', 'Could I get a tea, please?', 'Can I get a tea, please?', "I'd like tea, please.", 'I would like tea, please.', 'Please may I have some tea?', 'Excuse me, a tea, please.', 'Hi, a tea, please.', 'Hello, a tea, please.'],
        reference: 'A tea, please.', hint: '把 coffee 换成 tea：A …, please.', explanation: 'Tea, please 和 A cup of tea, please 也很自然。重点是清楚、礼貌地表达你想要什么。',
        variations: [
          {
            "type": "recall",
            "prompt": "逛到果汁摊，想喝一杯果汁。自己向艾米点单吧。",
            "shortPrompt": "向艾米点一杯果汁吧。",
            "context": "集市门口还有鲜榨饮料。juice 是果汁，艾米问你想喝什么。",
            "shortContext": "在果汁摊；juice 是果汁。",
            "speaker": "店员艾米",
            "english": "What would you like?",
            "reference": "A juice, please.",
            "translation": "请给我一杯果汁。",
            "accepted": [
              "A juice, please.",
              "Juice, please.",
              "A glass of juice, please.",
              "A cup of juice, please.",
              "I'd like a juice, please.",
              "I would like a juice, please.",
              "I'd like some juice, please.",
              "I would like some juice, please.",
              "Can I have a juice, please?",
              "Could I have a juice, please?",
              "May I have some juice, please?",
              "Can I get a juice, please?",
              "Could I get a glass of juice, please?",
              "Excuse me, a juice, please.",
              "Hi, a juice, please."
            ],
            "hint": "点单仍用 A …, please，把饮料换成 juice。",
            "explanation": "饮料摊的场景变了，礼貌点单的句型仍然一样。",
            "response": {
              "english": "One juice. Here you go!",
              "translation": "一杯果汁，给你！",
              "speaker": "店员艾米"
            }
          }
        ],
      },
    ],
  },
  {
    id: 'daily-2', zoneId: 'daily', order: 1, title: '这个多少钱', subtitle: '买东西时问清价格', level: 'basic', minutes: 3,
    phrase: 'How much is this?', translation: '这个多少钱？',
    learningGoal: '指着想买的东西，向店员问清它的价格。', takeaway: 'How much is this? 不知道商品名字，也可以问价格。',
    vocabulary: [{ word: 'how much', meaning: '多少钱' }, { word: 'this', meaning: '这个' }],
    storyBeat: "沿着集市继续逛，你看中本店里的纪念品。",
    pitfall: "问价格用 How much is this，别写成 How many is this；many 常用来问数量。",
    rewardText: "本告诉了你 T 恤的价格，购物心里有数了。",
    steps: [
      {
        type: 'choice', prompt: '在集市看中一个小杯子，问问店主多少钱吧。', context: '离开饮料摊，旁边的纪念品店摆着漂亮的小杯子。', speaker: '店主本',
        shortPrompt: '看中一个杯子，问本多少钱。', shortContext: '饮料摊旁，纪念品店刚开门。',
        options: [
          { text: 'What is this?', correct: false, feedback: '这句是问这是什么。问价格时用 How much。' },
          { text: 'Where is this?', correct: false, feedback: 'Where 在问地点。问价格时用 How much。' },
          { text: 'How much is this?', correct: true, feedback: '可以！How much is this? 是问这个多少钱。' },
        ], hint: 'How much …? 可以用来问价格。',
      },
      {
        type: 'order', prompt: '指着杯子，对本说：这个多少钱？', context: '店主本把杯子递给你，等你询问。', speaker: '店主本',
        shortPrompt: '指着杯子说：这个多少钱？', shortContext: '本递来杯子，等你询问价格。',
        tokens: ['How', 'much', 'is', 'this'], answer: 'How much is this?', hint: '以 How much 开头，接 is this。', explanation: 'this 指你正在指着或拿着的这件东西。',
      },
      {
        type: 'recall', prompt: '又看中一件 T 恤。指给本看，自己问一次价格吧。', context: '杯子旁边还有 T 恤。本问：“需要帮忙吗？”', speaker: '店主本', english: 'Can I help you?',
        translation: "这个多少钱？",
        response: {"english": "It's ten dollars.", "translation": "这件 T 恤是十美元。", "speaker": "店主本"},
        shortPrompt: '指着这件 T 恤，问本多少钱。', shortContext: '杯子旁有 T 恤，本等你提问。',
        accepted: ['How much is this?', 'How much does this cost?', 'What is the price of this?', "What's the price of this?", 'How much is this T-shirt?', 'How much is this shirt?', 'How much does this T-shirt cost?', 'How much does this shirt cost?', 'Excuse me, how much is this?', 'How much is this, please?', 'Hi, how much is this?', 'Hello, how much is this?', 'Could you tell me how much this is?', 'Could you tell me how much this costs?', 'Can you tell me how much this is?', 'Can you tell me how much this costs?', 'May I ask how much this is?', 'How much for this?'],
        reference: 'How much is this?', hint: '不必知道商品的英文名字，用 this 就可以指它。', explanation: '面对不同商品，也能用同一句 How much is this?。',
        variations: [
          {
            "type": "recall",
            "prompt": "想给伙伴挑一张明信片。指着它，向本问问价格吧。",
            "shortPrompt": "指着明信片，问本多少钱。",
            "context": "本的摊位摆出了新明信片。你可以用 this 指眼前这张，不必知道英文名字。",
            "shortContext": "本摆出明信片，等你问价格。",
            "speaker": "店主本",
            "english": "Can I help you?",
            "reference": "How much is this?",
            "translation": "这个多少钱？",
            "accepted": [
              "How much is this?",
              "How much does this cost?",
              "How much is this, please?",
              "Excuse me, how much is this?",
              "Hi, how much is this?",
              "What is the price of this?",
              "What's the price of this?",
              "Could you tell me how much this is?",
              "Can you tell me how much this costs?",
              "May I ask how much this is?",
              "How much for this?"
            ],
            "hint": "以 How much 开头，用 this 指这张明信片。",
            "explanation": "想买的东西换了，也能用 How much is this 来问价。",
            "response": {
              "english": "It's two dollars.",
              "translation": "这张明信片是两美元。",
              "speaker": "店主本"
            }
          }
        ],
      },
    ],
  },
  {
    id: 'daily-3', zoneId: 'daily', order: 2, title: '说出你的需要', subtitle: '把简单点单说得完整', level: 'stretch', minutes: 3,
    phrase: "I'd like a sandwich, please.", translation: '我想要一个三明治，谢谢。',
    learningGoal: '礼貌地说出想点的食物，并把不同食物放进同一句请求。', takeaway: "I'd like …, please. = 我想要……，谢谢。",
    vocabulary: [{ word: 'sandwich', meaning: '三明治' }, { word: 'salad', meaning: '沙拉' }, { word: "I'd like", meaning: '我想要（I would like 的简写）' }],
    storyBeat: "午饭时间到了，你为自己和伙伴向艾米点餐。",
    pitfall: "I'd like 是 I would like 的简写，表示“我想要”；I like 则是“我喜欢”。",
    rewardText: "艾米记下了给伙伴的沙拉订单，午餐很快就好。",
    steps: [
      {
        type: 'choice', prompt: '午饭时间到了。礼貌地向艾米点一个三明治吧。', context: '集市逛完了，艾米的餐车刚好开始供应午餐。', speaker: '店员艾米',
        shortPrompt: '礼貌地向艾米点一个三明治。', shortContext: '逛完集市，艾米开始供应午餐。',
        options: [
          { text: "I'd like a sandwich, please.", correct: true, feedback: "可以！I'd like … 是礼貌地表达我想要……。" },
          { text: 'I have a sandwich.', correct: false, feedback: '这句是在说我已经有一个三明治。想点餐，可以说 I’d like。' },
          { text: 'I made a sandwich.', correct: false, feedback: '这句是在说我做了一个三明治。点餐时用 I’d like。' },
        ], hint: "I'd like 是 I would like 的简短说法，表示我想要。",
      },
      {
        type: 'order', prompt: '再加一份沙拉：我想要一个三明治和一份沙拉，谢谢。', context: '艾米准备记下这份完整的午餐订单。salad 是沙拉。', speaker: '店员艾米',
        shortPrompt: '我想要一个三明治和一份沙拉，谢谢。', shortContext: '艾米记点单；salad 是沙拉。',
        tokens: ["I'd", 'like', 'a', 'sandwich', 'and', 'a', 'salad', 'please'], answer: "I'd like a sandwich and a salad, please.", hint: "先拼 I'd like a sandwich，再接 and a salad，最后加 please。and 表示和。", explanation: '两个 a 分别对应一份食物。一次想点两样，可以用 and 接起来。',
      },
      {
        type: 'recall', prompt: '伙伴也想尝尝沙拉。再向艾米点一份沙拉吧。', context: '艾米问：“还想点什么？”salad 是沙拉。', speaker: '店员艾米', english: 'Anything else?',
        translation: "我想要一份沙拉，谢谢。",
        response: {"english": "One salad. Coming right up!", "translation": "一份沙拉，马上就好！", "speaker": "店员艾米"},
        shortPrompt: '给伙伴再点一份沙拉，谢谢。', shortContext: '艾米问还要什么；salad 是沙拉。',
        accepted: ["I'd like a salad, please.", 'I would like a salad, please.', 'A salad, please.', 'Can I have a salad, please?', 'Could I have a salad, please?', "I'd like a salad.", 'I would like a salad.', 'Could I get a salad, please?', 'Can I get a salad, please?', 'May I have a salad, please?', 'May I order a salad, please?', 'Please may I have a salad?', 'Excuse me, a salad, please.', 'Hi, a salad, please.', "Yes, I'd like a salad, please.", 'Yes, a salad, please.', 'A salad too, please.', 'Another salad, please.', "I'd also like a salad, please."],
        reference: "I'd like a salad, please.", hint: '把 sandwich 换成 salad。', explanation: '把食物名字换掉，同一个请求句型就能用于新的订单。',
        variations: [
          {
            "type": "recall",
            "prompt": "午餐后，想给没到场的伙伴带一个三明治。礼貌地向艾米点单。",
            "shortPrompt": "给伙伴点一个三明治，谢谢。",
            "context": "准备离开集市前，再买一份带给伙伴。sandwich 是三明治。",
            "shortContext": "带给伙伴；sandwich 是三明治。",
            "speaker": "店员艾米",
            "english": "Anything else?",
            "reference": "I'd like a sandwich, please.",
            "translation": "我想要一个三明治，谢谢。",
            "accepted": [
              "I'd like a sandwich, please.",
              "I would like a sandwich, please.",
              "A sandwich, please.",
              "Can I have a sandwich, please?",
              "Could I have a sandwich, please?",
              "May I have a sandwich, please?",
              "Can I get a sandwich, please?",
              "Could I get a sandwich, please?",
              "I'd like a sandwich.",
              "I would like a sandwich.",
              "Yes, a sandwich, please.",
              "Yes, I'd like a sandwich, please.",
              "A sandwich to go, please."
            ],
            "hint": "想起 I'd like …, please，这次想要的是 sandwich。",
            "explanation": "在店里吃或带给伙伴，同一句请求都能清楚地说出想要的食物。",
            "response": {
              "english": "A sandwich to go. Here you are.",
              "translation": "带走的三明治，给你！",
              "speaker": "店员艾米"
            }
          }
        ],
      },
    ],
  },
  {
    id: 'travel-1', zoneId: 'travel', order: 0, title: '找到下一站', subtitle: '开口问一个地点', level: 'starter', minutes: 3,
    phrase: 'Where is the station?', translation: '车站在哪里？',
    learningGoal: '旅行时礼貌地问路，并换一个地点继续使用同一句型。', takeaway: 'Where is the …? = ……在哪里？',
    vocabulary: [{ word: 'where', meaning: '哪里' }, { word: 'station', meaning: '车站' }, { word: 'library', meaning: '图书馆' }],
    storyBeat: "出发前找到志愿者丹，问清车站和附近的位置。",
    pitfall: "直接问位置时，把 is 放在地点前：Where is the library，不说 Where the library is。",
    rewardText: "丹指出了图书馆的位置，你知道该往哪里走了。",
    steps: [
      {
        type: 'choice', prompt: '准备去下一座小岛，向丹问问车站在哪里。', context: '旅行港湾里岔路很多。志愿者丹正在街角指路。', speaker: '志愿者丹',
        shortPrompt: '向丹问路：车站在哪里？', shortContext: '港湾岔路多，丹正在街角指路。',
        options: [
          { text: 'Where is the cinema?', correct: false, feedback: 'cinema 是电影院。要找车站，用 station。' },
          { text: 'Where is the station?', correct: true, feedback: '对了！Where is …? 可以用来问一个地方在哪里。' },
          { text: 'Where is the supermarket?', correct: false, feedback: 'supermarket 是超市。要找车站，用 station。' },
        ], hint: 'Where = 哪里；station = 车站。',
      },
      {
        type: 'order', prompt: '对丹说：车站在哪里？', context: '丹转过身，耐心听你想找哪个地方。', speaker: '志愿者丹',
        shortPrompt: '告诉丹：车站在哪里？', shortContext: '丹停下来，听你想找哪个地方。',
        tokens: ['Where', 'is', 'the', 'station'], answer: 'Where is the station?', hint: '先放 Where is，后面放 the station。', explanation: 'Where is the …? 可以帮你找到一个具体地点。',
      },
      {
        type: 'recall', prompt: '离发车还有一会儿，先去图书馆看看。自己向丹问路吧。', context: 'library 是图书馆。丹问：“你要去哪儿？”', speaker: '志愿者丹', english: 'Where are you going?',
        translation: "图书馆在哪里？",
        response: {"english": "The library is next to the park.", "translation": "图书馆就在公园旁边。", "speaker": "志愿者丹"},
        shortPrompt: '现在想找图书馆，向丹问路。', shortContext: '发车前逛逛；library 是图书馆。',
        accepted: ['Where is the library?', "Where's the library?", 'Excuse me, where is the library?', "Excuse me, where's the library?", 'Could you tell me where the library is?', 'Can you tell me where the library is?', 'Where is the library, please?', 'Hi, where is the library?', "Hi, where's the library?", 'Hello, where is the library?', 'Excuse me, could you tell me where the library is?', 'Excuse me, can you tell me where the library is?', 'Can you show me where the library is?', 'Could you show me where the library is?', 'Do you know where the library is?', 'May I ask where the library is?'],
        reference: 'Where is the library?', hint: '把 station 换成 library。', explanation: '问路时，可以先加 Excuse me 引起对方注意，再说你的问题。',
        variations: [
          {
            "type": "recall",
            "prompt": "从图书馆出来，看见博物馆的海报。向丹问问博物馆在哪里。",
            "shortPrompt": "想参观博物馆，向丹问路。",
            "context": "museum 是博物馆。丹又来到街角，问你要不要帮忙指路。",
            "shortContext": "街角问路；museum 是博物馆。",
            "speaker": "志愿者丹",
            "english": "Need directions?",
            "reference": "Where is the museum?",
            "translation": "博物馆在哪里？",
            "accepted": [
              "Where is the museum?",
              "Where's the museum?",
              "Excuse me, where is the museum?",
              "Excuse me, where's the museum?",
              "Where is the museum, please?",
              "Hi, where is the museum?",
              "Can you tell me where the museum is?",
              "Could you tell me where the museum is?",
              "Do you know where the museum is?",
              "May I ask where the museum is?",
              "Could you show me where the museum is?"
            ],
            "hint": "用 Where is the …，这次要找的地方是 museum。",
            "explanation": "换一个想参观的地方，问路句型就能继续派上用场。",
            "response": {
              "english": "The museum is across the street.",
              "translation": "博物馆就在街对面。",
              "speaker": "志愿者丹"
            }
          }
        ],
      },
    ],
  },
  {
    id: 'travel-2', zoneId: 'travel', order: 1, title: '带走这份美味', subtitle: '听懂店员的常见问题', level: 'basic', minutes: 3,
    phrase: 'To go, please.', translation: '请帮我打包带走。',
    learningGoal: '店员问用餐方式时，清楚地告诉对方你想带走。', takeaway: 'To go, please. = 请打包带走；for here 表示在这里吃。',
    vocabulary: [{ word: 'to go', meaning: '打包带走' }, { word: 'for here', meaning: '在这里吃／喝' }],
    storyBeat: "赶车前买好餐点，向艾玛说明需要打包。",
    pitfall: "点餐里的 to go 是“带走”，for here 才是“在这里吃”；别把两种方式说反。",
    rewardText: "艾玛递来打包好的三明治，你可以带着去乘车。",
    steps: [
      {
        type: 'choice', prompt: '快要发车了，想带走食物。听到店员的问题，你怎样回答？', context: '车站旁的餐店里，艾玛问：“这里吃，还是带走？”', speaker: '店员艾玛', english: 'For here or to go?',
        shortPrompt: '快发车了，告诉艾玛要带走。', shortContext: '车站餐店里，艾玛问用餐方式。',
        options: [
          { text: 'For here, please.', correct: false, feedback: 'For here 是在这里吃。带走用 To go。' },
          { text: 'No sugar, please.', correct: false, feedback: '这句是在说不要糖。带走用 To go。' },
          { text: 'To go, please.', correct: true, feedback: '说清楚了！To go, please 表示打包带走。' },
        ], hint: 'For here = 在这里吃；to go = 带走。',
      },
      {
        type: 'order', prompt: '对艾玛说：请帮我打包带走。', context: '艾玛拿出纸袋，再确认一次用餐方式。', speaker: '店员艾玛',
        shortPrompt: '对艾玛说：请帮我打包带走。', shortContext: '艾玛拿出纸袋，等你确认。',
        tokens: ['To', 'go', 'please'], answer: 'To go, please.', hint: 'To go 连在一起，please 放在最后。', explanation: '在点餐语境里，to go 表示餐饮打包带走。',
      },
      {
        type: 'recall', prompt: '再买一个三明治，也准备带上车。自己告诉艾玛用餐方式吧。', context: '艾玛指着新做好的三明治，问：“这里吃，还是带走？”', speaker: '店员艾玛', english: 'For here or to go?',
        translation: "请帮我打包带走。",
        response: {"english": "All packed. Here you go!", "translation": "已经打包好了，给你！", "speaker": "店员艾玛"},
        shortPrompt: '三明治也带走，自己回答吧。', shortContext: '艾玛指着三明治，问用餐方式。',
        accepted: ['To go, please.', 'To go.', 'Takeaway, please.', 'Take away, please.', "I'd like it to go, please.", 'I would like it to go, please.', 'Could I have it to go, please?', 'Can I have it to go, please?', 'Can I take it away, please?', 'Takeout, please.', 'For takeaway, please.', 'For takeout, please.', 'To take away, please.', 'May I have it to go, please?', 'Could you pack it to go, please?', 'Can you pack it to go, please?', 'This one to go too, please.', 'To go too, please.'],
        reference: 'To go, please.', hint: '带走就是 to go。', explanation: 'To go 常用于美式英语；Takeaway, please 在英式英语中也很常见。',
        variations: [
          {
            "type": "recall",
            "prompt": "这次站外下雨，想在店里吃完再走。告诉艾玛，你要在这里吃。",
            "shortPrompt": "雨下大了，告诉艾玛在这里吃。",
            "context": "餐店里还有空座位。for here 是在这里吃，艾玛问你的用餐方式。",
            "shortContext": "想坐下吃；for here 是在这里吃。",
            "speaker": "店员艾玛",
            "english": "For here or to go?",
            "reference": "For here, please.",
            "translation": "在这里吃，谢谢。",
            "accepted": [
              "For here, please.",
              "For here.",
              "Eat in, please.",
              "Dine in, please.",
              "I'd like to eat here, please.",
              "I would like to eat here, please.",
              "I'll eat here, please.",
              "I will eat here, please.",
              "We will eat here, please.",
              "I'd like it for here, please.",
              "This is for here, please."
            ],
            "hint": "带走是 to go，在这里吃是 for here。",
            "explanation": "这次需求变了，选 for here 就能清楚告诉店员不用打包。",
            "response": {
              "english": "Sure. Take a seat!",
              "translation": "好的，请坐！",
              "speaker": "店员艾玛"
            }
          }
        ],
      },
    ],
  },
  {
    id: 'travel-3', zoneId: 'travel', order: 2, title: '确认你的预订', subtitle: '让旅途沟通更顺利', level: 'stretch', minutes: 3,
    phrase: 'I have a reservation.', translation: '我有一个预订。',
    learningGoal: '到酒店或餐厅时，告诉接待员你已经做了预订。', takeaway: 'I have a reservation. 酒店和餐厅都能用。',
    vocabulary: [{ word: 'reservation', meaning: '预订' }, { word: 'have', meaning: '有' }],
    storyBeat: "到达目的地后，你向酒店和餐厅确认预订。",
    pitfall: "reservation 是“预订”，不是票；说 I have a reservation 时保留 a。",
    rewardText: "米卡找到了你的预订，准备带你来到餐桌旁。",
    steps: [
      {
        type: 'choice', prompt: '顺利到达下一站。告诉酒店前台，你已经有预订。', context: '带着行李进了酒店，前台罗莎准备帮你办理入住。', speaker: '前台罗莎',
        shortPrompt: '到酒店了，告诉罗莎你有预订。', shortContext: '罗莎在前台准备帮你办理入住。',
        options: [
          { text: 'I have a question.', correct: false, feedback: 'question 是问题。预订是 reservation。' },
          { text: 'I have a reservation.', correct: true, feedback: '可以！I have a reservation 表示你已经做了预订。' },
          { text: 'I have a ticket.', correct: false, feedback: 'ticket 是票。确认预订用 reservation。' },
        ], hint: 'reservation = 预订；I have … = 我有……。',
      },
      {
        type: 'order', prompt: '对罗莎说：我有一个预订。', context: '罗莎打开入住登记册，等你说明来意。', speaker: '前台罗莎',
        shortPrompt: '告诉罗莎：我有一个预订。', shortContext: '罗莎打开登记册，等你说明来意。',
        tokens: ['I', 'have', 'a', 'reservation'], answer: 'I have a reservation.', hint: '从 I have 开始，接 a reservation。', explanation: '酒店、餐厅等场景里，reservation 都可以表示预订。',
      },
      {
        type: 'recall', prompt: '晚上来到提前订好座位的餐厅。告诉接待员你有预订。', context: '放好行李后，你到了餐厅。接待员米卡问：“你有预订吗？”', speaker: '接待员米卡', english: 'Do you have a reservation?',
        translation: "我有一个预订。",
        response: {"english": "Welcome! Your table is ready.", "translation": "欢迎光临！桌位已经准备好了。", "speaker": "接待员米卡"},
        shortPrompt: '到了餐厅，告诉米卡你有预订。', shortContext: '已订好座位，米卡问有没有预订。',
        accepted: ['I have a reservation.', "I've made a reservation.", 'I have made a reservation.', 'I booked a table.', "I've booked a table.", 'I have booked a table.', 'We have a reservation.', 'I have a booking.', 'Yes, I have a reservation.', 'Yes, I have a booking.', 'Hi, I have a reservation.', 'Hello, I have a reservation.', 'Excuse me, I have a reservation.', 'Hi, I booked a table.', 'I made a reservation.', 'Yes, I booked a table.', 'Yes, we have a reservation.'],
        reference: 'I have a reservation.', hint: '想想你在酒店向前台说的那一句。', explanation: 'I booked a table 是我订了桌位，也适合这个餐厅情境。',
        variations: [
          {
            "type": "recall",
            "prompt": "第二次出行，回到酒店柜台。告诉罗莎，你已经预订了房间。",
            "shortPrompt": "在酒店，告诉罗莎你有预订。",
            "context": "罗莎准备核对入住登记。这个场景里的 reservation 指房间预订。",
            "shortContext": "罗莎准备核对你的房间预订。",
            "speaker": "前台罗莎",
            "english": "Do you have a reservation?",
            "reference": "I have a reservation.",
            "translation": "我有一个预订。",
            "accepted": [
              "I have a reservation.",
              "Yes, I have a reservation.",
              "I've made a reservation.",
              "I have made a reservation.",
              "I made a reservation.",
              "I have a booking.",
              "Yes, I have a booking.",
              "Hi, I have a reservation.",
              "Hello, I have a reservation.",
              "I booked a room.",
              "I've booked a room.",
              "I have booked a room.",
              "Excuse me, I have a reservation."
            ],
            "hint": "和餐厅一样，先说 I have，再说 a reservation。",
            "explanation": "reservation 可用于餐厅座位或酒店房间；回应会按你所在的场景来。",
            "response": {
              "english": "Welcome! Your room is ready.",
              "translation": "欢迎！你的房间已经准备好了。",
              "speaker": "前台罗莎"
            }
          }
        ],
      },
    ],
  },
  {
    id: 'story-1', zoneId: 'story', order: 0, title: '这首歌，我喜欢', subtitle: '用英语聊一点兴趣', level: 'starter', minutes: 3,
    phrase: 'I like this song.', translation: '我喜欢这首歌。',
    learningGoal: '听歌或玩游戏时，告诉伙伴你喜欢眼前的内容。', takeaway: 'I like this … = 我喜欢这个／这首……。',
    vocabulary: [{ word: 'song', meaning: '歌曲' }, { word: 'game', meaning: '游戏' }, { word: 'like', meaning: '喜欢' }],
    storyBeat: "林林分享歌曲和游戏，你们从共同喜好开始聊。",
    pitfall: "说 I like this game，不说 I am like this game；like 在这里已经表示“喜欢”。",
    rewardText: "林林和你喜欢同一个游戏，兴趣话题继续聊起来了。",
    steps: [
      {
        type: 'choice', prompt: '林林分享了一首歌。告诉她，你喜欢这首歌。', context: '兴趣星球的音乐角里，伙伴林林递来耳机。', speaker: '音乐伙伴林林',
        shortPrompt: '告诉林林：我喜欢这首歌。', shortContext: '音乐角里，林林分享一首歌。',
        options: [
          { text: 'I like this game.', correct: false, feedback: 'game 是游戏。这首歌是 this song。' },
          { text: 'I like this song.', correct: true, feedback: '对了！I like this … 可以说你喜欢眼前的这件东西。' },
          { text: 'I like this movie.', correct: false, feedback: 'movie 是电影。歌曲是 song。' },
        ], hint: 'song = 歌曲；this = 这个、这首。',
      },
      {
        type: 'order', prompt: '对林林说：我喜欢这首歌。', context: '歌曲播放完了，林林期待听听你的感受。', speaker: '音乐伙伴林林',
        shortPrompt: '对林林说：我喜欢这首歌。', shortContext: '歌曲播完了，林林想听你的感受。',
        tokens: ['I', 'like', 'this', 'song'], answer: 'I like this song.', hint: '先放 I like，再放 this song。', explanation: 'I like this song 是聊音乐时简短、自然的表达。',
      },
      {
        type: 'recall', prompt: '林林又分享了一个游戏。告诉她，你喜欢这个游戏。', context: 'game 是游戏。林林打开游戏，问：“你喜欢吗？”', speaker: '游戏伙伴林林', english: 'Do you like it?',
        translation: "我喜欢这个游戏。",
        response: {"english": "Me too! It's fun.", "translation": "我也喜欢！这个游戏很好玩。", "speaker": "游戏伙伴林林"},
        shortPrompt: '这次是游戏，告诉林林你喜欢。', shortContext: '林林打开游戏；game 是游戏。',
        accepted: ['I like this game.', 'I love this game.', 'I enjoy this game.', 'I really like this game.', 'I like the game.', 'I love the game.', 'I enjoy playing this game.', 'Yes, I like this game.', 'Yeah, I like this game.', 'Yes, I love this game.', 'I like it.', 'Yes, I like it.', 'I really like it.', 'I love it.', 'Yes, I do.', 'I like this game a lot.', 'Hey, I like this game.', 'This game is great.'],
        reference: 'I like this game.', hint: '把 song 换成 game。', explanation: '换掉最后的事物名字，就能把这句话用到不同兴趣上。',
        variations: [
          {
            "type": "recall",
            "prompt": "林林推荐一段短视频。看完开头，告诉她你喜欢这段视频。",
            "shortPrompt": "告诉林林：我喜欢这段视频。",
            "context": "video 是视频。林林选了一段轻松的短片，问你喜欢吗。",
            "shortContext": "林林荐短片；video 是视频。",
            "speaker": "伙伴林林",
            "english": "Do you like this one?",
            "reference": "I like this video.",
            "translation": "我喜欢这段视频。",
            "accepted": [
              "I like this video.",
              "I love this video.",
              "I enjoy this video.",
              "I really like this video.",
              "I like the video.",
              "I like it.",
              "Yes, I like it.",
              "Yes, I like this video.",
              "Yes, I do.",
              "I love it.",
              "This video is great.",
              "I like this video a lot."
            ],
            "hint": "用 I like this …，这次对象是 video。",
            "explanation": "同一句喜欢的表达，也能用来聊刚看到的视频。",
            "response": {
              "english": "Then let's watch the whole video!",
              "translation": "那我们一起把视频看完吧！",
              "speaker": "伙伴林林"
            }
          }
        ],
      },
    ],
  },
  {
    id: 'story-2', zoneId: 'story', order: 1, title: '邀请朋友一起玩', subtitle: '让喜欢的事情有同伴', level: 'basic', minutes: 3,
    phrase: "Let's play together.", translation: '我们一起玩吧。',
    learningGoal: '邀请伙伴一起玩或看视频，把兴趣变成一次交流。', takeaway: "Let's … together. = 我们一起……吧。",
    vocabulary: [{ word: 'play', meaning: '玩' }, { word: 'watch', meaning: '观看' }, { word: 'together', meaning: '一起' }],
    storyBeat: "你邀请林林一起玩，又一起看看有趣的视频。",
    pitfall: "Let's 是 let us 的简写，后面直接用动作词：Let's watch，不加 to。",
    rewardText: "林林接受了邀请，和你一起看那段有趣的视频。",
    steps: [
      {
        type: 'choice', prompt: '这个游戏可以两人合作。邀请林林一起玩吧。', context: '走到游戏角，屏幕上出现了两位玩家的位置。', speaker: '游戏伙伴林林',
        shortPrompt: '游戏能双人合作，邀请林林。', shortContext: '游戏角里，出现了两个玩家位置。',
        options: [
          { text: "Let's play together.", correct: true, feedback: '邀请发出去了！Let’s … 可以用来提议一起做一件事。' },
          { text: "Let's watch together.", correct: false, feedback: 'watch 是观看。想一起玩，用 play。' },
          { text: "Let's study together.", correct: false, feedback: 'study 是学习。想一起玩，用 play。' },
        ], hint: "Let's = 我们……吧；together = 一起。",
      },
      {
        type: 'order', prompt: '对林林说：我们一起玩吧。', context: '你选好玩家角色，林林还在等你的邀请。', speaker: '游戏伙伴林林',
        shortPrompt: '对林林说：我们一起玩吧。', shortContext: '选好角色，林林等你发出邀请。',
        tokens: ["Let's", 'play', 'together'], answer: "Let's play together.", hint: "从 Let's 开始，动作 play 放在中间。", explanation: 'Let’s 后面放动作，together 说明你们一起做。',
      },
      {
        type: 'recall', prompt: '游戏结束，发现了一段有趣的视频。邀请林林一起看吧。', context: 'watch 是观看。林林问：“接下来做点什么？”', speaker: '伙伴林林', english: 'What shall we do?',
        translation: "我们一起看吧。",
        response: {"english": "Sounds fun. Let's watch it!", "translation": "听起来不错，我们一起看吧！", "speaker": "伙伴林林"},
        shortPrompt: '发现有趣视频，邀请林林一起看。', shortContext: '游戏结束了；watch 是观看。',
        accepted: ["Let's watch together.", 'Let us watch together.', "Let's watch this video together.", "Let's watch a video together.", "Let's watch the video together.", 'Do you want to watch this video together?', 'Would you like to watch this video together?', "Hey, let's watch together.", "Hey, let's watch this video together.", "Let's watch a video.", "Let's watch this video.", 'Shall we watch this video together?', 'Want to watch this video together?', 'Do you want to watch a video together?', 'Would you like to watch a video together?'],
        reference: "Let's watch together.", hint: '把 play 换成 watch。', explanation: '如果想说得更具体，可以说 Let’s watch this video together。',
        variations: [
          {
            "type": "recall",
            "prompt": "发现一本适合轮流读的故事。邀请林林一起读吧。",
            "shortPrompt": "发现一本故事，邀请林林一起读。",
            "context": "你们来到读书角。read 是阅读，林林问接下来做点什么。",
            "shortContext": "来到读书角；read 是阅读。",
            "speaker": "读书伙伴林林",
            "english": "What shall we do next?",
            "reference": "Let's read together.",
            "translation": "我们一起读吧。",
            "accepted": [
              "Let's read together.",
              "Let us read together.",
              "Let's read this story together.",
              "Let's read the book together.",
              "Let's read this book together.",
              "Shall we read together?",
              "Do you want to read together?",
              "Would you like to read together?",
              "Would you like to read this story with me?",
              "Hey, let's read together.",
              "Let's read a story together."
            ],
            "hint": "用 Let's … together，这次的动作是 read。",
            "explanation": "邀请的句型没有变，把动作换成 read 就能邀请伙伴一起读故事。",
            "response": {
              "english": "Sure! You read the first page.",
              "translation": "好呀！你先读第一页。",
              "speaker": "读书伙伴林林"
            }
          }
        ],
      },
    ],
  },
  {
    id: 'story-3', zoneId: 'story', order: 2, title: '故事还会怎样', subtitle: '聊聊你正在追的剧情', level: 'stretch', minutes: 3,
    phrase: 'What happens next?', translation: '接下来会发生什么？',
    learningGoal: '看故事或游戏剧情时，和伙伴聊接下来会发生的事。', takeaway: 'What happens next? = 接下来会发生什么？',
    vocabulary: [{ word: 'happens', meaning: '发生' }, { word: 'next', meaning: '接下来' }],
    storyBeat: "冒险故事来到章节末，你和林林追问门后的剧情。",
    pitfall: "What happens next 里的 happens 有 s；next 是“接下来”，不是 before（之前）。",
    rewardText: "你问出了后续剧情：门后是一座新的小岛。",
    steps: [
      {
        type: 'choice', prompt: '故事停在最精彩的地方。问问林林，接下来会发生什么。', context: '看完视频，你们又打开了一本冒险故事。主角刚找到一扇门。', speaker: '故事伙伴林林',
        shortPrompt: '问问林林：接下来会发生什么？', shortContext: '故事主角刚找到一扇神秘的门。',
        options: [
          { text: 'What happened before?', correct: false, feedback: '这句是在问之前发生了什么。接下来用 next。' },
          { text: 'Where does it happen?', correct: false, feedback: '这句是在问事情发生在哪里。问接下来会怎样，用 What happens next?。' },
          { text: 'What happens next?', correct: true, feedback: '问到了！next 是接下来，happens 是发生。' },
        ], hint: 'next = 接下来；What happens …? = 会发生什么？',
      },
      {
        type: 'order', prompt: '对林林说：接下来会发生什么？', context: '你们停在章节末尾，都在猜门后面有什么。', speaker: '故事伙伴林林',
        shortPrompt: '对林林说：接下来会发生什么？', shortContext: '停在章节末，你们好奇门后有什么。',
        tokens: ['What', 'happens', 'next'], answer: 'What happens next?', hint: '先放 What，中间放 happens，最后放 next。', explanation: '看故事、聊剧情时，What happens next? 是很常用的问题。',
      },
      {
        type: 'recall', prompt: '回到游戏，刚完成一段剧情。问问林林，接下来会发生什么。', context: '故事里的门打开了。林林说：“这一章结束了。”', speaker: '故事伙伴林林', english: 'The chapter is over.',
        translation: "接下来会发生什么？",
        response: {"english": "The door leads to a new island.", "translation": "这扇门通向一座新的小岛。", "speaker": "故事伙伴林林"},
        shortPrompt: '换到游戏，问林林接下来会怎样。', shortContext: '故事门打开了，林林说这一章结束。',
        accepted: ['What happens next?', 'What will happen next?', 'What is going to happen next?', "What's going to happen next?", "What's next?", 'What is next?', 'So, what happens next?', 'And what happens next?', 'What happens after this?', 'What will happen after this?', "What's going to happen now?", 'Do you know what happens next?'],
        reference: 'What happens next?', hint: '用刚学的 What … next?。', explanation: 'What will happen next? 也自然，强调接下来将会发生的事。',
        variations: [
          {
            "type": "recall",
            "prompt": "漫画里出现一个神秘盒子。问问林林，下一页会发生什么。",
            "shortPrompt": "漫画有神秘盒子，问接下来会怎样。",
            "context": "林林停在盒子还没打开的这一页，问你猜会怎样。",
            "shortContext": "漫画里的盒子，还没打开。",
            "speaker": "故事伙伴林林",
            "english": "What do you think?",
            "reference": "What happens next?",
            "translation": "接下来会发生什么？",
            "accepted": [
              "What happens next?",
              "What will happen next?",
              "What is going to happen next?",
              "What's going to happen next?",
              "What's next?",
              "What is next?",
              "So, what happens next?",
              "What happens on the next page?",
              "Do you know what happens next?"
            ],
            "hint": "问接下来会怎样，用 What … next?。",
            "explanation": "文字故事、漫画或游戏剧情，都可以用这句来继续聊后面的发展。",
            "response": {
              "english": "A kitten jumps out of the box!",
              "translation": "一只小猫从盒子里跳出来！",
              "speaker": "故事伙伴林林"
            }
          }
        ],
      },
    ],
  },
  {
    id: 'study-1', zoneId: 'study', order: 0, title: '请再说一遍', subtitle: '没听清，也能继续聊', level: 'starter', minutes: 3,
    phrase: 'Please say that again.', translation: '请再说一遍。',
    learningGoal: '没听清一句话时，主动请对方重复，让交流继续下去。', takeaway: 'Please say that again. = 请再说一遍。',
    vocabulary: [{ word: 'say', meaning: '说' }, { word: 'again', meaning: '再一次' }],
    storyBeat: "在米拉的地图讲解中没听清一句话，你主动请她重复。",
    pitfall: "say that again 是“再说一遍”，speak slowly 是“说慢一点”；根据想要的帮助来选。",
    rewardText: "米拉重新说了一遍，你接上了读书角的活动。",
    steps: [
      {
        type: 'choice', prompt: '没听清米拉刚才的话。请她再说一遍吧。', context: '学习工坊里，导师米拉正在介绍一张探险地图。', speaker: '导师米拉',
        shortPrompt: '没听清米拉，请她再说一遍。', shortContext: '工坊里，米拉正在介绍探险地图。',
        options: [
          { text: 'Please speak slowly.', correct: false, feedback: '这句是请说慢一点。想听同一句再说一次，用 say that again。' },
          { text: 'Please say that again.', correct: true, feedback: '可以！请人重复，是让交流继续下去的好办法。' },
          { text: 'Please write that down.', correct: false, feedback: '这句是请把它写下来。想再听一次，用 say that again。' },
        ], hint: 'again = 再一次；say that again = 再说一遍。',
      },
      {
        type: 'order', prompt: '对米拉说：请再说一遍。', context: '米拉停下来等你提问，不用着急猜她刚刚说了什么。', speaker: '导师米拉',
        shortPrompt: '对米拉说：请再说一遍。', shortContext: '米拉停下来，等你提出问题。',
        tokens: ['Please', 'say', 'that', 'again'], answer: 'Please say that again.', hint: '从 Please say 开始，接 that again。', explanation: 'Please say that again 是清楚、礼貌的重复请求。',
      },
      {
        type: 'recall', prompt: '翻到读书角时又没听清一句话。自己请米拉重复一次吧。', context: '米拉说：“打开你的书。”你想把这句话再听一遍。', speaker: '导师米拉', english: 'Open your book.',
        translation: "请再说一遍。",
        response: {"english": "Of course. Open your book.", "translation": "当然。请打开你的书。", "speaker": "导师米拉"},
        shortPrompt: '又没听清，自己请米拉重复。', shortContext: '读书角里，米拉刚让你打开书。',
        accepted: ['Please say that again.', 'Say that again, please.', 'Could you say that again, please?', 'Can you say that again, please?', 'Could you repeat that, please?', 'Can you repeat that, please?', 'Please repeat that.', 'Could you say that again?', 'Can you say that again?', 'Could you repeat that?', 'Can you repeat that?', 'Sorry, could you say that again?', 'Sorry, can you say that again?', 'Sorry, could you repeat that, please?', 'Sorry, can you repeat that, please?', 'Please could you say that again?', 'Please can you say that again?', 'Please could you repeat that?', 'Say it again, please.', 'Could you say it again, please?', 'Can you say it again, please?', 'Pardon?', 'Sorry?'],
        reference: 'Please say that again.', hint: '想想你怎样请对方再说一次。', explanation: 'Could you repeat that, please? 也是常用的礼貌请求。',
        variations: [
          {
            "type": "recall",
            "prompt": "工坊门口有点吵，没听清米拉刚刚的提醒。请她再说一遍。",
            "shortPrompt": "门口没听清，请米拉再说一遍。",
            "context": "米拉说“跟我来”，但周围的说话声让你没听清。",
            "shortContext": "周围有点吵，米拉刚说跟她走。",
            "speaker": "导师米拉",
            "english": "Follow me.",
            "reference": "Please say that again.",
            "translation": "请再说一遍。",
            "accepted": [
              "Please say that again.",
              "Say that again, please.",
              "Could you say that again, please?",
              "Can you say that again, please?",
              "Could you repeat that, please?",
              "Can you repeat that, please?",
              "Please repeat that.",
              "Could you say that again?",
              "Can you say that again?",
              "Could you repeat that?",
              "Can you repeat that?",
              "Sorry, could you say that again?",
              "Sorry, can you say that again?",
              "Sorry, could you repeat that, please?",
              "Say it again, please.",
              "Could you say it again, please?",
              "Please could you say that again?",
              "Pardon?",
              "Sorry?"
            ],
            "hint": "想再听同一句，用 say that again。",
            "explanation": "听不清不只发生在学习时；在嘈杂地方交流，也可以礼貌请人重复。",
            "response": {
              "english": "Of course. Follow me.",
              "translation": "当然。跟我来。",
              "speaker": "导师米拉"
            }
          }
        ],
      },
    ],
  },
  {
    id: 'study-2', zoneId: 'study', order: 1, title: '这个词什么意思', subtitle: '把生词变成一个问题', level: 'basic', minutes: 3,
    phrase: 'What does this word mean?', translation: '这个词是什么意思？',
    learningGoal: '看到生词时，指给伙伴看并询问它的意思。', takeaway: 'What does this word mean? = 这个词是什么意思？',
    vocabulary: [{ word: 'word', meaning: '词' }, { word: 'mean', meaning: '意思是' }],
    storyBeat: "听清之后遇到生词，你把词指给米拉，请她解释。",
    pitfall: "用 does 问词义时，最后用 mean：What does this word mean，不写 means。",
    rewardText: "米拉解释了字幕里的生词，你能继续看故事了。",
    steps: [
      {
        type: 'choice', prompt: '地图上有个生词。向米拉问问它是什么意思。', context: '翻开探险地图，一个没见过的词让你停了下来。', speaker: '导师米拉',
        shortPrompt: '地图上有生词，问米拉意思。', shortContext: '翻开探险地图，你遇到一个生词。',
        options: [
          { text: 'How do you spell this word?', correct: false, feedback: '这句是在问这个词怎样拼写。问意思时用 mean。' },
          { text: 'How do you say this word?', correct: false, feedback: '这句是在问这个词怎么读。问意思时用 mean。' },
          { text: 'What does this word mean?', correct: true, feedback: '问得很清楚！word 是词，mean 是意思是。' },
        ], hint: 'word = 词；mean = 意思是。',
      },
      {
        type: 'order', prompt: '指着地图，对米拉说：这个词是什么意思？', context: '米拉靠近地图，等你指出想了解的词。', speaker: '导师米拉',
        shortPrompt: '指着词问：这个词什么意思？', shortContext: '米拉靠近地图，等你指给她看。',
        tokens: ['What', 'does', 'this', 'word', 'mean'], answer: 'What does this word mean?', hint: '从 What does 开始，中间放 this word，最后放 mean。', explanation: '用 this word 指眼前的这个词，就能问它的意思。',
      },
      {
        type: 'recall', prompt: '工坊的视频字幕里又出现一个生词。指给米拉看，自己问一句吧。', context: '字幕里写着 journey（旅程），你想听米拉用英语解释。她问：“哪个词？”', speaker: '导师米拉', english: 'Which word?',
        translation: "这个词是什么意思？",
        response: {"english": "It means a long trip.", "translation": "它的意思是“一段长途旅行”。", "speaker": "导师米拉"},
        shortPrompt: '字幕出现生词，自己问米拉意思。', shortContext: 'journey 是旅程，问米拉意思。',
        accepted: ['What does this word mean?', 'What is the meaning of this word?', "What's the meaning of this word?", 'What does that word mean?', 'Could you tell me what this word means?', 'Can you tell me what this word means?', 'Excuse me, what does this word mean?', 'What does this word mean, please?', 'Could you explain what this word means?', 'Can you explain what this word means?', 'What is the meaning of that word?', "What's the meaning of that word?", 'May I ask what this word means?', 'Sorry, what does this word mean?'],
        reference: 'What does this word mean?', hint: '从 What does 开始，用 this word 指那个生词。', explanation: 'this word 和 that word 都可以用来指一个词；你可以指给对方看。',
        variations: [
          {
            "type": "recall",
            "prompt": "离开工坊时看到 exit 路牌，想向米拉确认这个词的意思。开口问一句吧。",
            "shortPrompt": "路牌有生词，自己问米拉意思。",
            "context": "路牌写着 exit（出口），你想向米拉确认它的意思。她问你想了解哪个词。",
            "shortContext": "exit 是出口，请米拉解释。",
            "speaker": "导师米拉",
            "english": "Which word?",
            "reference": "What does this word mean?",
            "translation": "这个词是什么意思？",
            "accepted": [
              "What does this word mean?",
              "What does that word mean?",
              "What is the meaning of this word?",
              "What's the meaning of this word?",
              "Could you tell me what this word means?",
              "Can you tell me what this word means?",
              "Excuse me, what does this word mean?",
              "What does this word mean, please?",
              "Could you explain what this word means?",
              "May I ask what this word means?",
              "Sorry, what does this word mean?"
            ],
            "hint": "仍然用 this word 指那个词，再用 mean 问意思。",
            "explanation": "字幕、书本或路牌上的生词，都能用同一个问题请人解释。",
            "response": {
              "english": "It means the way out.",
              "translation": "它的意思是“出口，离开的方向”。",
              "speaker": "导师米拉"
            }
          }
        ],
      },
    ],
  },
  {
    id: 'study-3', zoneId: 'study', order: 2, title: '这部分没明白', subtitle: '表达困难，找到帮助', level: 'stretch', minutes: 3,
    phrase: "I don't understand this part.", translation: '我不明白这部分。',
    learningGoal: '指出具体哪里没明白，帮助对方从合适的地方开始解释。', takeaway: "I don't understand … = 我不明白……。",
    vocabulary: [{ word: 'understand', meaning: '理解、明白' }, { word: 'part', meaning: '部分' }, { word: 'question', meaning: '问题' }],
    storyBeat: "生词弄懂了，最后的路线问题还需米拉一起理清。",
    pitfall: "说 I don't understand this question，不说 I am not understand；understand 表示“理解”。",
    rewardText: "米拉知道你卡在哪个问题，开始为你逐步解释。",
    steps: [
      {
        type: 'choice', prompt: '地图上一部分说明没看懂。告诉米拉你卡在哪里。', context: '生词弄清楚了，但一段路线说明还有点难理解。', speaker: '导师米拉',
        shortPrompt: '有部分说明没懂，告诉米拉。', shortContext: '生词清楚了，但路线说明还有疑问。',
        options: [
          { text: "I don't understand this part.", correct: true, feedback: '说清楚了！I don’t understand … 可以说明哪里没明白。' },
          { text: 'I understand this part.', correct: false, feedback: '这句是我明白这部分。没明白时，加 don’t。' },
          { text: "I don't need this part.", correct: false, feedback: '这句是我不需要这部分。表达没理解，用 understand。' },
        ], hint: "don't understand = 不明白；part = 部分。",
      },
      {
        type: 'order', prompt: '说得更具体：这部分我明白，但这个问题我不明白。', context: '米拉解释后，路线懂了，最后的问题还没懂。question 是问题，but 表示但是。', speaker: '导师米拉',
        shortPrompt: '这部分我懂，但这个问题我不懂。', shortContext: 'question 是问题；but 是但是。',
        tokens: ['I', 'understand', 'this', 'part', 'but', 'I', "don't", 'understand', 'this', 'question'], answer: "I understand this part, but I don't understand this question.", hint: '先拼 I understand this part，再接 but I don’t understand this question。', explanation: '用 but 接起来，把已理解的部分和需要帮助的问题说清楚。两个 I、understand 和 this 各属于一句话。',
      },
      {
        type: 'recall', prompt: '现在只说最需要帮助的地方：我不明白这个问题。', context: '米拉问：“哪个地方需要我帮忙？”你指着眼前的问题。', speaker: '导师米拉', english: 'What do you need help with?',
        translation: "我不明白这个问题。",
        response: {"english": "I'll explain it step by step.", "translation": "我会一步步解释这个问题。", "speaker": "导师米拉"},
        shortPrompt: '告诉米拉：我不明白这个问题。', shortContext: '米拉想帮你；question 是问题。',
        accepted: ["I don't understand this question.", 'I do not understand this question.', "I don't understand the question.", 'I do not understand the question.', "I don't get this question.", "I don't get the question.", "I can't understand this question.", "Sorry, I don't understand this question.", "Sorry, I don't get this question.", "I don't quite understand this question.", "I don't really understand this question.", "I don't understand this question, sorry.", "I'm not sure what this question means.", 'I am not sure what this question means.'],
        reference: "I don't understand this question.", hint: '保留 I don’t understand，换掉最后的 part。', explanation: 'I don’t get this question 是更口语的表达，也是在说没明白这个问题。',
        variations: [
          {
            "type": "recall",
            "prompt": "路线大致懂了，但其中一句还不明白。告诉米拉：我不明白这句话。",
            "shortPrompt": "告诉米拉：我不明白这句话。",
            "context": "sentence 是句子。米拉问哪一部分还需要解释，你指着眼前这句话。",
            "shortContext": "sentence 是句子，米拉等你提问。",
            "speaker": "导师米拉",
            "english": "Which part is unclear?",
            "reference": "I don't understand this sentence.",
            "translation": "我不明白这句话。",
            "accepted": [
              "I don't understand this sentence.",
              "I do not understand this sentence.",
              "I don't understand the sentence.",
              "I don't get this sentence.",
              "I don't get the sentence.",
              "Sorry, I don't understand this sentence.",
              "I don't quite understand this sentence.",
              "I can't understand this sentence.",
              "I'm not sure what this sentence means.",
              "I am not sure what this sentence means."
            ],
            "hint": "保留 I don’t understand，把对象换成 this sentence。",
            "explanation": "把具体没懂的对象说清楚，对方就能更容易找到该帮你解释哪里。",
            "response": {
              "english": "Let's read it slowly together.",
              "translation": "我们一起慢慢读这句话。",
              "speaker": "导师米拉"
            }
          }
        ],
      },
    ],
  },
  {
    id: 'work-1', zoneId: 'work', order: 0, title: '向团队打招呼', subtitle: '给沟通一个友好的开始', level: 'starter', minutes: 3,
    phrase: 'Good morning, everyone.', translation: '大家早上好。',
    learningGoal: '在团队、课堂或活动开始时，按时段向大家问候。', takeaway: 'Good morning／afternoon, everyone. = 大家早上／下午好。',
    vocabulary: [{ word: 'morning', meaning: '早上' }, { word: 'afternoon', meaning: '下午' }, { word: 'everyone', meaning: '大家、每个人' }],
    storyBeat: "你走进会议室，向乔和伙伴们打招呼。",
    pitfall: "Good morning 是早上好，Good afternoon 是下午好；Good night 常是道别或睡前的晚安。",
    rewardText: "乔回应了你的问候，下午的团队交流开始了。",
    steps: [
      {
        type: 'choice', prompt: '早上的项目交流开始了。向大家说一句“早上好”。', context: '职场城市里，伙伴乔把大家请进了会议室。', speaker: '团队伙伴乔',
        shortPrompt: '早上见到团队，向大家问候。', shortContext: '乔邀请你走进项目会议室。',
        options: [
          { text: 'Good evening, everyone.', correct: false, feedback: 'evening 是晚上。早上用 morning。' },
          { text: 'Good morning, everyone.', correct: true, feedback: '问候送到了！everyone 表示大家、每个人。' },
          { text: 'Good night, everyone.', correct: false, feedback: 'Good night 常用于晚安、夜晚道别。早上见面用 Good morning。' },
        ], hint: 'morning = 早上；everyone = 大家。',
      },
      {
        type: 'order', prompt: '对乔和伙伴们说：大家早上好。', context: '伙伴们放好笔记本，乔请你先打个招呼。', speaker: '团队伙伴乔',
        shortPrompt: '对团队说：大家早上好。', shortContext: '伙伴们坐好了，乔等你打招呼。',
        tokens: ['Good', 'morning', 'everyone'], answer: 'Good morning, everyone.', hint: '先放 Good morning，再加 everyone。', explanation: 'Good morning, everyone 也适合课堂、活动等多人场景。',
      },
      {
        type: 'recall', prompt: '午饭后又见到团队。向大家说一句“下午好”。', context: 'afternoon 是下午。乔开门迎接你，说：“欢迎回来！”', speaker: '团队伙伴乔', english: 'Welcome back!',
        translation: "大家下午好。",
        response: {"english": "Good afternoon! Please take a seat.", "translation": "下午好！请坐。", "speaker": "团队伙伴乔"},
        shortPrompt: '午饭后再见团队，说句下午好。', shortContext: '乔迎你回来；afternoon 是下午。',
        accepted: ['Good afternoon, everyone.', 'Good afternoon, everybody.', 'Afternoon, everyone.', 'Good afternoon, team.', 'Good afternoon, all.', 'Good afternoon, everyone!', 'Good afternoon!', 'Good afternoon, everyone. Nice to see you.', 'Hello, everyone. Good afternoon.', 'Hi, everyone. Good afternoon.'],
        reference: 'Good afternoon, everyone.', hint: '把 morning 换成 afternoon。', explanation: 'everyone 和 everybody 都表示大家，可以按场合自然地问候。',
        variations: [
          {
            "type": "recall",
            "prompt": "傍晚来到项目分享会。向乔和伙伴们说一句“晚上好”。",
            "shortPrompt": "傍晚见到团队，向大家说晚上好。",
            "context": "evening 是晚上。乔在分享会门口欢迎你到来。",
            "shortContext": "到了分享会；evening 是晚上。",
            "speaker": "团队伙伴乔",
            "english": "Glad you're here!",
            "reference": "Good evening, everyone.",
            "translation": "大家晚上好。",
            "accepted": [
              "Good evening, everyone.",
              "Good evening, everybody.",
              "Good evening, team.",
              "Good evening, all.",
              "Good evening!",
              "Evening, everyone.",
              "Hello, everyone. Good evening.",
              "Hi, everyone. Good evening."
            ],
            "hint": "见面问候用 Good …，这次的时段是 evening。",
            "explanation": "傍晚见面说 Good evening；Good night 更常用在道别或睡前。",
            "response": {
              "english": "Good evening! Let's get started.",
              "translation": "晚上好！我们开始吧。",
              "speaker": "团队伙伴乔"
            }
          }
        ],
      },
    ],
  },
  {
    id: 'work-2', zoneId: 'work', order: 1, title: '约好一个时间', subtitle: '确认对方是否方便', level: 'basic', minutes: 3,
    phrase: 'Does Friday work for you?', translation: '星期五你方便吗？',
    learningGoal: '商量见面的日期时，礼貌地确认对方是否方便。', takeaway: 'Does … work for you? = ……这个时间你方便吗？',
    vocabulary: [{ word: 'Friday', meaning: '星期五' }, { word: 'Monday', meaning: '星期一' }, { word: 'work for you', meaning: '对你合适、方便' }],
    storyBeat: "今天的交流结束，你和乔商量下次见面的日期。",
    pitfall: "work for you 在约时间时是“对你方便”，不是问“你工作吗”；用 Does Monday work for you。",
    rewardText: "乔确认了星期一的见面时间，你们约好了。",
    steps: [
      {
        type: 'choice', prompt: '想在星期五和乔再聊聊项目。问问他那天是否方便。', context: '今天的交流结束了，你和乔想安排下一次见面。', speaker: '团队伙伴乔',
        shortPrompt: '想约星期五，问乔那天方便吗。', shortContext: '交流结束，你们安排下次见面。',
        options: [
          { text: 'Did you work on Friday?', correct: false, feedback: '这句是在问对方上周或某个星期五有没有工作。约时间用 Does Friday work for you?。' },
          { text: 'Do you work every Friday?', correct: false, feedback: '这句是在问对方是不是每个星期五都工作。确认某个约定时间，用 work for you。' },
          { text: 'Does Friday work for you?', correct: true, feedback: '问清楚了！这里 work for you 表示对你合适、方便。' },
        ], hint: '这里的 work 不只是工作；work for you 是对你方便。',
      },
      {
        type: 'order', prompt: '对乔说：星期五你方便吗？', context: '乔打开日历，准备看看你提出的时间。', speaker: '团队伙伴乔',
        shortPrompt: '问乔：星期五你方便吗？', shortContext: '乔打开日历，看看你提的时间。',
        tokens: ['Does', 'Friday', 'work', 'for', 'you'], answer: 'Does Friday work for you?', hint: 'Does 后面放时间 Friday，再接 work for you。', explanation: '约时间时，Does … work for you? 可以确认一个安排是否适合对方。',
      },
      {
        type: 'recall', prompt: '星期五安排满了。提议改到星期一，并问乔是否方便。', context: 'Monday 是星期一。乔问：“我们什么时候见面？”', speaker: '团队伙伴乔', english: 'When shall we meet?',
        translation: "星期一你方便吗？",
        response: {"english": "Monday works for me. See you then!", "translation": "星期一我方便，到时候见！", "speaker": "团队伙伴乔"},
        shortPrompt: '改约星期一，问乔是否方便。', shortContext: '星期五已满；Monday 是星期一。',
        accepted: ['Does Monday work for you?', 'Is Monday okay for you?', 'Is Monday OK for you?', 'Is Monday good for you?', 'Are you available on Monday?', 'Are you free on Monday?', 'Would Monday work for you?', 'Would Monday be okay for you?', 'Would Monday be good for you?', 'Is Monday convenient for you?', 'How about Monday?', 'What about Monday?', 'Could we meet on Monday?', 'Can we meet on Monday?', 'Shall we meet on Monday?', 'Would Monday be convenient for you?', 'Does Monday work for you, Jo?', 'Is Monday all right for you?', 'Is Monday alright for you?'],
        reference: 'Does Monday work for you?', hint: '把 Friday 换成 Monday。', explanation: 'Are you free on Monday? 是直接问星期一有没有空，也适合商量时间。',
        variations: [
          {
            "type": "recall",
            "prompt": "这次约线上交流。提议下午两点，问乔这个时间是否方便。",
            "shortPrompt": "约下午两点，问乔是否方便。",
            "context": "two p.m. 是下午两点，乔正在日历上找一个方便的时间。",
            "shortContext": "two p.m. 是下午两点。",
            "speaker": "团队伙伴乔",
            "english": "What time works for you?",
            "reference": "Does two p.m. work for you?",
            "translation": "下午两点你方便吗？",
            "accepted": [
              "Does two p.m. work for you?",
              "Does 2 p.m. work for you?",
              "Does 2 pm work for you?",
              "Does two pm work for you?",
              "Does two in the afternoon work for you?",
              "Is two p.m. okay for you?",
              "Is 2 p.m. okay for you?",
              "Is 2 pm okay for you?",
              "How about 2 p.m.?",
              "How about two p.m.?",
              "Can we meet at 2 p.m.?",
              "Could we meet at two p.m.?",
              "Are you free at two p.m.?",
              "Would two p.m. work for you?"
            ],
            "hint": "日期能放在 Does … work for you 里，下午两点也可以；用 two p.m.。",
            "explanation": "时间从某一天换成具体几点，同一句型依然可以确认对方是否方便。",
            "response": {
              "english": "Two p.m. works. I'll see you online.",
              "translation": "下午两点可以，到时候线上见。",
              "speaker": "团队伙伴乔"
            }
          }
        ],
      },
    ],
  },
  {
    id: 'work-3', zoneId: 'work', order: 2, title: '请伙伴帮个忙', subtitle: '把请求说得清楚礼貌', level: 'stretch', minutes: 3,
    phrase: 'Could you help me with this task?', translation: '你能帮我处理这个任务吗？',
    learningGoal: '需要帮助时，说清希望伙伴帮你处理的具体事情。', takeaway: 'Could you help me with …? = 你能帮我处理……吗？',
    vocabulary: [{ word: 'help', meaning: '帮助' }, { word: 'task', meaning: '任务' }, { word: 'project', meaning: '项目' }],
    storyBeat: "来到约好的日子，你告诉乔具体需要什么帮助。",
    pitfall: "请求“帮我”用 help me，不是 help I；说明事情时接 with this task 或 with this project。",
    rewardText: "乔接受了请求，和你一起处理这个项目。",
    steps: [
      {
        type: 'choice', prompt: '项目里有个任务需要帮助。礼貌地请乔帮个忙。', context: '到了约好的星期一，你带着项目资料来找乔。', speaker: '团队伙伴乔',
        shortPrompt: '任务需要帮助，礼貌请乔帮忙。', shortContext: '到了星期一，你带着资料找乔。',
        options: [
          { text: 'Could you help me with this task?', correct: true, feedback: '请求很清楚！Could you help me with …? 可以礼貌地请人帮忙。' },
          { text: 'Could you send me this task?', correct: false, feedback: '这句是在请对方把任务发给你。需要帮助时，用 help me with。' },
          { text: 'Have you finished this task?', correct: false, feedback: '这句是在问任务是否完成。请人帮忙，用 Could you help me。' },
        ], hint: 'Could you …? 是礼貌请求；help me with … = 帮我处理……。',
      },
      {
        type: 'order', prompt: '对乔说：你能帮我处理这个任务吗？', context: '乔放下手里的资料，准备听你说说需要什么帮助。', speaker: '团队伙伴乔',
        shortPrompt: '你能帮我处理这个任务吗？', shortContext: '乔放下资料，听你需要什么帮助。',
        tokens: ['Could', 'you', 'help', 'me', 'with', 'this', 'task'], answer: 'Could you help me with this task?', hint: '从 Could you help me 开始，接 with this task。', explanation: '指出具体任务，可以让对方知道怎样提供帮助。',
      },
      {
        type: 'recall', prompt: '接下来整个项目都需要一起整理。礼貌地请乔帮你处理这个项目。', context: 'project 是项目。乔问：“我能怎么帮你？”', speaker: '团队伙伴乔', english: 'How can I help?',
        translation: "你能帮我处理这个项目吗？",
        response: {"english": "Of course. Let's work on it together.", "translation": "当然，我们一起来做这个项目。", "speaker": "团队伙伴乔"},
        shortPrompt: '换成整个项目，礼貌请乔帮忙。', shortContext: '乔准备帮忙；project 是项目。',
        accepted: ['Could you help me with this project?', 'Can you help me with this project?', 'Would you help me with this project?', 'Could you please help me with this project?', 'Can you please help me with this project?', 'Could you help me with this project, please?', 'Can you help me with this project, please?', 'Could you give me a hand with this project?', 'Can you give me a hand with this project?', 'Would you mind helping me with this project?', 'Would you be able to help me with this project?', 'Please could you help me with this project?', 'Please can you help me with this project?', 'May I ask for your help with this project?', 'Could I ask you to help me with this project?', 'Excuse me, could you help me with this project?', 'Hi Jo, could you help me with this project?', 'I need some help with this project, please.', 'I could use some help with this project.'],
        reference: 'Could you help me with this project?', hint: '把 task 换成 project。', explanation: 'Could you 和 Can you 都可以请求帮助；加 please 也能表达礼貌。',
        variations: [
          {
            "type": "recall",
            "prompt": "线上交流开始前，不知道怎样分享屏幕。指着这个操作，礼貌地请乔帮忙。",
            "shortPrompt": "分享屏幕不会操作，请乔帮忙。",
            "context": "你正找“分享”按钮，乔问具体哪里需要帮助。用 this 指这件事就可以。",
            "shortContext": "找分享按钮；this 指这件事。",
            "speaker": "团队伙伴乔",
            "english": "What do you need help with?",
            "reference": "Could you help me with this?",
            "translation": "你能帮我处理这件事吗？",
            "accepted": [
              "Could you help me with this?",
              "Can you help me with this?",
              "Could you please help me with this?",
              "Can you please help me with this?",
              "Could you help me with this, please?",
              "Can you help me with this, please?",
              "Could you give me a hand with this?",
              "Would you mind helping me with this?",
              "Please could you help me with this?",
              "May I ask for your help with this?",
              "I need some help with this, please."
            ],
            "hint": "仍用 Could you help me with …，这次用 this 指眼前需要帮助的操作。",
            "explanation": "不知道一个操作的英文名字时，也可以指着它说 this，清楚地请求帮助。",
            "response": {
              "english": "Sure. Click the share button.",
              "translation": "当然，点一下“分享”按钮。",
              "speaker": "团队伙伴乔"
            }
          }
        ],
      },
    ],
  },
];

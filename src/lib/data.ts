/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供游戏类型定义 + 数据常量 + 工具函数
 * [POS]: lib 的游戏数据层，3NPC/5场景/3道具/4章节/强制事件/5结局/6时段
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ============================================================
// 类型定义 — 异构数值系统
// ============================================================

/** 数值元数据：驱动 UI 和逻辑，无 if/else */
export interface StatMeta {
  key: string
  label: string
  color: string
  icon: string
  autoIncrement?: number
  decayRate?: number
}

/** 角色数值 — 动态键值对，由 statMetas 描述 */
export type CharacterStats = Record<string, number>

export interface Character {
  id: string
  name: string
  avatar: string
  fullImage: string
  gender: 'female' | 'male'
  age: number
  title: string
  description: string
  personality: string
  speakingStyle: string
  secret: string
  triggerPoints: string[]
  behaviorPatterns: string
  themeColor: string
  joinDay: number
  statMetas: StatMeta[]
  initialStats: CharacterStats
}

export interface Scene {
  id: string
  name: string
  icon: string
  description: string
  background: string
  atmosphere: string
  tags: string[]
  unlockCondition?: {
    event?: string
    stat?: { charId: string; key: string; min: number }
  }
}

export interface GameItem {
  id: string
  name: string
  icon: string
  type: 'consumable' | 'collectible' | 'quest'
  description: string
  maxCount: number
}

export interface Chapter {
  id: number
  name: string
  dayRange: [number, number]
  description: string
  objectives: string[]
  atmosphere: string
}

export interface ForcedEvent {
  id: string
  name: string
  triggerDay: number
  triggerPeriod?: number
  description: string
}

export interface Ending {
  id: string
  name: string
  type: 'TE' | 'HE' | 'BE' | 'NE'
  description: string
  condition: string
}

export interface TimePeriod {
  index: number
  name: string
  icon: string
  hours: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  character?: string
  timestamp: number
}

// ============================================================
// 游戏配置
// ============================================================

export const MAX_DAYS = 30
export const MAX_ACTION_POINTS = 6

// ============================================================
// 时间系统 — 6 时段
// ============================================================

export const PERIODS: TimePeriod[] = [
  { index: 0, name: '清晨', icon: '🌅', hours: '05:00-08:59' },
  { index: 1, name: '上午', icon: '☀️', hours: '09:00-11:59' },
  { index: 2, name: '中午', icon: '🌞', hours: '12:00-13:59' },
  { index: 3, name: '下午', icon: '⛅', hours: '14:00-16:59' },
  { index: 4, name: '傍晚', icon: '🌇', hours: '17:00-19:59' },
  { index: 5, name: '深夜', icon: '🌙', hours: '20:00-04:59' },
]

// ============================================================
// NPC 数据 — 3 位核心角色
// ============================================================

/** 丹辰子 — 固定男性，1 维数值：觊觎度 */
const DANCHENZI: Character = {
  id: 'danchenzi',
  name: '丹辰子',
  avatar: '丹',
  fullImage: '/characters/danchenzi.jpg',
  gender: 'male',
  age: 800,
  title: '药王谷谷主',
  description: '仙风道骨的正道宗主，被誉为"丹道第一人"。表面温和慈祥，实则心狠手辣——他也是灵草成精，需吞噬同类维持人形。',
  personality: '道貌岸然 | 贪婪偏执 + 虚伪阴险 + 不怒自威',
  speakingStyle: '温文尔雅，喜用典故和比喻，长句为主，排比反问，嘴角挂着从不达眼底的笑意',
  secret: '曾经也是灵草成精，通过吞噬其他灵草维持人形，朔月之夜也会短暂恢复本体',
  triggerPoints: ['在他面前提"灵草"、"化形"', '试图揭穿他的真实身份', '拒绝他的"好意"'],
  behaviorPatterns: '觊觎度<60表面温和暗中观察，60-80派人接触试探，>80不择手段直接抓捕',
  themeColor: '#b45309',
  joinDay: 1,
  statMetas: [
    { key: 'coveting', label: '觊觎', color: '#b45309', icon: '👁', autoIncrement: 5 },
  ],
  initialStats: { coveting: 50 },
}

/** 叶青霜 — 性别随玩家互补 */
function buildYeqingshuang(playerGender: 'male' | 'female'): Character {
  const isFemale = playerGender === 'male'
  return {
    id: 'yeqingshuang',
    name: '叶青霜',
    avatar: '叶',
    fullImage: isFemale ? '/characters/yeqingshuang-f.jpg' : '/characters/yeqingshuang-m.jpg',
    gender: isFemale ? 'female' : 'male',
    age: 300,
    title: '散修剑修',
    description: isFemale
      ? '清冷如霜的女剑修，如同一柄出鞘的利剑。百年前的"七叶雪莲"成精，已成功化形。看到你就像看到当年的自己。'
      : '冷峻如冰的男剑修，如同一柄藏于鞘中的名剑。百年前的"七叶雪莲"成精，已成功化形。看到你就像看到当年的自己。',
    personality: '外冷内热 | 隐忍守护 + 孤独三百年 + 同类保护欲',
    speakingStyle: '简洁直接，短句为主，命令句多，偶尔流露的温柔让人心疼',
    secret: '百年前的"七叶雪莲"成精，已成功化形。知道化形池真相、丹辰子真实身份、朔月之夜的真正意义',
    triggerPoints: ['提及"丹辰子"或"药王谷"', '伤害其他灵草成精者', '不真诚'],
    behaviorPatterns: '好感<30冷漠只提供基本帮助，30-60友好主动提供情报，>60透露自己秘密',
    themeColor: '#0ea5e9',
    joinDay: 1,
    statMetas: [
      { key: 'affection', label: '好感', color: '#ef4444', icon: '❤' },
      { key: 'trust', label: '信任', color: '#22c55e', icon: '🤝' },
    ],
    initialStats: { affection: 0, trust: 0 },
  }
}

/** 赤璃 — 固定男性 */
const CHILI: Character = {
  id: 'chili',
  name: '赤璃',
  avatar: '赤',
  fullImage: '/characters/chili.jpg',
  gender: 'male',
  age: 200,
  title: '妖族少主',
  description: '邪魅狂狷的妖族少主，半妖半人的混血。琥珀色瞳孔在暗处发光，额头有妖族王室红纹。真心想帮你，代价是成为妖族一员。',
  personality: '热情偏执 | 孤独半妖 + 真诚但偏执 + 认为妖族才是灵物归宿',
  speakingStyle: '慵懒散漫，长短句结合，感叹句多，偶尔认真时眼神锐利如野兽',
  secret: '半妖半人的混血，在两边都不被接纳。知道化形池真相但认为成为妖比做人更好',
  triggerPoints: ['提及"人"或"人类"', '伤害妖族', '否定妖族的生活方式'],
  behaviorPatterns: '好感<30感兴趣保持距离，30-60友好主动帮助，>60透露妖族秘密',
  themeColor: '#ef4444',
  joinDay: 1,
  statMetas: [
    { key: 'affection', label: '好感', color: '#ef4444', icon: '❤' },
    { key: 'assimilation', label: '同化', color: '#7c3aed', icon: '🔮' },
  ],
  initialStats: { affection: 0, assimilation: 0 },
}

/** 工厂函数 — 根据玩家性别构建角色 */
export function buildCharacters(playerGender: 'male' | 'female'): Record<string, Character> {
  return {
    danchenzi: DANCHENZI,
    yeqingshuang: buildYeqingshuang(playerGender),
    chili: CHILI,
  }
}

// ============================================================
// 场景数据 — 5 个场景
// ============================================================

export const SCENES: Record<string, Scene> = {
  cave: {
    id: 'cave',
    name: '隐秘山洞',
    icon: '🕳️',
    description: '落霞山脉深处的天然山洞，洞顶裂缝透进微弱光线，空气中弥漫着潮湿的土腥味和你自己的药香。',
    background: '/scenes/cave.jpg',
    atmosphere: '安静、隐秘、安全',
    tags: ['藏身处', '初始', '探索'],
  },
  outskirts: {
    id: 'outskirts',
    name: '落霞山脉',
    icon: '⛰️',
    description: '茂密的山林，树木高大遮天蔽日。阳光透过树叶洒下斑驳光影，远处偶有野兽咆哮。自由但危险。',
    background: '/scenes/outskirts.jpg',
    atmosphere: '自由、危险、机遇并存',
    tags: ['野外', '初始', '采集'],
  },
  tianjicheng: {
    id: 'tianjicheng',
    name: '天机城',
    icon: '🏯',
    description: '修仙界的交易中心，街道宽阔建筑林立。各种丹药法宝灵草在此交易，鱼龙混杂，消息灵通。',
    background: '/scenes/tianjicheng.jpg',
    atmosphere: '繁华、热闹、鱼龙混杂',
    tags: ['城市', '交易', '情报'],
    unlockCondition: { event: 'meet-yeqingshuang' },
  },
  yaowanggu: {
    id: 'yaowanggu',
    name: '药王谷',
    icon: '⚗️',
    description: '宏伟的山谷中布满药田和炼丹房，常年阳光照耀，浓郁药香混杂炼丹气息。正道圣地，也是你的噩梦之地。',
    background: '/scenes/yaowanggu.jpg',
    atmosphere: '庄严、危险、诱惑',
    tags: ['宗门', '危险', '情报'],
    unlockCondition: {
      event: 'danchenzi-invitation',
      stat: { charId: 'danchenzi', key: 'coveting', min: 80 },
    },
  },
  forest: {
    id: 'forest',
    name: '万妖森林',
    icon: '🌲',
    description: '茂密的原始森林，阳光几乎无法穿透厚厚树冠。发光的蘑菇点缀深绿，远处传来妖族祭祀歌声。',
    background: '/scenes/forest.jpg',
    atmosphere: '神秘、危险、诱惑',
    tags: ['妖界', '化形池', '秘境'],
    unlockCondition: { event: 'chili-proposal' },
  },
}

// ============================================================
// 道具数据 — 3 种
// ============================================================

export const ITEMS: Record<string, GameItem> = {
  'concealment-talisman': {
    id: 'concealment-talisman',
    name: '隐匿符',
    icon: '📜',
    type: 'consumable',
    description: '黄色符纸，复杂符文。点燃后化作青烟笼罩全身，暂时掩盖本体气息。',
    maxCount: 6,
  },
  'pool-fragment': {
    id: 'pool-fragment',
    name: '化形池线索碎片',
    icon: '🔮',
    type: 'collectible',
    description: '古老的玉片，上面刻着模糊文字。集齐3片可得知化形池位置。',
    maxCount: 3,
  },
  'elder-diary': {
    id: 'elder-diary',
    name: '灵草前辈日记',
    icon: '📖',
    type: 'quest',
    description: '封面写着"灵草札记"的古老书册，记载着前辈灵草的经验和对化形池的警告。',
    maxCount: 1,
  },
}

// ============================================================
// 章节数据 — 4 章
// ============================================================

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    name: '初化人形',
    dayRange: [1, 5],
    description: '你刚刚化形成功，对外界一无所知。必须在被发现之前学会生存。',
    objectives: ['在落霞山脉生存下来', '学会使用隐匿符', '不被丹辰子的追兵发现'],
    atmosphere: '紧张中带着好奇',
  },
  {
    id: 2,
    name: '三方博弈',
    dayRange: [6, 15],
    description: '丹辰子、叶青霜、赤璃三方势力相继出现，你必须在他们之间周旋。',
    objectives: ['在朔月之夜到来前找到庇护所', '从各方获取化形池线索', '理清三方真实目的'],
    atmosphere: '紧张、纠结',
  },
  {
    id: 3,
    name: '朔月之夜',
    dayRange: [16, 16],
    description: '朔月之夜到来，你会短暂恢复九叶灵芝本体形态。最危险的时刻。',
    objectives: ['在朔月之夜存活', '不被任何人发现本体', '借朔月感知化形池方位'],
    atmosphere: '紧张、绝望、希望',
  },
  {
    id: 4,
    name: '化形之路',
    dayRange: [17, 30],
    description: '你终于得知化形池的位置，但必须付出巨大代价才能到达。最终抉择在前方等待。',
    objectives: ['到达化形池', '做出最终选择', '面对化形池的真相'],
    atmosphere: '悲壮、希望',
  },
]

// ============================================================
// 强制事件
// ============================================================

export const FORCED_EVENTS: ForcedEvent[] = [
  {
    id: 'meet-yeqingshuang',
    name: '初遇叶青霜',
    triggerDay: 3,
    triggerPeriod: 1,
    description: '落霞山脉外围，叶青霜正与丹辰子的弟子战斗。你可以选择帮助或趁机逃走。',
  },
  {
    id: 'danchenzi-invitation',
    name: '丹辰子的邀请',
    triggerDay: 8,
    description: '丹辰子派人送来请帖，"邀请"你前往药王谷"做客"。你感到一阵不寒而栗。',
  },
  {
    id: 'chili-proposal',
    name: '赤璃的提议',
    triggerDay: 10,
    triggerPeriod: 3,
    description: '在天机城偶遇赤璃，他提出带你去万妖森林，用妖族秘法帮你度过朔月之夜。',
  },
  {
    id: 'new-moon-night',
    name: '朔月暴露',
    triggerDay: 16,
    triggerPeriod: 5,
    description: '今夜，月亮不会升起。你感到体内灵气剧烈波动，九叶灵芝本体开始显现...',
  },
  {
    id: 'three-way-choice',
    name: '三方势力的选择',
    triggerDay: 18,
    triggerPeriod: 2,
    description: '丹辰子、叶青霜、赤璃同时向你抛出橄榄枝。你必须做出选择——或者谁也不信。',
  },
  {
    id: 'pool-clue',
    name: '化形池线索',
    triggerDay: 22,
    description: '三块玉片合在一起发出柔和光芒，浮现出一幅地图，指向万妖森林最深处。',
  },
  {
    id: 'yeqingshuang-truth',
    name: '叶青霜真实身份',
    triggerDay: 25,
    triggerPeriod: 4,
    description: '叶青霜终于向你坦白——"我和你一样，也是灵草成精。百年前的七叶雪莲..."',
  },
]

// ============================================================
// 结局定义 — 5 种
// ============================================================

export const ENDINGS: Ending[] = [
  {
    id: 'te-true-person',
    name: '真正的人',
    type: 'TE',
    description: '你在最后一刻拒绝了化形池，选择以灵草之身继续做人。叶青霜告诉你另一个方法——用百年时间慢慢修炼，最终可以真正化形。虽然漫长，但你是自由的。',
    condition: '叶青霜好感≥80 且 信任≥60 且 持有日记 且 触发叶青霜真实身份',
  },
  {
    id: 'he-demon-flower',
    name: '妖界之花',
    type: 'HE',
    description: '你接受了赤璃的提议，进入化形池。你失去了人形，但获得了真正的自由。在妖界你不再是"药"，而是被尊敬的"妖"。你和赤璃一起，守护着妖界的边界。',
    condition: '赤璃好感≥80 且 同化≥60',
  },
  {
    id: 'be-alchemy',
    name: '丹炉中的永生',
    type: 'BE',
    description: '你被丹辰子炼成了九转还魂丹。奇怪的是你并没有死——你的意识被困在丹药中，永远感受着被吞噬的痛苦。',
    condition: '丹辰子觊觎度达到100',
  },
  {
    id: 'be-prey',
    name: '猎物的末路',
    type: 'BE',
    description: '你在朔月之夜暴露了本体，被闻讯而来的修士们分食。你的最后一丝意识，是感受着身体被撕裂的痛苦。',
    condition: '朔月之夜暴露且无人庇护',
  },
  {
    id: 'ne-half',
    name: '半人半草',
    type: 'NE',
    description: '你离开了化形池，继续在修仙界流浪。既没有成为真正的人，也没有成为妖。这种生活很艰难，但你还在坚持。',
    condition: '所有角色好感度<60 且 到达化形池但选择离开',
  },
]

// ============================================================
// 开场信笺
// ============================================================

export const STORY_INFO = {
  genre: '仙侠修真',
  title: '灵草修仙录',
  subtitle: 'Spirit Herb Chronicle · 修仙文字冒险',
  description:
    '天元历三千七百年，一株千年九叶灵芝在山野灵气中孕育千年，终于化形成人。' +
    '你睁开眼睛，第一次以人类的视角打量这个世界——' +
    '但很快你就会发现，这个世界对"灵草成精"的态度，远比你想象的更加危险...',
  goals: [
    '在 30 天内找到传说中的化形池',
    '在三方势力中周旋求存',
    '在朔月之夜守住灵草身份的秘密',
    '做出最终选择——成人、成妖、还是寻找第三条路',
  ],
}

// ============================================================
// 工具函数
// ============================================================

/** 数值等级（通用，所有正向数值共用） */
export function getStatLevel(value: number) {
  if (value >= 80) return { level: 4, name: '深度羁绊' }
  if (value >= 60) return { level: 3, name: '关系亲密' }
  if (value >= 30) return { level: 2, name: '逐渐了解' }
  return { level: 1, name: '初步接触' }
}

/** 获取当天可见角色（根据 joinDay 过滤） */
export function getAvailableCharacters(
  day: number,
  characters: Record<string, Character>
): Record<string, Character> {
  return Object.fromEntries(
    Object.entries(characters).filter(([, char]) => char.joinDay <= day)
  )
}

/** 获取当前章节 */
export function getCurrentChapter(day: number): Chapter {
  return CHAPTERS.find((ch) => day >= ch.dayRange[0] && day <= ch.dayRange[1]) ?? CHAPTERS[0]
}

/** 获取当天需要触发的强制事件 */
export function getDayEvents(day: number, triggeredEvents: string[]): ForcedEvent[] {
  return FORCED_EVENTS.filter(
    (e) => e.triggerDay === day && !triggeredEvents.includes(e.id)
  )
}

/** 检查场景是否可解锁 */
export function isSceneUnlockable(
  scene: Scene,
  triggeredEvents: string[],
  characterStats: Record<string, CharacterStats>
): boolean {
  const cond = scene.unlockCondition
  if (!cond) return true
  if (cond.event && !triggeredEvents.includes(cond.event)) return false
  if (cond.stat) {
    const stats = characterStats[cond.stat.charId]
    if (!stats || (stats[cond.stat.key] ?? 0) < cond.stat.min) return false
  }
  return true
}

/**
 * [INPUT]: 依赖 zustand, immer, @/lib/stream, @/lib/analytics, @/lib/data
 * [OUTPUT]: 对外提供 useGameStore
 * [POS]: 灵草修仙录状态管理中枢，异构数值+场景解锁+朔月倒计时
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { streamChat, chat } from '@/lib/stream'
import { trackGameStart, trackGameContinue, trackTimeAdvance, trackChapterEnter, trackPlayerCreate, trackSceneUnlock, trackNewMoonTrigger } from '@/lib/analytics'
import {
  type Character, type CharacterStats, type Message,
  SCENES, ITEMS, PERIODS,
  MAX_DAYS, MAX_ACTION_POINTS,
  buildCharacters, getStatLevel, getAvailableCharacters,
  getCurrentChapter, getDayEvents, isSceneUnlockable,
} from '@/lib/data'

// ============================================================
// Store 类型
// ============================================================

interface GameState {
  gameStarted: boolean
  playerGender: 'male' | 'female'
  playerName: string
  characters: Record<string, Character>
  currentDay: number
  currentPeriodIndex: number
  actionPoints: number
  currentScene: string
  currentCharacter: string | null
  characterStats: Record<string, CharacterStats>
  currentChapter: number
  triggeredEvents: string[]
  unlockedScenes: string[]
  poolFragments: number
  newMoonCountdown: number
  isNewMoonNight: boolean
  inventory: Record<string, number>
  messages: Message[]
  historySummary: string
  isTyping: boolean
  streamingContent: string
  endingType: string | null
  activePanel: 'inventory' | 'relations' | null
}

interface GameActions {
  setPlayerInfo: (gender: 'male' | 'female', name: string) => void
  initGame: () => void
  selectCharacter: (id: string | null) => void
  selectScene: (id: string) => void
  unlockScene: (sceneId: string) => void
  togglePanel: (panel: 'inventory' | 'relations') => void
  closePanel: () => void
  sendMessage: (text: string) => Promise<void>
  advanceTime: () => void
  useItem: (itemId: string) => void
  checkEnding: () => void
  addSystemMessage: (content: string) => void
  resetGame: () => void
  saveGame: () => void
  loadGame: () => boolean
  hasSave: () => boolean
  clearSave: () => void
}

type GameStore = GameState & GameActions

// ============================================================
// 工具
// ============================================================

let messageCounter = 0
function makeId() {
  return `msg-${Date.now()}-${++messageCounter}`
}

const SAVE_KEY = 'lingcao-save-v1'

function buildInitialStats(characters: Record<string, Character>): Record<string, CharacterStats> {
  return Object.fromEntries(
    Object.entries(characters).map(([id, char]) => [id, { ...char.initialStats }])
  )
}

// ============================================================
// 数值解析器 — 从角色 statMetas 动态构建映射
// ============================================================

function parseStatChanges(
  content: string,
  characters: Record<string, Character>
): Array<{ charId: string; stat: string; delta: number }> {
  const changes: Array<{ charId: string; stat: string; delta: number }> = []

  /* 角色名 → id */
  const nameToId: Record<string, string> = {}
  for (const [id, char] of Object.entries(characters)) {
    nameToId[char.name] = id
  }

  /* 数值 label → key（从 statMetas 动态构建） */
  const labelToKey: Record<string, { charId: string; key: string }> = {}
  for (const [id, char] of Object.entries(characters)) {
    for (const meta of char.statMetas) {
      labelToKey[meta.label] = { charId: id, key: meta.key }
      labelToKey[`${meta.label}度`] = { charId: id, key: meta.key }
      labelToKey[`${meta.label}值`] = { charId: id, key: meta.key }
    }
  }

  /* 匹配格式: 【角色名 数值名+N】 或 【角色名】数值名+N */
  const regex = /[【\[]([^\]】]+)[】\]]\s*(\S+?)([+-])(\d+)/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const charId = nameToId[match[1]]
    const label = match[2]
    if (charId) {
      /* 在该角色的 statMetas 中查找 */
      const char = characters[charId]
      const meta = char?.statMetas.find(
        (m) => label === m.label || label === `${m.label}度` || label === `${m.label}值`
      )
      if (meta) {
        const delta = parseInt(match[4]) * (match[3] === '+' ? 1 : -1)
        changes.push({ charId, stat: meta.key, delta })
      }
    } else {
      /* 无角色名前缀，用全局 labelToKey */
      const info = labelToKey[label]
      if (info) {
        const delta = parseInt(match[4]) * (match[3] === '+' ? 1 : -1)
        changes.push({ charId: info.charId, stat: info.key, delta })
      }
    }
  }
  return changes
}

// ============================================================
// System Prompt 构建
// ============================================================

function buildSystemPrompt(state: GameState, char: Character | null): string {
  const period = PERIODS[state.currentPeriodIndex]
  const scene = SCENES[state.currentScene]
  const chapter = getCurrentChapter(state.currentDay)
  const availableChars = getAvailableCharacters(state.currentDay, state.characters)

  /* 所有可见角色异构数值摘要 */
  const allStats = Object.entries(availableChars)
    .map(([id, c]) => {
      const s = state.characterStats[id]
      const statStr = c.statMetas
        .map((m) => `${m.label}${s?.[m.key] ?? 0}`)
        .join(' ')
      return `${c.name}(${c.gender === 'female' ? '女' : '男'}): ${statStr}`
    })
    .join('\n')

  /* 玩家身份 */
  const genderLabel = state.playerGender === 'male' ? '少年' : '少女'
  const genderCall = state.playerGender === 'male'
    ? '（NPC称呼: 公子/小兄弟/道友/小友）'
    : '（NPC称呼: 姑娘/妹妹/仙子/小姑娘）'

  let prompt = `你是仙侠修真文字冒险游戏《灵草修仙录》的 AI 叙述者。

## 世界观
天元历三千七百年，修仙盛世，灵气充沛，宗门林立。
灵草成精者被视为"天材地宝"，没有"人"的权利。各大宗门都有"灵草园"专门圈养化形灵草以取其精华。
"化形"是灵物追求的终极目标——彻底摆脱本体束缚。

## 玩家身份
玩家「${state.playerName}」是一株千年九叶灵芝，刚刚化形为约莫十六七岁的${genderLabel}。${genderCall}
- 血液、眼泪甚至呼吸都带有药性
- 一片叶子就能让修士突破瓶颈
- 每月朔月之夜会短暂恢复本体形态
- 目标：找到传说中的化形池，彻底摆脱灵草身份

## 叙述风格
- 古风修仙文风：优美不晦涩，侧重对话和心理描写
- 第二人称"你"为主角展开
- NPC 对话用【角色名】前缀标记，动作用（）包裹
- 对话用中文双引号""
- 数值变化用【角色名 数值名+X】格式标注
- 每次回复末尾必须输出：
  第X/${MAX_DAYS}天 ${period?.name || '清晨'} 行动力X/${MAX_ACTION_POINTS}
  朔月倒计时: ${state.newMoonCountdown}天
  各角色当前数值

## 当前章节
第${chapter.id}章「${chapter.name}」(Day ${chapter.dayRange[0]}-${chapter.dayRange[1]})
${chapter.description}
章节目标: ${chapter.objectives.join('、')}
叙事氛围: ${chapter.atmosphere}

## 关键机制
- 丹辰子的觊觎度每天自动+5，达到100触发BE
- 朔月倒计时每天-1，归零时触发朔月之夜
- 场景解锁: 天机城(需初遇叶青霜)、药王谷(需丹辰子邀请+觊觎≥80)、万妖森林(需赤璃提议)
- 化形池线索碎片集齐3片可得知化形池位置

## NPC 行为准则
- 丹辰子: 觊觎度驱动，表面温和实则贪婪，觊觎>80不择手段
- 叶青霜: 好感+信任双轴，外冷内热，好感>60透露秘密，信任>40透露部分线索
- 赤璃: 好感+同化双轴，热情但偏执，同化>60准备好成为妖族`

  if (char) {
    const stats = state.characterStats[char.id]
    const statStr = char.statMetas
      .map((m) => `${m.label}${stats?.[m.key] ?? 0}`)
      .join(' ')
    const level = getStatLevel(stats?.[char.statMetas[0]?.key] ?? 0)
    prompt += `\n\n## 当前互动角色
- 姓名：${char.name}（${char.title}，${char.age}岁，${char.gender === 'female' ? '女' : '男'}）
- 性格：${char.personality}
- 简介：${char.description}
- 说话风格：${char.speakingStyle}
- 行为模式：${char.behaviorPatterns}
- 雷点：${char.triggerPoints.join('、')}
- 当前关系：${level.name}（${statStr}）
- 隐藏秘密：${char.secret}`
  }

  prompt += `\n\n## 当前状态
- 玩家：${state.playerName}（${genderLabel}）
- 时间：第 ${state.currentDay}/${MAX_DAYS} 天 · ${period?.name}
- 行动力：${state.actionPoints}/${MAX_ACTION_POINTS}
- 场景：${scene?.icon} ${scene?.name} — ${scene?.description}
- 朔月倒计时：${state.newMoonCountdown} 天
- 已解锁场景：${state.unlockedScenes.join('、')}
- 化形池线索碎片：${state.poolFragments}/3
${state.isNewMoonNight ? '⚠️ 当前是朔月之夜！玩家已恢复九叶灵芝本体！' : ''}

## 所有角色当前数值
${allStats}`

  return prompt
}

// ============================================================
// Store
// ============================================================

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    // --- 初始状态 ---
    gameStarted: false,
    playerGender: 'male' as 'male' | 'female',
    playerName: '灵芝',
    characters: {},
    currentDay: 1,
    currentPeriodIndex: 0,
    actionPoints: MAX_ACTION_POINTS,
    currentScene: 'cave',
    currentCharacter: null,
    characterStats: {},
    currentChapter: 1,
    triggeredEvents: [],
    unlockedScenes: ['cave', 'outskirts'],
    poolFragments: 0,
    newMoonCountdown: 15,
    isNewMoonNight: false,
    inventory: { 'concealment-talisman': 3 },
    messages: [],
    historySummary: '',
    isTyping: false,
    streamingContent: '',
    endingType: null,
    activePanel: null,

    // --- 操作 ---
    setPlayerInfo: (gender, name) => {
      set((s) => {
        s.playerGender = gender
        s.playerName = name || '灵芝'
      })
      trackPlayerCreate(gender, name)
    },

    initGame: () => {
      const state = get()
      const chars = buildCharacters(state.playerGender)
      set((s) => {
        s.gameStarted = true
        s.characters = chars
        s.currentDay = 1
        s.currentPeriodIndex = 0
        s.actionPoints = MAX_ACTION_POINTS
        s.currentScene = 'cave'
        s.currentCharacter = null
        s.characterStats = buildInitialStats(chars)
        s.currentChapter = 1
        s.triggeredEvents = []
        s.unlockedScenes = ['cave', 'outskirts']
        s.poolFragments = 0
        s.newMoonCountdown = 15
        s.isNewMoonNight = false
        s.inventory = { 'concealment-talisman': 3 }
        s.messages = []
        s.historySummary = ''
        s.endingType = null
        s.activePanel = null
        s.streamingContent = ''
      })
      trackGameStart()
    },

    selectCharacter: (id) => {
      set((s) => { s.currentCharacter = id })
    },

    selectScene: (id) => {
      const state = get()
      if (!state.unlockedScenes.includes(id)) return
      set((s) => {
        s.currentScene = id
        s.currentCharacter = null
      })
      const scene = SCENES[id]
      if (scene) {
        get().addSystemMessage(`你来到了${scene.icon} ${scene.name}。${scene.description}`)
      }
    },

    unlockScene: (sceneId) => {
      set((s) => {
        if (!s.unlockedScenes.includes(sceneId)) {
          s.unlockedScenes.push(sceneId)
        }
      })
      const scene = SCENES[sceneId]
      if (scene) {
        get().addSystemMessage(`🔓 新场景解锁：${scene.icon} ${scene.name}`)
        trackSceneUnlock(sceneId)
      }
    },

    togglePanel: (panel) => {
      set((s) => {
        s.activePanel = s.activePanel === panel ? null : panel
      })
    },

    closePanel: () => {
      set((s) => { s.activePanel = null })
    },

    sendMessage: async (text: string) => {
      const state = get()
      const char = state.currentCharacter ? state.characters[state.currentCharacter] : null

      set((s) => {
        s.messages.push({ id: makeId(), role: 'user', content: text, timestamp: Date.now() })
        s.isTyping = true
        s.streamingContent = ''
      })

      try {
        /* 上下文压缩 */
        let historySummary = state.historySummary
        let recentMessages = state.messages.slice(-20)

        if (state.messages.length > 15 && !state.historySummary) {
          const oldMessages = state.messages.slice(0, -10)
          const summaryText = oldMessages
            .map((m) => `[${m.role}]: ${m.content.slice(0, 200)}`)
            .join('\n')

          try {
            historySummary = await chat([{
              role: 'user',
              content: `请用200字以内概括以下仙侠游戏的对话历史，保留关键剧情、角色互动和数值变化：\n\n${summaryText}`,
            }])
            set((s) => { s.historySummary = historySummary })
            recentMessages = state.messages.slice(-10)
          } catch {
            // 压缩失败，继续
          }
        }

        const systemPrompt = buildSystemPrompt(get(), char)
        const apiMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...(historySummary ? [{ role: 'system' as const, content: `[历史摘要] ${historySummary}` }] : []),
          ...recentMessages.map((m) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
          })),
          { role: 'user' as const, content: text },
        ]

        let fullContent = ''

        await streamChat(
          apiMessages,
          (chunk) => {
            fullContent += chunk
            set((s) => { s.streamingContent = fullContent })
          },
          () => {}
        )

        if (!fullContent) {
          const fallbacks = char
            ? [
                `【${char.name}】（看了看你，微微挑眉）"嗯？"`,
                `【${char.name}】（负手而立）"风起了。"`,
                `【${char.name}】（目光深远）"你的灵气...有些不稳。"`,
              ]
            : [
                '山风穿过洞口，带来一阵草木的清香。空气中弥漫着你自己的药香。',
                '远处传来鸟鸣声，落霞山脉的天空被晚霞染成了金红色。',
                '洞顶的裂缝透进一缕月光，你感到体内的灵气微微波动。',
              ]
          fullContent = fallbacks[Math.floor(Math.random() * fallbacks.length)]
        }

        /* 解析数值变化 */
        const changes = parseStatChanges(fullContent, get().characters)
        set((s) => {
          for (const c of changes) {
            const stats = s.characterStats[c.charId]
            if (stats) {
              stats[c.stat] = Math.max(0, Math.min(100, (stats[c.stat] ?? 0) + c.delta))
            }
          }
        })

        set((s) => {
          s.messages.push({
            id: makeId(),
            role: 'assistant',
            content: fullContent,
            character: state.currentCharacter ?? undefined,
            timestamp: Date.now(),
          })
          s.isTyping = false
          s.streamingContent = ''
        })

        /* 检查场景解锁 */
        const currentState = get()
        for (const [sceneId, scene] of Object.entries(SCENES)) {
          if (
            !currentState.unlockedScenes.includes(sceneId) &&
            isSceneUnlockable(scene, currentState.triggeredEvents, currentState.characterStats)
          ) {
            get().unlockScene(sceneId)
          }
        }

        /* 自动存档 */
        get().saveGame()
      } catch {
        set((s) => {
          s.messages.push({
            id: makeId(),
            role: 'assistant',
            content: char
              ? `【${char.name}】（似乎感知到了什么）"...风向变了。"`
              : '一阵灵气波动掠过，山洞中的青苔微微发光。',
            character: state.currentCharacter ?? undefined,
            timestamp: Date.now(),
          })
          s.isTyping = false
          s.streamingContent = ''
        })
      }
    },

    advanceTime: () => {
      set((s) => {
        s.currentPeriodIndex++
        if (s.currentPeriodIndex >= PERIODS.length) {
          s.currentPeriodIndex = 0
          s.currentDay++
          s.actionPoints = MAX_ACTION_POINTS

          /* 朔月倒计时 */
          s.newMoonCountdown = Math.max(0, s.newMoonCountdown - 1)
          s.isNewMoonNight = s.newMoonCountdown === 0

          /* 丹辰子觊觎度自动增长（从 statMetas.autoIncrement 读取） */
          for (const [charId, char] of Object.entries(s.characters)) {
            for (const meta of char.statMetas) {
              if (meta.autoIncrement) {
                const stats = s.characterStats[charId]
                if (stats) {
                  stats[meta.key] = Math.min(100, (stats[meta.key] ?? 0) + meta.autoIncrement)
                }
              }
            }
          }
        }

        /* 章节推进 */
        const newChapter = getCurrentChapter(s.currentDay)
        if (newChapter.id !== s.currentChapter) {
          s.currentChapter = newChapter.id
        }
      })

      const state = get()
      const period = PERIODS[state.currentPeriodIndex]
      trackTimeAdvance(state.currentDay, period.name)

      /* 章节推进消息 */
      const chapter = getCurrentChapter(state.currentDay)
      if (chapter.id !== get().currentChapter) {
        trackChapterEnter(chapter.id)
      }

      get().addSystemMessage(`时间来到了第 ${state.currentDay} 天 · ${period.name}${state.newMoonCountdown <= 3 ? ` 🌑 朔月倒计时: ${state.newMoonCountdown}天` : ''}`)

      /* 朔月之夜 */
      if (state.isNewMoonNight && state.currentPeriodIndex === 5) {
        trackNewMoonTrigger()
        get().addSystemMessage('🌑 朔月之夜降临！月亮不会升起。你感到体内灵气剧烈波动...')
      }

      /* 检查强制事件 */
      const events = getDayEvents(state.currentDay, state.triggeredEvents)
      for (const event of events) {
        if (event.triggerPeriod === undefined || event.triggerPeriod === state.currentPeriodIndex) {
          set((s) => { s.triggeredEvents.push(event.id) })
          get().addSystemMessage(`🎬 【${event.name}】${event.description}`)
        }
      }

      /* 检查场景解锁 */
      const currentState = get()
      for (const [sceneId, scene] of Object.entries(SCENES)) {
        if (
          !currentState.unlockedScenes.includes(sceneId) &&
          isSceneUnlockable(scene, currentState.triggeredEvents, currentState.characterStats)
        ) {
          get().unlockScene(sceneId)
        }
      }

      /* 结局检查 — BE: 觊觎度100 */
      const dcStats = currentState.characterStats['danchenzi']
      if (dcStats && (dcStats['coveting'] ?? 0) >= 100) {
        set((s) => { s.endingType = 'be-alchemy' })
        return
      }

      /* 结局检查 — 最终日 */
      if (state.currentDay >= MAX_DAYS && state.currentPeriodIndex === PERIODS.length - 1) {
        get().checkEnding()
      }
    },

    useItem: (itemId: string) => {
      const state = get()
      const item = ITEMS[itemId]
      if (!item) return

      const count = state.inventory[itemId] ?? 0
      if (count <= 0) {
        get().addSystemMessage(`你没有 ${item.name} 了。`)
        return
      }

      /* 消耗道具 */
      if (item.type === 'consumable') {
        set((s) => { s.inventory[itemId] = Math.max(0, (s.inventory[itemId] ?? 0) - 1) })
      }

      /* 隐匿符效果 */
      if (itemId === 'concealment-talisman') {
        set((s) => {
          const dcStats = s.characterStats['danchenzi']
          if (dcStats) {
            dcStats['coveting'] = Math.max(0, (dcStats['coveting'] ?? 0) - 10)
          }
        })
        get().addSystemMessage('📜 你点燃隐匿符，符纸化作一道青烟笼罩全身。本体气息暂时被掩盖，丹辰子的追踪中断。【丹辰子 觊觎-10】')
      } else if (itemId === 'elder-diary') {
        get().addSystemMessage('📖 你翻开灵草前辈的日记，前辈的字迹映入眼帘——"化形池...并非你所想的那样..."')
      }
    },

    checkEnding: () => {
      const state = get()
      const yqStats = state.characterStats['yeqingshuang']
      const clStats = state.characterStats['chili']
      const dcStats = state.characterStats['danchenzi']

      /* BE: 丹炉中的永生 — 觊觎度 100 */
      if (dcStats && (dcStats['coveting'] ?? 0) >= 100) {
        set((s) => { s.endingType = 'be-alchemy' })
        return
      }

      /* BE: 猎物的末路 — 朔月暴露无庇护 */
      if (state.isNewMoonNight && !state.triggeredEvents.includes('new-moon-night')) {
        const maxAff = Math.max(
          yqStats?.['affection'] ?? 0,
          clStats?.['affection'] ?? 0
        )
        if (maxAff < 30) {
          set((s) => { s.endingType = 'be-prey' })
          return
        }
      }

      /* TE: 真正的人 */
      if (
        yqStats &&
        (yqStats['affection'] ?? 0) >= 80 &&
        (yqStats['trust'] ?? 0) >= 60 &&
        state.poolFragments >= 3 &&
        state.triggeredEvents.includes('yeqingshuang-truth')
      ) {
        set((s) => { s.endingType = 'te-true-person' })
        return
      }

      /* HE: 妖界之花 */
      if (
        clStats &&
        (clStats['affection'] ?? 0) >= 80 &&
        (clStats['assimilation'] ?? 0) >= 60
      ) {
        set((s) => { s.endingType = 'he-demon-flower' })
        return
      }

      /* NE: 半人半草 */
      set((s) => { s.endingType = 'ne-half' })
    },

    addSystemMessage: (content: string) => {
      set((s) => {
        s.messages.push({ id: makeId(), role: 'system', content, timestamp: Date.now() })
      })
    },

    resetGame: () => {
      set((s) => {
        s.gameStarted = false
        s.messages = []
        s.historySummary = ''
        s.streamingContent = ''
        s.endingType = null
      })
      get().clearSave()
    },

    // --- 存档系统 ---
    saveGame: () => {
      const s = get()
      const data = {
        version: 1,
        playerGender: s.playerGender,
        playerName: s.playerName,
        characters: s.characters,
        currentDay: s.currentDay,
        currentPeriodIndex: s.currentPeriodIndex,
        actionPoints: s.actionPoints,
        currentScene: s.currentScene,
        currentCharacter: s.currentCharacter,
        characterStats: s.characterStats,
        currentChapter: s.currentChapter,
        triggeredEvents: s.triggeredEvents,
        unlockedScenes: s.unlockedScenes,
        poolFragments: s.poolFragments,
        newMoonCountdown: s.newMoonCountdown,
        isNewMoonNight: s.isNewMoonNight,
        inventory: s.inventory,
        messages: s.messages.slice(-30),
        historySummary: s.historySummary,
        endingType: s.endingType,
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    },

    loadGame: () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY)
        if (!raw) return false
        const data = JSON.parse(raw)
        if (data.version !== 1) return false

        set((s) => {
          s.gameStarted = true
          s.playerGender = data.playerGender || 'male'
          s.playerName = data.playerName || '灵芝'
          s.characters = data.characters || buildCharacters(data.playerGender || 'male')
          s.currentDay = data.currentDay
          s.currentPeriodIndex = data.currentPeriodIndex
          s.actionPoints = data.actionPoints
          s.currentScene = data.currentScene
          s.currentCharacter = data.currentCharacter
          s.characterStats = data.characterStats
          s.currentChapter = data.currentChapter || 1
          s.triggeredEvents = data.triggeredEvents || []
          s.unlockedScenes = data.unlockedScenes || ['cave', 'outskirts']
          s.poolFragments = data.poolFragments || 0
          s.newMoonCountdown = data.newMoonCountdown ?? 15
          s.isNewMoonNight = data.isNewMoonNight || false
          s.inventory = data.inventory
          s.messages = data.messages
          s.historySummary = data.historySummary || ''
          s.endingType = data.endingType || null
        })
        trackGameContinue()
        return true
      } catch {
        return false
      }
    },

    hasSave: () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY)
        if (!raw) return false
        return JSON.parse(raw).version === 1
      } catch {
        return false
      }
    },

    clearSave: () => {
      localStorage.removeItem(SAVE_KEY)
    },
  }))
)

// 导出 data.ts 的所有内容
export {
  SCENES, ITEMS, PERIODS, CHAPTERS,
  MAX_DAYS, MAX_ACTION_POINTS, STORY_INFO,
  FORCED_EVENTS, ENDINGS,
  buildCharacters, getStatLevel,
  getAvailableCharacters, getCurrentChapter, isSceneUnlockable,
} from '@/lib/data'

export type { Character, CharacterStats, Scene, GameItem, Chapter, ForcedEvent, Ending, TimePeriod, Message, StatMeta } from '@/lib/data'

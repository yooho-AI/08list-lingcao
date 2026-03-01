/**
 * [INPUT]: 依赖 script.md(?raw), stream.ts, data.ts, parser.ts, analytics.ts
 * [OUTPUT]: 对外提供 useGameStore + re-export data.ts + parser.ts
 * [POS]: 状态中枢：Zustand+Immer，剧本直通+富消息+异构双轨解析+朔月+存档
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import GAME_SCRIPT from './script.md?raw'
import { streamChat, chat } from './stream'
import {
  type Character,
  type CharacterStats,
  type Message,
  type StoryRecord,
  SCENES, ITEMS, PERIODS,
  MAX_DAYS, MAX_ACTION_POINTS,
  STORY_INFO,
  buildCharacters, getStatLevel,
  getAvailableCharacters, getCurrentChapter,
  getDayEvents, isSceneUnlockable,
} from './data'
import { parseStoryParagraph, extractChoices } from './parser'
import {
  trackGameStart, trackGameContinue, trackTimeAdvance,
  trackChapterEnter, trackPlayerCreate, trackSceneUnlock,
  trackNewMoonTrigger,
} from './analytics'

// ── Re-export data.ts + parser.ts ────────────────────
export {
  type Character, type CharacterStats, type Message, type StoryRecord,
  type Scene, type GameItem, type Chapter, type ForcedEvent, type Ending,
  type TimePeriod, type StatMeta,
  SCENES, ITEMS, PERIODS, CHAPTERS,
  MAX_DAYS, MAX_ACTION_POINTS, STORY_INFO,
  FORCED_EVENTS, ENDINGS, ENDING_TYPE_MAP,
  buildCharacters, getStatLevel,
  getAvailableCharacters, getCurrentChapter, isSceneUnlockable,
} from './data'
export { parseStoryParagraph, extractChoices } from './parser'

// ── Helpers ──────────────────────────────────────────

let messageCounter = 0
const makeId = () => `msg-${Date.now()}-${++messageCounter}`
const SAVE_KEY = 'lingcao-save-v1'
const HISTORY_COMPRESS_THRESHOLD = 15

function buildInitialStats(characters: Record<string, Character>): Record<string, CharacterStats> {
  return Object.fromEntries(
    Object.entries(characters).map(([id, char]) => [id, { ...char.initialStats }])
  )
}

// ── State / Actions ──────────────────────────────────

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

  activeTab: 'dialogue' | 'scene' | 'character'
  choices: string[]

  showDashboard: boolean
  showRecords: boolean
  storyRecords: StoryRecord[]
}

interface GameActions {
  setPlayerInfo: (gender: 'male' | 'female', name: string) => void
  initGame: () => void
  selectCharacter: (id: string | null) => void
  selectScene: (id: string) => void
  unlockScene: (sceneId: string) => void
  setActiveTab: (tab: 'dialogue' | 'scene' | 'character') => void
  toggleDashboard: () => void
  toggleRecords: () => void
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

// ── Dual-track parseStatChanges ──────────────────────

function parseStatChanges(
  content: string,
  characters: Record<string, Character>
): Array<{ charId: string; stat: string; delta: number }> {
  const changes: Array<{ charId: string; stat: string; delta: number }> = []

  const nameToId: Record<string, string> = {}
  for (const [id, char] of Object.entries(characters)) {
    nameToId[char.name] = id
  }

  const labelToKey: Record<string, { charId: string; key: string }> = {}
  for (const [id, char] of Object.entries(characters)) {
    for (const meta of char.statMetas) {
      labelToKey[meta.label] = { charId: id, key: meta.key }
      labelToKey[`${meta.label}度`] = { charId: id, key: meta.key }
      labelToKey[`${meta.label}值`] = { charId: id, key: meta.key }
    }
  }

  const regex = /[【\[]([^\]】]+)[】\]]\s*(\S+?)([+-])(\d+)/g
  let match
  while ((match = regex.exec(content)) !== null) {
    const charId = nameToId[match[1]]
    const label = match[2]
    if (charId) {
      const char = characters[charId]
      const meta = char?.statMetas.find(
        (m) => label === m.label || label === `${m.label}度` || label === `${m.label}值`
      )
      if (meta) {
        const delta = parseInt(match[4]) * (match[3] === '+' ? 1 : -1)
        changes.push({ charId, stat: meta.key, delta })
      }
    } else {
      const info = labelToKey[label]
      if (info) {
        const delta = parseInt(match[4]) * (match[3] === '+' ? 1 : -1)
        changes.push({ charId: info.charId, stat: info.key, delta })
      }
    }
  }
  return changes
}

// ── buildSystemPrompt — Script-through ───────────────

function buildSystemPrompt(state: GameState, char: Character | null): string {
  const period = PERIODS[state.currentPeriodIndex]
  const scene = SCENES[state.currentScene]
  const chapter = getCurrentChapter(state.currentDay)
  const availableChars = getAvailableCharacters(state.currentDay, state.characters)

  const allStats = Object.entries(availableChars)
    .map(([id, c]) => {
      const s = state.characterStats[id]
      const statStr = c.statMetas
        .map((m) => `${m.label}${s?.[m.key] ?? 0}`)
        .join(' ')
      return `${c.name}(${c.gender === 'female' ? '女' : '男'}): ${statStr}`
    })
    .join('\n')

  const genderLabel = state.playerGender === 'male' ? '少年' : '少女'
  const genderCall = state.playerGender === 'male'
    ? '（NPC称呼: 公子/小兄弟/道友/小友）'
    : '（NPC称呼: 姑娘/妹妹/仙子/小姑娘）'

  let prompt = `你是《${STORY_INFO.title}》的AI叙述者。

## 游戏剧本
${GAME_SCRIPT}

## 当前状态
玩家「${state.playerName}」是一株千年九叶灵芝，化形为${genderLabel}。${genderCall}
第${state.currentDay}/${MAX_DAYS}天 · ${period?.name || '清晨'}
第${chapter.id}章「${chapter.name}」(Day ${chapter.dayRange[0]}-${chapter.dayRange[1]})
当前场景：${scene?.icon} ${scene?.name} — ${scene?.description}
行动力：${state.actionPoints}/${MAX_ACTION_POINTS}
朔月倒计时：${state.newMoonCountdown}天
已解锁场景：${state.unlockedScenes.join('、')}
化形池线索碎片：${state.poolFragments}/3
${state.isNewMoonNight ? '⚠️ 当前是朔月之夜！玩家已恢复九叶灵芝本体！' : ''}`

  if (char) {
    const stats = state.characterStats[char.id]
    const statStr = char.statMetas
      .map((m) => `${m.label}${stats?.[m.key] ?? 0}`)
      .join(' ')
    const level = getStatLevel(stats?.[char.statMetas[0]?.key] ?? 0)
    prompt += `\n\n## 当前互动角色
${char.name}（${char.title}，${char.age}岁）
当前关系：${level.name}（${statStr}）`
  }

  prompt += `\n\n## 所有角色当前数值
${allStats}

## 背包
${Object.entries(state.inventory).filter(([, v]) => v > 0).map(([k, v]) => {
  const item = ITEMS[k]
  return item ? `${item.icon} ${item.name} x${v}` : ''
}).filter(Boolean).join('、') || '空'}

## 已触发事件
${state.triggeredEvents.join('、') || '无'}

## 历史摘要
${state.historySummary || '旅程刚刚开始'}`

  return prompt
}

// ── Store ────────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    // ── Initial state ──
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

    choices: [],
    activeTab: 'dialogue' as 'dialogue' | 'scene' | 'character',
    showDashboard: false,
    showRecords: false,
    storyRecords: [],

    // ── Actions ──

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
        s.streamingContent = ''
        s.activeTab = 'dialogue'
        s.showDashboard = false
        s.showRecords = false
        s.storyRecords = []

        // Welcome message
        s.messages.push({
          id: makeId(),
          role: 'system',
          content: `天元历三千七百年，一株千年九叶灵芝终于化形成人。\n\n你睁开眼睛，第一次以人类的视角打量这个世界。空气中弥漫着自己身上的药香，洞顶的裂缝透进一缕微弱的光线。\n\n你叫「${s.playerName}」，从今天起，你要学会在修仙界生存。`,
          timestamp: Date.now(),
        })

        // Opening storyRecord
        s.storyRecords.push({
          id: `sr-${Date.now()}`,
          day: 1,
          period: '清晨',
          title: '九叶灵芝化形',
          content: `${s.playerName}在隐秘山洞中化形成人，修仙之旅开始。`,
        })

        // Initial choices
        s.choices = ['探索山洞深处', '走出洞口看看外面', '端详自己的人形身体', '闭目感受体内灵气']
      })
      trackGameStart()
    },

    selectCharacter: (id) => {
      set((s) => {
        s.currentCharacter = id
        s.activeTab = 'dialogue'
      })
    },

    selectScene: (id) => {
      const state = get()
      if (!state.unlockedScenes.includes(id)) return
      if (state.currentScene === id) return

      trackSceneUnlock(id)

      set((s) => {
        s.currentScene = id
        s.activeTab = 'dialogue'

        s.messages.push({
          id: makeId(),
          role: 'system',
          content: `你来到了${SCENES[id].name}。${SCENES[id].atmosphere}`,
          timestamp: Date.now(),
          type: 'scene-transition',
          sceneId: id,
        })
      })
    },

    unlockScene: (sceneId) => {
      set((s) => {
        if (!s.unlockedScenes.includes(sceneId)) {
          s.unlockedScenes.push(sceneId)
        }
      })
      const scene = SCENES[sceneId]
      if (scene) {
        get().addSystemMessage(`新场景解锁：${scene.icon} ${scene.name}`)
        trackSceneUnlock(sceneId)
      }
    },

    setActiveTab: (tab) => {
      set((s) => {
        s.activeTab = tab
        s.showDashboard = false
        s.showRecords = false
      })
    },

    toggleDashboard: () => {
      set((s) => {
        s.showDashboard = !s.showDashboard
        if (s.showDashboard) s.showRecords = false
      })
    },

    toggleRecords: () => {
      set((s) => {
        s.showRecords = !s.showRecords
        if (s.showRecords) s.showDashboard = false
      })
    },

    sendMessage: async (text: string) => {
      const state = get()
      if (state.isTyping || state.endingType) return

      const char = state.currentCharacter ? state.characters[state.currentCharacter] : null

      set((s) => {
        s.messages.push({ id: makeId(), role: 'user', content: text, timestamp: Date.now() })
        s.isTyping = true
        s.streamingContent = ''
      })

      try {
        // Compress history if needed
        const currentState = get()
        if (currentState.messages.length > HISTORY_COMPRESS_THRESHOLD && !currentState.historySummary) {
          const oldMessages = currentState.messages.slice(0, -10)
          const summaryText = oldMessages
            .filter((m) => !m.type)
            .map((m) => `[${m.role}]: ${m.content.slice(0, 200)}`)
            .join('\n')

          try {
            const historySummary = await chat([{
              role: 'user',
              content: `请用200字以内概括以下仙侠游戏的对话历史，保留关键剧情、角色互动和数值变化：\n\n${summaryText}`,
            }])
            set((s) => { s.historySummary = historySummary })
          } catch {
            // compression failed, continue
          }
        }

        const promptState = get()
        const systemPrompt = buildSystemPrompt(promptState, char)
        const recentMessages = promptState.messages
          .filter((m) => !m.type)
          .slice(-10)
          .map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content }))

        const apiMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...(promptState.historySummary ? [{ role: 'system' as const, content: `[历史摘要] ${promptState.historySummary}` }] : []),
          ...recentMessages,
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

        // Parse stat changes
        const afterState = get()
        const changes = parseStatChanges(fullContent, afterState.characters)

        // Detect character for NPC bubble
        const { charColor } = parseStoryParagraph(fullContent)
        let detectedChar: string | null = null
        if (charColor) {
          for (const [id, c] of Object.entries(afterState.characters)) {
            if (c.themeColor === charColor) {
              detectedChar = id
              break
            }
          }
        }

        // Extract choices from AI response
        const { cleanContent, choices: parsedChoices } = extractChoices(fullContent)

        // Fallback: generate context-aware choices if AI didn't return enough
        const finalChoices = parsedChoices.length >= 2 ? parsedChoices : (() => {
          const cs = get()
          const c = cs.currentCharacter ? cs.characters[cs.currentCharacter] : null
          if (c) {
            return [
              `继续和${c.name}交谈`,
              `试探${c.name}的真实目的`,
              `向${c.name}寻求帮助`,
              '换个话题',
            ]
          }
          const sc = SCENES[cs.currentScene]
          return [
            `探索${sc?.name || '周围'}`,
            '寻找化形池线索',
            '查看周围环境',
            '使用隐匿符掩盖气息',
          ]
        })()

        set((s) => {
          // Apply stat changes
          for (const c of changes) {
            const stats = s.characterStats[c.charId]
            if (stats) {
              stats[c.stat] = Math.max(0, Math.min(100, (stats[c.stat] ?? 0) + c.delta))
            }
          }

          // Push assistant message
          s.messages.push({
            id: makeId(),
            role: 'assistant',
            content: cleanContent,
            character: detectedChar || state.currentCharacter || undefined,
            timestamp: Date.now(),
          })

          s.choices = finalChoices.slice(0, 4)

          // Record
          const period = PERIODS[s.currentPeriodIndex] || PERIODS[0]
          s.storyRecords.push({
            id: `sr-${Date.now()}`,
            day: s.currentDay,
            period: period.name,
            title: text.slice(0, 20) + (text.length > 20 ? '...' : ''),
            content: cleanContent.slice(0, 100) + '...',
          })

          s.isTyping = false
          s.streamingContent = ''
        })

        // Check scene unlocks
        const latestState = get()
        for (const [sceneId, scene] of Object.entries(SCENES)) {
          if (
            !latestState.unlockedScenes.includes(sceneId) &&
            isSceneUnlockable(scene, latestState.triggeredEvents, latestState.characterStats)
          ) {
            get().unlockScene(sceneId)
          }
        }

        // Auto-save
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

          // 朔月倒计时
          s.newMoonCountdown = Math.max(0, s.newMoonCountdown - 1)
          s.isNewMoonNight = s.newMoonCountdown === 0

          // 丹辰子觊觎度自动增长（从 statMetas.autoIncrement 读取）
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

          // Period-change rich message
          const chapter = getCurrentChapter(s.currentDay)
          const period = PERIODS[0]
          s.messages.push({
            id: makeId(),
            role: 'system',
            content: `第${s.currentDay}天 · ${period.name}`,
            timestamp: Date.now(),
            type: 'period-change',
            periodInfo: { day: s.currentDay, period: period.name, chapter: chapter.name },
          })

          // Record
          s.storyRecords.push({
            id: `sr-${Date.now()}`,
            day: s.currentDay,
            period: period.name,
            title: `进入第${s.currentDay}天`,
            content: `${chapter.name} · ${period.name}${s.newMoonCountdown <= 3 ? ` · 朔月倒计时${s.newMoonCountdown}天` : ''}`,
          })

          trackTimeAdvance(s.currentDay, period.name)
        } else {
          const period = PERIODS[s.currentPeriodIndex]
          trackTimeAdvance(s.currentDay, period.name)

          // Intra-day period change message
          s.messages.push({
            id: makeId(),
            role: 'system',
            content: `第${s.currentDay}天 · ${period.name}`,
            timestamp: Date.now(),
            type: 'period-change',
            periodInfo: { day: s.currentDay, period: period.name, chapter: getCurrentChapter(s.currentDay).name },
          })
        }

        // 章节推进
        const newChapter = getCurrentChapter(s.currentDay)
        if (newChapter.id !== s.currentChapter) {
          s.currentChapter = newChapter.id
          trackChapterEnter(newChapter.id)

          s.messages.push({
            id: makeId(),
            role: 'system',
            content: `— 第${newChapter.id}章「${newChapter.name}」—\n${newChapter.description}`,
            timestamp: Date.now(),
          })
        }
      })

      const state = get()

      // 朔月之夜
      if (state.isNewMoonNight && state.currentPeriodIndex === 5) {
        trackNewMoonTrigger()
        get().addSystemMessage('朔月之夜降临！月亮不会升起。你感到体内灵气剧烈波动...')
      }

      // 检查强制事件
      const events = getDayEvents(state.currentDay, state.triggeredEvents)
      for (const event of events) {
        if (event.triggerPeriod === undefined || event.triggerPeriod === state.currentPeriodIndex) {
          set((s) => { s.triggeredEvents.push(event.id) })
          get().addSystemMessage(`【${event.name}】${event.description}`)

          set((s) => {
            s.storyRecords.push({
              id: `sr-${Date.now()}-evt`,
              day: state.currentDay,
              period: PERIODS[state.currentPeriodIndex]?.name || '',
              title: event.name,
              content: event.description,
            })
          })
        }
      }

      // 检查场景解锁
      const currentState = get()
      for (const [sceneId, scene] of Object.entries(SCENES)) {
        if (
          !currentState.unlockedScenes.includes(sceneId) &&
          isSceneUnlockable(scene, currentState.triggeredEvents, currentState.characterStats)
        ) {
          get().unlockScene(sceneId)
        }
      }

      // 结局检查 — BE: 觊觎度100
      const dcStats = currentState.characterStats['danchenzi']
      if (dcStats && (dcStats['coveting'] ?? 0) >= 100) {
        set((s) => { s.endingType = 'be-alchemy' })
        return
      }

      // 结局检查 — 最终日
      if (state.currentDay >= MAX_DAYS && state.currentPeriodIndex === PERIODS.length - 1) {
        get().checkEnding()
      }

      // Auto-save
      get().saveGame()
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

      if (item.type === 'consumable') {
        set((s) => { s.inventory[itemId] = Math.max(0, (s.inventory[itemId] ?? 0) - 1) })
      }

      if (itemId === 'concealment-talisman') {
        set((s) => {
          const dcStats = s.characterStats['danchenzi']
          if (dcStats) {
            dcStats['coveting'] = Math.max(0, (dcStats['coveting'] ?? 0) - 10)
          }
        })
        get().addSystemMessage('你点燃隐匿符，符纸化作一道青烟笼罩全身。本体气息暂时被掩盖。【丹辰子 觊觎-10】')
      } else if (itemId === 'elder-diary') {
        get().addSystemMessage('你翻开灵草前辈的日记，前辈的字迹映入眼帘——"化形池...并非你所想的那样..."')
      }
    },

    checkEnding: () => {
      const state = get()
      const yqStats = state.characterStats['yeqingshuang']
      const clStats = state.characterStats['chili']
      const dcStats = state.characterStats['danchenzi']

      // BE: 丹炉中的永生
      if (dcStats && (dcStats['coveting'] ?? 0) >= 100) {
        set((s) => { s.endingType = 'be-alchemy' })
        return
      }

      // BE: 猎物的末路
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

      // TE: 真正的人
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

      // HE: 妖界之花
      if (
        clStats &&
        (clStats['affection'] ?? 0) >= 80 &&
        (clStats['assimilation'] ?? 0) >= 60
      ) {
        set((s) => { s.endingType = 'he-demon-flower' })
        return
      }

      // NE: 半人半草
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
        s.choices = []
        s.activeTab = 'dialogue'
        s.showDashboard = false
        s.showRecords = false
        s.storyRecords = []
      })
      get().clearSave()
    },

    // ── Save system ──

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
        activeTab: s.activeTab,
        choices: s.choices,
        storyRecords: s.storyRecords.slice(-50),
      }
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data))
      } catch { /* silent */ }
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
          s.activeTab = data.activeTab || 'dialogue'
          s.choices = data.choices || []
          s.storyRecords = data.storyRecords || []
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
      try {
        localStorage.removeItem(SAVE_KEY)
      } catch { /* silent */ }
    },
  }))
)

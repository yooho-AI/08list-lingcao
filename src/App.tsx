/**
 * [INPUT]: 依赖 store.ts, bgm.ts, framer-motion, Phosphor Icons
 * [OUTPUT]: 对外提供 App 根组件
 * [POS]: 灵草修仙录项目入口 — StartScreen + AppShell + EndingModal
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, ENDINGS, ENDING_TYPE_MAP } from '@/lib/store'
import { useBgm } from '@/lib/bgm'
import AppShell from '@/components/game/app-shell'
import '@/styles/globals.css'
import '@/styles/opening.css'
import '@/styles/rich-cards.css'

// ── NPC 预览数据（开始画面用，与 store 解耦） ──────────

const NPC_PREVIEW = [
  { id: 'danchenzi', name: '丹辰子', color: '#b45309', portrait: '/characters/danchenzi.jpg' },
  { id: 'yeqingshuang', name: '叶青霜', color: '#0ea5e9', portrait: '/characters/yeqingshuang-f.jpg' },
  { id: 'chili', name: '赤璃', color: '#ef4444', portrait: '/characters/chili.jpg' },
] as const

// ============================================================
// StartScreen — 仙侠暗色主题
// ============================================================

function StartScreen() {
  const setPlayerInfo = useGameStore((s) => s.setPlayerInfo)
  const initGame = useGameStore((s) => s.initGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const hasSave = useGameStore((s) => s.hasSave)
  const { toggle, isPlaying } = useBgm()

  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [name, setName] = useState('灵芝')

  const handleStart = () => {
    setPlayerInfo(gender, name || '灵芝')
    initGame()
  }

  return (
    <div className="lc-start">
      {/* 灵气粒子 */}
      <div className="lc-start-particles">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="lc-start-spark"
            style={{
              left: `${10 + Math.random() * 80}%`,
              bottom: `${Math.random() * 40}%`,
              width: `${6 + Math.random() * 8}px`,
              height: `${6 + Math.random() * 8}px`,
              animationDuration: `${3 + Math.random() * 4}s`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="lc-start-card"
      >
        {/* 标题 */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="lc-start-icon"
        >
          🌿
        </motion.div>
        <h1 className="lc-start-title">灵草修仙录</h1>
        <p className="lc-start-subtitle">Spirit Herb Chronicle</p>
        <p className="lc-start-desc">
          天元历三千七百年，一株千年九叶灵芝化形成人...
        </p>

        {/* 性别选择 */}
        <div className="lc-start-gender">
          {(['male', 'female'] as const).map((g) => (
            <button
              key={g}
              className={`lc-start-gender-btn ${gender === g ? 'active' : ''}`}
              onClick={() => setGender(g)}
            >
              {g === 'male' ? '男' : '女'}
            </button>
          ))}
        </div>

        {/* 灵名输入 */}
        <div className="lc-start-name">
          <input
            className="lc-start-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="你的灵名..."
            maxLength={8}
          />
        </div>

        {/* NPC 预览 */}
        <div className="lc-start-npcs">
          {NPC_PREVIEW.map((npc, i) => (
            <motion.div
              key={npc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.12 }}
              className="lc-start-npc"
            >
              <div
                className="lc-start-npc-avatar"
                style={{ border: `2px solid ${npc.color}`, background: `${npc.color}18` }}
              >
                <img
                  src={npc.portrait}
                  alt={npc.name}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.parentElement!.textContent = npc.name[0]
                  }}
                />
              </div>
              <div className="lc-start-npc-name">{npc.name}</div>
            </motion.div>
          ))}
        </div>

        {/* 按钮组 */}
        <div className="lc-start-actions">
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="lc-start-btn-primary"
            onClick={handleStart}
          >
            踏入修仙界
          </motion.button>

          {hasSave() && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="lc-start-btn-secondary"
              onClick={() => loadGame()}
            >
              继续游戏
            </motion.button>
          )}
        </div>

        {/* 音乐 */}
        <button className="lc-start-music" onClick={(e) => toggle(e)}>
          {isPlaying ? '🔊 音乐开' : '🔇 音乐关'}
        </button>
      </motion.div>
    </div>
  )
}

// ============================================================
// EndingModal — 数据驱动，双按钮
// ============================================================

function EndingModal() {
  const endingType = useGameStore((s) => s.endingType)
  const resetGame = useGameStore((s) => s.resetGame)

  const ending = ENDINGS.find((e) => e.id === endingType)
  if (!ending) return null

  const meta = ENDING_TYPE_MAP[ending.type] ?? ENDING_TYPE_MAP.NE

  return (
    <div className="lc-ending-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="lc-ending-modal"
        style={{ position: 'relative', overflow: 'hidden' }}
      >
        <div className="lc-ending-gradient" style={{ background: meta.gradient }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="lc-ending-icon">{meta.icon}</div>
          <div className="lc-ending-type" style={{ color: meta.color }}>{meta.label}</div>
          <h2 className="lc-ending-name">{ending.name}</h2>
          <p className="lc-ending-desc">{ending.description}</p>

          <div className="lc-ending-actions">
            <button className="lc-ending-btn-primary" onClick={() => resetGame()}>
              返回标题
            </button>
            <button className="lc-ending-btn-secondary" onClick={() => {
              useGameStore.setState({ endingType: null })
            }}>
              继续探索
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================================
// App 根组件
// ============================================================

export default function App() {
  const gameStarted = useGameStore((s) => s.gameStarted)
  const endingType = useGameStore((s) => s.endingType)

  return (
    <AnimatePresence mode="wait">
      {gameStarted ? (
        <motion.div
          key="game"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ height: '100dvh' }}
        >
          <AppShell />
          {endingType && <EndingModal />}
        </motion.div>
      ) : (
        <motion.div key="start" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <StartScreen />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

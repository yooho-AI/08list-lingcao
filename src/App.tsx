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
import { trackGameStart, trackGameContinue, trackPlayerCreate } from '@/lib/analytics'
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

// ── 初醒叙述文本 ──────────

const AWAKEN_LINES: Array<{ text: string; accent?: boolean; warn?: boolean }> = [
  { text: '……光。' },
  { text: '微弱的光，从头顶裂缝洒落。' },
  { text: '你感到了"重量"——一种从未有过的重量。' },
  { text: '你低头。看到了手指。十根手指。' },
  { text: '千年修行，一朝化形。', accent: true },
  { text: '但这个世界，对灵草成精者从不仁慈。', warn: true },
]

type OpeningPhase = 'seed' | 'awaken' | 'create'

// ============================================================
// StartScreen — 三幕开场：凝灵 → 初醒 → 灵名
// ============================================================

function StartScreen() {
  const setPlayerInfo = useGameStore((s) => s.setPlayerInfo)
  const initGame = useGameStore((s) => s.initGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const hasSave = useGameStore((s) => s.hasSave)
  const { toggle, isPlaying } = useBgm()

  const [phase, setPhase] = useState<OpeningPhase>('seed')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [name, setName] = useState('灵芝')

  const handleStart = () => {
    trackGameStart()
    trackPlayerCreate(gender, name || '灵芝')
    setPlayerInfo(gender, name || '灵芝')
    initGame()
  }

  const handleContinue = () => {
    trackGameContinue()
    loadGame()
  }

  return (
    <div className="lc-start">
      <AnimatePresence mode="wait">

        {/* ── Phase 1: 凝灵 —— 九叶灵芝化形前的最后一刻 ── */}
        {phase === 'seed' && (
          <motion.div key="seed" className="lc-seed"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>

            <div className="lc-seed-aurora" />

            <div className="lc-seed-particles">
              {Array.from({ length: 15 }, (_, i) => (
                <div key={i} className="lc-seed-spark" style={{
                  left: `${5 + Math.random() * 90}%`,
                  bottom: `${Math.random() * 50}%`,
                  width: `${4 + Math.random() * 6}px`,
                  height: `${4 + Math.random() * 6}px`,
                  animationDuration: `${4 + Math.random() * 5}s`,
                  animationDelay: `${Math.random() * 4}s`,
                }} />
              ))}
            </div>

            {/* 核心：发光灵种 + 九叶环绕 */}
            <div className="lc-seed-center">
              <div className="lc-seed-core" />
              <div className="lc-seed-ring">
                {Array.from({ length: 9 }, (_, i) => (
                  <div key={i} className="lc-seed-dot" style={{
                    transform: `rotate(${i * 40}deg) translateY(-52px)`,
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
            </div>

            <motion.div className="lc-seed-text"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 1.2 }}>
              <p>天元历三千七百年</p>
              <p className="lc-seed-text-dim">一株千年九叶灵芝</p>
              <p className="lc-seed-text-dim">于山野灵气中凝聚千年</p>
              <p className="lc-seed-text-glow">终于——化形。</p>
            </motion.div>

            <motion.h1 className="lc-seed-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.8 }}>
              灵草修仙录
            </motion.h1>

            <motion.button className="lc-seed-cta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 0.6 }}
              onClick={() => setPhase('awaken')}>
              睁开双眼
            </motion.button>

            {hasSave() && (
              <motion.button className="lc-seed-save"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ delay: 2.5 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleContinue}>
                继续游戏
              </motion.button>
            )}

            <button className={`lc-music-bar ${isPlaying ? '' : 'paused'}`}
              onClick={(e) => toggle(e)}>
              <span /><span /><span /><span />
            </button>
          </motion.div>
        )}

        {/* ── Phase 2: 初醒 —— 第一次以人类视角看世界 ── */}
        {phase === 'awaken' && (
          <motion.div key="awaken" className="lc-awaken"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>

            <div className="lc-awaken-bg" />
            <div className="lc-awaken-vignette" />

            <motion.div className="lc-awaken-lines"
              initial="hidden" animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 1.8 } } }}>
              {AWAKEN_LINES.map((line, i) => (
                <motion.p key={i}
                  className={`lc-awaken-line${line.accent ? ' accent' : ''}${line.warn ? ' warn' : ''}`}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.8 } },
                  }}>
                  {line.text}
                </motion.p>
              ))}
            </motion.div>

            <motion.button className="lc-awaken-skip"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              transition={{ delay: 1 }}
              onClick={() => setPhase('create')}>
              跳过 ›
            </motion.button>

            <motion.button className="lc-awaken-next"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 12, duration: 0.6 }}
              onClick={() => setPhase('create')}>
              继续 →
            </motion.button>
          </motion.div>
        )}

        {/* ── Phase 3: 灵名 —— 身份选择 ── */}
        {phase === 'create' && (
          <motion.div key="create" className="lc-create"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>

            <div className="lc-create-particles">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="lc-create-spark" style={{
                  left: `${10 + Math.random() * 80}%`,
                  bottom: `${Math.random() * 40}%`,
                  width: `${5 + Math.random() * 7}px`,
                  height: `${5 + Math.random() * 7}px`,
                  animationDuration: `${3 + Math.random() * 4}s`,
                  animationDelay: `${Math.random() * 3}s`,
                }} />
              ))}
            </div>

            <motion.button className="lc-create-back"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 0.3 }}
              onClick={() => setPhase('seed')}>
              ‹ 返回
            </motion.button>

            <motion.div className="lc-create-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}>

              <div className="lc-create-label">选择你的身份</div>

              <div className="lc-create-gender">
                {(['male', 'female'] as const).map((g) => (
                  <button key={g}
                    className={`lc-create-gender-btn ${gender === g ? 'active' : ''}`}
                    onClick={() => setGender(g)}>
                    {g === 'male' ? '男' : '女'}
                  </button>
                ))}
              </div>

              <div className="lc-create-name">
                <input className="lc-create-input" type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="你的灵名..."
                  maxLength={8} />
              </div>

              <div className="lc-create-npcs">
                {NPC_PREVIEW.map((npc, i) => (
                  <motion.div key={npc.id} className="lc-create-npc"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.12 }}>
                    <div className="lc-create-npc-avatar"
                      style={{ border: `2px solid ${npc.color}`, background: `${npc.color}18` }}>
                      <img src={npc.portrait} alt={npc.name}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.parentElement!.textContent = npc.name[0]
                        }} />
                    </div>
                    <div className="lc-create-npc-name">{npc.name}</div>
                  </motion.div>
                ))}
              </div>

              <div className="lc-create-actions">
                <motion.button whileTap={{ scale: 0.97 }}
                  className="lc-create-start"
                  onClick={handleStart}>
                  踏入修仙界
                </motion.button>
                {hasSave() && (
                  <motion.button whileTap={{ scale: 0.97 }}
                    className="lc-create-continue"
                    onClick={handleContinue}>
                    继续游戏
                  </motion.button>
                )}
              </div>
            </motion.div>

            <button className={`lc-music-bar ${isPlaying ? '' : 'paused'}`}
              onClick={(e) => toggle(e)}>
              <span /><span /><span /><span />
            </button>
          </motion.div>
        )}

      </AnimatePresence>
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

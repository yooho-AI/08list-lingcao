/**
 * [INPUT]: 依赖 @/lib/store, @/lib/hooks, @/lib/bgm, framer-motion, 游戏组件
 * [OUTPUT]: 对外提供 App 根组件（独立 SPA，无路由依赖）
 * [POS]: 灵草修仙录项目入口，StartScreen ↔ GameScreen 状态切换
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, ENDINGS, PERIODS } from '@/lib/store'
import { useIsMobile } from '@/lib/hooks'
import { useBgm } from '@/lib/bgm'
import DialoguePanel from '@/components/game/dialogue-panel'
import LeftPanel from '@/components/game/character-panel'
import RightPanel from '@/components/game/side-panel'
import MobileGameLayout from '@/components/game/mobile-layout'
import '@/styles/globals.css'

// ============================================================
// NPC 预览数据 — 开始画面用，与 store 解耦
// ============================================================

const NPC_PREVIEW = [
  { id: 'danchenzi', name: '丹辰子', color: '#b45309', icon: '丹' },
  { id: 'yeqingshuang', name: '叶青霜', color: '#0ea5e9', icon: '叶' },
  { id: 'chili', name: '赤璃', color: '#ef4444', icon: '赤' },
] as const

// ============================================================
// 结局类型映射 — 消除 if/else 分支
// ============================================================

const ENDING_TYPE_MAP: Record<string, { label: string; color: string; icon: string }> = {
  TE: { label: '🌿 True Ending', color: '#10b981', icon: '🌿' },
  HE: { label: '🎉 Happy Ending', color: '#ef4444', icon: '🌺' },
  BE: { label: '💀 Bad Ending', color: '#6b7280', icon: '⚰️' },
  NE: { label: '🌤️ Normal Ending', color: '#f59e0b', icon: '🍃' },
}

// ============================================================
// 开始界面
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
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-lg px-6 text-center"
      >
        {/* 标题 */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="mb-6 text-5xl"
        >
          🌿
        </motion.div>
        <h1 className="mb-2 text-2xl font-bold text-[#e2e8f0]">灵草修仙录</h1>
        <p className="mb-1 text-sm text-[#10b981]/80">Spirit Herb Chronicle · 修仙文字冒险</p>
        <p className="mb-8 text-xs leading-relaxed text-[#94a3b8]">
          天元历三千七百年，一株千年九叶灵芝化形成人...
        </p>

        {/* 性别选择 */}
        <div className="mb-4 flex justify-center gap-3">
          {(['male', 'female'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className="rounded-full px-6 py-2 text-sm font-medium transition-all"
              style={{
                background: gender === g ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: gender === g ? '#fff' : '#94a3b8',
                border: gender === g ? '1px solid transparent' : '1px solid rgba(16,185,129,0.25)',
                boxShadow: gender === g ? '0 2px 12px rgba(16,185,129,0.3)' : 'none',
              }}
            >
              {g === 'male' ? '男' : '女'}
            </button>
          ))}
        </div>

        {/* 名字输入 */}
        <div className="mb-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="你的名字..."
            maxLength={8}
            className="w-full max-w-[240px] rounded-lg border px-4 py-2 text-center text-sm outline-none transition-all"
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              borderColor: 'rgba(16, 185, 129, 0.25)',
              color: '#e2e8f0',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#10b981' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.25)' }}
          />
        </div>

        {/* NPC 预览 */}
        <div className="mb-8 flex justify-center gap-5">
          {NPC_PREVIEW.map((npc, i) => (
            <motion.div
              key={npc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="w-[68px] text-center"
            >
              <div
                className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold shadow-lg"
                style={{
                  border: `2px solid ${npc.color}`,
                  background: `${npc.color}18`,
                  color: npc.color,
                }}
              >
                {npc.icon}
              </div>
              <div className="text-xs font-medium text-[#e2e8f0]">{npc.name}</div>
            </motion.div>
          ))}
        </div>

        {/* 按钮组 */}
        <div className="flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleStart}
            className="w-full rounded-full px-8 py-3 text-sm font-medium text-white shadow-lg transition-shadow"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
            }}
          >
            踏入修仙界
          </motion.button>

          {hasSave() && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => loadGame()}
              className="w-full rounded-full border px-8 py-3 text-sm font-medium transition-colors"
              style={{
                borderColor: 'rgba(16, 185, 129, 0.2)',
                color: '#94a3b8',
              }}
            >
              继续游戏
            </motion.button>
          )}
        </div>

        {/* 音乐按钮 */}
        <button
          onClick={(e) => toggle(e)}
          className="mt-4 text-xs text-[#64748b] transition-colors hover:text-[#94a3b8]"
        >
          {isPlaying ? '🔊 音乐开' : '🔇 音乐关'}
        </button>
      </motion.div>
    </div>
  )
}

// ============================================================
// 顶部状态栏 — 日期 + 时段 + 朔月倒计时
// ============================================================

function HeaderBar({ onMenuClick }: { onMenuClick: () => void }) {
  const currentDay = useGameStore((s) => s.currentDay)
  const currentPeriodIndex = useGameStore((s) => s.currentPeriodIndex)
  const newMoonCountdown = useGameStore((s) => s.newMoonCountdown)
  const { toggle, isPlaying } = useBgm()

  const period = PERIODS[currentPeriodIndex]
  const moonWarning = newMoonCountdown <= 3

  return (
    <header
      className="relative z-10 flex min-h-[44px] items-center justify-between gap-2 px-4 py-2"
      style={{ background: 'var(--bg-secondary)' }}
    >
      {/* 左侧：日期 + 时段 */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
          🌿 Day {currentDay}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {period?.icon} {period?.name}
        </span>
      </div>

      {/* 右侧：朔月 + 音乐 + 菜单 */}
      <div className="flex items-center gap-1">
        <span
          className={`rounded-md px-2 py-1 text-xs ${moonWarning ? 'lc-moon-warning' : ''}`}
          style={{
            color: moonWarning ? '#fbbf24' : 'var(--text-muted)',
            background: moonWarning ? undefined : 'transparent',
          }}
        >
          🌑 朔月: {newMoonCountdown}天
        </span>

        <button
          onClick={(e) => toggle(e)}
          className="rounded px-3 py-2 text-sm transition-all"
          style={{ color: 'var(--text-muted)' }}
          title={isPlaying ? '关闭音乐' : '开启音乐'}
        >
          {isPlaying ? '🔊' : '🔇'}
        </button>

        <button
          onClick={onMenuClick}
          className="rounded px-3 py-2 text-sm transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          title="菜单"
        >
          ☰
        </button>
      </div>
    </header>
  )
}

// ============================================================
// 菜单弹窗
// ============================================================

function MenuOverlay({ onClose }: { onClose: () => void }) {
  const saveGame = useGameStore((s) => s.saveGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const resetGame = useGameStore((s) => s.resetGame)

  return (
    <div className="lc-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="lc-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, margin: '0 0 16px', textAlign: 'center' }}
        >
          游戏菜单
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button className="lc-modal-btn" onClick={() => { saveGame(); onClose() }}>💾 保存游戏</button>
          <button className="lc-modal-btn" onClick={() => { loadGame(); onClose() }}>📂 读取存档</button>
          <button className="lc-modal-btn" onClick={() => resetGame()}>🏠 返回标题</button>
          <button className="lc-modal-btn" onClick={() => window.open('https://yooho.ai/', '_blank')}>🌐 返回主页</button>
          <button className="lc-modal-btn" onClick={onClose}>▶️ 继续游戏</button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================================
// 结局弹窗 — 数据驱动，无 if/else
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
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          {meta.icon}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: meta.color, marginBottom: 8, letterSpacing: 2 }}>
          {meta.label}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px', letterSpacing: 1 }}>
          {ending.name}
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)', marginBottom: 24 }}>
          {ending.description}
        </p>
        <button
          onClick={() => resetGame()}
          style={{
            padding: '10px 32px',
            borderRadius: 99,
            border: 'none',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
          }}
        >
          返回标题
        </button>
      </motion.div>
    </div>
  )
}

// ============================================================
// 通知
// ============================================================

function Notification({ text, type }: { text: string; type: string }) {
  return (
    <div className={`lc-notification ${type}`}>
      <span>{type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}</span>
      <span>{text}</span>
    </div>
  )
}

// ============================================================
// PC 游戏主屏幕 — 三栏布局
// ============================================================

function GameScreen() {
  const [showMenu, setShowMenu] = useState(false)
  const [notification, setNotification] = useState<{ text: string; type: string } | null>(null)
  const endingType = useGameStore((s) => s.endingType)

  const showNotif = useCallback((text: string, type = 'info') => {
    setNotification({ text, type })
    setTimeout(() => setNotification(null), 2000)
  }, [])
  void showNotif

  return (
    <div
      className="flex h-screen flex-col"
      style={{ background: 'var(--bg-secondary)', fontFamily: 'var(--font)' }}
    >
      <HeaderBar onMenuClick={() => setShowMenu(true)} />

      <main className="flex flex-1 overflow-hidden">
        <aside className="w-[280px] shrink-0">
          <LeftPanel />
        </aside>
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DialoguePanel />
        </section>
        <aside className="shrink-0">
          <RightPanel />
        </aside>
      </main>

      <AnimatePresence>
        {showMenu && <MenuOverlay onClose={() => setShowMenu(false)} />}
      </AnimatePresence>

      {endingType && <EndingModal />}

      <AnimatePresence>
        {notification && (
          <motion.div
            key="notif"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Notification text={notification.text} type={notification.type} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// App 根组件
// ============================================================

export default function App() {
  const gameStarted = useGameStore((s) => s.gameStarted)
  const isMobile = useIsMobile()

  return (
    <AnimatePresence mode="wait">
      {gameStarted ? (
        <motion.div
          key="game"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="h-screen"
        >
          {isMobile ? <MobileGameLayout /> : <GameScreen />}
        </motion.div>
      ) : (
        <motion.div key="start" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <StartScreen />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * [INPUT]: 依赖 store.ts 状态，Phosphor Icons，framer-motion，子组件 tab-*
 * [OUTPUT]: 对外提供 AppShell 组件
 * [POS]: 桌面居中壳 + Header(📓+🎵+☰+📜) + 三向手势 + Tab路由 + TabBar + DashboardDrawer + RecordSheet + Toast
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Notebook, ChatCircleDots, MapTrifold, Users, Scroll,
  MusicNotes, List as ListIcon, X,
} from '@phosphor-icons/react'
import { useGameStore, PERIODS } from '@/lib/store'
import { useBgm } from '@/lib/bgm'
import TabDialogue from './tab-dialogue'
import TabScene from './tab-scene'
import TabCharacter from './tab-character'
import DashboardDrawer from './dashboard-drawer'

const P = 'lc'

// ── Tab map ─────────────────────────────────────────────

const TABS = [
  { key: 'dialogue' as const, icon: ChatCircleDots, label: '对话' },
  { key: 'scene' as const, icon: MapTrifold, label: '场景' },
  { key: 'character' as const, icon: Users, label: '人物' },
]

// ── RecordSheet (right drawer) ─────────────────────────

function RecordSheet() {
  const showRecords = useGameStore((s) => s.showRecords)
  const toggleRecords = useGameStore((s) => s.toggleRecords)
  const storyRecords = useGameStore((s) => s.storyRecords)

  return (
    <AnimatePresence>
      {showRecords && (<>
        <motion.div
          className={`${P}-records-overlay`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={toggleRecords}
        />
        <motion.div
          className={`${P}-records-sheet`}
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`${P}-records-header`}>
            <span className={`${P}-records-title`}>事件记录</span>
            <button className={`${P}-records-close`} onClick={toggleRecords}>
              <X size={14} />
            </button>
          </div>
          <div className={`${P}-records-timeline`}>
            {storyRecords.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, fontSize: 13, color: 'var(--text-muted)' }}>
                暂无记录
              </div>
            ) : (
              [...storyRecords].reverse().map((r) => (
                <div key={r.id} className={`${P}-records-item`}>
                  <div className={`${P}-records-dot`} />
                  <div className={`${P}-records-body`}>
                    <div className={`${P}-records-meta`}>
                      第{r.day}天 · {r.period}
                    </div>
                    <div className={`${P}-records-event-title`}>{r.title}</div>
                    <div className={`${P}-records-content`}>{r.content}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </>)}
    </AnimatePresence>
  )
}

// ── Toast ───────────────────────────────────────────────

function Toast({ text }: { text: string }) {
  return <div className={`${P}-toast`}>{text}</div>
}

// ── MenuOverlay ─────────────────────────────────────────

function MenuOverlay({ onClose }: { onClose: () => void }) {
  const saveGame = useGameStore((s) => s.saveGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const resetGame = useGameStore((s) => s.resetGame)

  return (
    <div className={`${P}-menu-overlay`} onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <button className={`${P}-menu-btn`} onClick={() => { saveGame(); onClose() }}>
          保存游戏
        </button>
        <button className={`${P}-menu-btn`} onClick={() => { loadGame(); onClose() }}>
          读取存档
        </button>
        <button className={`${P}-menu-btn`} onClick={() => resetGame()}>
          返回标题
        </button>
        <button className={`${P}-menu-btn`} onClick={() => window.open('https://yooho.ai/', '_blank')}>
          返回主页
        </button>
        <button className={`${P}-menu-btn`} onClick={onClose}>
          继续游戏
        </button>
      </motion.div>
    </div>
  )
}

// ── AppShell ────────────────────────────────────────────

export default function AppShell() {
  const activeTab = useGameStore((s) => s.activeTab)
  const setActiveTab = useGameStore((s) => s.setActiveTab)
  const toggleDashboard = useGameStore((s) => s.toggleDashboard)
  const toggleRecords = useGameStore((s) => s.toggleRecords)
  const currentDay = useGameStore((s) => s.currentDay)
  const currentPeriodIndex = useGameStore((s) => s.currentPeriodIndex)
  const newMoonCountdown = useGameStore((s) => s.newMoonCountdown)
  const saveGame = useGameStore((s) => s.saveGame)

  const { toggle: toggleBgm, isPlaying } = useBgm()

  const [showMenu, setShowMenu] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const period = PERIODS[currentPeriodIndex]
  const moonWarning = newMoonCountdown <= 3

  // ── Toast helper ──
  const showToast = useCallback((text: string) => {
    setToast(text)
    setTimeout(() => setToast(null), 2000)
  }, [])

  const handleSave = useCallback(() => {
    saveGame()
    showToast('已保存')
  }, [saveGame, showToast])
  void handleSave

  // ── Three-way gesture ──
  const touchRef = useRef({ x: 0, y: 0 })

  const handleTouchStart = (e: React.TouchEvent) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchRef.current.x
    const dy = e.changedTouches[0].clientY - touchRef.current.y
    if (Math.abs(dx) < 60 || Math.abs(dy) * 1.5 > Math.abs(dx)) return
    if (dx > 0) toggleDashboard()
    else toggleRecords()
  }

  return (
    <div className={`${P}-shell`}>
      {/* ── Header ── */}
      <header className={`${P}-header`}>
        <div className={`${P}-header-info`}>
          <button className={`${P}-header-btn`} onClick={toggleDashboard} title="修仙手帐">
            <Notebook size={20} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>
            Day {currentDay}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {period?.icon} {period?.name}
          </span>
          <span
            className={moonWarning ? `${P}-moon-warning` : ''}
            style={{ fontSize: 11, color: moonWarning ? '#fbbf24' : 'var(--text-muted)' }}
          >
            朔月:{newMoonCountdown}天
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button className={`${P}-header-btn`} onClick={(e) => toggleBgm(e)} title={isPlaying ? '关闭音乐' : '开启音乐'}>
            <MusicNotes size={18} weight={isPlaying ? 'fill' : 'regular'} />
          </button>
          <button className={`${P}-header-btn`} onClick={() => setShowMenu(true)} title="菜单">
            <ListIcon size={18} />
          </button>
          <button className={`${P}-header-btn`} onClick={toggleRecords} title="事件记录">
            <Scroll size={18} />
          </button>
        </div>
      </header>

      {/* ── Tab Content ── */}
      <div
        className={`${P}-tab-content`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
            style={{ height: '100%' }}
          >
            {activeTab === 'dialogue' && <TabDialogue />}
            {activeTab === 'scene' && <TabScene />}
            {activeTab === 'character' && <TabCharacter />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── TabBar ── */}
      <nav className={`${P}-tab-bar`}>
        <button className={`${P}-tab-item`} onClick={toggleDashboard}>
          <Notebook size={20} />
          <span>手帐</span>
        </button>
        {TABS.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            className={`${P}-tab-item ${activeTab === key ? `${P}-tab-active` : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={20} weight={activeTab === key ? 'fill' : 'regular'} />
            <span>{label}</span>
          </button>
        ))}
        <button className={`${P}-tab-item`} onClick={toggleRecords}>
          <Scroll size={20} />
          <span>事件</span>
        </button>
      </nav>

      {/* ── Drawers ── */}
      <DashboardDrawer />
      <RecordSheet />

      {/* ── Menu ── */}
      <AnimatePresence>
        {showMenu && <MenuOverlay onClose={() => setShowMenu(false)} />}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <Toast text={toast} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

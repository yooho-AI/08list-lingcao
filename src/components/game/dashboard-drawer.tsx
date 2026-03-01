/**
 * [INPUT]: 依赖 store.ts 状态（角色/场景/道具/朔月/章节）
 * [OUTPUT]: 对外提供 DashboardDrawer 组件
 * [POS]: 修仙手帐(左抽屉)：扉页+朔月倒计时+角色轮播+场景缩略图+修行目标+道具格+迷你播放器。Reorder拖拽排序
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef } from 'react'
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion'
import { X } from '@phosphor-icons/react'
import {
  useGameStore,
  SCENES, ITEMS, CHAPTERS, PERIODS,
} from '@/lib/store'
import { useBgm } from '@/lib/bgm'

const DASH_ORDER_KEY = 'lc-dash-order'
const DEFAULT_ORDER = ['front', 'moon', 'cast', 'scenes', 'goals', 'items', 'music']

const P = 'lc'

// ── DragHandle ──────────────────────────────────────────

function DragHandle({ controls }: { controls: ReturnType<typeof useDragControls> }) {
  return (
    <div className={`${P}-dash-grip`} onPointerDown={(e) => controls.start(e)}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <rect y="3" width="16" height="2" rx="1" />
        <rect y="7" width="16" height="2" rx="1" />
        <rect y="11" width="16" height="2" rx="1" />
      </svg>
    </div>
  )
}

// ── Section wrapper ─────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const controls = useDragControls()
  return (
    <Reorder.Item value={id} dragListener={false} dragControls={controls}>
      <div className={`${P}-dash-section`}>
        <div className={`${P}-dash-section-header`}>
          <span className={`${P}-dash-section-title`}>{title}</span>
          <DragHandle controls={controls} />
        </div>
        {children}
      </div>
    </Reorder.Item>
  )
}

// ── FrontPage ───────────────────────────────────────────

function FrontPage() {
  const { currentDay, currentPeriodIndex, actionPoints } = useGameStore()
  const chapter = CHAPTERS.find((c) => currentDay >= c.dayRange[0] && currentDay <= c.dayRange[1]) || CHAPTERS[0]
  const period = PERIODS[currentPeriodIndex]

  return (
    <div className={`${P}-dash-front`}>
      <div className={`${P}-dash-front-left`}>
        <div className={`${P}-dash-front-badge`}>{currentDay}</div>
        <div className={`${P}-dash-front-meta`}>
          <div className={`${P}-dash-front-period`}>
            {period?.icon} {period?.name}
          </div>
          <div className={`${P}-dash-front-chapter`}>{chapter.name}</div>
        </div>
      </div>
      <div className={`${P}-dash-front-right`}>
        <div className={`${P}-dash-front-ap`}>{actionPoints}/{6}</div>
        <div className={`${P}-dash-front-ap-label`}>行动力</div>
      </div>
    </div>
  )
}

// ── MoonCountdown ───────────────────────────────────────

function MoonCountdown() {
  const newMoonCountdown = useGameStore((s) => s.newMoonCountdown)
  const critical = newMoonCountdown <= 3

  return (
    <div className={`${P}-dash-moon ${critical ? 'critical' : ''}`}>
      <span>🌑</span>
      <span>距朔月之夜还有 <strong>{newMoonCountdown}</strong> 天</span>
      {critical && <span style={{ color: '#f87171', fontWeight: 700 }}>危险!</span>}
    </div>
  )
}

// ── CastGallery ─────────────────────────────────────────

function CastGallery() {
  const { characters, characterStats, selectCharacter, toggleDashboard } = useGameStore()
  const charEntries = Object.entries(characters)
  const [idx, setIdx] = useState(0)
  const touchX = useRef(0)

  if (charEntries.length === 0) return null
  const [charId, char] = charEntries[idx]
  const stats = characterStats[charId] || {}
  const mainMeta = char.statMetas[0]
  const mainVal = mainMeta ? (stats[mainMeta.key] ?? 0) : 0

  return (
    <div>
      <div
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touchX.current
          if (dx < -50 && idx < charEntries.length - 1) setIdx(idx + 1)
          else if (dx > 50 && idx > 0) setIdx(idx - 1)
        }}
        style={{ overflow: 'hidden' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            onClick={() => { selectCharacter(charId); toggleDashboard() }}
            style={{ display: 'flex', gap: 10, cursor: 'pointer', padding: '4px 0' }}
          >
            <div style={{
              width: 80, height: 120, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
              border: `2px solid ${char.themeColor}`,
            }}>
              <img
                src={char.portrait} alt={char.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: char.themeColor }}>{char.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{char.title} · {char.age}岁</div>
              {mainMeta && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{mainMeta.label}</span>
                  <div style={{
                    flex: 1, height: 6, borderRadius: 3,
                    background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${Math.min(100, mainVal)}%`, height: '100%', borderRadius: 3,
                      background: mainMeta.color, transition: 'width 0.3s',
                    }} />
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: mainMeta.color,
                    fontVariantNumeric: 'tabular-nums', minWidth: 22, textAlign: 'right',
                  }}>{mainVal}</span>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 6 }}>
        {charEntries.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} style={{
            width: i === idx ? 16 : 6, height: 6, borderRadius: 3,
            border: 'none', padding: 0,
            background: i === idx ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
            transition: 'all 0.2s', cursor: 'pointer',
          }} />
        ))}
      </div>
    </div>
  )
}

// ── SceneMap ────────────────────────────────────────────

function SceneMap() {
  const { currentScene, unlockedScenes, selectScene, toggleDashboard } = useGameStore()

  return (
    <div className={`${P}-dash-scene-scroll`}>
      {Object.entries(SCENES).map(([sid, scene]) => {
        const locked = !unlockedScenes.includes(sid)
        const current = sid === currentScene
        return (
          <button
            key={sid}
            className={`${P}-dash-scene-thumb ${current ? `${P}-dash-scene-active` : ''} ${locked ? `${P}-dash-scene-locked` : ''}`}
            disabled={locked}
            onClick={() => { if (!locked && !current) { selectScene(sid); toggleDashboard() } }}
          >
            <img src={scene.background} alt={scene.name} />
            <span className={`${P}-dash-scene-label`}>{scene.icon} {scene.name}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Goals ───────────────────────────────────────────────

function Goals() {
  const stats = useGameStore((s) => s.characterStats)
  const chapter = CHAPTERS.find((c) => {
    const day = useGameStore.getState().currentDay
    return day >= c.dayRange[0] && day <= c.dayRange[1]
  }) || CHAPTERS[0]

  const yqsStats = stats['yeqingshuang'] || {}
  const trust = yqsStats['trust'] ?? 0

  const goals = [
    { label: '找到化形池的线索', done: trust >= 60 },
    { label: '在三方势力中安全求存', done: Object.keys(stats).length >= 3 },
    ...chapter.objectives.map((obj) => ({ label: obj, done: false })),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {goals.slice(0, 4).map(({ label, done }) => (
        <div key={label} className={`${P}-dash-objective`}>
          <span className={`${P}-dash-objective-check ${done ? `${P}-dash-objective-done` : ''}`}>
            {done ? '✓' : ''}
          </span>
          <span style={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.7 : 1 }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── ItemGrid ────────────────────────────────────────────

function ItemGrid() {
  const inventory = useGameStore((s) => s.inventory)

  return (
    <div className={`${P}-dash-item-grid`}>
      {Object.values(ITEMS).map((item) => {
        const qty = inventory[item.id] ?? 0
        return (
          <div key={item.id} className={`${P}-dash-item-cell`} style={{ opacity: qty <= 0 ? 0.35 : 1 }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'center' }}>{item.name}</span>
            {qty > 0 && <span className={`${P}-dash-item-count`}>{qty}</span>}
          </div>
        )
      })}
    </div>
  )
}

// ── MiniPlayer ──────────────────────────────────────────

function MiniPlayer() {
  const { isPlaying, toggle } = useBgm()

  return (
    <div className={`${P}-dash-mini-player`}>
      <button className={`${P}-dash-mini-btn`} onClick={(e) => toggle(e)}>
        {isPlaying ? '⏸' : '♪'}
      </button>
      <span className={`${P}-dash-mini-title`}>{isPlaying ? '播放中' : '已暂停'}</span>
      <div style={{ display: 'flex', alignItems: 'end', gap: 2, height: 18 }}>
        {[0.6, 1, 0.7, 0.9, 0.5].map((s, i) => (
          <div key={i} style={{
            width: 3, borderRadius: 1.5,
            background: isPlaying ? 'var(--primary)' : 'var(--text-muted)',
            height: isPlaying ? `${s * 100}%` : '20%',
            transition: 'height 0.3s',
          }} />
        ))}
      </div>
    </div>
  )
}

// ── DashboardDrawer ─────────────────────────────────────

const SECTION_TITLES: Record<string, string> = {
  front: '修行概览', moon: '朔月倒计时', cast: '同修者',
  scenes: '灵境地图', goals: '修行目标', items: '灵物', music: '仙乐',
}

export default function DashboardDrawer() {
  const showDashboard = useGameStore((s) => s.showDashboard)
  const toggleDashboard = useGameStore((s) => s.toggleDashboard)

  const [order, setOrder] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem(DASH_ORDER_KEY)
      if (s) {
        const a = JSON.parse(s)
        if (DEFAULT_ORDER.every((k) => a.includes(k))) return a
      }
    } catch { /* ignore */ }
    return [...DEFAULT_ORDER]
  })

  const handleReorder = (v: string[]) => {
    setOrder(v)
    localStorage.setItem(DASH_ORDER_KEY, JSON.stringify(v))
  }

  const renderSection = (id: string) => {
    switch (id) {
      case 'front': return <FrontPage />
      case 'moon': return <MoonCountdown />
      case 'cast': return <CastGallery />
      case 'scenes': return <SceneMap />
      case 'goals': return <Goals />
      case 'items': return <ItemGrid />
      case 'music': return <MiniPlayer />
      default: return null
    }
  }

  return (
    <AnimatePresence>
      {showDashboard && (<>
        <motion.div
          className={`${P}-dash-overlay`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={toggleDashboard}
        />
        <motion.div
          className={`${P}-dash-drawer`}
          initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`${P}-dash-header`}>
            <span className={`${P}-dash-title`}>修仙手帐</span>
            <button className={`${P}-dash-close`} onClick={toggleDashboard}>
              <X size={14} />
            </button>
          </div>

          {/* Scrollable sections */}
          <div className={`${P}-dash-scroll`}>
            <Reorder.Group
              axis="y"
              values={order}
              onReorder={handleReorder}
              style={{ listStyle: 'none', padding: 0, margin: 0 }}
            >
              {order.map((id) => (
                <Section key={id} id={id} title={SECTION_TITLES[id] || id}>
                  {renderSection(id)}
                </Section>
              ))}
            </Reorder.Group>
          </div>
        </motion.div>
      </>)}
    </AnimatePresence>
  )
}

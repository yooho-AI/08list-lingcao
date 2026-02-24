/**
 * [INPUT]: 依赖 @/lib/store 的 useGameStore, SCENES, getAvailableCharacters, getStatLevel
 * [OUTPUT]: 对外提供 LeftPanel 组件（场景+角色立绘+异构数值+场景选择+朔月倒计时）
 * [POS]: 灵草修仙录 PC 端左侧面板，3NPC单列，异构数值条
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useGameStore, SCENES, getAvailableCharacters, getStatLevel } from '@/lib/store'

// ============================================================
// 场景卡片 — 16:9 暗色仙侠
// ============================================================

function SceneCard() {
  const currentScene = useGameStore((s) => s.currentScene)
  const scene = SCENES[currentScene]

  return (
    <div className="lc-card lc-scene-card">
      {scene?.background ? (
        <img src={scene.background} alt={scene.name} />
      ) : (
        <div className="lc-placeholder" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
          <span className="lc-placeholder-icon">🕳️</span>
        </div>
      )}
      <div className="lc-scene-tag">
        <span style={{ fontSize: 14 }}>{scene?.icon || '📍'}</span>
        {scene?.name || '隐秘山洞'}
      </div>
    </div>
  )
}

// ============================================================
// 场景选择器 — 水平可滚动场景列表
// ============================================================

function SceneSelector() {
  const currentScene = useGameStore((s) => s.currentScene)
  const unlockedScenes = useGameStore((s) => s.unlockedScenes)
  const selectScene = useGameStore((s) => s.selectScene)

  return (
    <div className="lc-card">
      <div className="lc-scene-selector">
        {Object.entries(SCENES).map(([id, scene]) => {
          const unlocked = unlockedScenes.includes(id)
          const active = currentScene === id

          return (
            <button
              key={id}
              className={`lc-scene-item${active ? ' active' : ''}${!unlocked ? ' locked' : ''}`}
              onClick={() => unlocked && selectScene(id)}
              disabled={!unlocked}
            >
              <span style={{ fontSize: 14 }}>{unlocked ? scene.icon : '🔒'}</span>
              {scene.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// 角色立绘卡片 — 3:4 暗色
// ============================================================

function PortraitCard() {
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const characters = useGameStore((s) => s.characters)
  const char = currentCharacter ? characters[currentCharacter] : null

  return (
    <div className="lc-card lc-portrait-card">
      {char ? (
        <img src={char.fullImage} alt={char.name} />
      ) : (
        <div className="lc-placeholder" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
          <span className="lc-placeholder-icon">👤</span>
          <span className="lc-placeholder-text">选择角色开始</span>
        </div>
      )}
    </div>
  )
}

// ============================================================
// 异构数值条 — 从 statMetas 动态渲染
// ============================================================

function StatBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 12, width: 16, flexShrink: 0, textAlign: 'center' }}>{icon}</span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 28, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            height: '100%',
            background: color,
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 24, textAlign: 'right', flexShrink: 0 }}>
        {value}
      </span>
    </div>
  )
}

// ============================================================
// 角色简介 + 异构数值条
// ============================================================

function InfoCard() {
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const characters = useGameStore((s) => s.characters)
  const characterStats = useGameStore((s) => s.characterStats)
  const char = currentCharacter ? characters[currentCharacter] : null

  if (!char) return null

  const stats = characterStats[char.id]
  const firstStatKey = char.statMetas[0]?.key
  const level = getStatLevel(stats?.[firstStatKey] ?? 0)

  return (
    <div className="lc-card lc-info-card">
      <div className="lc-info-title">
        {char.gender === 'female' ? '🚺' : '🚹'} {char.name}
        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
          {level.name}
        </span>
      </div>
      <div className="lc-info-meta">
        <span>{char.age}岁</span>
        <span style={{ color: 'var(--text-muted)' }}>·</span>
        <span>{char.title}</span>
      </div>
      <div className="lc-info-desc">{char.description}</div>

      {/* 异构数值条 — 由 statMetas 驱动 */}
      {stats && (
        <div style={{ marginTop: 10 }}>
          {char.statMetas.map((meta) => (
            <StatBar key={meta.key} label={meta.label} value={stats?.[meta.key] ?? 0} color={meta.color} icon={meta.icon} />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// 朔月倒计时 — 脉冲预警
// ============================================================

function MoonCountdown() {
  const newMoonCountdown = useGameStore((s) => s.newMoonCountdown)
  const isWarning = newMoonCountdown <= 3

  return (
    <div className={`lc-card${isWarning ? ' lc-moon-warning' : ''}`} style={{ padding: '8px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: isWarning ? 'var(--primary)' : 'var(--text-secondary)' }}>
        <span>🌑</span>
        <span>朔月倒计时:</span>
        <span style={{ fontWeight: 600, color: isWarning ? '#ef4444' : 'var(--text-primary)' }}>
          {newMoonCountdown}天
        </span>
      </div>
    </div>
  )
}

// ============================================================
// 角色选择列表 — 3NPC 单列
// ============================================================

function CharacterList() {
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const currentDay = useGameStore((s) => s.currentDay)
  const characters = useGameStore((s) => s.characters)
  const characterStats = useGameStore((s) => s.characterStats)
  const selectCharacter = useGameStore((s) => s.selectCharacter)

  const available = getAvailableCharacters(currentDay, characters)

  return (
    <div className="lc-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>角色</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {Object.keys(available).length}人
        </span>
      </div>
      <div className="lc-char-list" style={{ flex: 1 }}>
        {Object.entries(available).map(([charId, char]) => {
          const stats = characterStats[charId]
          const firstMeta = char.statMetas[0]
          const firstStatValue = stats?.[firstMeta?.key] ?? 0

          return (
            <button
              key={charId}
              className={`lc-char-item ${currentCharacter === charId ? 'active' : ''}`}
              onClick={() => selectCharacter(currentCharacter === charId ? null : charId)}
            >
              <span style={{ flex: 1, color: currentCharacter === charId ? char.themeColor : undefined }}>
                {char.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                {firstMeta?.icon}{firstStatValue}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// 左侧面板主组件
// ============================================================

export default function LeftPanel() {
  return (
    <div
      className="lc-scrollbar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '12px 0 12px 12px',
        height: '100%',
        background: 'var(--bg-secondary)',
        overflowY: 'auto',
      }}
    >
      <SceneCard />
      <SceneSelector />
      <PortraitCard />
      <InfoCard />
      <MoonCountdown />
      <CharacterList />
    </div>
  )
}

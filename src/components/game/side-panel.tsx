/**
 * [INPUT]: 依赖 @/lib/store 的 useGameStore, ITEMS, getAvailableCharacters, getStatLevel
 * [OUTPUT]: 对外提供 RightPanel 组件（导航栏 + 背包面板 + 关系总览面板）
 * [POS]: 灵草修仙录 PC 端右侧面板，2个导航图标，异构数值展示
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useGameStore, ITEMS, getAvailableCharacters, getStatLevel } from '@/lib/store'

// ============================================================
// 背包面板
// ============================================================

function InventoryPanel() {
  const inventory = useGameStore((s) => s.inventory)
  const useItem = useGameStore((s) => s.useItem)
  const closePanel = useGameStore((s) => s.closePanel)

  const hasItems = Object.entries(inventory).some(([, count]) => count > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>背包</span>
        <button
          onClick={closePanel}
          style={{
            width: 24, height: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none',
            color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', borderRadius: 4,
          }}
        >
          ×
        </button>
      </div>
      <div className="lc-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {hasItems ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(inventory).map(([itemId, count]) => {
              if (count <= 0) return null
              const item = ITEMS[itemId]
              if (!item) return null
              return (
                <div key={itemId} className="lc-item-row" onClick={() => useItem(itemId)} style={{ cursor: 'pointer' }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
                      {item.name}
                    </span>
                    <span
                      style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {item.description}
                    </span>
                  </div>
                  {count > 1 && (
                    <span
                      style={{
                        fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
                        background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 100,
                      }}
                    >
                      ×{count}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="lc-placeholder" style={{ height: 150 }}>
            <span style={{ fontSize: 32, opacity: 0.5 }}>🎒</span>
            <span className="lc-placeholder-text">背包空空如也</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// 关系总览面板 — 异构数值展示
// ============================================================

function RelationsPanel() {
  const currentDay = useGameStore((s) => s.currentDay)
  const characters = useGameStore((s) => s.characters)
  const characterStats = useGameStore((s) => s.characterStats)
  const closePanel = useGameStore((s) => s.closePanel)

  const available = getAvailableCharacters(currentDay, characters)

  /* 按首项数值降序排列 */
  const sorted = Object.entries(available).sort(([aId, aChar], [bId, bChar]) => {
    const aKey = aChar.statMetas[0]?.key
    const bKey = bChar.statMetas[0]?.key
    const aVal = aKey ? (characterStats[aId]?.[aKey] ?? 0) : 0
    const bVal = bKey ? (characterStats[bId]?.[bKey] ?? 0) : 0
    return bVal - aVal
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>关系总览</span>
        <button
          onClick={closePanel}
          style={{
            width: 24, height: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none',
            color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', borderRadius: 4,
          }}
        >
          ×
        </button>
      </div>
      <div className="lc-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {sorted.map(([charId, char]) => {
          const stats = characterStats[charId]
          const firstKey = char.statMetas[0]?.key
          const level = getStatLevel(firstKey ? (stats?.[firstKey] ?? 0) : 0)

          return (
            <div
              key={charId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              {/* 头像圆点 */}
              <div
                style={{
                  width: 32, height: 32,
                  borderRadius: '50%',
                  border: `2px solid ${char.themeColor}`,
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <img
                  src={char.fullImage}
                  alt={char.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
                />
              </div>

              {/* 名称 + 关系等级 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: char.themeColor }}>
                    {char.name}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                    {level.name}
                  </span>
                </div>
              </div>

              {/* 异构数值概览 — 每个角色维度不同 */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, flexShrink: 0 }}>
                {char.statMetas.map((meta) => (
                  <span key={meta.key} style={{ fontSize: 10, color: meta.color }}>
                    {meta.icon}{stats?.[meta.key] ?? 0}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// 右侧面板主组件
// ============================================================

export default function RightPanel() {
  const activePanel = useGameStore((s) => s.activePanel)
  const togglePanel = useGameStore((s) => s.togglePanel)
  const inventory = useGameStore((s) => s.inventory)

  const inventoryCount = Object.values(inventory).reduce((sum, n) => sum + (n > 0 ? n : 0), 0)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        padding: '12px 0 12px 12px',
        background: 'var(--bg-secondary)',
      }}
    >
      {/* 背包面板 */}
      {activePanel === 'inventory' && (
        <div className="lc-detail-panel">
          <div className="lc-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <InventoryPanel />
          </div>
        </div>
      )}

      {/* 关系面板 */}
      {activePanel === 'relations' && (
        <div className="lc-detail-panel">
          <div className="lc-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <RelationsPanel />
          </div>
        </div>
      )}

      {/* 导航栏 */}
      <div className="lc-nav-bar" style={{ marginLeft: activePanel ? 8 : 0 }}>
        <button
          className={`lc-nav-btn ${activePanel === 'inventory' ? 'active' : ''}`}
          onClick={() => togglePanel('inventory')}
          style={{ position: 'relative' }}
        >
          <span className="lc-nav-icon">🎒</span>
          <span className="lc-nav-label">背包</span>
          {inventoryCount > 0 && <span className="lc-nav-badge">{inventoryCount}</span>}
        </button>

        <button
          className={`lc-nav-btn ${activePanel === 'relations' ? 'active' : ''}`}
          onClick={() => togglePanel('relations')}
          style={{ position: 'relative' }}
        >
          <span className="lc-nav-icon">💕</span>
          <span className="lc-nav-label">关系</span>
        </button>
      </div>
    </div>
  )
}

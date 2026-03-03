/**
 * [INPUT]: 依赖 store.ts 状态（角色/属性/异构数值）
 * [OUTPUT]: 对外提供 TabCharacter 组件
 * [POS]: 人物Tab：2x2角色网格(聊天按钮+mini数值条) + SVG关系图 + CharacterDossier(overlay+sheet) + CharacterChat
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChatCircleDots } from '@phosphor-icons/react'
import {
  useGameStore,
  type Character,
  type CharacterStats,
  getStatLevel,
} from '@/lib/store'
import CharacterChat from './character-chat'

const P = 'lc'

// ── Relation Graph (SVG) ────────────────────────────────

function RelationGraph({
  characters,
  characterStats,
  playerName,
  onSelect,
}: {
  characters: Record<string, Character>
  characterStats: Record<string, CharacterStats>
  playerName: string
  onSelect: (id: string) => void
}) {
  const entries = Object.entries(characters)
  const cx = 150, cy = 150, radius = 110

  return (
    <svg viewBox="0 0 300 300" style={{ width: '100%', maxWidth: 300, margin: '0 auto', display: 'block' }}>
      {/* Center node */}
      <circle cx={cx} cy={cy} r={28} fill="var(--bg-card)" stroke="var(--primary)" strokeWidth={2} />
      <text x={cx} y={cy + 5} textAnchor="middle" fill="var(--primary)" fontSize={12} fontWeight={600}>
        {playerName || '我'}
      </text>

      {entries.map(([id, char], i) => {
        const angle = (i / entries.length) * Math.PI * 2 - Math.PI / 2
        const nx = cx + radius * Math.cos(angle)
        const ny = cy + radius * Math.sin(angle)

        // Use first relation stat for label
        const stats = characterStats[id] || {}
        const firstMeta = char.statMetas.find((m) => m.category === 'relation')
        const firstVal = firstMeta ? (stats[firstMeta.key] ?? 0) : 0
        const relation = firstMeta
          ? `${firstMeta.label} ${firstVal}`
          : getStatLevel(firstVal).name

        return (
          <g key={id} onClick={() => onSelect(id)} style={{ cursor: 'pointer' }}>
            <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={char.themeColor} strokeWidth={1.5} opacity={0.4} />
            <text x={(cx + nx) / 2} y={(cy + ny) / 2 - 6} textAnchor="middle" fill={char.themeColor} fontSize={9} fontWeight={500}>
              {relation}
            </text>
            <circle cx={nx} cy={ny} r={22} fill="var(--bg-card)" stroke={char.themeColor} strokeWidth={2} />
            <clipPath id={`lc-clip-${id}`}>
              <circle cx={nx} cy={ny} r={20} />
            </clipPath>
            <image
              href={char.portrait}
              x={nx - 20} y={ny - 20}
              width={40} height={40}
              clipPath={`url(#lc-clip-${id})`}
              preserveAspectRatio="xMidYMin slice"
            />
          </g>
        )
      })}
    </svg>
  )
}

// ── Character Dossier (overlay + sheet) ─────────────────────

function CharacterDossier({
  char,
  stats,
  onClose,
}: {
  char: Character
  stats: CharacterStats
  onClose: () => void
}) {
  return (
    <>
      <motion.div
        className={`${P}-dossier-overlay`}
        style={{ background: 'rgba(0,0,0,0.5)', overflow: 'visible' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className={`${P}-records-sheet`}
        style={{ zIndex: 52, overflowY: 'auto' }}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Portrait */}
        <div className={`${P}-dossier-portrait`}>
          <img src={char.portrait} alt={char.name} />
          <div className={`${P}-dossier-gradient`} />
          <button className={`${P}-dossier-close`} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Info */}
        <div className={`${P}-dossier-content`}>
          <div className={`${P}-dossier-name`} style={{ color: char.themeColor }}>
            {char.name}
          </div>
          <div className={`${P}-dossier-subtitle`}>
            {char.title} · {char.age}岁
          </div>
          <div className={`${P}-dossier-desc`}>{char.description}</div>

          {/* Heterogeneous stat bars */}
          <div className={`${P}-dossier-stats`}>
            {char.statMetas.map((meta, i) => {
              const value = stats[meta.key] ?? 0
              const pct = Math.min(100, value)
              return (
                <div key={meta.key} className={`${P}-dossier-stat-row`}>
                  <span className={`${P}-dossier-stat-label`} style={{ color: meta.color }}>
                    {meta.icon} {meta.label}
                  </span>
                  <div className={`${P}-dossier-stat-track`}>
                    <motion.div
                      className={`${P}-dossier-stat-fill`}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: pct / 100 }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                      style={{ background: meta.color, transformOrigin: 'left' }}
                    />
                  </div>
                  <span className={`${P}-dossier-stat-val`} style={{ color: meta.color }}>
                    {value}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Tags */}
          <div className={`${P}-dossier-tags`}>
            {char.triggerPoints.map((tag) => (
              <span key={tag} className={`${P}-dossier-tag`}>{tag}</span>
            ))}
          </div>

          {/* Personality */}
          <div style={{
            padding: 12, borderRadius: 12, background: 'var(--bg-card)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>性格特征</div>
            <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7, margin: 0 }}>
              {char.personality}
            </p>
          </div>
        </div>
      </motion.div>
    </>
  )
}

// ── Main Component ──────────────────────────────────────

export default function TabCharacter() {
  const characters = useGameStore((s) => s.characters)
  const characterStats = useGameStore((s) => s.characterStats)
  const playerName = useGameStore((s) => s.playerName)

  const [dossierChar, setDossierChar] = useState<string | null>(null)
  const [chatChar, setChatChar] = useState<string | null>(null)

  return (
    <div className={`${P}-scrollbar`} style={{ height: '100%', overflow: 'auto', padding: 12 }}>
      {/* ── 角色网格 (2x2) ── */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>
        🌿 修仙者
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {Object.entries(characters).map(([id, char]) => {
          const stats = characterStats[id] || {}
          const mainMeta = char.statMetas[0]
          const mainVal = mainMeta ? (stats[mainMeta.key] ?? 0) : 0
          const level = getStatLevel(mainVal)
          return (
            <button
              key={id}
              onClick={() => setDossierChar(id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: 10, borderRadius: 12,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                cursor: 'pointer', transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              {/* 聊天按钮 */}
              <div
                onClick={(e) => { e.stopPropagation(); setChatChar(id) }}
                style={{
                  position: 'absolute', top: 6, left: 6,
                  width: 28, height: 28, borderRadius: '50%',
                  background: `${char.themeColor}18`,
                  border: `1px solid ${char.themeColor}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 1,
                }}
              >
                <ChatCircleDots size={16} weight="fill" color={char.themeColor} />
              </div>
              <img
                src={char.portrait}
                alt={char.name}
                style={{
                  width: 56, height: 56, borderRadius: '50%',
                  objectFit: 'cover', objectPosition: 'center top',
                  border: `2px solid ${char.themeColor}44`,
                  marginBottom: 6,
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 500, color: char.themeColor }}>
                {char.name}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                {char.title}
              </span>
              {/* Mini stat bar */}
              <div style={{ width: '80%', height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  background: mainMeta?.color || char.themeColor,
                  width: `${Math.min(100, mainVal)}%`, transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                {level.name} {mainVal}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── 关系图 ── */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>
        🕸️ 关系网络
      </h4>
      <div style={{
        padding: 12, borderRadius: 16, background: 'var(--bg-card)',
        border: '1px solid var(--border)', marginBottom: 20,
      }}>
        <RelationGraph
          characters={characters}
          characterStats={characterStats}
          playerName={playerName}
          onSelect={(id) => setDossierChar(id)}
        />
      </div>

      <div style={{ height: 16 }} />

      {/* ── Character Dossier ── */}
      <AnimatePresence>
        {dossierChar && characters[dossierChar] && (
          <CharacterDossier
            char={characters[dossierChar]}
            stats={characterStats[dossierChar] || {}}
            onClose={() => setDossierChar(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Character Chat ── */}
      <AnimatePresence>
        {chatChar && characters[chatChar] && (
          <CharacterChat charId={chatChar} onClose={() => setChatChar(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

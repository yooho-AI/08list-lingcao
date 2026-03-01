/**
 * [INPUT]: 依赖 store.ts 状态（消息/角色/场景/选项），parser.ts
 * [OUTPUT]: 对外提供 TabDialogue 组件
 * [POS]: 对话 Tab：富消息路由(SceneCard/PeriodCard/NPC头像气泡) + 可折叠选项 + 背包 + 输入
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PaperPlaneRight, Backpack, GameController, CaretUp, CaretDown,
} from '@phosphor-icons/react'
import {
  useGameStore, SCENES, ITEMS, STORY_INFO,
  parseStoryParagraph,
  type Message,
} from '@/lib/store'

const P = 'lc'
const LETTERS = ['A', 'B', 'C', 'D']

// ── Scene Transition Card ───────────────────────────────

function SceneTransitionCard({ msg }: { msg: Message }) {
  const scene = msg.sceneId ? SCENES[msg.sceneId] : null
  if (!scene) return null
  return (
    <div className={`${P}-scene-card`}>
      <img src={scene.background} alt={scene.name} loading="lazy" />
      <div className={`${P}-scene-card-overlay`}>
        <div className={`${P}-scene-card-name`}>{scene.icon} {scene.name}</div>
        <div className={`${P}-scene-card-atmo`}>{scene.atmosphere}</div>
      </div>
      <div className={`${P}-scene-card-badge`}>场景转换</div>
    </div>
  )
}

// ── Period Change Card ──────────────────────────────────

function PeriodCard({ msg }: { msg: Message }) {
  const info = msg.periodInfo
  if (!info) return null
  return (
    <div className={`${P}-period-card`}>
      <div className={`${P}-period-day`}>第 {info.day} 天</div>
      <div className={`${P}-period-name`}>{info.period}</div>
      {info.chapter && <div className={`${P}-period-chapter`}>{info.chapter}</div>}
    </div>
  )
}

// ── NPC Bubble ──────────────────────────────────────────

function NpcBubble({ msg }: { msg: Message }) {
  const characters = useGameStore((s) => s.characters)
  const char = msg.character ? characters[msg.character] : null
  const { narrative, statHtml, charColor } = parseStoryParagraph(msg.content)

  return (
    <div className={`${P}-npc-row`}>
      {char && (
        <img
          className={`${P}-npc-avatar`}
          src={char.portrait}
          alt={char.name}
          style={{ borderColor: charColor || char.themeColor }}
        />
      )}
      <div
        className={`${P}-npc-bubble`}
        style={{ borderLeft: `3px solid ${charColor || 'var(--primary)'}` }}
      >
        <div dangerouslySetInnerHTML={{ __html: narrative }} />
        {statHtml && <div dangerouslySetInnerHTML={{ __html: statHtml }} />}
      </div>
    </div>
  )
}

// ── Player Bubble ───────────────────────────────────────

function PlayerBubble({ msg }: { msg: Message }) {
  return <div className={`${P}-bubble-player`}>{msg.content}</div>
}

// ── System Bubble ───────────────────────────────────────

function SystemBubble({ msg }: { msg: Message }) {
  return <div className={`${P}-bubble-system`}>{msg.content}</div>
}

// ── Letter Card (welcome) ───────────────────────────────

function LetterCard() {
  return (
    <div className={`${P}-letter`}>
      <div className={`${P}-letter-watermark`}>🌿</div>
      <div className={`${P}-letter-title`}>灵草修仙录</div>
      <div className={`${P}-letter-body`}>
        {STORY_INFO.description}
      </div>
      <div className={`${P}-letter-sign`}>—— 仙界密卷</div>
    </div>
  )
}

// ── Collapsible Choices ─────────────────────────────────

function CollapsibleChoices() {
  const choices = useGameStore((s) => s.choices)
  const sendMessage = useGameStore((s) => s.sendMessage)
  const isTyping = useGameStore((s) => s.isTyping)
  const [expanded, setExpanded] = useState(true)

  if (choices.length === 0) return null

  if (!expanded) {
    return (
      <button
        className={`${P}-choices-bar`}
        onClick={() => setExpanded(true)}
        disabled={isTyping}
      >
        <GameController size={16} />
        <span>展开行动选项</span>
        <span className={`${P}-choices-count`}>{choices.length}</span>
        <CaretUp size={14} />
      </button>
    )
  }

  return (
    <div className={`${P}-choices-panel`}>
      <div className={`${P}-choices-panel-header`} onClick={() => setExpanded(false)}>
        <div className={`${P}-choices-panel-title`}>
          <GameController size={16} />
          <span>行动选项</span>
        </div>
        <CaretDown size={14} style={{ color: 'var(--text-muted)' }} />
      </div>
      <div className={`${P}-choices-grid`}>
        {choices.map((choice, i) => (
          <motion.button
            key={i}
            className={`${P}-choices-card`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            disabled={isTyping}
            onClick={() => sendMessage(choice)}
          >
            <span className={`${P}-choices-letter`}>{LETTERS[i]}</span>
            <span>{choice}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ── Inventory Sheet ─────────────────────────────────────

function InventorySheet({ onClose }: { onClose: () => void }) {
  const inventory = useGameStore((s) => s.inventory)
  const useItem = useGameStore((s) => s.useItem)

  return (
    <div className={`${P}-inventory-overlay`} onClick={onClose}>
      <motion.div
        className={`${P}-inventory-sheet`}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${P}-inventory-handle`} />
        <div className={`${P}-inventory-header`}>
          <span className={`${P}-inventory-title`}>背包</span>
          <button className={`${P}-inventory-close`} onClick={onClose}>✕</button>
        </div>
        <div className={`${P}-inventory-grid`}>
          {Object.values(ITEMS).map((item) => {
            const qty = inventory[item.id] ?? 0
            return (
              <button
                key={item.id}
                className={`${P}-inventory-item`}
                disabled={qty <= 0}
                style={{ opacity: qty <= 0 ? 0.35 : 1 }}
                onClick={() => { if (qty > 0) useItem(item.id) }}
              >
                <span className={`${P}-inventory-icon`}>{item.icon}</span>
                <span className={`${P}-inventory-name`}>{item.name}</span>
                {qty > 0 && <span className={`${P}-inventory-count`}>{qty}</span>}
              </button>
            )
          })}
          {Object.keys(ITEMS).length === 0 && (
            <div className={`${P}-inventory-empty`}>暂无道具</div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── Streaming Bubble ────────────────────────────────────

function StreamingBubble() {
  const streamingContent = useGameStore((s) => s.streamingContent)
  const isTyping = useGameStore((s) => s.isTyping)

  if (!isTyping || !streamingContent) {
    if (isTyping) {
      return (
        <div className={`${P}-typing`}>
          <div className={`${P}-typing-dot`} />
          <div className={`${P}-typing-dot`} />
          <div className={`${P}-typing-dot`} />
        </div>
      )
    }
    return null
  }

  const { narrative, statHtml, charColor } = parseStoryParagraph(streamingContent)

  return (
    <div className={`${P}-npc-row`}>
      <div
        className={`${P}-npc-bubble`}
        style={{ borderLeft: `3px solid ${charColor || 'var(--primary)'}` }}
      >
        <div dangerouslySetInnerHTML={{ __html: narrative }} />
        {statHtml && <div dangerouslySetInnerHTML={{ __html: statHtml }} />}
      </div>
    </div>
  )
}

// ── Main Component ──────────────────────────────────────

export default function TabDialogue() {
  const messages = useGameStore((s) => s.messages)
  const sendMessage = useGameStore((s) => s.sendMessage)
  const isTyping = useGameStore((s) => s.isTyping)

  const streamingContent = useGameStore((s) => s.streamingContent)

  const [input, setInput] = useState('')
  const [showInventory, setShowInventory] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const userScrolledUp = useRef(false)

  // Detect user scroll: if user scrolls up, stop auto-scroll
  const handleScroll = useCallback(() => {
    const el = chatRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    userScrolledUp.current = distanceFromBottom > 80
  }, [])

  // Smart auto-scroll: only scroll to bottom when user is near bottom
  useEffect(() => {
    const el = chatRef.current
    if (el && !userScrolledUp.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, isTyping, streamingContent])

  // Reset scroll lock when new message batch arrives (user sent or AI finished)
  useEffect(() => {
    userScrolledUp.current = false
    const el = chatRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isTyping) return
    setInput('')
    sendMessage(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Message router ──
  const renderMessage = (msg: Message) => {
    if (msg.type === 'scene-transition') return <SceneTransitionCard key={msg.id} msg={msg} />
    if (msg.type === 'period-change') return <PeriodCard key={msg.id} msg={msg} />
    if (msg.role === 'assistant') return <NpcBubble key={msg.id} msg={msg} />
    if (msg.role === 'user') return <PlayerBubble key={msg.id} msg={msg} />
    return <SystemBubble key={msg.id} msg={msg} />
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── Chat Area ── */}
      <div
        ref={chatRef}
        className={`${P}-scrollbar`}
        onScroll={handleScroll}
        style={{ flex: 1, overflow: 'auto', padding: '12px 12px 0', display: 'flex', flexDirection: 'column' }}
      >
        <LetterCard />
        {messages.map(renderMessage)}
        <StreamingBubble />
        <div style={{ height: 8 }} />
      </div>

      {/* ── Choices Panel ── */}
      <CollapsibleChoices />

      {/* ── Input Area ── */}
      <div className={`${P}-input-area`}>
        <button
          className={`${P}-icon-btn`}
          onClick={() => setShowInventory(true)}
          title="背包"
        >
          <Backpack size={20} />
        </button>
        <input
          className={`${P}-input`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="说点什么..."
          disabled={isTyping}
        />
        <button
          className={`${P}-send-btn`}
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
        >
          <PaperPlaneRight size={18} weight="fill" />
        </button>
      </div>

      {/* ── Inventory ── */}
      <AnimatePresence>
        {showInventory && <InventorySheet onClose={() => setShowInventory(false)} />}
      </AnimatePresence>
    </div>
  )
}

/**
 * [INPUT]: 无外部依赖（颜色硬编码，避免循环依赖）
 * [OUTPUT]: 对外提供 parseStoryParagraph, parseInlineContent, escapeHtml
 * [POS]: lib 的 AI 回复文本解析器，被 dialogue-panel 和 mobile-layout 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ============================================================
// 角色配色表（3 NPC 硬编码，避免运行时依赖动态角色）
// ============================================================

const CHARACTER_COLORS: Record<string, string> = {
  '丹辰子': '#b45309',
  '叶青霜': '#0ea5e9',
  '赤璃': '#ef4444',
}

// ============================================================
// 数值配色表（5 种异构数值）
// ============================================================

const STAT_COLORS: Record<string, string> = {
  '觊觎': '#b45309',
  '觊觎度': '#b45309',
  '好感': '#ef4444',
  '好感度': '#ef4444',
  '信任': '#22c55e',
  '信任度': '#22c55e',
  '同化': '#7c3aed',
  '同化度': '#7c3aed',
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function parseInlineContent(text: string): string {
  if (!text) return ''
  let result = ''
  let remaining = text
  let safety = 0

  while (remaining.length > 0 && safety < 100) {
    safety++
    remaining = remaining.trim()
    if (!remaining) break

    /* （动作） */
    const actionMatch = remaining.match(/^[（(]([^）)]+)[）)]/)
    if (actionMatch) {
      result += `<span class="action">（${escapeHtml(actionMatch[1])}）</span>`
      remaining = remaining.slice(actionMatch[0].length)
      continue
    }

    /* *动作* */
    const starMatch = remaining.match(/^\*([^*]+)\*/)
    if (starMatch) {
      result += `<span class="action">*${escapeHtml(starMatch[1])}*</span>`
      remaining = remaining.slice(starMatch[0].length)
      continue
    }

    /* "对话" 或 "对话" */
    const dialogueMatch = remaining.match(/^[""\u201c]([^""\u201d]+)[""\u201d]/)
    if (dialogueMatch) {
      result += `<span class="dialogue">\u201c${escapeHtml(dialogueMatch[1])}\u201d</span>`
      remaining = remaining.slice(dialogueMatch[0].length)
      continue
    }

    /* 下一个特殊标记 */
    const nextAction = remaining.search(/[（(]/)
    const nextStar = remaining.search(/\*/)
    const nextDialogue = remaining.search(/[""\u201c]/)
    const positions = [nextAction, nextStar, nextDialogue].filter((p) => p > 0)

    if (positions.length > 0) {
      const nextPos = Math.min(...positions)
      const plain = remaining.slice(0, nextPos).trim()
      if (plain) result += `<span class="plain-text">${escapeHtml(plain)}</span>`
      remaining = remaining.slice(nextPos)
    } else {
      const plain = remaining.trim()
      if (plain) result += `<span class="plain-text">${escapeHtml(plain)}</span>`
      break
    }
  }
  return result
}

export function parseStoryParagraph(content: string): { narrative: string; statHtml: string } {
  if (!content) return { narrative: '', statHtml: '' }

  const lines = content.split('\n').filter((l) => l.trim())
  const storyParts: string[] = []
  const statChanges: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    /* 数值变化 【好感度+2】 */
    const statMatch = trimmed.match(/^【([^】]*[+-]\d+[^】]*)】$/)
    if (statMatch) {
      statChanges.push(statMatch[1])
      continue
    }

    /* 【角色名】开头 */
    const charMatch = trimmed.match(/^【([^】]+)】(.*)/)
    if (charMatch) {
      const charName = charMatch[1]
      const rest = charMatch[2].trim()
      if (charName.match(/[+-]\d+/)) {
        statChanges.push(charName)
        continue
      }
      const color = CHARACTER_COLORS[charName] || '#10b981'
      const lineHtml = parseInlineContent(rest)
      storyParts.push(
        `<p class="dialogue-line"><span class="char-name" style="color:${color}">【${escapeHtml(charName)}】</span>${lineHtml}</p>`
      )
      continue
    }

    /* 纯旁白 vs 混合内容 */
    const hasDialogue = trimmed.match(/[""\u201c][^""\u201d]+[""\u201d]/)
    const hasAction = trimmed.match(/[（(][^）)]+[）)]/) || trimmed.match(/\*[^*]+\*/)
    if (!hasDialogue && !hasAction) {
      storyParts.push(`<p class="narration">${escapeHtml(trimmed)}</p>`)
    } else {
      const lineHtml = parseInlineContent(trimmed)
      if (lineHtml) storyParts.push(`<p class="dialogue-line">${lineHtml}</p>`)
    }
  }

  let narrative = storyParts.join('')
  let statHtml = ''

  if (statChanges.length > 0) {
    const statText = statChanges
      .map((s) => {
        let color = '#9b9a97'
        for (const [keyword, c] of Object.entries(STAT_COLORS)) {
          if (s.includes(keyword)) { color = c; break }
        }
        return `<span style="color:${color}">【${escapeHtml(s)}】</span>`
      })
      .join(' ')
    statHtml = `<p class="narration" style="font-style:normal;border-left:none;padding-left:0;margin-bottom:0;font-size:13px">${statText}</p>`
  }

  return { narrative, statHtml }
}

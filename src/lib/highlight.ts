/**
 * [INPUT]: 依赖 @/lib/stream 的 chat
 * [OUTPUT]: 对外提供分析/生成函数及风格常量
 * [POS]: lib 的高光时刻 API 封装，被 highlight-modal 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { chat } from './stream'

// ============================================================
// 类型
// ============================================================

export type HighlightType = 'bond' | 'wit' | 'growth' | 'crisis'
export type VideoStyle = 'chinese_ink' | 'anime' | 'cinematic' | 'pixel'
export type ComicStyle = 'shoujo' | 'shounen' | 'webtoon' | 'doodle'

export interface Highlight {
  highlightId: string
  title: string
  summary: string
  type: HighlightType
  characters: { id: string; name: string }[]
  emotionalScore: number
}

// ============================================================
// 风格常量 — 仙侠主题色 #10b981
// ============================================================

export const HIGHLIGHT_TYPES: Record<HighlightType, { icon: string; label: string; color: string }> = {
  bond: { icon: '🤝', label: '羁绊共鸣', color: '#10b981' },
  wit: { icon: '🎭', label: '机智周旋', color: '#f59e0b' },
  growth: { icon: '🌱', label: '灵草觉醒', color: '#0ea5e9' },
  crisis: { icon: '⚡', label: '生死危机', color: '#ef4444' },
}

export const VIDEO_STYLES: Record<VideoStyle, { label: string; desc: string; prompt: string }> = {
  chinese_ink: { label: '国风水墨', desc: '水墨留白、古典配色', prompt: '中国水墨动画风格，墨色晕染，留白写意，古典配色，仙侠氛围' },
  anime: { label: '日系动漫', desc: '赛璐珞上色、柔和光影', prompt: '日系动画风格，赛璐珞上色，柔和光影，仙侠角色设计' },
  cinematic: { label: '写实电影', desc: '自然光影、电影构图', prompt: '仙侠电影质感，自然光影，浅景深，电影级构图，云雾缭绕' },
  pixel: { label: '像素复古', desc: '像素颗粒、复古色调', prompt: '像素动画风格，16bit复古色调，仙侠像素颗粒感' },
}

export const COMIC_STYLES: Record<ComicStyle, { label: string; desc: string; prompt: string }> = {
  shoujo: { label: '少女漫画', desc: '花瓣特效、梦幻氛围', prompt: 'Q版少女漫画风格，大头小身2:1比例，仙侠服饰，花瓣星星特效' },
  shounen: { label: '少年漫画', desc: '硬朗线条、张力构图', prompt: 'Q版少年漫画风格，大头小身2:1比例，仙侠武斗，速度线，热血表情' },
  webtoon: { label: '韩漫条漫', desc: '精致上色、网感强', prompt: 'Q版韩漫风格，大头小身2:1比例，仙侠世界，精致数码上色' },
  doodle: { label: '手绘涂鸦', desc: '随性笔触、轻松氛围', prompt: 'Q版手绘涂鸦风格，大头小身2:1比例，仙侠Q萌，铅笔随性笔触' },
}

// ============================================================
// AI 分析
// ============================================================

export async function analyzeHighlights(
  dialogues: { role: string; content: string }[]
): Promise<Highlight[]> {
  const dialogueText = dialogues
    .map((d, i) => `${i + 1}. [${d.role}]: ${d.content}`)
    .join('\n')

  const prompt = `你是一个专业的仙侠文学分析师。请分析以下修仙文字冒险游戏《灵草修仙录》的对话，提取2-4个最精彩的高光片段。

## 对话历史
${dialogueText}

## 涉及角色
丹辰子（药王谷主）、叶青霜（散修剑修）、赤璃（妖族少主）

## 输出要求
请以 JSON 数组格式返回，每个片段包含：
- highlightId: 唯一ID (如 "hl_001")
- title: 片段标题 (6-10字，古风意境)
- summary: 内容摘要 (20-40字)
- type: 片段类型 (bond/wit/growth/crisis)
- characters: 涉及角色数组 [{id, name}]
- emotionalScore: 情感强度 (0-100)

只返回 JSON 数组，不要其他内容。`

  const content = await chat([{ role: 'user', content: prompt }])

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as Highlight[]
  } catch {
    console.error('[Highlight] 解析失败:', content)
  }
  return []
}

// ============================================================
// 火山方舟 Ark API
// ============================================================

const ARK_BASE = 'https://ark.cn-beijing.volces.com/api/v3'
const ARK_API_KEY = '8821c4b7-6a64-44b9-a9d7-de1ffc36ff41'

const arkHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${ARK_API_KEY}`,
}

export async function generateImage(prompt: string): Promise<string> {
  const res = await fetch(`${ARK_BASE}/images/generations`, {
    method: 'POST',
    headers: arkHeaders,
    body: JSON.stringify({
      model: 'doubao-seedream-4-5-251128',
      prompt,
      sequential_image_generation: 'disabled',
      response_format: 'url',
      size: '2K',
      stream: false,
      watermark: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`图片生成失败: ${res.status} ${err}`)
  }

  const data = await res.json()
  const url = data.data?.[0]?.url
  if (!url) throw new Error('未返回图片 URL')
  return url
}

export async function generateVideo(
  prompt: string,
  imageUrl?: string
): Promise<{ taskId?: string; videoUrl?: string; error?: string }> {
  const content: { type: string; text?: string; image_url?: { url: string } }[] = [
    { type: 'text', text: `${prompt}  --duration 5 --camerafixed false --watermark true` },
  ]

  if (imageUrl) {
    content.push({ type: 'image_url', image_url: { url: imageUrl } })
  }

  try {
    const res = await fetch(`${ARK_BASE}/contents/generations/tasks`, {
      method: 'POST',
      headers: arkHeaders,
      body: JSON.stringify({ model: 'doubao-seedance-1-5-pro-251215', content }),
    })

    const data = await res.json()
    if (!res.ok || data.error) {
      return { error: data.error?.message || `视频生成失败: ${res.status}` }
    }
    return { taskId: data.id || data.task_id, videoUrl: data.output?.video_url }
  } catch (e) {
    return { error: e instanceof Error ? e.message : '视频生成请求失败' }
  }
}

export async function queryVideoTask(taskId: string): Promise<{
  status: 'pending' | 'running' | 'succeeded' | 'failed'
  videoUrl?: string
  error?: string
}> {
  const res = await fetch(`${ARK_BASE}/contents/generations/tasks/${taskId}`, {
    method: 'GET',
    headers: arkHeaders,
  })

  const data = await res.json()
  if (!res.ok) return { status: 'failed', error: data.error?.message || '查询失败' }

  return {
    status: data.status || 'pending',
    videoUrl: data.output?.video_url || data.content?.[0]?.url,
  }
}

// ============================================================
// Prompt 构建 — 仙侠主题
// ============================================================

const EMOTION_MAP: Record<HighlightType, { image: string; video: string }> = {
  bond: { image: '温柔微笑、羁绊共鸣、翡翠绿光晕', video: '暖色调柔光，角色深情互动' },
  wit: { image: '嘴角微翘、计谋得逞、灵动眼神', video: '快节奏，角色表情丰富，戏剧张力' },
  growth: { image: '灵光绽放、九叶灵芝显现、翠绿光晕', video: '慢镜头，翡翠绿光效，觉醒时刻' },
  crisis: { image: '瞳孔收缩、剑光凌厉、暗色光影', video: '戏剧性推拉镜头，明暗对比强烈' },
}

export function buildImagePrompt(highlight: Highlight, style: ComicStyle): string {
  const styleInfo = COMIC_STYLES[style]
  const emotion = EMOTION_MAP[highlight.type].image

  return `${styleInfo.prompt}。仙侠修真世界，落霞山脉，灵气弥漫，古风山水意境。
角色：${highlight.characters.map((c) => c.name).join('、')}，仙侠装扮，灵气飘逸。
剧情：${highlight.summary}
情绪：${emotion}
排版：4-6格漫画分镜，黑色分格边框，对话气泡框，高清精致`
}

export function buildVideoPrompt(highlight: Highlight, style: VideoStyle): string {
  const styleInfo = VIDEO_STYLES[style]
  const emotion = EMOTION_MAP[highlight.type].video

  return `${styleInfo.prompt}。仙侠修真世界，落霞山脉，云雾缭绕，灵气弥漫。
剧情：${highlight.summary}
角色：${highlight.characters.map((c) => c.name).join('、')}，仙侠装扮
情绪：${emotion}
镜头：5秒短片，角色表情生动，仙侠氛围`
}

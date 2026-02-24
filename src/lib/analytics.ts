/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 trackEvent 及预定义事件追踪函数
 * [POS]: lib 的数据统计模块，被 store.ts 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// Umami 全局类型
declare global {
  interface Window {
    umami?: {
      track: (name: string, data?: Record<string, string | number>) => void
    }
  }
}

export function trackEvent(name: string, data?: Record<string, string | number>) {
  if (typeof window !== 'undefined' && window.umami) {
    window.umami.track(name, data)
  }
}

// ============================================================
// 预定义事件 — lc_ 前缀
// ============================================================

export function trackGameStart() {
  trackEvent('lc_game_start')
}

export function trackGameContinue() {
  trackEvent('lc_game_continue')
}

export function trackTimeAdvance(day: number, period: string) {
  trackEvent('lc_time_advance', { day, period })
}

export function trackPlayerCreate(gender: string, name: string) {
  trackEvent('lc_player_create', { gender, name })
}

export function trackChapterEnter(chapter: number) {
  trackEvent('lc_chapter_enter', { chapter })
}

export function trackEndingReached(ending: string) {
  trackEvent('lc_ending_reached', { ending })
}

export function trackSceneUnlock(scene: string) {
  trackEvent('lc_scene_unlock', { scene })
}

export function trackNewMoonTrigger() {
  trackEvent('lc_new_moon_trigger')
}

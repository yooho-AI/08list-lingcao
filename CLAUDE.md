# 08list-lingcao — 灵草修仙录 · 修仙文字冒险

React 19 + Zustand 5 + Immer + Vite 7 + Tailwind CSS v4 + Framer Motion + Cloudflare Worker

## 目录结构

```
worker/            - Cloudflare Worker API 代理 (1文件: index.js)
public/            - 静态资源 (audio/ + characters/ + scenes/ 占位)
src/
  main.tsx         - React 挂载入口
  App.tsx          - 根组件: StartScreen(性别选择+姓名输入+3NPC预览) + GameScreen(三栏) + EndingModal(TE/HE/BE/NE)
  lib/             - 核心逻辑层 (8文件: data/store/stream/parser/highlight/analytics/bgm/hooks)
  components/game/ - 游戏 UI 组件 (5文件: dialogue/character/side/mobile/highlight)
  styles/          - 全局样式 (1文件: globals.css, lc-前缀, 暗色仙侠水墨风)
```

## 架构决策

- **异构数值系统**: `StatMeta[]` 元数据驱动，每 NPC 拥有不同维度数值，UI 遍历 statMetas 渲染，零 if/else
- **运行时角色构建**: `buildCharacters(playerGender)` 工厂函数，叶青霜性别与玩家互补，角色存入 state.characters
- **场景解锁**: Scene 携带 `unlockCondition`，`unlockedScenes: string[]` 追踪解锁状态
- **朔月倒计时**: `newMoonCountdown` 初始 15，每日 -1，归零触发朔月之夜强制事件
- **丹辰子觊觎自增**: 从 `statMetas.autoIncrement` 读取，advanceTime 自动 +5
- **SSE 流式**: Cloudflare Worker 代理 → api.yooho.ai，前端 stream.ts 处理
- **CSS 前缀**: `lc-` (灵草)，暗色水墨风 #0f172a 底色 #10b981 主色

## 开发

```bash
npm run dev          # Vite 开发服务器
npm run build        # 生产构建
npx wrangler dev     # Worker 本地调试
```

[PROTOCOL]: 变更时更新此文件，然后检查子目录 CLAUDE.md

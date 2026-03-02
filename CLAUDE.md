# 08list-lingcao — 灵草修仙录 · 修仙文字冒险

React 19 + Zustand 5 + Immer + Vite 7 + Tailwind CSS v4 + Framer Motion + Cloudflare Pages

## 架构

```
08list-lingcao/
├── worker/index.js              - ☆ CF Worker API 代理
├── public/
│   ├── audio/bgm.mp3            - 背景音乐
│   ├── characters/              - 3 角色立绘 9:16 竖版
│   └── scenes/                  - 5 场景背景 9:16 竖版
├── src/
│   ├── main.tsx                 - ☆ React 入口
│   ├── vite-env.d.ts            - Vite 类型声明
│   ├── App.tsx                  - 根组件: 三幕开场(凝灵→初醒→灵名) + AppShell + EndingModal(双按钮)
│   ├── lib/
│   │   ├── script.md            - ★ 剧本直通：五模块原文（零转换注入 prompt）
│   │   ├── data.ts              - ★ UI 薄层：类型(含富消息扩展) + 3角色 + 5场景 + 3道具 + 4章节 + 7强制事件 + 5结局
│   │   ├── store.ts             - ★ 状态中枢：Zustand + 富消息插入(场景/时辰) + 抽屉状态 + StoryRecord + Analytics + 双轨解析
│   │   ├── parser.ts            - AI 回复解析（3角色着色 + 5数值着色 + extractChoices）
│   │   ├── analytics.ts         - Umami 埋点（lc_ 前缀）
│   │   ├── stream.ts            - ☆ SSE 流式通信
│   │   ├── bgm.ts               - ☆ 背景音乐
│   │   └── hooks.ts             - ☆ useMediaQuery / useIsMobile
│   ├── styles/
│   │   ├── globals.css          - 全局基础样式（lc- 前缀，暗色仙侠主题）
│   │   ├── opening.css          - 三幕开场样式：凝灵(灵种+九叶环绕) → 初醒(模糊渐清+叙事) → 灵名(角色创建)
│   │   └── rich-cards.css       - 富UI组件：场景卡 + 时辰卡 + NPC气泡 + DashboardDrawer + RecordSheet + 角色档案 + SVG关系图 + 朔月警告 + Toast
│   └── components/game/
│       ├── app-shell.tsx        - 桌面居中壳 + Header(📓+🎵+☰+📜) + 三向手势 + Tab路由 + TabBar(5键) + DashboardDrawer + RecordSheet + Toast
│       ├── dashboard-drawer.tsx - 修仙手帐(左抽屉)：扉页+朔月倒计时+角色轮播+场景缩略图+修行目标+道具格+迷你播放器。Reorder拖拽排序
│       ├── tab-dialogue.tsx     - 对话Tab：富消息路由(SceneCard/PeriodCard/NPC头像气泡) + 可折叠选项(A/B/C/D) + 背包
│       ├── tab-scene.tsx        - 场景Tab：场景大图(Ken Burns) + 描述 + 地点列表
│       └── tab-character.tsx    - 人物Tab：立绘 + 异构数值条(statMetas驱动) + SVG关系图 + 角色网格 + CharacterDossier全屏档案
├── index.html
├── package.json
├── vite.config.ts               - ☆
├── tsconfig*.json               - ☆
└── wrangler.toml                - ☆
```

★ = 种子文件 ☆ = 零修改模板

## 核心设计

- **仙侠修真 + 三方势力博弈**：1 反派(丹辰子) + 1 盟友(叶青霜) + 1 双面(赤璃)，30天求存
- **异构数值系统**：`StatMeta[]` 元数据驱动，丹辰子(觊觎) / 叶青霜(好感+信任) / 赤璃(好感+同化)，零 if/else
- **暗色仙侠主题**：深蓝底(#0f172a) + 翡翠绿(#10b981)，暗色毛玻璃，lc- CSS 前缀
- **6 时段制**：每天 6 时段（清晨/上午/中午/下午/傍晚/深夜），共 180 时间槽
- **剧本直通**：script.md 存五模块原文，?raw import 注入 prompt
- **朔月倒计时**：15天→0，归零触发朔月之夜强制事件
- **5 结局**：TE + HE + BE + NE × 2，优先级 BE→TE→HE→NE

## 富UI组件系统

| 组件 | 位置 | 触发 | 视觉风格 |
|------|------|------|----------|
| StartScreen Phase1 凝灵 | App.tsx | 未开始 | 黑暗虚空+翡翠核心脉动+九叶灵光环绕(18s公转)+灵气粒子升腾+叙事文字渐显+"睁开双眼"CTA |
| StartScreen Phase2 初醒 | App.tsx | Phase1→ | 山洞背景blur(20px→3px)渐清+暗角+灵脉心跳光晕+6行第一人称叙事(stagger 1.8s)+跳过/继续 |
| StartScreen Phase3 灵名 | App.tsx | Phase2→ | 灵气粒子+性别选择+灵名输入+3NPC预览+翡翠渐变CTA+"返回"导航 |
| DashboardDrawer | dashboard-drawer | Header📓+右滑手势 | 暗色毛玻璃：扉页+朔月倒计时+角色轮播+场景缩略图+修行目标+道具+播放器。Reorder拖拽 |
| RecordSheet | app-shell | Header📜+左滑手势 | 右侧滑入事件记录：时间线倒序+翡翠圆点 |
| SceneTransitionCard | tab-dialogue | selectScene | 场景背景+Ken Burns(8s)+渐变遮罩 |
| PeriodCard | tab-dialogue | 换时辰 | 撕页风滑入+时辰名+章节名 |
| RelationGraph | tab-character | 始终可见 | SVG环形布局，中心"我"+3NPC立绘节点+连线+关系标签 |
| CharacterDossier | tab-character | 点击角色 | 全屏右滑入+50vh立绘呼吸动画+异构数值条 |
| CollapsibleChoices | tab-dialogue | AI回复 | 收起横条/展开A/B/C/D选项卡片 |
| Toast | app-shell | saveGame | TabBar上方弹出2s消失 |
| EndingModal | App.tsx | checkEnding | 渐变背景+双按钮(返回标题+继续探索) |

## 三向手势导航

- **右滑**（任意主Tab内容区）→ 左侧修仙手帐
- **左滑**（任意主Tab内容区）→ 右侧事件记录
- Header 按钮（📓/📜）同等触发
- 手帐内组件支持拖拽排序（Reorder + localStorage `lc-dash-order` 持久化）

## Store 状态扩展

- `activeTab: 'dialogue' | 'scene' | 'character'` — 当前Tab
- `choices: string[]` — AI返回的4个选项
- `showDashboard: boolean` — 左抽屉开关
- `showRecords: boolean` — 右抽屉开关
- `storyRecords: StoryRecord[]` — 事件记录（sendMessage 和 advanceTime 自动追加）
- `selectCharacter` 末尾自动跳转 dialogue Tab

## 富消息机制

Message 类型扩展 `type` 字段路由渲染：
- `scene-transition` → SceneTransitionCard（selectScene 触发）
- `period-change` → PeriodCard（advanceTime 换时辰时触发）
- NPC 消息带 `character` 字段 → 32px 圆形立绘头像

## Analytics 集成

- `trackGameStart` / `trackPlayerCreate` → App.tsx 开场
- `trackGameContinue` → App.tsx 继续游戏
- `trackTimeAdvance` / `trackChapterEnter` → store.ts advanceTime
- `trackNewMoonTrigger` → store.ts 朔月之夜
- `trackSceneUnlock` → store.ts selectScene/advanceTime

[PROTOCOL]: 变更时更新此文件，然后检查子目录 CLAUDE.md

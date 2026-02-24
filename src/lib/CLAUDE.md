# lib/
> L2 | 父级: /CLAUDE.md

灵草修仙录核心逻辑层 — 异构数值数据模型 + 状态管理 + SSE 流式 + 解析渲染。

## 成员清单

```
data.ts      : 类型定义(StatMeta/Character/Scene/Ending) + 3NPC数据(buildCharacters工厂) + 5场景(unlockCondition) + 3道具 + 4章节 + 7强制事件 + 5结局 + 6时段 + 工具函数
store.ts     : Zustand 状态管理，异构数值(Record<string,Record<string,number>>) + 场景解锁 + 朔月倒计时 + 丹辰子觊觎自增 + parseStatChanges动态映射 + buildSystemPrompt仙侠世界观 + 5结局判定
stream.ts    : SSE 流式通信，streamChat(逐token) + chat(完整) → Worker 代理
parser.ts    : AI 回复解析，3NPC颜色映射 + 5数值颜色映射 + 场景/物品/时间解析
highlight.ts : 高光时刻，AI分析(仙侠主题prompt) + 火山方舟Ark生图/生视频 + prompt构建
analytics.ts : Umami 数据统计，lc_ 前缀事件(game_start/player_create/scene_unlock/new_moon等)
bgm.ts       : 背景音乐播放控制
hooks.ts     : React 自定义 hooks
```

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

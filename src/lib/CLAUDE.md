# lib/
> L2 | 父级: /CLAUDE.md

灵草修仙录核心逻辑层 — 异构数值数据模型 + 剧本直通 + 状态管理 + SSE 流式 + 解析渲染。

## 成员清单

```
script.md    : ★ 剧本直通五模块原文（?raw import 注入 buildSystemPrompt）
data.ts      : 类型定义(StatMeta/Character/Scene/Ending/StoryRecord/Message) + 3NPC数据(buildCharacters工厂) + 5场景(unlockCondition) + 3道具 + 4章节 + 7强制事件 + 5结局 + 6时段 + ENDING_TYPE_MAP + STORY_INFO + 工具函数
store.ts     : Zustand 状态管理，剧本直通(GAME_SCRIPT) + 富消息插入(场景/时辰) + extractChoices选项提取 + 异构数值(Record<string,Record<string,number>>) + 场景解锁 + 朔月倒计时 + 丹辰子觊觎自增 + parseStatChanges动态映射 + 5结局判定 + 抽屉/Tab/storyRecords
parser.ts    : AI 回复解析，marked Markdown渲染 + extractChoices(1-4/A-D选项) + parseStoryParagraph(narrative+statHtml+charColor) + 3NPC颜色映射 + 5数值颜色映射
stream.ts    : ☆ SSE 流式通信，streamChat(逐token) + chat(完整) → Worker 代理
analytics.ts : Umami 数据统计，lc_ 前缀事件
bgm.ts       : ☆ 背景音乐播放控制
hooks.ts     : ☆ React 自定义 hooks
```

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

# components/game/
> L2 | 父级: /CLAUDE.md

灵草修仙录游戏 UI 组件层 — 移动优先 Tab+手势+富消息架构。

## 成员清单

```
app-shell.tsx        : 桌面居中壳(430px) + Header(📓+🎵+☰+📜) + 三向手势(左右滑抽屉) + AnimatePresence Tab路由 + TabBar(5键) + RecordSheet + MenuOverlay + Toast
tab-dialogue.tsx     : 对话Tab：富消息路由(SceneCard/PeriodCard/NPC头像气泡/Player/System) + LetterCard欢迎信 + StreamingBubble + CollapsibleChoices(A/B/C/D) + InventorySheet背包 + InputArea
tab-scene.tsx        : 场景Tab：场景大图(Ken Burns动画) + 描述 + 5地点列表(锁定/解锁/当前)
tab-character.tsx    : 人物Tab：立绘(9:16) + 异构数值条(statMetas遍历零if/else) + NPC关系列表 + SVG环形关系图(中心"我"+3NPC立绘) + 3人角色网格 + CharacterDossier全屏档案(呼吸动画立绘+异构数值)
dashboard-drawer.tsx : 修仙手帐(左抽屉)：扉页(天数/时辰/章节/行动力) + 朔月倒计时(脉冲警告) + 角色横向轮播(触摸滑动) + 场景缩略图 + 修行目标 + 道具格 + 迷你播放器。Reorder拖拽排序(localStorage lc-dash-order持久化)
```

## 数据流

- 所有组件从 `@/lib/store` 读状态 + 调用 actions
- 富消息通过 `Message.type` 字段路由渲染：`scene-transition` → SceneCard，`period-change` → PeriodCard
- NPC 消息通过 `Message.character` 字段匹配角色立绘和主题色
- 异构数值通过 `Character.statMetas` 遍历渲染，每角色维度不同

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

# components/game/
> L2 | 父级: /CLAUDE.md

灵草修仙录游戏 UI 组件层 — PC 三栏布局 + 移动端自适应 + 高光弹窗。

## 成员清单

```
character-panel.tsx  : 左侧面板，场景卡片 + 场景选择器(5场景锁定/解锁) + 角色立绘 + 简介 + 异构数值条(statMetas驱动) + 朔月倒计时 + 3NPC单列角色选择
dialogue-panel.tsx   : 中间面板，场景背景 + 遮罩 + Chat Fiction 段落 + 流式显示 + 输入框
side-panel.tsx       : 右侧面板，图标导航栏 52px(🎒背包+💕关系) + 背包滑入面板 260px + 关系总览面板 260px(异构数值: statMetas驱动)
mobile-layout.tsx    : 移动端全屏布局，暗色仙侠风 + 场景锁定/解锁快切 + 朔月倒计时 + Sheet抽屉(3NPC异构数值/背包/菜单) + 4种结局面板
highlight-modal.tsx  : 高光时刻弹窗，AI分析 + 生图 + 生视频，主色#10b981
```

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md

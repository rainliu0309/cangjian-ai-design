# 藏见 CANGJIAN

从收藏里，看见自己。See the patterns behind what you save.

## Problem / Target user
面向反复收藏家居、生活方式灵感，却很难说清共同偏好的年轻用户。收藏保存内容；藏见把内容中的重复线索变成可探索、有证据、可纠正的理解。

## Core flow
首页 → 选择 12 条卧室灵感 / 粘贴自己的收藏 → 原内容在空间中聚拢 → 语义地图 → 点击泡泡查看原收藏与依据 → 很像我 / 不太像我 / 再看看 → 调整地图。

## AI role / Boundary
服务端 Provider 接收本次收藏，输出经校验的 clusters、patterns、tensions。前端以确定性布局把语义关系变成位置、连接、泡泡尺寸。仅推断本组内容中的可能偏好，不定义人格，不产生无依据 ID。无凭据时明确使用本地规则演示；有凭据时请求真实服务，失败不悄悄降级伪装成功。用户确认 Agnes 使用 https://apihub.agnes-ai.com/v1/chat/completions 与 agnes-2.0-flash，采用标准 OpenAI-compatible 请求。

## Visual direction
编辑式中文排版、暖白背景、炭灰文字、极少量朱红强调。透明泡泡使用很薄的虹彩边缘与弧形反光；收藏保持摄影碎片。参考图只提供材质和空气感。桌面用宽幅空间地图、移动端用纵向地图与底部详情 sheet。

## Design tokens
- Canvas #FAF9F6; ink #282C29; muted #737871; line #E6E5DF; accent #FF2442.
- Glass: translucent white, cyan/pink/champagne rim, restrained shadow, no neon.
- Display: Chinese serif + system sans for UI; editorial oversized hero, 14–16px body.
- Radius: 12px content fragments; 24px sheets; organic circular patterns.
- Spacing: 4/8/12/20/32/48/72.

## Motion principles
Framer Motion: scatter → attract → reveal → focus → refine. Loading retains content; cluster destinations only appear after an actual result. 80% calm, 20% magic. Respect reduced motion, accessible focus and keyboard dialogs.

## MVP / Trade-offs
React + TypeScript + Vite; Express AI gateway; localStorage optional session persistence; no database, auth, scraping, or fake Xiaohongshu sync. Text is the model input: sample photographs are editorial illustrations, not image analysis. API keys stay server-side. Ship sample flow, pasted collections, evidence panels, tension, feedback, deterministic spatial layout and error recovery before decorative extras.

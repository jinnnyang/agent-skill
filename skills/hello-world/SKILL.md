---
name: hello-world
description: 一套标准的演示技能，用于展示连续提示原则。它包含 hello、weather 和 news 脚本，以演示多脚本间的弱联系与主动协同引导机制。
---

# Hello World 示例技能

这是一套展示 **Agent Skills 连续提示原则 (Continuous Guidance)** 规范的演示工具集。本例模拟了日常助手在回答用户时的连贯动作引导。

## 包含能力

本技能提供 3 个可执行工具（脚本）：

1. **hello**
   - 用途：向用户打招呼
   - 命令：`pnpm exec tsx scripts/hello.ts`
2. **weather**
   - 用途：获取美国当前天气的模拟数据
   - 命令：`pnpm exec tsx scripts/weather.ts`
3. **news**
   - 用途：获取美国当前新闻的模拟数据
   - 命令：`pnpm exec tsx scripts/news.ts`

## 设计说明：连续提示原则

虽然上述 3 个脚本在逻辑上没有强依赖（解耦），但它们在日常使用场景中具有上下文关联：**打招呼 -> 获取天气 -> 播报新闻**。
为了让智能体能感知此类弱联系，脚本会在执行完毕后，特意在标准输出中尾附“Agent 提示信息”。这样 Agent 在运行完毕后，能够聪明地引导用户进行相关的下一步功能体验。

## 目录结构参考演示

该技能完美符合以下规范文件体系：
- `SKILL.md`: 核心的技能定义以及触发说明
- `scripts/`: 存放所有可执行逻辑和入口 (hello, weather, news)
- `references/`: 通常存放文档（本示例中为空展示版）
- `assets/`: 通常存放静态图文素材
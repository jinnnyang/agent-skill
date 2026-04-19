# Agent Skill | 智能体技能库

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Env: DevContainer](https://img.shields.io/badge/Environment-DevContainer-green.svg)](https://code.visualstudio.com/docs/devcontainers/containers)

[English](./README.md) | **简体中文**

这是一个基于 [Agent Skills 规范](https://agentskills.io) 的多语言智能体技能开发框架。它旨在为 AI 智能体程序提供一套可发现、可掌握、可执行的“能力集合”。

---

受 [anthropics/skills](https://github.com/anthropics/skills) 启发，特别感谢 **Anthropic 团队**。

---

## 🚀 核心理念

### 1. 智能体优先的文档 (AI-First Documentation)
传统的文档是写给人看的。在本仓库中，`SKILL.md` 是写给 **智能体** 看的。它定义了技能的激活场景、输入要求、操作边界，让 AI 能够自主决定“何时”以及“如何”使用这项技能。

### 2. 连续提示机制 (Continuous Guidance Mechanism)
我们的脚本不仅仅是完成单一任务。在执行结束时，它们会通过 `[AGENT GUIDANCE]` 标记输出下一步的操作建议，实现智能体工作流的无缝衔接，极大地减少了 Token 浪费并降低了幻觉。

### 3. 多语言支持
支持基于 TypeScript、Shell 以及 PowerShell 的跨环境开发，并预置了完善的 DevContainer 环境。

---

## 📂 项目结构

```bash
agent-skill/
├── skills/              # 核心业务技能 (Agent 能够直接学习并使用的技能)
│   └── [skill-name]/
│       ├── SKILL.md    # 核心指令：定义触发场景、工具用法及 Guidance
│       └── scripts/    # 执行逻辑：实际完成任务的各种脚本
├── src/                 # 框架源码：加载、验证及管理技能的基础设施
├── .roo/skills/         # 元技能 (Meta-tools)：用于辅助 Agent 自身开发的工具 (如 skill-creator)
├── .devcontainer/      # 开发隔离环境配置
└── tests/               # 自动化测试
```

---

## 🛠️ 命令指南

使用 `pnpm` 管理项目生命周期：

| 命令 | 分类 | 具体用途 |
|------|------|----------|
| `pnpm dev` | **技能预览** | 扫描 `skills/` 并列出所有就绪技能，验证 AI 是否能正确识别。 |
| `pnpm build` | **编译构建** | 将 `src/` 下的 TypeScript 框架代码编译。 |
| `pnpm test` | **质量保障** | 运行单元测试，确保技能逻辑稳健。 |
| `pnpm exec tsx skills/xxx/scripts/yyy.ts` | **直接运行** | 开发者可直接测试具体的技能脚本。 |

---

## 🌟 推荐技能

- **[hello-world](./skills/hello-world)**: 演示“连续提示机制”的基础示例。
- **[cross-wall](./skills/cross-wall)**: 用于在 Linux/Docker 环境下管理 Xray 代理服务的运维技能。
- **[read-repo](./skills/read-repo)**: 高效的代码库读取与上下文提取技能。

---

## 🗺️ 路线图 (Roadmap)

- [ ] 支持更多编程语言的基础模板 (Python, Go)
- [ ] 增强技能自检工具，自动评估 `SKILL.md` 的指令质量
- [ ] 集成到主流 Agent 框架的 MCP (Model Context Protocol) 插件

## 🤝 贡献规范

1. **遵循规范**: 确保所有新技能都符合 `AGENTS.md` 中的设计规范。
2. **渐进式披露**: 指令应简洁明了，详细信息尽量放在 `references/` 中。
3. **保持 Guidance**: 所有脚本应包含 `[AGENT GUIDANCE]` 以支持工作流衔接。

---

## 📄 开源协议

本项目采用 [MIT License](./LICENSE) 进行开源。

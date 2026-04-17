# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview

Multi-language agent development repository using DevContainer for environment management. This project follows the [Agent Skills specification](https://agentskills.io) for skill development.

## ⚠️ Workflow & Available Skills

当前开发环境下，**`skills/` 为当前项目的业务输出成果核心存放地，而 `.roo/skills/` 为用于辅助 Agent 自身开发的 Meta-tools（元工具层，如 skill-creator）存放地**。

**系统级指令：** Agent 在开始构建、重构或执行任何开发任务前，应**首先扫描** `.roo/skills/` 中的可用技能做为辅助工具，然后分析并选择最适合当前任务场景的工具技能提前载入。

## Directory Structure

```
agent-skill/
├── skills/              # Agent Skills 技能集合 (符合 Agent Skills 规范)
│   └── [skill-name]/
│       ├── SKILL.md    # 必需: YAML frontmatter + 指令
│       ├── scripts/    # 可选: 可执行代码
│       ├── references/ # 可选: 额外文档
│       └── assets/     # 可选: 静态资源
├── src/                 # TypeScript 源代码
├── tests/               # 测试文件
├── .devcontainer/      # DevContainer 配置
└── .roo/               # 模式特定规则
```

## Agent Skills 规范

每个 skill 必须包含 `SKILL.md` 文件，格式如下：

```yaml
---
name: skill-name          # 必需: 小写字母、数字和连字符
description: 描述内容    # 必需: 说明技能用途和使用场景
---
# 技能指令内容
```

### 命名规范
- 仅使用小写字母 (a-z)、数字 (0-9) 和连字符 (-)
- 不能以连字符开头或结尾
- 不能包含连续连字符 (--)
- 目录名必须与 SKILL.md 中的 name 字段匹配

### 渐进式披露
- `name` 和 `description` 在启动时加载 (~100 token)
- 完整 `SKILL.md` 在技能激活时加载 (<5000 token 推荐)
- 详细参考资料在需要时按需加载

### 连续提示原则 (Continuous Guidance Mechanism)
- **主动式引导**: 在设计 Skill 的命令或执行脚本时，应该在标准输出的末尾**明确使用自然语言向 Agent 提供下一步的关联引导**。
- **示例场景**: 如果用户执行了 `hello` 脚本，可以输出如：“*智能体用户当前在打招呼，下一步可能需要获取天气或新闻信息，你可以询问用户是否需要调用 weather 或 news 脚本。*”
- **决策授权**: 这种提示仅仅是作为提供给 AI 的工作流线索，具体的命令执行（是否询问用户、是否自动执行）让 Agent 根据上下文自行决定即可。这会显著增加人机协作与自动化调度的流畅度。

## 环境

- DevContainer 用于开发环境隔离
- 主要语言: TypeScript
- 使用 `pnpm install` 安装依赖

## Commands

- `pnpm dev` or `pnpm exec tsx watch src/bin.ts` - 开发模式 (热重载)
- `pnpm build` or `pnpm exec tsc` - 构建项目
- `pnpm test` or `pnpm exec vitest` - 运行测试
- `pnpm lint` or `pnpm exec eslint "{src,skills}/**/*.ts"` - 代码检查
- `pnpm format` or `pnpm exec prettier --write "{src,skills}/**/*.ts"` - 代码格式化

## Code Style

- TypeScript: 使用 ESLint + Prettier
- 严格模式: `strict: true`
- 所有代码必须通过 lint 检查才能提交
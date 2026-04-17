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

### 脚本设计原则

**脚本的唯一价值是用程序自动完成任务，而不是输出文字说明。**

- `scripts/` 目录下的代码必须包含**实际的程序逻辑**：文件操作、网络请求、进程管理、数据处理、系统调用等
- 纯文字输出不是脚本的职责——如果只需要向 Agent 传达操作步骤，请写在 `SKILL.md` 中
- **自检标准**：删除脚本中所有 `console.log` / `print` 行后，脚本是否仍然执行了有意义的操作？如果答案是"否"，则这个脚本**不应该存在**

> ⛔ **反模式**：整个脚本全是 `console.log("请执行步骤1... 步骤2... 步骤3...")`——这是在浪费 Token 和计算资源，这些文字直接写在 SKILL.md 里即可，无需创建脚本。
>
> ✅ **正确做法**：脚本直接用代码执行步骤 1、2、3，自动完成任务，输出执行结果。

### 连续提示机制 (Continuous Guidance Mechanism)

连续提示是一种**末尾追加**技巧，绝非脚本的主体内容。

- **位置**：脚本在完成实际任务后，在标准输出的**最末尾**追加 `[AGENT GUIDANCE]` 标记的引导提示
- **占比**：引导文本限制在 1~3 行，不应超过脚本总输出的 10%
- **目的**：为接管脚本输出的 Agent 提供下一步操作线索（工作流衔接），而非替代脚本执行任务
- **决策授权**：这种提示仅作为工作流线索，具体是否执行由 Agent 根据上下文自行决定
- **参考实现**：`skills/hello-world/scripts/` —— 每个脚本先完成实际工作（系统信息采集、天气 API 调用、新闻拉取），末尾附加一行引导

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
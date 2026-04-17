# Agent Skill

智能体开发仓库，基于 [Agent Skills 规范](https://agentskills.io)。

## 项目结构

```
agent-skill/
├── skills/              # Agent Skills 技能集合
│   └── [skill-name]/
│       ├── SKILL.md    # 必需: YAML frontmatter + 指令
│       ├── scripts/    # 可选: 可执行代码
│       ├── references/ # 可选: 额外文档
│       └── assets/     # 可选: 静态资源
├── src/                 # TypeScript 源代码
├── tests/               # 测试文件
├── .devcontainer/      # DevContainer 配置
├── .roo/               # 模式特定规则
└── package.json
```

## 快速开始

### 环境要求

- Node.js 20+
- Docker (用于 DevContainer)

### 安装

```bash
pnpm install
```

### 开发命令

| 命令 | 说明 | 直接运行 (npx) |
|------|------|----------------|
| `pnpm dev` | 开发模式 (热重载) | `pnpm exec tsx watch src/bin.ts` |
| `pnpm build` | 构建项目 | `pnpm exec tsc` |
| `pnpm test` | 运行测试 | `pnpm exec vitest` |
| `pnpm lint` | 代码检查 | `pnpm exec eslint "{src,skills}/**/*.ts"` |
| `pnpm format` | 代码格式化 | `pnpm exec prettier --write "{src,skills}/**/*.ts"` |

## 创建新 Skill

在 `skills/` 目录下创建新目录，添加 `SKILL.md` 文件：

```yaml
---
name: my-skill
description: 技能描述，说明用途和使用场景
---
# 技能指令内容
```

## DevContainer

使用 VS Code 打开项目会自动提示使用 DevContainer，点击 "Reopen in Container" 即可。

## 参考

- [Agent Skills 规范](https://agentskills.io)
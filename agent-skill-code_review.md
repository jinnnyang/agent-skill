# Agent Skill 项目代码评审报告

> 评审对象：`c:\Users\jinnn\Desktop\agent-skill`
> 评审时间：2026-04-17

---

## 总体评价

项目脚手架 **基本可用**，目录结构清晰、TypeScript 编译通过、ESLint 仅有预期的 `no-console` warning。但存在若干 **关键遗漏** 和 **设计层面的问题**，如果直接用于实际开发会踩坑。

下面按 🔴 严重 / 🟡 中等 / 🟢 建议 三级列出。

---

## 🔴 严重问题

### 1. 缺少 `.gitignore`

项目根目录 **没有 `.gitignore` 文件**。`node_modules/`（140 KB+ 的 `package-lock.json` 可知依赖量不小）和 `dist/` 产物都会被提交进 Git。

**修复：** 添加标准 Node.js `.gitignore`：

```gitignore
node_modules/
dist/
*.tgz
.env
.DS_Store
```

---

### 2. 规范网址写错：`agentskill.io` → `agentskills.io`

项目中 **所有引用**（[AGENTS.md](file:///c:/Users/jinnn/Desktop/agent-skill/AGENTS.md)、[README.md](file:///c:/Users/jinnn/Desktop/agent-skill/README.md)）都链接到 `https://agentskill.io`（无 s），但 Agent Skills 官方规范地址是 **`https://agentskills.io`**。

涉及文件：
- `AGENTS.md` L7
- `README.md` L3, L63

---

### 3. README 引用了不存在的文件

[README.md L64](file:///c:/Users/jinnn/Desktop/agent-skill/README.md#L64) 引用了 `skill-creation/best-practices.md`，但该路径在项目中 **根本不存在**。

```markdown
- [Skill 最佳实践](skill-creation/best-practices.md)   ← 死链接
```

**修复：** 删除该行，或创建对应文档。

---

### 4. `tests/` 目录为空 —— 零测试覆盖

`tests/` 目录内仅有一个 placeholder README，没有任何测试文件。`package.json` 配了 Vitest，但没有一个 `.test.ts` 文件。

> [!CAUTION]
> 项目声称"所有代码必须通过 lint 检查才能提交"，却没有任何测试用例来验证核心功能 (`registerSkill`, `getSkills`, `findSkill`)。

**修复：** 至少为 `src/index.ts` 中导出的三个函数写单元测试。

---

## 🟡 中等问题

### 5. `src/index.ts` 存在设计缺陷

```typescript
// 文件级副作用
const skills: Skill[] = [];             // ① 模块级可变状态
registerSkill({ name: 'hello-world' ... });  // ② 导入即执行副作用
main();                                      // ③ 导入即打印
```

**问题列表：**

| # | 问题 | 影响 |
|---|------|------|
| ① | 模块级 mutable 单例 | 测试时无法 reset，多次 import 共享脏状态 |
| ② | `registerSkill()` 在模块加载时立即执行 | 任何 `import { findSkill } from './index'` 都会注册 hello-world |
| ③ | `main()` 在模块加载时立即执行 | 被当作 library 导入时会打印到 stdout |
| ④ | 没有 `export` `main` 函数 | 无法做集成测试 |
| ⑤ | 没有清除/重置 skills 的方法 | 测试隔离困难 |

**建议重构方向：**
- 将 `skills` 数组封装进 class 或闭包，提供 `reset()` 方法
- 用 `if (import.meta.url === ...)` 或单独的 `bin.ts` 入口来控制 `main()` 调用
- 把示例注册移到 demo 脚本中

---

### 6. Prettier `endOfLine: "lf"` 与 Windows 开发环境冲突

[.prettierrc](file:///c:/Users/jinnn/Desktop/agent-skill/.prettierrc) 设置了 `"endOfLine": "lf"`，但当前开发环境是 Windows。实际文件检查发现 **所有文件都使用 `\r\n` (CRLF)**，与配置矛盾。

运行 `npm run format` 时会批量将文件换行符改为 LF，可能导致 Git diff 噪声。

**修复选项：**
- 保持 `"lf"` 但配合 `.gitattributes` 中 `* text=auto eol=lf`
- 改为 `"endOfLine": "auto"` 容忍混合环境

---

### 7. ESLint 使用即将淘汰的配置格式

项目使用 ESLint 8 + `.eslintrc.json` 格式。ESLint 8 已于 2024-10 进入 EOL，推荐迁移到 **ESLint 9 + flat config** (`eslint.config.mjs`)。

同时 `@typescript-eslint/eslint-plugin` v6 也已过时 (当前主线 v8)。

> [!WARNING]
> 如果后续升级 ESLint 到 v9，当前 `.eslintrc.json` 将完全不被识别。

---

### 8. `.roo/` 四个模式规则文件高度重复

| 文件 | 行数 | 独特内容 |
|------|------|----------|
| `rules-architect/AGENTS.md` | 35 | 架构组件列表 |
| `rules-code/AGENTS.md` | 31 | 编码风格指南 |
| `rules-ask/AGENTS.md` | 30 | 项目结构摘要 |
| `rules-debug/AGENTS.md` | 26 | 调试命令参考 |

四个文件中 "项目结构 / 技术栈 / 命令列表" 部分 **几乎逐行复制粘贴**。这违反了 DRY 原则，更新时容易遗漏同步。

**建议：** 将公共内容保留在根 `AGENTS.md`，各模式文件只写 **差异化指令**。

---

### 9. DevContainer 配置简陋

[devcontainer.json](file:///c:/Users/jinnn/Desktop/agent-skill/.devcontainer/devcontainer.json) 仅使用了基础镜像 + 3 个 VS Code 扩展。缺少：

- `forwardPorts` 未配（只配了 `portsAttributes`）
- 没有 `Dockerfile` 做自定义构建
- 没有配 `remoteUser`
- AGENTS.md 提到"Multi-language"，但 DevContainer 只装了 Node.js

这对一个声称支持多语言的仓库来说不够。

---

## 🟢 建议改进

### 10. `hello-world` skill 缺少可选子目录

根据 Agent Skills 规范，一个完整的示例 skill 应该展示所有约定目录：

```
skills/hello-world/
├── SKILL.md        ✅ 已有
├── scripts/        ❌ 缺少 (应至少放个示例脚本)
├── references/     ❌ 缺少
└── assets/         ❌ 缺少
```

作为模板项目，hello-world 应该演示完整结构，哪怕是空目录 + `.gitkeep`。

---

### 11. `package.json` 缺少 `engines` 字段

README 要求 `Node.js 20+`，但 `package.json` 没有声明 `engines`：

```json
"engines": {
  "node": ">=20.0.0"
}
```

---

### 12. 缺少 `npm run lint` 对 skills/ 的覆盖

当前 lint 命令只检查 `src/`：

```json
"lint": "eslint src --ext .ts"
```

如果 `skills/` 下的 `scripts/` 目录将来包含 `.ts` 文件，不会被 lint 到。

---

### 13. 依赖版本偏旧

| 包 | package.json 声明 | 实际安装 | 当前最新主线 |
|----|-------------------|----------|-------------|
| `typescript` | `^5.3.0` | 5.9.3 | 5.9.x ✅ |
| `eslint` | `^8.55.0` | 8.57.1 | **9.x** |
| `@typescript-eslint/*` | `^6.15.0` | 6.21.0 | **8.x** |
| `vitest` | `^1.1.0` | 1.6.1 | **3.x** |

`typescript` 因 caret range 自动升到了较新版本，但其余工具链明显落后。

---

## 汇总评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 目录结构 | ⭐⭐⭐⭐ | 符合规范，层级清晰 |
| 规范合规性 | ⭐⭐⭐ | SKILL.md 格式正确，但 URL 错误、示例不完整 |
| 代码质量 | ⭐⭐ | 编译通过但架构有硬伤（模块级副作用） |
| 工程化配置 | ⭐⭐ | 缺 `.gitignore`、ESLint 过时、无测试 |
| 文档 | ⭐⭐⭐ | README 可用但有死链接 |
| DevContainer | ⭐⭐ | 能用但过于简陋 |
| **总体** | **⭐⭐½ / 5** | **脚手架框架在，细节还需打磨** |

---

## 建议修复优先级

```mermaid
graph LR
    A["🔴 P0: .gitignore"] --> B["🔴 P0: 修复死链接"]
    B --> C["🔴 P0: 添加基础测试"]
    C --> D["🟡 P1: 重构 index.ts"]
    D --> E["🟡 P1: 修复 endOfLine"]
    E --> F["🟡 P2: 升级工具链"]
    F --> G["🟢 P3: 完善示例 skill"]
```

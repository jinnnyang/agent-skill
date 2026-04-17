---
name: hello-world
description: 一套标准的演示技能，用于展示脚本设计铁律与连续提示原则。包含 hello（系统信息采集）、weather（天气 API 调用）和 news（新闻 API 拉取）三个脚本，演示如何编写执行真实任务的技能脚本。
---

# Hello World 示例技能

这是一套展示 **Agent Skills 脚本设计规范** 的参考实现。每个脚本都执行真实的程序操作，并在末尾追加少量连续提示。

## 包含能力

本技能提供 3 个可执行工具（脚本）：

1. **hello** — 系统信息采集
   - 使用 Node.js `os` 模块获取主机名、平台、CPU、内存、运行时间等真实数据
   - 命令：`pnpm exec tsx skills/hello-world/scripts/hello.ts`

2. **weather** — 天气 API 调用
   - 调用 [wttr.in](https://wttr.in) 免费 API（无需 Key）获取真实天气数据
   - 命令：`pnpm exec tsx skills/hello-world/scripts/weather.ts [城市名]`

3. **news** — 新闻 API 拉取
   - 调用 [Hacker News API](https://github.com/HackerNews/API) 获取真实热门科技新闻
   - 命令：`pnpm exec tsx skills/hello-world/scripts/news.ts [条数]`

## 设计说明：为什么这样写

这三个脚本是 AGENTS.md 中**脚本设计原则**的参考实现：

| 脚本 | 实际程序逻辑 | 连续提示 |
|---|---|---|
| hello.ts | `os.hostname()`, `os.cpus()`, `os.totalmem()` 等系统调用 | 末尾 1 行 |
| weather.ts | `fetch()` 调用 wttr.in API + JSON 解析 | 末尾 1 行 |
| news.ts | `fetch()` 调用 HN API + 并发请求 + 数据聚合 | 末尾 1 行 |

**自检标准**：删除所有 `console.log` 后，每个脚本仍然执行了有意义的操作（系统调用、网络请求、数据处理）。

## 目录结构

```
hello-world/
├── SKILL.md          # 技能定义与使用说明
├── scripts/
│   ├── hello.ts      # 系统信息采集
│   ├── weather.ts    # 天气 API 调用
│   └── news.ts       # 新闻 API 拉取
├── references/       # 文档（本示例为空）
└── assets/           # 静态资源
```
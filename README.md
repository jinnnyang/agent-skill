# Agent Skill

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Env: DevContainer](https://img.shields.io/badge/Environment-DevContainer-green.svg)](https://code.visualstudio.com/docs/devcontainers/containers)

**English** | [简体中文](./README_zh-CN.md)

A multi-language development framework for **Agent Skills**, built on the [Agent Skills specification](https://agentskills.io). This repository provides a standardized, discoverable, and executable "arsenal" for AI agents to enhance their operational capabilities.

---

Inspired by [anthropics/skills](https://github.com/anthropics/skills). Special thanks to the **Anthropic team**.

---

## 🚀 Core Philosophy

### 1. AI-First Documentation
Traditional READMEs are for humans. In this repository, `SKILL.md` is for **AI Agents**. It defines activation scenarios, input requirements, and operational boundaries, enabling the agent to autonomously decide *when* and *how* to use a skill.

### 2. Continuous Guidance Mechanism
Our scripts don't just "finish." At the end of execution, they provide actionable next-step suggestions via the `[AGENT GUIDANCE]` tag. This ensures seamless workflow transitions, reduces token waste, and minimizes hallucinations.

### 3. Multi-Language & Environment Ready
Built for TypeScript, Shell, and PowerShell. Comes pre-configured with a hardened DevContainer for immediate, isolated development.

---

## 📂 Project Structure

```bash
agent-skill/
├── skills/              # Business Skills (Core capabilities for the Agent)
│   └── [skill-name]/
│       ├── SKILL.md    # Instructions: Definitions, usage, and guidance
│       └── scripts/    # Execution: Functional code (TS, Shell, etc.)
├── src/                 # Framework: Loader and management infrastructure
├── .roo/skills/         # Meta-tools: Internal tools for Agent's own development
├── .devcontainer/      # Development environment configuration
└── tests/               # Automation tests (Vitest)
```

---

## 🛠️ Command Guide

Manage the repository lifecycle using `pnpm`:

| Command | Category | Usage |
|------|------|----------|
| `pnpm dev` | **Preview** | Scans `skills/` and lists all ready skills. |
| `pnpm build` | **Build** | Compiles the TypeScript framework code to `dist/`. |
| `pnpm test` | **Test** | Runs unit tests (Vitest) to ensure robustness. |
| `pnpm lint` | **Lint** | Enforces code style and best practices. |
| `pnpm format` | **Format** | Automatically fixes code style issues. |

---

## 🌟 Featured Skills

- **[hello-world](./skills/hello-world)**: The baseline example demonstrating the "Continuous Guidance" flow.
- **[cross-wall](./skills/cross-wall)**: DevOps skill for managing Xray proxy services in Linux/Docker environments.
- **[read-repo](./skills/read-repo)**: High-performance repository analysis and context extraction.

---

## 🗺️ Roadmap

- [ ] Support for more language templates (e.g., Python, Go)
- [ ] Automated instruction quality assessment for `SKILL.md`
- [ ] Deep integration with Model Context Protocol (MCP) for major Agent frameworks

## 🤝 Contribution

1. **Follow the Spec**: Ensure all new skills adhere to the guidelines in [AGENTS.md](./AGENTS.md).
2. **Progressive Disclosure**: Keep instructions concise; move deep details to `references/`.
3. **Guidance at End**: Always include a `[AGENT GUIDANCE]` tag in script outputs to support continuous workflows.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
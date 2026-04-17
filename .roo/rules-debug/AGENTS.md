# AGENTS.md - Debug Mode

This file provides debugging-specific guidance for agents working in this repository.

## Debugging Setup

- 使用 VS Code 内置调试器配置 `.vscode/launch.json`
- 检查编译错误: `pnpm typecheck` 或 `npx tsc --noEmit`
- 在 DevContainer 中调试时，使用 `Attach to Container` 方案

## Common Issues

- 如果更改了环境配置，重新构建 DevContainer
- 模块导入错误: 检查 `tsconfig.json` 的 `moduleResolution`
- TS 类型问题: 确保安装了对应 `@types` 包
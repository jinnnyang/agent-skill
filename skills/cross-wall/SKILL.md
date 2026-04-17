---
name: cross-wall
description: 科学上网助手。用于受限网络环境或 Docker 之中翻墙，提供包括自动下载节点底层组件、配置修改、后台起停代理进程、状态排查在内的一站式 CLI 工具。
---

# Cross Wall 技能指令

这是一个用于在本地（含 Docker 等受限终端环境）部署、启动、管理和配置 Xray 代理以实现科学上网（翻墙）的系统管理技能。

本技能通过完整的子命令提供从零到一的网络护航能力。所有子命令均遵循一致的命令行风格，并且严格符合**脚本设计铁律**，即脚本代替人执行具体操作，并在任务完毕时提供极少量的流转提示。

## 典型操作流程

遇到任何“网络连接超时”、“由于网络受限拉取失败”的情况时，按以下操作：

1. **环境准备**：执行 `setup` 进行初始化。
2. **配置选择**：根据部署侧需求（客户端/服务端），阅读引导文档并参考 `references/examples/` 选择合适的模板。
3. **协议构建**：Agent 使用自带的写入工具将获得的代理节点信息填写进 `.config.json` 文件（若文件已存在，除非明确要求，否则视为有效配置）。
4. **服务管理**：使用 `start` 启动隧道并验证，任务结束使用 `stop` 安全清理。

## 子命令使用详述

基础调用格式：`pnpm exec tsx <cross-wall-skill-path>/scripts/cross-wall.ts <command> [args]`

### 1. `setup` - 环境初始化下载
- **智能策略**：
    - 无参数且本地无 Xray：进入交互模式。
    - 仅有 `--force`：无视本地状态，进入交互模式以重新选择版本。
    - 指定 `--version <v>`：直接安装指定版本，不进入交互。
    - 指定 `-y` / `--yes`：直接安装默认稳定版 (`v26.3.27`)，不进入交互。
- **清理机制**：
    - 运行前彻底清理 `assets/` 旧文件。
    - 运行后自动删除下载的压缩包。
```bash
# 场景 A: 初次安装 (交互式)
pnpm exec tsx <cross-wall-skill-path>/scripts/cross-wall.ts setup

# 场景 B: 强制静默更新至特定版本
pnpm exec tsx <cross-wall-skill-path>/scripts/cross-wall.ts setup --force --version v26.3.27

# 场景 C: 强制静默覆盖为稳定版
pnpm exec tsx <cross-wall-skill-path>/scripts/cross-wall.ts setup --force -y
```

### 2. `config` - 配置修改器
- 采用 JSON 路径修改模式（如 `config inbounds.0.port=10808`）。
- **关键指引**：
    - **客户端**：预读 `<cross-wall-skill-path>/references/document/level-0/ch08-xray-clients.md`。
    - **服务端**：预读 `<cross-wall-skill-path>/references/document/level-0/ch07-xray-server.md`。
- **配置策略**：Agent 应先通过文档引导用户做**选择题**（如：协议选择、传输模式），锁定大方向后再进行细节填空。

### 3. 其他生命周期命令
- `start`: 启动 Xray 守护进程。
- `status`: 连通性探针及运行状态。
- `stop`: 清理进程与 PID 文件。

## 配置参考与进阶探索

### 案例库 (Reference Examples)
本技能随附大量针对 REALITY, CDN, gRPC 等场景的预设模板在 `<cross-wall-skill-path>/references/examples/`。Agent 应优先引导用户在案例库中找到最近似的方案。

### 兜底流程
若遇到未涵盖的用法，鼓励探索 Xray 原生命令：
```bash
# 获取 Xray 核心帮助
pnpm exec tsx <cross-wall-skill-path>/scripts/cross-wall.ts <xray-binary-path> -h
```
（Agent 可通过 `start` 或 `status` 的输出定位二进制文件夹）。

---
**[AGENT GUIDANCE]**：
- 若 `.config.json` 已存在，遵循“已有即正确”原则，直接 `start` 即可。
- 只有在执行 `setup` 需要自动化（非交互）时，才必须显式携带 `--version` 或 `-y` 参数。

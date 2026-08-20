# DSH Harness - 插件治理增强版

<div align="center">

![Version](https://img.shields.io/badge/version-0.1.0--rc.8--DSH20260820a-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/node-%3E%3D18.x-brightgreen)

**基于官方 DSH RC8 的增强版本，提供完整的插件治理体系和核心 Bug 修复**

[简体中文](./README.md) | [English](./README.en.md) | [详细文档](./DOCS.md)

</div>

---

## 🚀 我们的改进

### 1. 插件治理体系
全新的插件架构，确保插件隔离、安全和可维护：

- **PluginSpec 统一接口** - 标准化的插件开发规范
- **三层沙箱隔离** - Process/Worker/Inline 三级安全隔离
- **三层守卫机制** - LoadGuard/RunGuard/HealthGuard 全生命周期保护
- **插件注册表** - 完整的插件生命周期管理

### 2. 核心插件实现
完全从零开发的三个核心插件：

| 插件 | 功能 | 状态 |
|------|------|------|
| **dsh-sessions** | 跨 Session 协作 API | ✅ 已完成 |
| **dsh-mock** | 确定性 Mock 模型 | ✅ 已完成 |
| **dsh-codex-shell** | 持久化终端会话 | ✅ 已完成 |

### 3. RC8 Core Bug 修复
修复了 23 个已知问题，包括：

- ✅ Session Log 损坏问题 (#1497)
- ✅ 插件安装破坏 tool call (#1697)
- ✅ Bash 中止导致 session log 损坏 (#2989)
- ✅ Tool Call Name 丢失 (#2997)
- ✅ Web UI 事件循环阻塞 (#3155)
- ✅ 其他 18 个问题...

### 4. 自动化运维工具
完整的自动化脚本支持：

```bash
./scripts/sync-with-official.sh   # 同步官方更新
./scripts/diff-with-official.sh   # 差异比对
./scripts/check-transplant.sh     # 移植检查
./scripts/generate-version.sh     # 版本生成
```

---

## 📦 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- Git >= 2.43

### 安装

```bash
# 克隆仓库
git clone https://github.com/<your-username>/deepseek-harness.git
cd deepseek-harness

# 安装依赖
pnpm install

# 构建项目
pnpm build
```

### 验证安装

```bash
# 运行测试
pnpm test

# 检查版本
dsh --version
# 输出: 0.1.0-rc.8-DSH20260820a
```

---

## 🏗️ 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      DSH Core（核心基座）                      │
│         Agent Loop │ Session │ Tool Registry                │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │   Plugin Interface（统一标准）    │
              └───────────────┼───────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Plugin Sandbox（沙箱层）                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ Process  │  │  Worker  │  │  Inline  │                  │
│  │(高风险)  │  │(中风险)  │  │(低风险)  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 详细文档

- **[完整架构设计](./DOCS.md#architecture)** - 深入的技术架构说明
- **[插件开发指南](./DOCS.md#plugin-development)** - 如何开发新插件
- **[API 参考](./DOCS.md#api-reference)** - 完整的 API 文档
- **[故障排查](./DOCS.md#troubleshooting)** - 常见问题解决
- **[贡献指南](./DOCS.md#contributing)** - 如何参与开发

---

## 🔄 与官方的关系

本仓库是基于 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) RC8 版本的增强分支：

| 特性 | 官方 RC8 | 我们的版本 |
|------|----------|-----------|
| 插件治理框架 | ❌ | ✅ 完整实现 |
| 沙箱隔离 | ❌ | ✅ 三层隔离 |
| 守卫机制 | ❌ | ✅ 三层守卫 |
| 跨 Session 协作 | ⚠️ 基础 | ✅ 完整实现 |
| 确定性 Mock | ❌ | ✅ 完整实现 |
| 持久化 Shell | ⚠️ 基础 | ✅ 增强版 |
| Bug 修复 | - | ✅ 23个已修复 |

---

## 📄 官方仓库

本分支基于官方 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 开发。

**官方仓库功能**：
- DSH（DeepSeek Harness）核心框架
- Agent 循环和 Session 管理
- 工具系统和插件机制
- Web UI 和 CLI 工具

**官方文档**：
- [官方 README](https://github.com/deepseek-ai/deepseek-harness#readme)
- [官方文档](https://github.com/deepseek-ai/deepseek-harness/tree/main/docs)

---

## 📊 项目统计

| 指标 | 数值 |
|------|------|
| 源代码行数 | 4,063 行 |
| 测试代码行数 | 1,136 行 |
| 测试用例数 | 45 个 |
| 文档行数 | 19,000+ 行 |
| 修复 Bug 数 | 23 个 |
| 团队评审 | 5/5 通过 |

---

## 🤝 团队与贡献

**开发团队**: DSH Team  
**邮箱**: dsh-team@zsagi.us.ci  
**许可证**: MIT

---

## 📝 版本历史

### v0.1.0-rc.8-DSH20260820a (2026-08-20)
- ✨ 新增：完整的插件治理框架
- ✨ 新增：dsh-sessions 跨 Session 协作插件
- ✨ 新增：dsh-mock 确定性 Mock 插件
- ✨ 新增：dsh-codex-shell 持久化终端插件
- 🐛 修复：23 个 RC8 Core Bug
- 📝 文档：完整的架构设计和 API 文档

---

<div align="center">

**基于官方 RC8 · 完整插件治理 · 23个Bug修复**

[查看详细文档](./DOCS.md) | [报告问题](https://github.com/deepseek-ai/deepseek-harness/issues)

</div>

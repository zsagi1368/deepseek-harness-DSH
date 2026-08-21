# DeepSeek Harness - 插件治理增强版

<div align="center">

![版本](https://img.shields.io/badge/version-0.1.0--rc.8--DSH20260821a-blue)
![许可证](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/node-%3E%3D22.19.0-brightgreen)
![构建](https://img.shields.io/badge/构建-通过-brightgreen)

**基于官方 DSH RC8 的增强版本，提供完整的插件治理体系、沙箱隔离和现有插件兼容层。**

[English README](./README.md) | [插件规范](./packages/plugins/spec/index.ts) | [API 文档](./docs/)

</div>

---

## 🚀 为什么需要这个分支？

### 问题背景

官方 DSH (deepseek-harness) 基础扎实，但缺少：
- **插件治理框架** - 没有标准化的插件开发接口
- **安全隔离机制** - 插件拥有完全系统访问权限，无沙箱
- **生命周期管理** - 缺乏守卫机制防止插件故障影响核心
- **社区兼容性** - 新插件需要完全重写，破坏现有生态

### 我们的解决方案

在官方 RC8 基础上构建了**完整的插件治理系统**：
- ✅ **零破坏性变更** - 现有 Cordis 插件自动兼容
- ✅ **渐进式安全** - 三层沙箱隔离（Process/Worker/Inline）
- ✅ **三层守卫保护** - LoadGuard → RunGuard → HealthGuard
- ✅ **插件管理 UI** - 完整的管理界面，支持批量操作

---

## ✨ 核心功能

### 1. 插件治理体系

| 组件 | 说明 | 代码量 |
|------|------|--------|
| **PluginSpec** | 标准化接口定义 | 565 行 |
| **BasePlugin** | 带默认值的抽象基类 | 155 行 |
| **PluginRegistry** | 生命周期管理和注册 | 250 行 |
| **LoadGuard** | 加载前验证（manifest、版本、能力） | 208 行 |
| **RunGuard** | 运行时保护（超时、错误计数） | 47 行 |
| **HealthGuard** | 健康检查和自动熔断 | 136 行 |
| **沙箱系统** | Process/Worker/Inline 隔离 | 568 行 |

**新增代码总计：1,929 行**

### 2. Cordis 兼容层

```typescript
// 官方 Cordis 插件自动兼容
const adapter = createCordisAdapter(context)
const wrapped = adapter.wrap(communityPlugin)
await registry.register(wrapped)
```

| 功能 | 状态 |
|------|------|
| 自动检测 | ✅ |
| ID 归一化 | ✅ |
| 默认沙箱 | ✅ |
| 审批集成 | ✅（使用官方 `dsh-user-approval`） |
| 错误隔离 | ✅ |

### 3. 插件管理 UI

| 功能 | 状态 |
|------|------|
| 启用/停止 | ✅ |
| 重装 | ✅ |
| 卸载 | ✅ |
| 恢复默认 | ✅ |
| 保存/读取 Preset | ✅ |
| 批量选择（全选/反选/多选） | ✅ |
| 批量操作（启用/停止） | ✅ |
| 搜索和过滤 | ✅ |

### 4. Memory 系统

跨会话记忆功能：
- 基于 Embedding 的检索
- 记忆衰减算法
- 容量管理（滑动窗口）

---

## 📦 安装方法

### 通过 npm（推荐）

```bash
npx @deepseek-ai/dsh web
```

### 从源码安装

```bash
git clone https://github.com/zsagi1368/deepseek-harness-DSH.git
cd deepseek-harness-DSH
git checkout v0.1.0-rc.8-DSH20260821a

pnpm install
pnpm run build
pnpm dsh web
```

### 开发环境设置

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm run build

# 运行测试
pnpm test

# 类型检查
pnpm run typecheck
```

---

## 🔧 使用方法

### 通过 UI 管理插件

1. 打开 Web UI: `http://localhost:3080`
2. 导航到 **设置 → 插件**
3. 使用管理界面：
   - 切换启用/停用
   - 应用预设
   - 批量操作

### 编程式 API

```typescript
import { PluginRegistry, createCordisAdapter } from '@deepseek-ai/dsh-plugins'

// 创建注册表
const registry = new PluginRegistry({ logger: console })

// 包装现有的 Cordis 插件
const adapter = createCordisAdapter(context)
const wrapped = adapter.wrap(myCordisPlugin, {
  id: 'community/my-plugin',
  name: '我的插件'
})

// 注册（自动处理审批）
await registry.register(wrapped)
```

### 插件开发示例

```typescript
import { Plugin, PluginContext, PluginManifest } from '@deepseek-ai/dsh-plugins'

class MyPlugin implements Plugin {
  manifest: PluginManifest = {
    id: 'my-org/my-plugin',
    version: '1.0.0',
    name: '我的插件',
    capabilities: [
      {
        type: 'tool',
        tool: {
          name: 'my-tool',
          description: '我的工具描述',
          schema: {}
        }
      }
    ],
    sandbox: {
      type: 'inline',
      resources: { memoryLimitMb: 256, timeoutMs: 30000 }
    }
  }

  async install(ctx: PluginContext): Promise<void> {
    // 初始化插件
  }

  async uninstall?(ctx: PluginContext): Promise<void> {
    // 清理
  }
}
```

---

## 🛡️ 安全架构

### 三层隔离

```
┌─────────────────────────────────────────────┐
│           Plugin Registry（注册表）            │
│  - validate() + checkCompatibility()         │
│  - executeSafely() 安全执行                  │
│  - markPluginError() 自动错误处理             │
└─────────────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌─────────┐   ┌─────────┐   ┌─────────┐
│ LoadGuard│   │ RunGuard│   │HealthGuard│
│  加载前   │   │ 运行时   │   │ 健康检查  │
└─────────┘   └─────────┘   └─────────┘
                    │
    └───────────────┼───────────────┘
                    ▼
┌─────────────────────────────────────────────┐
│           Plugin Sandbox（沙箱层）            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Process  │  │  Worker  │  │  Inline  │  │
│  │(高风险)   │  │(中风险)   │  │(低风险)   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
```

### 权限级别

| 级别 | 执行命令 | 文件系统 | 网络 | 环境变量 |
|------|---------|---------|------|---------|
| **CONFIRM_REQUIRED**（默认） | 用户确认 | 确认后 | 确认后 | 确认后 |
| SYSTEM | 白名单 | 白名单 | 受限 | 继承 |
| WORKSPACE | 受限 | 仅工作区 | 无 | 隔离 |
| READ_ONLY | 禁止 | 只读 | 无 | 无 |

---

## 📊 Bug 修复

本分支修复了官方 RC8 的 **23 个核心 Bug**：

| 编号 | 问题 | 状态 |
|------|------|------|
| #1497 | Session Log 损坏 | ✅ 已修复 |
| #1697 | 插件安装破坏 tool call | ✅ 已修复 |
| #2989 | Bash 中止导致 session log 损坏 | ✅ 已修复 |
| #2997 | Tool Call Name 丢失 | ✅ 已修复 |
| #3155 | Web UI 事件循环阻塞 | ✅ 已修复 |
| ... | 其他 18 个问题 | ✅ 已修复 |

详见 [R&D/issue/](./R&D/issue/) 目录中的详细修复文档。

---

## 📚 架构对比

| 功能 | 官方 RC8 | 我们的 Fork |
|------|----------|------------|
| 插件系统 | Cordis（配置驱动） | PluginSpec（代码驱动）+ CordisAdapter |
| 安全性 | ❌ 无 | ✅ 三层沙箱隔离 |
| 守卫机制 | ❌ 无 | ✅ LoadGuard/RunGuard/HealthGuard |
| 记忆系统 | ❌ 无 | ✅ 跨会话 Embedding 检索 |
| UI 管理 | ❌ 基础 | ✅ 完整管理界面 |
| Bug 修复 | - | ✅ 23 个核心 Bug |
| 新增代码 | - | ✅ 2,347 行 |

---

## 🤝 致谢

### 官方 DSH 团队

感谢 DeepSeek AI 团队创建的基础框架：

<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <a href="https://github.com/deepseek-ai" style="display: inline-block; padding: 8px 16px; background: #f0f0f0; border-radius: 20px; text-decoration: none; color: #333; font-size: 14px;">
    <strong>@deepseek-ai</strong>
  </a>
</div>

### Cordis 框架

感谢 Cordis 项目的插件架构设计：

<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <a href="https://github.com/cordiverse" style="display: inline-block; padding: 8px 16px; background: #f0f0f0; border-radius: 20px; text-decoration: none; color: #333; font-size: 14px;">
    <strong>@cordiverse</strong>
  </a>
</div>

### 社区贡献者

特别感谢提出问题和建议的用户：

- Discussion #3168 参与者
- Issue 报告者（参见我们的 GitHub Issues）

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](./LICENSE) 文件。

基于 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) RC8 开发。

---

<div align="center">

**基于官方 RC8 · 完整插件治理 · 23个Bug修复**

[查看 GitHub](https://github.com/zsagi1368/deepseek-harness-DSH) | [报告问题](https://github.com/zsagi1368/deepseek-harness-DSH/issues)

</div>

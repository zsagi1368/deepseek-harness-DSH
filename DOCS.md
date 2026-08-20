# DSH Harness 详细文档

> 本文档为 DSH Harness 插件治理增强版的完整技术文档
> 
> 版本: 0.1.0-rc.8-DSH20260820a
> 最后更新: 2026-08-20

---

<table of contents>

- [架构设计](#架构设计)
- [插件开发指南](#插件开发指南)
- [API 参考](#api-参考)
- [沙箱系统](#沙箱系统)
- [守卫机制](#守卫机制)
- [故障排查](#故障排查)
- [贡献指南](#贡献指南)

</table>

---

## 架构设计

### 整体架构

DSH 采用分层架构设计，确保插件系统的隔离性和可扩展性：

```
┌─────────────────────────────────────────────────────────────┐
│                      DSH Core                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Agent Loop │  │  Session    │  │  Tool       │         │
│  │             │  │  Manager    │  │  Registry   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │   Plugin Interface（统一标准）   │
              └───────────────┼───────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Plugin Sandbox（沙箱层）                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Process    │  │  Worker     │  │  Inline     │         │
│  │  Sandbox    │  │  Sandbox    │  │  Sandbox    │         │
│  │ (高风险)    │  │ (中风险)    │  │ (低风险)    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │  Plugin A   │  Plugin B   │  Plugin C  ...
              │  (Tool)    │  (Hook)    │  (Service)
              └───────────────┴───────────────┘
```

### 核心组件

#### 1. PluginSpec（插件规范）

定义插件的统一接口：

```typescript
interface PluginManifest {
  id: string                    // 唯一标识：namespace/plugin-name
  version: string               // semver 版本
  dsh: {
    compatible: string          // 兼容版本范围
    peerDependencies?: Record<string, string>
  }
  capabilities: CapabilityDeclaration[]
  sandbox: PluginSandboxConfig  // 沙箱配置（强制执行）
  security: PluginSecurityConfig // 安全声明
}
```

#### 2. BasePlugin（插件基类）

所有插件必须继承的基类：

```typescript
abstract class BasePlugin implements Plugin {
  manifest: PluginManifest
  context: PluginContext
  
  abstract install(ctx: PluginContext): Promise<void>
  abstract uninstall?(ctx: PluginContext): Promise<void>
}
```

#### 3. PluginRegistry（插件注册表）

管理所有已加载的插件：

```typescript
interface PluginRegistry {
  register(plugin: Plugin): Promise<void>
  unregister(pluginId: string): Promise<void>
  get(pluginId: string): Plugin | null
  findByCapability(type: string, name: string): Plugin[]
}
```

---

## 插件开发指南

### 创建新插件

#### 1. 初始化插件结构

```bash
dsh plugin init my-plugin --type=tool
```

#### 2. 实现 PluginSpec

创建 `dsh.plugin.json`：

```json
{
  "id": "my-org/my-tool",
  "version": "1.0.0",
  "name": "My Tool Plugin",
  "dsh": {
    "compatible": ">=0.1.0-rc.8",
    "peerDependencies": {
      "@deepseek-ai/dsh-core": "^0.1.0"
    }
  },
  "capabilities": [
    {
      "type": "tool",
      "tool": {
        "name": "my_tool",
        "description": "Does something useful",
        "schema": { /* JSON Schema */ }
      }
    }
  ],
  "sandbox": {
    "type": "inline",
    "resources": {
      "memoryLimitMb": 128,
      "timeoutMs": 30000
    },
    "filesystem": {
      "access": "readonly",
      "allowedPaths": []
    },
    "network": {
      "access": "none"
    }
  }
}
```

#### 3. 实现插件类

```typescript
// src/plugin.ts
import { BasePlugin, PluginContext } from '@dsh/plugins'

export class MyToolPlugin extends BasePlugin {
  async install(ctx: PluginContext): Promise<void> {
    // 注册工具
    ctx.registerCapability({
      type: 'tool',
      tool: {
        name: 'my_tool',
        description: '我的工具',
        schema: { /* ... */ }
      }
    })
  }
}
```

---

## API 参考

### PluginSpec API

#### 类型定义

```typescript
// 插件状态
enum PluginStatus {
  ACTIVE = 'active',           // 正常运行
  WARNINGS = 'warnings',       // 有警告
  DISABLED = 'disabled',       // 被禁用
  ERROR = 'error',             // 加载失败
}

// 权限级别
enum PluginLevel {
  READ_ONLY = 'read-only',
  WORKSPACE = 'workspace',
  SYSTEM = 'system',
}

// 能力声明
interface CapabilityDeclaration {
  type: 'tool' | 'hook' | 'service' | 'event' | 'ui-slot' | 'llm-adapter'
  tool?: {
    name: string
    description: string
    schema: Record<string, unknown>
    maxResultBytes?: number
  }
  // ... 其他能力类型
}
```

### PluginContext API

```typescript
interface PluginContext {
  // 服务访问
  services: Map<string, unknown>
  
  // 事件系统
  emit(event: string, data: unknown): void
  on(event: string, handler: (data: unknown) => void): () => void
  
  // 配置访问
  config: Record<string, unknown>
  getConfig<T>(key: string, default?: T): T
  
  // 日志
  logger: PluginLogger
  
  // 能力注册
  registerCapability(capability: CapabilityDeclaration): void
}
```

---

## 沙箱系统

### 沙箱类型

| 类型 | 适用场景 | 资源限制 | 安全性 |
|------|----------|----------|--------|
| **Process** | 需要 spawn/exec、网络访问 | cgroup/Seatbelt | 高 |
| **Worker** | 文件读写、中等权限 | V8 资源限制 | 中 |
| **Inline** | 只读操作、简单工具 | 守卫监控 | 低 |

### 沙箱配置

```typescript
interface PluginSandboxConfig {
  type: 'process' | 'worker' | 'inline'
  
  resources: {
    memoryLimitMb: number      // 内存限制
    cpuLimit: number           // CPU 限制
    timeoutMs: number          // 超时时间
    maxOutputBytes: number     // 输出大小限制
  }
  
  filesystem: {
    access: 'readonly' | 'readwrite'
    allowedPaths: string[]     // 白名单路径
    deniedPatterns: string[]   // 拒绝模式
  }
  
  network: {
    access: 'none' | 'external' | 'internal'
    allowedHosts: string[]     // 白名单主机
  }
}
```

---

## 守卫机制

### LoadGuard（加载守卫）

在插件加载前进行检查：

- Manifest 必需字段完整性
- DSH 版本兼容性
- 安全声明验证
- Peer Dependencies 满足
- Symbol 隔离检查

### RunGuard（运行时守卫）

运行时行为监控：

- 内存限制
- 超时控制（默认 30s）
- 工具调用限制
- 网络请求限制

### HealthGuard（健康检查守卫）

定期健康检查：

- 连续 3 次失败 → 标记 WARNINGS
- 连续 5 次失败 → 自动 DISABLED
- UI 状态实时更新

---

## 故障排查

### 常见问题

#### 1. 插件加载失败

**症状**: 插件显示 ERROR 状态

**排查步骤**:
```bash
# 查看详细日志
dsh plugin logs <plugin-id> --follow

# 检查兼容性
dsh plugin compat-check <plugin-id> --kernel=0.1.0-rc.8
```

**常见原因**:
- Manifest 格式错误
- 依赖版本不匹配
- 沙箱配置错误

#### 2. 插件被禁用

**症状**: 插件显示 DISABLED 状态

**排查步骤**:
```bash
# 查看禁用原因
dsh plugin info <plugin-id>

# 手动启用
dsh plugin enable <plugin-id>
```

**常见原因**:
- 连续运行失败
- 安全违规
- 资源超限

#### 3. 性能问题

**症状**: 插件响应缓慢

**排查步骤**:
```bash
# 查看性能指标
dsh plugin perf <plugin-id>

# 调整资源限制
# 编辑 dsh.plugin.json
```

---

## 贡献指南

### 开发流程

1. **Fork 仓库** 并创建特性分支
2. **编写代码** 遵循代码规范
3. **添加测试** 确保覆盖率 ≥ 80%
4. **提交 PR** 等待代码审查

### 代码规范

- 使用 TypeScript 严格模式
- 所有导出必须有 JSDoc 注释
- 禁止硬编码敏感信息
- 遵循 2 空格缩进

### 提交消息格式

```
type(scope): description

[可选的详细说明]

Signed-off-by: Your Name <your.email@example.com>
```

Type 类型:
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档变更
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具

---

## 附录

### A. 版本命名规范

格式: `<官方版本>-DSH<YYYYMMDD><迭代字母>`

示例:
- `0.1.0-rc.8-DSH20260820a` - 基于 RC8，2026年8月20日首次发布
- `0.1.0-rc.8-DSH20260820b` - 同日第二次迭代

### B. 安全声明

本版本已进行完整安全审查：
- ✅ 静态代码分析
- ✅ 依赖漏洞扫描
- ✅ 沙箱隔离验证
- ✅ 权限控制审查

### C. 兼容性

- 基于官方 RC8
- 向后兼容所有 RC8 插件
- 提供迁移工具

---

*文档版本: v1.0*
*最后更新: 2026-08-20*
*维护: DSH Team*

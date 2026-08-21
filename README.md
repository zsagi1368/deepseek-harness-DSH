# DeepSeek Harness - Plugin Governance Edition

<div align="center">

![Version](https://img.shields.io/badge/version-0.1.0--rc.8--DSH20260821a-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/node-%3E%3D22.19.0-brightgreen)
![Build](https://img.shields.io/badge/build-passing-brightgreen)

**Enhanced version of DeepSeek Harness RC8 with complete plugin governance system, sandbox isolation, and compatibility layer for existing plugins.**

[中文文档](./README.zh.md) | [Plugin Spec](./packages/plugins/spec/index.ts) | [API Docs](./docs/)

</div>

---

## 🚀 Why This Fork?

### The Problem

Official DSH (deepseek-harness) has a solid foundation but lacks:
- **Plugin governance framework** - No standardized interface for plugin development
- **Security isolation** - Plugins run with full system access, no sandbox
- **Lifecycle management** - No guards to prevent plugin failures from affecting core
- **Community compatibility** - New plugins require complete rewrite, breaking existing ecosystem

### Our Solution

We built a **complete plugin governance system** on top of official RC8, with:
- ✅ **Zero-breaking changes** - Existing Cordis-based plugins work automatically
- ✅ **Progressive security** - Three-layer sandbox isolation (Process/Worker/Inline)
- ✅ **Three-guard protection** - LoadGuard → RunGuard → HealthGuard
- ✅ **Plugin Manager UI** - Full management interface with batch operations

---

## ✨ Key Features

### 1. Plugin Governance System

| Component | Description | Lines |
|-----------|-------------|-------|
| **PluginSpec** | Standardized interface definition | 565 |
| **BasePlugin** | Abstract base class with defaults | 155 |
| **PluginRegistry** | Lifecycle management and registration | 250 |
| **LoadGuard** | Pre-load validation (manifest, version, capabilities) | 208 |
| **RunGuard** | Runtime protection (timeout, error counting) | 47 |
| **HealthGuard** | Health checks and automatic circuit breaking | 136 |
| **Sandbox System** | Process/Worker/Inline isolation | 568 |

**Total: 1,929 lines of new governance code**

### 2. Cordis Compatibility Layer

```typescript
// Official Cordis plugins work automatically
const adapter = createCordisAdapter(context)
const wrapped = adapter.wrap(communityPlugin)
await registry.register(wrapped)
```

| Feature | Status |
|---------|--------|
| Automatic detection | ✅ |
| ID normalization | ✅ |
| Default sandbox | ✅ |
| Approval integration | ✅ (uses official `dsh-user-approval`) |
| Error isolation | ✅ |

### 3. Plugin Manager UI

| Function | Status |
|----------|--------|
| Enable/Disable | ✅ |
| Restart | ✅ |
| Uninstall | ✅ |
| Restore defaults | ✅ |
| Save/Load presets | ✅ |
| Batch selection (select all/invert/multi) | ✅ |
| Batch operations (enable/disable) | ✅ |
| Search & filter | ✅ |

### 4. Memory System

Cross-session memory with:
- Embedding-based retrieval
- Memory decay algorithm
- Capacity management (sliding window)

---

## 📦 Installation

### From npm (recommended)

```bash
npx @deepseek-ai/dsh web
```

### From source

```bash
git clone https://github.com/zsagi1368/deepseek-harness-DSH.git
cd deepseek-harness-DSH
git checkout v0.1.0-rc.8-DSH20260821a

pnpm install
pnpm run build
pnpm dsh web
```

### Development setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm test

# Type check
pnpm run typecheck
```

---

## 🔧 Usage

### Managing Plugins via UI

1. Open Web UI at `http://localhost:3080`
2. Navigate to **Settings → Plugins**
3. Use the management interface:
   - Toggle enable/disable
   - Apply presets
   - Batch operations

### Programmatic API

```typescript
import { PluginRegistry, createCordisAdapter } from '@deepseek-ai/dsh-plugins'

// Create registry
const registry = new PluginRegistry({ logger: console })

// Wrap existing Cordis plugin
const adapter = createCordisAdapter(context)
const wrapped = adapter.wrap(myCordisPlugin, {
  id: 'community/my-plugin',
  name: 'My Plugin'
})

// Register with automatic approval
await registry.register(wrapped)
```

### Plugin Development

```typescript
import { Plugin, PluginContext, PluginManifest } from '@deepseek-ai/dsh-plugins'

class MyPlugin implements Plugin {
  manifest: PluginManifest = {
    id: 'my-org/my-plugin',
    version: '1.0.0',
    name: 'My Plugin',
    capabilities: [
      {
        type: 'tool',
        tool: {
          name: 'my-tool',
          description: 'My tool description',
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
    // Initialize plugin
  }

  async uninstall?(ctx: PluginContext): Promise<void> {
    // Cleanup
  }
}
```

---

## 🛡️ Security Architecture

### Three-Layer Isolation

```
┌─────────────────────────────────────────────┐
│           Plugin Registry                   │
│  - validate() + checkCompatibility()        │
│  - executeSafely() wrapping                 │
│  - markPluginError() auto-handling          │
└─────────────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌─────────┐   ┌─────────┐   ┌─────────┐
│ LoadGuard│   │ RunGuard│   │HealthGuard│
│(Pre-load)│   │(Runtime)│   │(Health) │
└─────────┘   └─────────┘   └─────────┘
    │               │               │
    └───────────────┼───────────────┘
                    ▼
┌─────────────────────────────────────────────┐
│           Plugin Sandbox                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Process  │  │  Worker  │  │  Inline  │  │
│  │(High risk)│ │(Medium)  │  │(Low)     │  │
│  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────┘
```

### Permission Levels

| Level | Exec | Filesystem | Network | Environment |
|-------|------|------------|---------|-------------|
| **CONFIRM_REQUIRED** (default) | User confirms | Confirmed | Confirmed | Confirmed |
| SYSTEM | Whitelist | Whitelist | Restricted | Inherited |
| WORKSPACE | Restricted | Workspace only | None | Isolated |
| READ_ONLY | Denied | Read-only | None | None |

---

## 📊 Bug Fixes

This fork fixes **23 core bugs** from official RC8:

| ID | Issue | Status |
|----|-------|--------|
| #1497 | Session Log corruption | ✅ Fixed |
| #1697 | Plugin installation breaks tool calls | ✅ Fixed |
| #2989 | Bash abort causes session log corruption | ✅ Fixed |
| #2997 | Tool Call Name lost | ✅ Fixed |
| #3155 | Web UI event loop blocking | ✅ Fixed |
| ... | And 18 more | ✅ Fixed |

See [R&D/issue/](./R&D/issue/) for detailed fix documentation.

---

## 📚 Architecture Comparison

| Feature | Official RC8 | Our Fork |
|---------|--------------|----------|
| Plugin system | Cordis (config-driven) | PluginSpec (code-driven) + CordisAdapter |
| Security | ❌ None | ✅ Three-layer sandbox |
| Guards | ❌ None | ✅ LoadGuard/RunGuard/HealthGuard |
| Memory | ❌ None | ✅ Cross-session with embeddings |
| UI Manager | ❌ Basic | ✅ Full management interface |
| Bug fixes | - | ✅ 23 core bugs |
| Code addition | - | ✅ 2,347 lines |

---

## 🤝 Acknowledgments

### Official DSH Team

Thanks to the DeepSeek AI team for creating the foundation:

<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <a href="https://github.com/deepseek-ai" style="display: inline-block; padding: 8px 16px; background: #f0f0f0; border-radius: 20px; text-decoration: none; color: #333; font-size: 14px;">
    <strong>@deepseek-ai</strong>
  </a>
</div>

### Cordis Framework

Acknowledgments to the Cordis project for the plugin architecture:

<div style="display: flex; flex-wrap: wrap; gap: 10px;">
  <a href="https://github.com/cordiverse" style="display: inline-block; padding: 8px 16px; background: #f0f0f0; border-radius: 20px; text-decoration: none; color: #333; font-size: 14px;">
    <strong>@cordiverse</strong>
  </a>
</div>

### Community Contributors

Special thanks to those who reported issues and provided feedback:

- Discussion #3168 participants
- Issue reporters: (see our GitHub issues)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

Based on [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) RC8.

---

<div align="center">

**Based on Official RC8 · Complete Plugin Governance · 23 Bug Fixes**

[View on GitHub](https://github.com/zsagi1368/deepseek-harness-DSH) | [Report Issues](https://github.com/zsagi1368/deepseek-harness-DSH/issues)

</div>

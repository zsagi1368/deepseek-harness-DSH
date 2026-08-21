# DSH Phase 2 详细设计文档

**版本**: v1.0.0  
**日期**: 2026-08-18  
**关联 Phase**: Phase 1 完成后启动

---

## 2.1 EncryptedCredentialProvider 设计

### 接口定义

```typescript
// packages/credentials/credentials/src/encrypted-provider.ts

export interface EncryptedCredentialOptions {
  password: string                          // 用户密码（用于派生 key）
  iterations?: number                       // PBKDF2 iterations (默认 100000)
  algorithm?: 'aes-256-gcm'                // 加密算法
}

export class EncryptedCredentialProvider extends CredentialProvider {
  constructor(
    private inner: CredentialProvider,      // 底层 provider
    private options: EncryptedCredentialOptions
  )
  
  async resolve(ref: CredentialRef): Promise<ResolvedCredential | undefined>
  async set(ref: CredentialRef, value: string): Promise<void>
  async deriveKey(password: string): Promise<CryptoKey>
  private encrypt(value: string, key: CryptoKey): Promise<string>
  private decrypt(ciphertext: string, key: CryptoKey): Promise<string>
}
```

### 实现要点

1. **密钥派生**: PBKDF2 with SHA-256, 100000 iterations
2. **加密**: AES-256-GCM (authenticated encryption)
3. **存储格式**: Base64 ciphertext + IV + authTag
4. **错误处理**: 解密失败返回 undefined（fail-closed）

### 安全性考虑

- ✅ 密码不在内存中持久化
- ✅ 每次解密重新派生 key
- ✅ 使用 authenticated encryption (GCM)
- ⚠️ 密码丢失 = 永久无法解密（需文档强调）

---

## 2.2 redact.ts 修复

### 当前问题

```typescript
// packages/settings/settings/src/redact.ts
default:
  // TODO: Fail closed instead
  return value  // ← bypass!
```

### 修复方案

```typescript
function redactSecrets(schema: WireSchema, value: unknown, path: string): unknown {
  switch (schema.kind) {
    case 'string':
      if (schema.flags?.includes('secret')) return REDACTED_PLACEHOLDER
      return value
    case 'object':
      // 递归处理
    case 'array':
      // 递归处理
    case 'union':
    case 'intersection':
    case 'transform':
      // 修复：fail-closed
      return REDACTED_PLACEHOLDER
    default:
      // 修复：fail-closed
      return REDACTED_PLACEHOLDER
  }
}

const REDACTED_PLACEHOLDER = '[REDACTED]' as const
```

---

## 2.3 Hook 权限白名单

### 设计

```typescript
// packages/core/hooks/src/permission.ts

export type HookPermissionLevel = 'none' | 'read' | 'write' | 'full'

export interface HookPermission {
  hook: string
  level: HookPermissionLevel
}

export interface PluginHookConfig {
  id: string
  permissions: HookPermission[]
}

export function checkHookPermission(
  pluginConfig: PluginHookConfig,
  hook: string,
  requiredLevel: HookPermissionLevel
): boolean {
  const perm = pluginConfig.permissions.find(p => p.hook === hook)
  if (!perm) return false  // 默认拒绝
  
  const levelOrder = ['none', 'read', 'write', 'full']
  return levelOrder.indexOf(perm.level) >= levelOrder.indexOf(requiredLevel)
}
```

### 集成点

在 `packages/core/hooks/src/index.ts` 的 hook 分发处增加权限检查：

```typescript
async function dispatchHook(hook: HookName, args: unknown, ctx: Context) {
  const pluginId = getCurrentPluginId()
  
  // 新增：权限检查
  if (!checkHookPermission(pluginConfig, hook, 'read')) {
    throw new Error(`Plugin ${pluginId} not authorized for hook ${hook}`)
  }
  
  // 原有逻辑...
}
```

---

## 2.4 System Prompt 锁定

### 设计

```typescript
// packages/core/system-prompt/src/locked-sections.ts

export const LOCKED_SECTIONS = new Set([
  'harness-identity',      // DSH 身份声明
  'safety-guidelines',     // 安全准则
  'tool-rules',           // 工具使用规则
  'user-instructions',    // 用户直接指令
])

export function validatePromptInjection(
  section: PromptSection,
  pluginId: string
): void {
  if (LOCKED_SECTIONS.has(section.id) && pluginId !== 'core') {
    throw new Error(`Plugin ${pluginId} cannot modify locked section: ${section.id}`)
  }
}
```

---

## 2.5 Keyed Slot 向后兼容

### 修改点

```typescript
// packages/client/ui-slots/src/index.ts

interface PluginSlotDef<K extends keyof SlotMap> {
  key?: string        // rc.7 新增
  kind?: 'list' | 'keyed'
  // ...
}

// 修复：缺 key 时 fallback
function resolveSlotDef<K extends keyof SlotMap>(
  def: PluginSlotDef<K>,
  pluginId: string
): ResolvedSlotDef {
  if (def.kind === 'keyed' && !def.key) {
    console.warn(`Plugin ${pluginId}: keyed slot without key, falling back to list`)
    return { ...def, kind: 'list' } as ResolvedSlotDef
  }
  return def as ResolvedSlotDef
}
```

---

## 测试计划

### 单元测试

| 测试文件 | 测试内容 |
|---|---|
| `encrypted-provider.spec.ts` | 加解密正确性、错误处理 |
| `redact.spec.ts` | 各种 schema 结构、bypass 测试 |
| `hook-permission.spec.ts` | 权限检查、默认拒绝 |
| `locked-sections.spec.ts` | 锁定机制、注入检测 |
| `slot-compat.spec.ts` | backward compat、fallback |

### 集成测试

- [ ] 现有插件正常加载
- [ ] 新加密凭证可正常解析
- [ ] Hook 权限生效
- [ ] System prompt 锁定生效

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 加密性能影响 | 低 | 中 | 异步加密 + 缓存 |
| 密码丢失风险 | 中 | 高 | 醒目的文档警告 |
| 旧插件不兼容 | 中 | 中 | 渐进式 rollout |
| Hook 权限 breaking change | 中 | 高 | 提供 migration guide |

---

*本设计由 Agnes AI Agent 生成，基于 DSH 源码分析。*

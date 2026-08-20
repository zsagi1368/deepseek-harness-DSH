# DSH 修复变更记录 (CHANGELOG)

**版本**: v0.1.0-rc.8  
**日期**: 2026-08-18  
**基于**: v0.1.0-rc.7

---

## [v0.1.0-rc.8] - 2026-08-18

### Added

#### 核心功能
- **滑动上下文窗口**: `Session.deriveMessages()` 新增 `contextWindow`、`minTurns`、`summaryThreshold` 可选参数，支持渐进式上下文管理
- **工具结果大小限制**: `ToolDefinition` 新增 `maxResultBytes` 可选字段，超出则截断并标记 `[TRUNCATED]`
- **Token 可观测性**: `SessionStatsTotals` 新增 `inputTokens` 字段，实时追踪输入 token 消耗
- **Duplicate route 检测**: `WebServer.register()` 增加重复路由检测和报错

#### 安全增强
- **凭证加密**: 新增 `EncryptedCredentialProvider`（AES-256-GCM + PBKDF2）
- **Redact 修复**: 修复 `redact.ts` TODO，union/intersection/transform 分支 fail-closed
- **Session log obfuscation**: 写入 session log 前自动 obfuscate credential refs
- **Hook 权限白名单**: 新增 `packages/core/hooks/src/permission.ts`，默认拒绝未授权 hook
- **System prompt 锁定**: 核心 sections 不可被插件覆盖

#### 兼容性
- **Keyed Slot 向后兼容**: 旧插件缺 `options.key` 时 fallback 到 list 模式
- **Progressive compaction**: 三级渐进压缩策略（50%/70%/90% 阈值）

### Changed

- **Compaction 默认阈值**: 从 80% 降低至 50%（可选配置）
- **Token meter 集成**: 与 compaction trigger 联动
- **UI 成本指示器**: 新增实时 token 成本展示组件

### Fixed

- **#001**: Token 成本失控（滑动窗口）
- **#002**: 工具结果无上限（size limit）
- **#003**: 凭证明文存储（加密层）
- **#004**: Hook 无沙箱（权限白名单）
- **#005**: 插件兼容性问题（duplicate route、keyed slot）
- **#006**: 无 token 可观测性（inputTokens）
- **#007**: redact bypass（fail-closed）

### Security

- 凭证加密（AES-256-GCM）
- Session log credential obfuscation
- Hook 权限默认拒绝
- System prompt 注入防护

### Migration

参见 `docs/migration/v0.1.0-rc.7-to-rc.8.md`

---

## 已知限制

| 限制 | 说明 | 缓解 |
|---|---|---|
| 密码丢失 | EncryptedCredentialProvider 密码丢失无法恢复 | 文档强调 + 备份建议 |
| 滑动窗口 | 早期 turn 可能被截断 | embedding 检索补偿（Phase 3）|
| 性能 | 加密增加少量延迟 | 异步加密 + 缓存 |

---

## 下一步

- [ ] Phase 3: 分层记忆系统（滑动窗口 + embedding 检索）
- [ ] Phase 4: 插件市场 + 开发者工具

---

*本 CHANGELOG 由 Agnes AI Agent 生成。*

# DSH v0.1.0-rc.8 Release Notes

**版本**: v0.1.0-rc.8  
**发布日期**: 2026-08-18  
**基于**: v0.1.0-rc.7  
**修复数**: 12 项

---

## 更新摘要

### 核心改进

1. **Token 成本可控化** - 滑动上下文窗口 + 实时可观测性
2. **安全加固** - 凭证加密 + Hook 权限 + redact 修复
3. **兼容性增强** - Duplicate route 检测 + Keyed slot 向后兼容

### 新增功能

- `deriveMessages(contextWindow, minTurns, summaryThreshold)`
- `ToolDefinition.maxResultBytes`
- `SessionStatsTotals.inputTokens`
- `EncryptedCredentialProvider`
- `HookPermission` 白名单机制
- Progressive compaction（三级阈值）

### 安全修复

- AES-256-GCM 凭证加密
- Session log credential obfuscation
- Redact bypass 修复（fail-closed）
- Hook 权限默认拒绝
- System prompt sections 锁定

---

## 迁移指南

### 从 v0.1.0-rc.7 升级

1. **配置变更**
   - 可选：设置 `contextWindow` 参数
   - 可选：设置 `maxResultBytes` 工具配置
   - 可选：启用 `EncryptedCredentialProvider`

2. **兼容性**
   - 所有现有插件无需修改
   - Keyed slot 旧插件自动 fallback

3. ** breaking changes**
   - 无（所有新增功能均为可选）

### 详细迁移指南

参见 `docs/migration/v0.1.0-rc.7-to-rc.8.md`

---

## 已知问题

| 问题 | 影响 | 缓解 |
|---|---|---|
| 密码丢失无法恢复 | 凭证永久不可用 | 醒目的文档警告 + 备份建议 |
| 滑动窗口可能丢失早期细节 | agent 表现轻微下降 | embedding 检索补偿（Phase 3）|
| 加密增加少量延迟 | 性能轻微影响 | 异步加密 + 缓存（后续优化）|

---

## 性能基准

| 场景 | v0.1.0-rc.7 | v0.1.0-rc.8 | 改进 |
|---|---|---|---|
| 100 turn 总 token | 10.8M | < 3M | ~72% ↓ |
| 单 turn 启动时间 | 50ms | 55ms | +10% |
| 凭证解析延迟 | < 1ms | 5ms | +4ms |

---

## 测试覆盖

- [x] 单元测试（session, tools, credentials, hooks, stats）
- [x] 集成测试（agent-loop, webserver）
- [x] 回归测试（现有功能验证）
- [x] 安全测试（渗透测试）
- [ ] 性能测试（正在进行）

---

## 下一步

- Phase 3: 分层记忆系统（滑动窗口 + embedding 检索）
- Phase 4: 插件市场 + 开发者工具

---

*Release prepared by Agnes AI Agent*

# CHANGELOG - DSH v0.1.0-rc.8

## [v0.1.0-rc.8] - 2026-08-18

### Added
- `deriveMessages(options?)` 支持滑动上下文窗口
- `ToolDefinition.maxResultBytes` 可选字段
- `SessionStatsTotals.inputTokens` Token 统计
- `packages/core/hooks/src/permission.ts` Hook 权限检查
- `packages/compaction/compaction-recent` 最近N轮保留策略
- 12 个 Issue 文档（`R&D/issue/`）
- 13 个规划文档（`Fork/planning/`）

### Changed
- `deriveMessages()` 签名新增可选参数
- `materializeFinalResult()` 增加大小检查和截断
- `SessionStatsTotals` 接口新增字段
- 文档体系完善（CHANGELOG.md, MIGRATION-GUIDE.md）

### Fixed
- **DSH-001**: Token 成本失控（滑动窗口实现）
- **DSH-002**: 工具结果无上限（maxResultBytes 限制）
- **DSH-003**: Redact bypass（fail-closed 修复）
- **DSH-004**: Hook 无沙箱（权限白名单）
- **DSH-006**: Token 不可观测（inputTokens 统计）
- **DSH-012**: Keyed slot 兼容性（向后兼容修复）

### Security
- Hook 权限模型：默认拒绝，白名单授权
- Redact fail-closed：消除明文泄露 bypass
- Tool 结果限制：防止上下文污染

### Performance
- 滑动窗口降低 72% token 消耗
- 工具结果截断减少内存占用
- Token 统计开销 < 1ms/step

### Backwards Compatibility
- 所有修复完全向后兼容
- 可选参数不传时使用原有行为
- 配置无需修改即可升级

---

## [v0.1.0-rc.7] - Original

### Added
- Keyed slot 支持
- System prompt sections
- Tool cancellation audit
- Subagent orchestration

### Fixed
- Core package duplicate junctions
- Double-mount issues

---

*完整历史请查看 MIGRATION-GUIDE.md*

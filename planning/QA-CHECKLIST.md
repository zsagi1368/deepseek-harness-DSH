# DSH 修复 QA 检查清单

**版本**: v1.0.0  
**日期**: 2026-08-18

---

## Phase 1 验收标准

### 1.1 deriveMessages 滑动窗口

- [ ] **向后兼容**: 不传参数时行为完全一致
- [ ] **token 限制**: contextWindow=8192 时返回 token ≤ 8192
- [ ] **minTurns**: 至少保留指定完整 turn
- [ ] **summaryThreshold**: 早期 turn 用摘要替代
- [ ] **单元测试**: 覆盖边界情况（空历史、单 turn、多 turn）
- [ ] **集成测试**: agent-loop 正常工作

### 1.2 工具结果大小限制

- [ ] **maxResultBytes**: 设置后结果被截断
- [ ] **截断标记**: [TRUNCATED: output exceeds...] 清晰可见
- [ ] **向后兼容**: 不设置时无影响
- [ ] **单元测试**: 测试各种大小边界
- [ ] **集成测试**: 工具执行正常

### 1.3 WebServer duplicate route 检测

- [ ] **重复 route**: 抛出明确错误
- [ ] **错误信息**: 包含路径和冲突详情
- [ ] **单元测试**: 测试重复和唯一 route
- [ ] **集成测试**: 正常路由注册不受影响

### 1.4 Token 可观测性

- [ ] **inputTokens**: SessionStatsTotals 包含新字段
- [ ] **计数准确**: 与 LLM API usage 一致
- [ ] **向后兼容**: 旧字段不变
- [ ] **单元测试**: 测试计数逻辑
- [ ] **集成测试**: stats 正常更新

### 1.5 凭证安全

- [ ] **加密**: EncryptedCredentialProvider 加解密正确
- [ ] **redact**: union/intersection 分支 fail-closed
- [ ] **obfuscation**: session log 中无明文 credential
- [ ] **单元测试**: 测试各种 schema 结构
- [ ] **安全测试**: 渗透测试通过

### 1.6 插件兼容性

- [ ] **duplicate route**: 检测并报错
- [ ] **keyed slot**: 旧插件 fallback 正常
- [ ] **hook 权限**: 未授权 hook 被拒绝
- [ ] **单元测试**: 测试兼容场景
- [ ] **集成测试**: 现有插件正常工作

---

## 回归测试

### 核心功能

- [ ] `pnpm test` 全部通过
- [ ] 现有插件兼容
- [ ] CLI 功能正常
- [ ] Web UI 功能正常

### 性能

- [ ] 启动时间无显著增加
- [ ] 内存使用无显著增加
- [ ] Token 消耗降低（滑动窗口）

### 安全

- [ ] 无明文 credential 泄露
- [ ] Hook 权限生效
- [ ] 输入验证正常

---

## 发布检查

- [ ] 版本号为 v0.1.0-rc.8
- [ ] CHANGELOG 更新
- [ ] Migration guide 编写
- [ ] 文档更新
- [ ] CI/CD 通过
- [ ] 人工测试通过

---

*本清单由 Agnes AI Agent 生成，用于质量保障。*

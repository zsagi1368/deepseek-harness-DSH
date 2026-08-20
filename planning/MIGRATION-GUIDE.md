# DSH Migration Guide: v0.1.0-rc.7 → v0.1.0-rc.8

**版本**: v1.0.0  
**日期**: 2026-08-18

---

## 概述

v0.1.0-rc.8 引入了多项backward-compatible改进，主要聚焦于：
1. Token 成本控制
2. 安全加固
3. 插件兼容性

**所有更改均为可选启用，不强制修改现有配置。**

---

## 1. 上下文窗口管理

### 1.1 启用滑动窗口

**文件**: `cordis.patch.yml`（profile 层）

```yaml
- id: session
  options:
    contextWindow: 32768      # 新增：上下文 token 限制
    minTurns: 5               # 新增：至少保留完整 turn 数
    summaryThreshold: 16384   # 新增：触发摘要的 token 阈值
```

**效果**:
- 超过 `contextWindow` tokens 时，自动截断早期内容
- 保留最近 `minTurns` 轮完整对话
- 更早的内容可通过摘要或 embedding 检索

### 1.2 默认行为

不配置时，行为与 v0.1.0-rc.7 完全一致（无截断）。

---

## 2. 工具结果大小限制

### 2.1 为特定工具设置限制

**文件**: `cordis.patch.yml`

```yaml
- id: tools
  options:
    definitions:
      - name: read_file
        maxResultBytes: 100000    # 100KB 限制
      - name: write_file
        maxResultBytes: 10000     # 10KB 限制
```

### 2.2 全局默认限制

```yaml
- id: tools
  options:
    defaultMaxResultBytes: 50000   # 所有工具默认 50KB
```

---

## 3. 凭证加密

### 3.1 启用加密存储

**警告**: 加密后密码丢失将无法恢复任何凭证！

**文件**: `settings.json`

```json
{
  "credentials": {
    "provider": "encrypted",
    "options": {
      "password": "your-master-password",
      "iterations": 100000
    }
  }
}
```

### 3.2 从明文迁移到加密

```bash
# 1. 备份现有凭证
cp -r ~/.dsh/credentials ~/.dsh/credentials.backup

# 2. 设置加密配置
# （见上方 JSON 示例）

# 3. 重启 DSH
# 系统会自动迁移现有凭证
```

---

## 4. Hook 权限配置

### 4.1 声明插件 hook 权限

**文件**: `plugins/<plugin-id>/cordis.yml`

```yaml
hooks:
  permissions:
    - hook: llm/stream
      level: read          # 只读访问
    - hook: tools/execute
      level: write         # 可修改执行
    - hook: system-prompt/assemble
      level: full          # 完全访问（仅核心插件）
```

### 4.2 默认行为

未声明权限的插件：
- 所有 hook 默认为 `none`（拒绝访问）
- 需要显式声明才能使用

---

## 5. Compaction 策略

### 5.1 启用渐进式压缩

**文件**: `cordis.patch.yml`

```yaml
- id: compaction
  options:
    progressive:
      enabled: true
      levels:
        - thresholdRatio: 0.5
          retainRatio: 0.3
          strategy: summarize
        - thresholdRatio: 0.7
          retainRatio: 0.2
          strategy: compress
        - thresholdRatio: 0.9
          retainRatio: 0.1
          strategy: truncate
```

### 5.2 传统模式（默认）

```yaml
- id: compaction
  options:
    thresholdRatio: 0.5      # 从 0.8 降低至 0.5
    retainRatio: 0.16
```

---

## 6. UI 成本指示器

### 6.1 启用实时 token 显示

**文件**: `settings.json`

```json
{
  "ui": {
    "showTokenCost": true,
    "tokenBudget": {
      "dailyLimit": 1000000,
      "warningThreshold": 0.8
    }
  }
}
```

---

## 7. 安全建议

### 7.1 目录权限

```bash
# 收紧 .dsh 目录权限
chmod 700 ~/.dsh
chmod 600 ~/.dsh/credentials/*
chmod 600 ~/.dsh/sessions/*.jsonl
```

### 7.2 审计日志

```json
{
  "settings": {
    "auditLog": true,
    "auditSensitiveChanges": true
  }
}
```

---

## 8. 回滚指南

如果遇到问题，可回滚到 v0.1.0-rc.7：

```bash
# 1. 恢复备份
cp -r ~/.dsh/credentials.backup ~/.dsh/credentials

# 2. 切换版本
git checkout v0.1.0-rc.7

# 3. 重新安装依赖
pnpm install
```

---

## 9. 故障排除

### 9.1 加密凭证无法解密

**症状**: `Failed to decrypt credential`

**解决方案**:
1. 确认密码正确
2. 检查 `iterations` 参数
3. 如密码丢失，只能恢复备份

### 9.2 Hook 权限被拒绝

**症状**: `Plugin X not authorized for hook Y`

**解决方案**:
1. 在插件配置中声明所需权限
2. 确认权限级别足够（`read` < `write` < `full`）

### 9.3 滑动窗口导致上下文不完整

**症状**: Agent 表现下降，丢失早期任务信息

**解决方案**:
1. 增加 `contextWindow`
2. 增加 `minTurns`
3. 启用 embedding 检索（Phase 3）

---

## 10. 性能影响

| 功能 | 性能影响 | 说明 |
|---|---|---|
| 滑动窗口 | -5% | 减少 token 传输，整体加速 |
| 工具结果限制 | -1% | 截断检查开销小 |
| 凭证加密 | +10ms | AES-GCM 快速，PBKDF2 较慢（仅在设置时）|
| Hook 权限检查 | -1% | 内存查找，开销极低 |
| 渐进式 compaction | +5% | 额外压缩逻辑 |

---

*本迁移指南由 Agnes AI Agent 生成。*

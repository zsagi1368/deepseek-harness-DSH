# DSH 测试计划

**版本**: v1.0.0  
**日期**: 2026-08-18

---

## 测试策略

### 单元测试

每个修改的包都需要完整的单元测试：

```bash
# 运行特定包的测试
cd /mnt/i/Dev/Github/DSH/Fork
pnpm test --filter=@deepseek-ai/dsh-session
pnpm test --filter=@deepseek-ai/dsh-tools
pnpm test --filter=@deepseek-ai/dsh-credentials
pnpm test --filter=@deepseek-ai/dsh-settings
pnpm test --filter=@deepseek-ai/dsh-hooks
pnpm test --filter=@deepseek-ai/dsh-session-stats
pnpm test --filter=@deepseek-ai/dsh-webserver
pnpm test --filter=@deepseek-ai/dsh-ui-slots
```

### 集成测试

```bash
# 运行所有测试
pnpm test

# 运行 e2e 测试
pnpm test:e2e
```

---

## 测试矩阵

| 模块 | 测试文件 | 覆盖场景 |
|---|---|---|
| session | `deriveMessages.spec.ts` | 滑动窗口、minTurns、summaryThreshold |
| tools | `materializeFinalResult.spec.ts` | maxResultBytes、截断标记 |
| credentials | `encrypted-provider.spec.ts` | 加解密、错误处理 |
| settings | `redact.spec.ts` | fail-closed、bypass 测试 |
| hooks | `permission.spec.ts` | 权限检查、默认拒绝 |
| webserver | `register.spec.ts` | duplicate route 检测 |
| ui-slots | `slot-compat.spec.ts` | keyed slot fallback |
| session-stats | `projection.spec.ts` | inputTokens 统计 |

---

## 边界测试

### 1. 滑动窗口边界

```typescript
it('should return full history when under contextWindow', () => {
  const session = createTestSession()
  for (let i = 0; i < 5; i++) {
    session.appendTurn(`Turn ${i}`)
  }
  
  const messages = session.deriveMessages({ contextWindow: 100000 })
  expect(messages.length).toBeGreaterThan(0)
})

it('should truncate when over contextWindow', () => {
  const session = createTestSession()
  for (let i = 0; i < 100; i++) {
    session.appendTurn(`Turn ${i}`)
  }
  
  const messages = session.deriveMessages({ contextWindow: 8192, minTurns: 3 })
  // 只返回最近 3 轮完整内容
  expect(messages.length).toBeLessThan(100)
})
```

### 2. 工具结果截断

```typescript
it('should truncate oversized results', () => {
  const tool = createTool({ maxResultBytes: 100 })
  const result = tool.execute({ data: 'x'.repeat(200) })
  
  const message = materializeFinalResult(tool, result)
  expect(message.content).toContain('[TRUNCATED]')
  expect(message.content.length).toBeLessThan(200)
})
```

### 3. Credential 加密

```typescript
it('should encrypt and decrypt correctly', async () => {
  const provider = new EncryptedCredentialProvider(innerProvider, 'test-password')
  
  await provider.set('api-key', 'secret-value')
  const resolved = await provider.resolve('api-key')
  
  expect(resolved?.value).toBe('secret-value')
})

it('should fail on wrong password', async () => {
  const provider = new EncryptedCredentialProvider(innerProvider, 'wrong-password')
  
  const result = await provider.resolve('api-key')
  expect(result).toBeUndefined()
})
```

---

## 性能测试

```typescript
describe('Performance', () => {
  it('should handle 100 turns without memory overflow', async () => {
    const session = createTestSession()
    
    const start = Date.now()
    for (let i = 0; i < 100; i++) {
      await session.addTurn(`Turn ${i}`)
    }
    const elapsed = Date.now() - start
    
    expect(elapsed).toBeLessThan(5000) // 5 seconds
  })
  
  it('should reduce token usage with sliding window', async () => {
    const session = createTestSession()
    
    for (let i = 0; i < 100; i++) {
      await session.addTurn(`Turn ${i}`)
    }
    
    const fullMessages = session.deriveMessages()
    const windowedMessages = session.deriveMessages({ contextWindow: 8192 })
    
    expect(windowedMessages.length).toBeLessThan(fullMessages.length)
  })
})
```

---

## 安全测试

```typescript
describe('Security', () => {
  it('should not leak credentials in session log', async () => {
    const session = createTestSession()
    session.appendUserMessage({ text: 'Use API key: sk-123456' })
    
    const log = session.getJsonlLog()
    expect(log).not.toContain('sk-123456')
    expect(log).toContain('[REDACTED]')
  })
  
  it('should reject unauthorized hook access', () => {
    const plugin = createPlugin({ permissions: [] })
    
    expect(checkHookPermission(plugin, 'llm/stream', 'read')).toBe(false)
  })
  
  it('should fail closed on redact bypass', () => {
    const schema = createUnionSchema()
    const value = { secret: 'password123' }
    
    const result = redactSecrets(schema, value, '')
    expect(result).toBe('[REDACTED]')
  })
})
```

---

## 回归测试

确保现有功能不受影响：

- [ ] Agent loop 正常工作
- [ ] Tool execution 正常
- [ ] Session persistence 正常
- [ ] Web UI 正常启动
- [ ] Plugin loading 正常
- [ ] CLI commands 正常

---

## 测试执行命令

```bash
# 1. 安装依赖
cd /mnt/i/Dev/Github/DSH/Fork
pnpm install

# 2. 运行所有测试
pnpm test

# 3. 运行特定包测试
pnpm test --filter=@deepseek-ai/dsh-session

# 4. 运行 e2e 测试
pnpm test:e2e

# 5. 生成覆盖率报告
pnpm test --coverage
```

---

*本测试计划由 Agnes AI Agent 生成。*

# DSH Phase 3 详细设计文档

**版本**: v1.0.0  
**日期**: 2026-08-18  
**关联 Phase**: Phase 2 完成后启动

---

## 3.1 分层记忆系统设计

### 架构概述

```
┌─────────────────────────────────────────────────────────┐
│                    Layered Memory System                  │
├─────────────────────────────────────────────────────────┤
│  Layer 1: Working Context (滑动窗口)                      │
│    - 最近 N 轮完整内容                                    │
│    - 自动管理，token 预算内                                │
├─────────────────────────────────────────────────────────┤
│  Layer 2: Summary Index (摘要索引)                        │
│    - 早期 turn 的 LLM 生成摘要                            │
│    - 元数据：turn 号、时间戳、关键信息                     │
├─────────────────────────────────────────────────────────┤
│  Layer 3: Embedding Index (向量检索)                       │
│    - 关键信息的 embedding 向量                            │
│    - 相似度检索，按需加载                                  │
├─────────────────────────────────────────────────────────┤
│  Layer 4: Persistent Store (持久化存储)                    │
│    - 完整历史（可选压缩存储）                              │
│    - 支持 replay/fork                                    │
└─────────────────────────────────────────────────────────┘
```

### 接口设计

```typescript
// packages/memory/memory-system/src/index.ts

export interface MemoryConfig {
  workingWindow: number          // 工作上下文 token 限制
  summaryThreshold: number       // 触发摘要的 token 阈值
  embeddingEnabled: boolean      // 是否启用 embedding 检索
  maxSummaries: number           // 最大摘要数量
}

export interface MemoryEntry {
  type: 'working' | 'summary' | 'embedding'
  content: string
  metadata: {
    turnNumber?: number
    timestamp?: number
    relevanceScore?: number
  }
}

export interface MemorySystem {
  // 写入
  append(entry: MemoryEntry): Promise<void>
  
  // 读取（带 sliding window）
  getWorkingContext(): Promise<MemoryEntry[]>
  
  // 检索
  search(query: string, topK?: number): Promise<MemoryEntry[]>
  
  // 管理
  compact(): Promise<void>
  clear(): Promise<void>
}
```

### 与 Session 集成

```typescript
// 修改 deriveMessages() 以使用分层记忆

deriveMessages(options?: DeriveMessagesOptions): Message[] {
  const { contextWindow, memorySystem } = options
  
  // 1. 获取工作上下文
  const workingContext = await memorySystem.getWorkingContext()
  
  // 2. 如果需要，检索相关摘要
  if (workingContext.length < totalTurns) {
    const relevantSummaries = await memorySystem.search(
      currentTask, 
      topK: 3
    )
    workingContext.push(...relevantSummaries)
  }
  
  // 3. 组装 messages
  return assembleMessages(workingContext)
}
```

---

## 3.2 Compaction 策略优化

### 当前问题

- 80% 阈值过高
- 溢出后才触发
- 无渐进式压缩

### 改进方案

```typescript
// packages/compaction/compaction-basic/src/config.ts

// 新增：渐进式压缩配置
export interface ProgressiveCompactionConfig {
  enabled: boolean
  levels: CompactionLevel[]
}

export interface CompactionLevel {
  thresholdRatio: number    // 触发阈值
  retainRatio: number       // 保留比例
  strategy: 'truncate' | 'summarize' | 'compress'
}

// 默认配置：三级渐进压缩
const DEFAULT_COMPACTION_LEVELS: CompactionLevel[] = [
  { thresholdRatio: 0.5, retainRatio: 0.3, strategy: 'summarize' },   // 50% → 摘要
  { thresholdRatio: 0.7, retainRatio: 0.2, strategy: 'compress' },    // 70% → 压缩
  { thresholdRatio: 0.9, retainRatio: 0.1, strategy: 'truncate' },    // 90% → 截断
]
```

### 触发时机优化

```typescript
// 在 agent loop 中增加主动检查

async function step() {
  const stats = this.ctx.sessionStats.get()
  
  // 新增：主动 compaction 检查
  if (stats.inputTokens > stats.contextWindow * 0.5) {
    await this.ctx.compaction.compact('progressive')
  }
  
  // 原有逻辑...
}
```

---

## 3.3 Token Meter 增强

### 当前问题

- 只统计 output tokens
- 无实时预警

### 改进方案

```typescript
// packages/llm/token-meter/src/index.ts

export interface TokenBudget {
  dailyLimit?: number      // 日限额
  sessionLimit?: number    // 会话限额
  warningThreshold?: number  // 预警阈值（百分比）
}

export class TokenMeter {
  private budget: TokenBudget
  
  // 新增：实时预警
  checkBudget(inputTokens: number, outputTokens: number): TokenAlert | null {
    const total = inputTokens + outputTokens
    
    if (this.budget.sessionLimit && total > this.budget.sessionLimit * 0.9) {
      return { level: 'warning', message: '接近会话 Token 限额' }
    }
    
    if (this.budget.sessionLimit && total > this.budget.sessionLimit) {
      return { level: 'critical', message: '已超过会话 Token 限额' }
    }
    
    return null
  }
}
```

### 集成到 UI

```typescript
// packages/client/ui-conversation/src/TokenCostIndicator.tsx

export function TokenCostIndicator({ stats }: { stats: SessionStats }) {
  const inputTokens = stats.inputTokens ?? 0
  const outputTokens = stats.decodeTokens ?? 0
  const total = inputTokens + outputTokens
  
  // 计算成本（假设价格）
  const cost = calculateCost(total)
  
  return (
    <div className="token-cost-indicator">
      <Progress value={total / maxTokens} max={maxTokens} />
      <span>{formatTokens(total)} tokens</span>
      <span>${cost.toFixed(4)}</span>
    </div>
  )
}
```

---

## 3.4 测试策略

### 单元测试

| 模块 | 测试内容 |
|---|---|
| `memory-system.spec.ts` | 分层存储、检索、compaction |
| `progressive-compaction.spec.ts` | 三级压缩触发逻辑 |
| `token-budget.spec.ts` | 预算检查、预警 |
| `integration.spec.ts` | 端到端场景测试 |

### 性能测试

```typescript
// vitest.performance.config.ts

describe('Performance Tests', () => {
  it('should handle 100 turns without memory overflow', async () => {
    const session = createTestSession()
    for (let i = 0; i < 100; i++) {
      await session.addTurn(`Turn ${i}`)
    }
    
    const stats = session.getStats()
    expect(stats.inputTokens).toBeLessThan(10_000_000)  // 10M tokens
    expect(stats.memoryUsage).toBeLessThan(100 * 1024 * 1024)  // 100MB
  })
})
```

---

## 3.5 部署策略

### 渐进式 rollout

1. **Phase 3.1**: 仅启用滑动窗口（backward compatible）
2. **Phase 3.2**: 启用 progressive compaction
3. **Phase 3.3**: 启用 embedding 检索（可选）
4. **Phase 3.4**: 全面启用分层记忆

### A/B 测试

```typescript
// 实验配置
const experiments = {
  'sliding-window': {
    enabled: true,
    variant: 'control' | 'treatment',
    metrics: ['token_cost', 'agent_quality', 'user_satisfaction']
  }
}
```

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| 摘要质量下降 | 中 | 高 | 多模型对比 + 人工评估 |
| Embedding 延迟 | 低 | 中 | 异步预计算 + 缓存 |
| 滑动窗口丢失关键信息 | 中 | 高 | A/B 测试 + 人工审核 |
| 性能开销 | 低 | 中 | 基准测试 + 优化 |

---

*本设计由 Agnes AI Agent 生成，基于 DSH 源码分析和最佳实践。*

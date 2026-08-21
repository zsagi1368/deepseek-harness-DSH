/**
 * PluginWatcher - 插件监控器
 *
 * 监控单个插件的运行状态，包括超时、内存、错误计数等。
 */

import { Plugin, PluginError, PluginTimeoutError, PluginMemoryError, PluginHealthStatus } from '../spec/index.js'

export interface WatcherOptions {
  timeoutMs: number
  memoryLimitMb: number
  maxCallCount?: number
  cpuLimit?: number
}

export class PluginWatcher {
  readonly pluginId: string
  private readonly plugin: Plugin
  private readonly options: WatcherOptions
  private executionCount = 0
  private errorCount = 0
  private lastError?: Error
  private startTime = Date.now()
  private timeoutHandle?: ReturnType<typeof setTimeout>

  constructor(pluginId: string, plugin: Plugin) {
    this.pluginId = pluginId
    this.plugin = plugin
    this.options = {
      timeoutMs: plugin.manifest.sandbox.resources.timeoutMs,
      memoryLimitMb: plugin.manifest.sandbox.resources.memoryLimitMb,
      maxCallCount: plugin.manifest.sandbox.resources.timeoutMs > 60000 ? 100 : undefined,
    }
  }

  async execute<T>(fn: () => Promise<T>, context?: Record<string, unknown>): Promise<T> {
    this.executionCount++

    // 检查调用次数限制
    if (this.options.maxCallCount && this.executionCount > this.options.maxCallCount) {
      throw new PluginError(
        this.pluginId,
        `Exceeded maximum call count (${this.options.maxCallCount})`
      )
    }

    // 设置超时
    this.timeoutHandle = setTimeout(() => {
      throw new PluginTimeoutError(this.pluginId, this.options.timeoutMs)
    }, this.options.timeoutMs)

    try {
      const result = await fn()
      this.recordSuccess()
      return result
    } catch (error) {
      this.recordFailure(error as Error)
      throw this.rethrowSafe(error as Error)
    } finally {
      if (this.timeoutHandle) {
        clearTimeout(this.timeoutHandle)
        this.timeoutHandle = undefined
      }
    }
  }

  getHealthStatus(): PluginHealthStatus {
    const uptime = Date.now() - this.startTime
    const errorRate = this.executionCount > 0 ? this.errorCount / this.executionCount : 0

    const maxCallCount = this.options.maxCallCount
    const isApproachingLimit = maxCallCount != null && this.executionCount > maxCallCount * 0.8

    return {
      healthy: this.errorCount === 0,
      errors: this.errorCount > 0 ? [this.lastError?.message] : undefined,
      warnings: isApproachingLimit ? ['Approaching call limit'] : undefined,
      lastError: this.lastError?.message,
      lastErrorTime: this.lastError ? Date.now() : undefined,
      uptime,
      callCount: this.executionCount,
      errorRate
    }
  }

  private recordSuccess(): void {
    // 可以增加成功指标
  }

  private recordFailure(error: Error): void {
    this.errorCount++
    this.lastError = error
  }

  private rethrowSafe(error: Error): PluginError {
    // 不暴露内部错误细节
    return new PluginError(
      this.pluginId,
      error.message.split('\n')[0],
      error.stack?.split('\n').slice(1, 3).join('\n')
    )
  }
}

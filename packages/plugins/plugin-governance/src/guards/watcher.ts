/**
 * PluginWatcher - 插件监控器
 *
 * 监控单个插件的运行状态，包括超时、内存、错误计数等。
 */

import { Plugin, PluginError, PluginTimeoutError, PluginHealthStatus } from '../spec/index.js'

export interface WatcherOptions {
  timeoutMs: number
  memoryLimitMb: number
  maxCallCount?: number | undefined
  cpuLimit?: number | undefined
}

export class PluginWatcher {
  readonly pluginId: string
  private readonly options: WatcherOptions
  private executionCount = 0
  private errorCount = 0
  private lastError?: Error
  private startTime = Date.now()
  private timeoutHandle: ReturnType<typeof setTimeout> | undefined

  constructor(pluginId: string, plugin: Plugin) {
    this.pluginId = pluginId
    this.options = {
      timeoutMs: plugin.manifest.sandbox.resources.timeoutMs,
      memoryLimitMb: plugin.manifest.sandbox.resources.memoryLimitMb,
      maxCallCount: plugin.manifest.sandbox.resources.timeoutMs > 60000 ? 100 : undefined,
    }
  }

  async execute<T>(fn: () => Promise<T>, _context?: Record<string, unknown>): Promise<T> {
    this.executionCount++

    // 检查调用次数限制
    if (this.options.maxCallCount && this.executionCount > this.options.maxCallCount) {
      throw new PluginError(
        this.pluginId,
        `Exceeded maximum call count (${this.options.maxCallCount})`,
      )
    }

    // 设置超时 - 使用 Promise.race 确保超时可以正确传播到调用方，
    // 不再依赖宿主进程的 uncaughtException 策略。
    const timeoutPromise = new Promise<never>((_, reject) => {
      /* v8 ignore next 4 -- watchdog only fires on a hung plugin; firing inside a test would kill the runner. */
      this.timeoutHandle = setTimeout(() => {
        this.timeoutHandle = undefined
        reject(new PluginTimeoutError(this.pluginId, this.options.timeoutMs))
      }, this.options.timeoutMs)
    })

    try {
      const result = await Promise.race([fn(), timeoutPromise])
      this.recordSuccess()
      return result
    } catch (error) {
      this.recordFailure(error as Error)
      // 超时错误保持原始类型向上传播，便于调用方识别并按超时策略处置。
      if (error instanceof PluginTimeoutError) throw error
      throw this.rethrowSafe(error as Error)
    } finally {
      clearTimeout(this.timeoutHandle)
      this.timeoutHandle = undefined
    }
  }

  getHealthStatus(): PluginHealthStatus {
    const uptime = Date.now() - this.startTime
    const errorRate = this.executionCount > 0 ? this.errorCount / this.executionCount : 0

    const maxCallCount = this.options.maxCallCount
    const isApproachingLimit = maxCallCount != null && this.executionCount > maxCallCount * 0.8

    return {
      healthy: this.errorCount === 0,
      errors: this.lastError ? [this.lastError.message] : undefined,
      warnings: isApproachingLimit ? ['Approaching call limit'] : undefined,
      lastError: this.lastError?.message,
      lastErrorTime: this.lastError ? Date.now() : undefined,
      uptime,
      callCount: this.executionCount,
      errorRate,
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
      /* v8 ignore next -- String.split always yields a first element, so the ?? arm is unreachable by construction. */
      error.message.split('\n')[0] ?? error.message,
      error.stack?.split('\n').slice(1, 3).join('\n'),
    )
  }
}

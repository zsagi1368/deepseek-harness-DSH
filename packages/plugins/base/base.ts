/**
 * BasePlugin - 插件基类
 * 
 * 所有插件应继承此类，获得标准生命周期管理。
 */

import {
  Plugin,
  PluginContext,
  PluginManifest,
  PluginStatus,
  PluginLogger,
  CapabilityDeclaration,
  ValidationResult,
  ValidationError
} from '../spec/index.js'

/**
 * BasePlugin - 插件基类
 * 
 * 提供标准的插件生命周期管理。
 * 子类应实现 install() 和可选的 uninstall()。
 */
export abstract class BasePlugin implements Plugin {
  readonly manifest: PluginManifest
  protected readonly context: PluginContext
  protected readonly logger: PluginLogger
  protected readonly cleanupFns: Array<() => void> = []
  protected _status: PluginStatus = PluginStatus.ACTIVE

  constructor(manifest: PluginManifest, context: PluginContext) {
    this.manifest = manifest
    this.context = context
    this.logger = context.logger
    this._status = PluginStatus.ACTIVE
  }

  get status(): PluginStatus {
    return this._status
  }

  protected set status(value: PluginStatus) {
    this._status = value
    this.logger.info(`Plugin ${this.manifest.id} status changed to ${value}`)
  }

  /**
   * 安装插件（必须实现）
   */
  abstract install(ctx: PluginContext): Promise<void> | void

  /**
   * 卸载插件（可选实现）
   */
  uninstall?(ctx: PluginContext): Promise<void> | void

  /**
   * 注册清理函数
   */
  protected addCleanup(fn: () => void): void {
    this.cleanupFns.push(fn)
  }

  /**
   * 执行清理
   */
  protected async cleanup(ctx: PluginContext): Promise<void> {
    for (const fn of this.cleanupFns) {
      try {
        fn()
      } catch (error) {
        ctx.logger.error(
          `Cleanup error in plugin ${this.manifest.id}: ${error}`
        )
      }
    }
    this.cleanupFns.length = 0
  }

  /**
   * 验证配置
   */
  protected validateConfig(
    config: Record<string, unknown>,
    schema: Record<string, unknown>
  ): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    // 简单验证：检查必需字段
    const requiredFields = schema.required || []
    for (const field of requiredFields) {
      if (config[field] === undefined) {
        errors.push({
          path: field,
          message: `Missing required field: ${field}`,
          severity: 'error'
        })
      }
    }

    // 类型验证
    const properties = schema.properties || {}
    for (const [key, value] of Object.entries(config)) {
      const propSchema = properties[key]
      if (propSchema && propSchema.type) {
        const actualType = typeof value
        if (propSchema.type === 'number' && actualType !== 'number') {
          warnings.push({
            path: key,
            message: `Expected number, got ${actualType}`,
            severity: 'warning'
          })
        } else if (propSchema.type === 'boolean' && actualType !== 'boolean') {
          warnings.push({
            path: key,
            message: `Expected boolean, got ${actualType}`,
            severity: 'warning'
          })
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * 注册能力
   */
  protected registerCapability(capability: CapabilityDeclaration): void {
    this.context.registerCapability(capability)
  }

  /**
   * 注销能力
   */
  protected unregisterCapability(name: string): void {
    this.context.unregisterCapability(name)
  }

  /**
   * 获取健康状态
   */
  getHealthStatus() {
    return {
      healthy: this._status === PluginStatus.ACTIVE,
      status: this._status,
      uptime: Date.now()
    }
  }
}

/**
 * CordisAdapter - Cordis 插件兼容层
 * 
 * 将官方 Cordis 格式的插件适配为 PluginSpec 接口，
 * 实现无缝兼容，不破坏现有插件生态。
 */

import {
  Plugin,
  PluginContext,
  PluginManifest,
  PluginStatus,
  PluginLogger,
  CapabilityDeclaration,
  PluginCertification,
  PluginPermissionLevel,
  SandboxType,
} from '../spec/index.js'

/**
 * CordisService - Cordis 插件服务基类
 * 
 * 官方插件通过此类提供功能，我们将其适配为 Plugin 接口。
 */
export interface CordisService {
  /** 服务标识 */
  static readonly serviceName?: string
  
  /** 依赖注入 */
  static inject?: string[]
  
  /** 启动方法 */
  start?(ctx: Record<string, unknown>): Promise<void> | void
  
  /** 停止方法 */
  stop?(): Promise<void> | void
  
  /** 健康检查 */
  health?(): { healthy: boolean; errors?: string[] }
}

/**
 * 默认沙箱配置 - 安全默认值，需要显式授权
 * 安全修复：默认禁用完全授权，要求显式认证
 */
const OFFICIAL_SANDBOX_CONFIG = {
  type: 'inline' as SandboxType,
  resources: {
    memoryLimitMb: 512,
    cpuLimit: 80,
    timeoutMs: 60000,
    maxOutputBytes: 10485760, // 10MB
  },
  filesystem: {
    access: 'readwrite' as const,
    allowedPaths: [],
    deniedPatterns: [],
  },
  network: {
    access: 'external' as const,
    allowedHosts: [],
    deniedHosts: [],
    allowLocal: true,
  },
  environment: {
    whitelist: [],
    blacklist: [],
    clear: false,
  },
  process: {
    spawn: true,
    exec: true,
    allowedCommands: [],
    fullyAuthorized: false, // 安全修复：默认禁用完全授权
  },
}

/**
 * CordisPluginWrapper - Cordis 插件包装器
 * 
 * 将 Cordis Service 包装为 PluginSpec 接口。
 */
export class CordisPluginWrapper implements Plugin {
  readonly manifest: PluginManifest
  private readonly service: CordisService
  private readonly context: PluginContext
  private readonly logger: PluginLogger
  private _status: PluginStatus = PluginStatus.ACTIVE

  constructor(
    service: CordisService,
    cordisConfig: {
      id: string
      name: string
      version?: string
      description?: string
      config?: Record<string, unknown>
      /** 是否完全授权（默认 true，与 core 一致） */
      fullyAuthorized?: boolean
    },
    context: PluginContext
  ) {
    this.service = service
    this.context = context
    this.logger = context.logger

    // 从 Cordis 配置生成 PluginManifest
    this.manifest = {
      id: cordisConfig.id,
      version: cordisConfig.version || '1.0.0',
      name: cordisConfig.name,
      description: cordisConfig.description,
      dsh: {
        compatible: '>=0.1.0-rc.8',
        peerDependencies: {},
      },
      capabilities: this.inferCapabilities(service),
      sandbox: {
        ...OFFICIAL_SANDBOX_CONFIG,
        // 默认需要确认，除非明确设置 autoApprove
        process: {
          ...OFFICIAL_SANDBOX_CONFIG.process,
          fullyAuthorized: false, // 默认禁用完全授权
        },
      },
      permissionLevel: cordisConfig.fullyAuthorized === true
        ? PluginPermissionLevel.CONFIRM_REQUIRED
        : PluginPermissionLevel.WORKSPACE,
      autoApprove: cordisConfig.fullyAuthorized === true, // 只有显式 true 才自动授权
      certification: {
        level: PluginCertification.OFFICIAL,
        certifiedAt: Date.now(),
      },
    }
  }

  /**
   * 推断能力声明
   */
  private inferCapabilities(service: CordisService): CapabilityDeclaration[] {
    const capabilities: CapabilityDeclaration[] = []

    // 检查是否有 serviceName
    if (service.constructor['serviceName']) {
      capabilities.push({
        type: 'service',
        service: {
          name: service.constructor['serviceName'],
          factory: `cordis:${service.constructor.name}`,
          dependencies: service.constructor['inject'] || [],
        },
      })
    }

    // 检查是否有工具方法
    const proto = service.constructor.prototype
    for (const key of Object.keys(proto)) {
      if (key.startsWith('tool_') || key.startsWith('command_')) {
        capabilities.push({
          type: 'tool',
          tool: {
            name: key.replace(/^tool_|^command_/, ''),
            description: `${key} tool`,
            schema: {},
          },
        })
      }
    }

    // 如果没有任何能力，添加默认 service 能力
    if (capabilities.length === 0) {
      capabilities.push({
        type: 'service',
        service: {
          name: service.constructor.name.toLowerCase(),
          factory: `cordis:${service.constructor.name}`,
        },
      })
    }

    return capabilities
  }

  async install(ctx: PluginContext): Promise<void> {
    this.logger.info(`CordisAdapter installing ${this.manifest.id}`)

    try {
      // 检查是否需要确认
      if (this.manifest.autoApprove !== true) {
        // 需要用户确认，调用 approval request
        const confirmed = await this.requestApproval(ctx)
        if (!confirmed) {
          this._status = PluginStatus.DISABLED
          throw new Error(`Plugin ${this.manifest.id} was rejected by user`)
        }
      }

      // 调用 Cordis Service 的 start 方法
      if (this.service.start) {
        await this.service.start(ctx.config || {})
      }
      
      this._status = PluginStatus.ACTIVE
      this.logger.info(`CordisAdapter installed ${this.manifest.id} successfully`)
    } catch (error) {
      this._status = PluginStatus.ERROR
      this.logger.error(`CordisAdapter failed to install ${this.manifest.id}: ${error}`)
      throw error
    }
  }

  /**
   * 请求用户确认（使用官方 user-approval 机制）
   * 
   * 直接调用 ctx.approval.request()，与官方 ACP 使用相同的确认流程：
   * - 弹出 allow-once / reject-once 对话框
   * - 返回 ApprovalOutcome
   */
  private async requestApproval(ctx: PluginContext): Promise<boolean> {
    // 使用 typed approval 字段（可选），若未提供则降级处理
    const approval = ctx.approval

    if (!approval || typeof approval.request !== 'function') {
      // 如果没有 approval service，默认允许（降级处理）
      this.logger.warn(`No approval service available, auto-approving ${this.manifest.id}`)
      return true
    }

    // 使用 typed agent 字段（可选）
    const agent = ctx.agent ?? { session: { events: [] } }

    try {
      // 调用官方的 approval.request()
      const outcome = await approval.request({
        agent,
        toolName: `plugin:${this.manifest.id}`,
        reason: `Plugin ${this.manifest.id} requires permissions`,
      })

      // 返回结果
      return outcome === 'allowed-once' || outcome === 'allowed-always'
    } catch (error) {
      this.logger.error(`Approval request failed for ${this.manifest.id}: ${error}`)
      return false
    }
  }

  async uninstall?(ctx: PluginContext): Promise<void> {
    this.logger.info(`CordisAdapter uninstalling ${this.manifest.id}`)
    
    try {
      if (this.service.stop) {
        await this.service.stop()
      }
      this._status = PluginStatus.DISABLED
    } catch (error) {
      this.logger.error(`CordisAdapter failed to uninstall ${this.manifest.id}: ${error}`)
    }
  }

  getHealthStatus() {
    if (this.service.health) {
      return this.service.health()
    }
    return {
      healthy: this._status === PluginStatus.ACTIVE,
      uptime: Date.now(),
    }
  }

  get status(): PluginStatus {
    return this._status
  }
}

/**
 * isCordisPlugin - 检测是否为 Cordis 插件
 */
export function isCordisPlugin(obj: unknown): obj is CordisService {
  if (!obj || typeof obj !== 'object') return false
  
  const proto = (obj as Record<string, unknown>).constructor?.prototype
  return (
    typeof (obj as CordisService).start === 'function' ||
    typeof proto?.start === 'function' ||
    'serviceName' in (obj as CordisService).constructor
  )
}

/**
 * wrapCordisPlugin - 包装 Cordis 插件为 PluginSpec 接口
 * 
 * @param service - Cordis 服务实例
 * @param context - 插件上下文
 * @param options - 配置选项
 * @param options.fullyAuthorized - 是否自动授权（默认 false，需要确认）
 */
export function wrapCordisPlugin(
  service: CordisService,
  context: PluginContext,
  options?: {
    id?: string
    name?: string
    version?: string
    /** 是否完全授权（默认 true，与 core 一致） */
    fullyAuthorized?: boolean
  }
): Plugin {
  const id = options?.id || service.constructor['serviceName'] || service.constructor.name
  const name = options?.name || service.constructor.name
  
  return new CordisPluginWrapper(service, {
    id,
    name,
    version: options?.version,
    fullyAuthorized: options?.fullyAuthorized === true, // 只有显式 true 才授权
  }, context)
}

/**
 * createCordisAdapter - 创建适配器实例
 * 
 * 用于 PluginRegistry 的自动适配。
 */
export function createCordisAdapter(context: PluginContext) {
  return {
    wrap: (service: CordisService, options?: Parameters<typeof wrapCordisPlugin>[2]) =>
      wrapCordisPlugin(service, context, options),
    isCordis: isCordisPlugin,
  }
}

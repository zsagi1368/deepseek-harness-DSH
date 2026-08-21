/**
 * PluginRegistry - 插件注册表
 * 
 * 管理所有已加载的插件，提供注册、查询、验证等功能。
 */

import {
  Plugin,
  PluginRegistry,
  RegistrationResult,
  ValidationResult,
  CompatibilityResult,
  HealthReport,
  PluginStatus,
  validatePluginId,
  normalizePluginId,
} from '../spec/index.js'

export class DefaultPluginRegistry implements PluginRegistry {
  private plugins = new Map<string, Plugin>()
  private statusMap = new Map<string, PluginStatus>()
  private errors = new Map<string, string[]>()
  private warnings = new Map<string, string[]>()

  async register(plugin: Plugin): Promise<RegistrationResult> {
    // 验证插件 ID
    const normalizedId = normalizePluginId(plugin.manifest.id)
    if (!validatePluginId(normalizedId)) {
      return {
        success: false,
        pluginId: plugin.manifest.id,
        errors: [{ path: 'id', message: 'Invalid plugin ID format', severity: 'error' }]
      }
    }

    // 检查是否已注册
    if (this.plugins.has(normalizedId)) {
      return {
        success: false,
        pluginId: normalizedId,
        errors: [{ path: 'id', message: 'Plugin already registered', severity: 'error' }]
      }
    }

    // 验证插件
    const validation = this.validate(plugin)
    if (!validation.valid) {
      return {
        success: false,
        pluginId: normalizedId,
        errors: validation.errors
      }
    }

    // 注册插件
    this.plugins.set(normalizedId, plugin)
    this.statusMap.set(normalizedId, PluginStatus.ACTIVE)
    
    // 调用 install
    try {
      await plugin.install(this.createContext(normalizedId))
      return { success: true, pluginId: normalizedId }
    } catch (error) {
      this.plugins.delete(normalizedId)
      this.statusMap.set(normalizedId, PluginStatus.ERROR)
      this.errors.set(normalizedId, [(error as Error).message])
      return {
        success: false,
        pluginId: normalizedId,
        errors: [{ path: 'install', message: (error as Error).message, severity: 'error' }]
      }
    }
  }

  async unregister(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId)
    if (!plugin) return

    try {
      await plugin.uninstall?.(this.createContext(pluginId))
    } catch (error) {
      console.error(`Failed to uninstall plugin ${pluginId}:`, error)
    }

    this.plugins.delete(pluginId)
    this.statusMap.delete(pluginId)
    this.errors.delete(pluginId)
    this.warnings.delete(pluginId)
  }

  get(pluginId: string): Plugin | null {
    return this.plugins.get(pluginId) || null
  }

  getAll(): Plugin[] {
    return Array.from(this.plugins.values())
  }

  findByCapability(type: string, name: string): Plugin[] {
    return this.getAll().filter(p => {
      return p.manifest.capabilities.some(c => c.type === type && 
        (type === 'tool' && c.tool?.name === name) ||
        (type === 'hook' && c.hook?.name === name) ||
        (type === 'service' && c.service?.name === name)
      )
    })
  }

  findActive(): Plugin[] {
    return this.getAll().filter(p => this.getStatus(p.manifest.id) === PluginStatus.ACTIVE)
  }

  findDisabled(): Plugin[] {
    return this.getAll().filter(p => this.getStatus(p.manifest.id) === PluginStatus.DISABLED)
  }

  getStatus(pluginId: string): PluginStatus {
    return this.statusMap.get(pluginId) || PluginStatus.ERROR
  }

  getHealthReport(): HealthReport {
    const plugins = this.getAll()
    return {
      total: plugins.length,
      active: plugins.filter(p => this.getStatus(p.manifest.id) === PluginStatus.ACTIVE).length,
      warnings: plugins.filter(p => this.getStatus(p.manifest.id) === PluginStatus.WARNINGS).length,
      errors: plugins.filter(p => this.getStatus(p.manifest.id) === PluginStatus.ERROR).length,
      disabled: plugins.filter(p => this.getStatus(p.manifest.id) === PluginStatus.DISABLED).length,
      plugins: plugins.map(p => ({
        id: p.manifest.id,
        name: p.manifest.name,
        status: this.getStatus(p.manifest.id),
        errors: this.errors.get(p.manifest.id),
        warnings: this.warnings.get(p.manifest.id),
      }))
    }
  }

  validate(plugin: Plugin): ValidationResult {
    const errors: any[] = []
    const warnings: any[] = []

    // 验证 ID
    if (!validatePluginId(plugin.manifest.id)) {
      errors.push({ path: 'id', message: 'Invalid plugin ID format', severity: 'error' })
    }

    // 验证版本
    if (!/^\d+\.\d+\.\d+/.test(plugin.manifest.version)) {
      errors.push({ path: 'version', message: 'Invalid semver version', severity: 'error' })
    }

    // 验证能力
    if (!plugin.manifest.capabilities?.length) {
      errors.push({ path: 'capabilities', message: 'At least one capability required', severity: 'error' })
    }

    // 验证沙箱配置
    if (!plugin.manifest.sandbox) {
      errors.push({ path: 'sandbox', message: 'Sandbox config required', severity: 'error' })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  checkCompatibility(plugin: Plugin, kernelVersion: string): CompatibilityResult {
    const compatible = plugin.manifest.dsh?.compatible || ''
    const issues: string[] = []

    // 简单兼容性检查
    if (compatible.includes('<')) {
      const maxVersion = compatible.split('<')[1]?.trim()
      if (maxVersion && kernelVersion >= maxVersion) {
        issues.push(`Plugin requires DSH < ${maxVersion}`)
      }
    }

    if (compatible.includes('>=')) {
      const minVersion = compatible.split('>=')[1]?.split(' ')[0]
      if (minVersion && kernelVersion < minVersion) {
        issues.push(`Plugin requires DSH >= ${minVersion}`)
      }
    }

    // 检查 peer dependencies
    const peerDeps = plugin.manifest.dsh?.peerDependencies || {}
    let peerDepsSatisfied = true
    for (const [dep, version] of Object.entries(peerDeps)) {
      // 这里应该检查实际安装的版本
      // 暂时假设满足
    }

    return {
      compatible: issues.length === 0,
      kernelVersion,
      requiredVersion: compatible,
      peerDepsSatisfied,
      issues
    }
  }

  async enable(pluginId: string): Promise<void> {
    this.statusMap.set(pluginId, PluginStatus.ACTIVE)
    this.errors.delete(pluginId)
  }

  async disable(pluginId: string, reason?: string): Promise<void> {
    this.statusMap.set(pluginId, PluginStatus.DISABLED)
    if (reason) {
      const errors = this.errors.get(pluginId) || []
      this.errors.set(pluginId, [...errors, reason])
    }
  }

  async update(pluginId: string, newPlugin: Plugin): Promise<void> {
    await this.unregister(pluginId)
    await this.register(newPlugin)
  }

  private createContext(pluginId: string) {
    return {
      services: new Map(),
      emit: () => {},
      on: () => () => {},
      once: () => () => {},
      off: () => {},
      config: {},
      setConfig: () => {},
      getConfig: () => undefined,
      effect: () => {},
      onDispose: () => {},
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      },
      status: PluginStatus.ACTIVE,
      setWarnings: () => {},
      markDeprecated: () => {},
      sandbox: {} as any,
      registerCapability: () => {},
      unregisterCapability: () => {},
    }
  }
}

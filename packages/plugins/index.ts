/**
 * PluginGovernance - 插件治理系统入口
 * 
 * 整合所有模块，提供统一的插件治理 API。
 */

export * from './spec/index.js'
export * from './base/base.js'
export * from './sandbox/index.js'
export * from './guards/load-guard.js'
export * from './guards/run-guard.js'
export * from './guards/health-guard.js'
export * from './registry/registry.js'

// 重新导出常用类型
export {
  Plugin,
  PluginManifest,
  PluginContext,
  PluginStatus,
  PluginLevel,
  PluginCertification,
  CapabilityDeclaration,
  PluginRegistry,
  HealthReport,
  ValidationResult,
  LoadGuard,
  RunGuard,
  HealthGuard,
  BasePlugin,
  createSandbox,
  selectSandboxType,
} from './spec/index.js'

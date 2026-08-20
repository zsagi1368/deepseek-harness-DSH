/**
 * Hook permission system for DSH plugins.
 * 
 * @module @deepseek-ai/dsh-hooks/permission
 */

import { Context, Service } from '@deepseek-ai/cordis'

/** Permission levels for hook access */
export type HookPermissionLevel = 'none' | 'read' | 'write' | 'full'

/** Permission declaration for one hook */
export interface HookPermission {
  /** Hook name (e.g., 'llm/stream', 'tools/execute') */
  hook: string
  /** Permission level */
  level: HookPermissionLevel
}

/** Plugin hook configuration */
export interface PluginHookConfig {
  /** Plugin ID */
  id: string
  /** Declared hook permissions */
  permissions: HookPermission[]
}

/** Default permission level for unknown hooks */
const DEFAULT_PERMISSION: HookPermissionLevel = 'none'

/** Permission level ordering (higher index = more access) */
const PERMISSION_ORDER: Record<HookPermissionLevel, number> = {
  'none': 0,
  'read': 1,
  'write': 2,
  'full': 3,
}

/**
 * Check if a plugin has permission to access a hook.
 * @param pluginConfig - the plugin's hook configuration
 * @param hook - the hook name to check
 * @param requiredLevel - the minimum permission level required
 * @returns true if the plugin has sufficient permission
 */
export function checkHookPermission(
  pluginConfig: PluginHookConfig,
  hook: string,
  requiredLevel: HookPermissionLevel
): boolean {
  const perm = pluginConfig.permissions.find(p => p.hook === hook)
  if (!perm) {
    // Default: deny if not declared
    return false
  }
  
  return PERMISSION_ORDER[perm.level] >= PERMISSION_ORDER[requiredLevel]
}

/**
 * Get the effective permission level for a hook.
 * @param pluginConfig - the plugin's hook configuration
 * @param hook - the hook name
 * @returns the permission level, or 'none' if not declared
 */
export function getHookPermission(
  pluginConfig: PluginHookConfig,
  hook: string
): HookPermissionLevel {
  const perm = pluginConfig.permissions.find(p => p.hook === hook)
  return perm?.level ?? DEFAULT_PERMISSION
}

/**
 * Create a new hook permission checker service.
 */
export class HookPermissionService extends Service {
  private pluginConfigs = new Map<string, PluginHookConfig>()

  constructor(ctx: Context) {
    super(ctx, 'hook-permissions')
  }

  /** Register a plugin's hook configuration */
  registerPlugin(config: PluginHookConfig): void {
    this.pluginConfigs.set(config.id, config)
  }

  /** Check if a plugin can access a hook */
  check(pluginId: string, hook: string, requiredLevel: HookPermissionLevel): boolean {
    const config = this.pluginConfigs.get(pluginId)
    if (!config) {
      this.ctx.logger.warn(`Unknown plugin ${pluginId} attempting hook ${hook}`)
      return false
    }
    return checkHookPermission(config, hook, requiredLevel)
  }

  /** Get all permissions for a plugin */
  getPluginPermissions(pluginId: string): HookPermission[] {
    const config = this.pluginConfigs.get(pluginId)
    return config?.permissions ?? []
  }
}

/** Extend Context with hook permissions service */
declare module '@deepseek-ai/cordis' {
  interface Context {
    hookPermissions: HookPermissionService
  }
}

/**
 * 插件持久化管理
 * 
 * 所有插件配置、缓存、日志都存储在分支目录的.dsh-plugins子目录中，
 * 完全独立于官方的 ~/.dsh/ 目录，不会冲突。
 */

export { PluginPersistence, createDefaultPersistence } from './plugin-persistence.js'
export type { PluginPersistenceConfig } from './plugin-persistence.js'

/**
 * 默认数据存储目录名称
 */
export const DEFAULT_PLUGIN_STORAGE_DIR = '.dsh-plugins'

/**
 * 可通过环境变量 DSH_PLUGIN_HOME 自定义存储位置
 */

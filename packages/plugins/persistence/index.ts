/**
 * 插件持久化管理
 *
 * 所有插件配置、缓存、日志都存储在分支目录的deepseek-harness-branchDSH子目录中，
 * 完全独立于官方的 ~/.dsh/ 目录，不会冲突。
 *
 * 目录结构：
 * <branch-root>/deepseek-harness-branchDSH/
 * ├── registry.json      # 插件注册表
 * ├── cache/             # 缓存目录
 * ├── logs/              # 日志目录
 * └── data/              # 数据目录
 */

export { PluginPersistence, createDefaultPersistence } from './plugin-persistence.js'
export type { PluginPersistenceConfig } from './plugin-persistence.js'

/**
 * 默认数据存储目录名称（相对于分支根目录）
 * 与官方的 ~/.dsh 对应，但存储在分支目录下
 */
export const DSH_BRANCH_DIR_NAME = 'deepseek-harness-branchDSH'

/**
 * 环境变量名称（用于自定义存储位置）
 * 与官方的 DSH_HOME 对应
 */
export const DSH_BRANCH_HOME_ENV = 'DSH_BRANCH_HOME'

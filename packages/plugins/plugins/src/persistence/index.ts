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

export { PluginPersistence, createDefaultPersistence, DSH_BRANCH_DIR_NAME, DSH_BRANCH_HOME_ENV } from './plugin-persistence.js'
export type { PluginPersistenceConfig } from './plugin-persistence.js'

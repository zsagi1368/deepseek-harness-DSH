/**
 * PluginPersistence - 插件持久化管理
 *
 * 将PluginRegistry的状态持久化到文件系统。
 * 默认使用分支目录下的.dsh-plugins子目录，完全独立于官方的 ~/.dsh/。
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { PluginRegistry, PluginManifest } from '../spec/index.js'

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

/**
 * 插件持久化配置
 */
export interface PluginPersistenceConfig {
  /** 数据根目录（默认：分支目录下的 .dsh-plugins） */
  storageRoot?: string | undefined
  /** 是否自动保存 */
  autoSave?: boolean | undefined
  /** 保存间隔（毫秒） */
  saveIntervalMs?: number | undefined
}

/** registry.json 落盘格式 */
interface PersistedRegistry {
  version: string
  savedAt: string
  storageRoot: string
  plugins: Array<{ id: string; name: string; version: string; status: string; manifest: PluginManifest }>
}

/** 收窄 JSON.parse 结果：合法的落盘注册表形状 */
function isPersistedRegistry(value: unknown): value is PersistedRegistry {
  if (!value || typeof value !== 'object') return false
  const candidate = value as { plugins?: unknown }
  return Array.isArray(candidate.plugins)
}

/** 解析完成（无 undefined 洞）的持久化配置 */
interface ResolvedPersistenceConfig {
  storageRoot: string
  autoSave: boolean
  saveIntervalMs: number
}

/**
 * PluginPersistence - 插件持久化管理器
 *
 * 所有插件配置、缓存、日志都存储在分支目录的.dsh-plugins子目录中，
 * 完全独立于官方的 ~/.dsh/ 目录，不会冲突。
 *
 * 目录结构：
 * <branch-root>/.dsh-plugins/
 * ├── registry.json      # 插件注册表
 * ├── cache/             # 缓存目录
 * ├── logs/              # 日志目录
 * └── data/              # 数据目录
 */
export class PluginPersistence {
  private config: ResolvedPersistenceConfig
  private registry: PluginRegistry
  private saveTimer: ReturnType<typeof setInterval> | null = null

  constructor(registry: PluginRegistry, config?: PluginPersistenceConfig) {
    this.registry = registry
    this.config = {
      storageRoot: config?.storageRoot ?? this.resolveDefaultStorageRoot(),
      autoSave: config?.autoSave ?? true,
      saveIntervalMs: config?.saveIntervalMs ?? 60000,
    }
  }

  /**
   * 解析默认存储根目录
   *
   * 优先级：
   * 1. 配置参数 storageRoot
   * 2. 环境变量 DSH_BRANCH_HOME
   * 3. 当前工作目录下的 deepseek-harness-branchDSH
   *
   * 与官方的 DSH_HOME 机制对应：
   * - 官方: DSH_HOME -> ~/.dsh
   * - 我们: DSH_BRANCH_HOME -> deepseek-harness-branchDSH (相对分支目录)
   */
  private resolveDefaultStorageRoot(): string {
    // 1. 优先使用环境变量
    const envPath = process.env[DSH_BRANCH_HOME_ENV]
    if (envPath && envPath.trim().length > 0) {
      return resolve(envPath)
    }

    // 2. 默认使用当前工作目录下的 deepseek-harness-branchDSH
    return resolve(process.cwd(), DSH_BRANCH_DIR_NAME)
  }

  /**
   * 获取数据目录路径
   */
  get storagePath(): string {
    return this.config.storageRoot
  }

  /**
   * 获取插件注册表文件路径
   */
  get registryPath(): string {
    return join(this.config.storageRoot, 'registry.json')
  }

  /**
   * 获取插件缓存目录
   */
  get cacheDir(): string {
    return join(this.config.storageRoot, 'cache')
  }

  /**
   * 获取插件日志目录
   */
  get logDir(): string {
    return join(this.config.storageRoot, 'logs')
  }

  /**
   * 获取插件数据目录
   */
  get dataDir(): string {
    return join(this.config.storageRoot, 'data')
  }

  /**
   * 启动持久化
   */
  start(): void {
    if (this.config.autoSave) {
      this.saveTimer = setInterval(() => {
        this.save()
      }, this.config.saveIntervalMs)
    }
  }

  /**
   * 停止持久化
   */
  stop(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer)
      this.saveTimer = null
    }
  }

  /**
   * 保存插件注册表到文件
   */
  save(): void {
    const plugins = this.registry.getAll()
    const data: PersistedRegistry = {
      version: '1.0.0',
      savedAt: new Date().toISOString(),
      storageRoot: this.config.storageRoot,
      plugins: plugins.map(p => ({
        id: p.manifest.id,
        name: p.manifest.name,
        version: p.manifest.version,
        status: this.registry.getStatus(p.manifest.id),
        manifest: p.manifest,
      })),
    }

    mkdirSync(dirname(this.registryPath), { recursive: true })
    writeFileSync(this.registryPath, JSON.stringify(data, null, 2))
  }

  /**
   * 从文件加载插件注册表
   */
  load(): PluginManifest[] {
    if (!existsSync(this.registryPath)) {
      return []
    }

    const parsed: unknown = JSON.parse(readFileSync(this.registryPath, 'utf-8'))
    if (!isPersistedRegistry(parsed)) {
      return []
    }
    const manifests: PluginManifest[] = []
    for (const entry of parsed.plugins as Array<unknown>) {
      // 落盘内容不受信：逐条收窄后再取 manifest。
      if (entry && typeof entry === 'object' && 'manifest' in entry) {
        manifests.push((entry as { manifest: PluginManifest }).manifest)
      }
    }
    return manifests
  }

  /**
   * 确保所有必要目录存在
   */
  ensureDirectories(): void {
    mkdirSync(this.config.storageRoot, { recursive: true })
    mkdirSync(this.cacheDir, { recursive: true })
    mkdirSync(this.logDir, { recursive: true })
    mkdirSync(this.dataDir, { recursive: true })
  }

  /**
   * 清理所有数据
   */
  clear(): void {
    rmSync(this.config.storageRoot, { recursive: true, force: true })
  }
}

/**
 * 创建默认的PluginPersistence实例
 * 使用当前分支目录作为存储根目录
 */
export function createDefaultPersistence(registry: PluginRegistry): PluginPersistence {
  return new PluginPersistence(registry)
}

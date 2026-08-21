/**
 * Plugin Manager - 完整插件管理界面
 * 
 * 功能：
 * - 启用/停止/重装/卸载单个插件
 * - 恢复默认（CORE默认状态）
 * - 保存自定义Preset
 * - 读取自定义Preset
 * - 删除自定义Preset
 * - 批量选择（全选、反选、多选）
 * - 批量操作（启用、停止）
 */

import { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { resolveSlotLabel } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-api-remotes/client'

// ========== 类型定义 ==========

/** 插件状态 */
export type PluginStatus = 'active' | 'disabled' | 'error' | 'loading'

/** 插件信息 */
export interface PluginInfo {
  id: string
  name: string
  version: string
  description?: string
  status: PluginStatus
  isOfficial: boolean
  author?: string
  capabilities: string[]
  lastError?: string
}

/** 批量操作类型 */
export type BatchAction = 'enable' | 'disable'

/** Preset 信息 */
export interface PluginPreset {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  plugins: Record<string, PluginStatus>
}

/** 插件选择状态 */
export type SelectionMode = 'none' | 'single' | 'multi' | 'select-all' | 'invert'

// ========== Locale 定义 ==========

export type PluginManagerLocaleKey =
  | 'nav' | 'title' | 'intro'
  | 'search' | 'filter' | 'filterAll' | 'filterOfficial' | 'filterCommunity'
  | 'selectAll' | 'invertSelection' | 'clearSelection'
  | 'batchEnable' | 'batchDisable' | 'batchInstall' | 'batchUninstall'
  | 'enable' | 'stop' | 'restart' | 'uninstall' | 'reinstall'
  | 'enabled' | 'disabled' | 'loading' | 'error'
  | 'restoreDefaults' | 'savePreset' | 'loadPreset' | 'deletePreset'
  | 'presetName' | 'presetNameHint' | 'presetSaved' | 'presetLoaded' | 'presetDeleted'
  | 'noPlugins' | 'loadingPlugins'
  | 'confirmEnable' | 'confirmDisable' | 'confirmUninstall' | 'confirmRestore'
  | 'pluginCount' | 'selectedCount'

export const en: Record<PluginManagerLocaleKey, string> = {
  nav: 'Plugin Manager',
  title: 'Plugin Manager',
  intro: 'Manage all plugins: enable, disable, install, uninstall, and save presets.',
  
  // 搜索和过滤
  search: 'Search plugins...',
  filter: 'Filter:',
  filterAll: 'All',
  filterOfficial: 'Official',
  filterCommunity: 'Community',
  
  // 批量选择
  selectAll: 'Select All',
  invertSelection: 'Invert Selection',
  clearSelection: 'Clear Selection',
  
  // 批量操作
  batchEnable: 'Enable Selected',
  batchDisable: 'Disable Selected',
  batchInstall: 'Install Selected',
  batchUninstall: 'Uninstall Selected',
  
  // 单个操作
  enable: 'Enable',
  stop: 'Stop',
  restart: 'Restart',
  uninstall: 'Uninstall',
  reinstall: 'Reinstall',
  
  // 状态
  enabled: 'Enabled',
  disabled: 'Disabled',
  loading: 'Loading...',
  error: 'Error',
  
  // Preset管理
  restoreDefaults: 'Restore Defaults',
  savePreset: 'Save Preset',
  loadPreset: 'Load Preset',
  deletePreset: 'Delete Preset',
  presetName: 'Preset Name',
  presetNameHint: 'Enter a name for this preset...',
  presetSaved: 'Preset saved successfully',
  presetLoaded: 'Preset loaded successfully',
  presetDeleted: 'Preset deleted',
  
  // 列表
  noPlugins: 'No plugins found',
  loadingPlugins: 'Loading plugins...',
  
  // 确认对话框
  confirmEnable: 'Enable {count} plugins?',
  confirmDisable: 'Disable {count} plugins?',
  confirmUninstall: 'Uninstall {count} plugins? This cannot be undone.',
  confirmRestore: 'Restore all plugins to default state?',
  
  // 计数
  pluginCount: '{count} plugins',
  selectedCount: '{count} selected',
}

export const zh: Record<PluginManagerLocaleKey, string> = {
  nav: '插件管理',
  title: '插件管理器',
  intro: '管理所有插件：启用、停止、安装、卸载、保存预设。',
  
  // 搜索和过滤
  search: '搜索插件...',
  filter: '过滤：',
  filterAll: '全部',
  filterOfficial: '官方',
  filterCommunity: '社区',
  
  // 批量选择
  selectAll: '全选',
  invertSelection: '反选',
  clearSelection: '清除选择',
  
  // 批量操作
  batchEnable: '启用选中',
  batchDisable: '停止选中',
  batchInstall: '安装选中',
  batchUninstall: '卸载选中',
  
  // 单个操作
  enable: '启用',
  stop: '停止',
  restart: '重启',
  uninstall: '卸载',
  reinstall: '重装',
  
  // 状态
  enabled: '已启用',
  disabled: '已停止',
  loading: '加载中...',
  error: '错误',
  
  // Preset管理
  restoreDefaults: '恢复默认',
  savePreset: '保存预设',
  loadPreset: '读取预设',
  deletePreset: '删除预设',
  presetName: '预设名称',
  presetNameHint: '输入预设名称...',
  presetSaved: '预设已保存',
  presetLoaded: '预设已加载',
  presetDeleted: '预设已删除',
  
  // 列表
  noPlugins: '未找到插件',
  loadingPlugins: '加载插件中...',
  
  // 确认对话框
  confirmEnable: '启用 {count} 个插件？',
  confirmDisable: '停止 {count} 个插件？',
  confirmUninstall: '卸载 {count} 个插件？此操作不可撤销。',
  confirmRestore: '恢复所有插件到默认状态？',
  
  // 计数
  pluginCount: '{count} 个插件',
  selectedCount: '已选 {count} 个',
}

// ========== PluginManagerController ==========

export class PluginManagerController {
  private plugins: PluginInfo[] = []
  private presets: PluginPreset[] = []
  private selection: Set<string> = new Set()
  private selectionMode: SelectionMode = 'none'
  private searchQuery = ''
  private filterType: 'all' | 'official' | 'community' = 'all'
  
  constructor(
    private ctx: ClientContext,
    private api: ConnectionHandle['api']
  ) {
    this.loadPlugins()
    this.loadPresets()
  }
  
  // ========== 插件管理 ==========
  
  async loadPlugins(): Promise<void> {
    try {
      this.setLoading(true)
      // TODO: 调用实际的插件管理 API
      // const response = await this.api.get('/api/plugins')
      // this.plugins = response.plugins
    } catch (error) {
      console.error('Failed to load plugins:', error)
    } finally {
      this.setLoading(false)
    }
  }
  
  async enablePlugin(pluginId: string): Promise<boolean> {
    try {
      // TODO: 调用实际API
      // await this.api.post(`/api/plugins/${pluginId}/enable`)
      return true
    } catch (error) {
      console.error('Failed to enable plugin:', error)
      return false
    }
  }
  
  async disablePlugin(pluginId: string): Promise<boolean> {
    try {
      // TODO: 调用实际API
      // await this.api.post(`/api/plugins/${pluginId}/disable`)
      return true
    } catch (error) {
      console.error('Failed to disable plugin:', error)
      return false
    }
  }
  
  async reinstallPlugin(pluginId: string): Promise<boolean> {
    try {
      // TODO: 调用实际API
      // await this.api.post(`/api/plugins/${pluginId}/reinstall`)
      return true
    } catch (error) {
      console.error('Failed to reinstall plugin:', error)
      return false
    }
  }
  
  async uninstallPlugin(pluginId: string): Promise<boolean> {
    try {
      // TODO: 调用实际API
      // await this.api.post(`/api/plugins/${pluginId}/uninstall`)
      return true
    } catch (error) {
      console.error('Failed to uninstall plugin:', error)
      return false
    }
  }
  
  async restoreDefaults(): Promise<boolean> {
    try {
      // TODO: 调用实际API
      // await this.api.post('/api/plugins/restore-defaults')
      return true
    } catch (error) {
      console.error('Failed to restore defaults:', error)
      return false
    }
  }
  
  // ========== 批量操作 ==========
  
  async batchOperation(action: BatchAction): Promise<void> {
    const selected = this.getSelectedPlugins()
    if (selected.length === 0) return
    
    for (const plugin of selected) {
      if (action === 'enable') {
        await this.enablePlugin(plugin.id)
      } else {
        await this.disablePlugin(plugin.id)
      }
    }
    
    this.clearSelection()
    await this.loadPlugins()
  }
  
  // ========== 选择管理 ==========
  
  toggleSelection(pluginId: string): void {
    if (this.selection.has(pluginId)) {
      this.selection.delete(pluginId)
    } else {
      this.selection.add(pluginId)
    }
    this.notifyListeners()
  }
  
  selectAll(): void {
    const filtered = this.getFilteredPlugins()
    filtered.forEach(p => this.selection.add(p.id))
    this.selectionMode = 'select-all'
    this.notifyListeners()
  }
  
  invertSelection(): void {
    const filtered = this.getFilteredPlugins()
    filtered.forEach(p => {
      if (this.selection.has(p.id)) {
        this.selection.delete(p.id)
      } else {
        this.selection.add(p.id)
      }
    })
    this.selectionMode = 'invert'
    this.notifyListeners()
  }
  
  clearSelection(): void {
    this.selection.clear()
    this.selectionMode = 'none'
    this.notifyListeners()
  }
  
  is_selected(pluginId: string): boolean {
    return this.selection.has(pluginId)
  }
  
  getSelectedCount(): number {
    return this.selection.size
  }
  
  getSelectedPlugins(): PluginInfo[] {
    return this.plugins.filter(p => this.selection.has(p.id))
  }
  
  // ========== 搜索和过滤 ==========
  
  setSearchQuery(query: string): void {
    this.searchQuery = query
    this.notifyListeners()
  }
  
  setFilterType(type: 'all' | 'official' | 'community'): void {
    this.filterType = type
    this.notifyListeners()
  }
  
  getFilteredPlugins(): PluginInfo[] {
    return this.plugins.filter(p => {
      const matchesSearch = !this.searchQuery || 
        p.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(this.searchQuery.toLowerCase())
      
      const matchesFilter = this.filterType === 'all' ||
        (this.filterType === 'official' && p.isOfficial) ||
        (this.filterType === 'community' && !p.isOfficial)
      
      return matchesSearch && matchesFilter
    })
  }
  
  // ========== Preset管理 ==========
  
  async loadPresets(): Promise<void> {
    try {
      // TODO: 从localStorage或服务器加载
      const stored = localStorage.getItem('dsh-plugin-presets')
      if (stored) {
        this.presets = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load presets:', error)
    }
  }
  
  async savePreset(name: string): Promise<boolean> {
    try {
      const preset: PluginPreset = {
        id: `preset-${Date.now()}`,
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        plugins: Object.fromEntries(
          this.plugins.map(p => [p.id, p.status])
        )
      }
      
      this.presets.push(preset)
      await this.persistPresets()
      return true
    } catch (error) {
      console.error('Failed to save preset:', error)
      return false
    }
  }
  
  async loadPreset(presetId: string): Promise<boolean> {
    try {
      const preset = this.presets.find(p => p.id === presetId)
      if (!preset) return false
      
      // 应用预设状态
      for (const [pluginId, status] of Object.entries(preset.plugins)) {
        if (status === 'active') {
          await this.enablePlugin(pluginId)
        } else {
          await this.disablePlugin(pluginId)
        }
      }
      
      await this.loadPlugins()
      return true
    } catch (error) {
      console.error('Failed to load preset:', error)
      return false
    }
  }
  
  async deletePreset(presetId: string): Promise<boolean> {
    try {
      this.presets = this.presets.filter(p => p.id !== presetId)
      await this.persistPresets()
      return true
    } catch (error) {
      console.error('Failed to delete preset:', error)
      return false
    }
  }
  
  private async persistPresets(): Promise<void> {
    localStorage.setItem('dsh-plugin-presets', JSON.stringify(this.presets))
  }
  
  // ========== 状态查询 ==========
  
  getPlugins(): PluginInfo[] {
    return this.getFilteredPlugins()
  }
  
  getPresets(): PluginPreset[] {
    return this.presets
  }
  
  isLoading(): boolean {
    return this.plugins.length === 0 && this.selectionMode === 'none'
  }
  
  hasSelection(): boolean {
    return this.selection.size > 0
  }
  
  // ========== 监听器 ==========
  
  private listeners = new Set<() => void>()
  
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
  
  private setLoading(loading: boolean): void {
    // TODO: 实现loading状态
    this.notifyListeners()
  }
}

// ========== React Component ==========

export function PluginManagerSection(props: {
  controller: PluginManagerController
  t: (key: PluginManagerLocaleKey) => string
}) {
  // TODO: 实现React组件
  return null
}

// ========== Cordis Plugin ==========

export const name = 'plugin-manager'
export const inject = ['slots', 'locale', 'connection', 'remote', 'settingsScope']

export function apply(ctx: ClientContext): void {
  const { api } = ctx.get('connection') as ConnectionHandle
  const t = ctx.locale.bind('settings.plugins.manager')
  
  const controller = new PluginManagerController(ctx, api)
  
  ctx.effect(() => ctx.locale.register('settings.plugins.manager', { zh, en }), 'plugin-manager: register locale')
  
  // TODO: 注入UI slot
}

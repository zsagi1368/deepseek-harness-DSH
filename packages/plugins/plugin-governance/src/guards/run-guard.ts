/**
 * RunGuard - 运行时守卫
 *
 * 监控插件运行时行为，包括超时、内存、调用次数等。
 */

import { Plugin } from '../spec/index.js'
import { PluginWatcher } from './watcher.js'

export class RunGuard {
  private watchers = new Map<string, PluginWatcher>()

  watch(pluginId: string, plugin: Plugin): PluginWatcher {
    if (this.watchers.has(pluginId)) {
      throw new Error(`Watcher already exists for plugin: ${pluginId}`)
    }

    const watcher = new PluginWatcher(pluginId, plugin)
    this.watchers.set(pluginId, watcher)
    return watcher
  }

  unwatch(pluginId: string): void {
    this.watchers.delete(pluginId)
  }

  async execute<T>(
    pluginId: string,
    fn: () => Promise<T>,
    _context?: Record<string, unknown>,
  ): Promise<T> {
    const watcher = this.watchers.get(pluginId)
    if (!watcher) {
      throw new Error(`No watcher for plugin: ${pluginId}`)
    }

    return watcher.execute(fn)
  }

  getActiveWatchers(): string[] {
    return Array.from(this.watchers.keys())
  }

  getWatcher(pluginId: string): PluginWatcher | undefined {
    return this.watchers.get(pluginId)
  }
}

/**
 * 插件治理系统 - 集成测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DefaultPluginRegistry } from '../packages/plugins/registry/registry.js'
import { BasePlugin } from '../packages/plugins/base/base.js'
import { PluginManifest, PluginStatus, PluginContext } from '../packages/plugins/spec/index.js'

/**
 * 最小化 mock PluginContext — 替代原始测试中反复使用的 {} as any
 */
function createMockContext(): PluginContext {
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
    sandbox: {
      exec: async () => ({ exitCode: 0, stdout: '', stderr: '', duration: 0 }),
      read: async () => '',
      write: async () => {},
      list: async () => [],
    },
    registerCapability: () => {},
    unregisterCapability: () => {},
  }
}

describe('Plugin Registry Integration', () => {
  let registry: DefaultPluginRegistry

  beforeEach(() => {
    registry = new DefaultPluginRegistry()
  })

  const createTestManifest = (overrides: Partial<PluginManifest> = {}): PluginManifest => ({
    id: 'test/plugin',
    version: '1.0.0',
    name: 'Test Plugin',
    dsh: {
      compatible: '>=0.1.0-rc.8',
    },
    capabilities: [
      {
        type: 'tool',
        tool: {
          name: 'test_tool',
          description: 'A test tool',
          schema: { type: 'object' },
        },
      },
    ],
    sandbox: {
      type: 'inline',
      resources: {
        memoryLimitMb: 128,
        cpuLimit: 50,
        timeoutMs: 30000,
        maxOutputBytes: 10000,
      },
      filesystem: { access: 'readonly', allowedPaths: [], deniedPatterns: [] },
      network: { access: 'none', allowedHosts: [], deniedHosts: [], allowLocal: false },
      environment: { whitelist: [], blacklist: [], clear: false },
      process: { spawn: false, exec: false, allowedCommands: [] },
    },
    ...overrides,
  })

  it('should register a valid plugin', async () => {
    class TestPlugin extends BasePlugin {
      async install() {
        // Simulate installation
      }
    }

    const manifest = createTestManifest()
    const plugin = new TestPlugin(manifest, createMockContext())

    const result = await registry.register(plugin)
    expect(result.success).toBe(true)
    expect(result.pluginId).toBe('test/plugin')
  })

  it('should reject invalid plugin ID', async () => {
    class TestPlugin extends BasePlugin {
      async install() {}
    }

    const manifest = createTestManifest({ id: 'invalid' })
    const plugin = new TestPlugin(manifest, createMockContext())

    const result = await registry.register(plugin)
    expect(result.success).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it('should track plugin status', async () => {
    class TestPlugin extends BasePlugin {
      async install() {}
    }

    const manifest = createTestManifest()
    const plugin = new TestPlugin(manifest, createMockContext())

    await registry.register(plugin)
    expect(registry.getStatus('test/plugin')).toBe(PluginStatus.ACTIVE)
  })

  it('should unregister a plugin', async () => {
    class TestPlugin extends BasePlugin {
      async install() {}
      async uninstall() {}
    }

    const manifest = createTestManifest()
    const plugin = new TestPlugin(manifest, createMockContext())

    await registry.register(plugin)
    await registry.unregister('test/plugin')

    expect(registry.get('test/plugin')).toBeNull()
  })

  it('should generate health report', async () => {
    class TestPlugin extends BasePlugin {
      async install() {}
    }

    const manifest = createTestManifest()
    const plugin = new TestPlugin(manifest, createMockContext())

    await registry.register(plugin)
    const report = registry.getHealthReport()

    expect(report.total).toBe(1)
    expect(report.active).toBe(1)
    expect(report.plugins).toHaveLength(1)
  })
})

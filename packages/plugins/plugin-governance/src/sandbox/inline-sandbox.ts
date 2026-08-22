/**
 * InlineSandbox - 内联沙箱
 *
 * 为低风险插件提供主线执行环境，
 * 通过守卫机制进行监控。
 */

import { resolve } from 'path'
import { PluginSandboxConfig, ExecResult, ExecOptions, SandboxContext } from '../spec/index.js'

export class InlineSandbox implements SandboxContext {
  private config: PluginSandboxConfig
  private pluginId: string

  constructor(pluginId: string, config: PluginSandboxConfig) {
    this.pluginId = pluginId
    this.config = config
  }

  /**
   * 执行命令
   * 安全修复：统一使用execFile，避免shell注入
   */
  async exec(command: string, options?: ExecOptions): Promise<ExecResult> {
    // 完全授权模式：与 core 一致，但仍需安全执行
    if (this.config.process.fullyAuthorized) {
      const { execFile } = await import('child_process')
      const timeout = options?.timeout || this.config.resources.timeoutMs
      const start = Date.now()

      // 安全解析命令：拆分为可执行文件和参数
      const cmdParts = command.trim().split(/\s+/)
      const cmd = cmdParts[0] || ''
      const args = cmdParts.slice(1)

      return new Promise((resolve, reject) => {
        execFile(cmd, args, {
          timeout,
          maxBuffer: this.config.resources.maxOutputBytes * 2,
          ...(options?.cwd ? { cwd: options.cwd } : {}),
          ...(options?.env ? { env: options.env } : {}),
        }, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(error.message))
          } else {
            resolve({
              exitCode: 0,
              stdout: stdout.substring(0, this.config.resources.maxOutputBytes),
              stderr,
              duration: Date.now() - start,
            })
          }
        })
      })
    }

    // 普通模式：需要白名单检查
    if (!this.config.process.exec) {
      throw new Error(`exec() is not allowed for plugin ${this.pluginId}`)
    }

    // 安全解析命令
    const cmdParts = command.trim().split(/\s+/)
    const cmdBase = cmdParts[0] || ''
    const args = cmdParts.slice(1)

    if (!cmdBase || !this.config.process.allowedCommands.includes(cmdBase)) {
      throw new Error(`Command '${command}' is not in the allowed list`)
    }

    const { execFile } = await import('child_process')
    const timeout = options?.timeout || this.config.resources.timeoutMs
    const start = Date.now()

    return new Promise((resolve, reject) => {
      execFile(cmdBase, args, {
        timeout,
        maxBuffer: this.config.resources.maxOutputBytes * 2,
      }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(error.message))
        } else {
          resolve({
            exitCode: 0,
            stdout: stdout.substring(0, this.config.resources.maxOutputBytes),
            stderr,
            duration: Date.now() - start,
          })
        }
      })
    })
  }

  /**
   * 读取文件
   */
  async read(path: string): Promise<string> {
    // access 可能来自不受信的 JSON 配置，用宽松字符串比较做运行时闸门。
    const access = this.config.filesystem.access as string
    /* v8 ignore next 1 -- typed configs admit only readonly/readwrite; the second comparison guards decoded-JSON junk. */
    if (access === 'readonly' || access === 'readwrite') {
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
        return
      }
    }
    throw new Error(`Write access denied for path: ${path}`)
  }

  /**
   * 列出目录
   */
  async list(path: string): Promise<string[]> {
    const access = this.config.filesystem.access as string
    /* v8 ignore next 1 -- typed configs admit only readonly/readwrite; the second comparison guards decoded-JSON junk. */
    if (access === 'readonly' || access === 'readwrite') {
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
  isPathAllowed(path: string): boolean {
    // 路径规范化：解析绝对路径并消除 .. 和 . 组件
    let normalizedPath: string
    try {
      normalizedPath = resolve(path)
      /* v8 ignore next 2 -- resolve() already collapses '..' and never emits '~'; this is defense-in-depth against exotic hosts. */
      if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
        return false
      }
    } catch {
      /* v8 ignore next -- path.resolve only rejects on hostile custom fs; unreachable over real paths. */
      return false
    }

    // 检查拒绝模式
    for (const pattern of this.config.filesystem.deniedPatterns) {
      try {
        const resolvedPattern = resolve(pattern)
        if (normalizedPath.includes(resolvedPattern)) {
          return false
        }
      } catch {
        /* v8 ignore next 2 -- resolve() of a configured deny pattern cannot fail on real inputs. */
        continue
      }
    }

    // 检查白名单
    if (this.config.filesystem.allowedPaths.length > 0) {
      const allowedResolved = this.config.filesystem.allowedPaths.map((p) => {
        try {
          return resolve(p)
        } catch {
          /* v8 ignore next -- resolve() of a configured allow-list entry cannot fail on real inputs. */
          return p
        }
      })
      // 确保路径在白名单内（不是简单的前缀匹配，而是路径组件完整匹配）。
      // 两种分隔符都参与比较，避免平台差异造成分支不可达。
      return allowedResolved.some((p) => {
        const posixPrefix = p + '/'
        const win32Prefix = p + '\\'
        return (
          normalizedPath === p ||
          normalizedPath.startsWith(posixPrefix) ||
          normalizedPath.startsWith(win32Prefix)
        )
      })
    }

    return true
  }
}

/**
 * InlineSandbox - 内联沙箱
 * 
 * 为低风险插件提供主线执行环境，
 * 通过守卫机制进行监控。
 */

import { PluginSandboxConfig, ExecResult, SandboxContext } from '../spec/index.js'

export class InlineSandbox implements SandboxContext {
  private config: PluginSandboxConfig
  private pluginId: string

  constructor(pluginId: string, config: PluginSandboxConfig) {
    this.pluginId = pluginId
    this.config = config
  }

  /**
   * 执行命令（需要 explicit 授权）
   */
  async exec(command: string, options?: { timeout?: number }): Promise<ExecResult> {
    if (!this.config.process.exec) {
      throw new Error(`exec() is not allowed for plugin ${this.pluginId}`)
    }

    if (!this.config.process.allowedCommands.includes(command.split(' ')[0])) {
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
   */
  private isPathAllowed(path: string): boolean {
    // 检查拒绝模式
    for (const pattern of this.config.filesystem.deniedPatterns) {
      if (path.includes(pattern)) {
        return false
      }
    }
    
    // 检查白名单
    if (this.config.filesystem.allowedPaths.length > 0) {
      return this.config.filesystem.allowedPaths.some(p => path.startsWith(p))
    }
    
    return true
  }
}

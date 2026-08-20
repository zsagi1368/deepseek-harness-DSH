/**
 * ProcessSandbox - 进程级沙箱
 * 
 * 为高风险插件提供独立的进程隔离。
 * 使用 Node.js child_process 创建独立进程，
 * 并通过 IPC 进行通信。
 */

import { spawn, ChildProcess, IPCChannel } from 'child_process'
import { join, dirname } from 'path'
import { PluginSandboxConfig, ExecResult, SandboxContext } from '../spec/index.js'

interface ProcessHandle {
  process: ChildProcess
  startTime: number
  memoryUsage: number
  exitCode: number | null
  signal: string | null
}

export class ProcessSandbox implements SandboxContext {
  private processes = new Map<string, ProcessHandle>()
  private pluginId: string
  private config: PluginSandboxConfig
  private entryPoint: string

  constructor(pluginId: string, config: PluginSandboxConfig, entryPoint: string) {
    this.pluginId = pluginId
    this.config = config
    this.entryPoint = entryPoint
  }

  /**
   * 启动插件进程
   */
  async start(): Promise<void> {
    if (this.processes.has(this.pluginId)) {
      throw new Error(`Plugin ${this.pluginId} is already running`)
    }

    // 过滤环境变量
    const filteredEnv = this.filterEnvironment()

    // 创建子进程
    const child = spawn('node', [this.entryPoint], {
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      env: filteredEnv,
      detached: false,
      windowsHide: true,
    })

    const handle: ProcessHandle = {
      process: child,
      startTime: Date.now(),
      memoryUsage: 0,
      exitCode: null,
      signal: null,
    }

    this.processes.set(this.pluginId, handle)

    // 设置事件监听
    child.on('exit', (code, signal) => {
      handle.exitCode = code
      handle.signal = signal
      this.processes.delete(this.pluginId)
    })

    child.on('error', (error) => {
      this.processes.delete(this.pluginId)
      throw error
    })

    // 开始监控
    this.monitorProcess(this.pluginId)
  }

  /**
   * 停止插件进程
   */
  async stop(): Promise<void> {
    const handle = this.processes.get(this.pluginId)
    if (!handle) return

    handle.process.kill('SIGTERM')
    
    // 等待进程退出
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        handle.process.kill('SIGKILL')
        resolve()
      }, 5000)

      handle.process.once('exit', () => {
        clearTimeout(timeout)
        resolve()
      })
    })

    this.processes.delete(this.pluginId)
  }

  /**
   * 执行命令
   */
  async exec(command: string, options?: { timeout?: number }): Promise<ExecResult> {
    if (!this.config.process.exec && !this.config.process.allowedCommands.includes(command.split(' ')[0])) {
      throw new Error(`Command '${command}' is not allowed`)
    }

    const timeout = options?.timeout || this.config.resources.timeoutMs
    const start = Date.now()

    return new Promise((resolve, reject) => {
      const child = spawn(command, { shell: true })
      
      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
        if (stdout.length > this.config.resources.maxOutputBytes) {
          child.kill()
          reject(new Error('Output exceeds maximum size'))
        }
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      const timer = setTimeout(() => {
        child.kill()
        reject(new Error(`Command timed out after ${timeout}ms`))
      }, timeout)

      child.on('exit', (code) => {
        clearTimeout(timer)
        resolve({
          exitCode: code ?? 1,
          stdout,
          stderr,
          duration: Date.now() - start,
        })
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
   * 检查进程是否运行
   */
  isRunning(): boolean {
    return this.processes.has(this.pluginId)
  }

  /**
   * 获取内存使用
   */
  getMemoryUsage(): number {
    const handle = this.processes.get(this.pluginId)
    return handle?.memoryUsage || 0
  }

  /**
   * 过滤环境变量
   */
  private filterEnvironment(): NodeJS.ProcessEnv {
    const env = { ...process.env }
    
    // 清除所有环境变量（如果配置要求）
    if (this.config.environment.clear) {
      for (const key of Object.keys(env)) {
        delete env[key]
      }
    }
    
    // 只保留白名单
    for (const key of Object.keys(env)) {
      if (!this.config.environment.whitelist.includes(key)) {
        delete env[key]
      }
    }
    
    // 拒绝黑名单
    for (const key of this.config.environment.blacklist) {
      delete env[key]
    }
    
    return env
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

  /**
   * 监控进程
   */
  private monitorProcess(pluginId: string): void {
    const interval = setInterval(() => {
      const handle = this.processes.get(pluginId)
      if (!handle) {
        clearInterval(interval)
        return
      }
      
      // 检查内存使用
      try {
        const stats = handle.process.spawnfile // 简化版本
        handle.memoryUsage = 0 // 实际实现需要获取进程统计
      } catch {
        // 忽略监控错误
      }
      
      // 检查超时
      const elapsed = Date.now() - handle.startTime
      if (elapsed > this.config.resources.timeoutMs) {
        handle.process.kill()
        this.processes.delete(pluginId)
      }
    }, 5000)
  }
}

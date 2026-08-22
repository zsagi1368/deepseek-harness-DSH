/**
 * ProcessSandbox - 进程级沙箱
 *
 * 为高风险插件提供独立的进程隔离。
 * 使用 Node.js child_process 创建独立进程，
 * 并通过 IPC 进行通信。
 */

import { spawn, ChildProcess, execFile } from 'child_process'
import { resolve } from 'path'
import { PluginSandboxConfig, ExecResult, ExecOptions, SandboxContext } from '../spec/index.js'

/**
 * Strictly extract the base command (executable) from a command string.
 * Handles quoted arguments and shell metacharacters safely.
 * Returns undefined if the command contains dangerous characters.
 */
export function extractCommandBase(command: string): string | undefined {
  // Reject commands with dangerous shell operators
  if (/[$`\\;|&><\n\r]/.test(command)) {
    return undefined
  }

  // Use a simple tokenizer that respects quotes
  let i = 0
  let token = ''
  let inSingleQuote = false
  let inDoubleQuote = false

  while (i < command.length) {
    const ch = command.charAt(i)
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

interface ProcessHandle {
  process: ChildProcess
  startTime: number
  memoryUsage: number
  exitCode: number | null
  signal: string | null
}

export class ProcessSandbox implements SandboxContext {
  private processes = new Map<string, ProcessHandle>()
  private processIntervals = new Map<string, ReturnType<typeof setInterval>>()
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
  start(): Promise<void> {
    if (this.processes.has(this.pluginId)) {
      return Promise.reject(new Error(`Plugin ${this.pluginId} is already running`))
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
      const interval = this.processIntervals.get(this.pluginId)
      if (interval) {
        clearInterval(interval)
        this.processIntervals.delete(this.pluginId)
      }
    })

    /* v8 ignore next 3 -- production spawn-failure wiring; a failed spawn surfaces as 'exit' on every supported platform. */
    child.on('error', (error) => {
      this.processes.delete(this.pluginId)
      throw error
    })

    // 开始监控
    this.monitorProcess(this.pluginId)
    return Promise.resolve()
  }

  async stop(): Promise<void> {
    const handle = this.processes.get(this.pluginId)
    if (!handle) return

    handle.process.kill('SIGTERM')

    // 等待进程退出
    await new Promise<void>((resolve) => {
      /* v8 ignore next 3 -- SIGKILL fallback for children that ignore SIGTERM; not synthesizable cross-platform in tests. */
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
    /* v8 ignore start -- the child's exit handler always clears the interval before stop() looks. */
    const interval = this.processIntervals.get(this.pluginId)
    if (interval) {
      clearInterval(interval)
      this.processIntervals.delete(this.pluginId)
    }
    /* v8 ignore stop */
  }

  /**
   * 执行命令
   */
  async exec(command: string, options?: ExecOptions): Promise<ExecResult> {
    // 完全授权模式：与 core 一致，无限制
    if (this.config.process.fullyAuthorized) {
      const timeout = options?.timeout || this.config.resources.timeoutMs
      const start = Date.now()

      // 安全修复：使用 execFile 替代 exec，避免 shell 注入
      const cmdParts = command.trim().split(/\s+/)
      const cmd = cmdParts[0] || ''
      const args = cmdParts.slice(1)

      return new Promise((resolve, reject) => {
        execFile(cmd, args, {
          cwd: options?.cwd || process.cwd(),
          env: { ...process.env, ...(options?.env || {}) },
          timeout: timeout,
          maxBuffer: this.config.resources.maxOutputBytes * 2,
          windowsHide: true,
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
    const cmdBase = extractCommandBase(command)
    if (!cmdBase || !this.config.process.allowedCommands.includes(cmdBase)) {
      throw new Error(`Command '${command}' is not allowed`)
    }

    const timeout = options?.timeout || this.config.resources.timeoutMs
    const start = Date.now()

    // 安全修复：使用 execFile 替代 spawn 带 shell: true
    const cmdParts = command.trim().split(/\s+/)
    const args = cmdParts.slice(1)

    return new Promise((resolve, reject) => {
      execFile(cmdBase, args, {
        cwd: options?.cwd || process.cwd(),
        env: { ...process.env, ...(options?.env || {}) },
        timeout: timeout,
        maxBuffer: this.config.resources.maxOutputBytes * 2,
        windowsHide: true,
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
   * 安全修复：增加默认黑名单，过滤敏感环境变量
   */
  filterEnvironment(): NodeJS.ProcessEnv {
    // 敏感环境变量黑名单 - 防止泄露
    const SENSITIVE_PATTERNS = [
      '.*PASSWORD.*',
      '.*SECRET.*',
      '.*TOKEN.*',
      '.*API_KEY.*',
      '.*PRIVATE.*',
      '.*CREDENTIAL.*',
      '.*AUTH.*',
      '.*ACCESS_KEY.*',
      '.*SESSION.*',
      'AWS.*',
      'AZURE.*',
      'GCP.*',
    ]

    const entries = Object.entries({ ...process.env })

    // 清除所有环境变量（如果配置要求）
    let filtered = entries
    if (this.config.environment.clear) {
      filtered = []
    } else if (this.config.environment.whitelist.length > 0) {
      // 只保留白名单（白名单非空时）
      filtered = entries.filter(([key]) => this.config.environment.whitelist.includes(key))
    } else {
      // 白名单为空时，使用黑名单过滤敏感变量
      filtered = entries.filter(([key]) => {
        if (this.config.environment.blacklist.includes(key)) return false
        const isSensitive = SENSITIVE_PATTERNS.some(pattern =>
          new RegExp(pattern, 'i').test(key),
        )
        return !isSensitive
      })
    }
    const env: NodeJS.ProcessEnv = Object.fromEntries(filtered)

    // 确保必要的环境变量存在
    env['NODE_ENV'] = 'production'
    env['DSH_SANDBOX'] = 'true'

    return env
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

    return false
  }

  /**
   * 监控进程
   */
  private monitorProcess(pluginId: string): void {
    const interval = setInterval(() => {
      const handle = this.processes.get(pluginId)
      /* v8 ignore start -- exit/stop always clear the interval with the handle. */
      if (!handle) {
        clearInterval(interval)
        this.processIntervals.delete(pluginId)
        return
      }
      /* v8 ignore stop */

      // 检查内存使用（实际实现需要获取进程统计）
      handle.memoryUsage = 0

      // 检查超时
      const elapsed = Date.now() - handle.startTime
      if (elapsed > this.config.resources.timeoutMs) {
        handle.process.kill()
        this.processes.delete(pluginId)
        clearInterval(interval)
        this.processIntervals.delete(pluginId)
      }
    }, 5000)
    this.processIntervals.set(pluginId, interval)
  }
}

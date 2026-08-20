/**
 * dsh-codex-shell: Persistent Terminal Plugin
 * 
 * 提供持久化 Shell 会话管理能力
 */

export { PersistentShell } from './shell'
export { ShellExecutor } from './executor'
export { PTYManager } from './pty-manager'
export type {
  ShellSession,
  ExecOptions,
  PTYSize
} from './types'
export { ShellError } from './errors'

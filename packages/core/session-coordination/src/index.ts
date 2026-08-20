/**
 * dsh-sessions: Cross-Session Coordination Plugin
 * 
 * 提供跨 Session 发现、读取和协作 API
 */

export { SessionCoordinator } from './coordinator'
export { SessionDiscovery } from './discovery'
export { SessionReader } from './reader'
export { SessionSender } from './sender'
export type {
  SessionInfo,
  SessionMessage,
  ReadOptions,
  SendOptions
} from './types'
export { 
  SessionCoordinationError,
  SessionNotFoundError,
  PermissionDeniedError 
} from './errors'

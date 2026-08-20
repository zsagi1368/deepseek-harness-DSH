/**
 * dsh-mock: Deterministic Mock Model Plugin
 * 
 * 提供录制、回放和注入 Mock 响应的能力
 */

export { MockModel } from './adapter'
export { MockRecorder } from './recorder'
export { MockPlayer } from './player'
export { MockInjector } from './injector'
export { MockStore } from './store'
export type {
  MockRecord,
  MockResponse,
  RecordOptions,
  PlayOptions
} from './types'
export { MockModelError } from './errors'

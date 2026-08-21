/**
 * System prompt sections lock - prevents unauthorized modification of critical sections.
 * 
 * This provides a security layer that locks specific system prompt sections
 * (like harness identity, tool schemas, persona) from being modified by plugins.
 * 
 * @module @deepseek-ai/dsh-system-prompt/locked-sections
 */

import type { PromptSection } from './index.ts'

/** Priority levels for section locking */
export type SectionLockLevel = 'read-only' | 'write-only' | 'read-write' | 'forbidden'

/** Configuration for locked sections */
export interface LockedSectionConfig {
  /** Section name pattern (exact match or regex prefix) */
  pattern: string | RegExp
  /** Lock level - what operations are allowed */
  lockLevel: SectionLockLevel
  /** Optional reason for the lock */
  reason?: string
}

/** Default locked sections that should never be modified */
export const DEFAULT_LOCKED_SECTIONS: LockedSectionConfig[] = [
  // Harness identity section
  { pattern: /^harness/i, lockLevel: 'forbidden', reason: 'Harness identity must not be modified' },
  // Tool schemas and guidance (order 100-199)
  { pattern: /^tools:/, lockLevel: 'forbidden', reason: 'Tool schemas are auto-generated' },
  // SDK section
  { pattern: /^tools:sdk/, lockLevel: 'forbidden', reason: 'SDK is auto-generated' },
  // Code mode collapse
  { pattern: /^tools:code-only/, lockLevel: 'forbidden', reason: 'Code mode rule is mandatory' },
  // Personas (order 0)
  { pattern: /^persona:/, lockLevel: 'read-only', reason: 'Personas can be read but not replaced' },
]

/**
 * Check if a section name is locked and what operations are allowed.
 */
export function checkSectionLock(
  sectionName: string,
  operation: 'read' | 'write' | 'replace' | 'delete',
  customLocks?: LockedSectionConfig[]
): { locked: boolean; lockLevel?: SectionLockLevel; reason?: string } {
  const locks = customLocks ?? DEFAULT_LOCKED_SECTIONS

  for (const config of locks) {
    const pattern = typeof config.pattern === 'string'
      ? new RegExp('^' + config.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
      : config.pattern

    if (pattern.test(sectionName)) {
      switch (config.lockLevel) {
        case 'forbidden':
          return { locked: true, lockLevel: 'forbidden', reason: config.reason }
        case 'read-only':
          if (operation === 'read') {
            return { locked: false }
          }
          return { locked: true, lockLevel: 'read-only', reason: config.reason }
        case 'write-only':
          if (operation === 'write') {
            return { locked: false }
          }
          return { locked: true, lockLevel: 'write-only', reason: config.reason }
        case 'read-write':
          return { locked: false }
      }
    }
  }

  return { locked: false }
}

/**
 * Validate that a section modification is allowed.
 * Throws if the section is locked and the operation is not permitted.
 */
export function assertSectionAllowed(
  sectionName: string,
  operation: 'read' | 'write' | 'replace' | 'delete',
  customLocks?: LockedSectionConfig[]
): void {
  const result = checkSectionLock(sectionName, operation, customLocks)
  if (result.locked) {
    throw new Error(
      `System prompt section "${sectionName}" is ${result.lockLevel}: ${result.reason}`
    )
  }
}

/**
 * Get all locked sections for documentation/debugging.
 */
export function getLockedSections(customLocks?: LockedSectionConfig[]): LockedSectionConfig[] {
  return customLocks ?? DEFAULT_LOCKED_SECTIONS
}

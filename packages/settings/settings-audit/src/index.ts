/**
 * Settings audit log for tracking configuration changes.
 * 
 * @module @deepseek-ai/dsh-settings/audit-log
 */

import { Context, Service } from '@deepseek-ai/cordis'
import type { Scoped } from '@deepseek-ai/dsh-scope'

/** Audit log entry */
export interface AuditEntry {
  /** Timestamp */
  timestamp: number
  /** Action performed */
  action: 'set' | 'unset' | 'get' | 'describe'
  /** Setting key */
  key: string
  /** Source (plugin ID or user) */
  source: string
  /** Old value (before change) */
  oldValue?: unknown
  /** New value (after change) */
  newValue?: unknown
  /** Whether the action was allowed */
  allowed: boolean
  /** Reason if denied */
  reason?: string
}

/** Audit log service */
export class AuditLogService extends Service {
  private entries: AuditEntry[] = []
  private readonly maxEntries = 1000

  constructor(ctx: Context) {
    super(ctx, 'audit-log')
  }

  /**
   * Record an audit entry.
   */
  record(entry: Omit<AuditEntry, 'timestamp'>): void {
    const fullEntry: AuditEntry = {
      ...entry,
      timestamp: Date.now(),
    }
    this.entries.push(fullEntry)

    // Keep only last N entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries)
    }

    // Emit audit event
    this.ctx.emit('settings/audit', fullEntry)
  }

  /**
   * Get recent audit entries.
   */
  getRecent(limit: number = 50): AuditEntry[] {
    return this.entries.slice(-limit)
  }

  /**
   * Get all audit entries.
   */
  getAll(): AuditEntry[] {
    return [...this.entries]
  }

  /**
   * Clear audit log.
   */
  clear(): void {
    this.entries = []
  }

  /**
   * Check if a setting change is allowed.
   */
  isAllowed(key: string, source: string): boolean {
    // Implementation would check policy
    return true
  }
}

/**
 * Create audit log service.
 */
export function createAuditLogService(ctx: Context): AuditLogService {
  return new AuditLogService(ctx)
}

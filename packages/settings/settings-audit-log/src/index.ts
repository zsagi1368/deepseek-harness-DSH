/**
 * Settings audit log - tracks all changes to session settings.
 * 
 * @module @deepseek-ai/dsh-settings/audit-log
 */

import { Context, Service } from '@deepseek-ai/cordis'

/** Type of setting change */
export type SettingChangeType = 'set' | 'unset' | 'bulk_set' | 'restore'

/** Record of a single setting change */
export interface SettingChangeRecord {
  /** Timestamp of the change */
  timestamp: number
  /** Type of change */
  type: SettingChangeType
  /** Key that was changed */
  key: string
  /** Old value (if applicable) */
  oldValue?: unknown
  /** New value (if applicable) */
  newValue?: unknown
  /** Source of the change (user, system, plugin) */
  source: 'user' | 'system' | 'plugin'
  /** Optional plugin ID */
  pluginId?: string
}

/** Audit log service */
export class SettingsAuditLog extends Service {
  private records: SettingChangeRecord[] = []
  private readonly maxSize: number

  constructor(ctx: Context, maxSize: number = 1000) {
    super(ctx, 'settings-audit-log')
    this.maxSize = maxSize
  }

  /**
   * Record a setting change.
   */
  record(
    type: SettingChangeType,
    key: string,
    oldValue: unknown,
    newValue: unknown,
    source: SettingChangeRecord['source'],
    pluginId?: string
  ): void {
    const record: SettingChangeRecord = {
      timestamp: Date.now(),
      type,
      key,
      oldValue,
      newValue,
      source,
      pluginId,
    }

    this.records.push(record)

    // Enforce size limit
    if (this.records.length > this.maxSize) {
      this.records = this.records.slice(-this.maxSize)
    }
  }

  /**
   * Get recent audit records.
   */
  getRecent(limit: number = 50): SettingChangeRecord[] {
    return this.records.slice(-limit)
  }

  /**
   * Get all records.
   */
  getAll(): SettingChangeRecord[] {
    return [...this.records]
  }

  /**
   * Clear all records.
   */
  clear(): void {
    this.records = []
  }

  /**
   * Get records for a specific key.
   */
  getByKey(key: string): SettingChangeRecord[] {
    return this.records.filter(r => r.key === key)
  }

  /**
   * Get records within a time range.
   */
  getByTimeRange(start: number, end: number): SettingChangeRecord[] {
    return this.records.filter(r => r.timestamp >= start && r.timestamp <= end)
  }
}

/**
 * Hook to intercept settings changes and log them.
 */
export function createSettingsAuditHook(
  auditLog: SettingsAuditLog
): (key: string, newValue: unknown, oldValue: unknown) => void {
  return (key: string, newValue: unknown, oldValue: unknown) => {
    auditLog.record('set', key, oldValue, newValue, 'system')
  }
}

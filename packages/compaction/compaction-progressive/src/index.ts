/**
 * Progressive compaction - three-tier threshold system.
 * 
 * This implements a tiered compaction strategy:
 * - Tier 1 (Warning): 70% token usage - log warning
 * - Tier 2 (Prepare): 80% token usage - prepare for compaction
 * - Tier 3 (Trigger): 90% token usage - force compaction
 * 
 * @module @deepseek-ai/dsh-compaction/progressive
 */

import type { Session } from '@deepseek-ai/dsh-session'
import type { TokenMeter } from '@deepseek-ai/dsh-token-meter'

/** Compaction tiers */
export type CompactionTier = 'warning' | 'prepare' | 'trigger'

/** Configuration for progressive compaction */
export interface ProgressiveCompactionConfig {
  /** Warning threshold percentage (default: 70) */
  warningThreshold?: number
  /** Prepare threshold percentage (default: 80) */
  prepareThreshold?: number
  /** Trigger threshold percentage (default: 90) */
  triggerThreshold?: number
  /** Enable auto-compaction (default: true) */
  autoCompact?: boolean
}

/** Current compaction state */
export interface CompactionState {
  /** Current tier */
  tier: CompactionTier
  /** Current token usage percentage */
  usagePercent: number
  /** Last compaction timestamp */
  lastCompactionAt?: number
  /** Number of consecutive compactions */
  compactionCount: number
}

/**
 * Create a progressive compaction checker.
 */
export function createProgressiveCompactionChecker(
  config: ProgressiveCompactionConfig = {}
) {
  const {
    warningThreshold = 70,
    prepareThreshold = 80,
    triggerThreshold = 90,
    autoCompact = true,
  } = config

  let state: CompactionState = {
    tier: 'warning',
    usagePercent: 0,
    compactionCount: 0,
  }

  /**
   * Check compaction tier based on token usage.
   * Returns the appropriate action to take.
   */
  function checkTier(inputTokens: number, contextWindow: number): CompactionTier {
    const usagePercent = contextWindow > 0 ? (inputTokens / contextWindow) * 100 : 0
    state.usagePercent = usagePercent

    if (usagePercent >= triggerThreshold) {
      state.tier = 'trigger'
    } else if (usagePercent >= prepareThreshold) {
      state.tier = 'prepare'
    } else if (usagePercent >= warningThreshold) {
      state.tier = 'warning'
    } else {
      state.tier = 'warning'
    }

    return state.tier
  }

  /**
   * Get current compaction state.
   */
  function getState(): CompactionState {
    return { ...state }
  }

  /**
   * Reset compaction state after compaction completes.
   */
  function resetAfterCompaction(): void {
    state.compactionCount += 1
    state.lastCompactionAt = Date.now()
    state.usagePercent = 0
    state.tier = 'warning'
  }

  /**
   * Check if compaction should be triggered.
   */
  function shouldCompact(inputTokens: number, contextWindow: number): boolean {
    const tier = checkTier(inputTokens, contextWindow)
    return tier === 'trigger' && autoCompact
  }

  /**
   * Get compaction warning message.
   */
  function getWarningMessage(inputTokens: number, contextWindow: number): string | null {
    const tier = checkTier(inputTokens, contextWindow)
    
    switch (tier) {
      case 'trigger':
        return `[WARNING] Token usage at ${state.usagePercent.toFixed(1)}% - compaction triggered`
      case 'prepare':
        return `[WARNING] Token usage at ${state.usagePercent.toFixed(1)}% - preparing for compaction`
      case 'warning':
        return `[INFO] Token usage at ${state.usagePercent.toFixed(1)}% - approaching threshold`
      default:
        return null
    }
  }

  return {
    checkTier,
    getState,
    resetAfterCompaction,
    shouldCompact,
    getWarningMessage,
  }
}

/**
 * Create a token budget checkpoint for the agent loop.
 */
export function createTokenBudgetCheckpoint(
  maxTokens: number,
  onWarning?: (message: string) => void,
  onBudgetExceeded?: () => void
) {
  let totalInputTokens = 0
  let totalOutputTokens = 0

  /**
   * Check token budget and emit warnings if needed.
   */
  function checkBudget(
    inputTokens: number,
    outputTokens: number,
    contextWindow: number
  ): { ok: boolean; warning?: string } {
    totalInputTokens += inputTokens
    totalOutputTokens += outputTokens

    const usagePercent = contextWindow > 0 ? ((totalInputTokens + totalOutputTokens) / contextWindow) * 100 : 0

    if (usagePercent >= 100) {
      onBudgetExceeded?.()
      return { ok: false, warning: `Token budget exceeded: ${usagePercent.toFixed(1)}%` }
    }

    if (usagePercent >= 90) {
      const msg = `[CRITICAL] Token budget at ${usagePercent.toFixed(1)}% - immediate attention required`
      onWarning?.(msg)
      return { ok: false, warning: msg }
    }

    if (usagePercent >= 80) {
      const msg = `[WARNING] Token budget at ${usagePercent.toFixed(1)}% - consider compaction`
      onWarning?.(msg)
      return { ok: true, warning: msg }
    }

    return { ok: true }
  }

  /**
   * Reset budget counters.
   */
  function reset(): void {
    totalInputTokens = 0
    totalOutputTokens = 0
  }

  /**
   * Get current budget usage.
   */
  function getUsage(): { inputTokens: number; outputTokens: number; total: number; percent: number } {
    const total = totalInputTokens + totalOutputTokens
    const percent = contextWindow > 0 ? (total / contextWindow) * 100 : 0
    return { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, total, percent }
  }

  return { checkBudget, reset, getUsage }
}

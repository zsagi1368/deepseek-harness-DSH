/**
 * Layered memory system for DSH - sliding window + embedding retrieval.
 * 
 * This provides a multi-tier memory system:
 * - Tier 1: Recent context (sliding window, always available)
 * - Tier 2: Semantic memory (embedding-based retrieval)
 * - Tier 3: Long-term storage (persistent, low priority)
 * 
 * @module @deepseek-ai/dsh-memory
 */

import type { Message } from '@deepseek-ai/dsh-session'

/** Memory tiers */
export type MemoryTier = 'recent' | 'semantic' | 'longterm'

/** Memory item with tier classification */
export interface MemoryItem {
  /** Unique identifier */
  id: string
  /** Content of the memory */
  content: string
  /** Memory tier */
  tier: MemoryTier
  /** Timestamp */
  createdAt: number
  /** Last access time */
  lastAccessedAt: number
  /** Access count */
  accessCount: number
  /** Relevance score (for semantic memories) */
  relevanceScore?: number
  /** Tags for categorization */
  tags?: string[]
  /** Associated turn number */
  turnNumber?: number
}

/** Configuration for the memory system */
export interface MemoryConfig {
  /** Size of the sliding window (number of recent turns to keep) */
  windowSize?: number
  /** Maximum number of semantic memories to retrieve */
  maxSemanticResults?: number
  /** Threshold for semantic similarity (0-1) */
  similarityThreshold?: number
  /** Decay factor for old memories (0-1, lower = faster decay) */
  decayFactor?: number
  /** Maximum total memories across all tiers */
  maxTotalMemories?: number
}

/** Default configuration */
const DEFAULT_CONFIG: MemoryConfig = {
  windowSize: 10,
  maxSemanticResults: 5,
  similarityThreshold: 0.7,
  decayFactor: 0.95,
  maxTotalMemories: 1000,
}

/**
 * Simple embedding simulation (in production, use actual embedding model).
 */
function simpleEmbedding(text: string): number[] {
  // Use character frequency distribution as a simple embedding
  const vector: number[] = new Array(64).fill(0)
  for (let i = 0; i < text.length && i < 256; i++) {
    const charCode = text.charCodeAt(i)
    vector[charCode % 64] += 1
  }
  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
  if (magnitude > 0) {
    return vector.map(v => v / magnitude)
  }
  return vector
}

/**
 * Calculate cosine similarity between two vectors.
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += a[i] * a[i]
  }
  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (normA * normB)
}

/**
 * Layered memory system class.
 */
export class LayeredMemorySystem {
  private config: MemoryConfig
  private recentMemory: MemoryItem[] = []
  private semanticMemory: Map<string, MemoryItem> = new Map()
  private longTermMemory: MemoryItem[] = []
  private embeddings: Map<string, number[]> = new Map()
  private nextId = 1

  constructor(config: MemoryConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Add a message to the memory system.
   */
  addMessage(message: Message, turnNumber: number): void {
    const content = this.extractContent(message)
    const id = `mem-${this.nextId++}`
    const now = Date.now()

    const item: MemoryItem = {
      id,
      content,
      tier: 'recent',
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 1,
      tags: this.extractTags(content),
      turnNumber,
    }

    // Add to recent memory
    this.recentMemory.push(item)
    this.embeddings.set(id, simpleEmbedding(content))

    // Evict old recent memories if window exceeded
    if (this.recentMemory.length > this.config.windowSize) {
      const evicted = this.recentMemory.shift()
      if (evicted) {
        // Promote to long-term if it's valuable
        if (evicted.accessCount > 3) {
          this.promoteToLongTerm(evicted)
        }
        this.embeddings.delete(evicted.id)
      }
    }

    // Check if should promote to semantic
    if (this.isSemanticallyImportant(content, turnNumber)) {
      this.promoteToSemantic(item)
    }

    // Enforce total memory limit
    this.enforceMemoryLimit()
  }

  /**
   * Retrieve relevant memories for a query.
   */
  retrieve(query: string, limit?: number): MemoryItem[] {
    const results: MemoryItem[] = []
    const queryEmbedding = simpleEmbedding(query)
    const now = Date.now()

    // Always include recent memories
    results.push(...this.recentMemory.map(m => ({ ...m, lastAccessedAt: now })))

    // Retrieve semantic memories
    if (this.semanticMemory.size > 0) {
      const semanticResults = [...this.semanticMemory.values()]
        .map(m => ({
          ...m,
          lastAccessedAt: now,
          accessCount: m.accessCount + 1,
          relevanceScore: cosineSimilarity(this.embeddings.get(m.id)!, queryEmbedding),
        }))
        .filter(m => (m.relevanceScore ?? 0) >= this.config.similarityThreshold)
        .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
        .slice(0, limit ?? this.config.maxSemanticResults)

      results.push(...semanticResults)
    }

    // Apply decay to access counts
    this.applyDecay()

    return results.slice(0, limit ?? this.config.maxSemanticResults * 2)
  }

  /**
   * Mark a memory as important for future retention.
   */
  markImportant(memoryId: string): void {
    const item = this.findMemory(memoryId)
    if (item) {
      item.accessCount += 5
      if (item.tier === 'recent') {
        this.promoteToSemantic(item)
      }
    }
  }

  /**
   * Delete a memory.
   */
  delete(memoryId: string): boolean {
    const index = this.recentMemory.findIndex(m => m.id === memoryId)
    if (index !== -1) {
      this.recentMemory.splice(index, 1)
      this.embeddings.delete(memoryId)
      return true
    }

    if (this.semanticMemory.has(memoryId)) {
      this.semanticMemory.delete(memoryId)
      this.embeddings.delete(memoryId)
      return true
    }

    const ltIndex = this.longTermMemory.findIndex(m => m.id === memoryId)
    if (ltIndex !== -1) {
      this.longTermMemory.splice(ltIndex, 1)
      this.embeddings.delete(memoryId)
      return true
    }

    return false
  }

  /**
   * Get memory statistics.
   */
  getStats(): {
    recent: number
    semantic: number
    longTerm: number
    total: number
    windowSize: number
  } {
    return {
      recent: this.recentMemory.length,
      semantic: this.semanticMemory.size,
      longTerm: this.longTermMemory.length,
      total: this.recentMemory.length + this.semanticMemory.size + this.longTermMemory.length,
      windowSize: this.config.windowSize,
    }
  }

  // Private methods

  private findMemory(id: string): MemoryItem | undefined {
    return this.recentMemory.find(m => m.id === id) ??
           this.semanticMemory.get(id) ??
           this.longTermMemory.find(m => m.id === id)
  }

  private extractContent(message: Message): string {
    if (!message.content) return ''
    return message.content
      .filter(block => block.type === 'text' && 'text' in block)
      .map(block => (block as { text: string }).text)
      .join('\n')
  }

  private extractTags(content: string): string[] {
    const tags: string[] = []
    if (content.includes('error') || content.includes('failed')) tags.push('error')
    if (content.includes('success') || content.includes('completed')) tags.push('success')
    if (content.includes('important') || content.includes('critical')) tags.push('important')
    if (content.length > 500) tags.push('detailed')
    return tags
  }

  private isSemanticallyImportant(content: string, turnNumber: number): boolean {
    // Promote if it contains key patterns or is from early turns
    const importantPatterns = [
      'error', 'failed', 'critical', 'important', 'solution', 'fix',
      'result', 'output', 'conclusion', 'summary'
    ]
    return importantPatterns.some(p => content.toLowerCase().includes(p)) ||
           turnNumber <= 3
  }

  private promoteToSemantic(item: MemoryItem): void {
    if (!this.semanticMemory.has(item.id)) {
      item.tier = 'semantic'
      this.semanticMemory.set(item.id, item)
    }
  }

  private promoteToLongTerm(item: MemoryItem): void {
    if (!this.longTermMemory.find(m => m.id === item.id)) {
      item.tier = 'longterm'
      this.longTermMemory.push(item)
    }
  }

  private applyDecay(): void {
    const decay = this.config.decayFactor
    for (const item of this.recentMemory) {
      item.accessCount = Math.max(0, item.accessCount * decay)
    }
    for (const item of this.semanticMemory.values()) {
      item.accessCount = Math.max(0, item.accessCount * decay)
    }
    for (const item of this.longTermMemory) {
      item.accessCount = Math.max(0, item.accessCount * decay)
    }
  }

  private enforceMemoryLimit(): void {
    const max = this.config.maxTotalMemories
    const total = this.recentMemory.length + this.semanticMemory.size + this.longTermMemory.length
    
    if (total > max) {
      // Remove oldest long-term memories first
      while (this.longTermMemory.length > 0 && this.getTotalCount() > max) {
        const removed = this.longTermMemory.shift()
        if (removed) this.embeddings.delete(removed.id)
      }
      
      // Then semantic memories
      while (this.semanticMemory.size > 0 && this.getTotalCount() > max) {
        const [id] = this.semanticMemory.keys()
        this.semanticMemory.delete(id)
        this.embeddings.delete(id)
      }
    }
  }

  private getTotalCount(): number {
    return this.recentMemory.length + this.semanticMemory.size + this.longTermMemory.length
  }
}

/**
 * Factory function to create a memory system.
 */
export function createMemorySystem(config?: MemoryConfig): LayeredMemorySystem {
  return new LayeredMemorySystem(config)
}

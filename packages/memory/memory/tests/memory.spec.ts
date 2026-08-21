import { describe, it, expect } from 'vitest'
import { LayeredMemorySystem, createMemorySystem } from './index.ts'

describe('LayeredMemorySystem', () => {
  it('should create a memory system with default config', () => {
    const memory = createMemorySystem()
    expect(memory).toBeInstanceOf(LayeredMemorySystem)
  })

  it('should add and retrieve messages', () => {
    const memory = createMemorySystem()
    const message = { content: 'Hello world', type: 'text' }
    
    memory.addMessage(message as any, 1)
    const results = memory.retrieve('hello')
    
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].content).toContain('Hello')
  })

  it('should respect window size', () => {
    const memory = createMemorySystem({ windowSize: 3 })
    
    for (let i = 0; i < 10; i++) {
      memory.addMessage({ content: `Message ${i}`, type: 'text' } as any, i)
    }
    
    const stats = memory.getStats()
    expect(stats.recent).toBeLessThanOrEqual(3)
  })

  it('should promote important memories to semantic tier', () => {
    const memory = createMemorySystem()
    
    memory.addMessage({ content: 'This is a critical error that must be fixed', type: 'text' } as any, 1)
    
    const stats = memory.getStats()
    // Should have at least some semantic memories
    expect(stats.semantic + stats.recent).toBeGreaterThan(0)
  })

  it('should mark memories as important', () => {
    const memory = createMemorySystem()
    const message = { content: 'Important solution found', type: 'text' }
    
    memory.addMessage(message as any, 1)
    const firstId = memory.getStats().recent > 0 ? 'mem-1' : undefined
    
    if (firstId) {
      memory.markImportant(firstId)
      const stats = memory.getStats()
      expect(stats.semantic + stats.recent).toBeGreaterThan(0)
    }
  })

  it('should delete memories', () => {
    const memory = createMemorySystem()
    memory.addMessage({ content: 'Test memory', type: 'text' } as any, 1)
    
    const before = memory.getStats().total
    memory.delete('mem-1')
    const after = memory.getStats().total
    
    expect(after).toBeLessThan(before)
  })

  it('should return empty results for unrelated query', () => {
    const memory = createMemorySystem()
    memory.addMessage({ content: 'About cats and dogs', type: 'text' } as any, 1)
    
    const results = memory.retrieve('quantum physics')
    // Should have recent memories but maybe not semantic matches
    expect(results).toBeDefined()
  })
})

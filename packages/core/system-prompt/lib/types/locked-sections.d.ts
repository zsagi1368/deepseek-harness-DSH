/**
 * System prompt sections lock - prevents unauthorized modification of critical sections.
 *
 * This provides a security layer that locks specific system prompt sections
 * (like harness identity, tool schemas, persona) from being modified by plugins.
 *
 * @module @deepseek-ai/dsh-system-prompt/locked-sections
 */
/** Priority levels for section locking */
export type SectionLockLevel = 'read-only' | 'write-only' | 'read-write' | 'forbidden';
/** Configuration for locked sections */
export interface LockedSectionConfig {
    /** Section name pattern (exact match or regex prefix) */
    pattern: string | RegExp;
    /** Lock level - what operations are allowed */
    lockLevel: SectionLockLevel;
    /** Optional reason for the lock */
    reason?: string;
}
/** Default locked sections that should never be modified */
export declare const DEFAULT_LOCKED_SECTIONS: LockedSectionConfig[];
/**
 * Check if a section name is locked and what operations are allowed.
 */
export declare function checkSectionLock(sectionName: string, operation: 'read' | 'write' | 'replace' | 'delete', customLocks?: LockedSectionConfig[]): {
    locked: boolean;
    lockLevel?: SectionLockLevel;
    reason?: string;
};
/**
 * Validate that a section modification is allowed.
 * Throws if the section is locked and the operation is not permitted.
 */
export declare function assertSectionAllowed(sectionName: string, operation: 'read' | 'write' | 'replace' | 'delete', customLocks?: LockedSectionConfig[]): void;
/**
 * Get all locked sections for documentation/debugging.
 */
export declare function getLockedSections(customLocks?: LockedSectionConfig[]): LockedSectionConfig[];
//# sourceMappingURL=locked-sections.d.ts.map
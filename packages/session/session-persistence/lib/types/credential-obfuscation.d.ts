/**
 * Session log credential obfuscation.
 *
 * Replaces sensitive credential values in session events before persistence.
 *
 * @module @deepseek-ai/dsh-session/credential-obfuscation
 */
import type { SessionEvent } from '@deepseek-ai/dsh-session';
/**
 * Check if a field name matches known credential patterns.
 */
export declare function isCredentialField(fieldName: string): boolean;
/**
 * Obfuscate credential values in a session event.
 * Replaces sensitive string values with [REDACTED] placeholders.
 */
export declare function obfuscateCredentialValues(event: SessionEvent): SessionEvent;
/**
 * Process an array of session events, obfuscating credentials in each.
 */
export declare function obfuscateCredentialEvents(events: SessionEvent[]): SessionEvent[];
/**
 * Check if a value contains potential credential data.
 */
export declare function containsCredential(value: unknown): boolean;
//# sourceMappingURL=credential-obfuscation.d.ts.map
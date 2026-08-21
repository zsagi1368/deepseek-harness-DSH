/**
 * Session log credential obfuscation.
 *
 * Replaces sensitive credential values in session events before persistence.
 *
 * @module @deepseek-ai/dsh-session/credential-obfuscation
 */
/** Known credential-related field patterns */
const CREDENTIAL_PATTERNS = [
    /api[_-]?key/i,
    /token/i,
    /password/i,
    /secret/i,
    /credential/i,
    /authorization/i,
    /bearer/i,
    /access[_-]?key/i,
    /client[_-]?secret/i,
];
/**
 * Check if a field name matches known credential patterns.
 */
export function isCredentialField(fieldName) {
    const lower = fieldName.toLowerCase();
    return CREDENTIAL_PATTERNS.some(pattern => pattern.test(lower));
}
/**
 * Obfuscate credential values in a session event.
 * Replaces sensitive string values with [REDACTED] placeholders.
 */
export function obfuscateCredentialValues(event) {
    const data = event.data;
    const obfuscated = {};
    for (const [key, value] of Object.entries(data)) {
        if (isCredentialField(key) && typeof value === 'string') {
            // Check if it looks like an actual credential (not empty or placeholder)
            if (value.length > 0 && !value.startsWith('[REDACTED]')) {
                obfuscated[key] = `[REDACTED:${key}]`;
                continue;
            }
        }
        // Recursively process nested objects
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            obfuscated[key] = obfuscateCredentialValues({ ...event, data: value }.data);
        }
        else {
            obfuscated[key] = value;
        }
    }
    return { ...event, data: obfuscated };
}
/**
 * Process an array of session events, obfuscating credentials in each.
 */
export function obfuscateCredentialEvents(events) {
    return events.map(obfuscateCredentialValues);
}
/**
 * Check if a value contains potential credential data.
 */
export function containsCredential(value) {
    if (typeof value !== 'string')
        return false;
    if (value.length < 8)
        return false; // Too short to be a real credential
    if (value.startsWith('[REDACTED]'))
        return false; // Already obfuscated
    return true;
}
//# sourceMappingURL=credential-obfuscation.js.map
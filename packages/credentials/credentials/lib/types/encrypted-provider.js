/**
 * Encrypted credential provider using AES-256-GCM + PBKDF2.
 *
 * @module @deepseek-ai/dsh-credentials/encrypted-provider
 */
import { CredentialProvider } from './index.js';
/** AES-256-GCM encryption parameters */
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
/** PBKDF2 key derivation parameters */
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_HASH = 'SHA-256';
/**
 * Encryption metadata prefix format:
 * - Version byte (1 byte)
 * - IV (12 bytes)
 * - Ciphertext (variable)
 * - Auth tag (16 bytes)
 * - Base64 encoded: "v1:" + base64(version || iv || ciphertext || tag)
 */
const VERSION_PREFIX = 'v1:';
const VERSION_BYTE = 0x01;
/**
 * Encrypted credential provider that wraps an inner provider
 * and encrypts/decrypts credentials using AES-256-GCM.
 */
export class EncryptedCredentialProvider extends CredentialProvider {
    inner;
    fallback;
    password;
    derivedKey;
    constructor(options) {
        super();
        this.inner = options.fallbackProvider ?? {
            async resolve(_ref) {
                return undefined;
            },
            async set(_ref, _value) { },
        };
        this.fallback = options.fallbackProvider;
        this.password = options.password;
    }
    /**
     * Derive encryption key from password using PBKDF2.
     */
    async deriveKey() {
        if (this.derivedKey)
            return this.derivedKey;
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(this.password);
        // Import password as raw key
        const rawKey = await crypto.subtle.importKey('raw', passwordBuffer, { name: 'PBKDF2' }, false, ['deriveKey']);
        // Derive AES-GCM key
        this.derivedKey = await crypto.subtle.deriveKey({
            name: 'PBKDF2',
            salt: encoder.encode('dsh-credential-encryption-salt'),
            iterations: PBKDF2_ITERATIONS,
            hash: PBKDF2_HASH,
        }, rawKey, { name: ALGORITHM, length: KEY_LENGTH }, false, ['encrypt', 'decrypt']);
        return this.derivedKey;
    }
    /**
     * Encrypt plaintext using AES-256-GCM.
     */
    async encrypt(plaintext) {
        const key = await this.deriveKey();
        const encoder = new TextEncoder();
        const plaintextBuffer = encoder.encode(plaintext);
        // Generate random IV
        const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
        // Encrypt
        const ciphertextBuffer = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, plaintextBuffer);
        // Combine: version || iv || ciphertext || tag (last 16 bytes is auth tag)
        const ciphertextArray = new Uint8Array(ciphertextBuffer);
        const combined = new Uint8Array(1 + IV_LENGTH + ciphertextArray.length);
        combined[0] = VERSION_BYTE;
        combined.set(iv, 1);
        combined.set(ciphertextArray, 1 + IV_LENGTH);
        // Base64 encode
        return VERSION_PREFIX + this.uint8ArrayToBase64(combined);
    }
    /**
     * Decrypt ciphertext using AES-256-GCM.
     */
    async decrypt(encrypted) {
        // Verify prefix
        if (!encrypted.startsWith(VERSION_PREFIX)) {
            throw new Error('Invalid encrypted credential format');
        }
        const raw = encrypted.slice(VERSION_PREFIX.length);
        const combined = this.base64ToUint8Array(raw);
        // Extract components
        const version = combined[0];
        if (version !== VERSION_BYTE) {
            throw new Error(`Unsupported credential encryption version: ${version}`);
        }
        const iv = combined.slice(1, 1 + IV_LENGTH);
        const ciphertext = combined.slice(1 + IV_LENGTH);
        const key = await this.deriveKey();
        const decoder = new TextDecoder();
        // Decrypt
        const plaintextBuffer = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, ciphertext);
        return decoder.decode(plaintextBuffer);
    }
    /**
     * Convert Uint8Array to Base64 string.
     */
    uint8ArrayToBase64(bytes) {
        let binary = '';
        for (const byte of bytes) {
            binary += String.fromCharCode(byte);
        }
        return btoa(binary);
    }
    /**
     * Convert Base64 string to Uint8Array.
     */
    base64ToUint8Array(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    /**
     * Resolve a credential reference, decrypting if necessary.
     */
    async resolve(ref) {
        const cached = await this.inner.resolve(ref);
        if (!cached || !cached.value)
            return cached;
        const value = cached.value;
        if (value.startsWith(VERSION_PREFIX)) {
            // Encrypted - decrypt
            try {
                const decrypted = await this.decrypt(value);
                return { ...cached, value: decrypted };
            }
            catch (error) {
                console.error('[EncryptedCredentialProvider] Decryption failed:', error);
                throw new Error(`Failed to decrypt credential ${ref.name}`);
            }
        }
        // Not encrypted - return as-is (backward compatibility)
        return cached;
    }
    /**
     * Set a credential, encrypting before storage.
     */
    async set(ref, value) {
        try {
            const encrypted = await this.encrypt(value);
            await this.inner.set(ref, encrypted);
        }
        catch (error) {
            console.error('[EncryptedCredentialProvider] Encryption failed:', error);
            throw new Error(`Failed to encrypt credential ${ref.name}`);
        }
    }
}
//# sourceMappingURL=encrypted-provider.js.map
/**
 * Encrypted credential provider using AES-256-GCM + PBKDF2.
 *
 * @module @deepseek-ai/dsh-credentials/encrypted-provider
 */
import { CredentialProvider, CredentialRef, ResolvedCredential } from './index.ts';
export interface EncryptedCredentialProviderOptions {
    /** Password for key derivation */
    password: string;
    /** Inner provider to use for unencrypted storage (fallback) */
    fallbackProvider?: CredentialProvider;
}
/**
 * Encrypted credential provider that wraps an inner provider
 * and encrypts/decrypts credentials using AES-256-GCM.
 */
export declare class EncryptedCredentialProvider extends CredentialProvider {
    private readonly inner;
    private readonly fallback?;
    private readonly password;
    private derivedKey?;
    constructor(options: EncryptedCredentialProviderOptions);
    /**
     * Derive encryption key from password using PBKDF2.
     */
    private deriveKey;
    /**
     * Encrypt plaintext using AES-256-GCM.
     */
    private encrypt;
    /**
     * Decrypt ciphertext using AES-256-GCM.
     */
    private decrypt;
    /**
     * Convert Uint8Array to Base64 string.
     */
    private uint8ArrayToBase64;
    /**
     * Convert Base64 string to Uint8Array.
     */
    private base64ToUint8Array;
    /**
     * Resolve a credential reference, decrypting if necessary.
     */
    resolve(ref: CredentialRef): Promise<ResolvedCredential | undefined>;
    /**
     * Set a credential, encrypting before storage.
     */
    set(ref: CredentialRef, value: string): Promise<void>;
}
//# sourceMappingURL=encrypted-provider.d.ts.map
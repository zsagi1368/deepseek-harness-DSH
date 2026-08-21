/**
 * credentials domain zod schemas (names derived from map keys:
 * credentialsDescribeRequestSchema / credentialsDescribeValueSchema / …).
 * The reference-name pattern mirrors the seam's `credentialRef` guard so an
 * invalid name fails as `bad-request` before reaching the service.
 */
/** POSIX-portable environment-variable name (the seam's `credentialRef` pattern). */
export declare const credentialRefNameSchema: any;
/** CredentialView entry of credentials.describe. */
export declare const credentialViewSchema: z.ZodType<{
    configured: boolean | undefined;
    source?: string;
    writable: boolean | undefined;
}>;
/** credentials.describe request payload. */
export declare const credentialsDescribeRequestSchema: z.ZodType<{
    refs: string[] | undefined;
}>;
/** credentials.describe response value. */
export declare const credentialsDescribeValueSchema: z.ZodType<{
    credentials: {
        [x: string]: {
            configured: boolean | undefined;
            source?: string;
            writable: boolean | undefined;
        } | undefined;
    } | undefined;
}>;
/** credentials.set request payload: the one direction a value crosses this wire. */
export declare const credentialsSetRequestSchema: z.ZodType<{
    ref: string | undefined;
    value: string | undefined;
}>;
/** credentials.set response value. */
export declare const credentialsSetValueSchema: z.ZodType<{}>;
/** credentials.unset request payload. */
export declare const credentialsUnsetRequestSchema: z.ZodType<{
    ref: string | undefined;
}>;
/** credentials.unset response value. */
export declare const credentialsUnsetValueSchema: z.ZodType<{}>;
//# sourceMappingURL=credentials.schema.d.ts.map
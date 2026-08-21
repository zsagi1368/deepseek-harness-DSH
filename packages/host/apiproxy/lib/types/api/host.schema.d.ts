/**
 * host domain zod schemas (names derived from map keys).
 */
/** host.describe request payload (empty object literal). */
export declare const hostDescribeRequestSchema: z.ZodType<{}>;
/** host.describe response value. */
export declare const hostDescribeValueSchema: z.ZodType<{
    version: string | undefined;
    cwd: string | undefined;
    provider?: string;
    model?: string;
    attachedSessions: number | undefined;
    home: string | undefined;
    canOpenPath: boolean | undefined;
}>;
/** host.pickDirectory request payload (empty object literal). */
export declare const hostPickDirectoryRequestSchema: z.ZodType<{}>;
/** host.pickDirectory response value; null means the user cancelled. */
export declare const hostPickDirectoryValueSchema: z.ZodType<{
    path: string | null | undefined;
}>;
/** Directory row shared by listing entries and breadcrumb crumbs. */
export declare const directoryEntrySchema: z.ZodType<{
    name: string | undefined;
    path: string | undefined;
    hidden: boolean | undefined;
}>;
/** host.listDirectory request payload; an absent path lists the home directory. */
export declare const hostListDirectoryRequestSchema: z.ZodType<{
    path?: string;
}>;
/** host.listDirectory response value. */
export declare const hostListDirectoryValueSchema: z.ZodType<{
    path: string | undefined;
    home: string | undefined;
    crumbs: {
        name: string | undefined;
        path: string | undefined;
        hidden: boolean | undefined;
    }[] | undefined;
    entries: {
        name: string | undefined;
        path: string | undefined;
        hidden: boolean | undefined;
    }[] | undefined;
    truncated: boolean | undefined;
}>;
/** host.createDirectory request payload: name must be one plain path segment. */
export declare const hostCreateDirectoryRequestSchema: z.ZodType<{
    path: string | undefined;
    name: string | undefined;
}>;
/** host.createDirectory response value: the created directory's absolute path. */
export declare const hostCreateDirectoryValueSchema: z.ZodType<{
    path: string | undefined;
}>;
/** host.openPath request payload. */
export declare const hostOpenPathRequestSchema: z.ZodType<{
    path: string | undefined;
}>;
/** host.openPath response value. */
export declare const hostOpenPathValueSchema: z.ZodType<{
    opened: true | undefined;
}>;
//# sourceMappingURL=host.schema.d.ts.map
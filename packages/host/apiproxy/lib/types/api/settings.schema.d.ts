/**
 * settings domain zod schemas (names derived from map keys: settingsDescribeRequestSchema /
 * settingsDescribeValueSchema / settingsUpdate* / settingsReplace*).
 */
import { z } from 'zod';
import type { Wire } from './rpc.schema.ts';
import type { SettingsPathOpView } from './settings.ts';
/** One redacted secret slot. */
export declare const settingsSecretViewSchema: z.ZodType<{
    path: string[] | undefined;
    set: boolean | undefined;
}>;
/** SettingsNamespaceView row of settings.describe and the write responses. */
export declare const settingsNamespaceViewSchema: z.ZodType<{
    ns: string | undefined;
    schema: unknown;
    value: unknown;
    base?: unknown;
    user?: unknown;
    applies: "live" | "restart" | undefined;
    secrets: {
        path: string[] | undefined;
        set: boolean | undefined;
    }[] | undefined;
    revision: number | undefined;
}>;
/** settings.describe request payload. */
export declare const settingsDescribeRequestSchema: z.ZodType<{}>;
/** settings.describe response value. */
export declare const settingsDescribeValueSchema: z.ZodType<{
    writable: boolean | undefined;
    hasDocument: boolean | undefined;
    namespaces: {
        ns: string | undefined;
        schema: unknown;
        value: unknown;
        base?: unknown;
        user?: unknown;
        applies: "live" | "restart" | undefined;
        secrets: {
            path: string[] | undefined;
            set: boolean | undefined;
        }[] | undefined;
        revision: number | undefined;
    }[] | undefined;
}>;
/** settings.openDocument request payload. */
export declare const settingsOpenDocumentRequestSchema: z.ZodType<{}>;
/** settings.openDocument response value. */
export declare const settingsOpenDocumentValueSchema: z.ZodType<{
    opened: true | undefined;
}>;
/** settings.update request payload. */
export declare const settingsUpdateRequestSchema: z.ZodType<{
    ns: string | undefined;
    patch: object | undefined;
    expectedRevision?: number;
}>;
/** settings.update response value: the namespace's new redacted view. */
export declare const settingsUpdateValueSchema: z.ZodType<{
    ns: string | undefined;
    schema: unknown;
    value: unknown;
    base?: unknown;
    user?: unknown;
    applies: "live" | "restart" | undefined;
    secrets: {
        path: string[] | undefined;
        set: boolean | undefined;
    }[] | undefined;
    revision: number | undefined;
}>;
/** settings.replace request payload. */
export declare const settingsReplaceRequestSchema: z.ZodType<{
    ns: string | undefined;
    section: object | undefined;
    expectedRevision?: number;
}>;
/** One path-addressed edit of settings.mutate. */
export declare const settingsPathOpSchema: z.ZodType<Wire<SettingsPathOpView>>;
/** settings.mutate request payload. */
export declare const settingsMutateRequestSchema: z.ZodType<{
    ns: string | undefined;
    ops: ({
        op: "set" | undefined;
        path: string[] | undefined;
        value: unknown;
    } | {
        op: "unset" | undefined;
        path: string[] | undefined;
    })[] | undefined;
    expectedRevision?: number;
}>;
/** settings.mutate response value: the namespace's new redacted view. */
export declare const settingsMutateValueSchema: z.ZodType<{
    ns: string | undefined;
    schema: unknown;
    value: unknown;
    base?: unknown;
    user?: unknown;
    applies: "live" | "restart" | undefined;
    secrets: {
        path: string[] | undefined;
        set: boolean | undefined;
    }[] | undefined;
    revision: number | undefined;
}>;
/** settings.replace response value. */
export declare const settingsReplaceValueSchema: z.ZodType<{
    ns: string | undefined;
    schema: unknown;
    value: unknown;
    base?: unknown;
    user?: unknown;
    applies: "live" | "restart" | undefined;
    secrets: {
        path: string[] | undefined;
        set: boolean | undefined;
    }[] | undefined;
    revision: number | undefined;
}>;
//# sourceMappingURL=settings.schema.d.ts.map
/**
 * downloads domain zod schemas. The download surface has no wire
 * envelope: the request arrives as query parameters (all strings), so its
 * request schema parses the raw query-parameter object into the method's
 * exact request shape. SessionId brand cast point: sessionIdSchema, and only
 * there (hosted in sessions.schema like every other cast).
 */
/**
 * session.export query params → the sessionLog request. `includeDescendants`
 * accepts exactly `true`/`false`/absent; any other value is rejected (400) so
 * a misspelled flag cannot silently under-export.
 */
export declare const sessionLogQuerySchema: z.ZodType<{
    sessionId: import("@deepseek-ai/dsh-session").SessionId;
    includeDescendants?: boolean;
}>;
//# sourceMappingURL=downloads.schema.d.ts.map
/**
 * events domain zod schemas: MuxFrame / HostFrame unions (discriminatedUnion('type')).
 * A frame is the payload slot of the ServerRequest full form; the SessionEvent inside
 * a session/event frame reuses sessions.schema's strict-envelope + wide-data passthrough branch.
 */
import { z } from 'zod';
import type { HostFrame, MuxFrame } from './events.ts';
/** Question fields validated strictly against core dsh-user-questions. */
export declare const askUserQuestionItemSchema: z.ZodType<{
    id: string | undefined;
    question: string | undefined;
    detail?: string;
    header?: string;
    options?: {
        label: string | undefined;
        description?: string;
    }[] | undefined;
    multiSelect?: boolean;
    intent?: {
        kind: "plan-review" | undefined;
        approve: string | undefined;
    } | undefined;
}>;
/** MuxFrame union (payload slot of a mux-stream ServerRequest). */
export declare const muxFrameSchema: z.ZodType<MuxFrame>;
/** HostFrame union (payload slot of a host-stream ServerRequest). */
export declare const hostFrameSchema: z.ZodType<HostFrame>;
//# sourceMappingURL=events.schema.d.ts.map
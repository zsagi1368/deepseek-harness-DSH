import type { ReactNode } from 'react';
import type { ChatNodeOwnerProps, ChatViewSlotProps } from '../contract/slots.ts';
/**
 * Render one Host-authoritative pending steering item with the same visual
 * language as its eventual durable transcript node.
 * @param props - Pending message content and conversation translator.
 * @returns the pending steering bubble.
 */
export declare function PendingSteeringBubble({ content, renderMessageImages, t }: {
    content: readonly unknown[];
    renderMessageImages: ChatNodeOwnerProps['renderMessageImages'];
    t: ChatViewSlotProps['t'];
}): ReactNode;
/** User and admitted-steering keyed Chat renderer. */
export declare const UserMessageNodeView: any;
/** Injected-context keyed Chat renderer. */
export declare const ContextMessageNodeView: any;
/** Automatic compaction keyed Chat renderer. */
export declare const CompactionNodeView: any;
/** Correlated retry-chain keyed Chat renderer. */
export declare const RetryNodeView: any;
/** Terminal turn-error keyed Chat renderer. */
export declare const TurnErrorNodeView: any;
/** Max-tokens turn-end notice keyed Chat renderer. */
export declare const TurnMaxTokensNodeView: any;
/** Explicit unknown-surface keyed Chat renderer. */
export declare const UnknownNodeView: any;
//# sourceMappingURL=MessageItem.d.ts.map
import type { ChatViewSlotProps, CommandRowOwnerProps } from '../contract/slots.ts';
interface CompactionCommandCardProps extends CommandRowOwnerProps {
    t: ChatViewSlotProps['t'];
}
/** Render one manual compaction lifecycle without duplicating its checkpoint marker. */
export declare function CompactionCommandCard({ node, compaction, t }: CompactionCommandCardProps): any;
export {};
//# sourceMappingURL=CompactionCommandCard.d.ts.map
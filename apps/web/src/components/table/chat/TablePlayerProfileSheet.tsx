import { Badge } from '@duopoker/ui-kit';
import { tierLabel } from '@duopoker/shared-types';
import type { SubscriptionTier } from '@duopoker/shared-types/index';
import { TableBottomSheet } from '../primitives/TableBottomSheet';
import { PlayerAvatar } from '../../cosmetics/PlayerAvatar';

type Props = {
  open: boolean;
  onClose: () => void;
  closeLabel: string;
  name: string;
  avatar?: string | null;
  tableStatus?: string | null;
  tier: SubscriptionTier;
};

export function TablePlayerProfileSheet({
  open,
  onClose,
  closeLabel,
  name,
  avatar,
  tableStatus,
  tier
}: Props) {
  return (
    <TableBottomSheet
      open={open}
      onClose={onClose}
      closeLabel={closeLabel}
      testId="table-player-profile-sheet"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <PlayerAvatar name={name} avatarUrl={avatar} tier={tier} size="lg" hideName />
        <h3 className="font-display text-xl font-semibold text-gradient-gold">{name}</h3>
        {tier !== 'FREE' ? (
          <Badge variant="gold">{tierLabel[tier]}</Badge>
        ) : null}
        {tableStatus ? (
          <p className="max-w-xs text-sm text-muted">{tableStatus}</p>
        ) : null}
      </div>
    </TableBottomSheet>
  );
}

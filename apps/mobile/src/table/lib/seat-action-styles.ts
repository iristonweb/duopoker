import { colors } from '@duopoker/shared-types';
import type { SeatActionKind } from '@duopoker/table-client';

export type SeatActionStyle = {
  backgroundColor: string;
  borderColor: string;
  color: string;
};

export const seatActionStyles: Record<SeatActionKind, SeatActionStyle> = {
  fold: { backgroundColor: 'rgba(244,63,94,0.15)', borderColor: 'rgba(244,63,94,0.5)', color: colors.danger },
  check: { backgroundColor: 'rgba(24,24,27,0.8)', borderColor: 'rgba(161,161,170,0.4)', color: '#e4e4e7' },
  call: { backgroundColor: 'rgba(74,222,128,0.12)', borderColor: 'rgba(74,222,128,0.45)', color: colors.emerald },
  bet: { backgroundColor: 'rgba(74,222,128,0.12)', borderColor: 'rgba(74,222,128,0.45)', color: colors.emerald },
  raise: { backgroundColor: 'rgba(232,197,71,0.12)', borderColor: 'rgba(232,197,71,0.5)', color: colors.goldLight },
  allIn: { backgroundColor: 'rgba(244,63,94,0.15)', borderColor: 'rgba(244,63,94,0.55)', color: colors.danger },
  bid: { backgroundColor: 'rgba(139,92,246,0.12)', borderColor: 'rgba(167,139,250,0.45)', color: '#ddd6fe' },
  playCard: { backgroundColor: 'rgba(139,92,246,0.12)', borderColor: 'rgba(167,139,250,0.45)', color: '#ddd6fe' },
  blindSB: { backgroundColor: 'rgba(232,197,71,0.1)', borderColor: 'rgba(232,197,71,0.35)', color: colors.goldLight },
  blindBB: { backgroundColor: 'rgba(232,197,71,0.15)', borderColor: 'rgba(232,197,71,0.45)', color: colors.goldLight }
};

export { seatActionIcon, type SeatActionKind } from '@duopoker/table-client';

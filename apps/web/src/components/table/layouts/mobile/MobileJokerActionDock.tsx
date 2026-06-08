import { cn } from '@duopoker/ui-kit';
import type { Card, GameStreet, JokerDeclaration, JokerHandState, Suit } from '@duopoker/shared-types/index';
import { JokerActionDock } from '../../JokerActionDock';

type Props = {
  myTurn: boolean;
  street: GameStreet;
  holeCards: Card[];
  deckId: string;
  joker: JokerHandState;
  bidAmount: number;
  maxBid: number;
  userId: string;
  dealerId: string;
  playerIds: string[];
  onBidAmountChange: (n: number) => void;
  secondsLeft: number | null;
  activeLabel: string;
  isHeroActive: boolean;
  lastActionText?: string;
  sessionError?: string | null;
  actionLogLen: number;
  strictJoker?: boolean;
  onBid: () => void;
  onPlayCard: (card: Card, declaration?: JokerDeclaration) => void;
  onChooseTrump: (trumpSuit: Suit | null) => void;
  onChatOpen: () => void;
  onMenuOpen: () => void;
  chatUnread: number;
  chatLabel: string;
  menuLabel: string;
  stack: number;
  stackLabel: string;
};

export function MobileJokerActionDock({
  onChatOpen,
  onMenuOpen,
  chatUnread,
  chatLabel,
  menuLabel,
  stack,
  stackLabel,
  ...dock
}: Props) {
  return (
    <div data-testid="mobile-joker-action-dock" className="fixed inset-x-0 bottom-0 z-50">
      <div
        className="flex items-center justify-between border-t border-gold/20 bg-background/95 px-3 py-2"
        style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-subtle">{stackLabel}</p>
          <p className="font-mono text-lg font-bold text-gold-light">{stack}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onChatOpen}
            className="relative flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg"
            aria-label={chatLabel}
          >
            💬
            {chatUnread > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose px-1 text-[10px] font-bold text-white">
                {chatUnread > 9 ? '9+' : chatUnread}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={onMenuOpen}
            className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg"
            aria-label={menuLabel}
          >
            ☰
          </button>
        </div>
      </div>
      <JokerActionDock
        {...dock}
        className={cn('[&_button]:min-h-[44px] [&_.table-action-segment_button]:min-h-[48px]')}
      />
    </div>
  );
}

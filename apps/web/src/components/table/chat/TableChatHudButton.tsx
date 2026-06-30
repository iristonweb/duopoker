type Props = {
  unread: number;
  onClick: () => void;
  compact?: boolean;
};

export function TableChatHudButton({ unread, onClick, compact = false }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="table-chat-hud-button"
      className={
        compact
          ? 'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/25 bg-gold/[0.06] text-sm transition hover:border-gold/45 hover:bg-gold/10 hover:shadow-[0_0_16px_rgba(232,197,71,0.2)]'
          : 'relative flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full border border-gold/25 bg-black/50 text-base transition hover:border-gold/40'
      }
      aria-label="Chat"
    >
      💬
      {unread > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose px-1 text-[9px] font-bold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      ) : null}
    </button>
  );
}

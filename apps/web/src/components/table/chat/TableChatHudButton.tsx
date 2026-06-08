type Props = {
  unread: number;
  onClick: () => void;
};

export function TableChatHudButton({ unread, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="table-chat-hud-button"
      className="relative flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full border border-gold/25 bg-black/50 text-base transition hover:border-gold/40"
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

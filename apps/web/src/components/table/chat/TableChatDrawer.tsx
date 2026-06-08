import { useEffect, useRef, useState } from 'react';
import type { TableChatMessage } from '@duopoker/shared-types/index';
import { Button, cn } from '@duopoker/ui-kit';
import { TableBottomDrawer } from '../primitives/TableBottomDrawer';
import { PlayerAvatar } from '../../cosmetics/PlayerAvatar';

type Props = {
  open: boolean;
  onClose: () => void;
  messages: TableChatMessage[];
  onSend: (text: string) => void;
  title: string;
  closeLabel: string;
  placeholder: string;
  sendLabel: string;
  heroId: string;
  error?: string | null;
};

export function TableChatDrawer({
  open,
  onClose,
  messages,
  onSend,
  title,
  closeLabel,
  placeholder,
  sendLabel,
  heroId,
  error
}: Props) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [open, messages.length]);

  const handleSend = () => {
    if (!draft.trim()) return;
    onSend(draft);
    setDraft('');
  };

  return (
    <TableBottomDrawer
      open={open}
      onClose={onClose}
      title={title}
      closeLabel={closeLabel}
      testId="table-chat-drawer"
      noBlur
      maxHeight="tall"
      footer={
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={placeholder}
            maxLength={280}
            className="min-h-[48px] flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-ivory outline-none focus:border-gold/40"
          />
          <Button variant="primary" className="min-h-[48px] min-w-[4.5rem]" onClick={handleSend}>
            {sendLabel}
          </Button>
        </div>
      }
    >
      <div ref={listRef} className="space-y-2 px-4 py-3">
        {error ? (
          <p className="rounded-xl bg-rose/10 px-3 py-2 text-xs text-rose">{error}</p>
        ) : null}
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-subtle">{placeholder}</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex gap-2 rounded-xl px-3 py-2',
                msg.userId === heroId ? 'bg-gold/10' : 'bg-white/[0.04]'
              )}
            >
              <PlayerAvatar
                name={msg.displayName}
                avatarUrl={msg.avatar}
                size="sm"
                hideName
                className="shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gold/80">{msg.displayName}</p>
                <p className="text-sm leading-snug text-ivory">{msg.text}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </TableBottomDrawer>
  );
}

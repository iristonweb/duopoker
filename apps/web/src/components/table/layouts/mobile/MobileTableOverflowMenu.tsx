import { Button } from '@duopoker/ui-kit';
import { TableBottomDrawer } from '../../primitives/TableBottomDrawer';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  onLeave: () => void;
  onMinimize?: () => void;
  onSoundToggle: () => void;
  onMusicToggle: () => void;
  onHistoryOpen: () => void;
  onLeaderboardOpen: () => void;
  onNotebookOpen?: () => void;
  notebookLabel?: string;
  onImmersiveToggle: () => void;
  immersiveOn: boolean;
  soundOn: boolean;
  musicOn: boolean;
  leaveLabel: string;
  minimizeLabel: string;
  soundLabel: string;
  musicLabel: string;
  historyLabel: string;
  leaderboardLabel: string;
  immersiveLabel: string;
  immersiveHint: string;
};

export function MobileTableOverflowMenu({
  open,
  onClose,
  title,
  closeLabel,
  onLeave,
  onMinimize,
  onSoundToggle,
  onMusicToggle,
  onHistoryOpen,
  onLeaderboardOpen,
  onNotebookOpen,
  notebookLabel,
  onImmersiveToggle,
  immersiveOn,
  soundOn,
  musicOn,
  leaveLabel,
  minimizeLabel,
  soundLabel,
  musicLabel,
  historyLabel,
  leaderboardLabel,
  immersiveLabel,
  immersiveHint
}: Props) {
  return (
    <TableBottomDrawer open={open} onClose={onClose} title={title} closeLabel={closeLabel} noBlur>
      <div className="flex flex-col gap-2 px-4 py-3">
        {onMinimize ? (
          <Button variant="secondary" className="min-h-[48px] justify-start" onClick={() => { onMinimize(); onClose(); }}>
            {minimizeLabel}
          </Button>
        ) : null}
        <Button variant="secondary" className="min-h-[48px] justify-start" onClick={() => { onHistoryOpen(); onClose(); }}>
          {historyLabel}
        </Button>
        <Button variant="secondary" className="min-h-[48px] justify-start" onClick={() => { onLeaderboardOpen(); onClose(); }}>
          {leaderboardLabel}
        </Button>
        {onNotebookOpen && notebookLabel ? (
          <Button variant="secondary" className="min-h-[48px] justify-start" onClick={() => { onNotebookOpen(); onClose(); }}>
            {notebookLabel}
          </Button>
        ) : null}
        <Button variant="secondary" className="min-h-[48px] justify-start" onClick={onSoundToggle}>
          {soundOn ? `🔊 ${soundLabel}` : `🔇 ${soundLabel}`}
        </Button>
        <Button variant="secondary" className="min-h-[48px] justify-start" onClick={onMusicToggle}>
          {musicOn ? `🎵 ${musicLabel}` : `🎶 ${musicLabel}`}
        </Button>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ivory">{immersiveLabel}</p>
              <p className="text-xs text-subtle">{immersiveHint}</p>
            </div>
            <input
              type="checkbox"
              checked={immersiveOn}
              onChange={onImmersiveToggle}
              className="h-5 w-5 accent-gold"
            />
          </label>
        </div>
        <Button variant="secondary" className="min-h-[48px] justify-start text-rose" onClick={() => { onLeave(); onClose(); }}>
          {leaveLabel}
        </Button>
      </div>
    </TableBottomDrawer>
  );
}

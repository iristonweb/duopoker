import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { JokerDealRecord, JokerHandState } from '@duopoker/shared-types/index';
import { cn } from '@duopoker/ui-kit';

const CELL = 20;
const MARGIN = 36;
const INK = '#1a3a6e';
const INK_LIGHT = '#2a4f8f';
const INK_RED = '#b91c1c';
const INK_GREEN = '#166534';

type Props = {
  joker: JokerHandState;
  players: string[];
  label: (uid: string) => string;
  title: string;
  openLabel: string;
  closeLabel: string;
  dealLabel: string;
  bidLabel: string;
  tricksLabel: string;
  pointsLabel: string;
  totalLabel: string;
  liveLabel: string;
  className?: string;
};

const formatPts = (pts: number) => (pts > 0 ? `+${pts}` : String(pts));

const inkWobble = (seed: number) => ({
  transform: `rotate(${(seed % 5) * 0.35 - 0.7}deg)`,
  letterSpacing: seed % 2 === 0 ? '0.02em' : '-0.01em'
});

type RowData = {
  key: string;
  dealNum: number;
  pool: number;
  live?: boolean;
  bids: Record<string, number | undefined>;
  tricksWon: Record<string, number>;
  handPoints?: Record<string, number>;
};

function buildRows(joker: JokerHandState, live: boolean): RowData[] {
  const history = joker.dealHistory ?? [];
  const rows: RowData[] = history.map((deal: JokerDealRecord) => ({
    key: `deal-${deal.matchHandIndex}`,
    dealNum: deal.matchHandIndex + 1,
    pool: deal.pool,
    bids: deal.bids,
    tricksWon: deal.tricksWon,
    handPoints: deal.handPoints
  }));

  if (live && joker.bids && Object.values(joker.bids).some((b) => b !== undefined)) {
    rows.push({
      key: `live-${joker.matchHandIndex}`,
      dealNum: joker.matchHandIndex + 1,
      pool: joker.pool,
      live: true,
      bids: joker.bids,
      tricksWon: joker.tricksWon,
      handPoints: joker.handPoints
    });
  }

  return rows;
}

function shortName(name: string) {
  const clean = name.replace(/^@/, '');
  return clean.length > 9 ? `${clean.slice(0, 8)}…` : clean;
}

function NotebookIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 40 48" className="h-7 w-6 drop-shadow-sm" aria-hidden>
      <rect x="4" y="2" width="32" height="44" rx="2" fill={open ? '#8b1a1a' : '#6b1515'} />
      <rect x="6" y="4" width="28" height="40" rx="1" fill={open ? '#a82020' : '#7f1818'} />
      <rect x="9" y="10" width="22" height="10" rx="1" fill="#f5f0e6" opacity="0.92" />
      <text
        x="20"
        y="18"
        textAnchor="middle"
        fill="#6b1515"
        fontFamily="Caveat, cursive"
        fontSize="7"
        fontWeight="600"
      >
        Джокер
      </text>
      {[10, 18, 26, 34].map((y) => (
        <circle key={y} cx="5" cy={y} r="1.6" fill="#c9a227" stroke="#8b6914" strokeWidth="0.4" />
      ))}
      <path d="M 8 6 L 8 42" stroke="#f5f0e6" strokeWidth="0.6" opacity="0.35" />
    </svg>
  );
}

function GridPage({
  children,
  minHeight
}: {
  children: ReactNode;
  minHeight: number;
}) {
  const h = Math.max(minHeight, 280);
  return (
    <div
      className="relative overflow-hidden"
      style={{
        minHeight: h,
        backgroundColor: '#f8f4e8',
        backgroundImage: `
          linear-gradient(#c8d8f0 1px, transparent 1px),
          linear-gradient(90deg, #c8d8f0 1px, transparent 1px)
        `,
        backgroundSize: `${CELL}px ${CELL}px`,
        backgroundPosition: `${MARGIN}px 0`
      }}
    >
      {/* paper grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.5\'/%3E%3C/svg%3E")'
        }}
      />
      {/* red margin */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 top-0 w-[2px]"
        style={{ left: MARGIN - 2, backgroundColor: INK_RED, opacity: 0.75 }}
      />
      {/* spiral holes */}
      <div className="pointer-events-none absolute left-2 top-3 flex flex-col gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-2.5 w-2.5 rounded-full border border-amber-700/40 bg-[#e8dcc8] shadow-inner"
          />
        ))}
      </div>
      {children}
    </div>
  );
}

export function JokerNotebookPanel({
  joker,
  players,
  label,
  title,
  openLabel,
  closeLabel,
  dealLabel,
  bidLabel,
  tricksLabel,
  pointsLabel,
  totalLabel,
  liveLabel,
  className
}: Props) {
  const [open, setOpen] = useState(false);
  const live = Boolean(joker.bids && Object.values(joker.bids).some((b) => b !== undefined));
  const rows = buildRows(joker, live);

  const colWidth = CELL * 4;
  const pageWidth = MARGIN + CELL * 2 + colWidth * players.length + CELL * 2;

  const pageHeight = useMemo(() => {
    const headerRows = 4;
    const dealRows = Math.max(rows.length, 1) * 3;
    const footerRows = 3;
    return (headerRows + dealRows + footerRows) * CELL + CELL * 2;
  }, [rows.length]);

  return (
    <div className={cn('flex flex-col items-end gap-2', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'pointer-events-auto flex h-10 w-10 items-center justify-center rounded-md border shadow-lg backdrop-blur-md transition-all',
          open
            ? 'border-amber-900/40 bg-[#f5f0e6]/95 shadow-[0_4px_20px_rgba(0,0,0,0.35)]'
            : 'border-white/15 bg-black/65 hover:scale-105 hover:bg-black/80'
        )}
        aria-label={open ? closeLabel : openLabel}
        title={open ? closeLabel : openLabel}
      >
        <NotebookIcon open={open} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8, rotateX: -12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="pointer-events-auto"
            style={{ perspective: 800 }}
          >
            {/* notebook body */}
            <div className="relative rounded-sm shadow-[0_8px_32px_rgba(0,0,0,0.45),0_2px_8px_rgba(0,0,0,0.3)]">
              {/* cover edge */}
              <div className="absolute -left-1 bottom-2 top-2 w-2 rounded-l-sm bg-[#5c1010]" />
              <div className="absolute -left-0.5 bottom-1 top-1 w-1 rounded-l bg-[#8b1a1a]" />

              <div
                className="relative overflow-hidden rounded-sm border border-[#c8b89a]/80"
                style={{ width: `min(${pageWidth}px, calc(100vw - 1.5rem))` }}
              >
                <div className="max-h-[min(26rem,60vh)] overflow-auto">
                  <GridPage minHeight={pageHeight}>
                    <div
                      className="relative py-2 font-[Caveat,cursive]"
                      style={{ paddingLeft: MARGIN + CELL, minWidth: pageWidth - MARGIN }}
                    >
                      {/* title — handwritten header */}
                      <div
                        className="mb-1 text-[22px] font-semibold leading-none"
                        style={{ color: INK, ...inkWobble(1) }}
                      >
                        {title}
                      </div>
                      <div
                        className="mb-3 border-b border-dashed pb-1 text-[15px] leading-tight"
                        style={{ color: INK_LIGHT, borderColor: `${INK}33`, ...inkWobble(3) }}
                      >
                        {bidLabel} / {tricksLabel} · {pointsLabel}
                      </div>

                      {/* player names — written across top like in a real notebook */}
                      <div className="flex" style={{ marginBottom: CELL }}>
                        <div
                          className="shrink-0 text-[14px] font-medium"
                          style={{ width: CELL * 2, color: INK_LIGHT, ...inkWobble(5) }}
                        >
                          {dealLabel}
                        </div>
                        {players.map((uid, i) => (
                          <div
                            key={uid}
                            className="text-center text-[17px] font-semibold leading-none"
                            style={{
                              width: colWidth,
                              color: INK,
                              ...inkWobble(7 + i * 3)
                            }}
                          >
                            {shortName(label(uid))}
                          </div>
                        ))}
                      </div>

                      {/* deal rows */}
                      {rows.length === 0 ? (
                        <div
                          className="py-6 text-center text-[18px]"
                          style={{ color: INK_LIGHT, ...inkWobble(11) }}
                        >
                          ···
                        </div>
                      ) : (
                        rows.map((row, ri) => (
                          <div
                            key={row.key}
                            className={cn('flex', row.live && 'opacity-90')}
                            style={{ minHeight: CELL * 3, marginBottom: CELL * 0.5 }}
                          >
                            {/* deal number */}
                            <div
                              className="shrink-0 text-[16px] font-medium leading-none"
                              style={{
                                width: CELL * 2,
                                paddingTop: CELL * 0.5,
                                color: row.live ? INK_RED : INK,
                                ...inkWobble(13 + ri)
                              }}
                            >
                              {row.dealNum}
                              <span className="ml-0.5 text-[12px]" style={{ color: INK_LIGHT }}>
                                п{row.pool}
                              </span>
                              {row.live ? (
                                <span className="block text-[11px]" style={{ color: INK_RED }}>
                                  ({liveLabel})
                                </span>
                              ) : null}
                            </div>

                            {players.map((uid, pi) => {
                              const bid = row.bids[uid];
                              const tricks = row.tricksWon[uid] ?? 0;
                              const pts = row.handPoints?.[uid];
                              const seed = ri * 17 + pi * 7;
                              return (
                                <div
                                  key={uid}
                                  className="flex flex-col items-center justify-start"
                                  style={{ width: colWidth, paddingTop: CELL * 0.25 }}
                                >
                                  {/* bid/tricks — main handwritten entry */}
                                  <div
                                    className="text-[20px] font-semibold leading-none"
                                    style={{ color: INK, ...inkWobble(seed) }}
                                  >
                                    {bid !== undefined ? (
                                      <>
                                        {bid}
                                        <span className="mx-0.5 text-[14px] font-normal" style={{ color: INK_LIGHT }}>
                                          /
                                        </span>
                                        {tricks}
                                      </>
                                    ) : (
                                      <span style={{ color: INK_LIGHT }}>—</span>
                                    )}
                                  </div>
                                  {/* points — smaller, underlined like tally marks */}
                                  {pts !== undefined ? (
                                    <div
                                      className="mt-0.5 border-b border-dotted text-[15px] font-medium leading-none"
                                      style={{
                                        color: pts >= 0 ? INK_GREEN : INK_RED,
                                        borderColor: pts >= 0 ? `${INK_GREEN}55` : `${INK_RED}55`,
                                        ...inkWobble(seed + 2)
                                      }}
                                    >
                                      {formatPts(pts)}
                                    </div>
                                  ) : row.live && bid !== undefined ? (
                                    <div
                                      className="mt-0.5 text-[13px] leading-none"
                                      style={{ color: INK_LIGHT, ...inkWobble(seed + 4) }}
                                    >
                                      ?
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ))
                      )}

                      {/* total row — double underline like school notebooks */}
                      <div
                        className="mt-2 flex border-t-2 border-double pt-2"
                        style={{ borderColor: `${INK}44`, marginTop: CELL }}
                      >
                        <div
                          className="shrink-0 text-[17px] font-bold"
                          style={{ width: CELL * 2, color: INK, ...inkWobble(99) }}
                        >
                          {totalLabel}
                        </div>
                        {players.map((uid, i) => (
                          <div
                            key={uid}
                            className="text-center text-[22px] font-bold"
                            style={{
                              width: colWidth,
                              color: (joker.scores[uid] ?? 0) >= 0 ? INK : INK_RED,
                              textDecoration: 'underline',
                              textDecorationStyle: 'wavy',
                              textDecorationColor: `${INK}44`,
                              ...inkWobble(101 + i)
                            }}
                          >
                            {joker.scores[uid] ?? 0}
                          </div>
                        ))}
                      </div>

                      {/* pen doodle in corner */}
                      <div
                        className="pointer-events-none absolute bottom-4 right-4 text-[11px] opacity-30"
                        style={{ color: INK, fontFamily: 'Caveat, cursive', transform: 'rotate(-12deg)' }}
                      >
                        ✒
                      </div>
                    </div>
                  </GridPage>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

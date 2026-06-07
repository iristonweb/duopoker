import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { JokerDealRecord, JokerHandState } from '@duopoker/shared-types/index';
import { cn } from '@duopoker/ui-kit';
import { tableFabBottomClass } from '../../hooks/useTableDockHeight';

const CELL_FULL = 30;
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
  poolPremiumLabel: string;
  liveLabel: string;
  modeLabel: string;
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

function NotebookIcon({ open, modeLabel }: { open: boolean; modeLabel: string }) {
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
        {modeLabel.length > 8 ? modeLabel.slice(0, 7) + '…' : modeLabel}
      </text>
      {[10, 18, 26, 34].map((y) => (
        <circle key={y} cx="5" cy={y} r="1.6" fill="#c9a227" stroke="#8b6914" strokeWidth="0.4" />
      ))}
      <path d="M 8 6 L 8 42" stroke="#f5f0e6" strokeWidth="0.6" opacity="0.35" />
    </svg>
  );
}

function GridPage({
  cell,
  margin,
  children,
  minHeight
}: {
  cell: number;
  margin: number;
  children: ReactNode;
  minHeight: number;
}) {
  const h = Math.max(minHeight, cell * 14);
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
        backgroundSize: `${cell}px ${cell}px`,
        backgroundPosition: `${margin}px 0`
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.5\'/%3E%3C/svg%3E")'
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 top-0 w-[2px]"
        style={{ left: margin - 2, backgroundColor: INK_RED, opacity: 0.75 }}
      />
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

type NotebookBodyProps = {
  cell: number;
  margin: number;
  pageWidth: number;
  pageHeight: number;
  rows: RowData[];
  joker: JokerHandState;
  players: string[];
  label: (uid: string) => string;
  title: string;
  closeLabel: string;
  dealLabel: string;
  bidLabel: string;
  tricksLabel: string;
  pointsLabel: string;
  totalLabel: string;
  poolPremiumLabel: string;
  liveLabel: string;
  fullscreen?: boolean;
  onClose?: () => void;
};

function NotebookBody({
  cell,
  margin,
  pageWidth,
  pageHeight,
  rows,
  joker,
  players,
  label,
  title,
  closeLabel,
  dealLabel,
  bidLabel,
  tricksLabel,
  pointsLabel,
  totalLabel,
  poolPremiumLabel,
  liveLabel,
  fullscreen,
  onClose
}: NotebookBodyProps) {
  const colWidth = cell * 4;
  const titleSize = fullscreen ? 28 : 22;
  const subSize = fullscreen ? 18 : 15;
  const nameSize = fullscreen ? 21 : 17;
  const dealSize = fullscreen ? 19 : 16;
  const entrySize = fullscreen ? 26 : 20;
  const ptsSize = fullscreen ? 18 : 15;
  const totalSize = fullscreen ? 28 : 22;

  return (
    <div className="relative rounded-sm shadow-[0_8px_32px_rgba(0,0,0,0.45),0_2px_8px_rgba(0,0,0,0.3)]">
      <div className="absolute -left-1 bottom-2 top-2 w-2 rounded-l-sm bg-[#5c1010]" />
      <div className="absolute -left-0.5 bottom-1 top-1 w-1 rounded-l bg-[#8b1a1a]" />

      <div
        className="relative overflow-hidden rounded-sm border border-[#c8b89a]/80"
        style={{ width: fullscreen ? '100%' : `min(${pageWidth}px, calc(100vw - 1.5rem))` }}
      >
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#c8b89a]/80 bg-[#f5f0e6]/95 text-lg leading-none text-[#6b1515] shadow-sm transition hover:bg-white"
            aria-label={closeLabel}
          >
            ✕
          </button>
        ) : null}

        <div className={cn('overflow-auto', fullscreen ? 'max-h-[calc(88dvh-2rem)]' : 'max-h-[min(26rem,60vh)]')}>
          <GridPage cell={cell} margin={margin} minHeight={pageHeight}>
            <div
              className="relative py-2 font-[Caveat,cursive]"
              style={{ paddingLeft: margin + cell, minWidth: pageWidth - margin }}
            >
              <div
                className="mb-1 font-semibold leading-none"
                style={{ fontSize: titleSize, color: INK, ...inkWobble(1) }}
              >
                {title}
              </div>
              <div
                className="mb-3 border-b border-dashed pb-1 leading-tight"
                style={{ fontSize: subSize, color: INK_LIGHT, borderColor: `${INK}33`, ...inkWobble(3) }}
              >
                {bidLabel} / {tricksLabel} · {pointsLabel}
              </div>

              <div className="flex" style={{ marginBottom: cell }}>
                <div
                  className="shrink-0 font-medium"
                  style={{ width: cell * 2, fontSize: dealSize, color: INK_LIGHT, ...inkWobble(5) }}
                >
                  {dealLabel}
                </div>
                {players.map((uid, i) => (
                  <div
                    key={uid}
                    className="text-center font-semibold leading-none"
                    style={{
                      width: colWidth,
                      fontSize: nameSize,
                      color: INK,
                      ...inkWobble(7 + i * 3)
                    }}
                  >
                    {shortName(label(uid))}
                  </div>
                ))}
              </div>

              {rows.length === 0 ? (
                <div
                  className="py-6 text-center"
                  style={{ fontSize: entrySize, color: INK_LIGHT, ...inkWobble(11) }}
                >
                  ···
                </div>
              ) : (
                rows.map((row, ri) => (
                  <div
                    key={row.key}
                    className={cn('flex', row.live && 'opacity-90')}
                    style={{ minHeight: cell * 3, marginBottom: cell * 0.5 }}
                  >
                    <div
                      className="shrink-0 font-medium leading-none"
                      style={{
                        width: cell * 2,
                        paddingTop: cell * 0.5,
                        fontSize: dealSize,
                        color: row.live ? INK_RED : INK,
                        ...inkWobble(13 + ri)
                      }}
                    >
                      {row.dealNum}
                      <span className="ml-0.5" style={{ fontSize: dealSize - 4, color: INK_LIGHT }}>
                        п{row.pool}
                      </span>
                      {row.live ? (
                        <span className="block" style={{ fontSize: dealSize - 5, color: INK_RED }}>
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
                          style={{ width: colWidth, paddingTop: cell * 0.25 }}
                        >
                          <div
                            className="font-semibold leading-none"
                            style={{ fontSize: entrySize, color: INK, ...inkWobble(seed) }}
                          >
                            {bid !== undefined ? (
                              <>
                                {bid}
                                <span
                                  className="mx-0.5 font-normal"
                                  style={{ fontSize: entrySize - 6, color: INK_LIGHT }}
                                >
                                  /
                                </span>
                                {tricks}
                              </>
                            ) : (
                              <span style={{ color: INK_LIGHT }}>—</span>
                            )}
                          </div>
                          {pts !== undefined ? (
                            <div
                              className="mt-0.5 border-b border-dotted font-medium leading-none"
                              style={{
                                fontSize: ptsSize,
                                color: pts >= 0 ? INK_GREEN : INK_RED,
                                borderColor: pts >= 0 ? `${INK_GREEN}55` : `${INK_RED}55`,
                                ...inkWobble(seed + 2)
                              }}
                            >
                              {formatPts(pts)}
                            </div>
                          ) : row.live && bid !== undefined ? (
                            <div
                              className="mt-0.5 leading-none"
                              style={{ fontSize: ptsSize - 2, color: INK_LIGHT, ...inkWobble(seed + 4) }}
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

              {joker.poolPremiums && Object.keys(joker.poolPremiums).length > 0 ? (
                <div className="mt-2 flex" style={{ marginBottom: cell * 0.5 }}>
                  <div
                    className="shrink-0 font-medium italic"
                    style={{ width: cell * 2, fontSize: dealSize, color: INK_LIGHT, ...inkWobble(97) }}
                  >
                    {poolPremiumLabel}
                  </div>
                  {players.map((uid, i) => {
                    const pts = joker.poolPremiums?.[uid];
                    if (pts === undefined) return <div key={uid} style={{ width: colWidth }} />;
                    return (
                      <div
                        key={uid}
                        className="text-center font-medium"
                        style={{
                          width: colWidth,
                          fontSize: ptsSize,
                          color: pts >= 0 ? INK_GREEN : INK_RED,
                          ...inkWobble(98 + i)
                        }}
                      >
                        {formatPts(pts)}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div
                className="mt-2 flex border-t-2 border-double pt-2"
                style={{ borderColor: `${INK}44`, marginTop: cell }}
              >
                <div
                  className="shrink-0 font-bold"
                  style={{ width: cell * 2, fontSize: dealSize + 1, color: INK, ...inkWobble(99) }}
                >
                  {totalLabel}
                </div>
                {players.map((uid, i) => (
                  <div
                    key={uid}
                    className="text-center font-bold"
                    style={{
                      width: colWidth,
                      fontSize: totalSize,
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

              <div
                className="pointer-events-none absolute bottom-4 right-4 opacity-30"
                style={{ fontSize: fullscreen ? 14 : 11, color: INK, fontFamily: 'Caveat, cursive', transform: 'rotate(-12deg)' }}
              >
                ✒
              </div>
            </div>
          </GridPage>
        </div>
      </div>
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
  poolPremiumLabel,
  liveLabel,
  modeLabel,
  className
}: Props) {
  const [open, setOpen] = useState(false);
  const live = Boolean(joker.bids && Object.values(joker.bids).some((b) => b !== undefined));
  const rows = buildRows(joker, live);

  const cell = CELL_FULL;
  const margin = Math.round(CELL_FULL * 1.8);
  const colWidth = cell * 4;
  const pageWidth = margin + cell * 2 + colWidth * players.length + cell * 2;

  const pageHeight = useMemo(() => {
    const headerRows = 4;
    const dealRows = Math.max(rows.length, 1) * 3;
    const footerRows = 3;
    return (headerRows + dealRows + footerRows) * cell + cell * 2;
  }, [rows.length, cell]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const notebookContent = (
    <NotebookBody
      cell={cell}
      margin={margin}
      pageWidth={pageWidth}
      pageHeight={pageHeight}
      rows={rows}
      joker={joker}
      players={players}
      label={label}
      title={title}
      closeLabel={closeLabel}
      dealLabel={dealLabel}
      bidLabel={bidLabel}
      tricksLabel={tricksLabel}
      pointsLabel={pointsLabel}
      totalLabel={totalLabel}
      poolPremiumLabel={poolPremiumLabel}
      liveLabel={liveLabel}
      fullscreen
      onClose={() => setOpen(false)}
    />
  );

  return (
    <div
      className={cn(
        'pointer-events-auto fixed right-3 z-30 flex flex-col items-end gap-2',
        tableFabBottomClass,
        'sm:absolute sm:bottom-auto sm:right-4 sm:top-[4.5rem]',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'pointer-events-auto flex h-10 w-10 items-center justify-center rounded-md border shadow-lg backdrop-blur-md transition-all',
          open
            ? 'border-gold/40 bg-[#f5f0e6]/95 shadow-[0_4px_24px_rgba(232,197,71,0.25)] ring-2 ring-gold/20'
            : 'border-white/15 bg-black/65 hover:scale-105 hover:bg-black/80 hover:ring-1 hover:ring-gold/20'
        )}
        aria-label={open ? closeLabel : openLabel}
        title={open ? closeLabel : openLabel}
      >
        <NotebookIcon open={open} modeLabel={modeLabel} />
      </button>

      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-4"
                >
                  <button
                    type="button"
                    aria-label={closeLabel}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setOpen(false)}
                  />
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-label={title}
                    initial={{ opacity: 0, y: 16, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.98 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    className="relative z-[1] w-full max-h-[88dvh] rounded-t-2xl pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:w-[min(95vw,72rem)] sm:rounded-none sm:pb-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {notebookContent}
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </div>
  );
}

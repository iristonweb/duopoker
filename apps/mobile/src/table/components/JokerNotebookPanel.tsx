import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { JokerDealRecord, JokerHandState } from '@duopoker/shared-types/index';

const INK = '#1a3a6e';
const INK_LIGHT = '#2a4f8f';
const INK_RED = '#b91c1c';
const INK_GREEN = '#166534';

type Props = {
  joker: JokerHandState;
  players: string[];
  label: (uid: string) => string;
  title?: string;
  openLabel?: string;
  closeLabel?: string;
  dealLabel?: string;
  bidLabel?: string;
  tricksLabel?: string;
  pointsLabel?: string;
  totalLabel?: string;
  poolPremiumLabel?: string;
  liveLabel?: string;
  modeLabel?: string;
  style?: ViewStyle;
};

type RowData = {
  key: string;
  dealNum: number;
  pool: number;
  live?: boolean;
  bids: Record<string, number | undefined>;
  tricksWon: Record<string, number>;
  handPoints?: Record<string, number>;
};

const formatPts = (pts: number) => (pts > 0 ? `+${pts}` : String(pts));

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

function NotebookBody({
  rows,
  joker,
  players,
  label,
  title,
  dealLabel,
  bidLabel,
  tricksLabel,
  pointsLabel,
  totalLabel,
  poolPremiumLabel,
  liveLabel
}: {
  rows: RowData[];
  joker: JokerHandState;
  players: string[];
  label: (uid: string) => string;
  title: string;
  dealLabel: string;
  bidLabel: string;
  tricksLabel: string;
  pointsLabel: string;
  totalLabel: string;
  poolPremiumLabel: string;
  liveLabel: string;
}) {
  return (
    <ScrollView horizontal contentContainerStyle={styles.page}>
      <View style={styles.grid}>
        <Text style={styles.pageTitle}>{title}</Text>
        <Text style={styles.pageSub}>
          {bidLabel} / {tricksLabel} · {pointsLabel}
        </Text>

        <View style={styles.headerRow}>
          <Text style={[styles.colDeal, styles.headerCell]}>{dealLabel}</Text>
          {players.map((uid) => (
            <Text key={uid} style={[styles.colPlayer, styles.headerCell]}>
              {shortName(label(uid))}
            </Text>
          ))}
        </View>

        {rows.length === 0 ? (
          <Text style={styles.emptyRow}>···</Text>
        ) : (
          rows.map((row) => (
            <View key={row.key} style={styles.dataRow}>
              <View style={styles.colDeal}>
                <Text style={[styles.dealNum, row.live && { color: INK_RED }]}>
                  {row.dealNum}
                  <Text style={styles.poolTag}> п{row.pool}</Text>
                </Text>
                {row.live ? <Text style={styles.liveTag}>({liveLabel})</Text> : null}
              </View>
              {players.map((uid) => {
                const bid = row.bids[uid];
                const tricks = row.tricksWon[uid] ?? 0;
                const pts = row.handPoints?.[uid];
                return (
                  <View key={uid} style={styles.colPlayer}>
                    <Text style={styles.entry}>
                      {bid !== undefined ? (
                        <>
                          {bid}
                          <Text style={styles.slash}> / </Text>
                          {tricks}
                        </>
                      ) : (
                        '—'
                      )}
                    </Text>
                    {pts !== undefined ? (
                      <Text style={[styles.pts, { color: pts >= 0 ? INK_GREEN : INK_RED }]}>
                        {formatPts(pts)}
                      </Text>
                    ) : row.live && bid !== undefined ? (
                      <Text style={styles.ptsPending}>?</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))
        )}

        {joker.poolPremiums && Object.keys(joker.poolPremiums).length > 0 ? (
          <View style={styles.dataRow}>
            <Text style={[styles.colDeal, styles.premiumLabel]}>{poolPremiumLabel}</Text>
            {players.map((uid) => {
              const pts = joker.poolPremiums?.[uid];
              return (
                <Text
                  key={uid}
                  style={[styles.colPlayer, styles.pts, pts !== undefined ? { color: pts >= 0 ? INK_GREEN : INK_RED } : null]}
                >
                  {pts !== undefined ? formatPts(pts) : ''}
                </Text>
              );
            })}
          </View>
        ) : null}

        <View style={styles.totalRow}>
          <Text style={[styles.colDeal, styles.totalLabel]}>{totalLabel}</Text>
          {players.map((uid) => (
            <Text
              key={uid}
              style={[
                styles.colPlayer,
                styles.totalValue,
                { color: (joker.scores[uid] ?? 0) >= 0 ? INK : INK_RED }
              ]}
            >
              {joker.scores[uid] ?? 0}
            </Text>
          ))}
        </View>
      </View>
    </ScrollView>
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
  style
}: Props) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('table.notebookTitle');
  const resolvedOpen = openLabel ?? t('table.notebookOpen');
  const resolvedClose = closeLabel ?? t('table.notebookClose');
  const resolvedDeal = dealLabel ?? t('table.notebookDeal');
  const resolvedBid = bidLabel ?? t('table.notebookBid');
  const resolvedTricks = tricksLabel ?? t('table.notebookTricks');
  const resolvedPoints = pointsLabel ?? t('table.notebookPoints');
  const resolvedTotal = totalLabel ?? t('table.notebookTotal');
  const resolvedPool = poolPremiumLabel ?? t('table.notebookPoolPremium');
  const resolvedLive = liveLabel ?? t('table.notebookLive');
  const resolvedMode = modeLabel ?? t('table.joker');
  const [open, setOpen] = useState(false);
  const live = Boolean(joker.bids && Object.values(joker.bids).some((b) => b !== undefined));
  const rows = useMemo(() => buildRows(joker, live), [joker, live]);

  return (
    <View style={[styles.fab, style]}>
      <Pressable
        style={[styles.fabBtn, open && styles.fabBtnOpen]}
        onPress={() => setOpen((v) => !v)}
        accessibilityLabel={open ? resolvedClose : resolvedOpen}
      >
        <Text style={styles.fabEmoji}>📓</Text>
        <Text style={styles.fabMode} numberOfLines={1}>
          {resolvedMode}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Pressable style={styles.closeBtn} onPress={() => setOpen(false)} accessibilityLabel={resolvedClose}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
            <NotebookBody
              rows={rows}
              joker={joker}
              players={players}
              label={label}
              title={resolvedTitle}
              dealLabel={resolvedDeal}
              bidLabel={resolvedBid}
              tricksLabel={resolvedTricks}
              pointsLabel={resolvedPoints}
              totalLabel={resolvedTotal}
              poolPremiumLabel={resolvedPool}
              liveLabel={resolvedLive}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: { position: 'absolute', right: 12, bottom: 100, zIndex: 30, alignItems: 'flex-end' },
  fabBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  fabBtnOpen: {
    borderColor: 'rgba(232,197,71,0.4)',
    backgroundColor: 'rgba(245,240,230,0.95)'
  },
  fabEmoji: { fontSize: 16 },
  fabMode: { fontSize: 6, color: '#6b1515', maxWidth: 36, marginTop: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 12
  },
  modalSheet: {
    maxHeight: '88%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f8f4e8',
    borderWidth: 1,
    borderColor: 'rgba(200,184,154,0.8)'
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(245,240,230,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200,184,154,0.8)'
  },
  closeText: { fontSize: 16, color: '#6b1515' },
  page: { paddingVertical: 12, paddingHorizontal: 8 },
  grid: { minWidth: 320, paddingRight: 40 },
  pageTitle: { fontSize: 22, fontWeight: '600', color: INK, marginBottom: 4 },
  pageSub: {
    fontSize: 14,
    color: INK_LIGHT,
    borderBottomWidth: 1,
    borderBottomColor: `${INK}33`,
    borderStyle: 'dashed',
    paddingBottom: 8,
    marginBottom: 12
  },
  headerRow: { flexDirection: 'row', marginBottom: 8 },
  headerCell: { fontWeight: '600', color: INK },
  dataRow: { flexDirection: 'row', marginBottom: 10, minHeight: 36 },
  colDeal: { width: 56 },
  colPlayer: { width: 72, alignItems: 'center' },
  dealNum: { fontSize: 15, fontWeight: '500', color: INK },
  poolTag: { fontSize: 11, color: INK_LIGHT },
  liveTag: { fontSize: 10, color: INK_RED },
  entry: { fontSize: 18, fontWeight: '600', color: INK, textAlign: 'center' },
  slash: { fontWeight: '400', color: INK_LIGHT, fontSize: 12 },
  pts: { fontSize: 13, fontWeight: '500', textAlign: 'center', marginTop: 2 },
  ptsPending: { fontSize: 12, color: INK_LIGHT, textAlign: 'center' },
  premiumLabel: { fontSize: 13, fontStyle: 'italic', color: INK_LIGHT },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: `${INK}44`,
    paddingTop: 10,
    marginTop: 8
  },
  totalLabel: { fontSize: 14, fontWeight: '700', color: INK },
  totalValue: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptyRow: { fontSize: 18, color: INK_LIGHT, textAlign: 'center', paddingVertical: 24 }
});

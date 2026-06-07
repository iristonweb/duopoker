import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Card, GameStreet } from '@duopoker/shared-types/index';
import { formatTableError } from '@duopoker/table-client';
import { PlayingCard } from './PlayingCard';
import { TurnTimer } from './TurnTimer';
import { tableHaptic } from '../lib/table-haptics';
import { mobileTheme } from '../../theme';

const { colors } = mobileTheme;

type Props = {
  myTurn: boolean;
  need: number;
  currentBet: number;
  minTotal: number;
  maxTotal: number;
  canRaise: boolean;
  raiseAmount: number;
  onRaiseAmountChange: (amount: number) => void;
  halfPotRaise: number;
  potRaise: number;
  kettle: number;
  secondsLeft: number | null;
  holeCards: Card[];
  deckId: string;
  activeLabel: string;
  isHeroActive: boolean;
  lastActionText?: string;
  street: GameStreet;
  heroSpectating?: boolean;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: () => void;
  sessionError?: string | null;
};

function ActionButton({
  label,
  onPress,
  variant = 'ghost'
}: {
  label: string;
  onPress: () => void;
  variant?: 'ghost' | 'secondary' | 'primary' | 'danger';
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && styles.btnPrimary,
        variant === 'secondary' && styles.btnSecondary,
        variant === 'danger' && styles.btnDanger,
        pressed && styles.pressed
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.btnText,
          variant === 'primary' && styles.btnTextPrimary,
          variant === 'secondary' && styles.btnTextSecondary,
          variant === 'danger' && styles.btnTextDanger
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function TableActionDock({
  myTurn,
  need,
  currentBet,
  minTotal,
  maxTotal,
  canRaise,
  raiseAmount,
  onRaiseAmountChange,
  halfPotRaise,
  potRaise,
  kettle,
  secondsLeft,
  holeCards,
  deckId,
  activeLabel,
  isHeroActive,
  lastActionText,
  street,
  heroSpectating,
  onFold,
  onCheck,
  onCall,
  onRaise,
  sessionError
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [moreOpen, setMoreOpen] = useState(false);
  const showActions = myTurn && street !== 'COMPLETE' && street !== 'LOBBY';
  const clampedRaise = Math.min(maxTotal, Math.max(minTotal, raiseAmount || minTotal));

  return (
    <View style={[styles.shell, showActions && styles.shellActive, { paddingBottom: Math.max(12, insets.bottom) }]}>
      {sessionError ? (
        <Text style={styles.error}>{formatTableError(sessionError, t)}</Text>
      ) : null}

      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {showActions && holeCards.length ? (
            <View style={styles.holeCards}>
              {holeCards.map((c, i) => (
                <PlayingCard
                  key={c}
                  card={c}
                  faceUp
                  deckId={deckId}
                  size="sm"
                  style={{ transform: [{ rotate: i === 0 ? '-6deg' : '6deg' }] }}
                />
              ))}
            </View>
          ) : null}
          <View style={styles.headerText}>
            {showActions ? (
              <Text style={styles.prompt}>
                {t('table.yourAction', { amount: need })}
                {secondsLeft !== null ? ` · ${t('table.timeLeft', { seconds: secondsLeft })}` : ''}
              </Text>
            ) : street !== 'COMPLETE' ? (
              <>
                <Text style={styles.waiting} numberOfLines={1}>
                  {t('table.toAct')}{' '}
                  <Text style={isHeroActive ? styles.activeName : styles.otherName}>{activeLabel}</Text>
                </Text>
                {lastActionText ? (
                  <Text style={styles.lastAction} numberOfLines={1}>
                    {t('table.lastAction')}: {lastActionText}
                  </Text>
                ) : null}
              </>
            ) : null}
          </View>
        </View>
        {showActions && secondsLeft !== null ? <TurnTimer secondsLeft={secondsLeft} size={40} /> : null}
      </View>

      {showActions ? (
        <>
          <View style={styles.actionsRow}>
            <ActionButton
              label={t('table.fold')}
              variant="danger"
              onPress={() => {
                void tableHaptic('light');
                onFold();
              }}
            />
            {need === 0 ? (
              <ActionButton
                label={t('table.check')}
                variant="secondary"
                onPress={() => {
                  void tableHaptic('medium');
                  onCheck();
                }}
              />
            ) : (
              <ActionButton
                label={t('table.call', { amount: need })}
                variant="secondary"
                onPress={() => {
                  void tableHaptic('medium');
                  onCall();
                }}
              />
            )}
            {canRaise ? (
              <ActionButton
                label={currentBet > 0 ? t('table.raise') : t('table.bet')}
                variant="primary"
                onPress={() => {
                  void tableHaptic('heavy');
                  onRaise();
                }}
              />
            ) : null}
          </View>

          {canRaise ? (
            <View style={styles.raiseRow}>
              <ActionButton
                label={t('table.halfPot')}
                onPress={() => {
                  void tableHaptic('light');
                  onRaiseAmountChange(halfPotRaise);
                }}
              />
              <ActionButton
                label={t('table.potBet')}
                onPress={() => {
                  void tableHaptic('light');
                  onRaiseAmountChange(potRaise);
                }}
              />
              <ActionButton
                label={`−`}
                onPress={() => onRaiseAmountChange(Math.max(minTotal, clampedRaise - Math.max(1, Math.floor((maxTotal - minTotal) / 20))))}
              />
              <Text style={styles.raiseAmount}>{clampedRaise.toLocaleString()}</Text>
              <ActionButton
                label={`+`}
                onPress={() => onRaiseAmountChange(Math.min(maxTotal, clampedRaise + Math.max(1, Math.floor((maxTotal - minTotal) / 20))))}
              />
            </View>
          ) : null}

          <Pressable style={styles.moreToggle} onPress={() => setMoreOpen((v) => !v)}>
            <Text style={styles.moreToggleText}>{t('table.moreActions')}</Text>
          </Pressable>
          {moreOpen && canRaise ? (
            <Text style={styles.meta}>
              {t('table.pot')}: {kettle.toLocaleString()}
            </Text>
          ) : null}
        </>
      ) : street !== 'COMPLETE' && street !== 'LOBBY' ? (
        <Text style={styles.spectate}>
          {heroSpectating ? t('table.spectating') : lastActionText ? '' : t('table.waitingOpponent')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(5,5,8,0.95)',
    paddingHorizontal: 12,
    paddingTop: 10
  },
  shellActive: {
    borderTopColor: 'rgba(232,197,71,0.45)',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8
  },
  error: {
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.3)',
    backgroundColor: 'rgba(244,63,94,0.1)',
    color: colors.danger,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  holeCards: { flexDirection: 'row', gap: 2 },
  headerText: { flex: 1, minWidth: 0 },
  prompt: { fontSize: 12, fontWeight: '600', color: 'rgba(232,197,71,0.85)', textTransform: 'uppercase' },
  waiting: { fontSize: 13, color: colors.textMuted },
  activeName: { color: colors.goldLight, fontWeight: '600' },
  otherName: { color: '#e4e4e7', fontWeight: '600' },
  lastAction: { marginTop: 4, fontSize: 13, color: colors.ivory, fontWeight: '500' },
  actionsRow: {
    flexDirection: 'row',
    gap: 0,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.3)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    overflow: 'hidden'
  },
  raiseRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  raiseAmount: {
    minWidth: 56,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: colors.goldLight,
    fontVariant: ['tabular-nums']
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 0,
    borderWidth: 0,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  btnPrimary: {
    borderRightWidth: 0,
    borderColor: 'rgba(232,197,71,0.35)',
    backgroundColor: 'rgba(232,197,71,0.18)'
  },
  btnSecondary: {
    borderColor: 'rgba(74,222,128,0.3)',
    backgroundColor: 'rgba(74,222,128,0.12)'
  },
  btnDanger: {
    borderColor: 'rgba(244,63,94,0.25)',
    backgroundColor: 'rgba(244,63,94,0.12)'
  },
  btnText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  btnTextPrimary: { color: colors.goldLight },
  btnTextSecondary: { color: colors.emerald },
  btnTextDanger: { color: colors.danger },
  pressed: { opacity: 0.8 },
  moreToggle: { alignSelf: 'center', marginBottom: 4 },
  moreToggleText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textSubtle
  },
  meta: { textAlign: 'center', fontSize: 11, color: colors.textSubtle, marginBottom: 4 },
  spectate: { textAlign: 'center', fontSize: 13, color: colors.textSubtle, paddingVertical: 8 }
});

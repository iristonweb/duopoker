import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import type { GameFeedEvent } from '@duopoker/table-client';
import { mobileTheme } from '../../theme';

const { colors } = mobileTheme;

const kindStyle: Record<GameFeedEvent['kind'], { border: string; color: string }> = {
  action: { border: 'rgba(161,161,170,0.6)', color: '#f4f4f5' },
  street: { border: 'rgba(74,222,128,0.7)', color: colors.emerald },
  hand: { border: 'rgba(232,197,71,0.7)', color: colors.goldLight },
  blinds: { border: 'rgba(232,197,71,0.4)', color: colors.textMuted },
  winner: { border: 'rgba(251,191,36,0.8)', color: '#fef3c7' },
  system: { border: 'rgba(167,139,250,0.5)', color: '#ede9fe' }
};

const kindIcon: Record<GameFeedEvent['kind'], string> = {
  action: '◆',
  street: '▸',
  hand: '♠',
  blinds: '◎',
  winner: '★',
  system: '◇'
};

type Props = {
  events: GameFeedEvent[];
  pulseKey: number;
  soundOn: boolean;
  musicOn: boolean;
  onSoundToggle: () => void;
  onMusicToggle: () => void;
  soundOnLabel?: string;
  soundOffLabel?: string;
  musicOnLabel?: string;
  musicOffLabel?: string;
  title?: string;
  openLabel?: string;
  closeLabel?: string;
  emptyLabel?: string;
  style?: ViewStyle;
};

function FeedList({ events, emptyLabel }: { events: GameFeedEvent[]; emptyLabel: string }) {
  return (
    <ScrollView style={styles.feedList} contentContainerStyle={styles.feedContent}>
      {events.length === 0 ? (
        <Text style={styles.empty}>{emptyLabel}</Text>
      ) : (
        events.map((ev) => {
          const palette = kindStyle[ev.kind];
          return (
            <View
              key={ev.id}
              style={[styles.feedItem, { borderLeftColor: palette.border }]}
            >
              <Text style={{ color: palette.color }}>
                <Text style={styles.feedIcon}>{kindIcon[ev.kind]} </Text>
                {ev.text}
              </Text>
              <Text style={styles.feedTime}>
                {new Date(ev.at).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function ControlButtons({
  soundOn,
  musicOn,
  onSoundToggle,
  onMusicToggle,
  soundOnLabel,
  soundOffLabel,
  musicOnLabel,
  musicOffLabel
}: Pick<
  Props,
  | 'soundOn'
  | 'musicOn'
  | 'onSoundToggle'
  | 'onMusicToggle'
  | 'soundOnLabel'
  | 'soundOffLabel'
  | 'musicOnLabel'
  | 'musicOffLabel'
>) {
  return (
    <>
      <Pressable
        style={[styles.ctrlBtn, soundOn && styles.ctrlBtnOn]}
        onPress={onSoundToggle}
        accessibilityLabel={soundOn ? soundOnLabel : soundOffLabel}
      >
        <Text style={styles.ctrlEmoji}>{soundOn ? '🔊' : '🔇'}</Text>
      </Pressable>
      <Pressable
        style={[styles.ctrlBtn, musicOn && styles.ctrlBtnMusic]}
        onPress={onMusicToggle}
        accessibilityLabel={musicOn ? musicOnLabel : musicOffLabel}
      >
        <Text style={styles.ctrlEmoji}>{musicOn ? '🎵' : '🎶'}</Text>
      </Pressable>
    </>
  );
}

export function GameStoryPanel({
  events,
  pulseKey,
  soundOn,
  musicOn,
  onSoundToggle,
  onMusicToggle,
  soundOnLabel,
  soundOffLabel,
  musicOnLabel,
  musicOffLabel,
  title,
  openLabel,
  closeLabel,
  emptyLabel,
  style
}: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const latest = events[0];
  const resolvedTitle = title ?? t('table.feedTitle');
  const resolvedOpen = openLabel ?? t('table.feedOpenHistory');
  const resolvedClose = closeLabel ?? t('table.feedCloseHistory');
  const resolvedEmpty = emptyLabel ?? t('table.feedEmpty');
  const resolvedSoundOn = soundOnLabel ?? t('table.soundOn');
  const resolvedSoundOff = soundOffLabel ?? t('table.soundOff');
  const resolvedMusicOn = musicOnLabel ?? t('table.musicOn');
  const resolvedMusicOff = musicOffLabel ?? t('table.musicOff');

  return (
    <View style={[styles.wrap, style]}>
      {latest && !open ? (
        <Animated.View key={`${latest.id}-${pulseKey}`} entering={FadeIn.duration(300)} style={styles.latest}>
          <View style={[styles.latestPanel, { borderLeftColor: kindStyle[latest.kind].border }]}>
            <Text style={[styles.latestText, { color: kindStyle[latest.kind].color }]}>
              {kindIcon[latest.kind]} {latest.text}
            </Text>
          </View>
        </Animated.View>
      ) : null}

      <View style={styles.toolbar}>
        <Pressable style={[styles.feedToggle, open && styles.feedToggleOpen]} onPress={() => setOpen((v) => !v)}>
          <Text style={[styles.feedToggleText, open && styles.feedToggleTextOpen]}>
            {open ? resolvedClose : resolvedOpen}
            {!open && events.length > 0 ? ` (${events.length})` : ''}
          </Text>
        </Pressable>
        <ControlButtons
          soundOn={soundOn}
          musicOn={musicOn}
          onSoundToggle={onSoundToggle}
          onMusicToggle={onMusicToggle}
          soundOnLabel={resolvedSoundOn}
          soundOffLabel={resolvedSoundOff}
          musicOnLabel={resolvedMusicOn}
          musicOffLabel={resolvedMusicOff}
        />
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{resolvedTitle}</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={styles.sheetClose}>{resolvedClose}</Text>
              </Pressable>
            </View>
            <FeedList events={events} emptyLabel={resolvedEmpty} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, top: 72, zIndex: 20, maxWidth: 280 },
  latest: { marginBottom: 6 },
  latestPanel: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.2)',
    borderLeftWidth: 3,
    backgroundColor: 'rgba(12,12,18,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  latestText: { fontSize: 13, fontWeight: '500' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  feedToggle: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  feedToggleOpen: { backgroundColor: 'rgba(232,197,71,0.15)' },
  feedToggleText: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', color: colors.textMuted },
  feedToggleTextOpen: { color: colors.goldLight },
  ctrlBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  ctrlBtnOn: { borderColor: 'rgba(232,197,71,0.3)', backgroundColor: 'rgba(232,197,71,0.1)' },
  ctrlBtnMusic: { borderColor: 'rgba(167,139,250,0.35)', backgroundColor: 'rgba(139,92,246,0.15)' },
  ctrlEmoji: { fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '50%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(232,197,71,0.25)',
    backgroundColor: 'rgba(5,5,8,0.96)'
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  sheetTitle: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: 'rgba(232,197,71,0.7)'
  },
  sheetClose: { fontSize: 12, color: colors.textSubtle },
  feedList: { maxHeight: 320 },
  feedContent: { padding: 8, gap: 6 },
  feedItem: {
    borderLeftWidth: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  feedIcon: { opacity: 0.5 },
  feedTime: { marginTop: 4, fontSize: 9, color: 'rgba(113,113,122,0.8)' },
  empty: { textAlign: 'center', paddingVertical: 24, fontSize: 12, color: colors.textSubtle }
});

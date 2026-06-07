import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useVoiceEligibility } from '../hooks/useVoiceEligibility';
import { VoiceRoom } from './VoiceRoom';
import { mobileTheme } from '../../theme';

const { colors } = mobileTheme;

export function VoiceChatPill({
  compact = false,
  subscriptionTier = 'FREE',
  style
}: {
  compact?: boolean;
  subscriptionTier?: string;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const { t } = useTranslation();
  const eligibility = useVoiceEligibility(subscriptionTier);
  const [open, setOpen] = useState(false);
  const checking = eligibility === 'checking';
  const blocked = eligibility === 'unavailable' || eligibility === 'tier_required';

  const handleToggle = () => {
    if (checking || blocked) return;
    setOpen((v) => !v);
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          compact ? styles.compact : styles.pill,
          blocked && styles.disabled,
          open && !blocked && styles.pillLive,
          pressed && !blocked && styles.pressed,
          style
        ]}
        onPress={handleToggle}
        disabled={checking || blocked}
        accessibilityLabel={t('table.voiceEyebrow')}
      >
        <View style={[styles.dot, open && !blocked && styles.dotLive]} />
        {!compact ? (
          <Text style={styles.label}>
            {checking ? t('voice.checking') : t('table.voiceEyebrow')}
          </Text>
        ) : null}
      </Pressable>

      <Modal visible={open && !blocked} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>{t('table.voiceEyebrow')}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>
            <VoiceRoom />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  pillLive: { borderColor: 'rgba(74,222,128,0.4)', backgroundColor: 'rgba(74,222,128,0.12)' },
  compact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textMuted },
  dotLive: { backgroundColor: colors.emerald },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    padding: 16,
    paddingBottom: 32
  },
  panel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.25)',
    backgroundColor: 'rgba(10,10,16,0.98)',
    padding: 16
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  panelTitle: {
    color: colors.emerald,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase'
  },
  close: { color: colors.textMuted, fontSize: 16, padding: 4 }
});

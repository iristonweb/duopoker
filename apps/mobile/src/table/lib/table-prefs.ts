import * as SecureStore from 'expo-secure-store';

const SFX_KEY = 'duopoker_mobile_table_sfx';
const MUSIC_KEY = 'duopoker_mobile_table_music';

export const loadTableSfxPref = async (): Promise<boolean> => {
  try {
    const v = await SecureStore.getItemAsync(SFX_KEY);
    return v !== '0';
  } catch {
    return true;
  }
};

export const saveTableSfxPref = async (on: boolean) => {
  try {
    await SecureStore.setItemAsync(SFX_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
};

export const loadTableMusicPref = async (): Promise<boolean> => {
  try {
    const v = await SecureStore.getItemAsync(MUSIC_KEY);
    return v === '1';
  } catch {
    return false;
  }
};

export const saveTableMusicPref = async (on: boolean) => {
  try {
    await SecureStore.setItemAsync(MUSIC_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
};

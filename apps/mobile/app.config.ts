import type { ExpoConfig } from 'expo/config';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const config: ExpoConfig = {
  name: 'DuoPoker',
  slug: 'duopoker',
  scheme: 'duopoker',
  version: '0.1.0',
  orientation: 'default',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'app.duopoker.mobile',
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
      NSMicrophoneUsageDescription:
        'Микрофон нужен для голосового чата за покерным столом.'
    }
  },
  android: {
    package: 'app.duopoker.mobile',
    permissions: ['RECORD_AUDIO']
  },
  plugins: ['expo-router', 'expo-secure-store', 'expo-notifications'],
  experiments: {
    typedRoutes: true
  },
  extra: {
    apiUrl,
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? ''
    }
  }
};

export default config;

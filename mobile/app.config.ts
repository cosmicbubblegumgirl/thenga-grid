import type { ExpoConfig } from 'expo/config';

const merchant = process.env.APP_VARIANT === 'merchant';

export default (): ExpoConfig => ({
  name: merchant ? 'THENGA GRID Shop Owner' : 'THENGA GRID Customer',
  slug: merchant ? 'thenga-grid-merchant' : 'thenga-grid-customer',
  version: '2.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  scheme: merchant ? 'thengagridmerchant' : 'thengagrid',
  plugins: [
    [
      'expo-splash-screen',
      { image: './assets/splash-icon.png', imageWidth: 220, resizeMode: 'contain', backgroundColor: '#111512' },
    ],
  ],
  ios: {
    supportsTablet: true,
    buildNumber: '2',
    bundleIdentifier: merchant ? 'za.co.thengagrid.merchant' : 'za.co.thengagrid.customer',
    infoPlist: {
      NSLocationWhenInUseUsageDescription: 'THENGA GRID uses your location to find nearby shops and walking routes.',
    },
  },
  android: {
    versionCode: 2,
    adaptiveIcon: {
      backgroundColor: '#111512',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    package: merchant ? 'za.co.thengagrid.merchant' : 'za.co.thengagrid.customer',
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    predictiveBackGestureEnabled: false,
  },
  web: { favicon: './assets/favicon.png' },
  extra: {
    defaultRole: merchant ? 'owner' : 'customer',
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000',
  },
});

import type { ExpoConfig } from "expo/config";

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://qkpjlfcpncvvjyzfolag.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcGpsZmNwbmN2dmp5emZvbGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwMDAxMDAsImV4cCI6MjA1OTU3NjEwMH0.Lnas8tdQ_Wycaa-oWh8lCfRGkRr8IhW5CohA7n37nMg";

const config: ExpoConfig = {
  name: "MAUDIO",
  slug: "maudio",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "maudio",
  userInterfaceStyle: "automatic",
  newArchEnabled: false,
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0b0b10",
  },
  ios: {
    bundleIdentifier: "com.maudio.online",
    supportsTablet: true,
    infoPlist: {
      UIBackgroundModes: ["audio"],
    },
  },
  android: {
    package: "com.maudio.online",
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#7c3aed",
    },
    permissions: [
      "INTERNET",
      "ACCESS_NETWORK_STATE",
      "FOREGROUND_SERVICE",
      "FOREGROUND_SERVICE_MEDIA_PLAYBACK",
      "POST_NOTIFICATIONS",
      "WAKE_LOCK",
    ],
  },
  plugins: [
    [
      "expo-build-properties",
      {
        android: { minSdkVersion: 24, compileSdkVersion: 34, targetSdkVersion: 34 },
      },
    ],
  ],
  extra: {
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
  },
};

export default config;
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export const supabase = createClient(extra.supabaseUrl, extra.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

const SUPABASE_PUBLIC = `${extra.supabaseUrl}/storage/v1/object/public`;

export const coverUrl = (p?: string | null) => {
  if (!p) return null;
  if (p.startsWith("http")) return p;
  return `${SUPABASE_PUBLIC}/cover_art/${p}`;
};

export const audioUrl = (p?: string | null) => {
  if (!p) return null;
  if (p.startsWith("http")) return p;
  return `${SUPABASE_PUBLIC}/audio/${p}`;
};
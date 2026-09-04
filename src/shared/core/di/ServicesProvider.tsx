/**
 * Dependency injection root.
 *
 * A single `ServicesProvider` builds the MusicRepository and StorageManager
 * once and injects them down the tree. Nothing in the app should construct a
 * repository/manager itself — that keeps implementations swappable (S3 vs
 * Supabase media, mock repositories in tests) and avoids scattered singletons.
 */
import React, { createContext, useContext, useMemo } from "react";
import {
  createStorageManager,
  supabaseMediaProvider,
  type RemoteMediaProvider,
  type StorageManager,
} from "@/core/storage/StorageManager";
import {
  createMusicRepository,
  type MusicRepository,
} from "@/core/data/MusicRepository";

export interface Services {
  storage: StorageManager;
  music: MusicRepository;
}

const ServicesContext = createContext<Services | null>(null);

/** Default container used outside React (services, one-off utilities). */
export function createServices(
  mediaProvider: RemoteMediaProvider = supabaseMediaProvider,
): Services {
  const storage = createStorageManager(mediaProvider);
  return { storage, music: createMusicRepository(storage) };
}

let defaultServices: Services | null = null;
export function getServices(): Services {
  if (!defaultServices) defaultServices = createServices();
  return defaultServices;
}

export function ServicesProvider({
  children,
  services,
  mediaProvider,
}: {
  children: React.ReactNode;
  /** Inject a custom container (tests, storybook, provider swaps). */
  services?: Services;
  mediaProvider?: RemoteMediaProvider;
}) {
  const value = useMemo(
    () => services ?? (mediaProvider ? createServices(mediaProvider) : getServices()),
    [services, mediaProvider],
  );
  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  return useContext(ServicesContext) ?? getServices();
}

export const useMusicRepository = (): MusicRepository => useServices().music;
export const useStorageManager = (): StorageManager => useServices().storage;

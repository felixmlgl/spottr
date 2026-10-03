/**
 * Member app preferences, persisted in localStorage (falls back to defaults when storage is unavailable).
 */

import { useState } from 'react';

export type OverlayMode = 'raw' | 'styled';

export interface AppSettings {
  /** Raw = overlay.json drawn like the backend's annotated video; Styled = our prettified overlay */
  overlayMode: OverlayMode;
  repSound: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  overlayMode: 'raw',
  repSound: true,
};

const SETTINGS_STORAGE_KEY = 'spottr_settings';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // localStorage disabled or corrupt
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function useSettings(): [AppSettings, (patch: Partial<AppSettings>) => void] {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const update = (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };
  return [settings, update];
}

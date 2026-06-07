import type { PreviewPreset } from "./canvasState";

export type FloatingPosition = { x: number; y: number };
export type FloatingSize = { width: number; height: number };
export type FlyoutKind = "components" | "presets" | "synthetic" | "examine";
export type FlyoutLayoutMap = Partial<Record<FlyoutKind, { position: FloatingPosition; size: FloatingSize }>>;

export const LAYOUT_STORAGE_KEY = "ivfitter.modelBuilder.preview.layout";
export const PRESET_STORAGE_KEY = "ivfitter.modelBuilder.preview.savedPresets";
export const CUSTOM_COMPONENT_STORAGE_KEY = "ivfitter.modelBuilder.preview.customComponents";
export const FLYOUT_LAYOUT_STORAGE_KEY = "ivfitter.modelBuilder.preview.flyoutLayouts";

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function clonePreviewPresetState<T>(state: T): T {
  return JSON.parse(JSON.stringify(state)) as T;
}

export function isUserPreset(preset: PreviewPreset): boolean {
  return !preset.system;
}

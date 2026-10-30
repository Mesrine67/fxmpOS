import { invoke, isTauri } from "@tauri-apps/api/core"
import { emit } from "@tauri-apps/api/event"
import { LazyStore } from "@tauri-apps/plugin-store"

export const DOCK_THEMES = ["windows", "fxmp", "light"] as const
export type DockTheme = (typeof DOCK_THEMES)[number]
export const DEFAULT_DOCK_THEME: DockTheme = "windows"

const store = new LazyStore("fxmp-settings.json", { autoSave: false })
const key = "dockTheme"

export function normalizeDockTheme(value: unknown): DockTheme {
  return DOCK_THEMES.includes(value as DockTheme) ? value as DockTheme : DEFAULT_DOCK_THEME
}

export async function getDockTheme(): Promise<DockTheme> {
  if (!isTauri()) return DEFAULT_DOCK_THEME
  return normalizeDockTheme(await invoke<unknown>("get_dock_theme"))
}

export async function setDockTheme(theme: DockTheme): Promise<void> {
  if (!isTauri()) return
  const normalized = normalizeDockTheme(theme)
  await store.set(key, normalized)
  await store.save()
  await emit("dock-theme-changed", normalized)
}

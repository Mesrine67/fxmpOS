import { isTauri } from "@tauri-apps/api/core"
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
  return normalizeDockTheme(await store.get<unknown>(key))
}

export async function setDockTheme(theme: DockTheme): Promise<void> {
  if (!isTauri()) return
  await store.set(key, normalizeDockTheme(theme))
  await store.save()
}

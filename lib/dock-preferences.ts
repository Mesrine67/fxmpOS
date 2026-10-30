import { isTauri } from "@tauri-apps/api/core"
import { LazyStore } from "@tauri-apps/plugin-store"

export const DEFAULT_DOCK_THEME = "doludock" as const
export type DockTheme = typeof DEFAULT_DOCK_THEME

const store = new LazyStore("fxmp-settings.json", { autoSave: false })
const monitorKey = "dockMonitorId"

export const DEFAULT_DOCK_MONITOR_ID = "primary"

export async function getDockMonitorId(): Promise<string> {
  if (!isTauri()) return DEFAULT_DOCK_MONITOR_ID
  const saved = await store.get<unknown>(monitorKey)
  return typeof saved === "string" && saved.length > 0 ? saved : DEFAULT_DOCK_MONITOR_ID
}

export async function setDockMonitorId(monitorId: string): Promise<void> {
  if (!isTauri()) return
  await store.set(monitorKey, monitorId || DEFAULT_DOCK_MONITOR_ID)
  await store.save()
}

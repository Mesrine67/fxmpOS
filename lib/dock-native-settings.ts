import { invoke, isTauri } from "@tauri-apps/api/core"

export interface DockSettings {
  folder: string
  toggleMode: boolean
  showFolderName: boolean
  showItemCount: boolean
  backdrop: "solid" | "acrylic"
  opacity: number
  roundedCorners: boolean
  animations: boolean
  gridColumns: number
  gridRows: number
  padding: number
  centerCursor: boolean
  offsetX: number
  offsetY: number
}

export const DEFAULT_DOCK_SETTINGS: DockSettings = {
  folder: "",
  toggleMode: false,
  showFolderName: false,
  showItemCount: false,
  backdrop: "acrylic",
  opacity: 45,
  roundedCorners: true,
  animations: true,
  gridColumns: 0,
  gridRows: 0,
  padding: 20,
  centerCursor: true,
  offsetX: 0,
  offsetY: 0,
}

export async function getNativeDockSettings(): Promise<DockSettings> {
  if (!isTauri()) return DEFAULT_DOCK_SETTINGS
  return invoke<DockSettings>("plugin:dock|get_settings")
}
export async function saveNativeDockSettings(settings: DockSettings): Promise<void> {
  if (!isTauri()) throw new Error("Les réglages nécessitent l'application Windows.")
  await invoke("plugin:dock|set_settings", { settings })
}

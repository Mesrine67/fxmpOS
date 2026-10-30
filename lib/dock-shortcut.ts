import { invoke, isTauri } from "@tauri-apps/api/core"
import { LazyStore } from "@tauri-apps/plugin-store"

export const DEFAULT_DOCK_SHORTCUT = "CommandOrControl+Shift+Space"

const STORE_PATH = "fxmp-settings.json"
const STORE_KEY = "dockShortcut"
const RESERVED_SHORTCUTS = new Set([
  "CommandOrControl+Shift+1",
  "CommandOrControl+Shift+2",
  "CommandOrControl+Shift+3",
  "CommandOrControl+Shift+4",
  "CommandOrControl+Shift+5",
  "CommandOrControl+Shift+K",
  "CommandOrControl+Shift+O",
])
const settingsStore = new LazyStore(STORE_PATH, { autoSave: false })

let activeShortcut = DEFAULT_DOCK_SHORTCUT
let initialization: Promise<string> | undefined
let shortcutPaused = false

export function isDockShortcutReserved(shortcut: string) {
  return RESERVED_SHORTCUTS.has(shortcut)
}

export async function initializeDockShortcut() {
  if (!isTauri()) return DEFAULT_DOCK_SHORTCUT
  if (initialization) return initialization

  initialization = (async () => {
    const saved = await settingsStore.get<string>(STORE_KEY)
    const desired = saved?.trim() || DEFAULT_DOCK_SHORTCUT
    try {
      await invoke("set_dock_shortcut", { shortcut: desired })
      activeShortcut = desired
    } catch (error) {
      if (desired === DEFAULT_DOCK_SHORTCUT) throw error
      await invoke("set_dock_shortcut", { shortcut: DEFAULT_DOCK_SHORTCUT })
      await settingsStore.set(STORE_KEY, DEFAULT_DOCK_SHORTCUT)
      await settingsStore.save()
      activeShortcut = DEFAULT_DOCK_SHORTCUT
      console.warn("Le raccourci du dock enregistré est indisponible", error)
    }

    return activeShortcut
  })().catch((error: unknown) => {
    initialization = undefined
    throw error
  })

  return initialization
}

export async function getDockShortcut() {
  if (!isTauri()) return DEFAULT_DOCK_SHORTCUT
  return (await settingsStore.get<string>(STORE_KEY))?.trim() || DEFAULT_DOCK_SHORTCUT
}

export async function updateDockShortcut(shortcut: string) {
  if (!isTauri()) throw new Error("Le raccourci global demande l’application de bureau.")
  await initializeDockShortcut()
  if (shortcut === activeShortcut) {
    await resumeDockShortcut()
    return activeShortcut
  }

  const previous = activeShortcut
  await invoke("set_dock_shortcut", { shortcut })
  try {
    await settingsStore.set(STORE_KEY, shortcut)
    await settingsStore.save()
    shortcutPaused = false
    activeShortcut = shortcut
    window.dispatchEvent(new CustomEvent("fxmp:dock-shortcut-changed", { detail: shortcut }))
    return activeShortcut
  } catch (error) {
    await invoke("set_dock_shortcut", { shortcut: previous }).catch(() => undefined)
    shortcutPaused = false
    await settingsStore.set(STORE_KEY, previous).catch(() => undefined)
    await settingsStore.save().catch(() => undefined)
    throw error
  }
}

export async function pauseDockShortcut() {
  if (!isTauri()) return
  await initializeDockShortcut()
  if (shortcutPaused) return
  await invoke("set_dock_shortcut", { shortcut: "CommandOrControl+Shift+F12" })
  shortcutPaused = true
}

export async function resumeDockShortcut() {
  if (!isTauri() || !shortcutPaused) return
  await invoke("set_dock_shortcut", { shortcut: activeShortcut })
  shortcutPaused = false
}

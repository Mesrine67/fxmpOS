import { isTauri } from "@tauri-apps/api/core"
import { LazyStore } from "@tauri-apps/plugin-store"

export const SIDEBAR_WORKSPACES = ["os", "overlays", "games"] as const
export type SidebarWorkspace = (typeof SIDEBAR_WORKSPACES)[number]

const STORE_PATH = "fxmp-sidebar.json"
const STORE_KEY = "sidebarWorkspace"
const DEFAULT_WORKSPACE: SidebarWorkspace = "os"
const store = new LazyStore(STORE_PATH, { autoSave: false })
const listeners = new Set<() => void>()
let workspace: SidebarWorkspace = DEFAULT_WORKSPACE
let initialization: Promise<SidebarWorkspace> | undefined
let stopStoreListener: (() => void) | undefined

function isSidebarWorkspace(value: unknown): value is SidebarWorkspace {
  return (
    typeof value === "string" &&
    SIDEBAR_WORKSPACES.includes(value as SidebarWorkspace)
  )
}

function publishWorkspace(next: SidebarWorkspace) {
  if (workspace === next) return
  workspace = next
  listeners.forEach((listener) => listener())
}

export function initializeSidebarWorkspace() {
  if (!isTauri()) return Promise.resolve(workspace)
  if (initialization) return initialization

  initialization = (async () => {
    const stored = await store.get<unknown>(STORE_KEY)
    if (isSidebarWorkspace(stored)) publishWorkspace(stored)

    stopStoreListener = await store.onKeyChange<unknown>(STORE_KEY, (value) => {
      if (isSidebarWorkspace(value)) publishWorkspace(value)
    })

    const latest = await store.get<unknown>(STORE_KEY)
    if (isSidebarWorkspace(latest)) publishWorkspace(latest)
    return workspace
  })().catch((error: unknown) => {
    initialization = undefined
    stopStoreListener?.()
    stopStoreListener = undefined
    throw error
  })

  return initialization
}

export function subscribeToSidebarWorkspace(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSidebarWorkspace() {
  return workspace
}

export function getServerSidebarWorkspace() {
  return DEFAULT_WORKSPACE
}

export async function setSidebarWorkspace(next: SidebarWorkspace) {
  await initializeSidebarWorkspace()
  if (isTauri()) {
    const previous = await store.get<unknown>(STORE_KEY)
    await store.set(STORE_KEY, next)
    try {
      await store.save()
    } catch (error) {
      await store.set(
        STORE_KEY,
        isSidebarWorkspace(previous) ? previous : DEFAULT_WORKSPACE
      )
      await store.save().catch(() => undefined)
      throw error
    }
  }
  publishWorkspace(next)
}

"use client"

import { useSyncExternalStore } from "react"
import { isTauri } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"

const subscribeToTauriRuntime = () => () => {}
const getTauriRuntimeSnapshot = () => isTauri()
const getTauriRuntimeServerSnapshot = () => null
const subscribeToWindowLabel = () => () => {}
const getWindowLabelSnapshot = () =>
  isTauri() ? getCurrentWindow().label : "browser"
const getWindowLabelServerSnapshot = () => null

export function useTauriRuntime() {
  return useSyncExternalStore(
    subscribeToTauriRuntime,
    getTauriRuntimeSnapshot,
    getTauriRuntimeServerSnapshot
  )
}

export function useTauriWindowLabel() {
  return useSyncExternalStore(
    subscribeToWindowLabel,
    getWindowLabelSnapshot,
    getWindowLabelServerSnapshot
  )
}

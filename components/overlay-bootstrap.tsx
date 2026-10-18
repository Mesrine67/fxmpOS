"use client"

import { useEffect } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"

import { useTauriRuntime } from "@/hooks/use-tauri-runtime"
import { readOverlayPreferences } from "@/lib/overlay-settings"
import { trackedInvoke } from "@/lib/tauri"

export function OverlayBootstrap() {
  const desktopRuntime = useTauriRuntime()

  useEffect(() => {
    if (desktopRuntime !== true) return

    const timer = window.setTimeout(() => {
      if (getCurrentWindow().label !== "main") return

      const preferences = readOverlayPreferences()
      if (!preferences.enabled) return

      void trackedInvoke("set_overlay_state", {
        visible: true,
        settings: preferences,
      }).catch((error) => {
        console.error("Impossible de restaurer l’overlay FXMP OS", error)
      })
    }, 0)

    return () => window.clearTimeout(timer)
  }, [desktopRuntime])

  return null
}

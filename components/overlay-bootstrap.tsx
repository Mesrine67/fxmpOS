"use client"

import { useEffect } from "react"
import { listen } from "@tauri-apps/api/event"
import { getCurrentWindow } from "@tauri-apps/api/window"

import { useTauriRuntime } from "@/hooks/use-tauri-runtime"
import { readOverlayPreferences } from "@/lib/overlay-settings"
import { trackedInvoke } from "@/lib/tauri"

export function OverlayBootstrap() {
  const desktopRuntime = useTauriRuntime()

  useEffect(() => {
    if (desktopRuntime !== true || getCurrentWindow().label !== "main") return

    let disposed = false
    let stopListening: (() => void) | undefined
    void listen("overlay-hide-requested", () => {
      void trackedInvoke("set_overlay_state", {
        visible: false,
        settings: readOverlayPreferences(),
      }).catch((error) => {
        console.error("Impossible de masquer l’overlay FXMP OS", error)
      })
    }).then((unlisten) => {
      if (disposed) unlisten()
      else stopListening = unlisten
    })

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

    return () => {
      disposed = true
      stopListening?.()
      window.clearTimeout(timer)
    }
  }, [desktopRuntime])

  return null
}

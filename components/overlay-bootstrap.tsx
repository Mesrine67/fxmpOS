"use client"

import { useEffect } from "react"
import { listen } from "@tauri-apps/api/event"
import { getCurrentWindow } from "@tauri-apps/api/window"

import { useTauriRuntime } from "@/hooks/use-tauri-runtime"
import {
  readOverlayPreferences,
  writeOverlayPreferences,
} from "@/lib/overlay-settings"
import { trackedInvoke } from "@/lib/tauri"

export function OverlayBootstrap() {
  const desktopRuntime = useTauriRuntime()

  useEffect(() => {
    if (desktopRuntime !== true || getCurrentWindow().label !== "main") return

    let disposed = false
    let stopListening: (() => void) | undefined
    let stopPositionListening: (() => void) | undefined
    let positionSaveTimer: number | undefined
    let pendingPosition: {
      x: number
      y: number
      monitorId: string | null
    } | null = null
    const persistPendingPosition = () => {
      if (!pendingPosition) return
      const position = pendingPosition
      pendingPosition = null
      const current = readOverlayPreferences()
      if (
        current.positionX === position.x &&
        current.positionY === position.y &&
        current.monitorId === position.monitorId
      ) {
        return
      }
      try {
        writeOverlayPreferences({
          ...current,
          positionX: position.x,
          positionY: position.y,
          monitorId: position.monitorId ?? current.monitorId,
        })
      } catch (error) {
        console.error(
          "Impossible d’enregistrer la position de l’overlay",
          error
        )
      }
    }
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

    void listen<{ x: number; y: number; monitorId: string | null }>(
      "overlay-position-changed",
      ({ payload }) => {
        pendingPosition = payload
        window.clearTimeout(positionSaveTimer)
        positionSaveTimer = window.setTimeout(persistPendingPosition, 250)
      }
    ).then((unlisten) => {
      if (disposed) unlisten()
      else stopPositionListening = unlisten
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
      stopPositionListening?.()
      window.clearTimeout(positionSaveTimer)
      persistPendingPosition()
      window.clearTimeout(timer)
    }
  }, [desktopRuntime])

  return null
}

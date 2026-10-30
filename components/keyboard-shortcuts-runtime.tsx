"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { isTauri } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"

import {
  initializeDockShortcut,
} from "@/lib/dock-shortcut"
import {
  readOverlayPreferences,
  writeOverlayPreferences,
} from "@/lib/overlay-settings"

const navigationShortcuts: Record<string, string> = {
  "1": "/",
  "2": "/monitor/",
  "3": "/apps/",
  "4": "/account/",
  "5": "/settings/",
}

export function KeyboardShortcutsRuntime() {
  const router = useRouter()

  useEffect(() => {
    if (!isTauri() || getCurrentWindow().label !== "main") return

    void initializeDockShortcut().catch((error: unknown) => {
      console.error("Impossible d’enregistrer le raccourci du dock", error)
    })

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return
      }

      if (!event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey) {
        if (event.ctrlKey && !event.shiftKey && event.key === ",") {
          event.preventDefault()
          router.push("/settings/")
        }
        return
      }

      const key = event.key.toLowerCase()
      if (key === "k") {
        event.preventDefault()
        router.push("/shortcuts/")
        return
      }
      if (key === "o") {
        event.preventDefault()
        void readOverlayPreferences()
          .then((preferences) =>
            writeOverlayPreferences({
              ...preferences,
              enabled: !preferences.enabled,
            })
          )
          .catch((error: unknown) => {
            console.error("Impossible de basculer l’overlay", error)
          })
        return
      }

      const route = navigationShortcuts[key]
      if (route) {
        event.preventDefault()
        router.push(route)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [router])

  return null
}

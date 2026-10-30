"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { isTauri } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { invoke } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"

const allowedTrayPaths = new Set([
  "/",
  "/monitor/",
  "/apps/",
  "/account/",
  "/about/",
  "/settings/",
  "/settings/?tab=application",
  "/settings/?tab=overlay",
  "/settings/?tab=notifications",
  "/settings/?tab=theme",
  "/settings/?tab=updates",
  "/shortcuts/",
])

export function TrayNavigationListener() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname === "/settings" || pathname === "/settings/") {
      window.dispatchEvent(new Event("fxmp:settings-tab-changed"))
    }
  }, [pathname, searchParams])

  useEffect(() => {
    if (!isTauri()) return

    let unlisten: (() => void) | undefined
    let unlistenDock: (() => void) | undefined
    let cancelled = false

    if (getCurrentWindow().label !== "main") return

    void listen<string>("tray:navigate", (event) => {
      if (allowedTrayPaths.has(event.payload)) {
        router.push(event.payload)
        void invoke("activate_main_window").catch((error) => {
          console.error("Impossible de restaurer la fenêtre principale", error)
        })
      }
    }).then((stopListening) => {
      if (cancelled) stopListening()
      else unlisten = stopListening
    })

    void listen<string>("dock:navigate", (event) => {
      if (allowedTrayPaths.has(event.payload)) {
        router.push(event.payload)
        void invoke("activate_main_window").catch((error) => {
          console.error("Impossible d’ouvrir la destination du dock", error)
        })
      }
    }).then((stopListening) => {
      if (cancelled) stopListening()
      else unlistenDock = stopListening
    })

    return () => {
      cancelled = true
      unlisten?.()
      unlistenDock?.()
    }
  }, [router])

  return null
}

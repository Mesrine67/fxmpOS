"use client"

import { useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { isTauri } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"

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
    let cancelled = false

    void listen<string>("tray:navigate", (event) => {
      if (allowedTrayPaths.has(event.payload)) {
        router.push(event.payload)
      }
    }).then((stopListening) => {
      if (cancelled) stopListening()
      else unlisten = stopListening
    })

    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [router])

  return null
}

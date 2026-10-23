"use client"

import { useCallback, useEffect, useState } from "react"
import { listen } from "@tauri-apps/api/event"
import { isTauri } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { ActivityIcon, MemoryStickIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  useOverlayPreferences,
  useOverlayPreferencesReady,
  writeOverlayPreferences,
} from "@/lib/overlay-settings"
import { trackedEmit, trackedInvoke } from "@/lib/tauri"
import { useTauriRuntime } from "@/hooks/use-tauri-runtime"

type OverlaySnapshot = {
  hostname: string
  memoryTotalBytes: number
  memoryUsedBytes: number
  uptimeSeconds: number
}

function formatMemory(bytes: number) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(
    bytes / 1024 ** 3
  )} Go`
}

export function OverlayWindow() {
  const preferences = useOverlayPreferences()
  const preferencesReady = useOverlayPreferencesReady()
  const desktopRuntime = useTauriRuntime()
  const [snapshot, setSnapshot] = useState<OverlaySnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [positionSaveError, setPositionSaveError] = useState<string | null>(
    null
  )

  const refreshSnapshot = useCallback(async () => {
    try {
      const result = await trackedInvoke<OverlaySnapshot>(
        "get_overlay_snapshot"
      )
      setSnapshot(result)
      setError(null)
    } catch {
      setError("Mesures système indisponibles")
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.fxmpOverlay = "true"

    if (!isTauri()) {
      return () => {
        delete document.documentElement.dataset.fxmpOverlay
      }
    }

    let disposed = false
    let stopPositionErrorListening: (() => void) | undefined
    void listen<string>("overlay-position-save-error", ({ payload }) => {
      setPositionSaveError(payload)
    }).then((unlisten) => {
      if (disposed) unlisten()
      else stopPositionErrorListening = unlisten
    })

    return () => {
      disposed = true
      stopPositionErrorListening?.()
      delete document.documentElement.dataset.fxmpOverlay
    }
  }, [])

  useEffect(() => {
    if (!isTauri() || !preferences.enabled) return

    const initialRefresh = window.setTimeout(() => void refreshSnapshot(), 0)
    const timer = window.setInterval(() => void refreshSnapshot(), 5000)

    return () => {
      window.clearTimeout(initialRefresh)
      window.clearInterval(timer)
    }
  }, [preferences.enabled, refreshSnapshot])

  const usage = snapshot?.memoryTotalBytes
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            (snapshot.memoryUsedBytes / snapshot.memoryTotalBytes) * 100
          )
        )
      )
    : 0

  const hideOverlay = async () => {
    const next = { ...preferences, enabled: false }
    try {
      await writeOverlayPreferences(next)
      await trackedEmit("overlay-hide-requested")
    } catch {
      setError("Impossible de masquer l’overlay")
    }
  }

  return (
    <main
      className="flex h-screen w-screen items-center justify-center overflow-hidden bg-transparent p-2 text-white"
      data-fxmp-overlay-page="true"
    >
      <section
        aria-label="Overlay FXMP OS"
        className="w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-950/90 shadow-2xl backdrop-blur-xl"
        style={{ opacity: preferences.opacityPercent / 100 }}
      >
        <header
          className="flex cursor-move items-center justify-between gap-3 border-b border-white/10 px-3 py-2"
          onPointerDown={(event) => {
            if (
              event.button !== 0 ||
              preferences.clickThrough ||
              !isTauri() ||
              (event.target instanceof HTMLElement &&
                event.target.closest("button"))
            ) {
              return
            }
            void getCurrentWindow()
              .startDragging()
              .catch(() => {})
          }}
          title="Faire glisser pour déplacer"
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="rounded-md bg-red-500/15 p-1.5 text-red-300">
              <ActivityIcon aria-hidden="true" className="size-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wide">FXMP OS</p>
              <p className="truncate text-[10px] text-white/55">
                {snapshot?.hostname ?? "Monitoring local"}
              </p>
            </div>
          </div>
          <Badge className="border-white/10 bg-white/5 text-[9px] text-white/70">
            LOCAL
          </Badge>
          <button
            aria-label="Masquer l’overlay"
            className="rounded-md p-1 text-white/55 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
            disabled={preferences.clickThrough || !preferencesReady}
            onClick={() => void hideOverlay()}
            title="Masquer l’overlay"
            type="button"
          >
            <XIcon aria-hidden="true" className="size-3.5" />
          </button>
        </header>

        {(positionSaveError || error) && (
          <p
            className="px-3 pt-1 text-[9px] leading-tight text-red-300"
            role="status"
          >
            {positionSaveError || error}
          </p>
        )}

        <div className="space-y-1.5 px-3 py-2">
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-white/65">
              <MemoryStickIcon aria-hidden="true" className="size-3.5" />
              Mémoire vive
            </span>
            <span className="font-medium tabular-nums">
              {snapshot
                ? `${formatMemory(snapshot.memoryUsedBytes)} / ${formatMemory(snapshot.memoryTotalBytes)}`
                : desktopRuntime === false
                  ? "Ouvrez depuis FXMP OS"
                  : error || "Lecture…"}
            </span>
          </div>
          <div
            aria-label="Utilisation de la mémoire vive"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={usage}
            className="h-1.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-red-500 transition-[width] duration-500"
              style={{ width: `${usage}%` }}
            />
          </div>
        </div>
      </section>
    </main>
  )
}

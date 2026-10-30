"use client"

import { useEffect, useState } from "react"
import { MonitorIcon, PaletteIcon } from "lucide-react"
import { invoke } from "@tauri-apps/api/core"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useTauriRuntime } from "@/hooks/use-tauri-runtime"
import {
  DEFAULT_DOCK_MONITOR_ID,
  getDockMonitorId,
  setDockMonitorId,
} from "@/lib/dock-preferences"

export function DockAppearanceSettings() {
  const runtime = useTauriRuntime()
  const [error, setError] = useState<string | null>(null)
  const [monitors, setMonitors] = useState<{ id: string; name: string | null; width: number; height: number; primary: boolean }[]>([])
  const [monitorId, setMonitorId] = useState(DEFAULT_DOCK_MONITOR_ID)
  const [monitorSaving, setMonitorSaving] = useState(false)
  const [settingsOpening, setSettingsOpening] = useState(false)

  useEffect(() => {
    void getDockMonitorId().then(setMonitorId).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause))
    })
    if (runtime) {
      void invoke<typeof monitors>("get_display_monitors").then(setMonitors).catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause))
      })
    }
  }, [runtime])

  useEffect(() => {
    if (monitorId === DEFAULT_DOCK_MONITOR_ID || monitors.length === 0) return
    if (monitors.some((monitor) => monitor.id === monitorId)) return
    void setDockMonitorId(DEFAULT_DOCK_MONITOR_ID).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause))
    })
  }, [monitorId, monitors])

  const chooseMonitor = async (nextMonitorId: string) => {
    setMonitorSaving(true)
    setError(null)
    try {
      await setDockMonitorId(nextMonitorId)
      setMonitorId(nextMonitorId)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setMonitorSaving(false)
    }
  }
  const openNativeSettings = async () => {
    setSettingsOpening(true)
    setError(null)
    try {
      await invoke("open_dock_settings")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setSettingsOpening(false)
    }
  }
  const displayedMonitorId = monitors.some((monitor) => monitor.id === monitorId)
    ? monitorId
    : DEFAULT_DOCK_MONITOR_ID

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PaletteIcon aria-hidden="true" className="text-primary" />
          Apparence et thème
        </CardTitle>
        <CardDescription>
          Le dock s’ouvre à gauche de l’écran choisi avec le matériau Acrylic natif de Windows.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg bg-muted/40 p-4">
          <p className="text-sm font-semibold">Dock · interface native Windows</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">FXMP utilise le panneau Direct2D original de Dock. Son apparence et son matériau suivent le rendu Windows fourni par ce projet.</p>
        </div>
        <button
          className="h-9 w-fit rounded-md bg-muted px-3 text-sm font-medium hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          disabled={runtime !== true || settingsOpening}
          onClick={() => void openNativeSettings()}
          type="button"
        >
          {settingsOpening ? "Ouverture…" : "Réglages Dock"}
        </button>
        {error && <p className="mt-3 text-sm text-destructive" role="alert">{error}</p>}
      </CardContent>
      <CardContent className="flex flex-col gap-3 border-t pt-5">
        <div className="flex items-start gap-3">
          <MonitorIcon aria-hidden="true" className="mt-0.5 size-4 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Écran du dock</p>
            <p className="text-xs text-muted-foreground">Choisissez l’écran où le dock doit s’ouvrir, près du bord gauche.</p>
          </div>
          <select
            aria-label="Écran du dock"
            className="h-9 max-w-[18rem] rounded-md bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={runtime !== true || monitorSaving || monitors.length === 0}
            onChange={(event) => void chooseMonitor(event.currentTarget.value)}
            value={displayedMonitorId}
          >
            <option value={DEFAULT_DOCK_MONITOR_ID}>Écran principal</option>
            {monitors.map((monitor, index) => (
              <option key={monitor.id} value={monitor.id}>
                {monitor.name || `Écran ${index + 1}`} · {monitor.width} × {monitor.height}{monitor.primary ? " · principal" : ""}
              </option>
            ))}
          </select>
        </div>
      </CardContent>
      {error && <CardContent className="border-t pt-0"><p className="text-sm text-destructive" role="alert">{error}</p></CardContent>}
    </Card>
  )
}

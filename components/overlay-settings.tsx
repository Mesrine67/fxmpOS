"use client"

import { useCallback, useEffect, useState } from "react"
import { listen } from "@tauri-apps/api/event"
import { Layers3Icon, LoaderCircleIcon, MonitorIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useTauriRuntime } from "@/hooks/use-tauri-runtime"
import { Switch } from "@/components/ui/switch"
import {
  normalizeOverlayPreferences,
  useOverlayPreferences,
  writeOverlayPreferences,
  type OverlayAnchor,
  type OverlayPreferences,
} from "@/lib/overlay-settings"
import { trackedEmit, trackedInvoke } from "@/lib/tauri"

type DisplayMonitor = {
  id: string
  name: string | null
  positionX: number
  positionY: number
  width: number
  height: number
  scaleFactor: number
  primary: boolean
}

const anchorLabels: Record<OverlayAnchor, string> = {
  topLeft: "En haut à gauche",
  topRight: "En haut à droite",
  bottomLeft: "En bas à gauche",
  bottomRight: "En bas à droite",
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function OverlaySettings() {
  const desktopRuntime = useTauriRuntime()
  const preferences = useOverlayPreferences()
  const [monitors, setMonitors] = useState<DisplayMonitor[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMonitors = useCallback(async () => {
    try {
      setMonitors(await trackedInvoke<DisplayMonitor[]>("get_display_monitors"))
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }, [])

  useEffect(() => {
    if (desktopRuntime !== true) return

    let disposed = false
    let stopListening: (() => void) | undefined
    void listen<OverlayPreferences>("overlay-settings-changed", (event) => {
      writeOverlayPreferences(normalizeOverlayPreferences(event.payload))
    }).then((unlisten) => {
      if (disposed) unlisten()
      else stopListening = unlisten
    })

    return () => {
      disposed = true
      stopListening?.()
    }
  }, [desktopRuntime])

  useEffect(() => {
    if (desktopRuntime !== true) return

    const timer = window.setTimeout(() => void loadMonitors(), 0)
    return () => window.clearTimeout(timer)
  }, [desktopRuntime, loadMonitors])

  const applyPreferences = useCallback(
    async (next: OverlayPreferences, applyWindowState = true) => {
      setError(null)

      if (desktopRuntime === true) setSaving(true)

      try {
        if (desktopRuntime === true && applyWindowState) {
          await trackedInvoke("set_overlay_state", {
            visible: next.enabled,
            settings: next,
          })
        }
      } catch (cause) {
        setError(errorMessage(cause))
        if (desktopRuntime === true) setSaving(false)
        return
      }

      try {
        writeOverlayPreferences(next)
      } catch (cause) {
        let rollbackError: unknown
        if (desktopRuntime === true && applyWindowState) {
          try {
            await trackedInvoke("set_overlay_state", {
              visible: preferences.enabled,
              settings: preferences,
            })
          } catch (rollbackCause) {
            rollbackError = rollbackCause
          }
        }

        const persistenceMessage = `Impossible d’enregistrer les préférences : ${errorMessage(cause)}`
        setError(
          rollbackError
            ? `${persistenceMessage} La restauration de l’overlay a également échoué : ${errorMessage(rollbackError)}`
            : persistenceMessage
        )
        if (desktopRuntime === true) setSaving(false)
        return
      }

      if (desktopRuntime === true) {
        try {
          await trackedEmit("overlay-settings-changed", next)
        } catch (cause) {
          setError(errorMessage(cause))
        } finally {
          setSaving(false)
        }
      }
    },
    [desktopRuntime, preferences]
  )

  const selectedMonitorId =
    preferences.monitorId ??
    monitors.find((monitor) => monitor.primary)?.id ??
    ""

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Layers3Icon className="size-4 text-primary" />
            Overlay de monitoring
          </CardTitle>
          <CardDescription>
            Widget transparent, compact et toujours disponible au-dessus du
            bureau.
          </CardDescription>
        </div>
        <Badge variant={preferences.enabled ? "default" : "outline"}>
          {preferences.enabled ? "Activé" : "Désactivé"}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5">
        <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-4">
          <span className="space-y-1">
            <span className="block text-sm font-medium">
              Afficher l’overlay au lancement de FXMP OS
            </span>
            <span className="block text-xs text-muted-foreground">
              Ce réglage l’affiche ou le masque immédiatement et mémorise votre
              choix sur cet appareil.
            </span>
          </span>
          <Switch
            aria-label="Afficher l’overlay au lancement de FXMP OS"
            checked={preferences.enabled}
            className="mt-1"
            disabled={saving}
            onCheckedChange={(enabled) =>
              void applyPreferences({
                ...preferences,
                enabled,
              })
            }
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-4">
            <span className="space-y-1">
              <span className="block text-sm font-medium">
                Toujours au premier plan
              </span>
              <span className="block text-xs text-muted-foreground">
                Garde le widget devant les autres fenêtres.
              </span>
            </span>
            <Switch
              aria-label="Toujours au premier plan"
              checked={preferences.alwaysOnTop}
              className="mt-1"
              disabled={saving || desktopRuntime !== true}
              onCheckedChange={(alwaysOnTop) =>
                void applyPreferences({
                  ...preferences,
                  alwaysOnTop,
                })
              }
            />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-4">
            <span className="space-y-1">
              <span className="block text-sm font-medium">
                Laisser passer les clics
              </span>
              <span className="block text-xs text-muted-foreground">
                Le widget ne captera plus les clics ni le déplacement.
              </span>
            </span>
            <Switch
              aria-label="Laisser passer les clics"
              checked={preferences.clickThrough}
              className="mt-1"
              disabled={saving || desktopRuntime !== true}
              onCheckedChange={(clickThrough) =>
                void applyPreferences({
                  ...preferences,
                  clickThrough,
                })
              }
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Écran</span>
            <span className="block text-xs text-muted-foreground">
              Choisissez l’écran qui recevra l’overlay.
            </span>
            <span className="relative block">
              <MonitorIcon
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <select
                aria-label="Écran de l’overlay"
                className="h-9 w-full rounded-md border border-input bg-background py-1 pr-3 pl-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
                disabled={
                  saving || desktopRuntime !== true || monitors.length === 0
                }
                onChange={(event) =>
                  void applyPreferences({
                    ...preferences,
                    monitorId: event.currentTarget.value || null,
                    positionX: null,
                    positionY: null,
                  })
                }
                value={selectedMonitorId}
              >
                {monitors.length === 0 ? (
                  <option value="">Aucun écran détecté</option>
                ) : (
                  monitors.map((monitor, index) => (
                    <option key={monitor.id + index} value={monitor.id}>
                      {monitor.name || `Écran ${index + 1}`}
                      {monitor.primary ? " · principal" : ""} — {monitor.width}{" "}
                      × {monitor.height}
                    </option>
                  ))
                )}
              </select>
            </span>
            {monitors.length > 1 && (
              <span className="block text-xs text-muted-foreground">
                {monitors.length} écrans détectés
              </span>
            )}
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">Position</span>
            <span className="block text-xs text-muted-foreground">
              Glissez l’overlay pour choisir une position libre. Ses coordonnées
              et son écran seront restaurés au prochain lancement.
            </span>
            <select
              aria-label="Position de l’overlay"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
              disabled={saving || desktopRuntime !== true}
              onChange={(event) =>
                void applyPreferences({
                  ...preferences,
                  anchor: event.currentTarget.value as OverlayAnchor,
                  positionX: null,
                  positionY: null,
                })
              }
              value={preferences.anchor}
            >
              {Object.entries(anchorLabels).map(([anchor, label]) => (
                <option key={anchor} value={anchor}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block space-y-2 text-sm">
          <span className="flex items-center justify-between gap-4">
            <span className="font-medium">Opacité</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {preferences.opacityPercent}%
            </span>
          </span>
          <input
            aria-label="Opacité de l’overlay"
            className="w-full accent-primary"
            disabled={saving}
            max={100}
            min={35}
            onChange={(event) =>
              void applyPreferences(
                {
                  ...preferences,
                  opacityPercent: Number(event.currentTarget.value),
                },
                false
              )
            }
            type="range"
            value={preferences.opacityPercent}
          />
        </label>

        {desktopRuntime === false && (
          <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
            Les commandes de fenêtre sont disponibles dans l’application FXMP OS
            de bureau. Les préférences restent enregistrées localement.
          </p>
        )}
        {error && (
          <p
            aria-live="polite"
            className="text-xs text-destructive"
            role="status"
          >
            {error}
          </p>
        )}
        {saving && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <LoaderCircleIcon
              aria-hidden="true"
              className="size-3.5 animate-spin"
            />
            Application des réglages…
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="max-w-xl text-xs text-muted-foreground">
            L’overlay affiche des mesures locales de mémoire vive et ne capture
            pas l’écran.
          </p>
          <div className="flex gap-2">
            <Button
              disabled={
                saving || desktopRuntime !== true || !preferences.enabled
              }
              onClick={() => void loadMonitors()}
              type="button"
              variant="outline"
            >
              Actualiser les écrans
            </Button>
            <Button
              disabled={saving || desktopRuntime !== true}
              onClick={() =>
                void applyPreferences({ ...preferences, enabled: true })
              }
              type="button"
            >
              Afficher l’overlay
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

"use client"

import { useEffect, useState } from "react"
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart"
import { useTauriRuntime } from "@/hooks/use-tauri-runtime"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function AutostartSettings() {
  const desktopRuntime = useTauriRuntime()
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (desktopRuntime !== true) return
    let active = true

    void isEnabled()
      .then((value) => {
        if (active) setEnabled(value)
      })
      .catch((reason: unknown) => {
        if (active) setError(messageFrom(reason))
      })
      .finally(() => {
        if (active) setReady(true)
      })

    return () => {
      active = false
    }
  }, [desktopRuntime])

  const settingsReady = desktopRuntime === false || ready

  async function updateAutostart(nextEnabled: boolean) {
    if (pending || desktopRuntime !== true) return

    setPending(true)
    setError(null)

    try {
      if (nextEnabled) {
        await enable()
      } else {
        await disable()
      }

      setEnabled(await isEnabled())
    } catch (reason) {
      setError(messageFrom(reason))
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Lancer au démarrage de Windows</CardTitle>
          <CardDescription>
            Optionnel. FXMP OS démarrera réduit dans la zone de notification.
          </CardDescription>
        </div>
        <button
          aria-checked={enabled}
          aria-label="Lancer FXMP OS au démarrage de Windows"
          className={
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 " +
            (enabled ? "border-primary bg-primary" : "border-input bg-muted")
          }
          disabled={!settingsReady || pending || desktopRuntime !== true}
          onClick={() => void updateAutostart(!enabled)}
          role="switch"
          type="button"
        >
          <span
            className={
              "pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform " +
              (enabled ? "translate-x-5" : "translate-x-1")
            }
          />
        </button>
      </CardHeader>
      <CardContent>
        {desktopRuntime === false ? (
          <p className="text-xs text-muted-foreground">
            Ce réglage est disponible dans l’application FXMP OS.
          </p>
        ) : error ? (
          <p
            aria-live="polite"
            className="text-xs break-words text-destructive"
            role="status"
          >
            Impossible d’enregistrer ce réglage : {error}
          </p>
        ) : (
          <p
            aria-live="polite"
            className="text-xs text-muted-foreground"
            role="status"
          >
            {settingsReady
              ? enabled
                ? "Activé. Fermer la fenêtre la réduit dans la zone de notification."
                : "Désactivé. FXMP OS ne démarrera pas automatiquement."
              : "Lecture du réglage…"}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

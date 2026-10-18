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
import { Switch } from "@/components/ui/switch"

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
        <Switch
          aria-label="Lancer FXMP OS au démarrage de Windows"
          checked={enabled}
          className="mt-1"
          disabled={!settingsReady || pending || desktopRuntime !== true}
          onCheckedChange={(value) => void updateAutostart(value)}
        />
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

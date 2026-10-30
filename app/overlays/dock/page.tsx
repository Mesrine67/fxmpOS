"use client"

import { useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { AppShell } from "@/components/app-shell"
import { DockAppearanceSettings } from "@/components/dock-appearance-settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PanelsTopLeftIcon } from "lucide-react"

export default function DockOverlayPage() {
  const [error, setError] = useState<string | null>(null)
  const openDock = async () => {
    setError(null)
    try {
      await invoke("toggle_dock")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  return (
    <AppShell title="Dock FXMP OS">
      <main className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
          <header className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">FXMP OS · Overlays</p>
            <h1 className="text-2xl font-semibold tracking-tight">Dock FXMP OS</h1>
            <p className="text-sm text-muted-foreground">Ouvrez les accès rapides depuis le bord gauche de l’écran choisi.</p>
          </header>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PanelsTopLeftIcon aria-hidden="true" className="text-primary" />Accès rapide</CardTitle>
              <CardDescription>Le dock se place en bas à gauche et se ferme quand une autre fenêtre reçoit le focus.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-3">
              <Button onClick={() => void openDock()} type="button">Afficher le dock</Button>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            </CardContent>
          </Card>
          <DockAppearanceSettings />
        </div>
      </main>
    </AppShell>
  )
}

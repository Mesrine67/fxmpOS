"use client"

import { useEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { EyeIcon, MousePointer2Icon } from "lucide-react"
import { useTauriRuntime } from "@/hooks/use-tauri-runtime"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function InputViewerSettings() {
  const runtime = useTauriRuntime()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!runtime) return
    void invoke<boolean>("get_input_viewer_state").then(setVisible).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause))
    })
  }, [runtime])

  const toggle = async () => {
    setBusy(true)
    setError(null)
    try {
      await invoke("set_input_viewer_state", { visible: !visible })
      setVisible(!visible)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MousePointer2Icon aria-hidden="true" className="text-primary" />Input Viewer</CardTitle>
        <CardDescription>Affiche la position et les états actuels de la souris et du clavier dans un panneau flottant au-dessus des jeux.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={runtime !== true || busy} onClick={() => void toggle()} type="button" variant={visible ? "secondary" : "default"}>
            <EyeIcon aria-hidden="true" />{visible ? "Masquer Input Viewer" : "Afficher Input Viewer"}
          </Button>
          <span className="text-sm text-muted-foreground">{visible ? "Actif" : "Masqué"}</span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          L’overlay lit uniquement les touches et boutons actuellement maintenus, la position du curseur et la molette. Il ne conserve ni l’historique des touches ni le texte saisi. La forme du curseur personnalisée dessinée par un jeu n’est pas accessible à Windows.
        </p>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      </CardContent>
    </Card>
  )
}

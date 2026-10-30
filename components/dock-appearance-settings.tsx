"use client"

import { useEffect, useState } from "react"
import { PaletteIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useTauriRuntime } from "@/hooks/use-tauri-runtime"
import {
  DEFAULT_DOCK_THEME,
  getDockTheme,
  setDockTheme,
  type DockTheme,
} from "@/lib/dock-preferences"

const themes: { value: DockTheme; name: string; description: string }[] = [
  { value: "windows", name: "Windows", description: "Panneau Acrylic et grille d’accès rapide comme dans votre référence Doludock." },
  { value: "fxmp", name: "FXMP", description: "Panneau sombre avec une bordure rouge FXMP OS." },
  { value: "light", name: "Clair", description: "Panneau clair translucide assorti au thème clair de Windows." },
]

export function DockAppearanceSettings() {
  const runtime = useTauriRuntime()
  const [theme, setTheme] = useState<DockTheme>(DEFAULT_DOCK_THEME)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getDockTheme().then(setTheme).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause))
    })
  }, [])

  const chooseTheme = async (nextTheme: DockTheme) => {
    setSaving(true)
    setError(null)
    try {
      await setDockTheme(nextTheme)
      setTheme(nextTheme)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PaletteIcon aria-hidden="true" className="text-primary" />
          Apparence et thème
        </CardTitle>
        <CardDescription>
          Le dock utilise le matériau Acrylic natif de Windows et mémorise le thème choisi sur cet appareil.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {themes.map((option) => (
          <button
            key={option.value}
            aria-pressed={theme === option.value}
            className={`flex min-h-32 flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${theme === option.value ? "border-primary bg-primary/5" : "bg-card"}`}
            disabled={runtime !== true || saving}
            onClick={() => void chooseTheme(option.value)}
            type="button"
          >
            <span className="text-sm font-semibold">{option.name}{option.value === "windows" ? " · recommandé" : ""}</span>
            <span className="text-xs leading-relaxed text-muted-foreground">{option.description}</span>
          </button>
        ))}
        {error && <p className="text-sm text-destructive sm:col-span-3" role="alert">{error}</p>}
      </CardContent>
    </Card>
  )
}

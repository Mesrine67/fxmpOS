"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { FolderOpen, Keyboard, LayoutGrid, Monitor, Palette, Save, Settings2, SlidersHorizontal, Eye, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useTauriRuntime } from "@/hooks/use-tauri-runtime"
import {
  DEFAULT_DOCK_MONITOR_ID,
  getDockMonitorId,
  setDockMonitorId,
} from "@/lib/dock-preferences"
import {
  DEFAULT_DOCK_SETTINGS,
  getNativeDockSettings,
  saveNativeDockSettings,
  type DockSettings,
} from "@/lib/dock-native-settings"
import { getDockShortcut } from "@/lib/dock-shortcut"

type Display = { id: string; name: string | null; width: number; height: number; primary: boolean }

function ToggleSetting({ label, detail, checked, onChange, disabled }: {
  label: string; detail?: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean
}) {
  return <div className="flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-muted/15 px-3 py-2.5">
    <div className="min-w-0">
      <div className="text-sm font-medium">{label}</div>
      {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
    </div>
    <Switch aria-label={label} checked={checked} onCheckedChange={onChange} disabled={disabled} />
  </div>
}

function RangeSetting({ label, value, min, max, unit = "", onChange, disabled }: {
  label: string; value: number; min: number; max: number; unit?: string;
  onChange: (value: number) => void; disabled?: boolean
}) {
  return <label className="block space-y-2 rounded-lg border border-border/50 bg-muted/15 px-3 py-3">
    <span className="flex items-center justify-between gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">{value}{unit}</span>
    </span>
    <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.currentTarget.value))}
      disabled={disabled} className="h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50" />
  </label>
}

export function DockAppearanceSettings() {
  const runtime = useTauriRuntime()
  const [settings, setSettings] = useState<DockSettings>(DEFAULT_DOCK_SETTINGS)
  const [original, setOriginal] = useState<DockSettings>(DEFAULT_DOCK_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [picking, setPicking] = useState(false)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [monitorId, setMonitorId] = useState(DEFAULT_DOCK_MONITOR_ID)
  const [monitors, setMonitors] = useState<Display[]>([])
  const [shortcut, setShortcut] = useState("")

  useEffect(() => {
    if (runtime !== true) return
    let alive = true
    const load = async () => {
      try {
        const [native, monitor, screens, keys] = await Promise.all([
          getNativeDockSettings(),
          getDockMonitorId(),
          invoke<Display[]>("get_display_monitors"),
          getDockShortcut(),
        ])
        if (!alive) return
        setSettings(native)
        setOriginal(native)
        setMonitorId(monitor)
        setMonitors(screens)
        setShortcut(keys)
        setLoaded(true)
      } catch (cause) {
        if (alive) setError(cause instanceof Error ? cause.message : String(cause))
      }
    }
    void load()
    return () => { alive = false }
  }, [runtime])

  const usable = runtime === true && loaded && !saving
  const changed = JSON.stringify(settings) !== JSON.stringify(original)
  const update = <K extends keyof DockSettings>(key: K, value: DockSettings[K]) => {
    setSettings(previous => ({ ...previous, [key]: value }))
    setNotice(null)
    setError(null)
  }

  const chooseFolder = async () => {
    setPicking(true)
    setError(null)
    try {
      const result = await open({ directory: true, multiple: false, defaultPath: settings.folder || undefined })
      if (typeof result === "string") update("folder", result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setPicking(false)
    }
  }

  const chooseMonitor = async (id: string) => {
    const previous = monitorId
    setMonitorId(id)
    setError(null)
    try {
      await setDockMonitorId(id)
      await invoke("plugin:dock|set_monitor", { monitorId: id })
    } catch (cause) {
      setMonitorId(previous)
      await setDockMonitorId(previous).catch(() => undefined)
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const save = async (): Promise<boolean> => {
    setSaving(true)
    setNotice(null)
    setError(null)
    try {
      await saveNativeDockSettings(settings)
      setOriginal(settings)
      setNotice("Réglages enregistrés et envoyés au Dock.")
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      return false
    } finally {
      setSaving(false)
    }
  }
  const preview = async () => {
    setPreviewBusy(true)
    setError(null)
    try {
      if (changed && !(await save())) return
      await invoke("toggle_dock")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setPreviewBusy(false)
    }
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Settings2 className="size-5 text-primary" /> Configuration du Dock</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tous les réglages sont directement dans FXMP OS et synchronisés avec le moteur natif.</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" disabled={!usable || previewBusy} onClick={() => void preview()}><Eye className="size-4" /> Aperçu</Button>
        <Button disabled={!usable || !changed} onClick={() => void save()}><Save className="size-4" /> {saving ? "Enregistrement…" : "Appliquer"}</Button>
      </div>
    </div>
    {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">{notice}</p>}
    {runtime !== true && <p className="text-xs text-muted-foreground">Les réglages natifs sont accessibles dans l’application Windows.</p>}
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><FolderOpen className="size-4 text-primary" /> Dossier</CardTitle>
            <CardDescription>Le contenu affiché dans le panneau, avec les icônes Windows d’origine.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input aria-label="Chemin du dossier" value={settings.folder} disabled={!usable}
                placeholder="Bureau Windows par défaut" onChange={event => update("folder", event.currentTarget.value)} />
              <Button variant="outline" disabled={!usable || picking} onClick={() => void chooseFolder()}>
                Parcourir…
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Laissez vide pour conserver le Bureau par défaut au premier lancement.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><Keyboard className="size-4 text-primary" /> Raccourci</CardTitle>
            <CardDescription>FXMP OS gère le raccourci global, sans second hook clavier.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/35 p-3">
              <span className="font-mono text-xs">{shortcut || "Ctrl + Shift + Espace"}</span>
              <Button size="sm" variant="outline" render={<Link href="/shortcuts" />}>Modifier</Button>
            </div>
            <ToggleSetting label="Mode bascule" detail="Activé : appuyer pour ouvrir/fermer. Désactivé : maintenir pour afficher."
              checked={settings.toggleMode} onChange={v => update("toggleMode", v)} disabled={!usable} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><LayoutGrid className="size-4 text-primary" /> Disposition</CardTitle>
            <CardDescription>Nombre d’éléments et espacement du panneau.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {(["gridColumns", "gridRows"] as const).map((field) => <label key={field} className="space-y-1.5 text-xs font-medium">
                {field === "gridColumns" ? "Colonnes" : "Lignes"}
                <select aria-label={field === "gridColumns" ? "Colonnes" : "Lignes"} disabled={!usable}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={settings[field]} onChange={event => update(field, Number(event.target.value))}>
                  <option value={0}>Automatique</option>
                  {Array.from({ length: 10 }, (_, index) => index + 1).map(n => <option value={n} key={n}>{n}</option>)}
                </select>
              </label>)}
            </div>
            <RangeSetting label="Marge intérieure" min={0} max={60} unit=" px" value={settings.padding}
              onChange={v => update("padding", v)} disabled={!usable} />
            <ToggleSetting label="Centrer le curseur à l’ouverture" checked={settings.centerCursor}
              onChange={v => update("centerCursor", v)} disabled={!usable} />
            <ToggleSetting label="Afficher le nom du dossier" checked={settings.showFolderName}
              onChange={v => update("showFolderName", v)} disabled={!usable} />
            <ToggleSetting label="Afficher le nombre d’éléments" checked={settings.showItemCount}
              onChange={v => update("showItemCount", v)} disabled={!usable} />
          </CardContent>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><Monitor className="size-4 text-primary" /> Position et écran</CardTitle>
            <CardDescription>Le Dock peut s’ouvrir sur l’écran de ton choix, y compris avec des DPI différents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block space-y-1.5 text-xs font-medium">Écran cible
              <select value={monitors.some(m => m.id === monitorId) ? monitorId : DEFAULT_DOCK_MONITOR_ID}
                onChange={event => void chooseMonitor(event.target.value)} disabled={!usable}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="primary">Écran principal</option>
                {monitors.map((m, i) => <option key={m.id} value={m.id}>
                  {m.name || `Écran ${i + 1}`} · {m.width} × {m.height}{m.primary ? " · principal" : ""}
                </option>)}
              </select>
            </label>
            <RangeSetting label="Décalage horizontal" min={-1000} max={1000} unit=" px" value={settings.offsetX}
              onChange={v => update("offsetX", v)} disabled={!usable} />
            <RangeSetting label="Décalage vertical" min={-1000} max={1000} unit=" px" value={settings.offsetY}
              onChange={v => update("offsetY", v)} disabled={!usable} />
            <Button size="sm" variant="outline" disabled={!usable} onClick={() => {
              update("offsetX", 0); update("offsetY", 0)
            }}><RotateCcw className="size-4" /> Réinitialiser la position</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><Palette className="size-4 text-primary" /> Apparence</CardTitle>
            <CardDescription>Rendu Direct2D et matériau Windows conservés.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block space-y-1.5 text-xs font-medium">Arrière-plan
              <select value={settings.backdrop} disabled={!usable} onChange={event => update("backdrop", event.target.value as DockSettings["backdrop"])}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="acrylic">Acrylic (flou Windows)</option>
                <option value="solid">Couleur unie</option>
              </select>
            </label>
            <RangeSetting label="Opacité" min={10} max={100} unit=" %" value={settings.opacity}
              onChange={v => update("opacity", v)} disabled={!usable} />
            <ToggleSetting label="Coins arrondis" checked={settings.roundedCorners}
              onChange={v => update("roundedCorners", v)} disabled={!usable} />
            <ToggleSetting label="Animations d’apparition et disparition" checked={settings.animations}
              onChange={v => update("animations", v)} disabled={!usable} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm"><SlidersHorizontal className="size-4 text-primary" /> Intégration système</CardTitle>
          </CardHeader>
          <CardContent className="text-xs leading-relaxed text-muted-foreground">
            Le démarrage avec Windows et les mises à jour sont gérés par FXMP OS.
            Le plugin partage la configuration existante du Dock sans ouvrir sa fenêtre de réglages externe.
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
}

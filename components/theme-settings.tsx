"use client"

import { CheckIcon, RotateCcwIcon, SparklesIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DEFAULT_THEME_PREFERENCES, writeThemePreferences, type ThemeAccent, type ThemeBase, type ThemeFont, type ThemeMode, type ThemePreferences, type ThemeStyle, useThemePreferences } from "@/lib/theme-preferences"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

function PreferenceSelect<T extends string>({ id, label, value, items, onChange }: {
  id: string
  label: string
  value: T
  items: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(next) => { if (next) onChange(next as T) }}>
        <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {items.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

const fontOptions: Array<{ value: ThemeFont; label: string }> = [
  { value: "geist-mono", label: "Geist Mono" },
  { value: "geist", label: "Geist" },
  { value: "inter", label: "Inter (si installé)" },
  { value: "system", label: "Police système Windows" },
]
const accents: Array<{ value: ThemeAccent; label: string; color: string }> = [
  { value: "red", label: "Rouge FXMP", color: "#d21f2b" },
  { value: "blue", label: "Bleu", color: "#2563eb" },
  { value: "green", label: "Vert", color: "#16a34a" },
  { value: "violet", label: "Violet", color: "#7c3aed" },
  { value: "amber", label: "Ambre", color: "#d97706" },
]

export function ThemeSettings() {
  const preferences = useThemePreferences()

  async function update(update: Partial<ThemePreferences>) {
    try {
      await writeThemePreferences(update)
    } catch (error) {
      toast.error("Impossible d’enregistrer le thème", { description: error instanceof Error ? error.message : String(error) })
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2"><SparklesIcon className="size-4 text-primary" />Personnalisation du thème</CardTitle>
            <CardDescription>Les choix sont appliqués immédiatement et synchronisés entre les fenêtres FXMP OS.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void update(DEFAULT_THEME_PREFERENCES)}><RotateCcwIcon />Réinitialiser</Button>
        </CardHeader>
        <CardContent className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
          <PreferenceSelect<ThemeMode> id="fxmp-theme-mode" label="Apparence" value={preferences.mode} onChange={(mode) => void update({ mode })} items={[
            { value: "system", label: "Suivre Windows" }, { value: "light", label: "Clair" }, { value: "dark", label: "Sombre" },
          ]} />
          <PreferenceSelect<ThemeStyle> id="fxmp-theme-style" label="Style shadcn" value={preferences.style} onChange={(style) => void update({ style })} items={[
            { value: "mira", label: "Mira · sobre" }, { value: "nova", label: "Nova · cartes avec relief" },
          ]} />
          <PreferenceSelect<ThemeBase> id="fxmp-theme-base" label="Base neutre" value={preferences.base} onChange={(base) => void update({ base })} items={[
            { value: "neutral", label: "Neutral" }, { value: "zinc", label: "Zinc" }, { value: "slate", label: "Slate" }, { value: "stone", label: "Stone" },
          ]} />
          <PreferenceSelect<ThemeAccent> id="fxmp-theme-accent" label="Couleur principale" value={preferences.accent} onChange={(accent) => void update({ accent })} items={accents.map(({ value, label }) => ({ value, label }))} />
          <PreferenceSelect<ThemeAccent> id="fxmp-theme-chart" label="Couleurs des graphiques" value={preferences.chart} onChange={(chart) => void update({ chart })} items={accents.map(({ value, label }) => ({ value, label }))} />
          <PreferenceSelect<ThemeFont> id="fxmp-theme-font" label="Police de l’interface" value={preferences.font} onChange={(font) => void update({ font })} items={fontOptions} />
          <PreferenceSelect<ThemeFont> id="fxmp-theme-heading" label="Police des titres" value={preferences.heading} onChange={(heading) => void update({ heading })} items={fontOptions} />
          <PreferenceSelect<string> id="fxmp-theme-radius" label="Arrondi des composants" value={String(preferences.radius)} onChange={(radius) => void update({ radius: Number(radius) })} items={[
            { value: "0.25", label: "Serré · 4 px" }, { value: "0.45", label: "Compact · 7 px" }, { value: "0.65", label: "Doux · 10 px" }, { value: "0.85", label: "Arrondi · 14 px" },
          ]} />
          <div className="grid gap-2 sm:col-span-2">
            <Label>Bibliothèque d’icônes</Label>
            <div className="flex min-h-9 items-center justify-between rounded-md border bg-muted/20 px-3 text-sm">
              <span>Lucide</span><Badge variant="secondary">Utilisée dans l’application</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Aperçu en direct</CardTitle>
          <CardDescription>Les composants shadcn de FXMP OS suivent les mêmes tokens.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-xl border bg-background p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1"><p className="font-heading font-semibold">Centre de contrôle</p><p className="text-xs text-muted-foreground">Apparence FXMP OS</p></div>
              <Badge><CheckIcon data-icon="inline-start" />Actif</Badge>
            </div>
            <div className="mt-5 flex items-end gap-1.5" aria-label={`Aperçu des couleurs ${preferences.chart}`}>
              {accents.find((item) => item.value === preferences.chart) && [0.45, 0.7, 0.55, 0.9, 0.65, 1].map((height, index) => (
                <span key={index} className={cn("flex-1 rounded-t-sm", ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4"][index % 4])} style={{ height: `${Math.round(height * 52)}px`, opacity: 1 - index * 0.06 }} />
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Mémoire utilisée · aperçu des graphiques</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {accents.map((accent) => <button key={accent.value} type="button" aria-label={`Choisir ${accent.label}`} aria-pressed={preferences.accent === accent.value} className="size-7 rounded-full border-2 border-background outline outline-1 outline-border transition-transform hover:scale-110 aria-pressed:scale-110 aria-pressed:outline-primary" style={{ backgroundColor: accent.color }} onClick={() => void update({ accent: accent.value })} />)}
          </div>
          <div className="rounded-md border p-3 text-xs text-muted-foreground">
            Nova ajoute un relief discret aux cartes. Le choix d’icônes reste Lucide tant qu’aucune autre bibliothèque n’est embarquée.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

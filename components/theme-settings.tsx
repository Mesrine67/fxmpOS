"use client"

import { CheckIcon, RotateCcwIcon, SparklesIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DEFAULT_THEME_PREFERENCES, writeThemePreferences, type ThemeAccent, type ThemeBase, type ThemeFont, type ThemeMode, type ThemePreferences, type ThemeStyle, useThemePreferences } from "@/lib/theme-preferences"
import { THEME_ACCENTS, THEME_BASES, THEME_STYLES } from "@/lib/theme-palettes"
import { toast } from "sonner"

function PreferenceSelect<T extends string>({ id, label, value, items, onChange }: {
  id: string
  label: string
  value: T
  items: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="grid content-start gap-2">
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
  { value: "inter", label: "Inter" },
  { value: "system", label: "Segoe UI · système Windows" },
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
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2"><SparklesIcon className="size-4 text-primary" />Personnalisation du thème</CardTitle>
            <CardDescription>Les options agissent sur les composants shadcn de l’application et sont synchronisées entre ses fenêtres.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void update(DEFAULT_THEME_PREFERENCES)}><RotateCcwIcon />Réinitialiser</Button>
        </CardHeader>
        <CardContent className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
          <PreferenceSelect<ThemeMode> id="fxmp-theme-mode" label="Apparence" value={preferences.mode} onChange={(mode) => void update({ mode })} items={[
            { value: "system", label: "Suivre Windows" }, { value: "light", label: "Clair" }, { value: "dark", label: "Sombre" },
          ]} />
          <PreferenceSelect<ThemeStyle> id="fxmp-theme-style" label="Style shadcn" value={preferences.style} onChange={(style) => void update({ style })} items={THEME_STYLES.map(({ value, label, description }) => ({ value, label: `${label} · ${description}` }))} />
          <PreferenceSelect<ThemeBase> id="fxmp-theme-base" label="Couleur de base" value={preferences.base} onChange={(base) => void update({ base })} items={THEME_BASES.map(({ value, label }) => ({ value, label }))} />
          <PreferenceSelect<ThemeAccent> id="fxmp-theme-chart" label="Couleur des graphiques" value={preferences.chart} onChange={(chart) => void update({ chart })} items={THEME_ACCENTS.map(({ value, label }) => ({ value, label }))} />

          <div className="grid gap-2 sm:col-span-2">
            <Label>Thème de couleur</Label>
            <p className="text-xs text-muted-foreground">La couleur choisie s’applique aux actions, états actifs, bordures de focus et icônes accentuées.</p>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-9 lg:grid-cols-[repeat(9,minmax(0,1fr))]" role="group" aria-label="Palette de thème">
              {THEME_ACCENTS.map((accent) => (
                <button
                  key={accent.value}
                  type="button"
                  aria-label={`Choisir le thème ${accent.label}`}
                  aria-pressed={preferences.accent === accent.value}
                  title={accent.label}
                  className="group/color flex min-w-0 flex-col items-center gap-1.5 rounded-md p-1.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted aria-pressed:bg-muted aria-pressed:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  onClick={() => void update({ accent: accent.value })}
                >
                  <span className="grid size-6 place-items-center rounded-full ring-1 ring-border" style={{ backgroundColor: accent.color }}>
                    {preferences.accent === accent.value ? <CheckIcon className="size-3.5 text-white drop-shadow" /> : null}
                  </span>
                  <span className="w-full truncate text-center">{accent.label.replace(" · FXMP", "")}</span>
                </button>
              ))}
            </div>
          </div>

          <PreferenceSelect<ThemeFont> id="fxmp-theme-font" label="Police de l’interface" value={preferences.font} onChange={(font) => void update({ font })} items={fontOptions} />
          <PreferenceSelect<ThemeFont> id="fxmp-theme-heading" label="Police des titres" value={preferences.heading} onChange={(heading) => void update({ heading })} items={fontOptions} />
          <PreferenceSelect<string> id="fxmp-theme-radius" label="Arrondi des composants" value={String(preferences.radius)} onChange={(radius) => void update({ radius: Number(radius) })} items={[
            { value: "0.25", label: "Serré · 4 px" }, { value: "0.45", label: "Compact · 7 px" }, { value: "0.65", label: "Doux · 10 px" }, { value: "0.85", label: "Arrondi · 14 px" },
          ]} />
          <div className="grid gap-2">
            <Label>Bibliothèque d’icônes</Label>
            <div className="flex min-h-9 items-center justify-between rounded-md border bg-muted/20 px-3 text-sm">
              <span>Lucide</span><Badge variant="secondary">Active dans FXMP OS</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Aperçu en direct</CardTitle>
          <CardDescription>Les mêmes composants et tokens sont utilisés dans l’application.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-xl border bg-background p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1"><p className="font-heading font-semibold">Centre de contrôle</p><p className="text-xs text-muted-foreground">Windows · appareil local</p></div>
              <Badge><CheckIcon data-icon="inline-start" />Actif</Badge>
            </div>
            <div className="mt-4 rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Mémoire vive</span><span className="font-medium">72 %</span></div>
              <div className="mt-2 flex h-14 items-end gap-1" aria-label={`Aperçu des graphiques ${preferences.chart}`}>
                {[0.45, 0.72, 0.55, 0.92, 0.64, 0.8, 0.48, 0.7].map((height, index) => (
                  <span key={index} className={`flex-1 rounded-t-sm bg-chart-${(index % 5) + 1}`} style={{ height: `${Math.round(height * 56)}px`, opacity: 1 - index * 0.055 }} />
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm">Action principale</Button>
              <Button size="sm" variant="outline">Secondaire</Button>
              <Badge variant="secondary">{THEME_STYLES.find((style) => style.value === preferences.style)?.label}</Badge>
            </div>
          </div>
          <div className="rounded-md border p-3 text-xs text-muted-foreground">
            Le style {THEME_STYLES.find((style) => style.value === preferences.style)?.label} modifie le relief et la densité des composants. La bibliothèque Lucide est embarquée; aucune autre bibliothèque n’est installée.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

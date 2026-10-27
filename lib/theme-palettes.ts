import type { ThemeAccent, ThemeBase, ThemeMode } from "@/lib/theme-preferences"

export const THEME_ACCENTS: Array<{ value: ThemeAccent; label: string; color: string; hue: number; chroma: number }> = [
  { value: "neutral", label: "Neutral", color: "#737373", hue: 0, chroma: 0 },
  { value: "amber", label: "Amber", color: "#d97706", hue: 68, chroma: 0.18 },
  { value: "blue", label: "Blue", color: "#2563eb", hue: 258, chroma: 0.22 },
  { value: "cyan", label: "Cyan", color: "#0891b2", hue: 210, chroma: 0.14 },
  { value: "emerald", label: "Emerald", color: "#059669", hue: 165, chroma: 0.15 },
  { value: "fuchsia", label: "Fuchsia", color: "#c026d3", hue: 325, chroma: 0.22 },
  { value: "green", label: "Green", color: "#16a34a", hue: 145, chroma: 0.16 },
  { value: "indigo", label: "Indigo", color: "#4f46e5", hue: 275, chroma: 0.2 },
  { value: "lime", label: "Lime", color: "#65a30d", hue: 125, chroma: 0.16 },
  { value: "orange", label: "Orange", color: "#ea580c", hue: 42, chroma: 0.19 },
  { value: "pink", label: "Pink", color: "#db2777", hue: 350, chroma: 0.19 },
  { value: "purple", label: "Purple", color: "#9333ea", hue: 300, chroma: 0.21 },
  { value: "red", label: "Red · FXMP", color: "#d21f2b", hue: 27, chroma: 0.2 },
  { value: "rose", label: "Rose", color: "#e11d48", hue: 8, chroma: 0.2 },
  { value: "sky", label: "Sky", color: "#0284c7", hue: 230, chroma: 0.16 },
  { value: "teal", label: "Teal", color: "#0d9488", hue: 180, chroma: 0.14 },
  { value: "violet", label: "Violet", color: "#7c3aed", hue: 295, chroma: 0.21 },
  { value: "yellow", label: "Yellow", color: "#ca8a04", hue: 92, chroma: 0.16 },
]

export const THEME_BASES: Array<{ value: ThemeBase; label: string; hue: number; chroma: number }> = [
  { value: "neutral", label: "Neutral", hue: 260, chroma: 0.004 },
  { value: "stone", label: "Stone", hue: 55, chroma: 0.008 },
  { value: "zinc", label: "Zinc", hue: 285, chroma: 0.006 },
  { value: "mauve", label: "Mauve", hue: 305, chroma: 0.012 },
  { value: "olive", label: "Olive", hue: 115, chroma: 0.012 },
  { value: "mist", label: "Mist", hue: 220, chroma: 0.01 },
  { value: "taupe", label: "Taupe", hue: 75, chroma: 0.01 },
  { value: "slate", label: "Slate · compatibilité", hue: 255, chroma: 0.015 },
]

export const THEME_STYLES = [
  { value: "vega", label: "Vega", description: "Net et compact" },
  { value: "nova", label: "Nova", description: "Cartes avec relief" },
  { value: "maia", label: "Maia", description: "Surfaces douces" },
  { value: "lyra", label: "Lyra", description: "Commandes compactes" },
  { value: "mira", label: "Mira", description: "Sobre et équilibré" },
  { value: "luma", label: "Luma", description: "Léger et lumineux" },
  { value: "sera", label: "Sera", description: "Surfaces marquées" },
  { value: "rhea", label: "Rhea", description: "Contraste renforcé" },
] as const

const accentByValue = Object.fromEntries(THEME_ACCENTS.map((item) => [item.value, item])) as Record<ThemeAccent, (typeof THEME_ACCENTS)[number]>
const baseByValue = Object.fromEntries(THEME_BASES.map((item) => [item.value, item])) as Record<ThemeBase, (typeof THEME_BASES)[number]>

function oklch(lightness: number, chroma: number, hue: number) {
  return `oklch(${lightness} ${chroma} ${hue})`
}

export function getThemeCssVariables({ mode, accent, chart, base }: {
  mode: ThemeMode
  accent: ThemeAccent
  chart: ThemeAccent
  base: ThemeBase
}) {
  const dark = mode === "dark" || (mode === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  const surface = baseByValue[base]
  const accentPalette = accentByValue[accent]
  const chartPalette = accentByValue[chart]
  const background = dark ? 0.135 : 0.985
  const foreground = dark ? 0.97 : 0.17
  const card = dark ? 0.205 : 1
  const muted = dark ? 0.255 : 0.955
  const border = dark ? 0.34 : 0.9
  const mainL = dark ? 0.72 : 0.54
  const mainC = accentPalette.chroma * (dark ? 0.86 : 1)
  const mainHue = accentPalette.hue
  const variables: Record<string, string> = {
    "--background": oklch(background, surface.chroma, surface.hue),
    "--foreground": oklch(foreground, surface.chroma, surface.hue),
    "--card": oklch(card, surface.chroma, surface.hue),
    "--card-foreground": oklch(foreground, surface.chroma, surface.hue),
    "--popover": oklch(dark ? 0.22 : 1, surface.chroma, surface.hue),
    "--popover-foreground": oklch(foreground, surface.chroma, surface.hue),
    "--secondary": oklch(muted, surface.chroma, surface.hue),
    "--secondary-foreground": oklch(foreground, surface.chroma, surface.hue),
    "--muted": oklch(muted, surface.chroma, surface.hue),
    "--muted-foreground": oklch(dark ? 0.72 : 0.52, surface.chroma, surface.hue),
    "--accent": oklch(muted, surface.chroma, surface.hue),
    "--accent-foreground": oklch(foreground, surface.chroma, surface.hue),
    "--border": oklch(border, surface.chroma, surface.hue),
    "--input": oklch(dark ? 0.31 : 0.88, surface.chroma, surface.hue),
    "--primary": oklch(mainL, mainC, mainHue),
    "--primary-foreground": dark ? oklch(0.16, 0.02, mainHue) : oklch(0.99, 0.004, mainHue),
    "--ring": oklch(mainL, mainC, mainHue),
    "--sidebar": oklch(dark ? 0.17 : 0.975, surface.chroma, surface.hue),
    "--sidebar-foreground": oklch(foreground, surface.chroma, surface.hue),
    "--sidebar-primary": oklch(mainL, mainC, mainHue),
    "--sidebar-primary-foreground": dark ? oklch(0.16, 0.02, mainHue) : oklch(0.99, 0.004, mainHue),
    "--sidebar-accent": oklch(muted, surface.chroma, surface.hue),
    "--sidebar-accent-foreground": oklch(foreground, surface.chroma, surface.hue),
    "--sidebar-border": oklch(border, surface.chroma, surface.hue),
    "--sidebar-ring": oklch(mainL, mainC, mainHue),
  }
  const chartLevels = dark ? [0.82, 0.74, 0.66, 0.58, 0.5] : [0.72, 0.63, 0.54, 0.46, 0.38]
  chartLevels.forEach((lightness, index) => {
    variables[`--chart-${index + 1}`] = oklch(lightness, chartPalette.chroma * (0.56 + index * 0.11), chartPalette.hue)
  })
  return variables
}

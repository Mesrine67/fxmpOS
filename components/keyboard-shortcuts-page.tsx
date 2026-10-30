"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { KeyboardEvent as ReactKeyboardEvent } from "react"
import { invoke, isTauri } from "@tauri-apps/api/core"
import {
  ActivityIcon,
  AppWindowIcon,
  CommandIcon,
  KeyboardIcon,
  MonitorIcon,
  SearchIcon,
  Settings2Icon,
  SparklesIcon,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useTauriRuntime } from "@/hooks/use-tauri-runtime"
import {
  DEFAULT_DOCK_SHORTCUT,
  getDockShortcut,
  isDockShortcutReserved,
  pauseDockShortcut,
  resumeDockShortcut,
  updateDockShortcut,
} from "@/lib/dock-shortcut"

type ShortcutRow = {
  category: string
  action: string
  description: string
  keys: string
}

const shortcuts: ShortcutRow[] = [
  { category: "Navigation", action: "Vue d’ensemble", description: "Afficher le centre de contrôle", keys: "Ctrl + Maj + 1" },
  { category: "Navigation", action: "Ressources", description: "Ouvrir le moniteur système", keys: "Ctrl + Maj + 2" },
  { category: "Navigation", action: "Applications", description: "Afficher les applications installées", keys: "Ctrl + Maj + 3" },
  { category: "Navigation", action: "Appareil", description: "Afficher les informations du PC", keys: "Ctrl + Maj + 4" },
  { category: "Navigation", action: "Paramètres", description: "Ouvrir les paramètres FXMP OS", keys: "Ctrl + ," },
  { category: "Navigation", action: "Raccourcis clavier", description: "Afficher cette page", keys: "Ctrl + Maj + K" },
  { category: "Fenêtres", action: "Afficher ou masquer le dock", description: "Ouvrir le dock depuis n’importe quelle application", keys: "Global" },
  { category: "Fenêtres", action: "Afficher ou masquer l’overlay", description: "Basculer l’overlay de monitoring", keys: "Ctrl + Maj + O" },
  { category: "Fenêtres", action: "Fermer le dock", description: "Masquer le dock ouvert", keys: "Échap" },
]

function displayShortcut(shortcut: string) {
  return shortcut
    .replaceAll("CommandOrControl", "Ctrl")
    .replaceAll("Space", "Espace")
    .replaceAll("+", " + ")
}

function keyCodeName(code: string) {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  if (/^F([1-9]|1[0-2])$/.test(code)) return code
  const names: Record<string, string> = {
    Space: "Space",
    Enter: "Enter",
    Tab: "Tab",
    Escape: "Escape",
    Backspace: "Backspace",
    Delete: "Delete",
    Home: "Home",
    End: "End",
    PageUp: "PageUp",
    PageDown: "PageDown",
    ArrowUp: "ArrowUp",
    ArrowDown: "ArrowDown",
    ArrowLeft: "ArrowLeft",
    ArrowRight: "ArrowRight",
  }
  return names[code]
}

function shortcutFromEvent(event: ReactKeyboardEvent<HTMLButtonElement>) {
  const key = keyCodeName(event.code)
  if (!key || !(event.ctrlKey || event.metaKey || event.altKey)) return null

  const modifiers = [
    event.ctrlKey || event.metaKey ? "CommandOrControl" : null,
    event.altKey ? "Alt" : null,
    event.shiftKey ? "Shift" : null,
  ].filter(Boolean)

  return [...modifiers, key].join("+")
}

export function KeyboardShortcutsPage() {
  const desktopRuntime = useTauriRuntime()
  const [query, setQuery] = useState("")
  const [shortcut, setShortcut] = useState(DEFAULT_DOCK_SHORTCUT)
  const [capturing, setCapturing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const capturePaused = useRef(false)

  useEffect(() => {
    void getDockShortcut().then(setShortcut).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause))
    })
  }, [])

  useEffect(() => {
    const onShortcutChanged = (event: Event) => {
      const customEvent = event as CustomEvent<string>
      setShortcut(customEvent.detail)
    }
    window.addEventListener("fxmp:dock-shortcut-changed", onShortcutChanged)
    return () => window.removeEventListener("fxmp:dock-shortcut-changed", onShortcutChanged)
  }, [])

  const filteredShortcuts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr-FR")
    return shortcuts.filter((item) => {
      const keys = item.action === "Afficher ou masquer le dock"
        ? displayShortcut(shortcut)
        : item.keys
      return !normalizedQuery ||
        `${item.category} ${item.action} ${item.description} ${keys}`
          .toLocaleLowerCase("fr-FR")
          .includes(normalizedQuery)
    })
  }, [query, shortcut])

  const saveShortcut = async (nextShortcut: string) => {
    if (isDockShortcutReserved(nextShortcut)) {
      setError("Cette combinaison est déjà utilisée par une action FXMP OS.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const savedShortcut = await updateDockShortcut(nextShortcut)
      setShortcut(savedShortcut)
      capturePaused.current = false
      setCapturing(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setSaving(false)
    }
  }

  const beginCapture = async () => {
    setError(null)
    try {
      await pauseDockShortcut()
      capturePaused.current = true
      setCapturing(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  const cancelCapture = () => {
    if (!capturePaused.current) return
    capturePaused.current = false
    setCapturing(false)
    void resumeDockShortcut().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause))
    })
  }

  const groups = Array.from(new Set(filteredShortcuts.map((item) => item.category)))

  return (
    <AppShell title="Raccourcis clavier">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <header className="flex flex-col gap-2">
            <Badge className="w-fit" variant="outline">
              <KeyboardIcon aria-hidden="true" data-icon="inline-start" />
              FXMP OS
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight">Raccourcis clavier</h1>
            <p className="text-sm text-muted-foreground">
              Accédez rapidement aux sections et fenêtres de FXMP OS.
            </p>
          </header>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SparklesIcon aria-hidden="true" className="text-primary" />
                Dock FXMP OS
              </CardTitle>
              <CardDescription>
                Affiche le dock au-dessus des autres fenêtres avec un raccourci global.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                <kbd className="text-sm font-medium">{displayShortcut(shortcut)}</kbd>
                <span className="text-xs text-muted-foreground">Raccourci global</span>
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={desktopRuntime !== true}
                  onClick={() => {
                    if (isTauri()) {
                      void invoke("toggle_dock").catch((cause: unknown) => {
                        setError(cause instanceof Error ? cause.message : String(cause))
                      })
                    }
                  }}
                  variant="outline"
                >
                  Tester le dock
                </Button>
                <Button
                  disabled={desktopRuntime !== true || saving}
                  onClick={() => capturing ? cancelCapture() : void beginCapture()}
                  variant="outline"
                >
                  {capturing ? "Annuler" : "Modifier"}
                </Button>
                {shortcut !== DEFAULT_DOCK_SHORTCUT && (
                  <Button
                    disabled={desktopRuntime !== true || saving}
                    onClick={() => void saveShortcut(DEFAULT_DOCK_SHORTCUT)}
                    variant="ghost"
                  >
                    Réinitialiser
                  </Button>
                )}
              </div>
              {capturing && (
                <button
                  autoFocus
                  className="w-full rounded-lg border border-primary/50 bg-primary/5 px-4 py-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onKeyDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    if (event.key === "Escape") {
                      cancelCapture()
                      return
                    }
                    const nextShortcut = shortcutFromEvent(event)
                    if (nextShortcut) void saveShortcut(nextShortcut)
                  }}
                  onBlur={cancelCapture}
                  onClick={(event) => event.currentTarget.focus()}
                  type="button"
                >
                  Appuyez sur la combinaison souhaitée…
                </button>
              )}
              {error && <p className="w-full text-sm text-destructive" role="alert">{error}</p>}
            </CardContent>
          </Card>

          <div className="relative">
            <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Rechercher des raccourcis"
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher des raccourcis"
              value={query}
            />
          </div>

          <div className="flex flex-col gap-5">
            {groups.map((group) => (
              <Card key={group}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{group}</CardTitle>
                </CardHeader>
                <CardContent className="divide-y p-0">
                  {filteredShortcuts.filter((item) => item.category === group).map((item) => {
                    const keys = item.action === "Afficher ou masquer le dock"
                      ? displayShortcut(shortcut)
                      : item.keys
                    const Icon = item.action === "Ressources"
                      ? ActivityIcon
                      : item.action === "Applications"
                        ? AppWindowIcon
                        : item.action === "Appareil"
                          ? MonitorIcon
                          : item.action === "Paramètres"
                            ? Settings2Icon
                            : CommandIcon
                    return (
                      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3" key={item.action}>
                        <div className="flex min-w-0 items-start gap-3">
                          <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{item.action}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                        <kbd className="rounded-md border bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground">{keys}</kbd>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ))}
            {filteredShortcuts.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucun raccourci trouvé.</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Les raccourcis de navigation sont actifs lorsque la fenêtre FXMP OS est au premier plan. Le raccourci du dock fonctionne aussi quand une autre application est active.
          </p>
        </div>
      </div>
    </AppShell>
  )
}

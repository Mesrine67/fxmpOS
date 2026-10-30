"use client"

import { useEffect, useState } from "react"
import { emitTo, listen } from "@tauri-apps/api/event"
import { invoke, isTauri } from "@tauri-apps/api/core"
import { CircleHelpIcon, FileCode2Icon, FileTextIcon, FolderIcon, XIcon } from "lucide-react"

import { DEFAULT_DOCK_THEME, getDockTheme, type DockTheme } from "@/lib/dock-preferences"

const dockItems = [
  { label: "Vue d’ensemble", shortcut: "Ctrl + Maj + 1", href: "/", icon: FolderIcon, kind: "folder" },
  { label: "Ressources", shortcut: "Ctrl + Maj + 2", href: "/monitor/", icon: FolderIcon, kind: "folder" },
  { label: "Applications", shortcut: "Ctrl + Maj + 3", href: "/apps/", icon: FolderIcon, kind: "folder" },
  { label: "Appareil", shortcut: "Ctrl + Maj + 4", href: "/account/", icon: FolderIcon, kind: "folder" },
  { label: "Paramètres", shortcut: "Ctrl + ,", href: "/settings/", icon: FileTextIcon, kind: "file" },
  { label: "Raccourcis", shortcut: "Ctrl + Maj + K", href: "/shortcuts/", icon: FileCode2Icon, kind: "file" },
  { label: "Overlay", shortcut: "Ctrl + Maj + O", href: "/overlays/", icon: FolderIcon, kind: "folder" },
  { label: "À propos", shortcut: "", href: "/about/", icon: CircleHelpIcon, kind: "file" },
  { label: "Fermer le dock", shortcut: "Échap", href: null, icon: XIcon, kind: "file" },
]

async function navigateTo(href: string) {
  if (!isTauri()) {
    window.location.assign(href)
    return
  }

  await emitTo("main", "dock:navigate", href)
  await invoke("close_dock")
}

export function DockWindow() {
  const [theme, setTheme] = useState<DockTheme>(DEFAULT_DOCK_THEME)

  useEffect(() => {
    document.documentElement.dataset.fxmpDock = "true"
    let active = true
    let unlisten: (() => void) | undefined
    void getDockTheme().then((savedTheme) => {
      if (!active) return
      setTheme(savedTheme)
    }).catch((error: unknown) => {
      console.error("Impossible de lire le thème du dock", error)
    })
    void listen<DockTheme>("dock-theme-changed", (event) => {
      setTheme(event.payload === "windows" || event.payload === "fxmp" || event.payload === "light" ? event.payload : DEFAULT_DOCK_THEME)
    }).then((stopListening) => {
      if (active) unlisten = stopListening
      else stopListening()
    }).catch((error: unknown) => {
      console.error("Impossible d’écouter les changements de thème du dock", error)
    })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isTauri()) {
        event.preventDefault()
        void invoke("close_dock").catch((error) => {
          console.error("Impossible de fermer le dock FXMP OS", error)
        })
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      active = false
      unlisten?.()
      window.removeEventListener("keydown", onKeyDown)
      delete document.documentElement.dataset.fxmpDock
      delete document.documentElement.dataset.dockTheme
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.dockTheme = theme
  }, [theme])

  return (
    <main className="flex h-screen w-screen items-center justify-center overflow-hidden bg-transparent p-2 text-white">
      <section aria-label="Dock FXMP OS" className={`dock-panel dock-panel-${theme} h-full w-full overflow-hidden rounded-[20px] border px-4 py-4 shadow-2xl backdrop-blur-2xl`}>
        <header className="flex h-7 items-center gap-2 px-0.5 text-[14px] font-semibold tracking-tight">
          <span>{theme === "windows" ? "Quick Access" : "FXMP OS"}</span>
          <span aria-hidden="true" className="text-white/45">·</span>
          <span className="text-white/80">{dockItems.length} items</span>
        </header>

        <nav aria-label="Accès rapide FXMP OS" className="mt-3 grid grid-cols-3 gap-x-2 gap-y-2">
          {dockItems.map(({ label, shortcut, href, icon: Icon, kind }) => (
            <button
              key={label}
              aria-label={label}
              className="dock-item group flex h-[90px] min-w-0 flex-col items-center justify-center gap-1 rounded-[11px] px-1 text-center text-white/90 transition-colors hover:bg-white/10 focus-visible:bg-white/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
              onClick={() => void (href ? navigateTo(href) : invoke("close_dock")).catch((error) => {
                console.error(`Impossible d’exécuter ${label}`, error)
              })}
              title={`${label} · ${shortcut}`}
              type="button"
            >
              <span className={`dock-item-icon flex size-[48px] items-center justify-center ${kind === "folder" ? "dock-folder" : "dock-file"}`}>
                <Icon aria-hidden="true" className={kind === "folder" ? "size-[39px]" : "size-[35px]"} strokeWidth={kind === "folder" ? 1.25 : 1.35} />
              </span>
              <span className="w-full truncate text-[12px] font-normal leading-4">{label}</span>
            </button>
          ))}
        </nav>
      </section>
    </main>
  )
}

"use client"

import { useEffect } from "react"
import { emitTo } from "@tauri-apps/api/event"
import { invoke, isTauri } from "@tauri-apps/api/core"
import {
  ActivityIcon,
  AppWindowIcon,
  CommandIcon,
  KeyboardIcon,
  MonitorIcon,
  Settings2Icon,
  XIcon,
} from "lucide-react"

const dockItems = [
  { label: "Vue d’ensemble", shortcut: "Ctrl + Maj + 1", href: "/", icon: CommandIcon },
  { label: "Ressources", shortcut: "Ctrl + Maj + 2", href: "/monitor/", icon: ActivityIcon },
  { label: "Applications", shortcut: "Ctrl + Maj + 3", href: "/apps/", icon: AppWindowIcon },
  { label: "Appareil", shortcut: "Ctrl + Maj + 4", href: "/account/", icon: MonitorIcon },
  { label: "Paramètres", shortcut: "Ctrl + ,", href: "/settings/", icon: Settings2Icon },
  { label: "Raccourcis", shortcut: "Ctrl + Maj + K", href: "/shortcuts/", icon: KeyboardIcon },
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
  useEffect(() => {
    document.documentElement.dataset.fxmpDock = "true"
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
      window.removeEventListener("keydown", onKeyDown)
      delete document.documentElement.dataset.fxmpDock
    }
  }, [])

  return (
    <main className="flex h-screen w-screen items-center justify-center overflow-hidden bg-transparent p-2 text-white">
      <section
        aria-label="Dock FXMP OS"
        className="flex h-full w-full items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/90 px-3 shadow-2xl backdrop-blur-2xl"
      >
        <div className="mr-1 flex size-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
          <CommandIcon aria-hidden="true" className="size-5" />
        </div>
        <nav aria-label="Navigation FXMP OS" className="flex min-w-0 flex-1 items-center justify-center gap-2">
          {dockItems.map(({ label, shortcut, href, icon: Icon }) => (
            <button
              key={href}
              aria-label={label}
              className="group flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-white/65 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              onClick={() => void navigateTo(href).catch((error) => {
                console.error(`Impossible d’ouvrir ${label}`, error)
              })}
              title={`${label} · ${shortcut}`}
              type="button"
            >
              <Icon aria-hidden="true" className="size-5 transition-transform group-hover:-translate-y-0.5" />
              <span className="truncate text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </nav>
        <button
          aria-label="Fermer le dock"
          className="ml-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          onClick={() => void invoke("close_dock").catch(() => undefined)}
          title="Fermer · Échap"
          type="button"
        >
          <XIcon aria-hidden="true" className="size-4" />
        </button>
      </section>
    </main>
  )
}

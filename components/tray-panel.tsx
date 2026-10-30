"use client"

import { useEffect } from "react"
import { emit, listen } from "@tauri-apps/api/event"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { isTauri } from "@tauri-apps/api/core"
import {
  ActivityIcon,
  AppWindowIcon,
  BellIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  GaugeIcon,
  LayoutDashboardIcon,
  MonitorIcon,
  PaletteIcon,
  PowerIcon,
  Settings2Icon,
  ShieldCheckIcon,
  XIcon,
} from "lucide-react"

const sections = [
  {
    title: "ACCES RAPIDE",
    items: [
      { label: "Vue d’ensemble", detail: "Ouvrir le centre de contrôle", href: "/", icon: LayoutDashboardIcon },
      { label: "Ressources système", detail: "Suivre les performances du PC", href: "/monitor/", icon: ActivityIcon },
      { label: "Applications installées", detail: "Parcourir les applications", href: "/apps/", icon: AppWindowIcon },
      { label: "Appareil Windows", detail: "Informations sur cet appareil", href: "/account/", icon: MonitorIcon },
    ],
  },
  {
    title: "FXMP OS",
    items: [
      { label: "Paramètres · Application", detail: "Préférences de FXMP OS", href: "/settings/?tab=application", icon: Settings2Icon },
      { label: "Paramètres · Overlay", detail: "Configurer le widget", href: "/settings/?tab=overlay", icon: GaugeIcon },
      { label: "Paramètres · Notifications", detail: "Gérer les alertes", href: "/settings/?tab=notifications", icon: BellIcon },
      { label: "Paramètres · Thème", detail: "Personnaliser l’apparence", href: "/settings/?tab=theme", icon: PaletteIcon },
      { label: "Paramètres · Mises à jour", detail: "Version et mises à jour", href: "/settings/?tab=updates", icon: ShieldCheckIcon },
    ],
  },
]

async function hidePanel() {
  if (isTauri()) await getCurrentWindow().hide()
}

async function navigate(href: string) {
  if (!isTauri()) {
    window.location.assign(href)
    return
  }
  await emit("tray:navigate", href)
  await hidePanel()
}

export function TrayPanel() {
  useEffect(() => {
    document.documentElement.dataset.fxmpTrayPanel = "true"
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") void hidePanel()
    }
    window.addEventListener("keydown", closeOnEscape)
    let unlisten: (() => void) | undefined
    let active = true
    void listen("tray-panel:close", () => void hidePanel()).then((stop) => {
      if (active) unlisten = stop
      else stop()
    }).catch((error: unknown) => console.error("Impossible d’écouter la fermeture du menu tray", error))
    return () => {
      active = false
      unlisten?.()
      window.removeEventListener("keydown", closeOnEscape)
      delete document.documentElement.dataset.fxmpTrayPanel
    }
  }, [])

  return (
    <main className="flex h-screen w-screen items-start justify-center overflow-hidden bg-transparent p-2 text-[#f4f4f5]">
      <section aria-label="Menu FXMP OS" className="tray-companion flex h-full w-full flex-col overflow-hidden rounded-[14px] border border-white/10 bg-[#191a1d]/90 shadow-2xl backdrop-blur-2xl">
        <header className="flex items-center justify-between border-b border-white/[0.07] px-3.5 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#ba4037]/20 text-[#f0786e]"><GaugeIcon aria-hidden="true" className="size-4" /></span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-4">FXMP OS</p>
              <p className="text-[10px] text-white/45">Centre de contrôle</p>
            </div>
          </div>
          <button aria-label="Fermer le menu" className="rounded-md p-1.5 text-white/45 hover:bg-white/10 hover:text-white" onClick={() => void hidePanel()} type="button"><XIcon className="size-4" /></button>
        </header>

        <button className="flex items-center gap-2.5 border-b border-white/[0.07] px-4 py-3 text-left hover:bg-white/[0.04]" onClick={() => void navigate("/")} type="button">
          <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/40" /><span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" /></span>
          <span className="min-w-0 flex-1"><span className="block text-[11px] font-medium">Appareil Windows</span><span className="mt-0.5 block truncate text-[10px] text-white/45">Surveillance locale active</span></span>
          <ChevronRightIcon className="size-3.5 text-white/35" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2">
          {sections.map((section) => (
            <div className="pb-1" key={section.title}>
              <p className="px-2 pb-1 pt-2.5 text-[9px] font-semibold tracking-[0.12em] text-white/40">{section.title}</p>
              {section.items.map(({ label, detail, href, icon: Icon }) => (
                <button className="group flex w-full items-center gap-2.5 rounded-md px-2 py-[7px] text-left hover:bg-white/[0.08] focus-visible:bg-white/[0.08] focus-visible:outline-none" key={href} onClick={() => void navigate(href)} type="button">
                  <Icon aria-hidden="true" className="size-[14px] shrink-0 text-white/65" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[11px] leading-4">{label}</span><span className="block truncate text-[9px] leading-3 text-white/40">{detail}</span></span>
                  <ChevronRightIcon className="size-3 shrink-0 text-white/20 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          ))}
        </div>

        <footer className="border-t border-white/[0.08] px-2.5 py-2">
          <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-white/75 hover:bg-white/[0.08] hover:text-white" onClick={() => void navigate("/about/")} type="button"><CircleHelpIcon className="size-[14px]" /><span className="flex-1 text-[11px]">À propos de FXMP OS</span><ChevronRightIcon className="size-3 text-white/30" /></button>
          <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-white/75 hover:bg-white/[0.08] hover:text-white" onClick={() => void emit("tray:quit")} type="button"><PowerIcon className="size-[14px]" /><span className="flex-1 text-[11px]">Quitter FXMP OS</span></button>
        </footer>
      </section>
    </main>
  )
}

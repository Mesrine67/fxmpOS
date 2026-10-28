"use client"

import {
  AppWindow,
  ChevronRight,
  Cpu,
  CircleHelp,
  Gauge,
  Layers3,
  Monitor,
  Power,
  Settings2,
} from "lucide-react"
import { emit, emitTo } from "@tauri-apps/api/event"
import { Effect, EffectState, getCurrentWindow } from "@tauri-apps/api/window"
import { useEffect, useState } from "react"

import styles from "./tray-menu.module.css"

const quickAccess = [
  { label: "Vue d’ensemble", detail: "État du PC", icon: Gauge, route: "/" },
  { label: "Ressources", detail: "Processeur, mémoire, réseau", icon: Cpu, route: "/monitor/" },
  { label: "Applications", detail: "Logiciels installés", icon: AppWindow, route: "/apps/" },
  { label: "Appareil", detail: "Windows et matériel", icon: Monitor, route: "/account/" },
] as const

export default function TrayMenuPage() {
  const [actionError, setActionError] = useState(false)

  useEffect(() => {
    // Use the Windows Acrylic material, as the OpenClaw companion flyout does.
    void getCurrentWindow().setEffects({
      effects: [Effect.Acrylic],
      state: EffectState.Active,
      color: [18, 18, 20, 176],
    }).catch((error) => console.warn("Impossible d’appliquer Acrylic au menu tray", error))
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") void getCurrentWindow().hide()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  async function navigate(route: string) {
    setActionError(false)
    try {
      await emitTo("main", "tray:navigate", route)
      await getCurrentWindow().hide()
    } catch (error) {
      console.error("Impossible d’ouvrir la page depuis le menu tray", error)
      setActionError(true)
    }
  }

  async function quit() {
    setActionError(false)
    try {
      await emit("tray:quit")
    } catch (error) {
      console.error("Impossible de quitter FXMP OS depuis le menu tray", error)
      setActionError(true)
    }
  }

  return (
    <main data-fxmp-tray-menu className={styles.root}>
      <section aria-label="Menu FXMP OS" className={styles.surface}>
        <header className={styles.header}>
          <span className={styles.brandMark} aria-hidden="true"><Layers3 /></span>
          <span className={styles.brandText}>
            <strong>FXMP OS</strong>
            <span>Centre de contrôle</span>
          </span>
          <span className={styles.status}><span aria-hidden="true" />Actif</span>
          <span className={styles.headerBadge} aria-hidden="true">F</span>
        </header>

        <div className={styles.scrollArea}>
          <p className={styles.sectionLabel}>Accès rapide</p>
          <nav aria-label="Accès rapide" className={styles.menuList}>
            {quickAccess.map(({ label, detail, icon: Icon, route }) => (
              <button key={route} type="button" className={styles.menuItem} onClick={() => void navigate(route)}>
                <Icon aria-hidden="true" className={styles.itemIcon} />
                <span className={styles.itemCopy}>
                  <span className={styles.itemTitle}>{label}</span>
                  <span className={styles.itemDetail}>{detail}</span>
                </span>
                <ChevronRight aria-hidden="true" className={styles.chevron} />
              </button>
            ))}
          </nav>

          <div className={styles.divider} />
          <p className={styles.sectionLabel}>FXMP OS</p>
          <nav aria-label="FXMP OS" className={styles.menuList}>
            <button type="button" className={styles.menuItem} onClick={() => void navigate("/settings/")}>
              <Settings2 aria-hidden="true" className={styles.itemIcon} />
              <span className={styles.itemCopy}><span className={styles.itemTitle}>Paramètres</span></span>
              <ChevronRight aria-hidden="true" className={styles.chevron} />
            </button>
            <button type="button" className={styles.menuItem} onClick={() => void navigate("/about/")}>
              <CircleHelp aria-hidden="true" className={styles.itemIcon} />
              <span className={styles.itemCopy}><span className={styles.itemTitle}>À propos de FXMP OS</span></span>
              <ChevronRight aria-hidden="true" className={styles.chevron} />
            </button>
          </nav>
        </div>

        {actionError ? <p role="alert" className={styles.error}>L’action a échoué. Réessaie depuis FXMP OS.</p> : null}

        <footer className={styles.footer}>
          <span className={styles.footerCopy}>
            <AppWindow aria-hidden="true" className={styles.footerIcon} />
            <span className={styles.footerText}>
              <strong>Application de bureau</strong>
              <span>Windows · menu de la zone de notification</span>
            </span>
          </span>
          <button type="button" className={styles.quitButton} onClick={() => void quit()}>
            <Power aria-hidden="true" /> Quitter
          </button>
        </footer>
      </section>
    </main>
  )
}

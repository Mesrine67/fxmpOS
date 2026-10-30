"use client"

import {
  ArrowDownToLineIcon,
  BellIcon,
  Layers3Icon,
  MonitorCogIcon,
  PanelTopIcon,
  PaletteIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react"
import { useSyncExternalStore } from "react"

import { AutostartSettings } from "@/components/autostart-settings"
import { DockAppearanceSettings } from "@/components/dock-appearance-settings"
import { NetworkLatency } from "@/components/network-latency"
import { NotificationSettings } from "@/components/notification-settings"
import { OverlaySettings } from "@/components/overlay-settings"
import { UpdaterSettings } from "@/components/updater-settings"
import { ThemeSettings } from "@/components/theme-settings"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const settingsTabValues = [
  "application",
  "overlay",
  "notifications",
  "theme",
  "dock",
  "updates",
]

function subscribeToSettingsUrl(onChange: () => void) {
  window.addEventListener("popstate", onChange)
  window.addEventListener("fxmp:settings-tab-changed", onChange)
  return () => {
    window.removeEventListener("popstate", onChange)
    window.removeEventListener("fxmp:settings-tab-changed", onChange)
  }
}

function getSettingsTab() {
  const requestedTab = new URLSearchParams(window.location.search).get("tab")
  return settingsTabValues.includes(requestedTab ?? "")
    ? requestedTab!
    : "application"
}

export function SettingsPage() {
  const activeTab = useSyncExternalStore(
    subscribeToSettingsUrl,
    getSettingsTab,
    () => "application"
  )

  return (
    <div className="min-h-0 flex-1 px-5 py-6 md:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Badge className="w-fit" variant="outline">
              <SparklesIcon aria-hidden="true" data-icon="inline-start" />
              FXMP OS
            </Badge>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                Paramètres
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Configure le comportement de l’application, son overlay, ses
                notifications, son apparence et ses mises à jour.
              </p>
            </div>
          </div>
          <Badge variant="secondary">Windows</Badge>
        </header>

        <Tabs
          className="gap-5"
          value={activeTab}
          onValueChange={(value) => {
            if (!value) return
            const nextUrl = new URL(window.location.href)
            if (value === "application") nextUrl.searchParams.delete("tab")
            else nextUrl.searchParams.set("tab", value)
            window.history.replaceState(
              null,
              "",
              `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
            )
            window.dispatchEvent(new Event("fxmp:settings-tab-changed"))
          }}
        >
          <TabsList className="grid h-auto w-full grid-cols-2 sm:flex sm:w-fit">
            <TabsTrigger value="application">
              <MonitorCogIcon data-icon="inline-start" />
              Application
            </TabsTrigger>
            <TabsTrigger value="overlay">
              <Layers3Icon data-icon="inline-start" />
              Overlay
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <BellIcon data-icon="inline-start" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="theme">
              <PaletteIcon data-icon="inline-start" />
              Thème
            </TabsTrigger>
            <TabsTrigger value="dock">
              <PanelTopIcon data-icon="inline-start" />
              Dock
            </TabsTrigger>
            <TabsTrigger value="updates">
              <ArrowDownToLineIcon data-icon="inline-start" />
              Mises à jour
            </TabsTrigger>
          </TabsList>

          <TabsContent className="flex flex-col gap-4" value="application">
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <AutostartSettings />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheckIcon
                      aria-hidden="true"
                      className="text-primary"
                    />
                    Confidentialité locale
                  </CardTitle>
                  <CardDescription>
                    Les détails du PC restent sur cet appareil.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    FXMP OS ne transmet pas les informations système affichées
                    dans Compte. Les numéros de série, UUID et identifiants
                    uniques ne sont pas collectés.
                  </p>
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Fenêtre et zone de notification</CardTitle>
                <CardDescription>
                  Le bouton fermer masque la fenêtre. L’icône de la zone de
                  notification permet de la rouvrir ou de quitter l’application.
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>

          <TabsContent className="flex flex-col gap-4" value="overlay">
            <OverlaySettings />
            <NetworkLatency />
          </TabsContent>

          <TabsContent className="flex flex-col gap-4" value="notifications">
            <NotificationSettings />
          </TabsContent>

          <TabsContent className="flex flex-col gap-4" value="theme">
            <ThemeSettings />
          </TabsContent>

          <TabsContent className="flex flex-col gap-4" value="dock">
            <DockAppearanceSettings />
          </TabsContent>

          <TabsContent
            className="flex flex-col gap-4"
            keepMounted
            value="updates"
          >
            <UpdaterSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

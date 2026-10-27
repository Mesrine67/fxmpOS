import {
  ArrowDownToLineIcon,
  BellIcon,
  Layers3Icon,
  MonitorCogIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react"

import { AutostartSettings } from "@/components/autostart-settings"
import { NetworkLatency } from "@/components/network-latency"
import { NotificationSettings } from "@/components/notification-settings"
import { OverlaySettings } from "@/components/overlay-settings"
import { UpdaterSettings } from "@/components/updater-settings"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function SettingsPage() {
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
                notifications et ses mises à jour.
              </p>
            </div>
          </div>
          <Badge variant="secondary">Windows</Badge>
        </header>

        <Tabs className="gap-5" defaultValue="application">
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

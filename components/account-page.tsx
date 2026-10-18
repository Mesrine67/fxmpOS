"use client"

import { useCallback, useEffect, useState } from "react"
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  Clock3Icon,
  CpuIcon,
  HardDriveIcon,
  LoaderCircleIcon,
  MemoryStickIcon,
  MonitorIcon,
  RefreshCwIcon,
  ServerIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTauriRuntime } from "@/hooks/use-tauri-runtime"
import { trackedInvoke } from "@/lib/tauri"

type DiskInfo = {
  name: string
  mountPoint: string
  fileSystem: string
  totalBytes: number
  availableBytes: number
}

type GraphicsAdapterInfo = {
  name: string
  manufacturer: string | null
  videoProcessor: string | null
  driverVersion: string | null
}

type DisplayMonitorInfo = {
  id: string
  name: string | null
  positionX: number
  positionY: number
  width: number
  height: number
  workAreaX: number
  workAreaY: number
  workAreaWidth: number
  workAreaHeight: number
  scaleFactor: number
  primary: boolean
}

type SystemSnapshot = {
  hostname: string
  windowsUser: string | null
  platform: string
  architecture: string
  osVersion: string
  osName: string | null
  kernelVersion: string
  locale: string | null
  cpuName: string | null
  cpuFrequencyMhz: number | null
  logicalProcessors: number
  physicalCores: number | null
  computerManufacturer: string | null
  computerModel: string | null
  computerFamily: string | null
  computerVersion: string | null
  motherboardManufacturer: string | null
  motherboardModel: string | null
  motherboardVersion: string | null
  memoryTotalBytes: number
  memoryUsedBytes: number
  virtualMemoryTotalBytes: number
  virtualMemoryUsedBytes: number
  uptimeSeconds: number
  disks: DiskInfo[]
  graphicsAdapters: GraphicsAdapterInfo[] | null
}

const numberFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
})

function formatCapacity(bytes: number) {
  return `${numberFormat.format(bytes / 1024 ** 3)} Go`
}

function formatPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

function formatUptime(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const parts = []

  if (days > 0) parts.push(`${days} j`)
  if (hours > 0 || days > 0) parts.push(`${hours} h`)
  parts.push(`${minutes} min`)
  return parts.join(" ")
}

function architectureLabel(architecture: string) {
  if (architecture === "x86_64") return "64 bits (x64)"
  if (architecture === "aarch64") return "ARM64"
  if (architecture === "x86") return "32 bits (x86)"
  return architecture
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] text-right font-medium break-words">
        {value || "—"}
      </dd>
    </div>
  )
}

function ProgressTrack({ label, value }: { label: string; value: number }) {
  const percentage = formatPercent(value)

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={percentage}
      className="h-2 overflow-hidden rounded-full bg-muted"
      role="progressbar"
    >
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  progress,
}: {
  icon: LucideIcon
  label: string
  value: string
  detail: string
  progress?: number
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="line-clamp-2 min-h-10 text-base">
          {value}
        </CardTitle>
        <CardAction>
          <div className="rounded-md border bg-muted/50 p-2 text-muted-foreground">
            <Icon aria-hidden="true" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="min-h-5 text-xs text-muted-foreground">{detail}</p>
        {progress !== undefined && (
          <ProgressTrack label={label} value={progress} />
        )}
      </CardContent>
    </Card>
  )
}

function NativeUnavailable() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <MonitorIcon aria-hidden="true" className="text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <p className="font-medium">Informations natives indisponibles</p>
          <p className="max-w-md text-muted-foreground">
            Ouvre cette page dans l’application FXMP OS pour lire les détails
            réels de Windows et de cet appareil.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index}>
          <CardContent className="flex flex-col gap-4 pt-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function AccountPage() {
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null)
  const [monitors, setMonitors] = useState<DisplayMonitorInfo[]>([])
  const isDesktopRuntime = useTauriRuntime()
  const [isLoading, setIsLoading] = useState(true)
  const [areMonitorsLoading, setAreMonitorsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [monitorError, setMonitorError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadSnapshot = useCallback(async () => {
    try {
      const result = await trackedInvoke<SystemSnapshot>("get_system_snapshot")
      setSnapshot(result)
      setLastUpdated(new Date())
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadMonitors = useCallback(async () => {
    try {
      const result = await trackedInvoke<DisplayMonitorInfo[]>(
        "get_display_monitors"
      )
      setMonitors(result)
      setMonitorError(null)
    } catch (reason) {
      setMonitorError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setAreMonitorsLoading(false)
    }
  }, [])

  const refreshSnapshot = useCallback(() => {
    setIsLoading(true)
    setAreMonitorsLoading(true)
    setError(null)
    setMonitorError(null)
    void Promise.all([loadSnapshot(), loadMonitors()])
  }, [loadMonitors, loadSnapshot])

  useEffect(() => {
    if (isDesktopRuntime !== true) return

    const timer = window.setTimeout(() => {
      void loadSnapshot()
      void loadMonitors()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [isDesktopRuntime, loadMonitors, loadSnapshot])

  const memoryPercent = snapshot?.memoryTotalBytes
    ? formatPercent(
        (snapshot.memoryUsedBytes / snapshot.memoryTotalBytes) * 100
      )
    : 0
  const storageTotal =
    snapshot?.disks.reduce((total, disk) => total + disk.totalBytes, 0) ?? 0
  const storageAvailable =
    snapshot?.disks.reduce((total, disk) => total + disk.availableBytes, 0) ?? 0
  const storageUsed = Math.max(0, storageTotal - storageAvailable)
  const storagePercent = storageTotal
    ? formatPercent((storageUsed / storageTotal) * 100)
    : 0

  return (
    <main className="min-h-0 flex-1 px-5 py-6 md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Badge className="w-fit" variant="outline">
              <ServerIcon aria-hidden="true" data-icon="inline-start" />
              Appareil local
            </Badge>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                Compte et appareil
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Vue détaillée de Windows, du matériel, du stockage et des écrans
                connectés.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {lastUpdated && (
              <span className="text-muted-foreground">
                Lecture à {lastUpdated.toLocaleTimeString("fr-FR")}
              </span>
            )}
            <Button
              disabled={isLoading || isDesktopRuntime !== true}
              onClick={() => refreshSnapshot()}
              type="button"
              variant="outline"
            >
              <RefreshCwIcon
                className={isLoading ? "animate-spin" : undefined}
                data-icon="inline-start"
              />
              Actualiser
            </Button>
          </div>
        </header>

        {error && snapshot && (
          <Card role="status">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <div className="flex items-center gap-2 text-destructive">
                <CircleAlertIcon aria-hidden="true" />
                <p>
                  Actualisation impossible. Les données affichées datent de la
                  dernière lecture réussie.
                </p>
              </div>
              <Button
                disabled={isLoading}
                onClick={() => refreshSnapshot()}
                type="button"
                variant="outline"
              >
                Réessayer
              </Button>
            </CardContent>
          </Card>
        )}

        {isDesktopRuntime === false ? (
          <NativeUnavailable />
        ) : isDesktopRuntime === null || (isLoading && !snapshot) ? (
          <div className="flex flex-col gap-4" role="status">
            <div className="flex items-center gap-2 text-muted-foreground">
              <LoaderCircleIcon className="animate-spin" />
              Lecture des informations de cet appareil…
            </div>
            <LoadingState />
          </div>
        ) : error && !snapshot ? (
          <Card role="alert">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CircleAlertIcon className="text-destructive" />
                Impossible de lire les informations système
              </CardTitle>
              <CardDescription className="break-words">{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => refreshSnapshot()}
                type="button"
                variant="outline"
              >
                Réessayer
              </Button>
            </CardContent>
          </Card>
        ) : snapshot ? (
          <>
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-5 pt-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="rounded-xl border bg-primary/10 p-3 text-primary">
                    <MonitorIcon aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted-foreground">Nom de l’appareil</p>
                    <h2 className="truncate text-xl font-semibold">
                      {snapshot.hostname || "PC Windows"}
                    </h2>
                    <p className="truncate text-muted-foreground">
                      {snapshot.osName || "Windows"} · {snapshot.osVersion} ·{" "}
                      {architectureLabel(snapshot.architecture)}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">
                  <CheckCircle2Icon
                    aria-hidden="true"
                    data-icon="inline-start"
                  />
                  Lecture locale
                </Badge>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                detail={`${snapshot.physicalCores ?? snapshot.logicalProcessors} cœurs · ${snapshot.logicalProcessors} processeurs logiques${snapshot.cpuFrequencyMhz ? ` · ${numberFormat.format(snapshot.cpuFrequencyMhz / 1000)} GHz` : ""}`}
                icon={CpuIcon}
                label="Processeur"
                value={snapshot.cpuName || "Modèle indisponible"}
              />
              <MetricCard
                detail={`${formatCapacity(snapshot.memoryUsedBytes)} utilisés sur ${formatCapacity(snapshot.memoryTotalBytes)}`}
                icon={MemoryStickIcon}
                label="Mémoire vive"
                progress={memoryPercent}
                value={`${memoryPercent}% utilisée`}
              />
              <MetricCard
                detail={`${formatCapacity(storageAvailable)} disponibles sur ${formatCapacity(storageTotal)}`}
                icon={HardDriveIcon}
                label="Stockage"
                progress={storagePercent}
                value={`${formatCapacity(storageTotal)} au total`}
              />
              <MetricCard
                detail={
                  areMonitorsLoading
                    ? "Détection en cours…"
                    : monitorError
                      ? "Détection échouée"
                      : "Détectés par Windows"
                }
                icon={MonitorIcon}
                label="Écrans"
                value={
                  monitorError
                    ? "Indisponibles"
                    : `${monitors.length} ${monitors.length === 1 ? "écran" : "écrans"}`
                }
              />
            </div>

            <Tabs className="gap-4" defaultValue="overview">
              <TabsList className="grid h-auto w-full grid-cols-3 sm:w-fit">
                <TabsTrigger value="overview">Vue d’ensemble</TabsTrigger>
                <TabsTrigger value="hardware">Matériel</TabsTrigger>
                <TabsTrigger value="displays">Affichage</TabsTrigger>
              </TabsList>

              <TabsContent className="flex flex-col gap-4" value="overview">
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Windows et session</CardTitle>
                      <CardDescription>
                        Version du système et session locale.
                      </CardDescription>
                      <CardAction>
                        <Badge variant="outline">Windows</Badge>
                      </CardAction>
                    </CardHeader>
                    <CardContent>
                      <dl className="divide-y divide-border/60">
                        <DetailRow
                          label="Nom du PC"
                          value={snapshot.hostname}
                        />
                        <DetailRow label="Édition" value={snapshot.osName} />
                        <DetailRow label="Version" value={snapshot.osVersion} />
                        <DetailRow
                          label="Build du système"
                          value={snapshot.kernelVersion}
                        />
                        <DetailRow
                          label="Architecture"
                          value={architectureLabel(snapshot.architecture)}
                        />
                        <DetailRow
                          label="Langue système"
                          value={snapshot.locale}
                        />
                        <DetailRow
                          label="Utilisateur Windows"
                          value={snapshot.windowsUser}
                        />
                      </dl>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MemoryStickIcon aria-hidden="true" />
                          Mémoire et fichier d’échange
                        </CardTitle>
                        <CardDescription>
                          Capacité et utilisation au moment de la lecture.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-3">
                            <span>Mémoire vive</span>
                            <span className="font-medium tabular-nums">
                              {formatCapacity(snapshot.memoryUsedBytes)} /{" "}
                              {formatCapacity(snapshot.memoryTotalBytes)}
                            </span>
                          </div>
                          <ProgressTrack
                            label="Utilisation de la mémoire vive"
                            value={memoryPercent}
                          />
                          <p className="text-right text-muted-foreground">
                            {formatCapacity(
                              Math.max(
                                0,
                                snapshot.memoryTotalBytes -
                                  snapshot.memoryUsedBytes
                              )
                            )}{" "}
                            disponibles
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 border-t pt-4">
                          <div className="flex items-center justify-between gap-3">
                            <span>Mémoire virtuelle</span>
                            <span className="font-medium tabular-nums">
                              {formatCapacity(snapshot.virtualMemoryUsedBytes)}{" "}
                              /{" "}
                              {formatCapacity(snapshot.virtualMemoryTotalBytes)}
                            </span>
                          </div>
                          <ProgressTrack
                            label="Utilisation de la mémoire virtuelle"
                            value={
                              snapshot.virtualMemoryTotalBytes
                                ? (snapshot.virtualMemoryUsedBytes /
                                    snapshot.virtualMemoryTotalBytes) *
                                  100
                                : 0
                            }
                          />
                          <p className="text-right text-muted-foreground">
                            {formatCapacity(
                              Math.max(
                                0,
                                snapshot.virtualMemoryTotalBytes -
                                  snapshot.virtualMemoryUsedBytes
                              )
                            )}{" "}
                            disponibles
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock3Icon aria-hidden="true" />
                          Session actuelle
                        </CardTitle>
                        <CardDescription>
                          Durée depuis le dernier démarrage de Windows.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-semibold tabular-nums">
                          {formatUptime(snapshot.uptimeSeconds)}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          Build noyau : {snapshot.kernelVersion || "—"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HardDriveIcon aria-hidden="true" />
                      Volumes de stockage
                    </CardTitle>
                    <CardDescription>
                      Espace utilisé et disponible pour chaque volume détecté.
                    </CardDescription>
                    <CardAction>
                      <Badge variant="outline">
                        {snapshot.disks.length}{" "}
                        {snapshot.disks.length === 1 ? "volume" : "volumes"}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5">
                    {snapshot.disks.length ? (
                      snapshot.disks.map((disk) => {
                        const usedBytes = Math.max(
                          0,
                          disk.totalBytes - disk.availableBytes
                        )
                        const percentage = disk.totalBytes
                          ? formatPercent((usedBytes / disk.totalBytes) * 100)
                          : 0

                        return (
                          <div
                            className="flex flex-col gap-2"
                            key={disk.mountPoint}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="truncate font-medium">
                                  {disk.mountPoint || disk.name}
                                </p>
                                <p className="text-muted-foreground">
                                  {disk.fileSystem ||
                                    "Système de fichiers inconnu"}
                                </p>
                              </div>
                              <p className="shrink-0 text-right tabular-nums">
                                {formatCapacity(usedBytes)} /{" "}
                                {formatCapacity(disk.totalBytes)}
                              </p>
                            </div>
                            <ProgressTrack
                              label={`Utilisation du volume ${disk.mountPoint}`}
                              value={percentage}
                            />
                            <p className="text-right text-muted-foreground">
                              {formatCapacity(disk.availableBytes)} disponibles
                            </p>
                          </div>
                        )
                      })
                    ) : (
                      <p className="py-5 text-center text-muted-foreground">
                        Aucun volume de stockage détecté.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent className="flex flex-col gap-4" value="hardware">
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Processeur</CardTitle>
                      <CardDescription>
                        Références et capacités signalées par Windows.
                      </CardDescription>
                      <CardAction>
                        <CpuIcon aria-hidden="true" />
                      </CardAction>
                    </CardHeader>
                    <CardContent>
                      <dl className="divide-y divide-border/60">
                        <DetailRow label="Modèle" value={snapshot.cpuName} />
                        <DetailRow
                          label="Cœurs physiques"
                          value={snapshot.physicalCores?.toString()}
                        />
                        <DetailRow
                          label="Processeurs logiques"
                          value={snapshot.logicalProcessors.toString()}
                        />
                        <DetailRow
                          label="Fréquence signalée"
                          value={
                            snapshot.cpuFrequencyMhz
                              ? `${numberFormat.format(snapshot.cpuFrequencyMhz)} MHz`
                              : null
                          }
                        />
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Ordinateur et carte mère</CardTitle>
                      <CardDescription>
                        Informations matérielles génériques. Aucun numéro de
                        série n’est lu.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <dl className="divide-y divide-border/60">
                        <DetailRow
                          label="Fabricant du PC"
                          value={snapshot.computerManufacturer}
                        />
                        <DetailRow
                          label="Modèle"
                          value={snapshot.computerModel}
                        />
                        <DetailRow
                          label="Famille"
                          value={snapshot.computerFamily}
                        />
                        <DetailRow
                          label="Révision du modèle"
                          value={snapshot.computerVersion}
                        />
                        <DetailRow
                          label="Fabricant de la carte mère"
                          value={snapshot.motherboardManufacturer}
                        />
                        <DetailRow
                          label="Carte mère"
                          value={snapshot.motherboardModel}
                        />
                        <DetailRow
                          label="Version de la carte mère"
                          value={snapshot.motherboardVersion}
                        />
                      </dl>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Adaptateurs graphiques</CardTitle>
                    <CardDescription>
                      Contrôleurs détectés et version des pilotes. Les charges
                      GPU et températures ne sont pas mesurées ici.
                    </CardDescription>
                    <CardAction>
                      <Badge variant="outline">
                        {snapshot.graphicsAdapters?.length ?? 0}{" "}
                        {snapshot.graphicsAdapters?.length === 1
                          ? "adaptateur"
                          : "adaptateurs"}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    {snapshot.graphicsAdapters === null ? (
                      <p className="py-4 text-muted-foreground">
                        Ces informations ne sont pas disponibles sur cette
                        plateforme.
                      </p>
                    ) : snapshot.graphicsAdapters.length === 0 ? (
                      <p className="py-4 text-muted-foreground">
                        Aucun adaptateur graphique détecté.
                      </p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {snapshot.graphicsAdapters.map((adapter, index) => (
                          <Card key={`${adapter.name}-${index}`} size="sm">
                            <CardHeader>
                              <CardTitle className="break-words">
                                {adapter.name}
                              </CardTitle>
                              <CardDescription>
                                Adaptateur graphique
                              </CardDescription>
                              <CardAction>
                                <MonitorIcon aria-hidden="true" />
                              </CardAction>
                            </CardHeader>
                            <CardContent>
                              <dl className="divide-y divide-border/60">
                                <DetailRow
                                  label="Fabricant"
                                  value={adapter.manufacturer}
                                />
                                <DetailRow
                                  label="Processeur graphique"
                                  value={adapter.videoProcessor}
                                />
                                <DetailRow
                                  label="Version du pilote"
                                  value={adapter.driverVersion}
                                />
                              </dl>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent className="flex flex-col gap-4" value="displays">
                <Card>
                  <CardHeader>
                    <CardTitle>Écrans connectés</CardTitle>
                    <CardDescription>
                      Résolution, zone de travail, position et mise à l’échelle
                      lues auprès de Tauri.
                    </CardDescription>
                    <CardAction>
                      <Badge variant="outline">
                        {areMonitorsLoading
                          ? "Détection…"
                          : `${monitors.length} ${monitors.length === 1 ? "écran" : "écrans"}`}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    {monitorError ? (
                      <Card role="alert">
                        <CardContent className="flex items-center gap-2 pt-4 text-destructive">
                          <CircleAlertIcon aria-hidden="true" />
                          <p>
                            La détection des écrans a échoué : {monitorError}
                          </p>
                        </CardContent>
                      </Card>
                    ) : areMonitorsLoading ? (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 2 }, (_, index) => (
                          <Card key={index} size="sm">
                            <CardContent className="flex flex-col gap-3 pt-4">
                              <Skeleton className="h-4 w-2/3" />
                              <Skeleton className="h-3 w-full" />
                              <Skeleton className="h-3 w-5/6" />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : monitors.length === 0 ? (
                      <p className="py-6 text-center text-muted-foreground">
                        Aucun écran détecté.
                      </p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {monitors.map((monitor, index) => (
                          <Card key={`${monitor.id}-${index}`} size="sm">
                            <CardHeader>
                              <CardTitle className="truncate">
                                {monitor.name || `Écran ${index + 1}`}
                              </CardTitle>
                              <CardDescription>
                                {monitor.primary
                                  ? "Écran principal"
                                  : `Écran ${index + 1}`}
                              </CardDescription>
                              <CardAction>
                                {monitor.primary ? (
                                  <Badge variant="secondary">Principal</Badge>
                                ) : (
                                  <MonitorIcon aria-hidden="true" />
                                )}
                              </CardAction>
                            </CardHeader>
                            <CardContent>
                              <dl className="divide-y divide-border/60">
                                <DetailRow
                                  label="Résolution"
                                  value={`${monitor.width} × ${monitor.height} px`}
                                />
                                <DetailRow
                                  label="Mise à l’échelle"
                                  value={`${numberFormat.format(monitor.scaleFactor * 100)} %`}
                                />
                                <DetailRow
                                  label="Position de l’écran"
                                  value={`${monitor.positionX}, ${monitor.positionY} px`}
                                />
                                <DetailRow
                                  label="Zone de travail"
                                  value={`${monitor.workAreaWidth} × ${monitor.workAreaHeight} px`}
                                />
                                <DetailRow
                                  label="Origine de la zone de travail"
                                  value={`${monitor.workAreaX}, ${monitor.workAreaY} px`}
                                />
                              </dl>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <p className="text-center text-muted-foreground">
              Ces informations sont lues localement. Aucun numéro de série, UUID
              ou identifiant unique d’écran n’est collecté.
              {lastUpdated && (
                <>
                  {" "}
                  Dernière lecture : {lastUpdated.toLocaleTimeString("fr-FR")}.
                </>
              )}
            </p>
          </>
        ) : null}
      </div>
    </main>
  )
}

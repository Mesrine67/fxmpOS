"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import {
  CircleAlertIcon,
  Clock3Icon,
  CpuIcon,
  HardDriveIcon,
  LoaderCircleIcon,
  MemoryStickIcon,
  MonitorIcon,
  RefreshCwIcon,
} from "lucide-react"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  return numberFormat.format(bytes / 1024 ** 3) + " Go"
}

function formatPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

function formatUptime(totalSeconds: number) {
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const parts = []

  if (days > 0) parts.push(days + " j")
  if (hours > 0 || days > 0) parts.push(hours + " h")
  parts.push(minutes + " min")

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
    <div className="flex items-start justify-between gap-6 py-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="max-w-[65%] text-right font-medium break-words">
        {value || "—"}
      </dd>
    </div>
  )
}

function UsageBar({
  label,
  used,
  total,
}: {
  label: string
  used: number
  total: number
}) {
  const percentage = total > 0 ? formatPercent((used / total) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{percentage}%</span>
      </div>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percentage}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: String(percentage) + "%" }}
        />
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  children,
}: {
  icon: typeof CpuIcon
  label: string
  value: string
  detail: string
  children?: ReactNode
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="line-clamp-2 min-h-10 text-base">
          {value}
        </CardTitle>
        <CardAction>
          <div className="rounded-md border border-border/60 bg-muted/50 p-2 text-muted-foreground">
            <Icon aria-hidden="true" className="size-4" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="min-h-5 text-xs text-muted-foreground">{detail}</p>
        {children}
      </CardContent>
    </Card>
  )
}

function NativeUnavailable() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <div className="rounded-xl border border-border/60 bg-muted/50 p-3 text-muted-foreground">
          <MonitorIcon aria-hidden="true" className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">Informations natives indisponibles</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Ouvre cette page dans l’application FXMP OS pour afficher les
            caractéristiques réelles de Windows et de cet appareil.
          </p>
        </div>
      </CardContent>
    </Card>
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
    setError(null)
    setAreMonitorsLoading(true)
    setMonitorError(null)
    void loadSnapshot()
    void loadMonitors()
  }, [loadMonitors, loadSnapshot])

  useEffect(() => {
    if (isDesktopRuntime !== true) return

    const snapshotTimer = window.setTimeout(() => {
      void loadSnapshot()
      void loadMonitors()
    }, 0)

    return () => window.clearTimeout(snapshotTimer)
  }, [isDesktopRuntime, loadMonitors, loadSnapshot])

  const memoryPercent = snapshot?.memoryTotalBytes
    ? formatPercent(
        (snapshot.memoryUsedBytes / snapshot.memoryTotalBytes) * 100
      )
    : 0
  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium tracking-[0.14em] text-primary uppercase">
                Appareil
              </p>
              <h2 className="text-xl font-semibold">Détails du PC</h2>
              <p className="text-xs text-muted-foreground">
                Informations locales sur Windows, le matériel et le stockage.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Mis à jour à{" "}
                  {lastUpdated.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              <button
                className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium shadow-xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                disabled={isLoading || isDesktopRuntime !== true}
                onClick={() => void refreshSnapshot()}
                type="button"
              >
                <RefreshCwIcon
                  aria-hidden="true"
                  className={"size-3.5 " + (isLoading ? "animate-spin" : "")}
                />
                Actualiser
              </button>
            </div>
          </div>

          {error && snapshot && (
            <div
              aria-live="polite"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs"
              role="status"
            >
              <p className="text-destructive">
                L’actualisation a échoué. Les détails affichés proviennent de la
                lecture réussie du {lastUpdated?.toLocaleTimeString("fr-FR")}.
              </p>
              <button
                className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                disabled={isLoading}
                onClick={() => void refreshSnapshot()}
                type="button"
              >
                Réessayer
              </button>
            </div>
          )}

          {isDesktopRuntime === false ? (
            <NativeUnavailable />
          ) : isLoading && !snapshot ? (
            <Card>
              <CardContent className="flex items-center justify-center gap-3 py-12 text-xs text-muted-foreground">
                <LoaderCircleIcon
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
                Lecture des informations de cet appareil…
              </CardContent>
            </Card>
          ) : error && !snapshot ? (
            <Card className="border-destructive/30">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <CircleAlertIcon
                  aria-hidden="true"
                  className="size-5 text-destructive"
                />
                <div className="space-y-1">
                  <p className="font-medium">
                    Impossible de lire les informations système
                  </p>
                  <p className="max-w-xl text-xs break-words text-muted-foreground">
                    {error}
                  </p>
                </div>
                <button
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
                  onClick={() => void refreshSnapshot()}
                  type="button"
                >
                  Réessayer
                </button>
              </CardContent>
            </Card>
          ) : snapshot ? (
            <>
              <Card className="overflow-hidden">
                <CardContent className="relative p-5 md:p-6">
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_right,rgba(180,30,30,0.16),transparent_70%)]" />
                  <div className="relative flex flex-wrap items-center justify-between gap-5">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-primary">
                        <MonitorIcon aria-hidden="true" className="size-6" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Nom de l’appareil
                        </p>
                        <h3 className="truncate text-lg font-semibold">
                          {snapshot.hostname || "PC Windows"}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">
                          {snapshot.osName || "Windows"} ·{" "}
                          {snapshot.architecture}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                      variant="outline"
                    >
                      <span className="size-1.5 rounded-full bg-emerald-400" />
                      Lecture locale
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-3">
                <MetricCard
                  detail={
                    (snapshot.physicalCores == null
                      ? snapshot.logicalProcessors + " processeurs logiques"
                      : snapshot.physicalCores +
                        " cœurs · " +
                        snapshot.logicalProcessors +
                        " threads") +
                    (snapshot.cpuFrequencyMhz
                      ? " · " +
                        numberFormat.format(snapshot.cpuFrequencyMhz) +
                        " MHz"
                      : "")
                  }
                  icon={CpuIcon}
                  label="Processeur"
                  value={snapshot.cpuName || "Modèle indisponible"}
                />
                <MetricCard
                  detail={
                    formatCapacity(snapshot.memoryUsedBytes) +
                    " utilisés sur " +
                    formatCapacity(snapshot.memoryTotalBytes)
                  }
                  icon={MemoryStickIcon}
                  label="Mémoire vive"
                  value={memoryPercent + "% utilisée"}
                >
                  <UsageBar
                    label="Utilisation de la mémoire vive"
                    total={snapshot.memoryTotalBytes}
                    used={snapshot.memoryUsedBytes}
                  />
                  <div className="space-y-2 border-t border-border/60 pt-3">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">
                        Mémoire virtuelle
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatCapacity(snapshot.virtualMemoryUsedBytes)} /{" "}
                        {formatCapacity(snapshot.virtualMemoryTotalBytes)}
                      </span>
                    </div>
                    <UsageBar
                      label="Utilisation de la mémoire virtuelle"
                      total={snapshot.virtualMemoryTotalBytes}
                      used={snapshot.virtualMemoryUsedBytes}
                    />
                  </div>
                </MetricCard>
                <MetricCard
                  detail={
                    snapshot.kernelVersion || "Depuis le dernier démarrage"
                  }
                  icon={Clock3Icon}
                  label="Temps de fonctionnement"
                  value={formatUptime(snapshot.uptimeSeconds)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Windows et session</CardTitle>
                    <CardDescription>
                      Version du système et compte Windows local.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <dl className="divide-y divide-border/60">
                      <DetailRow label="Nom du PC" value={snapshot.hostname} />
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

                <Card>
                  <CardHeader>
                    <CardTitle>Stockage</CardTitle>
                    <CardDescription>
                      Espace utilisé et disponible par volume détecté.
                    </CardDescription>
                    <CardAction>
                      <HardDriveIcon
                        aria-hidden="true"
                        className="size-4 text-muted-foreground"
                      />
                    </CardAction>
                  </CardHeader>
                  <CardContent className="space-y-5">
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
                          <div className="space-y-2" key={disk.mountPoint}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {disk.mountPoint || disk.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {disk.fileSystem || "Volume"}
                                </p>
                              </div>
                              <p className="shrink-0 text-right text-xs tabular-nums">
                                {formatCapacity(usedBytes)} /{" "}
                                {formatCapacity(disk.totalBytes)}
                              </p>
                            </div>
                            <div
                              aria-label={
                                "Utilisation du volume " + disk.mountPoint
                              }
                              aria-valuemax={100}
                              aria-valuemin={0}
                              aria-valuenow={percentage}
                              className="h-1.5 overflow-hidden rounded-full bg-muted"
                              role="progressbar"
                            >
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: String(percentage) + "%" }}
                              />
                            </div>
                            <p className="text-right text-xs text-muted-foreground">
                              {formatCapacity(disk.availableBytes)} disponibles
                            </p>
                          </div>
                        )
                      })
                    ) : (
                      <p className="py-6 text-center text-xs text-muted-foreground">
                        Aucun volume de stockage détecté.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Identité matérielle</CardTitle>
                    <CardDescription>
                      Fabricant et références fournis par le matériel local.
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

                <Card>
                  <CardHeader>
                    <CardTitle>Adaptateurs graphiques</CardTitle>
                    <CardDescription>
                      Contrôleurs détectés et version de leurs pilotes.
                    </CardDescription>
                    <CardAction>
                      <MonitorIcon
                        aria-hidden="true"
                        className="size-4 text-muted-foreground"
                      />
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    {snapshot.graphicsAdapters === null ? (
                      <p className="py-4 text-xs text-muted-foreground">
                        Les informations graphiques ne sont pas disponibles sur
                        cette plateforme.
                      </p>
                    ) : snapshot.graphicsAdapters.length === 0 ? (
                      <p className="py-4 text-xs text-muted-foreground">
                        Aucun adaptateur graphique détecté.
                      </p>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {snapshot.graphicsAdapters.map((adapter, index) => (
                          <div
                            className="py-3 first:pt-0 last:pb-0"
                            key={adapter.name + "-" + index}
                          >
                            <p className="text-sm font-medium break-words">
                              {adapter.name}
                            </p>
                            <dl className="mt-1 divide-y divide-border/40 text-xs">
                              {adapter.manufacturer && (
                                <DetailRow
                                  label="Fabricant"
                                  value={adapter.manufacturer}
                                />
                              )}
                              {adapter.videoProcessor && (
                                <DetailRow
                                  label="Processeur graphique"
                                  value={adapter.videoProcessor}
                                />
                              )}
                              {adapter.driverVersion && (
                                <DetailRow
                                  label="Pilote"
                                  value={adapter.driverVersion}
                                />
                              )}
                            </dl>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Écrans détectés</CardTitle>
                  <CardDescription>
                    Résolution, zone de travail, position et mise à l’échelle
                    renvoyées par l’API native Tauri.
                  </CardDescription>
                  <CardAction>
                    <Badge variant="outline">
                      {monitors.length} {monitors.length === 1 ? "écran" : "écrans"}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  {areMonitorsLoading ? (
                    <p className="py-4 text-xs text-muted-foreground">
                      Détection des écrans…
                    </p>
                  ) : monitorError ? (
                    <p
                      aria-live="polite"
                      className="py-4 text-xs text-destructive"
                      role="status"
                    >
                      La détection des écrans a échoué : {monitorError}
                    </p>
                  ) : monitors.length === 0 ? (
                    <p className="py-4 text-xs text-muted-foreground">
                      Aucun écran détecté.
                    </p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {monitors.map((monitor, index) => (
                        <div
                          className="space-y-3 rounded-lg border bg-muted/20 p-4"
                          key={monitor.id + index}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="rounded-md border bg-background p-2 text-muted-foreground">
                                <MonitorIcon
                                  aria-hidden="true"
                                  className="size-4"
                                />
                              </div>
                              <p className="truncate text-sm font-medium">
                                {monitor.name || `Écran ${index + 1}`}
                              </p>
                            </div>
                            {monitor.primary && (
                              <Badge className="shrink-0" variant="outline">
                                Principal
                              </Badge>
                            )}
                          </div>
                          <dl className="divide-y divide-border/60 text-xs">
                            <DetailRow
                              label="Résolution"
                              value={`${monitor.width} × ${monitor.height} px`}
                            />
                            <DetailRow
                              label="Mise à l’échelle"
                              value={`${numberFormat.format(monitor.scaleFactor * 100)} %`}
                            />
                            <DetailRow
                              label="Position"
                              value={`${monitor.positionX}, ${monitor.positionY} px`}
                            />
                            <DetailRow
                              label="Zone de travail"
                              value={`${monitor.workAreaWidth} × ${monitor.workAreaHeight} px`}
                            />
                          </dl>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <p className="text-center text-[0.65rem] text-muted-foreground">
                Ces informations sont lues localement sur cet appareil. Les
                numéros de série et identifiants uniques ne sont pas collectés.
                {lastUpdated && (
                  <span>
                    {" "}
                    Dernière lecture : {lastUpdated.toLocaleTimeString("fr-FR")}
                    .
                  </span>
                )}
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

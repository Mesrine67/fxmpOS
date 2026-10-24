"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ActivityIcon,
  ArrowRightIcon,
  AppWindowIcon,
  CheckCircle2Icon,
  Clock3Icon,
  CpuIcon,
  HardDriveIcon,
  Layers3Icon,
  LoaderCircleIcon,
  MemoryStickIcon,
  MonitorIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
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
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useTauriRuntime } from "@/hooks/use-tauri-runtime"
import { trackedInvoke } from "@/lib/tauri"

type DiskSnapshot = {
  mountPoint: string
  fileSystem: string
  totalBytes: number
  availableBytes: number
}

type GraphicsAdapter = {
  name: string
  videoProcessor: string | null
  driverVersion: string | null
}

type SystemSnapshot = {
  hostname: string
  platform: string
  architecture: string
  osVersion: string
  osName: string | null
  cpuName: string | null
  cpuFrequencyMhz: number | null
  logicalProcessors: number
  physicalCores: number | null
  computerManufacturer: string | null
  computerModel: string | null
  memoryTotalBytes: number
  memoryUsedBytes: number
  uptimeSeconds: number
  disks: DiskSnapshot[]
  graphicsAdapters: GraphicsAdapter[] | null
}

type DisplaySnapshot = {
  name: string | null
  width: number
  height: number
  primary: boolean
}

const numberFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
})

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 4) return `${numberFormat.format(bytes / 1024 ** 4)} To`
  return `${numberFormat.format(bytes / 1024 ** 3)} Go`
}

function percent(used: number, total: number) {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((used / total) * 100)))
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return [
    days ? `${days} j` : null,
    hours ? `${hours} h` : null,
    `${minutes} min`,
  ]
    .filter(Boolean)
    .join(" ")
}

function architectureLabel(value: string) {
  if (value === "x86_64") return "Windows 64 bits · x64"
  if (value === "aarch64") return "Windows ARM64"
  if (value === "x86") return "Windows 32 bits · x86"
  return value
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  progress,
}: {
  icon: typeof CpuIcon
  label: string
  value: string
  detail: string
  progress?: number
}) {
  return (
    <Card>
      <CardHeader className="grid-cols-[1fr_auto]">
        <CardDescription>{label}</CardDescription>
        <div className="row-span-2 rounded-md border bg-muted/40 p-2 text-muted-foreground">
          <Icon aria-hidden="true" />
        </div>
        <CardTitle className="text-base tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="min-h-8 text-muted-foreground">{detail}</p>
        {progress !== undefined && (
          <Progress aria-label={label} value={progress} />
        )}
      </CardContent>
    </Card>
  )
}

function HomeContent() {
  const runtime = useTauriRuntime()
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null)
  const [displays, setDisplays] = useState<DisplaySnapshot[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [displayError, setDisplayError] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [systemResult, displayResult] = await Promise.allSettled([
        trackedInvoke<SystemSnapshot>("get_system_snapshot"),
        trackedInvoke<DisplaySnapshot[]>("get_display_monitors"),
      ])
      if (systemResult.status === "fulfilled") {
        setSnapshot(systemResult.value)
        setError(null)
        setUpdatedAt(new Date())
      } else {
        setError(
          systemResult.reason instanceof Error
            ? systemResult.reason.message
            : String(systemResult.reason)
        )
      }
      if (displayResult.status === "fulfilled") {
        setDisplays(displayResult.value)
        setDisplayError(null)
      } else {
        setDisplayError(
          displayResult.reason instanceof Error
            ? displayResult.reason.message
            : String(displayResult.reason)
        )
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (runtime === null) return
    const timer = window.setTimeout(() => {
      if (runtime) void refresh()
      else setIsLoading(false)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh, runtime])

  const storage = useMemo(() => {
    const disks = snapshot?.disks ?? []
    return disks.reduce(
      (total, disk) => ({
        total: total.total + disk.totalBytes,
        available: total.available + disk.availableBytes,
      }),
      { total: 0, available: 0 }
    )
  }, [snapshot?.disks])

  const memoryPercent = snapshot
    ? percent(snapshot.memoryUsedBytes, snapshot.memoryTotalBytes)
    : 0
  const storagePercent = percent(
    storage.total - storage.available,
    storage.total
  )
  const lowSpaceDisks = (snapshot?.disks ?? []).filter(
    (disk) =>
      percent(disk.totalBytes - disk.availableBytes, disk.totalBytes) >= 90
  )
  const needsAttention = memoryPercent >= 90 || lowSpaceDisks.length > 0
  const machineName = [snapshot?.computerManufacturer, snapshot?.computerModel]
    .filter(Boolean)
    .join(" ")

  return (
    <AppShell title="Vue d’ensemble">
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 md:px-8">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Badge className="w-fit" variant="outline">
                <ActivityIcon aria-hidden="true" data-icon="inline-start" />
                Centre de contrôle PC
              </Badge>
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-semibold tracking-tight">
                  État de votre PC
                </h2>
                <p className="text-sm text-muted-foreground">
                  Un aperçu clair des ressources et des outils de votre
                  appareil.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {updatedAt && (
                <span className="text-xs text-muted-foreground">
                  Actualisé à {updatedAt.toLocaleTimeString("fr-FR")}
                </span>
              )}
              <Button
                disabled={runtime !== true || isLoading}
                onClick={() => void refresh()}
                size="sm"
                variant="outline"
              >
                {isLoading ? (
                  <LoaderCircleIcon
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                ) : (
                  <RefreshCwIcon data-icon="inline-start" />
                )}
                Actualiser
              </Button>
            </div>
          </header>

          {runtime === false && (
            <Card>
              <CardContent className="flex items-start gap-3 pt-4">
                <MonitorIcon className="mt-0.5 text-primary" />
                <div className="flex flex-col gap-1">
                  <p className="font-medium">Ouvre FXMP OS pour lire ce PC</p>
                  <p className="text-sm text-muted-foreground">
                    Les mesures affichées ici viennent de Windows et ne sont pas
                    simulées dans le navigateur.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <Card className="border-destructive/50">
              <CardContent className="flex items-start gap-3 pt-4" role="alert">
                <TriangleAlertIcon className="mt-0.5 text-destructive" />
                <div className="flex flex-col gap-1">
                  <p className="font-medium">Lecture système impossible</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {displayError && (
            <Card className="border-muted">
              <CardContent className="flex items-start gap-3 pt-4">
                <MonitorIcon className="mt-0.5 text-muted-foreground" />
                <div className="flex flex-col gap-1">
                  <p className="font-medium">
                    Informations d’écran indisponibles
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Les autres mesures système restent affichées. {displayError}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading && !snapshot ? (
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
          ) : snapshot ? (
            <>
              <Card className="overflow-hidden">
                <CardContent className="flex flex-wrap items-center justify-between gap-5 p-5 md:p-6">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="rounded-xl border bg-primary/10 p-3 text-primary">
                      <MonitorIcon aria-hidden="true" className="size-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {machineName || "Ordinateur Windows"}
                      </p>
                      <h3 className="truncate text-xl font-semibold">
                        {snapshot.hostname}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {snapshot.osName || `Windows ${snapshot.osVersion}`} ·{" "}
                        {architectureLabel(snapshot.architecture)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={needsAttention ? "destructive" : "secondary"}>
                    {needsAttention ? (
                      <TriangleAlertIcon data-icon="inline-start" />
                    ) : (
                      <CheckCircle2Icon data-icon="inline-start" />
                    )}
                    {needsAttention ? "À surveiller" : "Ressources normales"}
                  </Badge>
                </CardContent>
              </Card>

              <section
                aria-label="Ressources système"
                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              >
                <MetricCard
                  detail={`${snapshot.physicalCores === null ? "Cœurs physiques indisponibles" : `${snapshot.physicalCores} cœurs physiques`} · ${snapshot.logicalProcessors} processeurs logiques${snapshot.cpuFrequencyMhz ? ` · ${numberFormat.format(snapshot.cpuFrequencyMhz / 1000)} GHz` : ""}`}
                  icon={CpuIcon}
                  label="Processeur"
                  value={snapshot.cpuName || "Non détecté"}
                />
                <MetricCard
                  detail={`${formatBytes(snapshot.memoryUsedBytes)} utilisés sur ${formatBytes(snapshot.memoryTotalBytes)}`}
                  icon={MemoryStickIcon}
                  label="Mémoire vive"
                  progress={memoryPercent}
                  value={`${memoryPercent} % utilisée`}
                />
                <MetricCard
                  detail={`${formatBytes(storage.available)} libres sur ${formatBytes(storage.total)} · ${snapshot.disks.length} volumes`}
                  icon={HardDriveIcon}
                  label="Stockage"
                  progress={storagePercent}
                  value={`${storagePercent} % occupé`}
                />
                <MetricCard
                  detail={
                    displays
                      ?.map((display) => `${display.width} × ${display.height}`)
                      .join(" · ") ||
                    (displays === null
                      ? "Résolutions indisponibles"
                      : "Écrans détectés par Windows")
                  }
                  icon={MonitorIcon}
                  label="Affichage"
                  value={
                    displays === null
                      ? "Indisponible"
                      : `${displays.length} écran${displays.length > 1 ? "s" : ""}`
                  }
                />
              </section>

              <section className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HardDriveIcon
                        aria-hidden="true"
                        className="text-primary"
                      />
                      Espace par volume
                    </CardTitle>
                    <CardDescription>
                      Capacité et espace libre des lecteurs locaux.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5">
                    {snapshot.disks.map((disk) => {
                      const diskPercent = percent(
                        disk.totalBytes - disk.availableBytes,
                        disk.totalBytes
                      )
                      return (
                        <div
                          className="flex flex-col gap-2"
                          key={`${disk.mountPoint}-${disk.fileSystem}`}
                        >
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium">
                              {disk.mountPoint}
                            </span>
                            <span className="text-muted-foreground">
                              {formatBytes(disk.availableBytes)} libres ·{" "}
                              {formatBytes(disk.totalBytes)}
                            </span>
                          </div>
                          <Progress
                            aria-label={`Occupation ${disk.mountPoint}`}
                            value={diskPercent}
                          />
                        </div>
                      )
                    })}
                    {snapshot.disks.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Aucun volume détecté.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <div className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldCheckIcon
                          aria-hidden="true"
                          className="text-primary"
                        />
                        État des ressources
                      </CardTitle>
                      <CardDescription>
                        Signaux calculés depuis les mesures locales.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      {memoryPercent >= 90 && (
                        <p className="flex items-start gap-2 text-sm text-destructive">
                          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                          La mémoire vive est utilisée à {memoryPercent} %.
                        </p>
                      )}
                      {lowSpaceDisks.map((disk) => (
                        <p
                          className="flex items-start gap-2 text-sm text-destructive"
                          key={disk.mountPoint}
                        >
                          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
                          Il reste {formatBytes(disk.availableBytes)} sur{" "}
                          {disk.mountPoint}.
                        </p>
                      ))}
                      {!needsAttention && (
                        <p className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                          Aucune alerte de mémoire ou d’espace disque.
                        </p>
                      )}
                      <div className="flex items-center gap-2 border-t pt-3 text-sm text-muted-foreground">
                        <Clock3Icon aria-hidden="true" className="size-4" />
                        Démarré depuis {formatUptime(snapshot.uptimeSeconds)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Layers3Icon
                          aria-hidden="true"
                          className="text-primary"
                        />
                        Carte graphique
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      {snapshot.graphicsAdapters?.length ? (
                        snapshot.graphicsAdapters.map((adapter) => (
                          <div
                            className="flex flex-col gap-1"
                            key={`${adapter.name}-${adapter.driverVersion}`}
                          >
                            <p className="font-medium">
                              {adapter.videoProcessor || adapter.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {adapter.name}
                              {adapter.driverVersion
                                ? ` · pilote ${adapter.driverVersion}`
                                : ""}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Aucune carte graphique détectée.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section
                className="grid gap-4 sm:grid-cols-3"
                aria-label="Accès rapides"
              >
                <QuickLink
                  href="/apps/"
                  icon={AppWindowIcon}
                  label="Applications installées"
                  detail="Rechercher et consulter les logiciels détectés."
                />
                <QuickLink
                  href="/account/"
                  icon={MonitorIcon}
                  label="Détails de l’appareil"
                  detail="Voir le matériel et les informations Windows."
                />
                <QuickLink
                  href="/settings/"
                  icon={Layers3Icon}
                  label="Overlay et paramètres"
                  detail="Régler l’overlay, le démarrage et les mises à jour."
                />
              </section>
              <p className="text-xs text-muted-foreground">
                Mesures locales lues à la demande. Les alertes mémoire et
                stockage sont des repères, pas un diagnostic matériel.
              </p>
            </>
          ) : null}
        </div>
      </main>
    </AppShell>
  )
}

function QuickLink({
  href,
  icon: Icon,
  label,
  detail,
}: {
  href: string
  icon: typeof AppWindowIcon
  label: string
  detail: string
}) {
  return (
    <Link
      className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href={href}
    >
      <Card className="h-full transition-colors group-hover:bg-muted/40">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-md border bg-background p-2 text-primary">
            <Icon aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">{detail}</p>
          </div>
          <ArrowRightIcon
            aria-hidden="true"
            className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          />
        </CardContent>
      </Card>
    </Link>
  )
}

export function HomeDashboard() {
  return <HomeContent />
}

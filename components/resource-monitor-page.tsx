"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIcon,
  CpuIcon,
  GaugeIcon,
  MemoryStickIcon,
  MonitorIcon,
  NetworkIcon,
  PauseIcon,
  PlayIcon,
  SearchIcon,
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { AppShell } from "@/components/app-shell"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTauriRuntime } from "@/hooks/use-tauri-runtime"
import {
  loadResourceHistory,
  saveResourceHistory,
  type ResourceHistoryPoint,
} from "@/lib/resource-history"
import { trackedInvoke } from "@/lib/tauri"

type ResourceProcess = {
  name: string
  pid: string
  cpuPercent: number
  memoryBytes: number
}

type ResourceSample = {
  hostname: string
  sampledAtMs: number
  cpuPercent: number
  memoryTotalBytes: number
  memoryUsedBytes: number
  gpuAdapters: { adapterIndex: number; utilizationPercent: number }[] | null
  processes: ResourceProcess[]
  processCount: number
}

type NetworkEndpoint = {
  protocol: "TCP" | "UDP"
  localAddress: string
  localPort: number
  remoteAddress: string | null
  remotePort: number | null
  state: string
  pid: number
  processName: string | null
}

type NetworkEndpointSnapshot = {
  sampledAtMs: number
  endpoints: NetworkEndpoint[]
}

type HistoryPoint = {
  sampledAtMs: number
  cpu: number
  memory: number
}

type HistoryRange = "minute" | "hour" | "day"
type MinuteAccumulator = ResourceHistoryPoint & {
  cpuTotal: number
  memoryTotal: number
  sampleCount: number
}

const HISTORY_RANGE_MS: Record<HistoryRange, number> = {
  minute: 60_000,
  hour: 60 * 60_000,
  day: 24 * 60 * 60_000,
}
const HISTORY_RANGE_LABEL: Record<HistoryRange, string> = {
  minute: "1 min",
  hour: "1 h",
  day: "24 h",
}

const numberFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
})

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${numberFormat.format(bytes / 1024 ** 3)} Go`
  return `${numberFormat.format(bytes / 1024 ** 2)} Mo`
}

function percent(used: number, total: number) {
  return total > 0 ? Math.max(0, Math.min(100, (used / total) * 100)) : 0
}

function ResourceChart({
  data,
  dataKey,
  color,
  label,
  range,
}: {
  data: HistoryPoint[]
  dataKey: "cpu" | "memory"
  color: string
  label: string
  range: HistoryRange
}) {
  const chartConfig = {
    [dataKey]: { label, color },
  } satisfies ChartConfig

  return (
    <div className="h-36 w-full" role="img" aria-label={`Historique ${label}`}>
      <ChartContainer
        className="aspect-auto h-full w-full"
        config={chartConfig}
      >
        <AreaChart
          data={data}
          margin={{ top: 8, right: 4, left: -28, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            className="stroke-border/50"
          />
          <XAxis
            dataKey="sampledAtMs"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
            tickFormatter={(value: number) =>
              new Intl.DateTimeFormat("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
                ...(range === "minute" ? { second: "2-digit" as const } : {}),
              }).format(value)
            }
            className="fill-muted-foreground text-[10px]"
          />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `${value}%`}
            className="fill-muted-foreground text-[10px]"
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value) =>
                  `À ${new Intl.DateTimeFormat("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  }).format(Number(value))}`
                }
                formatter={(value) => `${numberFormat.format(Number(value))} %`}
              />
            }
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={`var(--color-${dataKey})`}
            strokeWidth={2}
            fill={`var(--color-${dataKey})`}
            fillOpacity={0.16}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

function ResourceMonitorContent() {
  const runtime = useTauriRuntime()
  const [sample, setSample] = useState<ResourceSample | null>(null)
  const [networkSnapshot, setNetworkSnapshot] =
    useState<NetworkEndpointSnapshot | null>(null)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [savedHistory, setSavedHistory] = useState<ResourceHistoryPoint[]>([])
  const savedHistoryRef = useRef<ResourceHistoryPoint[]>([])
  const [historyRange, setHistoryRange] = useState<HistoryRange>("minute")
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [endpointError, setEndpointError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [sortBy, setSortBy] = useState<"memoryBytes" | "cpuPercent" | "name">(
    "memoryBytes"
  )
  const [endpointFilter, setEndpointFilter] = useState<
    "all" | "listening" | "tcp" | "udp"
  >("all")
  const [paused, setPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inFlight = useRef(false)
  const endpointsInFlight = useRef(false)
  const historyReady = useRef(false)
  const minuteAccumulator = useRef<MinuteAccumulator | null>(null)

  useEffect(() => {
    if (runtime !== true) return
    let cancelled = false
    void loadResourceHistory()
      .then((points) => {
        if (!cancelled) {
          historyReady.current = true
          savedHistoryRef.current = points
          setSavedHistory(points)
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          historyReady.current = true
          setHistoryError(
            cause instanceof Error ? cause.message : String(cause)
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [runtime])

  const persistHistoryPoint = useCallback((point: ResourceHistoryPoint) => {
    if (!historyReady.current) return
    const updated = [
      ...savedHistoryRef.current.filter(
        (entry) => entry.sampledAtMs !== point.sampledAtMs
      ),
      point,
    ]
      .sort((left, right) => left.sampledAtMs - right.sampledAtMs)
      .slice(-1_440)
    savedHistoryRef.current = updated
    setSavedHistory(updated)
    void saveResourceHistory(updated).then(
      () => setHistoryError(null),
      (cause: unknown) =>
        setHistoryError(cause instanceof Error ? cause.message : String(cause))
    )
  }, [])

  const flushMinuteAccumulator = useCallback(() => {
    const current = minuteAccumulator.current
    if (!current || !historyReady.current) return
    minuteAccumulator.current = null
    persistHistoryPoint({
      sampledAtMs: current.sampledAtMs,
      cpuPercent: current.cpuTotal / current.sampleCount,
      memoryPercent: current.memoryTotal / current.sampleCount,
      sampleCount: current.sampleCount,
    })
  }, [persistHistoryPoint])

  const refresh = useCallback(async () => {
    if (
      runtime !== true ||
      !historyReady.current ||
      document.hidden ||
      inFlight.current
    )
      return
    inFlight.current = true
    setIsLoading(true)
    try {
      const next = await trackedInvoke<ResourceSample>("get_resource_sample")
      setSample(next)
      setError(null)
      const memoryPercent = percent(next.memoryUsedBytes, next.memoryTotalBytes)
      setHistory((current) =>
        [
          ...current,
          {
            sampledAtMs: next.sampledAtMs,
            cpu: next.cpuPercent,
            memory: memoryPercent,
          },
        ].slice(-30)
      )

      const minuteStartMs = Math.floor(next.sampledAtMs / 60_000) * 60_000
      const currentMinute = minuteAccumulator.current
      if (!currentMinute) {
        const previousMinute = savedHistoryRef.current.find(
          (point) => point.sampledAtMs === minuteStartMs
        )
        const previousCount = previousMinute?.sampleCount ?? 0
        minuteAccumulator.current = {
          sampledAtMs: minuteStartMs,
          cpuPercent: 0,
          memoryPercent: 0,
          cpuTotal:
            (previousMinute?.cpuPercent ?? 0) * previousCount + next.cpuPercent,
          memoryTotal:
            (previousMinute?.memoryPercent ?? 0) * previousCount +
            memoryPercent,
          sampleCount: previousCount + 1,
        }
      } else if (currentMinute.sampledAtMs === minuteStartMs) {
        currentMinute.cpuTotal += next.cpuPercent
        currentMinute.memoryTotal += memoryPercent
        currentMinute.sampleCount += 1
      } else {
        const archivedPoint: ResourceHistoryPoint = {
          sampledAtMs: currentMinute.sampledAtMs,
          cpuPercent: currentMinute.cpuTotal / currentMinute.sampleCount,
          memoryPercent: currentMinute.memoryTotal / currentMinute.sampleCount,
          sampleCount: currentMinute.sampleCount,
        }
        persistHistoryPoint(archivedPoint)
        minuteAccumulator.current = {
          sampledAtMs: minuteStartMs,
          cpuPercent: next.cpuPercent,
          memoryPercent,
          cpuTotal: next.cpuPercent,
          memoryTotal: memoryPercent,
          sampleCount: 1,
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      inFlight.current = false
      setIsLoading(false)
    }
  }, [persistHistoryPoint, runtime])

  const refreshEndpoints = useCallback(async () => {
    if (
      runtime !== true ||
      paused ||
      document.hidden ||
      endpointsInFlight.current
    )
      return
    endpointsInFlight.current = true
    try {
      const result = await trackedInvoke<NetworkEndpointSnapshot>(
        "get_network_endpoints"
      )
      setNetworkSnapshot(result)
      setEndpointError(null)
    } catch (cause) {
      setEndpointError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      endpointsInFlight.current = false
    }
  }, [paused, runtime])

  useEffect(() => {
    if (runtime !== true || paused) return
    const initialSample = window.setTimeout(() => void refresh(), 0)
    const initialEndpoints = window.setTimeout(() => void refreshEndpoints(), 0)
    const timer = window.setInterval(() => void refresh(), 2000)
    const endpointTimer = window.setInterval(
      () => void refreshEndpoints(),
      5000
    )
    const onVisibility = () => {
      if (!document.hidden) {
        void refresh()
        void refreshEndpoints()
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.clearTimeout(initialSample)
      window.clearTimeout(initialEndpoints)
      window.clearInterval(timer)
      window.clearInterval(endpointTimer)
      document.removeEventListener("visibilitychange", onVisibility)
      flushMinuteAccumulator()
    }
  }, [flushMinuteAccumulator, paused, refresh, refreshEndpoints, runtime])

  const processes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr-FR")
    return [...(sample?.processes ?? [])]
      .filter(
        (process) =>
          process.name.toLocaleLowerCase("fr-FR").includes(normalizedQuery) ||
          process.pid.includes(normalizedQuery)
      )
      .sort((left, right) => {
        if (sortBy === "name") return left.name.localeCompare(right.name, "fr")
        return right[sortBy] - left[sortBy]
      })
  }, [query, sample?.processes, sortBy])

  const memoryPercent = sample
    ? percent(sample.memoryUsedBytes, sample.memoryTotalBytes)
    : 0

  const visibleHistory = useMemo(() => {
    const newestSampleMs =
      sample?.sampledAtMs ??
      history.at(-1)?.sampledAtMs ??
      savedHistory.at(-1)?.sampledAtMs ??
      0
    if (historyRange === "minute") {
      const cutoff = newestSampleMs - HISTORY_RANGE_MS.minute
      return history.filter((point) => point.sampledAtMs >= cutoff)
    }
    const cutoff = newestSampleMs - HISTORY_RANGE_MS[historyRange]
    const archived = savedHistory
      .filter((point) => point.sampledAtMs >= cutoff)
      .map((point) => ({
        sampledAtMs: point.sampledAtMs,
        cpu: point.cpuPercent,
        memory: point.memoryPercent,
      }))
    if (sample) {
      archived.push({
        sampledAtMs: sample.sampledAtMs,
        cpu: sample.cpuPercent,
        memory: memoryPercent,
      })
    }
    return archived.sort((left, right) => left.sampledAtMs - right.sampledAtMs)
  }, [history, historyRange, memoryPercent, sample, savedHistory])

  const endpoints = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr-FR")
    return (networkSnapshot?.endpoints ?? []).filter((endpoint) => {
      if (endpointFilter === "listening" && endpoint.state !== "À l’écoute")
        return false
      if (endpointFilter === "tcp" && endpoint.protocol !== "TCP") return false
      if (endpointFilter === "udp" && endpoint.protocol !== "UDP") return false
      if (!normalizedQuery) return true
      return [
        endpoint.processName,
        endpoint.pid.toString(),
        endpoint.protocol,
        endpoint.localAddress,
        endpoint.localPort.toString(),
        endpoint.remoteAddress,
        endpoint.remotePort?.toString(),
        endpoint.state,
      ].some((value) =>
        value?.toLocaleLowerCase("fr-FR").includes(normalizedQuery)
      )
    })
  }, [endpointFilter, networkSnapshot?.endpoints, query])

  return (
    <AppShell title="Ressources">
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-6 md:px-8">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Badge className="w-fit" variant="outline">
                <ActivityIcon aria-hidden="true" data-icon="inline-start" />
                Moniteur local
              </Badge>
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Ressources système
                </h2>
                <p className="text-sm text-muted-foreground">
                  {sample?.hostname ? `${sample.hostname} · ` : ""}Suivez le
                  processeur, la mémoire et les processus Windows en temps réel.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant={paused || runtime !== true ? "secondary" : "outline"}
              >
                <span
                  className={`size-1.5 rounded-full ${paused || runtime !== true ? "bg-muted-foreground" : "animate-pulse bg-emerald-500"}`}
                />
                {runtime !== true
                  ? "En attente de FXMP OS"
                  : paused
                    ? "En pause"
                    : "En direct · 2 s"}
              </Badge>
              <Button
                disabled={runtime !== true}
                onClick={() => setPaused((value) => !value)}
                variant="outline"
              >
                {paused ? (
                  <PlayIcon data-icon="inline-start" />
                ) : (
                  <PauseIcon data-icon="inline-start" />
                )}
                {paused ? "Reprendre" : "Pause"}
              </Button>
            </div>
          </header>

          {runtime === false && (
            <Card>
              <CardContent className="flex items-center gap-3 pt-4">
                <MonitorIcon className="text-primary" />
                <p className="text-sm">
                  Ouvrez FXMP OS pour accéder aux mesures réelles de ce PC.
                </p>
              </CardContent>
            </Card>
          )}
          {error && (
            <Alert variant="destructive">
              <ActivityIcon />
              <AlertDescription>
                La lecture des ressources a échoué : {error}
              </AlertDescription>
            </Alert>
          )}

          <section
            aria-label="Mesures actuelles"
            className="grid gap-4 lg:grid-cols-3"
          >
            <Card>
              <CardHeader className="grid-cols-[1fr_auto]">
                <CardDescription className="flex items-center gap-2">
                  <CpuIcon aria-hidden="true" className="size-4" /> Processeur
                </CardDescription>
                <Badge className="row-span-2" variant="secondary">
                  {sample ? `${numberFormat.format(sample.cpuPercent)} %` : "—"}
                </Badge>
                <CardTitle className="text-2xl tabular-nums">
                  {sample
                    ? `${numberFormat.format(sample.cpuPercent)} %`
                    : "En attente"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResourceChart
                  color="var(--chart-1)"
                  data={visibleHistory}
                  dataKey="cpu"
                  label="CPU"
                  range={historyRange}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="grid-cols-[1fr_auto]">
                <CardDescription className="flex items-center gap-2">
                  <MemoryStickIcon aria-hidden="true" className="size-4" />{" "}
                  Mémoire vive
                </CardDescription>
                <Badge className="row-span-2" variant="secondary">
                  {sample ? `${Math.round(memoryPercent)} %` : "—"}
                </Badge>
                <CardTitle className="text-2xl tabular-nums">
                  {sample ? formatBytes(sample.memoryUsedBytes) : "En attente"}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <ResourceChart
                  color="var(--chart-2)"
                  data={visibleHistory}
                  dataKey="memory"
                  label="Mémoire"
                  range={historyRange}
                />
                <Progress
                  aria-label="Utilisation de la mémoire vive"
                  value={memoryPercent}
                />
                <p className="text-xs text-muted-foreground">
                  {sample
                    ? `sur ${formatBytes(sample.memoryTotalBytes)} · ${formatBytes(sample.memoryTotalBytes - sample.memoryUsedBytes)} libres`
                    : "Les mesures s’afficheront après la première lecture."}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="grid-cols-[1fr_auto]">
                <CardDescription className="flex items-center gap-2">
                  <GaugeIcon aria-hidden="true" className="size-4" /> GPU
                </CardDescription>
                <Badge className="row-span-2" variant="secondary">
                  {sample?.gpuAdapters?.length
                    ? `${numberFormat.format(Math.max(...sample.gpuAdapters.map((adapter) => adapter.utilizationPercent)))} %`
                    : "Indisponible"}
                </Badge>
                <CardTitle className="text-2xl tabular-nums">
                  {sample?.gpuAdapters?.length
                    ? `${numberFormat.format(Math.max(...sample.gpuAdapters.map((adapter) => adapter.utilizationPercent)))} %`
                    : "Non mesuré"}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {sample?.gpuAdapters?.length ? (
                  sample.gpuAdapters.map((adapter) => (
                    <div
                      className="flex flex-col gap-2"
                      key={adapter.adapterIndex}
                    >
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>GPU {adapter.adapterIndex}</span>
                        <span>
                          {numberFormat.format(adapter.utilizationPercent)} %
                        </span>
                      </div>
                      <Progress
                        aria-label={`Utilisation du GPU ${adapter.adapterIndex}`}
                        value={adapter.utilizationPercent}
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Les compteurs GPU Windows ne sont pas disponibles sur cet
                    appareil.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Mesure des moteurs GPU Windows · actualisée toutes les 2 s.
                </p>
              </CardContent>
            </Card>
          </section>

          <section
            aria-label="Période de l’historique"
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <h3 className="text-sm font-medium">Historique CPU et mémoire</h3>
              <p className="text-xs text-muted-foreground">
                {historyRange === "minute"
                  ? "Échantillons en direct, actualisés toutes les 2 secondes."
                  : "Moyennes par minute enregistrées localement pendant 24 heures."}
              </p>
            </div>
            <div
              className="flex gap-2"
              role="group"
              aria-label="Période affichée"
            >
              {(Object.keys(HISTORY_RANGE_LABEL) as HistoryRange[]).map(
                (range) => (
                  <Button
                    key={range}
                    size="sm"
                    variant={historyRange === range ? "secondary" : "outline"}
                    aria-pressed={historyRange === range}
                    onClick={() => setHistoryRange(range)}
                  >
                    {HISTORY_RANGE_LABEL[range]}
                  </Button>
                )
              )}
            </div>
          </section>
          {historyError && (
            <p className="text-sm text-muted-foreground" role="status">
              L’historique local ne peut pas être enregistré : {historyError}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Seules les moyennes CPU et mémoire sont conservées localement. Les
            noms et PID des processus et les ports réseau ne sont pas
            historisés.
          </p>

          <Tabs defaultValue="processus" className="gap-4">
            <TabsList>
              <TabsTrigger value="processus">Processus</TabsTrigger>
              <TabsTrigger value="ports">
                <NetworkIcon data-icon="inline-start" /> Ports réseau
                {networkSnapshot && (
                  <Badge className="ml-1" variant="secondary">
                    {networkSnapshot.endpoints.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="processus" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <CardTitle>Processus</CardTitle>
                      <CardDescription>
                        {sample
                          ? `${sample.processCount} processus détectés · jusqu’à 25 meilleurs en CPU et 25 en mémoire sont listés`
                          : "Les mesures des processus apparaîtront après la première lecture."}
                      </CardDescription>
                    </div>
                    <div className="relative w-full sm:w-72">
                      <SearchIcon
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        aria-label="Rechercher un processus"
                        className="pl-8"
                        onChange={(event) =>
                          setQuery(event.currentTarget.value)
                        }
                        placeholder="Rechercher un processus…"
                        value={query}
                      />
                    </div>
                  </div>
                  <div
                    aria-label="Trier les processus"
                    className="flex flex-wrap gap-2"
                  >
                    <Button
                      onClick={() => setSortBy("memoryBytes")}
                      size="sm"
                      variant={
                        sortBy === "memoryBytes" ? "secondary" : "outline"
                      }
                    >
                      Mémoire
                    </Button>
                    <Button
                      onClick={() => setSortBy("cpuPercent")}
                      size="sm"
                      variant={
                        sortBy === "cpuPercent" ? "secondary" : "outline"
                      }
                    >
                      CPU
                    </Button>
                    <Button
                      onClick={() => setSortBy("name")}
                      size="sm"
                      variant={sortBy === "name" ? "secondary" : "outline"}
                    >
                      Nom
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Processus</TableHead>
                        <TableHead className="w-24">PID</TableHead>
                        <TableHead className="text-right">Processeur</TableHead>
                        <TableHead className="text-right">Mémoire</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processes.map((process) => (
                        <TableRow key={`${process.pid}-${process.name}`}>
                          <TableCell
                            className="max-w-80 truncate font-medium"
                            title={process.name}
                          >
                            {process.name || "Processus Windows"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {process.pid}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {numberFormat.format(process.cpuPercent)} %
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatBytes(process.memoryBytes)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {processes.length === 0 && (
                        <TableRow>
                          <TableCell
                            className="h-20 text-center text-muted-foreground"
                            colSpan={4}
                          >
                            {isLoading
                              ? "Lecture des processus…"
                              : query
                                ? "Aucun processus ne correspond à cette recherche."
                                : "Aucun processus disponible."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="ports" className="mt-0">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <CardTitle>Ports et connexions</CardTitle>
                      <CardDescription>
                        {networkSnapshot
                          ? `${networkSnapshot.endpoints.length} endpoints locaux · actualisation toutes les 5 s`
                          : "Lecture des tables TCP et UDP de Windows…"}
                      </CardDescription>
                      {endpointError && (
                        <p className="text-sm text-destructive" role="status">
                          {networkSnapshot
                            ? `Actualisation impossible; données précédentes conservées. ${endpointError}`
                            : `Lecture des ports impossible. ${endpointError}`}
                        </p>
                      )}
                    </div>
                    <div className="relative w-full sm:w-72">
                      <SearchIcon
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground"
                      />
                      <Input
                        aria-label="Rechercher un port ou processus"
                        className="pl-8"
                        onChange={(event) =>
                          setQuery(event.currentTarget.value)
                        }
                        placeholder="Port, processus, PID…"
                        value={query}
                      />
                    </div>
                  </div>
                  <div
                    className="flex flex-wrap gap-2"
                    aria-label="Filtrer les endpoints"
                  >
                    {(
                      [
                        ["all", "Tout"],
                        ["listening", "À l’écoute"],
                        ["tcp", "TCP"],
                        ["udp", "UDP"],
                      ] as const
                    ).map(([value, label]) => (
                      <Button
                        key={value}
                        onClick={() => setEndpointFilter(value)}
                        size="sm"
                        variant={
                          endpointFilter === value ? "secondary" : "outline"
                        }
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[34rem] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead>Protocole</TableHead>
                          <TableHead>Adresse locale</TableHead>
                          <TableHead>Destination distante</TableHead>
                          <TableHead>État</TableHead>
                          <TableHead>Processus</TableHead>
                          <TableHead className="text-right">PID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {endpoints.map((endpoint, index) => (
                          <TableRow
                            key={`${endpoint.protocol}-${endpoint.localAddress}-${endpoint.localPort}-${endpoint.pid}-${index}`}
                          >
                            <TableCell>
                              <Badge
                                variant={
                                  endpoint.protocol === "TCP"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {endpoint.protocol}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {endpoint.localAddress}:{endpoint.localPort}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {endpoint.remoteAddress
                                ? `${endpoint.remoteAddress}:${endpoint.remotePort}`
                                : "—"}
                            </TableCell>
                            <TableCell>{endpoint.state}</TableCell>
                            <TableCell
                              className="max-w-56 truncate font-medium"
                              title={endpoint.processName ?? undefined}
                            >
                              {endpoint.processName ??
                                "Processus protégé ou terminé"}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground tabular-nums">
                              {endpoint.pid}
                            </TableCell>
                          </TableRow>
                        ))}
                        {endpoints.length === 0 && (
                          <TableRow>
                            <TableCell
                              className="h-20 text-center text-muted-foreground"
                              colSpan={6}
                            >
                              {networkSnapshot
                                ? "Aucun port ne correspond aux filtres."
                                : "Lecture des ports Windows…"}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Lecture locale en mode observation seule des tables IP
                    Helper Windows (IPv4/IPv6). L’état « À l’écoute » ne
                    garantit pas que le port est joignable depuis Internet: le
                    pare-feu et le routeur peuvent bloquer l’accès. Les
                    destinations sont des adresses IP; aucun nom d’hôte, contenu
                    réseau ou donnée n’est transmis. Les PID système protégés
                    peuvent ne pas révéler le nom de leur processus.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground">
            Les mesures sont lues localement toutes les deux secondes,
            uniquement lorsque cette fenêtre est visible. L’historique reste en
            mémoire pendant la session. FXMP OS ne collecte ni chemins
            d’exécution ni lignes de commande et ne transmet aucune mesure.
          </p>
        </div>
      </main>
    </AppShell>
  )
}

export function ResourceMonitorPage() {
  return <ResourceMonitorContent />
}

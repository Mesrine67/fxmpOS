"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIcon,
  CpuIcon,
  MemoryStickIcon,
  MonitorIcon,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useTauriRuntime } from "@/hooks/use-tauri-runtime"
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
  processes: ResourceProcess[]
  processCount: number
}

type HistoryPoint = {
  time: string
  cpu: number
  memory: number
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
}: {
  data: HistoryPoint[]
  dataKey: "cpu" | "memory"
  color: string
  label: string
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
            dataKey="time"
            tickLine={false}
            axisLine={false}
            minTickGap={28}
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
                labelFormatter={(value) => `À ${value}`}
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
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [sortBy, setSortBy] = useState<"memoryBytes" | "cpuPercent" | "name">(
    "memoryBytes"
  )
  const [paused, setPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (runtime !== true || document.hidden || inFlight.current) return
    inFlight.current = true
    setIsLoading(true)
    try {
      const next = await trackedInvoke<ResourceSample>("get_resource_sample")
      setSample(next)
      setError(null)
      setHistory((current) =>
        [
          ...current,
          {
            time: new Intl.DateTimeFormat("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }).format(next.sampledAtMs),
            cpu: next.cpuPercent,
            memory: percent(next.memoryUsedBytes, next.memoryTotalBytes),
          },
        ].slice(-30)
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      inFlight.current = false
      setIsLoading(false)
    }
  }, [runtime])

  useEffect(() => {
    if (runtime !== true || paused) return
    const initialSample = window.setTimeout(() => void refresh(), 0)
    const timer = window.setInterval(() => void refresh(), 2000)
    const onVisibility = () => {
      if (!document.hidden) void refresh()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.clearTimeout(initialSample)
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [paused, refresh, runtime])

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
            className="grid gap-4 lg:grid-cols-2"
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
                  data={history}
                  dataKey="cpu"
                  label="CPU"
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
                  data={history}
                  dataKey="memory"
                  label="Mémoire"
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
          </section>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <CardTitle>Processus</CardTitle>
                  <CardDescription>
                    {sample
                      ? `${sample.processCount} processus détectés · les 50 plus gourmands en mémoire sont listés`
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
                    onChange={(event) => setQuery(event.currentTarget.value)}
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
                  variant={sortBy === "memoryBytes" ? "secondary" : "outline"}
                >
                  Mémoire
                </Button>
                <Button
                  onClick={() => setSortBy("cpuPercent")}
                  size="sm"
                  variant={sortBy === "cpuPercent" ? "secondary" : "outline"}
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

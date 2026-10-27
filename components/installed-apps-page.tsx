"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AppWindowIcon,
  CalendarDaysIcon,
  HardDriveIcon,
  LayoutGridIcon,
  ListIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react"

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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
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

type InstalledApp = {
  name: string
  publisher: string | null
  version: string | null
  installDate: string | null
  estimatedSizeBytes: number | null
  scope: string
}

type ScopeFilter = "all" | "Utilisateur courant" | "Tous les utilisateurs"
type SortMode = "name" | "size" | "date"
type ViewMode = "list" | "grid"

const numberFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
})

function formatSize(bytes: number | null) {
  if (bytes === null) return "Taille non déclarée"
  if (bytes < 1024 ** 2)
    return `${numberFormat.format(bytes / 1024)} Ko déclarés`
  if (bytes < 1024 ** 3)
    return `${numberFormat.format(bytes / 1024 ** 2)} Mo déclarés`
  return `${numberFormat.format(bytes / 1024 ** 3)} Go déclarés`
}

function formatDate(value: string | null) {
  if (!value) return "Date inconnue"
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? "Date inconnue"
    : date.toLocaleDateString("fr-FR")
}

function AppDetails({ app }: { app: InstalledApp }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
        <AppWindowIcon aria-hidden="true" className="size-5" />
      </div>
      <div className="min-w-0 space-y-1">
        <p className="truncate font-medium" title={app.name}>
          {app.name}
        </p>
        <p
          className="truncate text-xs text-muted-foreground"
          title={app.publisher ?? undefined}
        >
          {app.publisher || "Éditeur non renseigné"}
        </p>
      </div>
    </div>
  )
}

export function InstalledAppsPage() {
  const runtime = useTauriRuntime()
  const [apps, setApps] = useState<InstalledApp[]>([])
  const [query, setQuery] = useState("")
  const [scope, setScope] = useState<ScopeFilter>("all")
  const [sort, setSort] = useState<SortMode>("name")
  const [view, setView] = useState<ViewMode>("list")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadApps = useCallback(async () => {
    setLoading(true)
    try {
      const result = await trackedInvoke<InstalledApp[]>("get_installed_apps")
      setApps(result)
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (runtime !== true) return
    const timer = window.setTimeout(() => void loadApps(), 0)
    return () => window.clearTimeout(timer)
  }, [loadApps, runtime])

  const filteredApps = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr-FR")
    return apps
      .filter((app) => {
        const matchesQuery = [app.name, app.publisher, app.version]
          .filter(Boolean)
          .some((value) =>
            value!.toLocaleLowerCase("fr-FR").includes(normalizedQuery)
          )
        const matchesScope = scope === "all" || app.scope === scope
        return matchesQuery && matchesScope
      })
      .sort((left, right) => {
        if (sort === "size")
          return (
            (right.estimatedSizeBytes ?? -1) -
              (left.estimatedSizeBytes ?? -1) ||
            left.name.localeCompare(right.name, "fr")
          )
        if (sort === "date")
          return (
            (right.installDate ?? "").localeCompare(left.installDate ?? "") ||
            left.name.localeCompare(right.name, "fr")
          )
        return left.name.localeCompare(right.name, "fr", {
          sensitivity: "base",
        })
      })
  }, [apps, query, scope, sort])

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Badge variant="outline">
              <AppWindowIcon aria-hidden="true" data-icon="inline-start" />
              Windows
            </Badge>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                Applications installées
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Parcourez les logiciels détectés sur ce PC, recherchez un
                éditeur ou une version et organisez la liste.
              </p>
            </div>
          </div>
          <Button
            disabled={loading || runtime !== true}
            onClick={() => void loadApps()}
            type="button"
            variant="outline"
          >
            <RefreshCwIcon
              className={loading ? "animate-spin" : undefined}
              data-icon="inline-start"
            />
            Actualiser
          </Button>
        </header>

        <Card>
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>
                  {loading
                    ? "Lecture…"
                    : `${filteredApps.length} application${filteredApps.length === 1 ? "" : "s"}`}
                </CardTitle>
                <CardDescription>
                  {query || scope !== "all"
                    ? `${apps.length} entrées détectées au total`
                    : "Logiciels de bureau détectés dans le registre Windows."}
                </CardDescription>
              </div>
              <ToggleGroup
                aria-label="Présentation des applications"
                onValueChange={(values) => {
                  const selected = values[0]
                  if (selected === "list" || selected === "grid")
                    setView(selected)
                }}
                value={[view]}
                variant="outline"
                spacing={0}
              >
                <ToggleGroupItem aria-label="Vue liste" value="list">
                  <ListIcon />
                  Liste
                </ToggleGroupItem>
                <ToggleGroupItem aria-label="Vue grille" value="grid">
                  <LayoutGridIcon />
                  Grille
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(15rem,1fr)_auto_auto]">
              <div className="relative">
                <SearchIcon
                  aria-hidden="true"
                  className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-label="Rechercher une application"
                  className="pl-9"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher par nom, éditeur ou version…"
                  type="search"
                  value={query}
                />
              </div>
              <Select
                onValueChange={(value) => {
                  if (value) setScope(value as ScopeFilter)
                }}
                value={scope}
              >
                <SelectTrigger
                  aria-label="Filtrer par installation"
                  className="w-full md:w-52"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les installations</SelectItem>
                  <SelectItem value="Utilisateur courant">
                    Utilisateur actuel
                  </SelectItem>
                  <SelectItem value="Tous les utilisateurs">
                    Tous les utilisateurs
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                onValueChange={(value) => {
                  if (value) setSort(value as SortMode)
                }}
                value={sort}
              >
                <SelectTrigger
                  aria-label="Trier les applications"
                  className="w-full md:w-48"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nom, A à Z</SelectItem>
                  <SelectItem value="size">Taille déclarée</SelectItem>
                  <SelectItem value="date">Date d’installation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {runtime === false ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <AppWindowIcon />
                  </EmptyMedia>
                  <EmptyTitle>Disponible dans FXMP OS</EmptyTitle>
                  <EmptyDescription>
                    Ouvre cette page dans l’application Windows pour lire les
                    logiciels installés localement.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : loading ? (
              <div
                className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"
                role="status"
              >
                <LoaderCircleIcon className="size-4 animate-spin" />
                Lecture locale du registre Windows…
              </div>
            ) : error ? (
              <div
                className="flex flex-col items-center gap-3 py-10 text-center"
                role="alert"
              >
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  onClick={() => void loadApps()}
                  type="button"
                  variant="outline"
                >
                  Réessayer
                </Button>
              </div>
            ) : filteredApps.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <SearchIcon />
                  </EmptyMedia>
                  <EmptyTitle>
                    {query || scope !== "all"
                      ? "Aucun résultat"
                      : "Aucune application détectée"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {query || scope !== "all"
                      ? "Modifie les filtres ou essaie une autre recherche."
                      : "Aucune entrée de logiciel de bureau n’a été trouvée."}
                  </EmptyDescription>
                </EmptyHeader>
                {(query || scope !== "all") && (
                  <Button
                    onClick={() => {
                      setQuery("")
                      setScope("all")
                    }}
                    variant="outline"
                  >
                    Effacer les filtres
                  </Button>
                )}
              </Empty>
            ) : view === "list" ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Installation</TableHead>
                    <TableHead className="text-right">
                      Taille déclarée
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApps.map((app, index) => (
                    <TableRow
                      key={`${app.name}-${app.version}-${app.publisher}-${index}`}
                    >
                      <TableCell className="min-w-64">
                        <AppDetails app={app} />
                      </TableCell>
                      <TableCell>
                        {app.version ? (
                          <Badge variant="secondary">{app.version}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="outline">{app.scope}</Badge>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(app.installDate)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center justify-end gap-1.5 text-muted-foreground">
                          <HardDriveIcon
                            aria-hidden="true"
                            className="size-3.5"
                          />
                          {formatSize(app.estimatedSizeBytes)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredApps.map((app, index) => (
                  <Card
                    key={`${app.name}-${app.version}-${app.publisher}-${index}`}
                    size="sm"
                  >
                    <CardHeader className="gap-3">
                      <AppDetails app={app} />
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{app.scope}</Badge>
                        {app.version && (
                          <Badge variant="secondary">v{app.version}</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <HardDriveIcon
                          aria-hidden="true"
                          className="size-3.5"
                        />
                        {formatSize(app.estimatedSizeBytes)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDaysIcon
                          aria-hidden="true"
                          className="size-3.5"
                        />
                        {formatDate(app.installDate)}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
              Les tailles viennent des valeurs déclarées par les programmes et
              ne représentent pas toujours l’espace réel utilisé. Cette page est
              en lecture seule : elle n’exécute aucune désinstallation et ne lit
              ni chemins d’installation ni commandes de suppression. Les
              applications Microsoft Store sans entrée de bureau peuvent
              manquer.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

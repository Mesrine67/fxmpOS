"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AppWindowIcon,
  CalendarDaysIcon,
  HardDriveIcon,
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
import { Input } from "@/components/ui/input"
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

const bytesFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 })

function formatSize(bytes: number | null) {
  if (bytes === null) return "Taille non déclarée"
  if (bytes < 1024 ** 2)
    return `${bytesFormat.format(bytes / 1024)} Ko déclarés`
  if (bytes < 1024 ** 3)
    return `${bytesFormat.format(bytes / 1024 ** 2)} Mo déclarés`
  return `${bytesFormat.format(bytes / 1024 ** 3)} Go déclarés`
}

export function InstalledAppsPage() {
  const runtime = useTauriRuntime()
  const [apps, setApps] = useState<InstalledApp[]>([])
  const [query, setQuery] = useState("")
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
    return apps.filter((app) =>
      [app.name, app.publisher, app.version]
        .filter(Boolean)
        .some((value) =>
          value!.toLocaleLowerCase("fr-FR").includes(normalizedQuery)
        )
    )
  }, [apps, query])

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
                Recherche locale dans les entrées de désinstallation Windows,
                pour les applications installées pour cet utilisateur ou pour
                tous les utilisateurs.
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
          <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <CardTitle>
                {loading
                  ? "Lecture…"
                  : `${filteredApps.length} application${filteredApps.length === 1 ? "" : "s"}`}
              </CardTitle>
              <CardDescription>
                {query
                  ? `${apps.length} trouvées sur ce PC`
                  : "Logiciels de bureau détectés dans le registre Windows."}
              </CardDescription>
            </div>
            <div className="relative w-full sm:max-w-sm">
              <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Rechercher une application"
                className="pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher une application…"
                type="search"
                value={query}
              />
            </div>
          </CardHeader>
          <CardContent>
            {runtime === false ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Ouvre cette page dans l’application FXMP OS pour lire les
                applications de Windows.
              </p>
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
              <p className="py-10 text-center text-sm text-muted-foreground">
                {query
                  ? "Aucune application ne correspond à cette recherche."
                  : "Aucune entrée d’application détectée."}
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {filteredApps.map((app, index) => (
                  <li
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                    key={`${app.name}-${app.version}-${app.publisher}-${index}`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 rounded-md border bg-muted/40 p-2 text-muted-foreground">
                        <AppWindowIcon aria-hidden="true" className="size-4" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="truncate font-medium" title={app.name}>
                          {app.name}
                        </p>
                        <p
                          className="truncate text-sm text-muted-foreground"
                          title={app.publisher ?? undefined}
                        >
                          {app.publisher || "Éditeur non renseigné"}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Badge variant="outline">{app.scope}</Badge>
                          {app.version && (
                            <Badge variant="secondary">v{app.version}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground sm:justify-end">
                      <span className="inline-flex items-center gap-1.5">
                        <HardDriveIcon
                          aria-hidden="true"
                          className="size-3.5"
                        />
                        {formatSize(app.estimatedSizeBytes)}
                      </span>
                      {app.installDate && (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDaysIcon
                            aria-hidden="true"
                            className="size-3.5"
                          />
                          Installée le{" "}
                          {new Date(
                            `${app.installDate}T00:00:00`
                          ).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
              La taille est une estimation déclarée par le programme. Cette page
              n’exécute aucune désinstallation et ne lit pas les chemins
              d’installation ni les commandes de suppression. Les applications
              Microsoft Store qui n’enregistrent pas d’entrée de bureau peuvent
              ne pas apparaître.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

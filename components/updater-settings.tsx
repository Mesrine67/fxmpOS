"use client"

import { getVersion } from "@tauri-apps/api/app"
import { relaunch } from "@tauri-apps/plugin-process"
import { check } from "@tauri-apps/plugin-updater"
import {
  ArrowDownToLineIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  FileArchiveIcon,
  LoaderCircleIcon,
  MonitorIcon,
  PackageCheckIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { useTauriRuntime } from "@/hooks/use-tauri-runtime"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type UpdateStatus =
  | "idle"
  | "browser"
  | "checking"
  | "current"
  | "available"
  | "installing"
  | "error"
type DownloadProgress = { downloaded: number; total: number | null }
type ReleaseAsset = {
  name: string
  url: string
  size: number
  downloadCount: number
  digest: string | null
}
type PublishedRelease = {
  tag: string
  version: string
  name: string
  publishedAt: string
  notes: string
  url: string
  assets: ReleaseAsset[]
}

const releaseApiUrl = "https://api.github.com/repos/Mesrine67/fxmpOS/releases"

async function fetchPublishedReleases(signal: AbortSignal) {
  const releases: PublishedRelease[] = []
  const pageSize = 100
  const maxPages = 20

  for (let page = 1; page <= maxPages; page += 1) {
    const response = await fetch(
      `${releaseApiUrl}?per_page=${pageSize}&page=${page}`,
      {
        headers: { Accept: "application/vnd.github+json" },
        signal,
        cache: "no-store",
      }
    )

    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        throw new Error(
          "La limite de consultation de l’API GitHub est atteinte. Réessayez dans quelques minutes."
        )
      }
      throw new Error(
        `GitHub a répondu avec le statut HTTP ${response.status}.`
      )
    }

    const payload: unknown = await response.json()
    if (!Array.isArray(payload)) {
      throw new Error("GitHub n’a pas renvoyé une liste de releases valide.")
    }

    for (const entry of payload) {
      if (
        typeof entry !== "object" ||
        entry === null ||
        typeof entry.tag_name !== "string" ||
        typeof entry.published_at !== "string" ||
        typeof entry.draft !== "boolean" ||
        typeof entry.prerelease !== "boolean"
      ) {
        continue
      }
      if (entry.draft || entry.prerelease) continue

      const tag = entry.tag_name
      const version = tag.replace(/^v/, "")
      if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) continue
      const assets = Array.isArray(entry.assets)
        ? entry.assets.flatMap((asset: unknown): ReleaseAsset[] => {
            if (
              typeof asset !== "object" ||
              asset === null ||
              typeof (asset as Record<string, unknown>).name !== "string" ||
              typeof (asset as Record<string, unknown>).size !== "number"
            ) {
              return []
            }
            const assetRecord = asset as Record<string, unknown>
            return [
              {
                name: assetRecord.name as string,
                url: `https://github.com/Mesrine67/fxmpOS/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(assetRecord.name as string)}`,
                size: assetRecord.size as number,
                downloadCount:
                  typeof assetRecord.download_count === "number"
                    ? assetRecord.download_count
                    : 0,
                digest:
                  typeof assetRecord.digest === "string"
                    ? assetRecord.digest
                    : null,
              },
            ]
          })
        : []

      releases.push({
        tag,
        version,
        name: typeof entry.name === "string" ? entry.name : tag,
        publishedAt: entry.published_at,
        notes: typeof entry.body === "string" ? entry.body.trim() : "",
        url: `https://github.com/Mesrine67/fxmpOS/releases/tag/${encodeURIComponent(tag)}`,
        assets,
      })
    }

    if (payload.length < pageSize) return sortReleases(releases)
  }

  throw new Error(
    "L’historique dépasse la limite de sécurité de 2 000 releases; contactez le support pour consulter les versions plus anciennes."
  )
}

function sortReleases(releases: PublishedRelease[]) {
  return releases.sort(
    (left, right) =>
      new Date(right.publishedAt).getTime() -
      new Date(left.publishedAt).getTime()
  )
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function formatReleaseDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export function UpdaterSettings() {
  const desktopRuntime = useTauriRuntime()
  const [status, setStatus] = useState<UpdateStatus>("checking")
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)
  const [availableVersion, setAvailableVersion] = useState<string | null>(null)
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null)
  const [releaseDate, setReleaseDate] = useState<string | null>(null)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const [releases, setReleases] = useState<PublishedRelease[]>([])
  const [selectedReleaseTag, setSelectedReleaseTag] = useState<string | null>(
    null
  )
  const [releaseSearch, setReleaseSearch] = useState("")
  const [historyStatus, setHistoryStatus] = useState<
    "loading" | "ready" | "error"
  >("loading")
  const [historyError, setHistoryError] = useState<string | null>(null)
  const updateRef = useRef<Awaited<ReturnType<typeof check>>>(null)
  const requestInFlight = useRef(false)
  const historyController = useRef<AbortController | null>(null)
  const manuallySelectedRelease = useRef(false)

  const loadReleaseHistory = useCallback(async () => {
    historyController.current?.abort()
    const controller = new AbortController()
    historyController.current = controller
    setHistoryStatus("loading")
    setHistoryError(null)

    try {
      const history = await fetchPublishedReleases(controller.signal)
      setReleases(history)
      setHistoryStatus("ready")
    } catch (cause) {
      if (controller.signal.aborted) return
      setHistoryError(errorMessage(cause))
      setHistoryStatus("error")
    }
  }, [])

  const checkForUpdates = useCallback(async () => {
    if (requestInFlight.current) return

    requestInFlight.current = true

    try {
      setCurrentVersion(await getVersion())
      const previousUpdate = updateRef.current
      updateRef.current = null
      await previousUpdate?.close()

      const update = await check()
      updateRef.current = update
      setAvailableVersion(update?.version ?? null)
      setReleaseNotes(update?.body?.trim() || null)
      setReleaseDate(update?.date ?? null)
      setStatus(update ? "available" : "current")
      setCheckedAt(new Date())
    } catch (cause) {
      setError(errorMessage(cause))
      setStatus("error")
    } finally {
      requestInFlight.current = false
    }
  }, [])

  useEffect(() => {
    if (desktopRuntime !== true) return
    const checkTimer = window.setTimeout(() => {
      void checkForUpdates()
    }, 0)

    return () => {
      window.clearTimeout(checkTimer)
      const update = updateRef.current
      updateRef.current = null
      if (update) void update.close()
    }
  }, [desktopRuntime, checkForUpdates])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReleaseHistory(), 0)
    return () => {
      window.clearTimeout(timer)
      historyController.current?.abort()
    }
  }, [loadReleaseHistory])

  useEffect(() => {
    if (manuallySelectedRelease.current || releases.length === 0) return
    const preferredVersion = availableVersion ?? currentVersion
    setSelectedReleaseTag(
      releases.find((release) => release.version === preferredVersion)?.tag ??
        releases[0].tag
    )
  }, [availableVersion, currentVersion, releases])

  const displayedStatus: UpdateStatus =
    desktopRuntime === false
      ? "browser"
      : desktopRuntime === null
        ? "idle"
        : status

  async function installUpdate() {
    const update = updateRef.current
    if (!update || status === "installing") return

    setStatus("installing")
    setError(null)
    setProgress({ downloaded: 0, total: null })

    let downloaded = 0
    let total: number | null = null

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? null
          setProgress({ downloaded, total })
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength
          setProgress({ downloaded, total })
        }
      })
      await relaunch()
    } catch (cause) {
      setError(errorMessage(cause))
      setStatus("error")
    }
  }

  const busy =
    displayedStatus === "checking" || displayedStatus === "installing"
  const releaseUrl = availableVersion
    ? `https://github.com/Mesrine67/fxmpOS/releases/tag/v${encodeURIComponent(availableVersion)}`
    : "https://github.com/Mesrine67/fxmpOS/releases/latest"
  const progressPercent = progress?.total
    ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
    : null
  const filteredReleases = releases.filter((release) =>
    `${release.version} ${release.name} ${release.notes}`
      .toLocaleLowerCase("fr-FR")
      .includes(releaseSearch.trim().toLocaleLowerCase("fr-FR"))
  )
  const visibleSelectedRelease = filteredReleases.find(
    (release) => release.tag === selectedReleaseTag
  )

  function renderReleaseNotes(notes: string) {
    return notes.split(/\r?\n/).map((line, index) => {
      const trimmed = line.trim()
      if (!trimmed)
        return <div aria-hidden="true" className="h-2" key={index} />
      if (trimmed.startsWith("### ")) {
        return (
          <h4 className="pt-2 font-semibold" key={index}>
            {trimmed.slice(4)}
          </h4>
        )
      }
      if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
        return (
          <h4 className="pt-2 font-semibold" key={index}>
            {trimmed.replace(/^#+\s*/, "")}
          </h4>
        )
      }
      if (/^[-*]\s/.test(trimmed)) {
        return (
          <p
            className="pl-3 before:mr-2 before:text-primary before:content-['•']"
            key={index}
          >
            {trimmed.slice(2)}
          </p>
        )
      }
      return <p key={index}>{trimmed}</p>
    })
  }

  return (
    <section className="w-full">
      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLineIcon className="size-4 text-primary" />
              Mises à jour
            </CardTitle>
            <CardDescription>
              FXMP OS vérifie les versions publiées et valide leur signature
              avant installation.
            </CardDescription>
          </div>
          <Badge variant="outline">
            {currentVersion ? `Version ${currentVersion}` : "Version inconnue"}
          </Badge>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              {status === "checking" || status === "installing" ? (
                <LoaderCircleIcon className="mt-0.5 size-4 animate-spin text-primary" />
              ) : status === "error" ? (
                <TriangleAlertIcon className="mt-0.5 size-4 text-destructive" />
              ) : (
                <CheckCircle2Icon className="mt-0.5 size-4 text-primary" />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="font-medium">
                  {displayedStatus === "browser" &&
                    "Disponible dans l’application de bureau"}
                  {displayedStatus === "idle" && "Prêt à vérifier"}
                  {displayedStatus === "checking" &&
                    "Recherche des mises à jour…"}
                  {displayedStatus === "current" && "FXMP OS est à jour"}
                  {displayedStatus === "available" &&
                    `Version ${availableVersion} disponible`}
                  {displayedStatus === "installing" &&
                    "Téléchargement et installation…"}
                  {displayedStatus === "error" && "La vérification a échoué"}
                </p>
                {displayedStatus === "browser" && (
                  <p className="text-sm text-muted-foreground">
                    Le vérificateur fonctionne uniquement dans la fenêtre Tauri.
                  </p>
                )}
                {displayedStatus === "current" && (
                  <p className="text-sm text-muted-foreground">
                    Aucune version plus récente n’est disponible sur le canal
                    stable Windows x64.
                  </p>
                )}
                {displayedStatus === "installing" && progress && (
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                      <span>
                        {formatBytes(progress.downloaded)}
                        {progress.total
                          ? ` sur ${formatBytes(progress.total)}`
                          : " téléchargés"}
                      </span>
                      {progressPercent !== null && (
                        <span className="tabular-nums">
                          {progressPercent} %
                        </span>
                      )}
                    </div>
                    {progressPercent !== null && (
                      <div
                        aria-label="Progression du téléchargement"
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={progressPercent}
                        className="h-2 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                      >
                        <div
                          className="h-full rounded-full bg-primary transition-[width]"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}
                {displayedStatus === "available" && releaseNotes && (
                  <div className="mt-3 rounded-md border bg-background/50 p-3 text-sm text-muted-foreground">
                    <h3 className="mb-2 font-medium text-foreground">
                      Notes de version
                    </h3>
                    <div className="flex flex-col gap-1">
                      {renderReleaseNotes(releaseNotes)}
                    </div>
                  </div>
                )}
                {displayedStatus === "available" && !releaseNotes && (
                  <p className="text-sm text-muted-foreground">
                    Cette version ne contient pas encore de notes de version.
                  </p>
                )}
                {displayedStatus === "error" && error && (
                  <p className="text-sm break-words text-destructive">
                    {error}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2 rounded-md border p-3">
              <MonitorIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">Canal de distribution</p>
                <p className="text-muted-foreground">
                  Windows x64 · versions stables
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-md border p-3">
              <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="font-medium">Vérification de sécurité</p>
                <p className="text-muted-foreground">
                  Signature Tauri obligatoire ; les versions antérieures sont
                  refusées.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-md border p-3">
              <PackageCheckIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">Installation</p>
                <p className="text-muted-foreground">
                  Le paquet signé est téléchargé puis installé par Tauri.
                  L’application se ferme pendant la mise à jour.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-md border p-3">
              <CalendarDaysIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">Publication</p>
                <p className="text-muted-foreground">
                  {releaseDate
                    ? new Date(releaseDate).toLocaleString("fr-FR")
                    : checkedAt
                      ? `Vérifié le ${checkedAt.toLocaleString("fr-FR")}`
                      : "Date fournie par la release GitHub"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-md border p-3 sm:col-span-2">
              <ExternalLinkIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="font-medium">Source des mises à jour</p>
                <p className="break-all text-muted-foreground">
                  github.com/Mesrine67/fxmpOS/releases/latest/download/latest.json
                </p>
                {checkedAt && (
                  <p className="pt-1 text-xs text-muted-foreground">
                    Dernière vérification : {checkedAt.toLocaleString("fr-FR")}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs text-muted-foreground">
            <span>Manifeste signé · GitHub Releases</span>
            <a
              className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
              href={releaseUrl}
              rel="noreferrer"
              target="_blank"
            >
              Voir la release et ses changements
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </div>
        </CardContent>

        <CardFooter className="flex-wrap justify-between gap-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (requestInFlight.current) return
              setStatus("checking")
              setError(null)
              setProgress(null)
              void checkForUpdates()
            }}
            disabled={busy || displayedStatus === "browser"}
          >
            <RefreshCwIcon />
            Vérifier maintenant
          </Button>
          {displayedStatus === "available" && (
            <Button
              type="button"
              onClick={() => void installUpdate()}
              disabled={busy}
            >
              <ArrowDownToLineIcon />
              Télécharger et installer
            </Button>
          )}
        </CardFooter>
      </Card>

      <Card className="mt-5">
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <FileArchiveIcon className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="flex flex-col gap-1">
              <CardTitle>Historique des versions</CardTitle>
              <CardDescription>
                Releases stables publiées, notes de version et fichiers
                disponibles. Les versions de test et brouillons sont masqués.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {historyStatus === "ready" && (
              <Badge variant="secondary">
                {releases.length}{" "}
                {releases.length === 1 ? "version" : "versions"}
              </Badge>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadReleaseHistory()}
              disabled={historyStatus === "loading"}
            >
              {historyStatus === "loading" ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <RefreshCwIcon />
              )}
              Actualiser
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Rechercher une version ou une note de publication"
              className="pl-9"
              placeholder="Rechercher une version ou un changement…"
              value={releaseSearch}
              onChange={(event) => setReleaseSearch(event.target.value)}
              disabled={historyStatus !== "ready"}
            />
          </div>

          {historyStatus === "loading" && (
            <div
              aria-label="Chargement de l’historique"
              className="flex flex-col gap-2"
            >
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {historyStatus === "error" && (
            <div
              className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
              role="alert"
            >
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="flex flex-col gap-1">
                <p className="font-medium">Historique indisponible</p>
                <p className="text-sm text-muted-foreground">{historyError}</p>
                <p className="text-xs text-muted-foreground">
                  Les mises à jour signées restent vérifiées séparément par
                  Tauri.
                </p>
              </div>
            </div>
          )}

          {historyStatus === "ready" && releases.length === 0 && (
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
              Aucune release stable publiée n’a été trouvée.
            </p>
          )}

          {historyStatus === "ready" && releases.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Publication</TableHead>
                    <TableHead>Fichiers</TableHead>
                    <TableHead className="text-right">
                      Téléchargements
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReleases.map((release) => {
                    const isSelected = release.tag === selectedReleaseTag
                    const isCurrent = release.version === currentVersion
                    const isAvailable = release.version === availableVersion
                    const totalDownloads = release.assets.reduce(
                      (total, asset) => total + asset.downloadCount,
                      0
                    )

                    return (
                      <TableRow
                        aria-selected={isSelected}
                        className={isSelected ? "bg-muted/60" : undefined}
                        key={release.tag}
                      >
                        <TableCell>
                          <Button
                            className="px-0 font-semibold"
                            size="sm"
                            variant="link"
                            onClick={() => {
                              manuallySelectedRelease.current = true
                              setSelectedReleaseTag(release.tag)
                            }}
                          >
                            {release.version}
                          </Button>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {isCurrent && (
                              <Badge variant="outline">Installée</Badge>
                            )}
                            {isAvailable && <Badge>Mise à jour</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatReleaseDate(release.publishedAt)}
                        </TableCell>
                        <TableCell>{release.assets.length}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {totalDownloads.toLocaleString("fr-FR")}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {filteredReleases.length === 0 && (
                <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                  Aucune version ne correspond à « {releaseSearch} ».
                </p>
              )}

              {visibleSelectedRelease && (
                <Card className="bg-muted/20">
                  <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="flex flex-wrap items-center gap-2">
                        {visibleSelectedRelease.name}
                        {visibleSelectedRelease.version === currentVersion && (
                          <Badge variant="outline">Version installée</Badge>
                        )}
                        {visibleSelectedRelease.version ===
                          availableVersion && (
                          <Badge>Disponible pour installation</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Publiée le{" "}
                        {formatReleaseDate(visibleSelectedRelease.publishedAt)}
                        {" · "}
                        {visibleSelectedRelease.assets.length} fichiers ·{" "}
                        {visibleSelectedRelease.assets
                          .reduce((sum, asset) => sum + asset.downloadCount, 0)
                          .toLocaleString("fr-FR")}{" "}
                        téléchargements
                      </CardDescription>
                    </div>
                    <a
                      className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      href={visibleSelectedRelease.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Page GitHub
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5">
                    <div>
                      <h3 className="mb-2 font-medium">Changelog complet</h3>
                      {visibleSelectedRelease.notes ? (
                        <div className="flex flex-col gap-1 rounded-md border bg-background/50 p-4 text-sm text-muted-foreground">
                          {renderReleaseNotes(visibleSelectedRelease.notes)}
                        </div>
                      ) : (
                        <p className="rounded-md border p-4 text-sm text-muted-foreground">
                          Cette release ne contient pas de notes détaillées.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <h3 className="font-medium">
                        Fichiers et sommes de contrôle
                      </h3>
                      {visibleSelectedRelease.assets.length > 0 ? (
                        <ul className="flex flex-col divide-y rounded-md border">
                          {visibleSelectedRelease.assets.map((asset) => (
                            <li
                              className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:justify-between"
                              key={asset.name}
                            >
                              <div className="flex min-w-0 items-start gap-2">
                                <FileArchiveIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                <div className="min-w-0">
                                  <a
                                    className="font-medium break-all underline-offset-4 hover:underline"
                                    href={asset.url}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    {asset.name}
                                  </a>
                                  <p className="text-xs text-muted-foreground">
                                    {formatBytes(asset.size)} ·{" "}
                                    {asset.downloadCount.toLocaleString(
                                      "fr-FR"
                                    )}{" "}
                                    téléchargements
                                  </p>
                                  {asset.digest && (
                                    <p className="pt-1 font-mono text-[11px] break-all text-muted-foreground">
                                      SHA-256 ·{" "}
                                      {asset.digest.replace(/^sha256:/, "")}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="rounded-md border p-3 text-sm text-muted-foreground">
                          Aucun fichier de release n’est référencé.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <p className="text-xs text-muted-foreground">
            Historique public lu depuis GitHub Releases. Les sommes SHA-256
            servent à comparer les fichiers; l’installation automatique exige
            toujours la signature Minisign du manifeste Tauri.
          </p>
        </CardContent>
      </Card>
    </section>
  )
}

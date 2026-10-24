"use client"

import {
  ArrowDownToLineIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ArrowDownIcon,
  ArrowDownUpIcon,
  ArrowUpIcon,
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

import { useUpdater, type UpdaterStatus } from "@/components/updater-provider"
import { ReleaseNotesDialog } from "@/components/release-notes-dialog"
import { UpdaterDownloadProgress } from "@/components/updater-download-progress"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type UpdateStatus = UpdaterStatus | "browser"
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
type ReleaseSortKey = "version" | "publishedAt" | "assets" | "downloads"

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
  const updater = useUpdater()
  const {
    status,
    currentVersion,
    availableVersion,
    releaseNotes,
    releaseDate,
    checkedAt,
    error,
    progress,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  } = updater
  const [releases, setReleases] = useState<PublishedRelease[]>([])
  const [selectedReleaseTag, setSelectedReleaseTag] = useState<string | null>(
    null
  )
  const [releaseSearch, setReleaseSearch] = useState("")
  const [sortKey, setSortKey] = useState<ReleaseSortKey>("publishedAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState("10")
  const [historyStatus, setHistoryStatus] = useState<
    "loading" | "ready" | "error"
  >("loading")
  const [historyError, setHistoryError] = useState<string | null>(null)
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

  const busy =
    displayedStatus === "checking" ||
    displayedStatus === "downloading" ||
    displayedStatus === "installing"
  const releaseUrl = availableVersion
    ? `https://github.com/Mesrine67/fxmpOS/releases/tag/v${encodeURIComponent(availableVersion)}`
    : "https://github.com/Mesrine67/fxmpOS/releases/latest"
  const versionCollator = new Intl.Collator("fr-FR", { numeric: true })
  const filteredReleases = releases
    .filter((release) =>
      `${release.version} ${release.name} ${release.notes}`
        .toLocaleLowerCase("fr-FR")
        .includes(releaseSearch.trim().toLocaleLowerCase("fr-FR"))
    )
    .sort((left, right) => {
      let result = 0
      if (sortKey === "version") {
        result = versionCollator.compare(left.version, right.version)
      } else if (sortKey === "publishedAt") {
        result = Date.parse(left.publishedAt) - Date.parse(right.publishedAt)
      } else if (sortKey === "assets") {
        result = left.assets.length - right.assets.length
      } else {
        const leftDownloads = left.assets.reduce(
          (total, asset) => total + asset.downloadCount,
          0
        )
        const rightDownloads = right.assets.reduce(
          (total, asset) => total + asset.downloadCount,
          0
        )
        result = leftDownloads - rightDownloads
      }
      return sortDirection === "asc" ? result : -result
    })
  const parsedPageSize = Number(pageSize)
  const pageCount = Math.max(
    1,
    Math.ceil(filteredReleases.length / parsedPageSize)
  )
  const visiblePage = Math.min(currentPage, pageCount)
  const pageReleases = filteredReleases.slice(
    (visiblePage - 1) * parsedPageSize,
    visiblePage * parsedPageSize
  )
  const visibleSelectedRelease = filteredReleases.find(
    (release) => release.tag === selectedReleaseTag
  )

  function toggleReleaseSort(key: ReleaseSortKey) {
    setCurrentPage(1)
    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    setSortDirection(key === "version" ? "desc" : "asc")
  }

  function renderSortHeader(
    label: string,
    key: ReleaseSortKey,
    className?: string
  ) {
    const active = sortKey === key
    const SortIcon = active
      ? sortDirection === "asc"
        ? ArrowUpIcon
        : ArrowDownIcon
      : ArrowDownUpIcon

    return (
      <TableHead
        aria-sort={
          active
            ? sortDirection === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
        className={className}
      >
        <Button
          aria-label={`Trier par ${label.toLocaleLowerCase("fr-FR")}, ${active && sortDirection === "asc" ? "décroissant" : "croissant"}`}
          className="-ml-2 h-8 px-2"
          onClick={() => toggleReleaseSort(key)}
          size="sm"
          type="button"
          variant="ghost"
        >
          {label}
          <SortIcon aria-hidden="true" />
        </Button>
      </TableHead>
    )
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
              avant installation. Contrôle au démarrage, au retour dans
              l’application et toutes les minutes lorsqu’elle est ouverte.
            </CardDescription>
          </div>
          <Badge variant="outline">
            {currentVersion ? `Version ${currentVersion}` : "Version inconnue"}
          </Badge>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              {status === "checking" ||
              status === "downloading" ||
              status === "installing" ? (
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
                  {displayedStatus === "downloading" &&
                    `Téléchargement de la version ${availableVersion}…`}
                  {displayedStatus === "downloaded" &&
                    `Version ${availableVersion} prête à installer`}
                  {displayedStatus === "installing" && "Installation en cours…"}
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
                {(displayedStatus === "available" ||
                  displayedStatus === "downloaded") &&
                  releaseNotes && (
                    <div className="mt-3">
                      <ReleaseNotesDialog
                        notes={releaseNotes}
                        releaseDate={releaseDate}
                        triggerLabel="Voir les notes de version"
                        version={availableVersion ?? ""}
                      />
                    </div>
                  )}
                {(displayedStatus === "available" ||
                  displayedStatus === "downloaded") &&
                  !releaseNotes && (
                    <p className="text-sm text-muted-foreground">
                      Cette version ne contient pas encore de notes de version.
                    </p>
                  )}
                {error && (
                  <p className="text-sm break-words text-destructive">
                    {error}
                  </p>
                )}
              </div>
            </div>
          </div>
          {(displayedStatus === "downloading" ||
            displayedStatus === "downloaded") && (
            <UpdaterDownloadProgress
              progress={progress}
              status={displayedStatus}
            />
          )}
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
                  Téléchargez d’abord le paquet signé; l’installation démarre
                  ensuite à votre demande et redémarre FXMP OS.
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
            onClick={() => void checkForUpdates()}
            disabled={
              busy ||
              displayedStatus === "downloaded" ||
              displayedStatus === "browser"
            }
          >
            <RefreshCwIcon />
            Vérifier maintenant
          </Button>
          {displayedStatus === "available" && (
            <Button
              type="button"
              onClick={() => void downloadUpdate()}
              disabled={busy}
            >
              {busy ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <ArrowDownToLineIcon />
              )}
              {error ? "Réessayer le téléchargement" : "Télécharger"}
            </Button>
          )}
          {displayedStatus === "downloading" && (
            <Button disabled type="button">
              <LoaderCircleIcon className="animate-spin" />
              Téléchargement…
            </Button>
          )}
          {displayedStatus === "downloaded" && (
            <Button type="button" onClick={() => void installUpdate()}>
              <PackageCheckIcon />
              {error ? "Réessayer l’installation" : "Installer et redémarrer"}
            </Button>
          )}
          {displayedStatus === "installing" && (
            <Button disabled type="button">
              <LoaderCircleIcon className="animate-spin" />
              Installation…
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
          <InputGroup>
            <InputGroupAddon aria-hidden="true">
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Rechercher une version ou une note de publication"
              placeholder="Rechercher une version ou un changement…"
              value={releaseSearch}
              onChange={(event) => {
                setReleaseSearch(event.target.value)
                setCurrentPage(1)
              }}
              disabled={historyStatus !== "ready"}
            />
          </InputGroup>

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
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertTitle>Historique indisponible</AlertTitle>
              <AlertDescription className="flex flex-col gap-1">
                <span>{historyError}</span>
                <span>
                  Les mises à jour signées restent vérifiées séparément par
                  Tauri.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {historyStatus === "ready" && releases.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileArchiveIcon />
                </EmptyMedia>
                <EmptyTitle>Aucune version publiée</EmptyTitle>
                <EmptyDescription>
                  Aucune release stable n’a été trouvée sur GitHub.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {historyStatus === "ready" && releases.length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p aria-live="polite" className="text-xs text-muted-foreground">
                  {filteredReleases.length === 0
                    ? "Aucune version trouvée"
                    : `${(visiblePage - 1) * parsedPageSize + 1}–${Math.min(visiblePage * parsedPageSize, filteredReleases.length)} sur ${filteredReleases.length} versions`}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Par page
                  </span>
                  <Select
                    onValueChange={(value) => {
                      if (!value) return
                      setPageSize(value)
                      setCurrentPage(1)
                    }}
                    value={pageSize}
                  >
                    <SelectTrigger
                      aria-label="Versions par page"
                      className="w-20"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {filteredReleases.length > 0 ? (
                <RadioGroup
                  aria-label="Sélectionner une version pour afficher ses détails"
                  className="w-full gap-0"
                  onValueChange={(tag) => {
                    manuallySelectedRelease.current = true
                    setSelectedReleaseTag(tag)
                  }}
                  value={selectedReleaseTag ?? ""}
                >
                  <Table>
                    <TableCaption className="sr-only">
                      Historique des versions stables de FXMP OS. Sélectionnez
                      une ligne pour afficher le changelog et les fichiers.
                    </TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <span className="sr-only">Sélection</span>
                        </TableHead>
                        {renderSortHeader("Version", "version")}
                        {renderSortHeader("Publication", "publishedAt")}
                        {renderSortHeader("Fichiers", "assets")}
                        {renderSortHeader(
                          "Téléchargements",
                          "downloads",
                          "text-right"
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageReleases.map((release) => {
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
                            className={`cursor-pointer focus-within:bg-muted/60 ${isSelected ? "bg-muted/60" : ""}`}
                            key={release.tag}
                            onClick={() => {
                              manuallySelectedRelease.current = true
                              setSelectedReleaseTag(release.tag)
                            }}
                          >
                            <TableCell>
                              <RadioGroupItem
                                aria-label={`Sélectionner la version ${release.version}`}
                                value={release.tag}
                              />
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-primary">
                                {release.version}
                              </span>
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
                </RadioGroup>
              ) : (
                <Empty className="min-h-40">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <SearchIcon />
                    </EmptyMedia>
                    <EmptyTitle>Aucun résultat</EmptyTitle>
                    <EmptyDescription>
                      Aucune version ne correspond à « {releaseSearch} ».
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}

              {filteredReleases.length > parsedPageSize && (
                <Pagination aria-label="Pagination de l’historique des versions">
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        aria-label="Page précédente"
                        disabled={visiblePage <= 1}
                        onClick={() =>
                          setCurrentPage((page) => Math.max(1, page - 1))
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Précédente
                      </Button>
                    </PaginationItem>
                    <PaginationItem>
                      <span
                        aria-live="polite"
                        className="px-3 text-xs text-muted-foreground"
                      >
                        Page {visiblePage} sur {pageCount}
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <Button
                        aria-label="Page suivante"
                        disabled={visiblePage >= pageCount}
                        onClick={() =>
                          setCurrentPage((page) =>
                            Math.min(pageCount, page + 1)
                          )
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Suivante
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
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
                  <CardContent>
                    <Tabs className="gap-4" defaultValue="changelog">
                      <TabsList>
                        <TabsTrigger value="changelog">Changelog</TabsTrigger>
                        <TabsTrigger value="assets">
                          Fichiers ({visibleSelectedRelease.assets.length})
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent
                        className="flex flex-col gap-3"
                        value="changelog"
                      >
                        {visibleSelectedRelease.notes ? (
                          <>
                            <p className="text-sm text-muted-foreground">
                              Ouvrez le changelog complet de cette version.
                            </p>
                            <ReleaseNotesDialog
                              notes={visibleSelectedRelease.notes}
                              releaseDate={visibleSelectedRelease.publishedAt}
                              triggerLabel="Ouvrir le changelog"
                              version={visibleSelectedRelease.version}
                            />
                          </>
                        ) : (
                          <Empty className="min-h-36">
                            <EmptyHeader>
                              <EmptyTitle>Aucune note de version</EmptyTitle>
                              <EmptyDescription>
                                Cette release ne contient pas de changelog
                                détaillé.
                              </EmptyDescription>
                            </EmptyHeader>
                          </Empty>
                        )}
                      </TabsContent>
                      <TabsContent
                        className="flex flex-col gap-2"
                        value="assets"
                      >
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
                          <Empty className="min-h-36">
                            <EmptyHeader>
                              <EmptyTitle>Aucun fichier</EmptyTitle>
                              <EmptyDescription>
                                Aucun fichier de release n’est référencé.
                              </EmptyDescription>
                            </EmptyHeader>
                          </Empty>
                        )}
                      </TabsContent>
                    </Tabs>
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

"use client"

import { getVersion } from "@tauri-apps/api/app"
import { relaunch } from "@tauri-apps/plugin-process"
import { check } from "@tauri-apps/plugin-updater"
import {
  ArrowDownToLineIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  MonitorIcon,
  PackageCheckIcon,
  RefreshCwIcon,
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

type UpdateStatus =
  | "idle"
  | "browser"
  | "checking"
  | "current"
  | "available"
  | "installing"
  | "error"
type DownloadProgress = { downloaded: number; total: number | null }

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
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
  const updateRef = useRef<Awaited<ReturnType<typeof check>>>(null)
  const requestInFlight = useRef(false)

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
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <ArrowDownToLineIcon className="size-4 text-primary" />
              Mises à jour
            </CardTitle>
            <CardDescription>
              FXMP OS vérifie les versions publiées et valide leur signature
              avant installation.
            </CardDescription>
          </div>
          <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
            {currentVersion ? `Version ${currentVersion}` : "Version inconnue"}
          </span>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              {status === "checking" || status === "installing" ? (
                <LoaderCircleIcon className="mt-0.5 size-4 animate-spin text-primary" />
              ) : status === "error" ? (
                <TriangleAlertIcon className="mt-0.5 size-4 text-destructive" />
              ) : (
                <CheckCircle2Icon className="mt-0.5 size-4 text-primary" />
              )}
              <div className="min-w-0 flex-1 space-y-1">
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
                  <div className="space-y-2 pt-1">
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
                    <div className="space-y-1">
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
    </section>
  )
}

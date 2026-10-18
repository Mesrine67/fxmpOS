"use client"

import { getVersion } from "@tauri-apps/api/app"
import { relaunch } from "@tauri-apps/plugin-process"
import { check } from "@tauri-apps/plugin-updater"
import {
  ArrowDownToLineIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  RefreshCwIcon,
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
      setStatus(update ? "available" : "current")
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
                {displayedStatus === "installing" && progress && (
                  <p className="text-sm text-muted-foreground">
                    {formatBytes(progress.downloaded)}
                    {progress.total
                      ? ` sur ${formatBytes(progress.total)}`
                      : " téléchargés"}
                  </p>
                )}
                {displayedStatus === "available" && releaseNotes && (
                  <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">
                    {releaseNotes}
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

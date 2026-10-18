"use client"

import { getVersion } from "@tauri-apps/api/app"
import { isTauri } from "@tauri-apps/api/core"
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type UpdateStatus = "idle" | "browser" | "checking" | "current" | "available" | "installing" | "error"
type DownloadProgress = { downloaded: number; total: number | null }

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function UpdaterSettings() {
  const [status, setStatus] = useState<UpdateStatus>("idle")
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)
  const [availableVersion, setAvailableVersion] = useState<string | null>(null)
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<DownloadProgress | null>(null)
  const updateRef = useRef<Awaited<ReturnType<typeof check>>>(null)
  const requestInFlight = useRef(false)

  const checkForUpdates = useCallback(async () => {
    if (!isTauri()) {
      setStatus("browser")
      return
    }
    if (requestInFlight.current) return

    requestInFlight.current = true
    setStatus("checking")
    setError(null)
    setProgress(null)

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
    void checkForUpdates()
    return () => {
      const update = updateRef.current
      if (update) void update.close()
    }
  }, [checkForUpdates])

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

  const busy = status === "checking" || status === "installing"

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Application</p>
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Version de l’application et mises à jour signées.
          </p>
        </div>

        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <ArrowDownToLineIcon className="size-4 text-primary" />
                Mises à jour
              </CardTitle>
              <CardDescription>
                FXMP OS vérifie les versions publiées et valide leur signature avant installation.
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
                    {status === "browser" && "Disponible dans l’application de bureau"}
                    {status === "idle" && "Prêt à vérifier"}
                    {status === "checking" && "Recherche des mises à jour…"}
                    {status === "current" && "FXMP OS est à jour"}
                    {status === "available" && `Version ${availableVersion} disponible`}
                    {status === "installing" && "Téléchargement et installation…"}
                    {status === "error" && "La vérification a échoué"}
                  </p>
                  {status === "browser" && (
                    <p className="text-sm text-muted-foreground">
                      Le vérificateur fonctionne uniquement dans la fenêtre Tauri.
                    </p>
                  )}
                  {status === "installing" && progress && (
                    <p className="text-sm text-muted-foreground">
                      {formatBytes(progress.downloaded)}
                      {progress.total ? ` sur ${formatBytes(progress.total)}` : " téléchargés"}
                    </p>
                  )}
                  {status === "available" && releaseNotes && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {releaseNotes}
                    </p>
                  )}
                  {status === "error" && error && (
                    <p className="break-words text-sm text-destructive">{error}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex-wrap justify-between gap-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => void checkForUpdates()}
              disabled={busy || status === "browser"}
            >
              <RefreshCwIcon />
              Vérifier maintenant
            </Button>
            {status === "available" && (
              <Button type="button" onClick={() => void installUpdate()} disabled={busy}>
                <ArrowDownToLineIcon />
                Télécharger et installer
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}

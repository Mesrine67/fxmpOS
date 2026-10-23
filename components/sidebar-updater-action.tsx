"use client"

import { getVersion } from "@tauri-apps/api/app"
import { Dialog } from "@base-ui/react/dialog"
import { relaunch } from "@tauri-apps/plugin-process"
import { check } from "@tauri-apps/plugin-updater"
import {
  ArrowDownToLineIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTauriRuntime } from "@/hooks/use-tauri-runtime"

type UpdateStatus =
  "idle" | "checking" | "current" | "available" | "installing" | "error"
type Progress = { downloaded: number; total: number | null }

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function ReleaseNotes({ notes }: { notes: string }) {
  return (
    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
      {notes.split(/\r?\n/).map((line, index) => {
        const text = line.trim()
        if (!text) return <div aria-hidden="true" className="h-1" key={index} />
        if (text.startsWith("#")) {
          return (
            <h3 className="pt-2 font-semibold text-foreground" key={index}>
              {text.replace(/^#+\s*/, "")}
            </h3>
          )
        }
        if (/^[-*]\s/.test(text)) {
          return (
            <p
              className="pl-3 before:mr-2 before:text-primary before:content-['•']"
              key={index}
            >
              {text.slice(2)}
            </p>
          )
        }
        return <p key={index}>{text}</p>
      })}
    </div>
  )
}

export function SidebarUpdaterAction() {
  const runtime = useTauriRuntime()
  const [status, setStatus] = useState<UpdateStatus>("idle")
  const [open, setOpen] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)
  const [availableVersion, setAvailableVersion] = useState<string | null>(null)
  const [notes, setNotes] = useState<string | null>(null)
  const [releaseDate, setReleaseDate] = useState<string | null>(null)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const updateRef = useRef<Awaited<ReturnType<typeof check>>>(null)
  const inFlight = useRef(false)

  const checkForUpdates = useCallback(async () => {
    if (runtime !== true || inFlight.current) return
    inFlight.current = true
    setStatus("checking")
    setError(null)
    try {
      setCurrentVersion(await getVersion())
      const oldUpdate = updateRef.current
      updateRef.current = null
      await oldUpdate?.close()
      const update = await check()
      updateRef.current = update
      setAvailableVersion(update?.version ?? null)
      setNotes(update?.body?.trim() || null)
      setReleaseDate(update?.date ?? null)
      setCheckedAt(new Date())
      setStatus(update ? "available" : "current")
    } catch (cause) {
      inFlight.current = false
      setError(cause instanceof Error ? cause.message : String(cause))
      setStatus("error")
    } finally {
      inFlight.current = false
    }
  }, [runtime])

  useEffect(() => {
    if (runtime !== true) return
    const timer = window.setTimeout(() => void checkForUpdates(), 1200)
    return () => {
      window.clearTimeout(timer)
      const update = updateRef.current
      updateRef.current = null
      if (update) void update.close()
    }
  }, [runtime, checkForUpdates])

  async function installUpdate() {
    const update = updateRef.current
    if (!update || status === "installing") return
    inFlight.current = true
    setStatus("installing")
    setError(null)
    setProgress({ downloaded: 0, total: null })
    let downloaded = 0
    let total: number | null = null
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? null
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength
        }
        setProgress({ downloaded, total })
      })
      await relaunch()
    } catch (cause) {
      inFlight.current = false
      setError(cause instanceof Error ? cause.message : String(cause))
      setStatus("error")
    }
  }

  if (runtime !== true) return null

  const busy = status === "checking" || status === "installing"
  const label =
    status === "available"
      ? `Version ${availableVersion} disponible`
      : status === "checking"
        ? "Recherche des mises à jour…"
        : status === "error"
          ? "La vérification des mises à jour a échoué"
          : "Mises à jour FXMP OS"
  const percent = progress?.total
    ? Math.min(100, Math.round((progress.downloaded * 100) / progress.total))
    : null

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (status !== "installing") setOpen(nextOpen)
      }}
      disablePointerDismissal={status === "installing"}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <Dialog.Trigger
              render={
                <Button
                  aria-label={label}
                  className="relative size-8 shrink-0 group-data-[collapsible=icon]:opacity-0"
                  variant={status === "available" ? "default" : "outline"}
                  size="icon"
                />
              }
            />
          }
        >
          {busy ? (
            <LoaderCircleIcon className="animate-spin" />
          ) : (
            <ArrowDownToLineIcon />
          )}
          {status === "available" && (
            <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-sidebar bg-primary" />
          )}
          <span className="sr-only">Mises à jour</span>
        </TooltipTrigger>
        <TooltipContent side="right" align="center">
          {label}
        </TooltipContent>
      </Tooltip>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-[101] flex max-h-[min(86vh,48rem)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-background shadow-2xl outline-none">
          <header className="flex items-center justify-between gap-4 border-b px-5 py-4">
            <div className="flex min-w-0 items-center gap-2">
              <ArrowDownToLineIcon className="size-4 shrink-0 text-primary" />
              <Dialog.Title
                className="font-semibold"
                id="sidebar-updater-title"
              >
                {status === "available"
                  ? "Mise à jour disponible"
                  : status === "current"
                    ? "FXMP OS est à jour"
                    : "Mises à jour"}
              </Dialog.Title>
              <span className="text-sm text-muted-foreground">
                {currentVersion
                  ? `${currentVersion}${availableVersion ? ` → ${availableVersion}` : ""}`
                  : ""}
              </span>
            </div>
            <Dialog.Close
              render={
                <Button
                  aria-label="Fermer"
                  disabled={status === "installing"}
                  size="icon"
                  variant="ghost"
                />
              }
            >
              <XIcon />
            </Dialog.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                {status === "checking" || status === "installing" ? (
                  <LoaderCircleIcon className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
                ) : status === "error" ? (
                  <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
                ) : (
                  <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {status === "checking"
                      ? "Recherche des mises à jour…"
                      : status === "available"
                        ? `Version ${availableVersion} disponible`
                        : status === "current"
                          ? "Aucune version plus récente n’est disponible sur le canal stable Windows x64."
                          : status === "installing"
                            ? "Téléchargement et installation…"
                            : status === "error"
                              ? "La vérification a échoué"
                              : "Vérification des mises à jour signées"}
                  </p>
                  {notes && status === "available" && (
                    <div className="mt-3 rounded-md border bg-background/60 p-3">
                      <h3 className="mb-2 text-sm font-semibold">
                        Nouveautés
                        {releaseDate
                          ? ` · ${new Date(releaseDate).toLocaleDateString("fr-FR")}`
                          : ""}
                      </h3>
                      <ReleaseNotes notes={notes} />
                    </div>
                  )}
                  {status === "available" && !notes && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Aucune note n’a été ajoutée à cette version.
                    </p>
                  )}
                  {status === "installing" && progress && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                        <span>
                          {formatBytes(progress.downloaded)}
                          {progress.total
                            ? ` sur ${formatBytes(progress.total)}`
                            : " téléchargés"}
                        </span>
                        {percent !== null && <span>{percent} %</span>}
                      </div>
                      {percent !== null && (
                        <div
                          aria-label="Progression du téléchargement"
                          aria-valuemax={100}
                          aria-valuemin={0}
                          aria-valuenow={percent}
                          className="h-2 overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                        >
                          <div
                            className="h-full bg-primary transition-[width]"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {status === "error" && error && (
                    <p
                      className="mt-2 text-sm break-words text-destructive"
                      role="alert"
                    >
                      {error}
                    </p>
                  )}
                  {checkedAt && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Vérifié le {checkedAt.toLocaleString("fr-FR")} · Mise à
                      jour Tauri signée
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
            <a
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              href={
                availableVersion
                  ? `https://github.com/Mesrine67/fxmpOS/releases/tag/v${encodeURIComponent(availableVersion)}`
                  : "https://github.com/Mesrine67/fxmpOS/releases"
              }
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLinkIcon className="size-3.5" /> GitHub Releases
            </a>
            <div className="flex gap-2">
              <Button
                disabled={busy}
                onClick={() => void checkForUpdates()}
                variant="outline"
              >
                {status === "checking" ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <RefreshCwIcon />
                )}
                Vérifier maintenant
              </Button>
              {status === "available" && (
                <Button onClick={() => void installUpdate()}>
                  <ArrowDownToLineIcon /> Télécharger et installer
                </Button>
              )}
            </div>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

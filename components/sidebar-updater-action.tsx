"use client"

import { Dialog } from "@base-ui/react/dialog"
import {
  ArrowDownToLineIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"
import { useState } from "react"

import { useUpdater } from "@/components/updater-provider"
import { ReleaseNotesDialog } from "@/components/release-notes-dialog"
import { UpdaterDownloadProgress } from "@/components/updater-download-progress"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTauriRuntime } from "@/hooks/use-tauri-runtime"

export function SidebarUpdaterAction() {
  const runtime = useTauriRuntime()
  const updater = useUpdater()
  const {
    status,
    currentVersion,
    availableVersion,
    releaseNotes: notes,
    releaseDate,
    checkedAt,
    error,
    progress,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
  } = updater
  const [open, setOpen] = useState(false)

  if (runtime !== true) return null

  const busy =
    status === "checking" || status === "downloading" || status === "installing"
  const label =
    status === "available"
      ? `Version ${availableVersion} disponible`
      : status === "checking"
        ? "Recherche des mises à jour…"
        : status === "downloading"
          ? `Téléchargement de la version ${availableVersion}…`
          : status === "downloaded"
            ? `Version ${availableVersion} prête à installer`
            : status === "error"
              ? "La vérification des mises à jour a échoué"
              : "Mises à jour FXMP OS"
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
                  className="relative size-8 shrink-0"
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
                  : status === "downloading"
                    ? "Téléchargement en cours"
                    : status === "downloaded"
                      ? "Prête à installer"
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
                {status === "checking" ||
                status === "downloading" ||
                status === "installing" ? (
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
                        : status === "downloading"
                          ? `Téléchargement de la version ${availableVersion}…`
                          : status === "downloaded"
                            ? `Version ${availableVersion} prête à installer`
                            : status === "current"
                              ? "Aucune version plus récente n’est disponible sur le canal stable Windows x64."
                              : status === "installing"
                                ? "Installation en cours…"
                                : status === "error"
                                  ? "La vérification a échoué"
                                  : "Vérification des mises à jour signées"}
                  </p>
                  {(status === "available" || status === "downloaded") &&
                    notes && (
                      <div className="mt-3">
                        <ReleaseNotesDialog
                          nested
                          notes={notes}
                          releaseDate={releaseDate}
                          triggerLabel="Voir les notes de version"
                          version={availableVersion ?? ""}
                        />
                      </div>
                    )}
                  {(status === "available" || status === "downloaded") &&
                    !notes && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Aucune note n’a été ajoutée à cette version.
                      </p>
                    )}
                  {status === "downloading" || status === "downloaded" ? (
                    <div className="mt-4">
                      <UpdaterDownloadProgress
                        progress={progress}
                        status={status}
                      />
                    </div>
                  ) : null}
                  {error && (
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
                disabled={busy || status === "downloaded"}
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
                <Button onClick={() => void downloadUpdate()}>
                  <ArrowDownToLineIcon />
                  {error ? "Réessayer le téléchargement" : "Télécharger"}
                </Button>
              )}
              {status === "downloading" && (
                <Button disabled>
                  <LoaderCircleIcon className="animate-spin" />
                  Téléchargement…
                </Button>
              )}
              {status === "downloaded" && (
                <Button onClick={() => void installUpdate()}>
                  <ArrowDownToLineIcon />
                  {error
                    ? "Réessayer l’installation"
                    : "Installer et redémarrer"}
                </Button>
              )}
              {status === "installing" && (
                <Button disabled>
                  <LoaderCircleIcon className="animate-spin" />
                  Installation…
                </Button>
              )}
            </div>
          </footer>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

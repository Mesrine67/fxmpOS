"use client"

import { ArrowDownToLineIcon, CheckCircle2Icon, LoaderCircleIcon, PackageCheckIcon, ShieldCheckIcon } from "lucide-react"

import type {
  UpdaterProgress,
  UpdaterStatus,
} from "@/components/updater-provider"
import { Progress, ProgressLabel } from "@/components/ui/progress"

type UpdaterDownloadProgressProps = {
  status: Extract<UpdaterStatus, "downloading" | "downloaded">
  progress: UpdaterProgress | null
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function DownloadStep({ active, complete, icon: Icon, label }: {
  active: boolean
  complete: boolean
  icon: typeof ArrowDownToLineIcon
  label: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border ${complete ? "border-primary/40 bg-primary/10 text-primary" : active ? "border-primary/40 bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
        {complete ? <CheckCircle2Icon className="size-3.5" /> : <Icon className={`size-3.5 ${active ? "animate-pulse" : ""}`} />}
      </span>
      <span className={`truncate text-xs ${active || complete ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
    </div>
  )
}

export function UpdaterDownloadProgress({
  status,
  progress,
}: UpdaterDownloadProgressProps) {
  const total = progress?.total ?? null
  const downloaded = progress?.downloaded ?? 0
  const percent =
    status === "downloaded"
      ? 100
      : total && total > 0
        ? Math.min(100, Math.round((downloaded / total) * 100))
        : null

  return (
    <div
      aria-live="polite"
      className="rounded-lg border bg-card p-4 shadow-sm"
      role="status"
    >
      <div className="mb-4 flex items-start gap-3">
        {status === "downloading" ? (
          <LoaderCircleIcon className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
        ) : (
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">
            {status === "downloading"
              ? "Téléchargement de la mise à jour"
              : "Téléchargement terminé"}
            </p>
            <span className="rounded-full border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {status === "downloaded" ? "Prête à installer" : "Canal stable · Windows x64"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {status === "downloading"
              ? "L’application reste utilisable pendant le téléchargement."
              : "Le paquet est prêt. Lancez l’installation quand vous le souhaitez."}
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-2 border-y py-3 sm:grid-cols-3">
        <DownloadStep active={status === "downloading"} complete={status === "downloaded"} icon={ArrowDownToLineIcon} label="Téléchargement" />
        <DownloadStep active={status === "downloaded"} complete={status === "downloaded"} icon={ShieldCheckIcon} label="Paquet prêt" />
        <DownloadStep active={false} complete={false} icon={PackageCheckIcon} label="Installation manuelle" />
      </div>

      <Progress
        aria-label="Progression du téléchargement"
        className="gap-2"
        value={percent}
      >
        <div className="flex w-full items-center justify-between gap-3">
          <ProgressLabel>
            {status === "downloaded" ? "Terminé" : "Progression"}
          </ProgressLabel>
          <span className="text-xs text-muted-foreground tabular-nums">
            {percent === null ? "En cours" : `${percent} %`}
          </span>
        </div>
      </Progress>

      <p className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground tabular-nums">
        <span>{total ? "Taille du paquet" : "Taille transmise par le serveur"}</span>
        <span>
        {formatBytes(downloaded)}
        {total ? ` sur ${formatBytes(total)}` : " téléchargés"}
        </span>
      </p>
    </div>
  )
}

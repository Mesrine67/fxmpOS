"use client"

import { CheckCircle2Icon, LoaderCircleIcon } from "lucide-react"

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
      className="rounded-lg border bg-background/60 p-4"
      role="status"
    >
      <div className="mb-4 flex items-start gap-3">
        {status === "downloading" ? (
          <LoaderCircleIcon className="mt-0.5 size-4 shrink-0 animate-spin text-primary" />
        ) : (
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
        )}
        <div className="min-w-0">
          <p className="font-medium">
            {status === "downloading"
              ? "Téléchargement de la mise à jour"
              : "Téléchargement terminé"}
          </p>
          <p className="text-sm text-muted-foreground">
            {status === "downloading"
              ? "L’application reste utilisable pendant le téléchargement."
              : "Le paquet est prêt. Lancez l’installation quand vous le souhaitez."}
          </p>
        </div>
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

      <p className="mt-2 text-right text-xs text-muted-foreground tabular-nums">
        {formatBytes(downloaded)}
        {total ? ` sur ${formatBytes(total)}` : " téléchargés"}
      </p>
    </div>
  )
}

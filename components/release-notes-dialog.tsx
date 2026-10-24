"use client"

import { ScrollTextIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type ReleaseNotesDialogProps = {
  notes: string
  version: string
  releaseDate?: string | null
  triggerLabel?: string
  nested?: boolean
}

function renderReleaseNotes(notes: string) {
  return notes.split(/\r?\n/).map((line, index) => {
    const text = line.trim()
    if (!text) {
      return <div aria-hidden="true" className="h-1" key={index} />
    }

    const heading = text.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      return (
        <h3
          className="pt-3 font-semibold text-foreground first:pt-0"
          key={index}
        >
          {heading[2]}
        </h3>
      )
    }

    const bullet = text.match(/^[-*]\s+(.+)$/)
    if (bullet) {
      return (
        <p
          className="pl-3 before:mr-2 before:text-primary before:content-['•']"
          key={index}
        >
          {bullet[1]}
        </p>
      )
    }

    return <p key={index}>{text}</p>
  })
}

function formatReleaseDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date)
}

export function ReleaseNotesDialog({
  notes,
  version,
  releaseDate,
  triggerLabel = "Notes de version",
  nested = false,
}: ReleaseNotesDialogProps) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button size="sm" type="button" variant="outline">
            <ScrollTextIcon />
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent
        className={`flex max-h-[min(86vh,48rem)] flex-col gap-4 sm:max-w-2xl ${nested ? "z-[121]" : ""}`}
        overlayClassName={nested ? "z-[120]" : undefined}
      >
        <DialogHeader className="pr-8">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-base">
            Notes de version
            <Badge variant="secondary">v{version}</Badge>
          </DialogTitle>
          <DialogDescription>
            {releaseDate
              ? `Publiée le ${formatReleaseDate(releaseDate)}`
              : "Changements inclus dans cette version."}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto rounded-lg border bg-muted/20 p-4 text-sm/relaxed text-muted-foreground">
          <div className="flex flex-col gap-1">{renderReleaseNotes(notes)}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

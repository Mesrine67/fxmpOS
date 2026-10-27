"use client"

import { useEffect } from "react"
import { ActivityIcon, RefreshCwIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export default function MonitorError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error("La page Ressources n’a pas pu se charger.", {
      message: error.message,
      digest: error.digest,
    })
  }, [error])

  return (
    <main className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-6">
      <div className="w-full max-w-xl space-y-4">
        <Alert variant="destructive">
          <ActivityIcon />
          <AlertTitle>La page Ressources a rencontré un problème</AlertTitle>
          <AlertDescription>
            Les mesures locales n’ont pas pu être affichées. Tu peux relancer la
            page sans fermer FXMP OS.
            {error.digest && (
              <span className="mt-2 block font-mono text-xs opacity-80">
                Référence : {error.digest}
              </span>
            )}
          </AlertDescription>
        </Alert>
        <Button onClick={() => retry()} type="button" variant="outline">
          <RefreshCwIcon data-icon="inline-start" />
          Réessayer
        </Button>
      </div>
    </main>
  )
}

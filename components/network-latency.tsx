"use client"

import { useCallback, useRef, useState } from "react"
import { ActivityIcon, LoaderCircleIcon, RefreshCwIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useTauriRuntime } from "@/hooks/use-tauri-runtime"
import { trackedInvoke } from "@/lib/tauri"

type LatencySnapshot = {
  target: string
  samplesMs: number[]
  lostProbes: number
  totalProbes: number
  minMs: number | null
  medianMs: number | null
  jitterMs: number | null
}

function LatencyValues({ snapshot }: { snapshot: LatencySnapshot | null }) {
  const value = (milliseconds: number | null) =>
    milliseconds === null ? "—" : `${milliseconds.toFixed(1)} ms`

  return (
    <div className="grid grid-cols-3 gap-3 text-xs">
      <div>
        <p className="text-muted-foreground">Médiane</p>
        <p className="font-semibold tabular-nums">
          {value(snapshot?.medianMs ?? null)}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">Minimum</p>
        <p className="font-semibold tabular-nums">
          {value(snapshot?.minMs ?? null)}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground">Variation</p>
        <p className="font-semibold tabular-nums">
          {value(snapshot?.jitterMs ?? null)}
        </p>
      </div>
    </div>
  )
}

export function NetworkLatency() {
  const desktopRuntime = useTauriRuntime()
  const [snapshot, setSnapshot] = useState<LatencySnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (desktopRuntime !== true || inFlight.current) return
    inFlight.current = true
    setLoading(true)
    setError(null)
    try {
      setSnapshot(
        await trackedInvoke<LatencySnapshot>("measure_network_latency")
      )
    } catch {
      setError("Mesure réseau indisponible")
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [desktopRuntime])

  const lossPercent = snapshot
    ? Math.round((snapshot.lostProbes / snapshot.totalProbes) * 100)
    : null

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon aria-hidden="true" className="size-4 text-primary" />
            Latence réseau
          </CardTitle>
          <CardDescription>
            Temps d’établissement d’une connexion TCP, mesuré localement.
          </CardDescription>
        </div>
        <Button
          disabled={desktopRuntime !== true || loading}
          onClick={() => void refresh()}
          type="button"
          variant="outline"
        >
          {loading ? (
            <LoaderCircleIcon
              aria-hidden="true"
              className="animate-spin"
              data-icon="inline-start"
            />
          ) : (
            <RefreshCwIcon aria-hidden="true" data-icon="inline-start" />
          )}
          {snapshot ? "Actualiser" : "Mesurer"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {lossPercent !== null && (
          <Badge variant={lossPercent === 0 ? "outline" : "destructive"}>
            {lossPercent}% de pertes
          </Badge>
        )}
        <LatencyValues snapshot={snapshot} />
        <p className="text-xs text-muted-foreground">
          {error ??
            (snapshot
              ? `${snapshot.samplesMs.length}/${snapshot.totalProbes} essais réussis · ${snapshot.lostProbes} en échec · ${snapshot.target} · délai max. 750 ms par essai. Mesure TCP, différente d’un ping ICMP.`
              : "5 connexions TCP vers 1.1.1.1:443, avec un délai maximal de 750 ms par essai. Aucun service FXMP ne reçoit ces mesures.")}
        </p>
      </CardContent>
    </Card>
  )
}

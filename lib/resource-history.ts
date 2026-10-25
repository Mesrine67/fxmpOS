import { LazyStore } from "@tauri-apps/plugin-store"

export type ResourceHistoryPoint = {
  sampledAtMs: number
  cpuPercent: number
  memoryPercent: number
}

const HISTORY_STORE_PATH = "fxmp-resource-history.json"
const HISTORY_STORE_KEY = "minuteSamples"
const HISTORY_RETENTION_MS = 24 * 60 * 60 * 1000
const MAX_HISTORY_POINTS = 1_440
const historyStore = new LazyStore(HISTORY_STORE_PATH, { autoSave: false })
let writeQueue = Promise.resolve()

function normalizeHistory(value: unknown): ResourceHistoryPoint[] {
  if (!Array.isArray(value)) return []

  const cutoff = Date.now() - HISTORY_RETENTION_MS
  const normalized = value
    .filter(
      (point): point is ResourceHistoryPoint =>
        !!point &&
        typeof point === "object" &&
        Number.isFinite((point as ResourceHistoryPoint).sampledAtMs) &&
        Number.isFinite((point as ResourceHistoryPoint).cpuPercent) &&
        Number.isFinite((point as ResourceHistoryPoint).memoryPercent) &&
        (point as ResourceHistoryPoint).sampledAtMs >= cutoff &&
        (point as ResourceHistoryPoint).sampledAtMs <= Date.now() + 60_000
    )
    .map((point) => ({
      sampledAtMs: point.sampledAtMs,
      cpuPercent: Math.max(0, Math.min(100, point.cpuPercent)),
      memoryPercent: Math.max(0, Math.min(100, point.memoryPercent)),
    }))
    .sort((left, right) => left.sampledAtMs - right.sampledAtMs)

  const byMinute = new Map<number, ResourceHistoryPoint>()
  for (const point of normalized) {
    byMinute.set(Math.floor(point.sampledAtMs / 60_000) * 60_000, point)
  }
  return [...byMinute.values()].slice(-MAX_HISTORY_POINTS)
}

export async function loadResourceHistory(): Promise<ResourceHistoryPoint[]> {
  await historyStore.init()
  const points = normalizeHistory(
    await historyStore.get<unknown>(HISTORY_STORE_KEY)
  )
  const cutoff = Date.now() - HISTORY_RETENTION_MS
  return points.filter((point) => point.sampledAtMs >= cutoff)
}

export function saveResourceHistory(
  points: ResourceHistoryPoint[]
): Promise<void> {
  const normalized = normalizeHistory(points).filter(
    (point) => point.sampledAtMs >= Date.now() - HISTORY_RETENTION_MS
  )
  const operation = writeQueue
    .catch(() => undefined)
    .then(async () => {
      await historyStore.init()
      await historyStore.set(HISTORY_STORE_KEY, normalized)
      await historyStore.save()
    })
  writeQueue = operation.catch(() => undefined)
  return operation
}

"use client"

import { useEffect, useMemo, useSyncExternalStore } from "react"
import { isTauri } from "@tauri-apps/api/core"
import { LazyStore } from "@tauri-apps/plugin-store"

export type OverlayAnchor =
  "topLeft" | "topRight" | "bottomLeft" | "bottomRight"

export type OverlayPreferences = {
  enabled: boolean
  alwaysOnTop: boolean
  clickThrough: boolean
  opacityPercent: number
  anchor: OverlayAnchor
  monitorId: string | null
  positionX: number | null
  positionY: number | null
}

const LEGACY_PREFERENCES_KEY = "fxmp.overlay.preferences.v1"
const STORE_PATH = "fxmp-settings.json"
const STORE_KEY = "overlayPreferences"

export const DEFAULT_OVERLAY_PREFERENCES: OverlayPreferences = {
  enabled: false,
  alwaysOnTop: true,
  clickThrough: false,
  opacityPercent: 92,
  anchor: "topRight",
  monitorId: null,
  positionX: null,
  positionY: null,
}

const DEFAULT_PREFERENCES_SNAPSHOT = JSON.stringify(DEFAULT_OVERLAY_PREFERENCES)
const anchors: OverlayAnchor[] = [
  "topLeft",
  "topRight",
  "bottomLeft",
  "bottomRight",
]
const preferencesStore = new LazyStore(STORE_PATH, { autoSave: false })
const subscribers = new Set<() => void>()
let preferencesSnapshot = DEFAULT_PREFERENCES_SNAPSHOT
let preferencesReady = false
let initialization: Promise<OverlayPreferences> | undefined
let stopStoreListener: (() => void) | undefined
let migrationNeedsSave = false

export function normalizeOverlayPreferences(
  value: unknown
): OverlayPreferences {
  if (!value || typeof value !== "object") {
    return DEFAULT_OVERLAY_PREFERENCES
  }

  const candidate = value as Partial<OverlayPreferences>

  return {
    enabled:
      typeof candidate.enabled === "boolean"
        ? candidate.enabled
        : DEFAULT_OVERLAY_PREFERENCES.enabled,
    alwaysOnTop:
      typeof candidate.alwaysOnTop === "boolean"
        ? candidate.alwaysOnTop
        : DEFAULT_OVERLAY_PREFERENCES.alwaysOnTop,
    clickThrough:
      typeof candidate.clickThrough === "boolean"
        ? candidate.clickThrough
        : DEFAULT_OVERLAY_PREFERENCES.clickThrough,
    opacityPercent:
      typeof candidate.opacityPercent === "number" &&
      Number.isFinite(candidate.opacityPercent)
        ? Math.min(100, Math.max(35, Math.round(candidate.opacityPercent)))
        : DEFAULT_OVERLAY_PREFERENCES.opacityPercent,
    anchor:
      typeof candidate.anchor === "string" &&
      anchors.includes(candidate.anchor as OverlayAnchor)
        ? (candidate.anchor as OverlayAnchor)
        : DEFAULT_OVERLAY_PREFERENCES.anchor,
    monitorId:
      typeof candidate.monitorId === "string" ? candidate.monitorId : null,
    positionX:
      typeof candidate.positionX === "number" &&
      Number.isSafeInteger(candidate.positionX)
        ? candidate.positionX
        : null,
    positionY:
      typeof candidate.positionY === "number" &&
      Number.isSafeInteger(candidate.positionY)
        ? candidate.positionY
        : null,
  }
}

function publishPreferences(value: unknown) {
  const nextSnapshot = JSON.stringify(normalizeOverlayPreferences(value))
  if (nextSnapshot === preferencesSnapshot) return

  preferencesSnapshot = nextSnapshot
  subscribers.forEach((subscriber) => subscriber())
}

function publishPreferencesReady() {
  if (preferencesReady) return
  preferencesReady = true
  subscribers.forEach((subscriber) => subscriber())
}

function readLegacyPreferences(): OverlayPreferences | undefined {
  try {
    const legacyValue = window.localStorage.getItem(LEGACY_PREFERENCES_KEY)
    return legacyValue === null
      ? undefined
      : normalizeOverlayPreferences(JSON.parse(legacyValue))
  } catch {
    return undefined
  }
}

function clearLegacyPreferences() {
  try {
    window.localStorage.removeItem(LEGACY_PREFERENCES_KEY)
  } catch {
    // The native store is already authoritative; a stale legacy entry is harmless.
  }
}

export function initializeOverlayPreferences() {
  if (!isTauri()) {
    publishPreferencesReady()
    return Promise.resolve(DEFAULT_OVERLAY_PREFERENCES)
  }
  if (initialization) return initialization

  initialization = (async () => {
    let storedValue = await preferencesStore.get<unknown>(STORE_KEY)

    if (storedValue === undefined) {
      storedValue = readLegacyPreferences() ?? DEFAULT_OVERLAY_PREFERENCES
      await preferencesStore.set(STORE_KEY, storedValue)
      migrationNeedsSave = true
    }

    if (migrationNeedsSave) {
      await preferencesStore.save()
      migrationNeedsSave = false
    }

    publishPreferences(storedValue)
    clearLegacyPreferences()

    stopStoreListener = await preferencesStore.onKeyChange<unknown>(
      STORE_KEY,
      (value) => publishPreferences(value ?? DEFAULT_OVERLAY_PREFERENCES)
    )

    // Re-read after subscribing so a write from another window during startup
    // cannot leave this WebView with a stale snapshot.
    const latestValue = await preferencesStore.get<unknown>(STORE_KEY)
    publishPreferences(latestValue ?? DEFAULT_OVERLAY_PREFERENCES)
    publishPreferencesReady()
    return normalizeOverlayPreferences(latestValue)
  })().catch((error: unknown) => {
    initialization = undefined
    stopStoreListener?.()
    stopStoreListener = undefined
    throw error
  })

  return initialization
}

export async function readOverlayPreferences(): Promise<OverlayPreferences> {
  await initializeOverlayPreferences()
  return normalizeOverlayPreferences(JSON.parse(preferencesSnapshot))
}

function subscribeToPreferences(onChange: () => void) {
  subscribers.add(onChange)
  return () => subscribers.delete(onChange)
}

function getPreferencesSnapshot() {
  return preferencesSnapshot
}

function getPreferencesReadySnapshot() {
  return preferencesReady
}

export function useOverlayPreferences() {
  const snapshot = useSyncExternalStore(
    subscribeToPreferences,
    getPreferencesSnapshot,
    () => DEFAULT_PREFERENCES_SNAPSHOT
  )

  useEffect(() => {
    void initializeOverlayPreferences().catch((error: unknown) => {
      console.error("Impossible de charger les préférences de l’overlay", error)
    })
  }, [])

  return useMemo(() => {
    try {
      return normalizeOverlayPreferences(JSON.parse(snapshot))
    } catch {
      return DEFAULT_OVERLAY_PREFERENCES
    }
  }, [snapshot])
}

export function useOverlayPreferencesReady() {
  const ready = useSyncExternalStore(
    subscribeToPreferences,
    getPreferencesReadySnapshot,
    () => false
  )

  useEffect(() => {
    void initializeOverlayPreferences().catch((error: unknown) => {
      console.error("Impossible de charger les préférences de l’overlay", error)
    })
  }, [])

  return ready
}

export async function writeOverlayPreferences(value: OverlayPreferences) {
  const next = normalizeOverlayPreferences(value)
  if (!isTauri()) {
    publishPreferences(next)
    return
  }

  await initializeOverlayPreferences()
  const previous = await preferencesStore.get<unknown>(STORE_KEY)
  await preferencesStore.set(STORE_KEY, next)
  try {
    await preferencesStore.save()
  } catch (error) {
    // `set()` updates the shared in-memory store and notifies other windows
    // before save completes. Restore that cache if persistence fails.
    await preferencesStore.set(
      STORE_KEY,
      previous ?? DEFAULT_OVERLAY_PREFERENCES
    )
    await preferencesStore.save().catch(() => undefined)
    throw error
  }
  publishPreferences(next)
}

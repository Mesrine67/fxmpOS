"use client"

import { useMemo, useSyncExternalStore } from "react"

export type OverlayAnchor = "topLeft" | "topRight" | "bottomLeft" | "bottomRight"

export type OverlayPreferences = {
  enabled: boolean
  alwaysOnTop: boolean
  clickThrough: boolean
  opacityPercent: number
  anchor: OverlayAnchor
  monitorId: string | null
}

export const OVERLAY_PREFERENCES_KEY = "fxmp.overlay.preferences.v1"

export const DEFAULT_OVERLAY_PREFERENCES: OverlayPreferences = {
  enabled: false,
  alwaysOnTop: true,
  clickThrough: false,
  opacityPercent: 92,
  anchor: "topRight",
  monitorId: null,
}

const PREFERENCES_CHANGED_EVENT = "fxmp:overlay-preferences-changed"
const DEFAULT_PREFERENCES_SNAPSHOT = JSON.stringify(
  DEFAULT_OVERLAY_PREFERENCES
)

const anchors: OverlayAnchor[] = [
  "topLeft",
  "topRight",
  "bottomLeft",
  "bottomRight",
]

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
  }
}

export function readOverlayPreferences(): OverlayPreferences {
  try {
    return normalizeOverlayPreferences(
      JSON.parse(window.localStorage.getItem(OVERLAY_PREFERENCES_KEY) ?? "null")
    )
  } catch {
    return DEFAULT_OVERLAY_PREFERENCES
  }
}

function getPreferencesSnapshot() {
  try {
    return (
      window.localStorage.getItem(OVERLAY_PREFERENCES_KEY) ??
      DEFAULT_PREFERENCES_SNAPSHOT
    )
  } catch {
    return DEFAULT_PREFERENCES_SNAPSHOT
  }
}

function subscribeToPreferences(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(PREFERENCES_CHANGED_EVENT, onChange)

  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(PREFERENCES_CHANGED_EVENT, onChange)
  }
}

export function useOverlayPreferences() {
  const snapshot = useSyncExternalStore(
    subscribeToPreferences,
    getPreferencesSnapshot,
    () => DEFAULT_PREFERENCES_SNAPSHOT
  )

  return useMemo(() => {
    try {
      return normalizeOverlayPreferences(JSON.parse(snapshot))
    } catch {
      return DEFAULT_OVERLAY_PREFERENCES
    }
  }, [snapshot])
}

export function writeOverlayPreferences(value: OverlayPreferences) {
  window.localStorage.setItem(
    OVERLAY_PREFERENCES_KEY,
    JSON.stringify(normalizeOverlayPreferences(value))
  )
  window.dispatchEvent(new Event(PREFERENCES_CHANGED_EVENT))
}

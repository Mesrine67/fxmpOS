"use client"

import { isTauri } from "@tauri-apps/api/core"
import { LazyStore } from "@tauri-apps/plugin-store"
import { useEffect, useMemo, useSyncExternalStore } from "react"

export type NotificationPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"

export type NotificationPreferences = {
  inAppEnabled: boolean
  nativeEnabled: boolean
  position: NotificationPosition
  duration: number
  closeButton: boolean
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inAppEnabled: true,
  nativeEnabled: false,
  position: "bottom-right",
  duration: 5000,
  closeButton: true,
}

const STORE_PATH = "fxmp-settings.json"
const STORE_KEY = "notificationPreferences"
const preferencesStore = new LazyStore(STORE_PATH, { autoSave: false })
const subscribers = new Set<() => void>()
const DEFAULT_SNAPSHOT = JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES)
let snapshot = DEFAULT_SNAPSHOT
let ready = false
let initialization: Promise<NotificationPreferences> | undefined
let writeQueue: Promise<void> = Promise.resolve()

const positions: NotificationPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
]
// Zero represents a persistent toast. Infinity cannot be serialized to JSON.
const durations = [0, 3000, 5000, 8000]

export function normalizeNotificationPreferences(
  value: unknown
): NotificationPreferences {
  if (!value || typeof value !== "object") return DEFAULT_NOTIFICATION_PREFERENCES
  const candidate = value as Partial<NotificationPreferences>
  return {
    inAppEnabled:
      typeof candidate.inAppEnabled === "boolean"
        ? candidate.inAppEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.inAppEnabled,
    nativeEnabled:
      typeof candidate.nativeEnabled === "boolean"
        ? candidate.nativeEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.nativeEnabled,
    position:
      typeof candidate.position === "string" &&
      positions.includes(candidate.position as NotificationPosition)
        ? (candidate.position as NotificationPosition)
        : DEFAULT_NOTIFICATION_PREFERENCES.position,
    duration:
      typeof candidate.duration === "number" &&
      durations.includes(candidate.duration)
        ? candidate.duration
        : DEFAULT_NOTIFICATION_PREFERENCES.duration,
    closeButton:
      typeof candidate.closeButton === "boolean"
        ? candidate.closeButton
        : DEFAULT_NOTIFICATION_PREFERENCES.closeButton,
  }
}

function publish(value: unknown) {
  const next = JSON.stringify(normalizeNotificationPreferences(value))
  if (snapshot === next) return
  snapshot = next
  subscribers.forEach((subscriber) => subscriber())
}

function publishReady() {
  if (ready) return
  ready = true
  subscribers.forEach((subscriber) => subscriber())
}

export function initializeNotificationPreferences() {
  if (!isTauri()) {
    publishReady()
    return Promise.resolve(DEFAULT_NOTIFICATION_PREFERENCES)
  }
  if (initialization) return initialization

  initialization = (async () => {
    const stored = await preferencesStore.get<unknown>(STORE_KEY)
    if (stored === undefined) {
      await preferencesStore.set(STORE_KEY, DEFAULT_NOTIFICATION_PREFERENCES)
      await preferencesStore.save()
    }
    let current = await preferencesStore.get<unknown>(STORE_KEY)
    publish(current ?? DEFAULT_NOTIFICATION_PREFERENCES)
    await preferencesStore.onKeyChange<unknown>(STORE_KEY, (value) =>
      publish(value ?? DEFAULT_NOTIFICATION_PREFERENCES)
    )
    current = await preferencesStore.get<unknown>(STORE_KEY)
    publish(current ?? DEFAULT_NOTIFICATION_PREFERENCES)
    publishReady()
    return normalizeNotificationPreferences(current)
  })().catch((error: unknown) => {
    initialization = undefined
    throw error
  })
  return initialization
}

export async function readNotificationPreferences() {
  await initializeNotificationPreferences()
  return normalizeNotificationPreferences(JSON.parse(snapshot))
}

export async function writeNotificationPreferences(
  update: Partial<NotificationPreferences>
) {
  const operation = writeQueue.then(async () => {
    // Read/merge/save as one queued operation so quick changes to separate
    // controls cannot overwrite each other with stale preference snapshots.
    const current = await readNotificationPreferences()
    const next = normalizeNotificationPreferences({ ...current, ...update })
    if (!isTauri()) {
      publish(next)
      return
    }

    const previous = await preferencesStore.get<unknown>(STORE_KEY)
    await preferencesStore.set(STORE_KEY, next)
    try {
      await preferencesStore.save()
    } catch (error) {
      await preferencesStore.set(
        STORE_KEY,
        previous ?? DEFAULT_NOTIFICATION_PREFERENCES
      )
      await preferencesStore.save().catch(() => undefined)
      throw error
    }
    publish(next)
  })
  writeQueue = operation.catch(() => undefined)
  return operation
}

function subscribe(callback: () => void) {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

function getSnapshot() {
  return snapshot
}

function getReadySnapshot() {
  return ready
}

export function useNotificationPreferences() {
  const value = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SNAPSHOT)
  useEffect(() => {
    void initializeNotificationPreferences().catch((error: unknown) => {
      console.error("Impossible de charger les préférences de notification", error)
    })
  }, [])
  return useMemo(() => {
    try {
      return normalizeNotificationPreferences(JSON.parse(value))
    } catch {
      return DEFAULT_NOTIFICATION_PREFERENCES
    }
  }, [value])
}

export function useNotificationPreferencesReady() {
  const value = useSyncExternalStore(subscribe, getReadySnapshot, () => false)
  useEffect(() => {
    void initializeNotificationPreferences().catch((error: unknown) => {
      console.error("Impossible de charger les préférences de notification", error)
    })
  }, [])
  return value
}

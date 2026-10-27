"use client"

import { isTauri } from "@tauri-apps/api/core"
import { LazyStore } from "@tauri-apps/plugin-store"
import { useEffect, useMemo, useSyncExternalStore } from "react"

export type ThemeMode = "system" | "light" | "dark"
export type ThemeStyle = "mira" | "nova"
export type ThemeBase = "neutral" | "zinc" | "slate" | "stone"
export type ThemeAccent = "red" | "blue" | "green" | "violet" | "amber"
export type ThemeFont = "geist-mono" | "geist" | "system" | "inter"
export type ThemePreferences = {
  mode: ThemeMode
  style: ThemeStyle
  base: ThemeBase
  accent: ThemeAccent
  chart: ThemeAccent
  font: ThemeFont
  heading: ThemeFont
  radius: number
}

export const DEFAULT_THEME_PREFERENCES: ThemePreferences = {
  mode: "system",
  style: "mira",
  base: "neutral",
  accent: "red",
  chart: "red",
  font: "geist-mono",
  heading: "geist-mono",
  radius: 0.45,
}

const STORE_PATH = "fxmp-settings.json"
const STORE_KEY = "themePreferences"
const store = new LazyStore(STORE_PATH, { autoSave: false })
const subscribers = new Set<() => void>()
const DEFAULT_SNAPSHOT = JSON.stringify(DEFAULT_THEME_PREFERENCES)
let snapshot = DEFAULT_SNAPSHOT
let ready = false
let initialization: Promise<ThemePreferences> | undefined
let queue: Promise<void> = Promise.resolve()

const modes: ThemeMode[] = ["system", "light", "dark"]
const styles: ThemeStyle[] = ["mira", "nova"]
const bases: ThemeBase[] = ["neutral", "zinc", "slate", "stone"]
const accents: ThemeAccent[] = ["red", "blue", "green", "violet", "amber"]
const fonts: ThemeFont[] = ["geist-mono", "geist", "system", "inter"]

export function normalizeThemePreferences(value: unknown): ThemePreferences {
  const candidate = value && typeof value === "object"
    ? value as Partial<ThemePreferences>
    : {}
  return {
    mode: modes.includes(candidate.mode as ThemeMode) ? candidate.mode as ThemeMode : DEFAULT_THEME_PREFERENCES.mode,
    style: styles.includes(candidate.style as ThemeStyle) ? candidate.style as ThemeStyle : DEFAULT_THEME_PREFERENCES.style,
    base: bases.includes(candidate.base as ThemeBase) ? candidate.base as ThemeBase : DEFAULT_THEME_PREFERENCES.base,
    accent: accents.includes(candidate.accent as ThemeAccent) ? candidate.accent as ThemeAccent : DEFAULT_THEME_PREFERENCES.accent,
    chart: accents.includes(candidate.chart as ThemeAccent) ? candidate.chart as ThemeAccent : DEFAULT_THEME_PREFERENCES.chart,
    font: fonts.includes(candidate.font as ThemeFont) ? candidate.font as ThemeFont : DEFAULT_THEME_PREFERENCES.font,
    heading: fonts.includes(candidate.heading as ThemeFont) ? candidate.heading as ThemeFont : DEFAULT_THEME_PREFERENCES.heading,
    radius: typeof candidate.radius === "number" && [0.25, 0.45, 0.65, 0.85].includes(candidate.radius)
      ? candidate.radius
      : DEFAULT_THEME_PREFERENCES.radius,
  }
}

function publish(value: unknown) {
  const next = JSON.stringify(normalizeThemePreferences(value))
  if (snapshot === next) return
  snapshot = next
  subscribers.forEach((subscriber) => subscriber())
}

function publishReady() {
  if (ready) return
  ready = true
  subscribers.forEach((subscriber) => subscriber())
}

export function initializeThemePreferences() {
  if (!isTauri()) {
    publishReady()
    return Promise.resolve(DEFAULT_THEME_PREFERENCES)
  }
  if (initialization) return initialization
  initialization = (async () => {
    let current = await store.get<unknown>(STORE_KEY)
    if (current === undefined) {
      current = DEFAULT_THEME_PREFERENCES
      await store.set(STORE_KEY, current)
      await store.save()
    }
    publish(current)
    await store.onKeyChange<unknown>(STORE_KEY, (value) => publish(value))
    current = await store.get<unknown>(STORE_KEY)
    publish(current)
    publishReady()
    return normalizeThemePreferences(current)
  })().catch((error: unknown) => {
    initialization = undefined
    throw error
  })
  return initialization
}

export async function readThemePreferences() {
  await initializeThemePreferences()
  return normalizeThemePreferences(JSON.parse(snapshot))
}

export async function writeThemePreferences(update: Partial<ThemePreferences>) {
  const operation = queue.then(async () => {
    const next = normalizeThemePreferences({ ...(await readThemePreferences()), ...update })
    if (!isTauri()) {
      publish(next)
      return
    }
    const previous = await store.get<unknown>(STORE_KEY)
    await store.set(STORE_KEY, next)
    try {
      await store.save()
    } catch (error) {
      await store.set(STORE_KEY, previous ?? DEFAULT_THEME_PREFERENCES)
      await store.save().catch(() => undefined)
      throw error
    }
    publish(next)
  })
  queue = operation.catch(() => undefined)
  return operation
}

function subscribe(callback: () => void) {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

function getSnapshot() {
  return snapshot
}

export function useThemePreferences() {
  const value = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SNAPSHOT)
  useEffect(() => {
    void initializeThemePreferences().catch((error: unknown) => {
      console.error("Impossible de charger les préférences de thème", error)
    })
  }, [])
  return useMemo(() => {
    try { return normalizeThemePreferences(JSON.parse(value)) }
    catch { return DEFAULT_THEME_PREFERENCES }
  }, [value])
}

export function useThemePreferencesReady() {
  const value = useSyncExternalStore(subscribe, () => ready, () => false)
  useEffect(() => {
    void initializeThemePreferences().catch((error: unknown) => {
      console.error("Impossible de charger les préférences de thème", error)
    })
  }, [])
  return value
}

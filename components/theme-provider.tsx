"use client"

import * as React from "react"

import {
  DEFAULT_THEME_PREFERENCES,
  useThemePreferences,
  useThemePreferencesReady,
  writeThemePreferences,
  type ThemeMode,
} from "@/lib/theme-preferences"

type ThemeContextValue = {
  theme: ThemeMode
  resolvedTheme: "light" | "dark"
  setTheme: (theme: ThemeMode) => void
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: DEFAULT_THEME_PREFERENCES.mode,
  resolvedTheme: "dark",
  setTheme: () => undefined,
})

function applyTheme(mode: ThemeMode, preferences: ReturnType<typeof useThemePreferences>) {
  const root = document.documentElement
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  const resolved = mode === "system" ? (systemDark ? "dark" : "light") : mode
  root.classList.toggle("dark", resolved === "dark")
  root.dataset.fxmpMode = mode
  root.dataset.fxmpStyle = preferences.style
  root.dataset.fxmpBase = preferences.base
  root.dataset.fxmpAccent = preferences.accent
  root.dataset.fxmpChart = preferences.chart
  root.dataset.fxmpFont = preferences.font
  root.dataset.fxmpHeading = preferences.heading
  root.style.setProperty("--radius", `${preferences.radius}rem`)
  return resolved
}

function subscribeToSystemTheme(onChange: () => void) {
  const query = window.matchMedia("(prefers-color-scheme: dark)")
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function getSystemThemeSnapshot() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme, theme } = React.useContext(ThemeContext)
  React.useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false
      return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.toLowerCase() !== "d" || isTypingTarget(event.target)) return
      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [resolvedTheme, setTheme, theme])
  return null
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preferences = useThemePreferences()
  const ready = useThemePreferencesReady()
  const systemDark = React.useSyncExternalStore(subscribeToSystemTheme, getSystemThemeSnapshot, () => true)
  const resolvedTheme = preferences.mode === "system" ? (systemDark ? "dark" : "light") : preferences.mode

  React.useEffect(() => {
    if (ready) applyTheme(preferences.mode, preferences)
  }, [preferences, ready, systemDark])

  const setTheme = React.useCallback((theme: ThemeMode) => {
    void writeThemePreferences({ mode: theme }).catch((error: unknown) => {
      console.error("Impossible d’enregistrer le thème", error)
    })
  }, [])

  const value = React.useMemo<ThemeContextValue>(() => ({
    theme: preferences.mode,
    resolvedTheme,
    setTheme,
  }), [preferences.mode, resolvedTheme, setTheme])

  return (
    <ThemeContext.Provider value={value}>
      <ThemeHotkey />
      {children}
    </ThemeContext.Provider>
  )
}

export function useFxmpTheme() {
  return React.useContext(ThemeContext)
}

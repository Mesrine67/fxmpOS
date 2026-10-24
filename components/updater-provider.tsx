"use client"

import { getVersion } from "@tauri-apps/api/app"
import { relaunch } from "@tauri-apps/plugin-process"
import { check } from "@tauri-apps/plugin-updater"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { useTauriRuntime, useTauriWindowLabel } from "@/hooks/use-tauri-runtime"

const UPDATE_CHECK_INTERVAL_MS = 60_000
const FOREGROUND_RECHECK_AFTER_MS = 1_000

export type UpdaterStatus =
  "idle" | "checking" | "current" | "available" | "installing" | "error"

export type UpdaterProgress = { downloaded: number; total: number | null }

type Update = Awaited<ReturnType<typeof check>>

type UpdaterContextValue = {
  status: UpdaterStatus
  currentVersion: string | null
  availableVersion: string | null
  releaseNotes: string | null
  releaseDate: string | null
  checkedAt: Date | null
  error: string | null
  progress: UpdaterProgress | null
  checkForUpdates: () => Promise<void>
  installUpdate: () => Promise<void>
}

const UpdaterContext = createContext<UpdaterContextValue | null>(null)

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export function UpdaterProvider({ children }: { children: React.ReactNode }) {
  const runtime = useTauriRuntime()
  const windowLabel = useTauriWindowLabel()
  const [status, setStatus] = useState<UpdaterStatus>("idle")
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)
  const [availableVersion, setAvailableVersion] = useState<string | null>(null)
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null)
  const [releaseDate, setReleaseDate] = useState<string | null>(null)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<UpdaterProgress | null>(null)
  const updateRef = useRef<Update>(null)
  const checkingRef = useRef(false)
  const installingRef = useRef(false)
  const lastCheckAtRef = useRef(0)

  const checkForUpdates = useCallback(async () => {
    if (
      runtime !== true ||
      windowLabel !== "main" ||
      checkingRef.current ||
      installingRef.current
    ) {
      return
    }

    checkingRef.current = true
    setStatus("checking")
    setError(null)
    try {
      const previousUpdate = updateRef.current
      updateRef.current = null
      await previousUpdate?.close()

      const [version, update] = await Promise.all([getVersion(), check()])
      updateRef.current = update
      setCurrentVersion(version)
      setAvailableVersion(update?.version ?? null)
      setReleaseNotes(update?.body?.trim() || null)
      setReleaseDate(update?.date ?? null)
      const checked = new Date()
      lastCheckAtRef.current = checked.getTime()
      setCheckedAt(checked)
      setProgress(null)
      setStatus(update ? "available" : "current")
    } catch (cause) {
      setError(errorMessage(cause))
      setStatus("error")
    } finally {
      checkingRef.current = false
    }
  }, [runtime, windowLabel])

  useEffect(() => {
    if (runtime !== true || windowLabel !== "main") return

    void checkForUpdates()
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void checkForUpdates()
    }, UPDATE_CHECK_INTERVAL_MS)

    function refreshWhenForegrounded() {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastCheckAtRef.current >= FOREGROUND_RECHECK_AFTER_MS
      ) {
        void checkForUpdates()
      }
    }

    document.addEventListener("visibilitychange", refreshWhenForegrounded)
    window.addEventListener("focus", refreshWhenForegrounded)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", refreshWhenForegrounded)
      window.removeEventListener("focus", refreshWhenForegrounded)
      const update = updateRef.current
      updateRef.current = null
      if (update) void update.close()
    }
  }, [runtime, windowLabel, checkForUpdates])

  const installUpdate = useCallback(async () => {
    const update = updateRef.current
    if (!update || installingRef.current || checkingRef.current) return

    installingRef.current = true
    setStatus("installing")
    setError(null)
    setProgress({ downloaded: 0, total: null })
    let downloaded = 0
    let total: number | null = null

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? null
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength
        }
        setProgress({ downloaded, total })
      })
      await relaunch()
    } catch (cause) {
      installingRef.current = false
      setError(errorMessage(cause))
      setStatus("error")
    }
  }, [])

  const value = useMemo<UpdaterContextValue>(
    () => ({
      status,
      currentVersion,
      availableVersion,
      releaseNotes,
      releaseDate,
      checkedAt,
      error,
      progress,
      checkForUpdates,
      installUpdate,
    }),
    [
      status,
      currentVersion,
      availableVersion,
      releaseNotes,
      releaseDate,
      checkedAt,
      error,
      progress,
      checkForUpdates,
      installUpdate,
    ]
  )

  return (
    <UpdaterContext.Provider value={value}>{children}</UpdaterContext.Provider>
  )
}

export function useUpdater() {
  const updater = useContext(UpdaterContext)
  if (!updater) {
    throw new Error("useUpdater doit être utilisé dans UpdaterProvider.")
  }
  return updater
}

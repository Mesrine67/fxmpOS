"use client"

import { isTauri } from "@tauri-apps/api/core"
import { getCurrentWindow } from "@tauri-apps/api/window"
import {
  isPermissionGranted,
  sendNotification,
} from "@tauri-apps/plugin-notification"
import { toast } from "sonner"

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  readNotificationPreferences,
} from "@/lib/notification-preferences"

export type FxmpNotificationLevel = "success" | "info" | "warning" | "error"

/**
 * Routes an FXMP event to an in-app toast while the main window is focused,
 * or to a Windows notification when the user enabled it and the app is in the
 * background. No system details should be placed in title/body.
 */
export async function notifyFxmp(
  level: FxmpNotificationLevel,
  title: string,
  body?: string
) {
  let preferences = DEFAULT_NOTIFICATION_PREFERENCES
  try {
    preferences = await readNotificationPreferences()
  } catch (error) {
    console.error("Impossible de lire les préférences de notification", error)
  }
  const desktop = isTauri()
  const focused = desktop
    ? await getCurrentWindow()
        .isFocused()
        .catch(() => true)
    : true

  if (focused && preferences.inAppEnabled) {
    toast[level](title, body ? { description: body } : undefined)
    return "in-app" as const
  }

  if (!desktop || focused || !preferences.nativeEnabled) return undefined
  try {
    if (!(await isPermissionGranted())) return undefined
    await sendNotification({ title, body })
    return "native" as const
  } catch (error) {
    console.error("Impossible d’envoyer une notification Windows", error)
    return undefined
  }
}

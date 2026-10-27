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
 * Routes an FXMP event to each enabled channel independently. In-app toasts
 * are useful while the window is focused; native Windows notifications are
 * controlled separately and remain available even while FXMP OS is focused.
 * No system details should be placed in title/body.
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

  const sent: Array<"in-app" | "native"> = []

  if (focused && preferences.inAppEnabled) {
    toast[level](title, body ? { description: body } : undefined)
    sent.push("in-app")
  }

  if (desktop && preferences.nativeEnabled) {
    try {
      if (await isPermissionGranted()) {
        await sendNotification({ title, body })
        sent.push("native")
      }
    } catch (error) {
      console.error("Impossible d’envoyer une notification Windows", error)
    }
  }

  if (sent.length === 2) return "both" as const
  return sent[0]
}

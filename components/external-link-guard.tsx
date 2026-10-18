"use client"

import { useEffect } from "react"

const DEBUG_EVENT_NAME = "ctui:debug"
const EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"])

function isModifiedClick(event: MouseEvent) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
}

function getNavigationAction(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href")

  if (!href || href.startsWith("#") || anchor.hasAttribute("download")) {
    return "internal" as const
  }

  try {
    const url = new URL(anchor.href, window.location.href)

    if (
      url.protocol === window.location.protocol &&
      url.origin === window.location.origin
    ) {
      return "internal" as const
    }

    return EXTERNAL_PROTOCOLS.has(url.protocol)
      ? ("external" as const)
      : ("blocked" as const)
  } catch {
    return "blocked" as const
  }
}

async function openExternalLink(href: string) {
  const safeLabel = getSafeExternalLinkLabel(href)

  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener")
    await openUrl(href)
  } catch {
    console.warn(`Failed to open external link for ${safeLabel}`)
  }
}

function getSafeExternalLinkLabel(href: string) {
  try {
    const url = new URL(href, window.location.href)
    return url.origin === "null" ? `${url.protocol}[redacted]` : url.origin
  } catch {
    return "[invalid URL]"
  }
}

function emitExternalLinkDebugEvent(href: string) {
  if (typeof window === "undefined") {
    return
  }

  window.dispatchEvent(
    new CustomEvent(DEBUG_EVENT_NAME, {
      detail: {
        id: crypto.randomUUID(),
        kind: "external-link",
        href: getSafeExternalLinkLabel(href),
        timestamp: new Date().toISOString(),
      },
    })
  )
}

export function ExternalLinkGuard() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target

      if (!(target instanceof Element)) {
        return
      }

      const anchor = target.closest("a[href]")

      if (!(anchor instanceof HTMLAnchorElement)) {
        return
      }

      const action = getNavigationAction(anchor)

      if (action === "blocked") {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      if (action !== "external" || isModifiedClick(event)) {
        return
      }

      event.preventDefault()
      emitExternalLinkDebugEvent(anchor.href)
      void openExternalLink(anchor.href)
    }

    document.addEventListener("click", handleClick, true)

    return () => {
      document.removeEventListener("click", handleClick, true)
    }
  }, [])

  return null
}

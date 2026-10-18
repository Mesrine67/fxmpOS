"use client"

import { DebugPanel } from "@/components/debug-panel"
import { useTauriWindowLabel } from "@/hooks/use-tauri-runtime"

export function DebugPanelGate() {
  const windowLabel = useTauriWindowLabel()

  return windowLabel !== null && windowLabel !== "overlay" ? (
    <DebugPanel />
  ) : null
}

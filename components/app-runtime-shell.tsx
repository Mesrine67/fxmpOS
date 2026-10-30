"use client"

import { Suspense } from "react"

import { DebugPanelGate } from "@/components/debug-panel-gate"
import { ExternalLinkGuard } from "@/components/external-link-guard"
import { OverlayBootstrap } from "@/components/overlay-bootstrap"
import { Toaster } from "@/components/ui/sonner"
import { UpdaterProvider } from "@/components/updater-provider"
import { TrayNavigationListener } from "@/components/tray-navigation-listener"
import { KeyboardShortcutsRuntime } from "@/components/keyboard-shortcuts-runtime"

function RuntimeShellContent({ children }: { children: React.ReactNode }) {
  return (
    <UpdaterProvider>
      <div data-ui-app-shell>
        <ExternalLinkGuard />
        <Suspense fallback={null}>
          <TrayNavigationListener />
        </Suspense>
      <KeyboardShortcutsRuntime />
        {process.env.NODE_ENV === "development" ? <DebugPanelGate /> : null}
        <OverlayBootstrap />
        {children}
      </div>
      <Toaster />
    </UpdaterProvider>
  )
}

export function AppRuntimeShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <UpdaterProvider>
          <div data-ui-app-shell>{children}</div>
          <Toaster />
        </UpdaterProvider>
      }
    >
      <RuntimeShellContent>{children}</RuntimeShellContent>
    </Suspense>
  )
}

import { AppShell } from "@/components/app-shell"
import { OverlaySettings } from "@/components/overlay-settings"

export default function OverlaysPage() {
  return (
    <AppShell title="Overlays">
      <main className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
          <header className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">FXMP OS · Overlays</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Overlay de monitoring
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure le widget, son écran, son emplacement et son
              comportement.
            </p>
          </header>
          <OverlaySettings />
        </div>
      </main>
    </AppShell>
  )
}

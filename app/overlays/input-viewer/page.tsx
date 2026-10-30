import { AppShell } from "@/components/app-shell"
import { InputViewerSettings } from "@/components/input-viewer-settings"

export default function InputViewerSettingsPage() {
  return (
    <AppShell title="Input Viewer">
      <main className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
          <header className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">FXMP OS · Overlays</p>
            <h1 className="text-2xl font-semibold tracking-tight">Input Viewer</h1>
            <p className="text-sm text-muted-foreground">Affichez les états actuels de la souris et du clavier au-dessus de vos jeux.</p>
          </header>
          <InputViewerSettings />
        </div>
      </main>
    </AppShell>
  )
}

import { AppShell } from "@/components/app-shell"
import { OverlaySettings } from "@/components/overlay-settings"
import { UpdaterSettings } from "@/components/updater-settings"

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <main className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <OverlaySettings />
          <UpdaterSettings />
        </div>
      </main>
    </AppShell>
  )
}

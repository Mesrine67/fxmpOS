import { AppShell } from "@/components/app-shell"
import { UpdaterSettings } from "@/components/updater-settings"

export default function SettingsPage() {
  return (
    <AppShell title="Settings">
      <UpdaterSettings />
    </AppShell>
  )
}

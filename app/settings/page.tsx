import { AppShell } from "@/components/app-shell"
import { SettingsPage as SettingsPageContent } from "@/components/settings-page"

export default function SettingsPage() {
  return (
    <AppShell title="Paramètres">
      <SettingsPageContent />
    </AppShell>
  )
}

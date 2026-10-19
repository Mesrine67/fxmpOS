import { AppShell } from "@/components/app-shell"
import { InstalledAppsPage } from "@/components/installed-apps-page"

export default function AppsPage() {
  return (
    <AppShell title="Applications">
      <InstalledAppsPage />
    </AppShell>
  )
}

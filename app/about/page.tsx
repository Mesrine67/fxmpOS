import { ExternalLinkIcon, MonitorIcon, ShieldCheckIcon } from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import packageJson from "../../package.json"

export default function AboutPage() {
  return (
    <AppShell title="À propos">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 py-8 md:px-8">
        <header className="flex flex-col gap-2">
          <Badge className="w-fit" variant="outline">
            <MonitorIcon aria-hidden="true" data-icon="inline-start" />
            Application Windows
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">FXMP OS</h1>
          <p className="text-sm text-muted-foreground">
            Centre de contrôle local pour les ressources et les outils de votre
            PC.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Version</CardTitle>
              <CardDescription>
                Build installée sur cet appareil.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-lg">{packageJson.version}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Windows x64 · Tauri 2
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheckIcon aria-hidden="true" className="text-primary" />
                Confidentialité
              </CardTitle>
              <CardDescription>Mesures lues localement.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Les informations système restent sur votre PC. FXMP OS ne
                transmet pas les détails de l’appareil aux services de mise à
                jour.
              </p>
            </CardContent>
          </Card>
        </div>

        <a
          className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          href="https://github.com/Mesrine67/fxmpOS"
          rel="noreferrer"
          target="_blank"
        >
          Code source FXMP OS
          <ExternalLinkIcon aria-hidden="true" className="size-4" />
        </a>
      </main>
    </AppShell>
  )
}

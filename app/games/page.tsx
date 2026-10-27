import Link from "next/link"
import { ArrowRightIcon, Gamepad2Icon } from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const gameSections = [
  {
    title: "localhost",
    description:
      "Accéder aux outils locaux pour les jeux et services détectés.",
    href: "/games/localhost/",
  },
  {
    title: "app games list",
    description:
      "Parcourir les jeux installés et leurs informations disponibles.",
    href: "/games/apps/",
  },
  {
    title: "settings",
    description: "Consulter les réglages propres à l’espace Games.",
    href: "/games/settings/",
  },
]

export default function GamesPage() {
  return (
    <AppShell title="Games">
      <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
        <div className="space-y-2">
          <Badge variant="outline" className="gap-1.5">
            <Gamepad2Icon aria-hidden="true" className="size-3.5" />
            Games
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">
            Espace Games
          </h1>
          <p className="text-sm text-muted-foreground">
            Accès rapide aux pages et outils de l’espace Games.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gameSections.map((section) => (
            <Card key={section.href} className="flex flex-col">
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button variant="outline" render={<Link href={section.href} />}>
                  Ouvrir
                  <ArrowRightIcon aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </AppShell>
  )
}

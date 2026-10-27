"use client"

import Link from "next/link"
import { Gamepad2Icon, ListIcon, ServerIcon, Settings2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

const sections = {
  localhost: {
    title: "localhost",
    description: "Un espace dédié aux serveurs de jeux locaux.",
    icon: ServerIcon,
    emptyTitle: "Votre espace localhost est prêt",
    emptyDescription:
      "La configuration des serveurs de jeux viendra dans cette section. Vous pouvez déjà consulter les ports et processus détectés dans Ressources.",
    action: "Voir les ressources et les ports",
    href: "/monitor/",
  },
  apps: {
    title: "app games list",
    description: "Le point de départ de votre bibliothèque de jeux.",
    icon: ListIcon,
    emptyTitle: "Une bibliothèque à compléter",
    emptyDescription:
      "La détection dédiée aux jeux sera ajoutée ici. En attendant, la page Applications permet de consulter les logiciels détectés sur ce PC.",
    action: "Voir les applications installées",
    href: "/apps/",
  },
  settings: {
    title: "settings",
    description: "Les futurs réglages de votre espace Games.",
    icon: Settings2Icon,
    emptyTitle: "Les réglages Games arrivent ici",
    emptyDescription:
      "Les options propres aux jeux seront regroupées dans cette section. Les préférences générales de FXMP OS restent accessibles dans Paramètres.",
    action: "Ouvrir les paramètres de FXMP OS",
    href: "/settings/",
  },
} as const

export function GamesSectionPage({
  section,
}: {
  section: keyof typeof sections
}) {
  const content = sections[section]
  const Icon = content.icon

  return (
    <section
      aria-labelledby="games-section-title"
      className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-4 md:p-8"
    >
      <header className="flex flex-col items-start gap-2">
        <Badge variant="outline">
          <Gamepad2Icon data-icon="inline-start" />
          Games
        </Badge>
        <h1
          id="games-section-title"
          className="text-2xl font-semibold tracking-tight"
        >
          {content.title}
        </h1>
        <p className="text-sm text-muted-foreground">{content.description}</p>
      </header>
      <Empty className="min-h-72 flex-none border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{content.emptyTitle}</EmptyTitle>
          <EmptyDescription>{content.emptyDescription}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" render={<Link href={content.href} />}>
            {content.action}
          </Button>
        </EmptyContent>
      </Empty>
    </section>
  )
}

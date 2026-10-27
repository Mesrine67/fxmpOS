import type { ReactNode } from "react"

import { AppShell } from "@/components/app-shell"

export default function GamesLayout({ children }: { children: ReactNode }) {
  return <AppShell title="Games">{children}</AppShell>
}

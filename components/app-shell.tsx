"use client"

import type { CSSProperties, ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function AppShell({
  children,
  title = "Documents",
}: {
  children: ReactNode
  title?: string
}) {
  return (
    <SidebarProvider
      className="h-full min-h-0 overflow-hidden"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="min-h-0 overflow-hidden">
        <div
          data-ui-scroll-container
          className="flex min-h-0 flex-1 flex-col"
        >
          <SiteHeader title={title} />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

"use client"

import * as React from "react"
import Link from "next/link"
import {
  AppWindowIcon,
  ActivityIcon,
  CommandIcon,
  Layers3Icon,
  MonitorIcon,
  Settings2Icon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { SidebarUpdaterAction } from "@/components/sidebar-updater-action"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navigation = [
  { title: "Vue d’ensemble", url: "/", icon: <CommandIcon /> },
  { title: "Ressources", url: "/monitor/", icon: <ActivityIcon /> },
  { title: "Applications", url: "/apps/", icon: <AppWindowIcon /> },
  { title: "Appareil", url: "/account/", icon: <MonitorIcon /> },
  { title: "Paramètres", url: "/settings/", icon: <Settings2Icon /> },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              className="min-w-0 flex-1 data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/" />}
            >
              <Layers3Icon className="size-5! text-primary" />
              <span className="text-base font-semibold">FXMP OS</span>
            </SidebarMenuButton>
            <SidebarUpdaterAction />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigation} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}

"use client"

import * as React from "react"
import Link from "next/link"
import {
  AppWindowIcon,
  CommandIcon,
  Layers3Icon,
  MonitorIcon,
  Settings2Icon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
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
  { title: "Applications", url: "/apps/", icon: <AppWindowIcon /> },
  { title: "Appareil", url: "/account/", icon: <MonitorIcon /> },
  { title: "Paramètres", url: "/settings/", icon: <Settings2Icon /> },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<Link href="/" />}
            >
              <Layers3Icon className="size-5! text-primary" />
              <span className="text-base font-semibold">FXMP OS</span>
            </SidebarMenuButton>
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

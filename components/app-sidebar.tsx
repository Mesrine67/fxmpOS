"use client"

import * as React from "react"
import {
  AppWindowIcon,
  ActivityIcon,
  CommandIcon,
  Gamepad2Icon,
  KeyboardIcon,
  MonitorIcon,
  Settings2Icon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { SidebarWorkspaceSwitcher } from "@/components/sidebar-workspace-switcher"
import { SidebarUpdaterAction } from "@/components/sidebar-updater-action"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"

const navigationByWorkspace = {
  os: [
    { title: "Vue d’ensemble", url: "/", icon: <CommandIcon /> },
    { title: "Ressources", url: "/monitor/", icon: <ActivityIcon /> },
    { title: "Applications", url: "/apps/", icon: <AppWindowIcon /> },
    { title: "Appareil", url: "/account/", icon: <MonitorIcon /> },
    { title: "Paramètres", url: "/settings/", icon: <Settings2Icon /> },
    { title: "Raccourcis clavier", url: "/shortcuts/", icon: <KeyboardIcon /> },
  ],
  overlays: [{ title: "Overlay", url: "/overlays/", icon: <MonitorIcon /> }],
  games: [
    {
      title: "Games",
      url: "/games/",
      icon: <Gamepad2Icon />,
      items: [
        { title: "localhost", url: "/games/localhost/" },
        { title: "app games list", url: "/games/apps/" },
        { title: "settings", url: "/games/settings/" },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <SidebarWorkspaceSwitcher />
          </div>
          <SidebarUpdaterAction />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain itemsByWorkspace={navigationByWorkspace} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}

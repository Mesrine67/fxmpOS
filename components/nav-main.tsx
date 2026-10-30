"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRightIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  getServerSidebarWorkspace,
  getSidebarWorkspace,
  subscribeToSidebarWorkspace,
  type SidebarWorkspace,
} from "@/lib/sidebar-workspace"
import { useSyncExternalStore } from "react"

type NavigationItem = {
  title: string
  url: string
  icon?: React.ReactNode
  items?: { title: string; url: string; icon?: React.ReactNode }[]
}

export function NavMain({
  itemsByWorkspace,
}: {
  itemsByWorkspace: Record<SidebarWorkspace, NavigationItem[]>
}) {
  const pathname = usePathname()
  const workspace = useSyncExternalStore(
    subscribeToSidebarWorkspace,
    getSidebarWorkspace,
    getServerSidebarWorkspace
  )
  const items = itemsByWorkspace[workspace]
  const currentPath = pathname.replace(/\/$/, "") || "/"
  const isActive = (url: string) => {
    const path = url.replace(/\/$/, "") || "/"
    return (
      currentPath === path ||
      (path !== "/" && currentPath.startsWith(`${path}/`))
    )
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(item.url)
            if (item.items?.length) {
              return (
                <Collapsible
                  key={item.title}
                  defaultOpen
                  className="group/collapsible"
                  render={<SidebarMenuItem />}
                >
                  <CollapsibleTrigger
                    render={<SidebarMenuButton tooltip={item.title} />}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                    <ChevronRightIcon
                      aria-hidden="true"
                      className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90 motion-reduce:transition-none"
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((child) => (
                        <SidebarMenuSubItem key={child.url}>
                          <SidebarMenuSubButton
                            isActive={isActive(child.url)}
                            aria-current={
                              isActive(child.url) ? "page" : undefined
                            }
                            render={<Link href={child.url} />}
                          >
                            {child.icon}
                            <span>{child.title}</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              )
            }
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  isActive={active}
                  aria-current={active ? "page" : undefined}
                  render={<Link href={item.url} />}
                  tooltip={item.title}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

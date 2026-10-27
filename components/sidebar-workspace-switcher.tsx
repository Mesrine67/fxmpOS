"use client"

import { useEffect, useSyncExternalStore } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  ChevronDownIcon,
  CommandIcon,
  Gamepad2Icon,
  Layers3Icon,
  MonitorIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  getServerSidebarWorkspace,
  getSidebarWorkspace,
  initializeSidebarWorkspace,
  setSidebarWorkspace,
  subscribeToSidebarWorkspace,
  type SidebarWorkspace,
} from "@/lib/sidebar-workspace"

const workspaces: {
  id: SidebarWorkspace
  label: string
  description: string
  href: string
  icon: typeof Layers3Icon
}[] = [
  {
    id: "os",
    label: "OS",
    description: "Vue d’ensemble du PC",
    href: "/",
    icon: MonitorIcon,
  },
  {
    id: "overlays",
    label: "Overlays",
    description: "Widget et affichage",
    href: "/overlays/",
    icon: Layers3Icon,
  },
  {
    id: "games",
    label: "Games",
    description: "Outils et jeux",
    href: "/games/",
    icon: Gamepad2Icon,
  },
]

export function SidebarWorkspaceSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const { isMobile } = useSidebar()
  const selected = useSyncExternalStore(
    subscribeToSidebarWorkspace,
    getSidebarWorkspace,
    getServerSidebarWorkspace
  )
  const current =
    workspaces.find((item) => item.id === selected) ?? workspaces[0]
  const CurrentIcon = current.icon

  useEffect(() => {
    void initializeSidebarWorkspace()
      .then((storedWorkspace) => {
        if (pathname !== "/" || storedWorkspace === "os") return
        router.replace(
          workspaces.find((item) => item.id === storedWorkspace)!.href
        )
      })
      .catch(() => {
        toast.error("Impossible de charger l’espace de navigation enregistré.")
      })
  }, [pathname, router])

  async function selectWorkspace(value: string) {
    if (!workspaces.some((item) => item.id === value)) return
    const next = value as SidebarWorkspace
    try {
      await setSidebarWorkspace(next)
      router.push(workspaces.find((item) => item.id === next)!.href)
    } catch {
      toast.error("Impossible d’enregistrer cet espace de navigation.")
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                tooltip={current.label}
                className="aria-expanded:bg-sidebar-accent"
              />
            }
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CurrentIcon aria-hidden="true" />
            </span>
            <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{current.label}</span>
              <span className="truncate text-xs text-muted-foreground">
                FXMP OS
              </span>
            </span>
            <ChevronDownIcon aria-hidden="true" className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={6}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>Espaces de travail</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={selected}
                onValueChange={(value) => void selectWorkspace(value)}
              >
                {workspaces.map((item) => {
                  const Icon = item.icon
                  return (
                    <DropdownMenuRadioItem
                      key={item.id}
                      value={item.id}
                      className="min-h-11 pr-8"
                    >
                      <Icon aria-hidden="true" />
                      <span className="grid min-w-0 flex-1 leading-tight">
                        <span className="font-medium">{item.label}</span>
                        <span className="truncate text-[0.6875rem] text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </DropdownMenuRadioItem>
                  )
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <div className="flex items-center gap-2 px-2 py-1.5 text-[0.6875rem] text-muted-foreground">
              <CommandIcon aria-hidden="true" />
              La navigation s’adapte à l’espace choisi
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

"use client"

import { useState } from "react"
import Link from "next/link"
import {
  CircleUserRoundIcon,
  ComputerIcon,
  CpuIcon,
  HardDriveIcon,
  Settings2Icon,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useTauriRuntime } from "@/hooks/use-tauri-runtime"
import { trackedInvoke } from "@/lib/tauri"

type LocalDeviceInfo = {
  hostname: string
  windowsUser: string | null
  osName: string | null
  osVersion: string
  architecture: string
  cpuName: string | null
  memoryTotalBytes: number
}

function formatMemory(bytes: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
    bytes / 1024 ** 3
  )
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const runtime = useTauriRuntime()
  const [device, setDevice] = useState<LocalDeviceInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function loadDeviceInfo() {
    if (runtime !== true || device || isLoading) return
    setIsLoading(true)
    try {
      const snapshot = await trackedInvoke<LocalDeviceInfo>(
        "get_system_snapshot"
      )
      setDevice(snapshot)
    } catch {
      // The account menu remains usable if the local system query fails.
    } finally {
      setIsLoading(false)
    }
  }

  const displayName =
    device?.windowsUser || device?.hostname || "Appareil Windows"
  const platform =
    device?.osName || (device ? `Windows ${device.osVersion}` : "Compte local")

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu onOpenChange={(open) => open && void loadDeviceInfo()}>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                <ComputerIcon aria-hidden="true" />
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">
                {device?.hostname && device.windowsUser
                  ? device.hostname
                  : platform}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-64"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-3 px-2 py-2">
                  <Avatar className="size-9 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                      <ComputerIcon aria-hidden="true" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 flex-1 leading-tight">
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {device?.hostname ||
                        (isLoading
                          ? "Lecture des informations locales…"
                          : platform)}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {device && (
              <div className="flex flex-col gap-2 px-2 py-2 text-xs text-muted-foreground">
                <p className="flex items-start gap-2">
                  <ComputerIcon className="mt-0.5 size-3.5 shrink-0" />
                  <span className="min-w-0 break-words">
                    {device.osName || `Windows ${device.osVersion}`} ·{" "}
                    {device.architecture}
                  </span>
                </p>
                {device.cpuName && (
                  <p className="flex items-start gap-2">
                    <CpuIcon className="mt-0.5 size-3.5 shrink-0" />
                    <span className="min-w-0 break-words">
                      {device.cpuName}
                    </span>
                  </p>
                )}
                <p className="flex items-start gap-2">
                  <HardDriveIcon className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {formatMemory(device.memoryTotalBytes)} Go de mémoire vive
                  </span>
                </p>
              </div>
            )}
            {!device && !isLoading && runtime !== true && (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                Les détails Windows sont disponibles dans l’application FXMP OS.
              </p>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/account/" />}>
                <CircleUserRoundIcon />
                Compte et appareil
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/settings/" />}>
                <Settings2Icon />
                Paramètres
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <p className="px-2 py-1 text-[0.625rem] text-muted-foreground">
              Informations lues localement · aucun e-mail ni identifiant de
              connexion
            </p>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

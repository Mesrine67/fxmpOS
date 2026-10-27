"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CircleUserRoundIcon,
  ComputerIcon,
  CpuIcon,
  HardDriveIcon,
  LoaderCircleIcon,
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
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
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
  const runtime = useTauriRuntime()
  const [device, setDevice] = useState<LocalDeviceInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const requestStarted = useRef(false)

  const loadDeviceInfo = useCallback(async () => {
    if (runtime !== true || device || isLoading || requestStarted.current)
      return
    requestStarted.current = true
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
  }, [device, isLoading, runtime])

  useEffect(() => {
    void loadDeviceInfo()
  }, [loadDeviceInfo])

  const displayName =
    device?.windowsUser || device?.hostname || "Appareil Windows"
  const platform =
    device?.osName || (device ? `Windows ${device.osVersion}` : "Compte local")

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu onOpenChange={setIsOpen}>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="border border-transparent aria-expanded:border-sidebar-border aria-expanded:bg-sidebar-accent"
              />
            }
          >
            <Avatar className="size-9 shrink-0 rounded-lg">
              <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                <ComputerIcon aria-hidden="true" />
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 gap-0.5 text-left leading-tight">
              <span className="truncate text-sm font-semibold">
                {isLoading && !device ? "Appareil Windows" : displayName}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {device?.hostname && device.windowsUser
                  ? `${device.hostname} · session locale`
                  : isLoading
                    ? "Lecture des informations locales…"
                    : platform}
              </span>
            </div>
            {isOpen ? (
              <ChevronUpIcon
                className="ml-auto shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            ) : (
              <ChevronDownIcon
                className="ml-auto shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 min-w-64 border-sidebar-border bg-popover! p-2 shadow-xl before:hidden"
            side="top"
            align="start"
            sideOffset={8}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-3 rounded-md px-2 py-2">
                  <Avatar className="size-10 shrink-0 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                      <ComputerIcon aria-hidden="true" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid min-w-0 flex-1 gap-1 leading-tight">
                    <span className="truncate text-sm font-semibold text-popover-foreground">
                      {displayName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {device?.hostname ||
                        (isLoading ? "Lecture du PC…" : platform)}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 text-[0.625rem]"
                  >
                    Local
                  </Badge>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {device ? (
              <div className="flex flex-col gap-2 px-2 py-2 text-xs text-muted-foreground">
                <p className="flex items-start gap-2">
                  <ComputerIcon
                    className="mt-0.5 size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 break-words">
                    {device.osName || `Windows ${device.osVersion}`} ·{" "}
                    {device.architecture}
                  </span>
                </p>
                {device.cpuName && (
                  <p className="flex items-start gap-2">
                    <CpuIcon
                      className="mt-0.5 size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 break-words">
                      {device.cpuName}
                    </span>
                  </p>
                )}
                <p className="flex items-start gap-2">
                  <HardDriveIcon
                    className="mt-0.5 size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    {formatMemory(device.memoryTotalBytes)} Go de mémoire vive
                  </span>
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
                {isLoading ? (
                  <LoaderCircleIcon
                    className="size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <ComputerIcon className="size-3.5" aria-hidden="true" />
                )}
                <span>
                  {isLoading
                    ? "Lecture des informations du PC…"
                    : runtime === true
                      ? "Les informations locales ne sont pas disponibles."
                      : "Les détails Windows sont disponibles dans l’application FXMP OS."}
                </span>
              </div>
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
            <p className="px-2 py-1.5 text-[0.625rem] leading-relaxed text-muted-foreground">
              Informations lues sur cet appareil. Aucun e-mail ni compte en
              ligne.
            </p>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

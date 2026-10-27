import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ExternalLinkGuard } from "@/components/external-link-guard"
import { DebugPanelGate } from "@/components/debug-panel-gate"
import { OverlayBootstrap } from "@/components/overlay-bootstrap"
import { UpdaterProvider } from "@/components/updater-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-fxmp-mode="dark"
      className={cn(
        "antialiased",
        "dark",
        fontSans.variable,
        geistMono.variable
      )}
    >
      <body>
        <ThemeProvider>
          <UpdaterProvider>
            <TooltipProvider>
              <div data-ui-app-shell>
                <ExternalLinkGuard />
                {process.env.NODE_ENV === "development" ? (
                  <DebugPanelGate />
                ) : null}
                <OverlayBootstrap />
                {children}
                <Toaster />
              </div>
            </TooltipProvider>
          </UpdaterProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

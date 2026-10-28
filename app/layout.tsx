import { Geist, Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { AppRuntimeShell } from "@/components/app-runtime-shell"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

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
        geistMono.variable,
        inter.variable
      )}
    >
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <AppRuntimeShell>{children}</AppRuntimeShell>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

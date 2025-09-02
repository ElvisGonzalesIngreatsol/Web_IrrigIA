"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth()
  const pathname = usePathname()

  if (!user || pathname === "/") {
    return <>{children}</>
  }

  const getPageTitle = (path: string) => {
    const titles: Record<string, string> = {
      "/dashboard": "Dashboard",
      "/sensores": "Sensores",
      "/sensores-iot-ia": "Sensores IoT & IA",
      "/valvulas": "Control de Válvulas",
      "/calendario": "Calendario de Riego",
      "/mapa": "Mapa en Tiempo Real",
      "/monitoreo": "Monitoreo Avanzado",
      "/fincas": "Gestión de Fincas",
      "/lotes-valvulas": "Gestión de Lotes y Válvulas",
      "/usuarios": "Gestión de Usuarios",
      "/profile": "Mi Perfil",
    }
    return titles[path] || "IrrigIA"
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 text-black">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{getPageTitle(pathname)}</h2>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

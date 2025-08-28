"use client"

import { useState, useEffect } from "react"
import { AuthProvider } from "@/contexts/auth-context"
import { DataProvider } from "@/contexts/data-context"
import { NotificationProvider } from "@/components/notification-system"
import { LoginForm } from "@/components/login-form"
import { AppSidebar } from "@/components/app-sidebar"
import { MainRouter, type ViewType } from "@/components/main-router"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth-context"
import { Separator } from "@/components/ui/separator"

function AppContent() {
  const { user, shouldRedirectToDashboard, setShouldRedirectToDashboard } = useAuth()
  const [currentView, setCurrentView] = useState<ViewType>("dashboard")
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (shouldRedirectToDashboard && user) {
      setCurrentView("dashboard")
      setShouldRedirectToDashboard(false)
    }
  }, [shouldRedirectToDashboard, user, setShouldRedirectToDashboard])

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return (
    <SidebarProvider>
      <AppSidebar currentView={currentView} onViewChange={setCurrentView} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 text-black">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              {currentView === "dashboard" && "Dashboard"}
              {currentView === "sensores" && "Sensores"}
              {currentView === "valvulas" && "Control de Válvulas"}
              {currentView === "calendario" && "Calendario de Riego"}
              {currentView === "mapa" && "Mapa en Tiempo Real"}
              {currentView === "monitoreo" && "Monitoreo Avanzado"}
              {currentView === "fincas" && "Gestión de Fincas"}
              {currentView === "lotes-valvulas" && "Gestión de Lotes"}
              {currentView === "usuarios" && "Gestión de Usuarios"}
              {currentView === "profile" && "Mi Perfil"}
            </h2>
          </div>
        </header>
        <MainRouter currentView={currentView} onViewChange={setCurrentView} />
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function Home() {
  return (
    <AuthProvider>
      <DataProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </DataProvider>
    </AuthProvider>
  )
}

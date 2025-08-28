"use client"
import { useAuth } from "@/contexts/auth-context"
import { DashboardOverview } from "./dashboard-overview"
import { SensoresDashboard } from "./sensores-dashboard"
import { SensoresIoTIA } from "./sensores-iot-ia"
import { ValvulasControl } from "./valvulas-control"
import { CalendarioRiego } from "./calendario-riego"
import { MapaTiempoReal } from "./mapa-tiempo-real"
import { MonitoreoAvanzado } from "./monitoreo-avanzado"
import { FincasManagement } from "./fincas-management"
import { LotesValvulasManagement } from "./lotes-valvulas-management"
import { UsuariosManagement } from "./usuarios-management"
import { ProfileManagement } from "./profile-management"
import { useMemo } from "react"

export type ViewType =
  | "dashboard"
  | "sensores"
  | "sensores-iot-ia"
  | "valvulas"
  | "calendario"
  | "mapa"
  | "monitoreo"
  | "fincas"
  | "lotes-valvulas"
  | "usuarios"
  | "profile"

interface MainRouterProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
}

export function MainRouter({ currentView }: MainRouterProps) {
  const { user } = useAuth()

  const currentComponent = useMemo(() => {
    console.log("[v0] Current user role for routing:", user?.role)

    switch (currentView) {
      case "dashboard":
        return <DashboardOverview />
      case "sensores":
        return <SensoresDashboard />
      case "sensores-iot-ia":
        return <SensoresIoTIA />
      case "valvulas":
        return <ValvulasControl />
      case "calendario":
        return <CalendarioRiego />
      case "mapa":
        return <MapaTiempoReal />
      case "monitoreo":
        return <MonitoreoAvanzado />
      case "fincas":
        return user?.role === "ADMIN" ? <FincasManagement /> : <DashboardOverview />
      case "lotes-valvulas":
        return <LotesValvulasManagement />
      case "usuarios":
        return user?.role === "ADMIN" ? <UsuariosManagement /> : <DashboardOverview />
      case "profile":
        return <ProfileManagement />
      default:
        return <DashboardOverview />
    }
  }, [currentView, user?.role])

  return <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">{currentComponent}</div>
}

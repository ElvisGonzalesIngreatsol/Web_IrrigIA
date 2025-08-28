"use client"

import { useAuth } from "@/contexts/auth-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  LayoutDashboard,
  Thermometer,
  Droplets,
  Calendar,
  Map,
  Monitor,
  Building2,
  Layers,
  Users,
  LogOut,
  ChevronUp,
  Brain,
  User,
} from "lucide-react"
import type { ViewType } from "./main-router"

interface AppSidebarProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
}

export function AppSidebar({ currentView, onViewChange }: AppSidebarProps) {
  const { user, logout } = useAuth()

  console.log("[v0] Sidebar - Current user:", user)
  console.log("[v0] Sidebar - User role:", user?.role)

  const clientMenuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      view: "dashboard" as ViewType,
    },
    {
      title: "Sensores IoT & IA",
      icon: Brain,
      view: "sensores-iot-ia" as ViewType,
    },
    {
      title: "Control de Válvulas",
      icon: Droplets,
      view: "valvulas" as ViewType,
    },
    {
      title: "Calendario de Riego",
      icon: Calendar,
      view: "calendario" as ViewType,
    },
    {
      title: "Mapa en Tiempo Real",
      icon: Map,
      view: "mapa" as ViewType,
    },
    {
      title: "Gestión de Lotes y Válvulas",
      icon: Layers,
      view: "lotes-valvulas" as ViewType,
    },
  ]

  const adminMenuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      view: "dashboard" as ViewType,
    },
    {
      title: "Sensores",
      icon: Thermometer,
      view: "sensores" as ViewType,
    },
    {
      title: "Control de Válvulas",
      icon: Droplets,
      view: "valvulas" as ViewType,
    },
    {
      title: "Calendario de Riego",
      icon: Calendar,
      view: "calendario" as ViewType,
    },
    {
      title: "Mapa en Tiempo Real",
      icon: Map,
      view: "mapa" as ViewType,
    },
    {
      title: "Monitoreo Avanzado",
      icon: Monitor,
      view: "monitoreo" as ViewType,
    },
    {
      title: "Gestión de Fincas",
      icon: Building2,
      view: "fincas" as ViewType,
    },
    {
      title: "Gestión de Lotes y Válvulas",
      icon: Layers,
      view: "lotes-valvulas" as ViewType,
    },
    {
      title: "Gestión de Usuarios",
      icon: Users,
      view: "usuarios" as ViewType,
    },
  ]

  const menuItems = user?.role === "ADMIN" ? adminMenuItems : clientMenuItems

  console.log("[v0] Sidebar - Selected menu items:", user?.role === "ADMIN" ? "admin" : "client")

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex items-center justify-center h-14 w-14 border-0">
            <img src="/images/irrigia-logo-new.png" alt="IrrigIA Logo" className="h-14 w-14 object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold text-[#1C352D] text-white">IrrigIA</span>
            <span className="text-sm text-[#A6B28B] font-medium">Sistema de Riego</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.view}>
                  <SidebarMenuButton isActive={currentView === item.view} onClick={() => onViewChange(item.view)}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name} />
                    <AvatarFallback>
                      {user?.name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{user?.name}</span>
                    <span className="text-xs text-black">{user?.role === "ADMIN" ? "Administrador" : "Usuario"}</span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-popper-anchor-width]">
                <DropdownMenuItem onClick={() => onViewChange("profile")}>
                  <User className="h-4 w-4 mr-2" />
                  Mi Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

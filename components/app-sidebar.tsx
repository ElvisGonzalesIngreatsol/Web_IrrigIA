"use client"

import { useAuth } from "@/contexts/auth-context"
import { usePathname } from "next/navigation"
import Link from "next/link"
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
  PanelsLeftRightIcon,
} from "lucide-react"

export function AppSidebar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const clientMenuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      title: "Sensores IoT & IA",
      icon: Brain,
      href: "/sensores-iot-ia",
    },
    {
      title: "Control de Válvulas",
      icon: Droplets,
      href: "/valvulas",
    },
    {
      title: "Calendario de Riego",
      icon: Calendar,
      href: "/calendario",
    },
    {
      title: "Mapa en Tiempo Real",
      icon: Map,
      href: "/mapa",
    },
    {
      title: "Gestión de Lotes y Válvulas",
      icon: Layers,
      href: "/lotes-valvulas",
    },
  ]

  const adminMenuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      title: "Sensores",
      icon: Thermometer,
      href: "/sensores",
    },
    {
      title: "Control de Válvulas",
      icon: Droplets,
      href: "/valvulas",
    },
    {
      title: "Calendario de Riego",
      icon: Calendar,
      href: "/calendario",
    },
    {
      title: "Mapa en Tiempo Real",
      icon: Map,
      href: "/mapa",
    },
    {
      title: "Monitoreo Avanzado",
      icon: Monitor,
      href: "/monitoreo",
    },
    {
      title: "Gestión de Fincas",
      icon: Building2,
      href: "/fincas",
    },
    {
      title: "Gestión de Dispositivos",
      icon: PanelsLeftRightIcon,
      href: "/gestion-dispositivos", 
    },
    {
      title: "Gestión de Lotes y Válvulas",
      icon: Layers,
      href: "/lotes-valvulas",
    },
    {
      title: "Gestión de Usuarios",
      icon: Users,
      href: "/usuarios",
    },
  ]

  const menuItems = user?.role === "ADMIN" ? adminMenuItems : clientMenuItems

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
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton isActive={pathname === item.href} asChild>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
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
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="h-4 w-4 mr-2" />
                    Mi Perfil
                  </Link>
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

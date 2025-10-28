"use client"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import { Layers } from "lucide-react"

export function NavLinks() {
  const { user } = useAuth()
  
  return (
    <nav className="space-y-2">
      {/* Otras opciones de navegación */}

      {/* Solo mostrar Gestión de Lotes y Válvulas para ADMIN */}
      {user?.role === "ADMIN" && (
        <Link 
          href="/dashboard/gestion-lotes-valvulas" 
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "w-full justify-start flex gap-2"
          )}
        >
          <Layers className="h-4 w-4" />
          Gestión de Lotes y Válvulas
        </Link>
      )}

      {/* Otras opciones de navegación */}
    </nav>
  )
}
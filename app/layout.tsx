import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { DataProvider } from "@/contexts/data-context"
import { NotificationProvider } from "@/components/notification-system"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "IrrigIa - Sistema de Riego Inteligente",
  description: "Plataforma avanzada para el control y monitoreo de sistemas de riego agrícola",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <DataProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

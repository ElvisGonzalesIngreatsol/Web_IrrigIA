"use client"

import { useState, useEffect } from "react"
import { CheckCircle, AlertTriangle, XCircle, Wifi } from "lucide-react"

interface StatusIndicatorProps {
  systemStatus?: "online" | "offline" | "warning"
  lastUpdate?: Date
}

export function StatusIndicator({ systemStatus = "online", lastUpdate }: StatusIndicatorProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const getStatusConfig = () => {
    switch (systemStatus) {
      case "online":
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          text: "Sistema Online",
          variant: "default" as const,
          bgColor: "bg-green-100 text-green-800 border-green-200",
        }
      case "warning":
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: "Advertencias",
          variant: "secondary" as const,
          bgColor: "bg-orange-100 text-orange-800 border-orange-200",
        }
      case "offline":
        return {
          icon: <XCircle className="h-3 w-3" />,
          text: "Sistema Offline",
          variant: "destructive" as const,
          bgColor: "bg-red-100 text-red-800 border-red-200",
        }
    }
  }

  const status = getStatusConfig()

  return (
    <div className="fixed top-4 right-4 z-40 space-y-2">
      {/* Estado del sistema */}
      <div className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-2 ${status.bgColor}`}>
        {status.icon}
        <span>{status.text}</span>
      </div>

      {/* Conectividad */}
      <div className="px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-2 bg-blue-100 text-blue-800 border-blue-200">
        <Wifi className="h-3 w-3" />
        <span>LoRaWAN: 98%</span>
      </div>

      {/* Última actualización */}
      {lastUpdate && (
        <div className="px-3 py-2 rounded-lg border text-xs font-medium bg-gray-100 text-gray-700 border-gray-200">
          <div>Última actualización:</div>
          <div>{lastUpdate.toLocaleTimeString()}</div>
        </div>
      )}
    </div>
  )
}

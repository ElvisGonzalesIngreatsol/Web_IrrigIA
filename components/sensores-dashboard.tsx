"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useData } from "@/contexts/data-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Thermometer,
  Droplets,
  Activity,
  Battery,
  Wifi,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from "lucide-react"

export function SensoresDashboard() {
  const { user } = useAuth()
  const { fincas, lotes, sensors } = useData()
  const [selectedFincaId, setSelectedFincaId] = useState<string>("all")
  const [selectedLoteId, setSelectedLoteId] = useState<string>("all")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filtrar datos según el rol del usuario
  const userFincas = user?.role === "ADMIN" ? fincas : user?.fincaId ? fincas.filter((f) => f.id === user.fincaId) : []
  const userLotes = user?.role === "ADMIN" ? lotes : lotes.filter((l) => userFincas.some((f) => f.id === l.fincaId))
  const userSensors = user?.role === "ADMIN" ? sensors : sensors.filter((s) => userLotes.some((l) => l.id === s.loteId))

  const filteredLotes = selectedFincaId === "all" ? userLotes : userLotes.filter((l) => l.fincaId === selectedFincaId)
  const filteredSensors = userSensors.filter((sensor) => {
    const sensorLote = userLotes.find((l) => l.id === sensor.loteId)
    if (!sensorLote) return false

    // Filtrar por finca si está seleccionada
    if (selectedFincaId !== "all" && sensorLote.fincaId !== selectedFincaId) return false

    // Filtrar por lote si está seleccionado
    if (selectedLoteId !== "all" && sensor.loteId !== selectedLoteId) return false

    return true
  })

  useEffect(() => {
    if (selectedFincaId !== "all") {
      const lotesInFinca = userLotes.filter((l) => l.fincaId === selectedFincaId)
      if (selectedLoteId !== "all" && !lotesInFinca.some((l) => l.id === selectedLoteId)) {
        setSelectedLoteId("all")
      }
    }
  }, [selectedFincaId, userLotes, selectedLoteId])

  // Establecer finca por defecto si es cliente
  useEffect(() => {
    if (user?.role === "USER" && user.fincaId && selectedFincaId === "all") {
      setSelectedFincaId(user.fincaId)
    }
  }, [user, selectedFincaId])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simular actualización
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  const getSensorIcon = (type: string) => {
    switch (type) {
      case "temperature":
        return <Thermometer className="h-4 w-4" />
      case "humidity":
        return <Droplets className="h-4 w-4" />
      case "ph":
        return <Activity className="h-4 w-4" />
      case "flow":
        return <Activity className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getSensorColor = (type: string, value: number) => {
    switch (type) {
      case "temperature":
        if (value > 30) return "text-red-500"
        if (value < 20) return "text-blue-500"
        return "text-green-500"
      case "humidity":
        if (value < 60) return "text-red-500"
        if (value > 85) return "text-blue-500"
        return "text-green-500"
      case "ph":
        if (value < 6.0 || value > 7.5) return "text-red-500"
        return "text-green-500"
      default:
        return "text-gray-500"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "warning":
        return "bg-yellow-500"
      case "offline":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const onlineSensors = filteredSensors.filter((s) => s.status === "online")
  const warningSensors = filteredSensors.filter((s) => s.status === "warning")
  const offlineSensors = filteredSensors.filter((s) => s.status === "offline")

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[rgba(28,53,45,1)] leading-tight">
            Dashboard de Sensores
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Monitoreo en tiempo real de las condiciones de tus plantaciones de banano
          </p>
        </div>
        <Button
          className="text-black bg-transparent px-6 py-3"
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-3 ${isRefreshing ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(user?.role === "ADMIN" || !user?.fincaId) && (
          <Card className="p-1">
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-3 font-semibold">🏢 Filtrar por Finca</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Select value={selectedFincaId} onValueChange={setSelectedFincaId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Todas las fincas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="py-3">
                    Todas las fincas ({userFincas.length})
                  </SelectItem>
                  {userFincas.map((finca) => (
                    <SelectItem key={finca.id} value={finca.id} className="py-3">
                      {finca.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        <Card className="p-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-3 font-semibold">📍 Filtrar por Lote</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Select value={selectedLoteId} onValueChange={setSelectedLoteId}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Todos los lotes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="py-3">
                  Todos los lotes ({filteredLotes.length})
                </SelectItem>
                {filteredLotes.map((lote) => {
                  const finca = userFincas.find((f) => f.id === lote.fincaId)
                  return (
                    <SelectItem key={lote.id} value={lote.id} className="py-3">
                      {lote.name} {selectedFincaId === "all" && finca && `(${finca.name})`}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1 p-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-3 font-semibold">📊 Resumen</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Sensores mostrados:</span>
                <span className="font-semibold">{filteredSensors.length}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Lotes incluidos:</span>
                <span className="font-semibold">{filteredLotes.length}</span>
              </div>
              {selectedFincaId !== "all" && (
                <div className="flex justify-between items-center py-1 text-blue-600">
                  <span>Finca seleccionada:</span>
                  <span className="font-semibold">{userFincas.find((f) => f.id === selectedFincaId)?.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas generales */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="p-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sensores</CardTitle>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold mb-2">{filteredSensors.length}</div>
            <p className="text-sm text-muted-foreground">
              {filteredLotes.length} lote{filteredLotes.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="p-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">En Línea</CardTitle>
            <Wifi className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-green-600 mb-2">{onlineSensors.length}</div>
            <p className="text-sm text-muted-foreground">
              {filteredSensors.length > 0 ? Math.round((onlineSensors.length / filteredSensors.length) * 100) : 0}%
              operativos
            </p>
          </CardContent>
        </Card>

        <Card className="p-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Con Alertas</CardTitle>
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-yellow-600 mb-2">{warningSensors.length}</div>
            <p className="text-sm text-muted-foreground">requieren atención</p>
          </CardContent>
        </Card>

        <Card className="p-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Desconectados</CardTitle>
            <Wifi className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-red-600 mb-2">{offlineSensors.length}</div>
            <p className="text-sm text-muted-foreground">sin comunicación</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de sensores */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredSensors.map((sensor) => {
          const lote = userLotes.find((l) => l.id === sensor.loteId)
          const finca = userFincas.find((f) => f.id === lote?.fincaId)

          return (
            <Card key={sensor.id} className="relative p-1">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getSensorIcon(sensor.type)}
                    <CardTitle className="text-base font-semibold">{sensor.name}</CardTitle>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(sensor.status)}`} />
                </div>
                <CardDescription className="text-sm mt-2">
                  {lote?.name} - {finca?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-0">
                <div className="text-center py-2">
                  <div className={`text-4xl font-bold mb-1 ${getSensorColor(sensor.type, sensor.value)}`}>
                    {sensor.value.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">{sensor.unit}</div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm py-1">
                    <span className="text-muted-foreground">Estado:</span>
                    <Badge
                      variant={
                        sensor.status === "online"
                          ? "default"
                          : sensor.status === "warning"
                            ? "secondary"
                            : "destructive"
                      }
                      className="px-3 py-1"
                    >
                      {sensor.status === "online"
                        ? "En línea"
                        : sensor.status === "warning"
                          ? "Alerta"
                          : "Desconectado"}
                    </Badge>
                  </div>

                  {sensor.batteryLevel && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm py-1">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Battery className="h-4 w-4" />
                          Batería:
                        </span>
                        <span className={`font-semibold ${sensor.batteryLevel < 20 ? "text-red-500" : ""}`}>
                          {sensor.batteryLevel}%
                        </span>
                      </div>
                      <Progress value={sensor.batteryLevel} className="h-2" />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground py-1">
                    <span>Última lectura:</span>
                    <span className="font-medium">{sensor.lastReading.toLocaleTimeString("es-EC")}</span>
                  </div>
                </div>

                {/* Indicador de tendencia */}
                <div className="flex items-center justify-center pt-3 border-t">
                  {sensor.value > 0 ? (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-medium">Estable</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <TrendingDown className="h-4 w-4" />
                      <span className="font-medium">Sin datos</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredSensors.length === 0 && (
        <Card className="p-1">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Activity className="h-16 w-16 text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold mb-3">No hay sensores</h3>
            <p className="text-muted-foreground text-center max-w-md leading-relaxed">
              {selectedFincaId !== "all" || selectedLoteId !== "all"
                ? "No se encontraron sensores con los filtros aplicados"
                : "No hay sensores configurados en el sistema"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

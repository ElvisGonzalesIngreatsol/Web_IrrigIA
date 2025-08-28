"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useData } from "@/contexts/data-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { IrrigationAreaChart, WaterUsageLineChart } from "@/components/morris-charts"
import {
  Droplets,
  Thermometer,
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap,
  Wifi,
  Battery,
  MapPin,
  Calendar,
  Clock,
} from "lucide-react"

export function DashboardOverview() {
  const { user } = useAuth()
  const { fincas, lotes, valvulas, sensors, suggestions, weather, systemStatus } = useData()
  const [currentTime, setCurrentTime] = useState(new Date())

  // Filtrar datos según el rol del usuario
  const userFincas = user?.role === "admin" ? fincas : user?.fincaId ? fincas.filter((f) => f.id === user.fincaId) : []
  const userLotes = user?.role === "admin" ? lotes : lotes.filter((l) => userFincas.some((f) => f.id === l.fincaId))
  const userValvulas =
    user?.role === "admin" ? valvulas : valvulas.filter((v) => userFincas.some((f) => f.id === v.fincaId))
  const userSensors = user?.role === "admin" ? sensors : sensors.filter((s) => userLotes.some((l) => l.id === s.loteId))
  const userSuggestions =
    user?.role === "admin" ? suggestions : suggestions.filter((s) => userFincas.some((f) => f.id === s.fincaId))

  // Actualizar hora cada minuto
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    let isMounted = true

    const updateTime = () => {
      if (isMounted && document.visibilityState === "visible") {
        setCurrentTime(new Date())
      }
    }

    timer = setInterval(updateTime, 60000)

    // Cleanup function
    return () => {
      isMounted = false
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }
  }, [])

  // Calcular estadísticas
  const activeValvulas = userValvulas.filter((v) => v.isOpen)
  const totalWaterFlow = activeValvulas.reduce((sum, v) => sum + v.flowRate, 0)
  const maintenanceValvulas = userValvulas.filter((v) => v.status === "maintenance")
  const onlineSensors = userSensors.filter((s) => s.status === "online")
  const warningSensors = userSensors.filter((s) => s.status === "warning")
  const totalArea = userFincas.reduce((sum, f) => sum + f.area, 0)
  const highPrioritySuggestions = userSuggestions.filter((s) => s.priority === "high")

  // Calcular promedios de sensores
  const avgTemperature =
    userSensors.filter((s) => s.type === "temperature").reduce((sum, s) => sum + s.value, 0) /
      userSensors.filter((s) => s.type === "temperature").length || 0
  const avgHumidity =
    userSensors.filter((s) => s.type === "humidity").reduce((sum, s) => sum + s.value, 0) /
      userSensors.filter((s) => s.type === "humidity").length || 0

  return (
    <div className="space-y-6">
      {/* Header con información del usuario */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[rgba(28,53,45,1)]">
            ¡Bienvenido, {user?.name?.split(" ")[0] || "Usuario"}! 🌱
          </h1>
          <p className="text-muted-foreground">
            {user?.role === "admin"
              ? "Panel de administración del sistema de riego"
              : `Gestión de tu plantación de banano`}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{currentTime.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{currentTime.toLocaleDateString("es-EC")}</span>
          </div>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fincas Activas</CardTitle>
            <MapPin className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{userFincas.length}</div>
            <p className="text-xs text-muted-foreground">{totalArea.toFixed(1)} Ha total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Válvulas Regando</CardTitle>
            <Droplets className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeValvulas.length}</div>
            <p className="text-xs text-muted-foreground">de {userValvulas.length} válvulas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flujo Total</CardTitle>
            <Activity className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">{totalWaterFlow.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">L/min</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {maintenanceValvulas.length + warningSensors.length + highPrioritySuggestions.length}
            </div>
            <p className="text-xs text-muted-foreground">requieren atención</p>
          </CardContent>
        </Card>
      </div>

      {/* Condiciones ambientales y sistema */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              Condiciones Ambientales
            </CardTitle>
            <CardDescription>Promedios de sensores en tiempo real</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Temperatura Promedio</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{avgTemperature.toFixed(1)}°C</span>
                {avgTemperature > 28 ? (
                  <TrendingUp className="h-4 w-4 text-red-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>
            <Progress value={Math.min(100, (avgTemperature / 35) * 100)} className="h-2" />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Humedad Promedio</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{avgHumidity.toFixed(1)}%</span>
                {avgHumidity < 60 ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>
            <Progress value={avgHumidity} className="h-2" />

            {weather && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span>Clima Exterior</span>
                  <span>
                    {weather.temperature}°C, {weather.humidity}% HR
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Precipitación: {weather.precipitation}mm | Viento: {weather.windSpeed} km/h
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Estado del Sistema
            </CardTitle>
            <CardDescription>Conectividad y dispositivos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {systemStatus && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Conectividad LoRaWAN</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{systemStatus.connectivity}%</span>
                    <Wifi className="h-4 w-4 text-green-500" />
                  </div>
                </div>
                <Progress value={systemStatus.connectivity} className="h-2" />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Dispositivos Activos</span>
                  <span className="text-lg font-bold">
                    {systemStatus.activeDevices}/{systemStatus.totalDevices}
                  </span>
                </div>
                <Progress value={(systemStatus.activeDevices / systemStatus.totalDevices) * 100} className="h-2" />

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span>Sensores Online</span>
                    <div className="flex items-center gap-2">
                      <span>
                        {onlineSensors.length}/{userSensors.length}
                      </span>
                      <Battery className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Última actualización: {systemStatus.lastUpdate.toLocaleTimeString("es-EC")}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Morris-style charts section for irrigation analytics */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-2">
        <IrrigationAreaChart />
        <WaterUsageLineChart />
      </div>

      {/* Active valves section showing irrigation status and water consumption */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            Válvulas Regando Actualmente
          </CardTitle>
          <CardDescription>Estado en tiempo real de las válvulas activas y su consumo de agua</CardDescription>
        </CardHeader>
        <CardContent>
          {activeValvulas.length === 0 ? (
            <div className="text-center py-8">
              <Droplets className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground">No hay válvulas regando en este momento</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeValvulas.map((valvula) => {
                const lote = userLotes.find((l) => l.id === valvula.loteId)
                const finca = userFincas.find((f) => f.id === valvula.fincaId)
                const consumoLitros = (valvula.flowRate || 0) * 60 // L/min to L/hour approximation

                return (
                  <div key={valvula.id} className="p-4 border rounded-lg bg-blue-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm truncate">{valvula.name}</h4>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">Activa</span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground mb-3">
                      <p>
                        {lote?.name} - {finca?.name}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Flujo:</span>
                        <span className="text-sm font-semibold text-blue-600">
                          {(valvula.flowRate || 0).toFixed(1)} L/min
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Consumo/hora:</span>
                        <span className="text-sm font-semibold text-cyan-600">{consumoLitros.toFixed(0)} L/h</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Presión:</span>
                        <span className="text-sm font-medium">{(valvula.presion || 0).toFixed(1)} bar</span>
                      </div>

                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Tiempo activa:</span>
                          <span className="font-medium">
                            {valvula.lastActivity
                              ? `${Math.floor((Date.now() - valvula.lastActivity.getTime()) / (1000 * 60))} min`
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {activeValvulas.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{activeValvulas.length}</div>
                  <div className="text-xs text-blue-500">Válvulas Activas</div>
                </div>
                <div className="p-3 bg-cyan-50 rounded-lg">
                  <div className="text-lg font-bold text-cyan-600">{totalWaterFlow.toFixed(1)}</div>
                  <div className="text-xs text-cyan-500">L/min Total</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{(totalWaterFlow * 60).toFixed(0)}</div>
                  <div className="text-xs text-green-500">L/hora Total</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">
                    {((totalWaterFlow * 60 * 24) / 1000).toFixed(1)}
                  </div>
                  <div className="text-xs text-purple-500">m³/día Estimado</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sugerencias de IA y alertas */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Sugerencias de Riego IA
              </CardTitle>
              <CardDescription>Recomendaciones basadas en datos de sensores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userSuggestions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No hay sugerencias pendientes</p>
                ) : (
                  userSuggestions.slice(0, 3).map((suggestion) => (
                    <div key={suggestion.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          suggestion.priority === "high"
                            ? "bg-red-500"
                            : suggestion.priority === "medium"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium truncate">{suggestion.loteName}</h4>
                          <Badge
                            variant={
                              suggestion.priority === "high"
                                ? "destructive"
                                : suggestion.priority === "medium"
                                  ? "default"
                                  : "secondary"
                            }
                            className="text-xs"
                          >
                            {suggestion.priority === "high"
                              ? "Alta"
                              : suggestion.priority === "medium"
                                ? "Media"
                                : "Baja"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{suggestion.reason}</p>
                        <div className="flex items-center gap-4 text-xs">
                          <span>Duración: {suggestion.recommendedDuration} min</span>
                          <span>Agua: {suggestion.estimatedWaterUsage} L</span>
                          <span>
                            {suggestion.timestamp.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas del Sistema
            </CardTitle>
            <CardDescription>Dispositivos que requieren atención</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {maintenanceValvulas.map((valvula) => (
                <div key={valvula.id} className="flex items-center gap-3 p-2 bg-orange-50 rounded">
                  <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{valvula.name}</p>
                    <p className="text-xs text-orange-600">Requiere mantenimiento</p>
                  </div>
                </div>
              ))}

              {warningSensors.map((sensor) => (
                <div key={sensor.id} className="flex items-center gap-3 p-2 bg-yellow-50 rounded">
                  <Battery className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{sensor.name}</p>
                    <p className="text-xs text-yellow-600">Batería baja: {sensor.batteryLevel}%</p>
                  </div>
                </div>
              ))}

              {maintenanceValvulas.length === 0 && warningSensors.length === 0 && (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                    <Activity className="h-5 w-5" />
                    <span className="text-sm font-medium">Todo funcionando correctamente</span>
                  </div>
                  <p className="text-xs text-muted-foreground">No hay alertas pendientes</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de lotes */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Lotes de Banano</CardTitle>
          <CardDescription>Estado actual de tus plantaciones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userLotes.map((lote) => {
              const loteValvulas = userValvulas.filter((v) => v.loteId === lote.id)
              const activeLoteValvulas = loteValvulas.filter((v) => v.isOpen)
              const loteSensors = userSensors.filter((s) => s.loteId === lote.id)
              const finca = userFincas.find((f) => f.id === lote.fincaId)

              return (
                <div key={lote.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium truncate">{lote.name}</h4>
                    <Badge variant="outline">{lote.area.toFixed(1)} Ha</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{finca?.name}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-blue-50 rounded">
                      <div className="text-sm font-semibold text-blue-600">{activeLoteValvulas.length}</div>
                      <div className="text-xs text-blue-500">Regando</div>
                    </div>
                    <div className="p-2 bg-green-50 rounded">
                      <div className="text-sm font-semibold text-green-600">{loteValvulas.length}</div>
                      <div className="text-xs text-green-500">Válvulas</div>
                    </div>
                    <div className="p-2 bg-purple-50 rounded">
                      <div className="text-sm font-semibold text-purple-600">{loteSensors.length}</div>
                      <div className="text-xs text-purple-500">Sensores</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

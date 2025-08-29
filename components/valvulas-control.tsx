"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useData } from "@/contexts/data-context"
import { useNotifications } from "./notification-system"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Droplets, Activity, AlertTriangle, Clock, Gauge, RefreshCw, Play, Square } from "lucide-react"

export function ValvulasControl() {
  const { user } = useAuth()
  const { fincas, lotes, valvulas, toggleValvula } = useData()
  const { showSuccess, showError, showWarning } = useNotifications()
  const [selectedFincaId, setSelectedFincaId] = useState<string>("all")
  const [selectedLoteId, setSelectedLoteId] = useState<string>("all")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filtrar datos según el rol del usuario
  const userFincas = user?.role === "ADMIN" ? fincas : user?.fincaId ? fincas.filter((f) => f.id === user.fincaId) : []
  const userLotes = user?.role === "ADMIN" ? lotes : lotes.filter((l) => userFincas.some((f) => f.id === l.fincaId))
  const userValvulas =
    user?.role === "ADMIN" ? valvulas : valvulas.filter((v) => userFincas.some((f) => f.id === v.fincaId))

  const filteredLotes = selectedFincaId === "all" ? userLotes : userLotes.filter((l) => l.fincaId === selectedFincaId)
  const filteredValvulas = userValvulas.filter((valvula) => {
    // Filtrar por finca si está seleccionada
    if (selectedFincaId !== "all" && valvula.fincaId !== selectedFincaId) return false

    // Filtrar por lote si está seleccionado
    if (selectedLoteId !== "all" && valvula.loteId !== selectedLoteId) return false

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
    if (user?.role === "client" && user.fincaId && selectedFincaId === "all") {
      setSelectedFincaId(user.fincaId)
    }
  }, [user, selectedFincaId])

  const handleToggleValvula = async (valvulaId: string) => {
    const valvula = userValvulas.find((v) => v.id === valvulaId)
    if (!valvula) return

    if (valvula.status === "maintenance") {
      showWarning("Válvula en Mantenimiento", "Esta válvula requiere mantenimiento antes de ser operada")
      return
    }

    try {
      toggleValvula(valvulaId)
      const action = valvula.isOpen ? "detenida" : "activada"
      showSuccess(`Válvula ${action}`, `${valvula.name} ha sido ${action} correctamente`)
    } catch (error) {
      showError("Error", "No se pudo cambiar el estado de la válvula")
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsRefreshing(false)
    showSuccess("Actualizado", "Estado de las válvulas actualizado")
  }

  const activeValvulas = filteredValvulas.filter((v) => v.isOpen)
  const maintenanceValvulas = filteredValvulas.filter((v) => v.status === "maintenance")
  const totalFlow = activeValvulas.reduce((sum, v) => sum + (v.flowRate || 0), 0)

  const getValvulaTypeIcon = (tipo: string) => {
    switch (tipo) {
      case "aspersion":
        return "💧"
      case "goteo":
        return "💧"
      case "microaspersion":
        return "🌊"
      default:
        return "💧"
    }
  }

  const getValvulaTypeName = (tipo: string) => {
    switch (tipo) {
      case "aspersion":
        return "Aspersión"
      case "goteo":
        return "Goteo"
      case "microaspersion":
        return "Microaspersión"
      default:
        return "Desconocido"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[rgba(28,53,45,1)]">Control de Válvulas</h1>
          <p className="text-muted-foreground">Gestiona el sistema de riego de tus plantaciones de banano</p>
        </div>
        <Button className="text-black bg-transparent" onClick={handleRefresh} disabled={isRefreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(user?.role === "admin" || !user?.fincaId) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">🏢 Filtrar por Finca</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedFincaId} onValueChange={setSelectedFincaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las fincas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las fincas ({userFincas.length})</SelectItem>
                  {userFincas.map((finca) => (
                    <SelectItem key={finca.id} value={finca.id}>
                      {finca.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">📍 Filtrar por Lote</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedLoteId} onValueChange={setSelectedLoteId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los lotes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los lotes ({filteredLotes.length})</SelectItem>
                {filteredLotes.map((lote) => {
                  const finca = userFincas.find((f) => f.id === lote.fincaId)
                  return (
                    <SelectItem key={lote.id} value={lote.id}>
                      {lote.name} {selectedFincaId === "all" && finca && `(${finca.name})`}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">📊 Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Válvulas mostradas:</span>
                <span className="font-medium">{filteredValvulas.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Lotes incluidos:</span>
                <span className="font-medium">{filteredLotes.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Activas ahora:</span>
                <span className="font-medium text-blue-600">{activeValvulas.length}</span>
              </div>
              {selectedFincaId !== "all" && (
                <div className="flex justify-between text-blue-600">
                  <span>Finca seleccionada:</span>
                  <span className="font-medium">{userFincas.find((f) => f.id === selectedFincaId)?.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Válvulas</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredValvulas.length}</div>
            <p className="text-xs text-muted-foreground">
              {filteredLotes.length} lote{filteredLotes.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regando Ahora</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeValvulas.length}</div>
            <p className="text-xs text-muted-foreground">
              {filteredValvulas.length > 0 ? Math.round((activeValvulas.length / filteredValvulas.length) * 100) : 0}%
              activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flujo Total</CardTitle>
            <Gauge className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">{(totalFlow || 0).toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">L/min</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mantenimiento</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{maintenanceValvulas.length}</div>
            <p className="text-xs text-muted-foreground">requieren atención</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de válvulas */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredValvulas.map((valvula) => {
          const lote = userLotes.find((l) => l.id === valvula.loteId)
          const finca = userFincas.find((f) => f.id === valvula.fincaId)

          return (
            <Card key={valvula.id} className={`relative ${valvula.isOpen ? "ring-2 ring-blue-200" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-lg flex-shrink-0">{getValvulaTypeIcon(valvula.tipo)}</span>
                    <CardTitle className="text-sm sm:text-base truncate">{valvula.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {valvula.status === "maintenance" && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                    <div
                      className={`w-3 h-3 rounded-full ${
                        valvula.isOpen
                          ? "bg-blue-500 animate-pulse"
                          : valvula.status === "maintenance"
                            ? "bg-orange-500"
                            : "bg-gray-400"
                      }`}
                    />
                  </div>
                </div>
                <CardDescription className="text-xs truncate">
                  {lote?.name} - {finca?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:gap-4 text-center">
                  <div>
                    <div
                      className={`text-xl sm:text-2xl font-bold ${valvula.isOpen ? "text-blue-600" : "text-gray-400"}`}
                    >
                      {(valvula.flowRate || 0).toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">L/min</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-gray-600">
                      {(valvula.presion || 0).toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">bar</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">Tipo:</span>
                    <Badge variant="outline" className="text-xs">
                      {getValvulaTypeName(valvula.tipo)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">Estado:</span>
                    <Badge
                      variant={
                        valvula.status === "maintenance" ? "destructive" : valvula.isOpen ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {valvula.status === "maintenance" ? "Mantenimiento" : valvula.isOpen ? "Regando" : "Detenida"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">Caudal máx:</span>
                    <span className="text-xs">{valvula.caudal || 0} L/min</span>
                  </div>

                  {valvula.isOpen && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate">Rendimiento:</span>
                        <span className="text-xs">
                          {Math.round(((valvula.flowRate || 0) / (valvula.caudal || 1)) * 100)}%
                        </span>
                      </div>
                      <Progress value={((valvula.flowRate || 0) / (valvula.caudal || 1)) * 100} className="h-1" />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 truncate">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span className="hidden sm:inline">Última actividad:</span>
                      <span className="sm:hidden">Última:</span>
                    </span>
                    <span className="text-xs">{valvula.lastActivity?.toLocaleTimeString("es-EC") || "N/A"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Switch
                      checked={valvula.isOpen}
                      onCheckedChange={() => handleToggleValvula(valvula.id)}
                      disabled={valvula.status === "maintenance"}
                    />
                    <span className="text-sm truncate">{valvula.isOpen ? "Regando" : "Detenida"}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={valvula.isOpen ? "destructive" : "default"}
                    onClick={() => handleToggleValvula(valvula.id)}
                    disabled={valvula.status === "maintenance"}
                    className="flex-shrink-0"
                  >
                    {valvula.isOpen ? (
                      <>
                        <Square className="h-3 w-3 sm:mr-1" />
                        <span className="hidden sm:inline">Detener</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 sm:mr-1" />
                        <span className="hidden sm:inline">Iniciar</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredValvulas.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Droplets className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay válvulas</h3>
            <p className="text-muted-foreground text-center">
              {selectedFincaId !== "all" || selectedLoteId !== "all"
                ? "No se encontraron válvulas con los filtros aplicados"
                : "No hay válvulas configuradas en el sistema"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

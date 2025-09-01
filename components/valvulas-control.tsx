"use client"

import { useState, useEffect, useCallback } from "react"
import { useNotifications } from "./notification-system"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Droplets, Activity, AlertTriangle, Clock, Gauge, RefreshCw, Play, Square } from "lucide-react"
import { apiService } from "@/lib/api"
import { Finca, Valvula } from "@/types"


export function ValvulasControl() {
  const { showSuccess, showError, showWarning } = useNotifications()
  const [fincas, setFincas] = useState<Finca[]>([])
  const [valvulas, setValvulas] = useState<Valvula[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFincaId, setSelectedFincaId] = useState<string>("all")
  const [selectedLoteId, setSelectedLoteId] = useState<string>("all")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Función para obtener datos desde la API
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [fincasResponse, valvulasResponse] = await Promise.all([
        apiService.getAllFincas(),
        apiService.getValvulas(),
      ])

      if (fincasResponse.success && valvulasResponse.success) {
        setFincas(fincasResponse.data.data || [])
        //setLotes(lotesResponse.data || [])
        setValvulas(valvulasResponse.data.data || [])
        // Si no hay una finca seleccionada, selecciona la primera por defecto si existe
        if (selectedFincaId === "all" && fincasResponse.data && fincasResponse.data.length > 0) {
          setSelectedFincaId(fincasResponse.data[0].id.toString())
        }
      } else {
        setError(fincasResponse.error || valvulasResponse.error || "Error al cargar datos")
      }
    } catch (err) {
      console.error("Error fetching data:", err)
      setError("Error al cargar los datos.")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [selectedFincaId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  //const filteredLotes = selectedFincaId === "all" ? lotes : lotes.filter((l) => l.fincaId === selectedFincaId)

  const filteredValvulas = valvulas.filter((valvula) => {
    // Filtrar por finca si está seleccionada
    if (selectedFincaId !== "all" && valvula.fincaId.toString() !== selectedFincaId) return false

    // Filtrar por lote si está seleccionado
    //if (selectedLoteId !== "all" && valvula.loteId !== selectedLoteId) return false

      return true
  })

  useEffect(() => {
    if (selectedFincaId !== "all") {
      
    }
  }, [selectedFincaId, selectedLoteId])

  const handleToggleValvula = async (valvulaId: number) => {
    const valvula = valvulas.find((v) => v.id === valvulaId)
    if (!valvula) return

    if (valvula.isActive === false) {
      showWarning("Válvula en Mantenimiento", "Esta válvula requiere mantenimiento antes de ser operada")
      return
    }

    try {
      const action = valvula.estado ? "ABIERTA" : "CERRADA"
      const response = await apiService.controlValvula(valvulaId, action)

      if (response.success) {
        const message = valvula.estado ? "ABIERTA" : "CERRADA"
        showSuccess(`Válvula ${message}`, `${valvula.nombre} ha sido ${message} correctamente`)
        fetchData() // Vuelve a cargar los datos para reflejar el cambio
      } else {
        showError("Error", response.error || "No se pudo cambiar el estado de la válvula")
      }
    } catch (error) {
      showError("Error", "Ocurrió un error de conexión")
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchData()
    showSuccess("Actualizado", "Estado de las válvulas actualizado")
  }

  const activeValvulas = filteredValvulas.filter((v) => v.estado)
  const maintenanceValvulas = filteredValvulas.filter((v) => v.isActive === false)
  const totalFlow = activeValvulas.reduce((sum, v) => sum + (v.caudal || 0), 0)

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Cargando datos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-red-500">
        <p>{error}</p>
        <Button onClick={fetchData} className="mt-4">
          Reintentar
        </Button>
      </div>
    )
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
                <SelectItem value="all">Todas las fincas ({fincas.length})</SelectItem>
                {fincas.map((finca) => (
                  <SelectItem key={finca.id.toString()} value={finca.id.toString()}>
                    {finca.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

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
                <SelectItem value="all">Todos los lotes ({})</SelectItem>
                {}
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
                <span className="font-medium">{}</span>
              </div>
              <div className="flex justify-between">
                <span>Activas ahora:</span>
                <span className="font-medium text-blue-600">{activeValvulas.length}</span>
              </div>
              {selectedFincaId !== "all" && (
                <div className="flex justify-between text-blue-600">
                  <span>Finca seleccionada:</span>
                  <span className="font-medium">{fincas.find((f) => f.id === selectedFincaId)?.name}</span>
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
              {}
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
          //const lote = lotes.find((l) => l.id === valvula.loteId)
          const finca = fincas.find((f) => f.id === valvula.fincaId)

          return (
            <Card key={valvula.id} className={`relative ${valvula.isActive ? "ring-2 ring-blue-200" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-lg flex-shrink-0">{getValvulaTypeIcon(valvula.tipo)}</span>
                    <CardTitle className="text-sm sm:text-base truncate">{valvula.nombre}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {valvula.estado === "maintenance" && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                    <div
                      className={`w-3 h-3 rounded-full ${
                        valvula.isActive
                          ? "bg-blue-500 animate-pulse"
                          : valvula.estado === "maintenance"
                          ? "bg-orange-500"
                          : "bg-gray-400"
                      }`}
                    />
                  </div>
                </div>
                <CardDescription className="text-xs truncate">
                  {} - {finca?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 sm:gap-4 text-center">
                  <div>
                    <div
                      className={`text-xl sm:text-2xl font-bold ${valvula.isActive ? "text-blue-600" : "text-gray-400"}`}
                    >
                      {(valvula.caudal || 0).toFixed(1)}
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
                      {getValvulaTypeName(valvula.estado)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">Estado:</span>
                    <Badge
                      variant={
                        valvula.estado === "maintenance" ? "destructive" : valvula.isActive ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {valvula.estado === "maintenance" ? "Mantenimiento" : valvula.isActive ? "Regando" : "Detenida"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">Caudal máx:</span>
                    <span className="text-xs">{valvula.caudal || 0} L/min</span>
                  </div>

                  {valvula.estado && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate">Rendimiento:</span>
                        <span className="text-xs">
                          {Math.round(((valvula.caudal || 0) / (valvula.caudal || 1)) * 100)}%
                        </span>
                      </div>
                      <Progress value={((valvula.caudal || 0) / (valvula.caudal || 1)) * 100} className="h-1" />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 truncate">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span className="hidden sm:inline">Última actividad:</span>
                      <span className="sm:hidden">Última:</span>
                    </span>
                    <span className="text-xs">{valvula.updatedAt ? new Date(valvula.updatedAt).toLocaleTimeString("es-EC") : "N/A"}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Switch
                      checked={valvula.estado}
                      onCheckedChange={() => handleToggleValvula(valvula.id)}
                      disabled={valvula.isActive === false}
                    />
                    <span className="text-sm truncate">{valvula.estado ? "Regando" : "Detenida"}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={valvula.estado ? "destructive" : "default"}
                    onClick={() => handleToggleValvula(valvula.id)}
                    disabled={valvula.isActive === false}
                    className="flex-shrink-0"
                  >
                    {valvula.estado ? (
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
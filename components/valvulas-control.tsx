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
import type { Finca, Valvula } from "@/types"

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

  const activeValvulas = filteredValvulas.filter((v) => v.estado == "ABIERTA")
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
    <div className="space-y-8 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[rgba(28,53,45,1)] leading-tight">Control de Válvulas</h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Gestiona el sistema de riego de tus plantaciones de banano
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
                  Todas las fincas ({fincas.length})
                </SelectItem>
                {fincas.map((finca) => (
                  <SelectItem key={finca.id.toString()} value={finca.id.toString()} className="py-3">
                    {finca.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

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
                  Todos los lotes ({})
                </SelectItem>
                {}
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
                <span className="text-muted-foreground">Válvulas mostradas:</span>
                <span className="font-semibold">{filteredValvulas.length}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Lotes incluidos:</span>
                <span className="font-semibold">{}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Activas ahora:</span>
                <span className="font-semibold text-blue-600">{activeValvulas.length}</span>
              </div>
              {selectedFincaId !== "all" && (
                <div className="flex justify-between items-center py-1 text-blue-600">
                  <span>Finca seleccionada:</span>
                  <span className="font-semibold">{fincas.find((f) => f.id === selectedFincaId)?.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="p-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Válvulas</CardTitle>
            <Droplets className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold mb-2">{filteredValvulas.length}</div>
            <p className="text-sm text-muted-foreground">{}</p>
          </CardContent>
        </Card>

        <Card className="p-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Regando Ahora</CardTitle>
            <Activity className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-blue-600 mb-2">{activeValvulas.length}</div>
            <p className="text-sm text-muted-foreground">
              {filteredValvulas.length > 0 ? Math.round((activeValvulas.length / filteredValvulas.length) * 100) : 0}%
              activas
            </p>
          </CardContent>
        </Card>

        <Card className="p-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Flujo Total</CardTitle>
            <Gauge className="h-5 w-5 text-cyan-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-cyan-600 mb-2">{(totalFlow || 0).toFixed(1)}</div>
            <p className="text-sm text-muted-foreground">L/min</p>
          </CardContent>
        </Card>

        <Card className="p-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mantenimiento</CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-orange-600 mb-2">{maintenanceValvulas.length}</div>
            <p className="text-sm text-muted-foreground">requieren atención</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de válvulas */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredValvulas.map((valvula) => {
          //const lote = lotes.find((l) => l.id === valvula.loteId)
          const finca = fincas.find((f) => f.id === valvula.fincaId)

          return (
            <Card key={valvula.id} className={`relative p-1 ${valvula.isActive ? "ring-2 ring-blue-200" : ""}`}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-lg flex-shrink-0">{getValvulaTypeIcon(valvula.tipo)}</span>
                    <CardTitle className="text-sm sm:text-base truncate font-semibold">{valvula.nombre}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {valvula.estado === "ERROR" && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                    <div
                      className={`w-3 h-3 rounded-full ${
                        valvula.isActive
                          ? "bg-blue-500 animate-pulse"
                          : valvula.estado === "ERROR"
                            ? "bg-orange-500"
                            : "bg-gray-400"
                      }`}
                    />
                  </div>
                </div>
                <CardDescription className="text-sm truncate mt-2">
                  {} - {finca?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-0">
                <div className="grid grid-cols-2 gap-2 sm:gap-4 text-center py-2">
                  <div>
                    <div
                      className={`text-xl sm:text-2xl font-bold mb-1 ${valvula.isActive ? "text-blue-600" : "text-gray-400"}`}
                    >
                      {(valvula.caudal || 0).toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">L/min</div>
                  </div>
                  <div>
                    <div className="text-xl sm:text-2xl font-bold text-gray-600 mb-1">
                      {(valvula.presion || 0).toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">bar</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm py-1">
                    <span className="truncate text-muted-foreground">Estado:</span>
                    <Badge
                      variant={valvula.estado === "ERROR" ? "destructive" : valvula.isActive ? "default" : "secondary"}
                      className="text-xs px-3 py-1"
                    >
                      {valvula.estado === "ABIERTA" ? "Regando" : "Detenida"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm py-1">
                    <span className="truncate text-muted-foreground">Caudal máx:</span>
                    <span className="text-xs font-medium">{valvula.caudal || 0} L/min</span>
                  </div>

                  {valvula.estado && (
                    <div className="space-y-2">
                      <Progress value={((valvula.caudal || 0) / (valvula.caudal || 1)) * 100} className="h-2" />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground py-1">
                    <span className="flex items-center gap-2 truncate">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span className="hidden sm:inline">Última actividad:</span>
                      <span className="sm:hidden">Última:</span>
                    </span>
                    <span className="text-xs font-medium">
                      {valvula.updatedAt ? new Date(valvula.updatedAt).toLocaleTimeString("es-EC") : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Switch
                      checked={valvula.estado == "ABIERTA" ? true : false}
                      onCheckedChange={() => handleToggleValvula(valvula.id)}
                      disabled={valvula.isActive === false}
                    />
                    <span className="text-sm truncate font-medium">{valvula.estado ? "Regando" : "Detenida"}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={valvula.estado == "ERROR" ? "destructive" : "default"}
                    onClick={() => handleToggleValvula(valvula.id)}
                    disabled={valvula.isActive === false}
                    className="flex-shrink-0 px-4 py-2"
                  >
                    {valvula.estado == "ABIERTA" ? (
                      <>
                        <Square className="h-3 w-3 sm:mr-2" />
                        <span className="hidden sm:inline">Detener</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 sm:mr-2" />
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
        <Card className="p-1">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Droplets className="h-16 w-16 text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold mb-3">No hay válvulas</h3>
            <p className="text-muted-foreground text-center max-w-md leading-relaxed">
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

"use client"

import { useState, useEffect, useCallback } from "react"
import { useNotifications } from "./notification-system"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Droplets, Activity, AlertTriangle, Clock, Gauge, RefreshCw, Play, Square, Loader2 } from "lucide-react"
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
  const [loadingValvulas, setLoadingValvulas] = useState<Set<number>>(new Set())

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
        setValvulas(valvulasResponse.data.data || [])
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

  const filteredValvulas = valvulas.filter((valvula) => {
    if (selectedFincaId !== "all" && valvula.fincaId.toString() !== selectedFincaId) return false
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

    setLoadingValvulas((prev) => new Set(prev).add(valvulaId))

    const newEstado = valvula.estado === "ABIERTA" ? "CERRADA" : "ABIERTA"
    setValvulas((prevValvulas) => prevValvulas.map((v) => (v.id === valvulaId ? { ...v, estado: newEstado } : v)))

    try {
      const action = newEstado
      const response = await apiService.controlValvula(valvulaId, action)

      if (response.success) {
        const message = newEstado === "ABIERTA" ? "activada" : "desactivada"
        showSuccess(`Válvula ${message}`, `${valvula.nombre} ha sido ${message} correctamente`)
      } else {
        setValvulas((prevValvulas) =>
          prevValvulas.map((v) => (v.id === valvulaId ? { ...v, estado: valvula.estado } : v)),
        )
        showError("Error", response.error || "No se pudo cambiar el estado de la válvula")
      }
    } catch (error) {
      setValvulas((prevValvulas) =>
        prevValvulas.map((v) => (v.id === valvulaId ? { ...v, estado: valvula.estado } : v)),
      )
      showError("Error", "Ocurrió un error de conexión")
    } finally {
      setLoadingValvulas((prev) => {
        const newSet = new Set(prev)
        newSet.delete(valvulaId)
        return newSet
      })
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchData()
    showSuccess("Actualizado", "Estado de las válvulas actualizado")
  }

  const activeValvulas = filteredValvulas.filter((v) => v.estado === "ABIERTA")
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
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-2 border-b border-slate-200">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 leading-tight">Control de Válvulas</h1>
          <p className="text-slate-600 text-lg leading-relaxed">
            Gestiona el sistema de riego de tus plantaciones de banano
          </p>
        </div>
        <Button
          className="text-slate-700 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 shadow-sm transition-all duration-200"
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="lg"
        >
          <RefreshCw className={`h-5 w-5 mr-3 ${isRefreshing ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-4 space-y-2">
            <CardTitle className="text-lg flex items-center gap-3 text-slate-800">
              <span className="text-2xl">🏢</span>
              <span>Filtrar por Finca</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Select value={selectedFincaId} onValueChange={setSelectedFincaId}>
              <SelectTrigger className="h-12 text-base border-2 border-slate-200 focus:border-blue-400">
                <SelectValue placeholder="Todas las fincas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-base py-3">
                  Todas las fincas ({fincas.length})
                </SelectItem>
                {fincas.map((finca) => (
                  <SelectItem key={finca.id.toString()} value={finca.id.toString()} className="text-base py-3">
                    {finca.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-4 space-y-2">
            <CardTitle className="text-lg flex items-center gap-3 text-slate-800">
              <span className="text-2xl">📍</span>
              <span>Filtrar por Lote</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Select value={selectedLoteId} onValueChange={setSelectedLoteId}>
              <SelectTrigger className="h-12 text-base border-2 border-slate-200 focus:border-blue-400">
                <SelectValue placeholder="Todos los lotes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-base py-3">
                  Todos los lotes
                </SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1 border-2 border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-4 space-y-2">
            <CardTitle className="text-lg flex items-center gap-3 text-slate-800">
              <span className="text-2xl">📊</span>
              <span>Resumen</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3 text-base leading-relaxed">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Válvulas mostradas:</span>
                <span className="font-semibold text-slate-800">{filteredValvulas.length}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-600">Activas ahora:</span>
                <span className="font-semibold text-blue-600">{activeValvulas.length}</span>
              </div>
              {selectedFincaId !== "all" && (
                <div className="flex justify-between items-center py-1 text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                  <span>Finca seleccionada:</span>
                  <span className="font-semibold">{fincas.find((f) => f.id === selectedFincaId)?.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border-2 border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-slate-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-slate-700">Total Válvulas</CardTitle>
            <div className="p-2 bg-slate-100 rounded-lg">
              <Droplets className="h-5 w-5 text-slate-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-slate-800 mb-1">{filteredValvulas.length}</div>
            <p className="text-sm text-slate-500 leading-relaxed">en el sistema</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-slate-700">Regando Ahora</CardTitle>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-blue-600 mb-1">{activeValvulas.length}</div>
            <p className="text-sm text-slate-500 leading-relaxed">
              {filteredValvulas.length > 0 ? Math.round((activeValvulas.length / filteredValvulas.length) * 100) : 0}%
              activas
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-cyan-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-cyan-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-slate-700">Flujo Total</CardTitle>
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Gauge className="h-5 w-5 text-cyan-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-cyan-600 mb-1">{(totalFlow || 0).toFixed(1)}</div>
            <p className="text-sm text-slate-500 leading-relaxed">L/min</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200 shadow-sm hover:shadow-md transition-all duration-200 hover:border-orange-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base font-semibold text-slate-700">Mantenimiento</CardTitle>
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-orange-600 mb-1">{maintenanceValvulas.length}</div>
            <p className="text-sm text-slate-500 leading-relaxed">requieren atención</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredValvulas.map((valvula) => {
          const finca = fincas.find((f) => f.id === valvula.fincaId)
          const isValvulaLoading = loadingValvulas.has(valvula.id)

          return (
            <Card
              key={valvula.id}
              className="relative border-2 border-blue-200 bg-blue-50/20 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden"
            >
              <CardHeader className="pb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-blue-500 text-2xl">💧</div>
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold text-slate-800 mb-1">{valvula.nombre}</CardTitle>
                      <CardDescription className="text-sm text-slate-600">
                        {finca?.name ? `${finca.name} - Bananera San José` : "Sector Norte - Bananera San José"}
                      </CardDescription>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full ${
                      valvula.estado === "ABIERTA"
                        ? "bg-blue-500 animate-pulse shadow-lg"
                        : valvula.estado === "ERROR"
                          ? "bg-red-600"
                          : "bg-slate-400"
                    }`}
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-6 px-6 pb-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center space-y-1">
                    <div className="text-4xl font-bold text-blue-600">{(valvula.caudal || 0).toFixed(1)}</div>
                    <div className="text-sm text-slate-600 font-medium">L/min</div>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="text-4xl font-bold text-slate-700">{(valvula.presion || 0).toFixed(1)}</div>
                    <div className="text-sm text-slate-600 font-medium">bar</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-slate-700">Tipo:</span>
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                      {getValvulaTypeName(valvula.tipo)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-slate-700">Estado:</span>
                    <Badge
                      className={`px-3 py-1 font-medium ${
                        valvula.estado === "ABIERTA"
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : valvula.estado === "ERROR"
                            ? "bg-red-600 text-white"
                            : "bg-slate-500 text-white"
                      }`}
                    >
                      {valvula.estado === "ABIERTA" ? "Regando" : valvula.estado === "ERROR" ? "Error" : "Detenida"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-slate-700">Caudal máx:</span>
                    <span className="text-sm font-semibold text-slate-800">{(valvula.caudal || 0) * 1.25} L/min</span>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm font-medium text-slate-700">Rendimiento:</span>
                    <span className="text-sm font-semibold text-slate-800">
                      {valvula.estado === "ABIERTA" ? "81%" : "0%"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Progress value={valvula.estado === "ABIERTA" ? 81 : 0} className="h-2 bg-slate-200" />
                  </div>

                  <div className="flex items-center justify-between py-2 text-sm text-slate-600 border-t border-slate-200 pt-4">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Última actividad:
                    </span>
                    <span className="font-medium text-slate-800">
                      {valvula.updatedAt ? new Date(valvula.updatedAt).toLocaleTimeString("es-EC") : "4:26:02 p. m."}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center pt-4">
                  <Button
                    size="lg"
                    variant={valvula.estado === "ABIERTA" ? "destructive" : "default"}
                    onClick={() => handleToggleValvula(valvula.id)}
                    disabled={valvula.isActive === false || isValvulaLoading}
                    className={`min-w-[110px] h-11 font-semibold transition-all duration-200 ${
                      valvula.estado === "ABIERTA"
                        ? "bg-red-500 hover:bg-red-600 text-white shadow-lg"
                        : "bg-[#1C352D] hover:bg-[#0f1f19] text-white shadow-lg"
                    }`}
                  >
                    {isValvulaLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : valvula.estado === "ABIERTA" ? (
                      <>
                        <Square className="h-4 w-4 mr-2" />
                        Detener
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Iniciar
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
        <Card className="border-2 border-slate-200 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="p-4 bg-slate-100 rounded-full">
              <Droplets className="h-16 w-16 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700">No hay válvulas</h3>
            <p className="text-slate-500 text-center leading-relaxed max-w-md">
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

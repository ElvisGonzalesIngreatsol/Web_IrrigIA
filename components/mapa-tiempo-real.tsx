"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useNotifications } from "./notification-system"
import { Droplets, Thermometer, Activity, RefreshCw, Maximize2, Eye, MapPin } from "lucide-react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { GoogleMap } from "./google-map"
import apiService from "@/lib/api"

export function MapaTiempoReal() {
  // fincas obtenidas desde la API (no desde data-context)
  const [fincasApi, setFincasApi] = useState<any[]>([])
  const [loadingFincas, setLoadingFincas] = useState(false)
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const [selectedFinca, setSelectedFinca] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [mapCenter, setMapCenter] = useState({ lat: 4.711, lng: -74.0721 })
  const [mapZoom, setMapZoom] = useState(10)

  // Cargar fincas desde la API al montar
  useEffect(() => {
    const fetchFincas = async () => {
      setLoadingFincas(true)
      try {
        const resp = await apiService.getAllFincas()
        const payload: any = resp?.data ?? resp
        let arr: any[] = []
        if (Array.isArray(payload)) arr = payload
        else if (payload && Array.isArray(payload.data)) arr = payload.data
        else if (payload && Array.isArray(payload.results)) arr = payload.results

        // Normalizar campos importantes
        const normalized = arr.map((f: any) => ({
          ...f,
          id: f.id != null ? String(f.id) : f.id,
          nombre: f.nombre ?? f.name,
          location: f.location ?? f.ubicacion ?? f.address ?? "",
          lotes: Array.isArray(f.lotes) ? f.lotes : f.lotes ?? [],
          // mantener posibles coordenadas en distintas propiedades
          mapCoordinates: f.mapCoordinates ?? f.coordinates ?? (f.latitude && f.longitude ? { lat: f.latitude, lng: f.longitude } : undefined),
        }))
        setFincasApi(normalized)
      } catch (err) {
        console.error("Error fetching fincas API:", err)
        setFincasApi([])
      } finally {
        setLoadingFincas(false)
      }
    }
    fetchFincas()
  }, [])

  // Derivar fincas visibles para el usuario a partir de fincasApi
  const userFincas = useMemo(() => {
    if (!Array.isArray(fincasApi)) return []
    if (user?.role === "ADMIN") {
      return fincasApi
    }
    const userIds = Array.isArray(user?.fincaIds) ? user.fincaIds.map((id: any) => String(id)) : []
    if (user?.fincaId != null) userIds.push(String(user.fincaId))
    return fincasApi.filter((f) => userIds.includes(String(f.id)))
  }, [fincasApi, user?.role, user?.fincaId, user?.fincaIds])

  // Memoizar la lógica de selección automática para evitar loops
  const autoSelectFinca = useCallback(() => {
    if (userFincas.length === 0) return

    // Si el usuario es USER/CLIENT y no hay selección, seleccionar la primera finca disponible
    if ((user?.role === "USER") && !selectedFinca && userFincas.length > 0) {
      const finca = userFincas[0]
      setSelectedFinca(String(finca.id))

      // Soportar distintos nombres de campo para coordenadas
      const coords =
        finca.mapCoordinates ??
        finca.coordinates ??
        (typeof finca.latitude === "number" && typeof finca.longitude === "number"
          ? { lat: finca.latitude, lng: finca.longitude }
          : null)

      if (coords && typeof coords.lat === "number" && typeof coords.lng === "number") {
        setMapCenter({ lat: coords.lat, lng: coords.lng })
        setMapZoom(16)
      }
    }

    // Para admin: si no hay selección, seleccionar la primera finca disponible
    if (user?.role === "ADMIN" && !selectedFinca && userFincas.length > 0) {
      setSelectedFinca(String(userFincas[0].id))
    }
  }, [user?.role, userFincas, selectedFinca])

  useEffect(() => {
    autoSelectFinca()
  }, [autoSelectFinca])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsRefreshing(false)

    addNotification({
      type: "success",
      title: "Mapa Actualizado",
      message: "Los datos del mapa han sido actualizados",
      duration: 3000,
    })
  }

  const handleFocusOnFinca = (finca: any) => {
    
    const coords =
      finca.mapCoordinates ??
      finca.coordinates ??
      (typeof finca.lat === "number" && typeof finca.lng === "number"
        ? { lat: finca.lat, lng: finca.lng }
        : null)

    if (coords && typeof coords.lat === "number" && typeof coords.lng === "number") {
      setMapCenter({ lat: coords.lat, lng: coords.lng })
      setMapZoom(16)
      setSelectedFinca(String(finca.id))

      addNotification({
        type: "info",
        title: "Ubicación Encontrada",
        message: `Mostrando ubicación de ${finca.nombre}`,
        duration: 2000,
      })
    } else {
      addNotification({
        type: "warning",
        title: "Sin coordenadas",
        message: `No se encuentran coordenadas para ${finca.nombre}`,
        duration: 2000,
      })
    }
  }

  const getSensorIcon = (type: string) => {
    switch (type) {
      case "temperature":
        return <Thermometer className="h-3 w-3" />
      case "humidity":
        return <Droplets className="h-3 w-3" />
      case "ph":
        return <Activity className="h-3 w-3" />
      case "flow":
        return <Activity className="h-3 w-3" />
      default:
        return <Activity className="h-3 w-3" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-500"
      case "closed":
        return "bg-gray-500"
      case "maintenance":
        return "bg-red-500"
      case "active":
        return "bg-blue-500"
      case "inactive":
        return "bg-gray-400"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-400"
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[rgba(28,53,45,1)]">Mapa en Tiempo Real</h1>
          <p className="text-muted-foreground">
            {user?.role === "ADMIN"
              ? "Visualización geográfica de sensores y válvulas en tiempo real"
              : `Monitoreo de ${userFincas.length === 1 ? "tu finca" : "tus fincas"} en tiempo real`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="text-black" variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Actualizando..." : "Actualizar"}
          </Button>
          <Button className="text-black" variant="outline">
            <Maximize2 className="h-4 w-4 mr-2" />
            Pantalla Completa
          </Button>
        </div>
      </div>

      {(user?.role === "ADMIN" || userFincas.length > 1) && (
        <Card>
          <CardHeader>
            <CardTitle>{user?.role === "ADMIN" ? "Seleccionar Finca" : "Tus Fincas"}</CardTitle>
            <CardDescription>
              {user?.role === "ADMIN"
                ? "Haz clic en el ojo para ubicar la finca en el mapa"
                : "Haz clic en el ojo para ubicar tu finca en el mapa"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              {userFincas.map((finca) => (
                <div
                  key={finca.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    selectedFinca === String(finca.id) ? "border-2 border-green-600 bg-green-50" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">{finca.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {finca.location ? `${finca.location}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedFinca === String(finca.id) && (
                      <Badge variant="default" className="bg-green-600 text-white px-2 py-1">
                        Mostrada
                      </Badge>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleFocusOnFinca(finca)} className="h-8 w-8 p-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {user?.role === "USER" && userFincas.length === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Tu Finca</CardTitle>
            <CardDescription>Información de tu finca asignada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">{userFincas[0].nombre}</p>
                  <p className="text-sm text-green-600">{userFincas[0].location}</p>
                  <p className="text-xs text-green-500">
                    {userFincas[0].area} Ha • {userFincas[0].lotes?.length || 0} Lotes
                  </p>
                </div>
              </div>
              <Badge variant="default" className="bg-green-600">
                Asignada
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Vista del Mapa</CardTitle>
          <CardDescription>
            {user?.role === "ADMIN"
              ? "Mapa interactivo con ubicaciones reales de fincas, sensores y válvulas"
              : "Mapa interactivo de tu finca con sensores y válvulas"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] rounded-lg overflow-hidden">
            <GoogleMap
              center={mapCenter}
              zoom={mapZoom}
              fincas={userFincas}
              selectedFinca={selectedFinca}
              onFincaSelect={setSelectedFinca}
            />
          </div>
        </CardContent>
      </Card>

      {(user?.role === "ADMIN" || userFincas.length > 1) && (
        <div className="flex flex-wrap gap-2">
          <Button variant={selectedFinca === null ? "default" : "outline"} onClick={() => setSelectedFinca(null)}>
            {user?.role === "ADMIN" ? "Todas las Fincas" : "Todas mis Fincas"}
          </Button>
          {userFincas.map((finca) => (
            <Button
              key={finca.id}
              variant={selectedFinca === String(finca.id) ? "default" : "outline"}
              onClick={() => setSelectedFinca(String(finca.id))}
            >
              {finca.nombre}
            </Button>
          ))}
        </div>
      )}

      {/* Panel de información */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estadísticas del Mapa</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">{user?.role === "ADMIN" ? "Total de Fincas:" : "Mis Fincas:"}</span>
                <Badge variant="outline">{userFincas.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total de Lotes:</span>
                <Badge variant="outline">{userFincas.reduce((acc: number, f: any) => acc + (f.lotes?.length || 0), 0)}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Válvulas Activas:</span>
                <Badge variant="default">
                  {userFincas.reduce(
                    (acc: number, f: any) =>
                      acc +
                      (f.lotes?.reduce(
                        (lAcc: number, l: any) => lAcc + (l.valvulas?.filter((v: any) => v.estado === "ABIERTA").length || 0),
                        0,
                      ) || 0),
                    0,
                  )}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Sensores Online:</span>
                <Badge variant="default">
                  {userFincas.reduce(
                    (acc: number, f: any) =>
                      acc +
                      (f.lotes?.reduce(
                        (lAcc: number, l: any) => lAcc + (l.sensors?.filter((s: any) => s.status === "online").length || 0),
                        0,
                      ) || 0),
                    0,
                  )}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertas del Mapa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Sensor pH Fuera de Rango</p>
                  <p className="text-xs text-muted-foreground">
                    {userFincas.length > 0 ? `Lote C - ${userFincas[0].nombre}` : "Lote C"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2 bg-red-50 rounded">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Válvula en Mantenimiento</p>
                  <p className="text-xs text-muted-foreground">Requiere inspección técnica</p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Riego Programado</p>
                  <p className="text-xs text-muted-foreground">Próximo riego en 2 horas</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

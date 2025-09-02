"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useData } from "@/contexts/data-context"
import { useAuth } from "@/contexts/auth-context"
import { useNotifications } from "./notification-system"
import { Droplets, Thermometer, Activity, RefreshCw, Maximize2, Eye, MapPin } from "lucide-react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { GoogleMap } from "./google-map"

export function MapaTiempoReal() {
  const { fincas } = useData()
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const [selectedFinca, setSelectedFinca] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [mapCenter, setMapCenter] = useState({ lat: 4.711, lng: -74.0721 })
  const [mapZoom, setMapZoom] = useState(10)

  const userFincas = useMemo(() => {
    if (user?.role === "admin") {
      return fincas
    }
    return fincas.filter((finca) => user?.fincaId === finca.id || user?.fincaIds?.includes(finca.id))
  }, [fincas, user?.role, user?.fincaId, user?.fincaIds])

  // Memoizar la lógica de selección automática para evitar loops
  const autoSelectFinca = useCallback(() => {
    if (user?.role === "client" && userFincas.length > 0 && !selectedFinca) {
      // Si el cliente solo tiene una finca, seleccionarla automáticamente
      if (userFincas.length === 1) {
        const finca = userFincas[0]
        setSelectedFinca(finca.id)
        if (finca.mapCoordinates) {
          setMapCenter({ lat: finca.mapCoordinates.lat, lng: finca.mapCoordinates.lng })
          setMapZoom(16)
        }
      }
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
      autoClose: true,
      duration: 3000,
    })
  }

  const handleFocusOnFinca = (finca: any) => {
    if (finca.mapCoordinates) {
      setMapCenter({ lat: finca.mapCoordinates.lat, lng: finca.mapCoordinates.lng })
      setMapZoom(16)
      setSelectedFinca(finca.id)

      addNotification({
        type: "info",
        title: "Ubicación Encontrada",
        message: `Mostrando ubicación de ${finca.name}`,
        autoClose: true,
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
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-[rgba(28,53,45,1)] leading-tight">
            Mapa en Tiempo Real
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            {user?.role === "admin"
              ? "Visualización geográfica de sensores y válvulas en tiempo real"
              : `Monitoreo de ${userFincas.length === 1 ? "tu finca" : "tus fincas"} en tiempo real`}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            className="text-black px-6 py-3 bg-transparent"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Actualizando..." : "Actualizar"}
          </Button>
          <Button className="text-black px-6 py-3 bg-transparent" variant="outline">
            <Maximize2 className="h-4 w-4 mr-2" />
            Pantalla Completa
          </Button>
        </div>
      </div>

      {(user?.role === "admin" || userFincas.length > 1) && (
        <Card className="p-1">
          <CardHeader className="px-6 py-5">
            <CardTitle className="leading-tight">
              {user?.role === "admin" ? "Seleccionar Finca" : "Tus Fincas"}
            </CardTitle>
            <CardDescription className="leading-relaxed mt-2">
              {user?.role === "admin"
                ? "Haz clic en el ojo para ubicar la finca en el mapa"
                : "Haz clic en el ojo para ubicar tu finca en el mapa"}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {userFincas.map((finca) => (
                <div key={finca.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium text-sm leading-none">{finca.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{finca.location}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleFocusOnFinca(finca)} className="h-9 w-9 p-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {user?.role === "client" && userFincas.length === 1 && (
        <Card className="p-1">
          <CardHeader className="px-6 py-5">
            <CardTitle className="leading-tight">Tu Finca</CardTitle>
            <CardDescription className="leading-relaxed mt-2">Información de tu finca asignada</CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="flex items-center justify-between p-5 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="flex items-center gap-4">
                <MapPin className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800 leading-none">{userFincas[0].name}</p>
                  <p className="text-sm text-green-600 mt-1 leading-relaxed">{userFincas[0].location}</p>
                  <p className="text-xs text-green-500 mt-1 leading-relaxed">
                    {userFincas[0].area} Ha • {userFincas[0].lotes?.length || 0} Lotes
                  </p>
                </div>
              </div>
              <Badge variant="default" className="bg-green-600 px-3 py-1">
                Asignada
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="p-1">
        <CardHeader className="px-6 py-5">
          <CardTitle className="leading-tight">Vista del Mapa</CardTitle>
          <CardDescription className="leading-relaxed mt-2">
            {user?.role === "admin"
              ? "Mapa interactivo con ubicaciones reales de fincas, sensores y válvulas"
              : "Mapa interactivo de tu finca con sensores y válvulas"}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="h-[600px] rounded-lg overflow-hidden border">
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

      {(user?.role === "admin" || userFincas.length > 1) && (
        <div className="flex flex-wrap gap-3">
          <Button
            variant={selectedFinca === null ? "default" : "outline"}
            onClick={() => setSelectedFinca(null)}
            className="px-4 py-2"
          >
            {user?.role === "admin" ? "Todas las Fincas" : "Todas mis Fincas"}
          </Button>
          {userFincas.map((finca) => (
            <Button
              key={finca.id}
              variant={selectedFinca === finca.id ? "default" : "outline"}
              onClick={() => setSelectedFinca(finca.id)}
              className="px-4 py-2"
            >
              {finca.name}
            </Button>
          ))}
        </div>
      )}

      {/* Panel de información */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-1">
          <CardHeader className="px-6 py-5">
            <CardTitle className="leading-tight">Estadísticas del Mapa</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm leading-relaxed">
                  {user?.role === "admin" ? "Total de Fincas:" : "Mis Fincas:"}
                </span>
                <Badge variant="outline" className="px-3 py-1">
                  {userFincas.length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm leading-relaxed">Total de Lotes:</span>
                <Badge variant="outline" className="px-3 py-1">
                  {userFincas.reduce((acc, f) => acc + (f.lotes?.length || 0), 0)}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm leading-relaxed">Válvulas Activas:</span>
                <Badge variant="default" className="px-3 py-1">
                  {userFincas.reduce(
                    (acc, f) =>
                      acc +
                      (f.lotes?.reduce(
                        (lAcc, l) => lAcc + (l.valvulas?.filter((v) => v.status === "open").length || 0),
                        0,
                      ) || 0),
                    0,
                  )}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm leading-relaxed">Sensores Online:</span>
                <Badge variant="default" className="px-3 py-1">
                  {userFincas.reduce(
                    (acc, f) =>
                      acc +
                      (f.lotes?.reduce(
                        (lAcc, l) => lAcc + (l.sensors?.filter((s) => s.status === "active").length || 0),
                        0,
                      ) || 0),
                    0,
                  )}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-1">
          <CardHeader className="px-6 py-5">
            <CardTitle className="leading-tight">Alertas del Mapa</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium leading-none">Sensor pH Fuera de Rango</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {userFincas.length > 0 ? `Lote C - ${userFincas[0].name}` : "Lote C"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-red-50 rounded">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium leading-none">Válvula en Mantenimiento</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Requiere inspección técnica</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium leading-none">Riego Programado</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Próximo riego en 2 horas</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { apiService } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GoogleMap } from "./google-map"
import { Droplets, Activity, RefreshCw, Building2, Layers, AlertTriangle } from "lucide-react"

export function MonitoreoAvanzado() {
  // Datos reales obtenidos desde la API (no desde data-context)
  const [fincasApi, setFincasApi] = useState<any[]>([])
  const [lotesApi, setLotesApi] = useState<any[]>([])
  const [valvulasApi, setValvulasApi] = useState<any[]>([])
  const [selectedFincaId, setSelectedFincaId] = useState<string>("")
  const [selectedValvula, setSelectedValvula] = useState<string | null>(null)
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [map, setMap] = useState<any | null>(null)
  const [markers, setMarkers] = useState<any[]>([])
  const [polygons, setPolygons] = useState<any[]>([])

  // Cargar fincas desde la API al montar
  useEffect(() => {
    const fetchFincas = async () => {
      try {
        const resp = await apiService.getAllFincas()
        const payload: any = resp?.data ?? resp
        let arr: any[] = []
        if (Array.isArray(payload)) arr = payload
        else if (payload && Array.isArray(payload.data)) arr = payload.data
        else if (payload && Array.isArray(payload.results)) arr = payload.results

        const normalized = arr.map((f: any) => ({
          ...f,
          id: f.id != null ? String(f.id) : f.id,
          nombre: f.nombre ?? f.name,
          location: f.location ?? f.ubicacion ?? f.address ?? "",
          latitude: typeof f.latitude === "number" ? f.latitude : (f.mapCoordinates?.lat ?? f.coordinates?.lat),
          longitude: typeof f.longitude === "number" ? f.longitude : (f.mapCoordinates?.lng ?? f.coordinates?.lng),
          lotes: Array.isArray(f.lotes) ? f.lotes : [],
        }))
        setFincasApi(normalized)
      } catch (err) {
        console.error("Error fetching fincas API:", err)
        setFincasApi([])
      }
    }
    fetchFincas()
  }, [])

  // Cargar lotes y válvulas cuando cambia la finca seleccionada
  useEffect(() => {
    const fetchLotesYValvulas = async () => {
      if (!selectedFincaId) {
        setLotesApi([])
        setValvulasApi([])
        return
      }

      try {
        // Lotes
        const respL = await apiService.request(`/api/lotes/all/${selectedFincaId}`)
        const payloadL: any = respL?.data ?? respL
        let lotesArr: any[] = []
        if (Array.isArray(payloadL)) lotesArr = payloadL
        else if (payloadL && Array.isArray(payloadL.data)) lotesArr = payloadL.data
        else if (payloadL && Array.isArray(payloadL.results)) lotesArr = payloadL.results

        // Normalizar ids y posibles valvulas embebidas
        const normalizedLotes = lotesArr.map((l: any) => ({
          ...l,
          id: l.id != null ? String(l.id) : l.id,
          nombre: l.nombre ?? l.name,
          coordinates: l.coordinates ?? l.polygon ?? l.boundary,
          centerCoordinates: l.centerCoordinates ?? l.center,
          valvulas: Array.isArray(l.valvulas) ? l.valvulas : (l.valvulas ?? []),
        }))
        setLotesApi(normalizedLotes)

        // Si lotes ya traen válvulas embebidas, usarlas; si no, pedir a la API
        const embeddedValvulas = normalizedLotes.flatMap((l) => (Array.isArray(l.valvulas) ? l.valvulas : []))
        if (embeddedValvulas.length > 0) {
          // normalizar ids
          setValvulasApi(embeddedValvulas.map((v: any) => ({ ...v, id: v.id != null ? String(v.id) : v.id })))
        } else {
          // Intentar endpoint por finca
          try {
            const respV = await apiService.request(`/api/valvulas/finca/${selectedFincaId}`)
            const payloadV: any = respV?.data ?? respV
            let valvArr: any[] = []
            if (Array.isArray(payloadV)) valvArr = payloadV
            else if (payloadV && Array.isArray(payloadV.data)) valvArr = payloadV.data
            else if (payloadV && Array.isArray(payloadV.results)) valvArr = payloadV.results

            setValvulasApi(valvArr.map((v: any) => ({ ...v, id: v.id != null ? String(v.id) : v.id })))
          } catch (_e) {
            // Fallback: obtener todas las válvulas y filtrar por finca/lote
            try {
              const respAll = await apiService.request("/api/valvulas")
              const payloadAll: any = respAll?.data ?? respAll
              let allArr: any[] = []
              if (Array.isArray(payloadAll)) allArr = payloadAll
              else if (payloadAll && Array.isArray(payloadAll.data)) allArr = payloadAll.data
              else if (payloadAll && Array.isArray(payloadAll.results)) allArr = payloadAll.results

              const filtered = allArr.filter((v) => String(v.fincaId) === String(selectedFincaId) || normalizedLotes.some((l) => String(l.id) === String(v.loteId)))
              setValvulasApi(filtered.map((v: any) => ({ ...v, id: v.id != null ? String(v.id) : v.id })))
            } catch (err) {
              console.error("Error fetching valvulas fallback:", err)
              setValvulasApi([])
            }
          }
        }
      } catch (err) {
        console.error("Error fetching lotes/valvulas:", err)
        setLotesApi([])
        setValvulasApi([])
      }
    }
    fetchLotesYValvulas()
  }, [selectedFincaId])

  // Filtrar datos por finca seleccionada - memoized usando los datos de la API
  const selectedFinca = useMemo(() => fincasApi.find((f) => String(f.id) === selectedFincaId), [fincasApi, selectedFincaId])

  const fincaLotes = useMemo(
    () => (selectedFincaId ? lotesApi.filter((l) => String(l.fincaId) === String(selectedFincaId)) : []),
    [lotesApi, selectedFincaId],
  )

  const fincaValvulas = useMemo(
    () => (selectedFincaId ? valvulasApi.filter((v) => String(v.fincaId) === String(selectedFincaId) || String(v.loteId) && fincaLotes.some(l=>String(l.id)===String(v.loteId))) : []),
    [valvulasApi, selectedFincaId, fincaLotes],
  )

  useEffect(() => {
    if (!isAutoRefresh) return

    const interval = setInterval(() => {
      console.log("Actualizando datos en tiempo real...")
    }, 5000)

    return () => {
      clearInterval(interval)
    }
  }, [isAutoRefresh])

  const handleMapLoad = useCallback((mapInstance: any) => {
    setMap(mapInstance)
  }, [])

  useEffect(() => {
    if (!map || !selectedFinca || !window.google?.maps) return

    // Clean up existing markers and polygons safely
    markers.forEach((marker) => {
      try {
        if (marker && marker.setMap) {
          marker.setMap(null)
        }
      } catch (error) {
        console.warn("Error cleaning up marker:", error)
      }
    })

    polygons.forEach((polygon) => {
      try {
        if (polygon && polygon.setMap) {
          polygon.setMap(null)
        }
      } catch (error) {
        console.warn("Error cleaning up polygon:", error)
      }
    })

    setMarkers([])
    setPolygons([])

    try {
      // Center map on finca
      map.setCenter({ lat: selectedFinca.latitude, lng: selectedFinca.longitude })
      map.setZoom(16)

      if (selectedFinca.coordinates && selectedFinca.coordinates.length > 0) {
        const fincaPolygon = new window.google.maps.Polygon({
          paths: selectedFinca.coordinates,
          strokeColor: "#22c55e", // Green line for farm boundary
          strokeOpacity: 1,
          strokeWeight: 3,
          fillColor: "#22c55e",
          fillOpacity: 0, // Completely transparent interior
          map: map,
        })

        setPolygons((prev) => [...prev, fincaPolygon])
      }

      const newPolygons = fincaLotes.map((lote) => {
        const polygon = new window.google.maps.Polygon({
          paths: lote.coordinates,
          strokeColor: "#3b82f6", // Blue line for lots
          strokeOpacity: 1,
          strokeWeight: 2,
          fillColor: "#3b82f6",
          fillOpacity: 0, // Completely transparent interior
          map: map,
        })

        const label = new window.google.maps.InfoWindow({
          content: `<div style="
            background: transparent; 
            border: none; 
            box-shadow: none;
            text-align: center;
            font-weight: bold;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8);
            font-size: ${Math.max(12, Math.min(18, map.getZoom() * 1.2))}px;
            pointer-events: none;
          ">${lote.nombre}</div>`,
          position: lote.centerCoordinates,
          disableAutoPan: true,
        })

        label.open(map)

        const zoomListener = map.addListener("zoom_changed", () => {
          const newSize = Math.max(12, Math.min(18, map.getZoom() * 1.2))
          label.setContent(`<div style="
            background: transparent; 
            border: none; 
            box-shadow: none;
            text-align: center;
            font-weight: bold;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8);
            font-size: ${newSize}px;
            pointer-events: none;
          ">${lote.nombre}</div>`)
        })

        polygon.addListener("click", () => {
          try {
            const infoWindow = new window.google.maps.InfoWindow({
              content: `<div class="p-2"><strong>${lote.nombre}</strong><br/>Área: ${lote.area} Ha</div>`,
              position: lote.centerCoordinates,
            })
            infoWindow.open(map)
          } catch (error) {
            console.warn("Error opening lote info window:", error)
          }
        })

        return polygon
      })

      const newMarkers = fincaValvulas.map((valvula) => {
        const getMarkerColor = () => {
          if (valvula.estado === "maintenance") return "#ef4444" // red
          if (valvula.isActive) return "#3b82f6" // blue
          return "#6b7280" // gray
        }

        const markerIcon = valvula.isActive
          ? {
              path: "M-8,-8 L8,-8 L8,8 L-8,8 Z M-12,-12 L12,-12 M-12,12 L12,12 M-12,-6 L12,-6 M-12,0 L12,0 M-12,6 L12,6",
              fillColor: getMarkerColor(),
              fillOpacity: 0.8,
              strokeColor: "#ffffff",
              strokeWeight: 2,
              scale: 1,
              anchor: new window.google.maps.Point(0, 0),
            }
          : {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: getMarkerColor(),
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            }

        const marker = new window.google.maps.Marker({
          position: valvula.lat && valvula.lng
            ? { lat: valvula.lat, lng: valvula.lng }
            : undefined,
          map: map,
          title: valvula.nombre,
          icon: markerIcon,
        })

        if (valvula.isActive) {
          let scale = 1
          let growing = true
          const animationInterval = setInterval(() => {
            if (growing) {
              scale += 0.1
              if (scale >= 1.5) growing = false
            } else {
              scale -= 0.1
              if (scale <= 1) growing = true
            }

            marker.setIcon({
              ...markerIcon,
              scale: scale,
            })
          }, 200)

          // Store interval for cleanup
          marker.animationInterval = animationInterval
        }

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div class="p-3">
              <h3 class="font-semibold">${valvula.nombre}</h3>
              <p class="text-sm text-gray-600">Device: ${valvula.deviceId}</p>
              <p class="text-sm">Estado: ${valvula.estado === "maintenance" ? "Mantenimiento" : valvula.isActive ? "🚿 Regando" : "⏸️ Detenida"}</p>
              <p class="text-sm">Flujo: ${typeof valvula.caudal === "number" ? valvula.caudal.toFixed(1) : "N/A"} L/min</p>
              <p class="text-xs text-gray-500">
                Última actividad: ${
                  valvula.updatedAt
                    ? new Date(valvula.updatedAt).toLocaleTimeString()
                    : "No disponible"
                }
              </p>
            </div>
          `,
        })

        marker.addListener("click", () => {
          try {
            setSelectedValvula(valvula.id.toString())
            infoWindow.open(map, marker)
          } catch (error) {
            console.warn("Error opening valve info window:", error)
          }
        })

        return marker
      })

      setPolygons((prev) => [...prev, ...newPolygons])
      setMarkers(newMarkers)
    } catch (error) {
      console.warn("Error updating map elements:", error)
    }

    // Cleanup function for animations
    return () => {
      markers.forEach((marker) => {
        if (marker.animationInterval) {
          clearInterval(marker.animationInterval)
        }
      })
    }
  }, [map, selectedFinca, fincaLotes, fincaValvulas])

  const activeValvulas = fincaValvulas.filter((v) => v.isActive)
  const totalFlow = activeValvulas.reduce((sum, v) => sum + (v.caudal ?? 0), 0)
  // Filtrar válvulas en mantenimiento usando la propiedad 'estado'
  const maintenanceValvulas = fincaValvulas.filter((v) => v.estado === "maintenance")

  // Si necesitas agregar la propiedad 'estado' al tipo Valvula, hazlo en el archivo de definición de tipos:
  // interface Valvula {
  //   ...
  //   estado?: string;
  //   ...
  // }

  return (
    <div className="space-y-8 p-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[rgba(28,53,45,1)] leading-tight">Monitoreo Avanzado</h1>
          <p className="text-muted-foreground leading-relaxed">Supervisión en tiempo real de todas las fincas</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Switch checked={isAutoRefresh} onCheckedChange={setIsAutoRefresh} />
            <span className="text-sm leading-none">Auto-actualizar</span>
          </div>
          <Button className="text-black px-6 py-3 bg-transparent" variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Selector de finca */}
      <Card className="p-1">
        <CardHeader className="px-6 py-5">
          <CardTitle className="flex items-center gap-3 text-lg leading-tight">
            <Building2 className="h-5 w-5" />
            Seleccionar Finca
          </CardTitle>
          <CardDescription className="leading-relaxed mt-2">
            Elige una finca para ver su información detallada
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <Select value={selectedFincaId} onValueChange={setSelectedFincaId}>
            <SelectTrigger className="w-full py-3 px-4">
              <SelectValue placeholder="Selecciona una finca para monitorear" />
            </SelectTrigger>
            <SelectContent>
              {fincasApi.map((finca) => {
                const fincaValvulasCount = valvulasApi.filter((v) => String(v.fincaId) === String(finca.id)).length
                const activeFincaValvulas = valvulasApi.filter((v) => String(v.fincaId) === String(finca.id) && v.isActive).length

                return (
                  <SelectItem key={finca.id} value={String(finca.id)} className="py-3">
                    <div className="flex items-center justify-between w-full">
                      <span className="leading-none">{finca.nombre}</span>
                      <div className="flex items-center gap-3 ml-6">
                        <Badge variant="outline" className="text-xs px-2 py-1">
                          {fincaValvulasCount} válvulas
                        </Badge>
                        {activeFincaValvulas > 0 && (
                          <Badge variant="default" className="text-xs px-2 py-1">
                            {activeFincaValvulas} activas
                          </Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedFinca && (
        <>
          {/* Estadísticas de la finca seleccionada */}
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="p-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-5 pt-5">
                <CardTitle className="text-sm font-medium leading-none">Lotes</CardTitle>
                <Layers className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="text-2xl font-bold text-green-600 leading-none">{fincaLotes.length}</div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {fincaLotes.reduce((sum, l) => sum + (l.area ?? 0), 0).toFixed(1)} Ha total
                </p>
              </CardContent>
            </Card>

            <Card className="p-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-5 pt-5">
                <CardTitle className="text-sm font-medium leading-none">Válvulas Activas</CardTitle>
                <Activity className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="text-2xl font-bold text-blue-600 leading-none">{activeValvulas.length}</div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">de {fincaValvulas.length} válvulas</p>
              </CardContent>
            </Card>

            <Card className="p-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-5 pt-5">
                <CardTitle className="text-sm font-medium leading-none">Flujo Total</CardTitle>
                <Droplets className="h-4 w-4 text-cyan-500" />
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="text-2xl font-bold text-cyan-600 leading-none">{totalFlow.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">L/min</p>
              </CardContent>
            </Card>

            <Card className="p-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-5 pt-5">
                <CardTitle className="text-sm font-medium leading-none">Mantenimiento</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="text-2xl font-bold text-orange-600 leading-none">{maintenanceValvulas.length}</div>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">requieren atención</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Mapa principal */}
            <div className="lg:col-span-2">
              <Card className="p-1">
                <CardHeader className="px-6 py-5">
                  <CardTitle className="leading-tight">Mapa de {selectedFinca?.nombre}</CardTitle>
                  <CardDescription className="leading-relaxed mt-2">
                    {selectedFinca.location} - Vista satelital con lotes y válvulas
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                  <div className="rounded-lg overflow-hidden border">
                    <GoogleMap
                      center={{ lat: selectedFinca.latitude, lng: selectedFinca.longitude }}
                      zoom={16}
                      height="500px"
                      onMapLoad={handleMapLoad}
                    />
                  </div>

                  {/* Leyenda */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium mb-4 leading-none">Leyenda</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="leading-relaxed">Válvula Regando</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                        <span className="leading-relaxed">Válvula Inactiva</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="leading-relaxed">Mantenimiento</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-2 bg-green-200 border border-green-500"></div>
                        <span className="leading-relaxed">Lotes</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Panel de información */}
            <div className="space-y-6">
              {/* Información de la finca */}
              <Card className="p-1">
                <CardHeader className="px-5 py-4">
                  <CardTitle className="text-lg leading-tight">Información de la Finca</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium leading-none mb-1">Nombre:</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{selectedFinca.nombre}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none mb-1">Ubicación:</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{selectedFinca.location}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none mb-1">Área Total:</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{selectedFinca.area} Ha</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none mb-1">Coordenadas:</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {typeof selectedFinca?.latitude === "number" && typeof selectedFinca?.longitude === "number"
                          ? `${selectedFinca.latitude.toFixed(4)}, ${selectedFinca.longitude.toFixed(4)}`
                          : "Coordenadas no disponibles"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Válvulas activas */}
              <Card className="p-1">
                <CardHeader>
                  <CardTitle className="text-lg">Válvulas Activas</CardTitle>
                  <CardDescription>
                    {activeValvulas.length} de {fincaValvulas.length} válvulas regando
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {activeValvulas.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No hay válvulas activas</p>
                    ) : (
                      activeValvulas.map((valvula) => {
                        const lote = fincaLotes.find((l) => l.id === valvula.loteId)
                        return (
                          <div
                            key={valvula.id}
                            className="flex items-center justify-between p-2 bg-blue-50 rounded cursor-pointer hover:bg-blue-100"
                            onClick={() => setSelectedValvula(String(valvula.id))}
                          >
                            <div>
                              <p className="text-sm font-medium">{valvula.nombre}</p>
                              <p className="text-xs text-muted-foreground">{lote?.nombre}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-blue-600">
                                {typeof valvula.caudal === "number" ? valvula.caudal.toFixed(1) : "N/A"} L/min
                              </p>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                <span className="text-xs text-blue-600">Activa</span>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Alertas */}
              <Card className="p-1">
                <CardHeader>
                  <CardTitle className="text-lg">Alertas y Estado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {maintenanceValvulas.length === 0 ? (
                      <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm">Todas las válvulas operativas</span>
                      </div>
                    ) : (
                      maintenanceValvulas.map((valvula) => (
                        <div key={valvula.id} className="flex items-center gap-2 p-2 bg-orange-50 rounded">
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                          <div>
                            <p className="text-sm font-medium">{valvula.nombre}</p>
                            <p className="text-xs text-orange-600">Requiere mantenimiento</p>
                          </div>
                        </div>
                      ))
                    )}

                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="text-sm">Conectividad LoRaWAN: 98%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {!selectedFinca && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Selecciona una finca</h3>
            <p className="text-muted-foreground text-center">
              Elige una finca del selector superior para ver su información detallada y mapa en tiempo real.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

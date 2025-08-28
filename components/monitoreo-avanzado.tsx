"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useData } from "@/contexts/data-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GoogleMap } from "./google-map"
import { Droplets, Activity, RefreshCw, Building2, Layers, AlertTriangle } from "lucide-react"

export function MonitoreoAvanzado() {
  const { valvulas, lotes, fincas, toggleValvula } = useData()
  const [selectedFincaId, setSelectedFincaId] = useState<string>("")
  const [selectedValvula, setSelectedValvula] = useState<string | null>(null)
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [map, setMap] = useState<any | null>(null)
  const [markers, setMarkers] = useState<any[]>([])
  const [polygons, setPolygons] = useState<any[]>([])

  // Filtrar datos por finca seleccionada - memoized
  const selectedFinca = useMemo(() => fincas.find((f) => f.id === selectedFincaId), [fincas, selectedFincaId])

  const fincaLotes = useMemo(
    () => (selectedFincaId ? lotes.filter((l) => l.fincaId === selectedFincaId) : []),
    [lotes, selectedFincaId],
  )

  const fincaValvulas = useMemo(
    () => (selectedFincaId ? valvulas.filter((v) => v.fincaId === selectedFincaId) : []),
    [valvulas, selectedFincaId],
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
      map.setCenter(selectedFinca.mapCoordinates)
      map.setZoom(selectedFinca.mapCoordinates.zoom)

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
          ">${lote.name}</div>`,
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
          ">${lote.name}</div>`)
        })

        polygon.addListener("click", () => {
          try {
            const infoWindow = new window.google.maps.InfoWindow({
              content: `<div class="p-2"><strong>${lote.name}</strong><br/>Área: ${lote.area} Ha<br/>Cultivo: ${lote.cultivo}</div>`,
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
          if (valvula.status === "maintenance") return "#ef4444" // red
          if (valvula.isOpen) return "#3b82f6" // blue
          return "#6b7280" // gray
        }

        const markerIcon = valvula.isOpen
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
          position: valvula.coordinates,
          map: map,
          title: valvula.name,
          icon: markerIcon,
        })

        if (valvula.isOpen) {
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
              <h3 class="font-semibold">${valvula.name}</h3>
              <p class="text-sm text-gray-600">Device: ${valvula.deviceId}</p>
              <p class="text-sm">Estado: ${valvula.status === "maintenance" ? "Mantenimiento" : valvula.isOpen ? "🚿 Regando" : "⏸️ Detenida"}</p>
              <p class="text-sm">Flujo: ${valvula.flowRate.toFixed(1)} L/min</p>
              <p class="text-xs text-gray-500">Última actividad: ${valvula.lastActivity.toLocaleTimeString()}</p>
            </div>
          `,
        })

        marker.addListener("click", () => {
          try {
            setSelectedValvula(valvula.id)
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

  const activeValvulas = fincaValvulas.filter((v) => v.isOpen)
  const totalFlow = activeValvulas.reduce((sum, v) => sum + v.flowRate, 0)
  const maintenanceValvulas = fincaValvulas.filter((v) => v.status === "maintenance")

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[rgba(28,53,45,1)]">Monitoreo Avanzado</h1>
          <p className="text-muted-foreground">Supervisión en tiempo real de todas las fincas</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={isAutoRefresh} onCheckedChange={setIsAutoRefresh} />
            <span className="text-sm">Auto-actualizar</span>
          </div>
          <Button className="text-black" variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Selector de finca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Seleccionar Finca
          </CardTitle>
          <CardDescription>Elige una finca para ver su información detallada</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedFincaId} onValueChange={setSelectedFincaId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona una finca para monitorear" />
            </SelectTrigger>
            <SelectContent>
              {fincas.map((finca) => {
                const fincaValvulasCount = valvulas.filter((v) => v.fincaId === finca.id).length
                const activeFincaValvulas = valvulas.filter((v) => v.fincaId === finca.id && v.isOpen).length

                return (
                  <SelectItem key={finca.id} value={finca.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{finca.name}</span>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant="outline" className="text-xs">
                          {fincaValvulasCount} válvulas
                        </Badge>
                        {activeFincaValvulas > 0 && (
                          <Badge variant="default" className="text-xs">
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
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lotes</CardTitle>
                <Layers className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{fincaLotes.length}</div>
                <p className="text-xs text-muted-foreground">
                  {fincaLotes.reduce((sum, l) => sum + l.area, 0).toFixed(1)} Ha total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Válvulas Activas</CardTitle>
                <Activity className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{activeValvulas.length}</div>
                <p className="text-xs text-muted-foreground">de {fincaValvulas.length} válvulas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Flujo Total</CardTitle>
                <Droplets className="h-4 w-4 text-cyan-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-cyan-600">{totalFlow.toFixed(1)}</div>
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

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Mapa principal */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Mapa de {selectedFinca.name}</CardTitle>
                  <CardDescription>{selectedFinca.location} - Vista satelital con lotes y válvulas</CardDescription>
                </CardHeader>
                <CardContent>
                  <GoogleMap
                    center={selectedFinca.mapCoordinates}
                    zoom={selectedFinca.mapCoordinates.zoom}
                    height="500px"
                    onMapLoad={handleMapLoad}
                  />

                  {/* Leyenda */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Leyenda</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span>Válvula Regando</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                        <span>Válvula Inactiva</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span>Mantenimiento</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-2 bg-green-200 border border-green-500"></div>
                        <span>Lotes</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Panel de información */}
            <div className="space-y-4">
              {/* Información de la finca */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información de la Finca</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">Nombre:</p>
                      <p className="text-sm text-muted-foreground">{selectedFinca.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Ubicación:</p>
                      <p className="text-sm text-muted-foreground">{selectedFinca.location}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Área Total:</p>
                      <p className="text-sm text-muted-foreground">{selectedFinca.area} Ha</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Coordenadas:</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedFinca.mapCoordinates.lat.toFixed(4)}, {selectedFinca.mapCoordinates.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Válvulas activas */}
              <Card>
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
                            onClick={() => setSelectedValvula(valvula.id)}
                          >
                            <div>
                              <p className="text-sm font-medium">{valvula.name}</p>
                              <p className="text-xs text-muted-foreground">{lote?.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-blue-600">{valvula.flowRate.toFixed(1)} L/min</p>
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
              <Card>
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
                            <p className="text-sm font-medium">{valvula.name}</p>
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

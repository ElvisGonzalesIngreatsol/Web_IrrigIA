"use client"

import type React from "react"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { GoogleMap } from "./google-map"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { LoteCoordinate } from "@/types"
import {
  MapPin,
  Trash2,
  RotateCcw,
  Info,
  Navigation,
  Edit,
  Eye,
  Plus,
  Upload,
  Download,
  FileSpreadsheet,
} from "lucide-react"
import { useNotifications } from "./notification-system"

interface LoteMapEditorProps {
  center: { lat: number; lng: number }
  zoom: number
  coordinates: LoteCoordinate[]
  onCoordinatesChange: (coordinates: LoteCoordinate[]) => void
  readonly?: boolean
  title?: string
  fincaBounds?: LoteCoordinate[]
  isLote?: boolean
}

export function LoteMapEditor({
  center,
  zoom,
  coordinates,
  onCoordinatesChange,
  readonly = false,
  title = "Editor de Polígono",
  fincaBounds,
  isLote = false,
}: LoteMapEditorProps) {
  const [map, setMap] = useState<any>(null)
  const [polygon, setPolygon] = useState<any>(null)
  const [markers, setMarkers] = useState<any[]>([])
  const [showSatellite, setShowSatellite] = useState(true)
  const [isAddingPoint, setIsAddingPoint] = useState(false)
  const [fincaPolygon, setFincaPolygon] = useState<any>(null)
  const [currentZoom, setCurrentZoom] = useState(zoom)
  const [mapCenter, setMapCenter] = useState(center)
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    lat: number
    lng: number
  }>({ visible: false, x: 0, y: 0, lat: 0, lng: 0 })

  const { addNotification } = useNotifications()

  // Use refs to prevent infinite loops
  const coordinatesRef = useRef<LoteCoordinate[]>(coordinates)
  const fincaBoundsRef = useRef<LoteCoordinate[] | undefined>(fincaBounds)
  const mapLoadedRef = useRef(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update refs when props change
  useEffect(() => {
    coordinatesRef.current = coordinates
  }, [coordinates])

  useEffect(() => {
    fincaBoundsRef.current = fincaBounds
  }, [fincaBounds])

  // Memoize the map load handler
  const handleMapLoad = useCallback(
    (mapInstance: any) => {
      if (mapLoadedRef.current) return

      setMap(mapInstance)
      setCurrentZoom(zoom)
      setMapCenter(center)
      mapLoadedRef.current = true

      if (window.google?.maps) {
        mapInstance.setOptions({
          gestureHandling: "greedy", // Permite scroll más fluido sin necesidad de Ctrl
          keyboardShortcuts: true,
          scrollwheel: true,
          disableDoubleClickZoom: false,
          draggable: true,
          optimized: true,
          maxZoom: 22,
          minZoom: 8,
          panControl: true,
          panControlOptions: {
            position: window.google.maps.ControlPosition.TOP_LEFT,
          },
          clickableIcons: false,
          disableDefaultUI: false,
          zoomControlOptions: {
            style: window.google.maps.ZoomControlStyle.LARGE,
          },
          restriction: null, // Sin restricciones de área para movimiento más libre
        })

        // Agregar listeners una sola vez
        mapInstance.addListener("zoom_changed", () => {
          const newZoom = mapInstance.getZoom()
          if (newZoom && newZoom !== currentZoom) {
            setCurrentZoom(newZoom)
          }
        })

        mapInstance.addListener("center_changed", () => {
          const newCenter = mapInstance.getCenter()
          if (newCenter) {
            const lat = newCenter.lat()
            const lng = newCenter.lng()
            setMapCenter((prev) => {
              if (Math.abs(prev.lat - lat) > 0.0001 || Math.abs(prev.lng - lng) > 0.0001) {
                return { lat, lng }
              }
              return prev
            })
          }
        })

        // Agregar listener para click derecho
        mapInstance.addListener("rightclick", (event: any) => {
          if (readonly || !event.latLng) return

          const lat = event.latLng.lat()
          const lng = event.latLng.lng()

          // Obtener posición del pixel en el mapa
          const projection = mapInstance.getProjection()
          const bounds = mapInstance.getBounds()
          const ne = bounds.getNorthEast()
          const sw = bounds.getSouthWest()
          const topRight = projection.fromLatLngToPoint(ne)
          const bottomLeft = projection.fromLatLngToPoint(sw)
          const scale = Math.pow(2, mapInstance.getZoom())
          const worldPoint = projection.fromLatLngToPoint(event.latLng)
          const pixelOffset = new window.google.maps.Point(
            Math.floor((worldPoint.x - bottomLeft.x) * scale),
            Math.floor((worldPoint.y - topRight.y) * scale),
          )

          setContextMenu({
            visible: true,
            x: pixelOffset.x,
            y: pixelOffset.y,
            lat,
            lng,
          })
        })

        // Cerrar menú contextual con click normal
        mapInstance.addListener("click", () => {
          setContextMenu((prev) => ({ ...prev, visible: false }))
        })
      }
    },
    [zoom, center, currentZoom, readonly],
  )

  // Manejar clicks en el mapa cuando está en modo agregar punto
  const handleMapClick = useCallback(
    (event: any) => {
      if (readonly || !event.latLng || !isAddingPoint) return

      const newCoordinate = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      }

      // Validar que el punto esté dentro de la finca si se proporcionan límites
      if (fincaBoundsRef.current && fincaBoundsRef.current.length >= 3) {
        const isInside = isPointInPolygon(newCoordinate, fincaBoundsRef.current)
        if (!isInside) {
          addNotification({
            type: "error",
            title: "Punto fuera de límites",
            message: "El punto debe estar dentro de los límites de la finca",
          })
          return
        }
      }

      const newCoordinates = [...coordinatesRef.current, newCoordinate]
      onCoordinatesChange(newCoordinates)

      addNotification({
        type: "success",
        title: "Punto agregado",
        message: `Coordenada: ${newCoordinate.lat.toFixed(6)}, ${newCoordinate.lng.toFixed(6)}`,
      })
    },
    [readonly, isAddingPoint, onCoordinatesChange, addNotification],
  )

  // Función para verificar si un punto está dentro de un polígono
  const isPointInPolygon = useCallback((point: LoteCoordinate, polygon: LoteCoordinate[]): boolean => {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (
        polygon[i].lng > point.lng !== polygon[j].lng > point.lng &&
        point.lat <
          ((polygon[j].lat - polygon[i].lat) * (point.lng - polygon[i].lng)) / (polygon[j].lng - polygon[i].lng) +
            polygon[i].lat
      ) {
        inside = !inside
      }
    }
    return inside
  }, [])

  const addPointFromContext = useCallback(
    (lat: number, lng: number) => {
      const newCoordinate = { lat, lng }

      // Validar que el punto esté dentro de la finca si se proporcionan límites
      if (fincaBoundsRef.current && fincaBoundsRef.current.length >= 3) {
        const isInside = isPointInPolygon(newCoordinate, fincaBoundsRef.current)
        if (!isInside) {
          addNotification({
            type: "error",
            title: "Punto fuera de límites",
            message: "El punto debe estar dentro de los límites de la finca",
          })
          setContextMenu((prev) => ({ ...prev, visible: false }))
          return
        }
      }

      const newCoordinates = [...coordinatesRef.current, newCoordinate]
      onCoordinatesChange(newCoordinates)
      setContextMenu((prev) => ({ ...prev, visible: false }))

      addNotification({
        type: "success",
        title: "Punto agregado",
        message: `Coordenada: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      })
    },
    [onCoordinatesChange, addNotification, isPointInPolygon],
  )

  const removeNearestPoint = useCallback(
    (lat: number, lng: number) => {
      if (coordinatesRef.current.length === 0) return

      // Encontrar el punto más cercano
      let nearestIndex = 0
      let minDistance = Number.MAX_VALUE

      coordinatesRef.current.forEach((coord, index) => {
        const distance = Math.sqrt(Math.pow(coord.lat - lat, 2) + Math.pow(coord.lng - lng, 2))
        if (distance < minDistance) {
          minDistance = distance
          nearestIndex = index
        }
      })

      const newCoordinates = coordinatesRef.current.filter((_, index) => index !== nearestIndex)
      onCoordinatesChange(newCoordinates)
      setContextMenu((prev) => ({ ...prev, visible: false }))

      addNotification({
        type: "info",
        title: "Punto eliminado",
        message: `Punto más cercano eliminado`,
      })
    },
    [onCoordinatesChange, addNotification],
  )

  const clearCoordinates = useCallback(() => {
    onCoordinatesChange([])
    setIsAddingPoint(false)
    addNotification({
      type: "warning",
      title: "Puntos eliminados",
      message: "Todos los puntos han sido eliminados",
    })
  }, [onCoordinatesChange, addNotification])

  const removeLastPoint = useCallback(() => {
    if (coordinatesRef.current.length > 0) {
      const newCoordinates = coordinatesRef.current.slice(0, -1)
      onCoordinatesChange(newCoordinates)
      addNotification({
        type: "info",
        title: "Punto eliminado",
        message: "Último punto eliminado",
      })
    }
  }, [onCoordinatesChange, addNotification])

  const removePoint = useCallback(
    (index: number) => {
      const newCoordinates = coordinatesRef.current.filter((_, i) => i !== index)
      onCoordinatesChange(newCoordinates)
      addNotification({
        type: "info",
        title: "Punto eliminado",
        message: `Punto ${index + 1} eliminado`,
      })
    },
    [onCoordinatesChange, addNotification],
  )

  // Centrar mapa en las coordenadas actuales
  const centerMap = useCallback(() => {
    if (!map || !window.google?.maps) return

    if (coordinatesRef.current.length > 0) {
      const bounds = new window.google.maps.LatLngBounds()
      coordinatesRef.current.forEach((coord) => bounds.extend(coord))

      // Ajustar con padding para mejor visualización
      map.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50,
      })

      // Asegurar zoom apropiado después del ajuste
      setTimeout(() => {
        const currentZoom = map.getZoom()
        if (currentZoom > 20) map.setZoom(20)
        if (currentZoom < 10) map.setZoom(15)
      }, 200)
    } else {
      map.setCenter(center)
      map.setZoom(zoom)
    }
  }, [map, center, zoom])

  // Mostrar polígono de la finca como referencia
  useEffect(() => {
    if (!map || !fincaBounds || fincaBounds.length < 3 || !window.google?.maps) return

    // Limpiar polígono anterior de la finca
    if (fincaPolygon) {
      fincaPolygon.setMap(null)
    }

    // Crear polígono de la finca como referencia (COLOR VERDE PARA FINCA)
    const newFincaPolygon = new window.google.maps.Polygon({
      paths: fincaBounds,
      strokeColor: "#10b981", // Verde para finca
      strokeOpacity: 0.8,
      strokeWeight: 3,
      fillColor: "#10b981",
      fillOpacity: 0.15,
      map: map,
      clickable: false,
    })

    setFincaPolygon(newFincaPolygon)

    return () => {
      if (newFincaPolygon) {
        newFincaPolygon.setMap(null)
      }
    }
  }, [map, fincaBounds])

  // Update polygon and markers when coordinates change
  useEffect(() => {
    if (!map || !window.google?.maps) return

    // Clear existing markers
    markers.forEach((marker) => marker.setMap(null))
    setMarkers([])

    // Clear existing polygon
    if (polygon) {
      polygon.setMap(null)
    }

    if (coordinates.length === 0) return

    // Create new markers
    const newMarkers = coordinates.map((coord, index) => {
      const marker = new window.google.maps.Marker({
        position: coord,
        map: map,
        title: `Punto ${index + 1}`,
        label: {
          text: `${index + 1}`,
          color: "white",
          fontWeight: "bold",
        },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: readonly ? "#6b7280" : isLote ? "#f59e0b" : "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
        draggable: !readonly,
      })

      if (!readonly) {
        marker.addListener("dragend", (event: any) => {
          if (event.latLng) {
            const newCoordinate = {
              lat: event.latLng.lat(),
              lng: event.latLng.lng(),
            }

            // Validar que el punto arrastrado esté dentro de la finca
            if (fincaBoundsRef.current && fincaBoundsRef.current.length >= 3) {
              const isInside = isPointInPolygon(newCoordinate, fincaBoundsRef.current)
              if (!isInside) {
                addNotification({
                  type: "error",
                  title: "Punto fuera de límites",
                  message: "El punto debe estar dentro de los límites de la finca",
                })
                marker.setPosition(coord) // Revertir posición
                return
              }
            }

            const newCoordinates = [...coordinates]
            newCoordinates[index] = newCoordinate
            onCoordinatesChange(newCoordinates)
          }
        })

        // Agregar click derecho para eliminar punto
        marker.addListener("rightclick", () => {
          if (coordinates.length > 3) {
            removePoint(index)
          } else {
            addNotification({
              type: "warning",
              title: "Mínimo de puntos",
              message: "Necesitas al menos 3 puntos para formar un polígono",
            })
          }
        })
      }

      return marker
    })

    setMarkers(newMarkers)

    // Create polygon if we have at least 3 points
    if (coordinates.length >= 3) {
      const polygonColor = isLote ? "#f59e0b" : "#2563eb"

      const newPolygon = new window.google.maps.Polygon({
        paths: coordinates,
        strokeColor: readonly ? "#6b7280" : polygonColor,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: readonly ? "#6b7280" : polygonColor,
        fillOpacity: isLote ? 0.25 : 0.2,
        map: map,
        clickable: false,
      })

      setPolygon(newPolygon)
    }
  }, [map, coordinates, readonly, isLote, removePoint, onCoordinatesChange, isPointInPolygon, addNotification])

  const calculateArea = useCallback(() => {
    if (coordinates.length < 3 || !window.google?.maps) return 0

    if (!window.google.maps.geometry?.spherical) {
      console.warn("Google Maps Geometry library not loaded")
      return 0
    }

    const polygon = new window.google.maps.Polygon({ paths: coordinates })
    const area = window.google.maps.geometry.spherical.computeArea(polygon.getPath())
    return area / 10000
  }, [coordinates])

  const area = useMemo(() => calculateArea(), [calculateArea])

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const fileExtension = file.name.split(".").pop()?.toLowerCase()

      if (!["xlsx", "csv"].includes(fileExtension || "")) {
        addNotification({
          type: "error",
          title: "Formato no válido",
          message: "Solo se permiten archivos XLSX o CSV",
        })
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          let coordinates: LoteCoordinate[] = []

          if (fileExtension === "csv") {
            // Procesar archivo CSV
            const lines = text.split("\n").filter((line) => line.trim())
            const headers = lines[0]
              .toLowerCase()
              .split(",")
              .map((h) => h.trim())

            // Buscar columnas de latitud y longitud
            const latIndex = headers.findIndex((h) => h.includes("lat") || h.includes("latitud"))
            const lngIndex = headers.findIndex((h) => h.includes("lng") || h.includes("longitud") || h.includes("lon"))

            if (latIndex === -1 || lngIndex === -1) {
              throw new Error("No se encontraron columnas de latitud y longitud")
            }

            // Procesar datos (saltar header)
            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(",").map((v) => v.trim())
              const lat = Number.parseFloat(values[latIndex])
              const lng = Number.parseFloat(values[lngIndex])

              if (!isNaN(lat) && !isNaN(lng)) {
                coordinates.push({ lat, lng })
              }
            }
          } else if (fileExtension === "xlsx") {
            // Para XLSX necesitaríamos una librería como xlsx, por ahora mostrar mensaje
            addNotification({
              type: "info",
              title: "Formato XLSX",
              message: "Por favor, guarda el archivo como CSV para procesarlo",
            })
            return
          }

          if (coordinates.length === 0) {
            throw new Error("No se encontraron coordenadas válidas en el archivo")
          }

          if (coordinates.length >= 3) {
            // Calculate centroid
            const centroid = coordinates.reduce(
              (acc, coord) => ({
                lat: acc.lat + coord.lat / coordinates.length,
                lng: acc.lng + coord.lng / coordinates.length,
              }),
              { lat: 0, lng: 0 },
            )

            // Sort points by angle from centroid to create proper polygon
            coordinates.sort((a, b) => {
              const angleA = Math.atan2(a.lat - centroid.lat, a.lng - centroid.lng)
              const angleB = Math.atan2(b.lat - centroid.lat, b.lng - centroid.lng)
              return angleA - angleB
            })

            addNotification({
              type: "info",
              title: "Puntos ordenados",
              message: "Los puntos han sido ordenados automáticamente para formar un polígono válido",
            })
          }

          // Validar que los puntos estén dentro de la finca si se proporcionan límites
          if (fincaBoundsRef.current && fincaBoundsRef.current.length >= 3) {
            const invalidPoints = coordinates.filter((coord) => !isPointInPolygon(coord, fincaBoundsRef.current!))
            if (invalidPoints.length > 0) {
              addNotification({
                type: "warning",
                title: "Puntos fuera de límites",
                message: `${invalidPoints.length} puntos están fuera de los límites de la finca y serán omitidos`,
              })
              coordinates = coordinates.filter((coord) => isPointInPolygon(coord, fincaBoundsRef.current!))
            }
          }

          if (coordinates.length < 3) {
            throw new Error("Se necesitan al menos 3 puntos válidos para formar un polígono")
          }

          // Actualizar coordenadas
          onCoordinatesChange(coordinates)

          setTimeout(() => {
            if (map && coordinates.length > 0) {
              const bounds = new window.google.maps.LatLngBounds()
              coordinates.forEach((coord) => bounds.extend(coord))

              // Ajustar vista con padding para mejor visualización
              map.fitBounds(bounds, {
                top: 80,
                right: 80,
                bottom: 80,
                left: 80,
              })

              // Asegurar zoom apropiado después del ajuste
              setTimeout(() => {
                const currentZoom = map.getZoom()
                if (currentZoom > 20) map.setZoom(20)
                if (currentZoom < 12) map.setZoom(15)
              }, 300)

              addNotification({
                type: "success",
                title: "Navegación automática",
                message: "El mapa se ha centrado en los puntos cargados",
              })
            }
          }, 500)

          addNotification({
            type: "success",
            title: "Archivo procesado",
            message: `${coordinates.length} puntos cargados y ordenados correctamente desde ${file.name}`,
          })
        } catch (error) {
          console.error("Error procesando archivo:", error)
          addNotification({
            type: "error",
            title: "Error al procesar archivo",
            message: error instanceof Error ? error.message : "Error desconocido al procesar el archivo",
          })
        }
      }

      reader.onerror = () => {
        addNotification({
          type: "error",
          title: "Error de lectura",
          message: "No se pudo leer el archivo",
        })
      }

      reader.readAsText(file)

      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [addNotification, map, onCoordinatesChange, isPointInPolygon],
  )

  const handleDownloadTemplate = useCallback(
    (templateType: "finca" | "lote") => {
      const templateData =
        templateType === "finca"
          ? [
              ["Latitud", "Longitud"],
              ["9.934739", "-84.087502"],
              ["9.933891", "-84.087502"],
              ["9.933891", "-84.088734"],
              ["9.934739", "-84.088734"],
            ]
          : [
              ["Latitud", "Longitud", "Lote_Nombre"],
              ["9.934500", "-84.087800", "Lote_A"],
              ["9.934200", "-84.087800", "Lote_A"],
              ["9.934200", "-84.088200", "Lote_A"],
              ["9.934500", "-84.088200", "Lote_A"],
            ]

      // Crear CSV con BOM para mejor compatibilidad con Excel
      const csvContent = "\uFEFF" + templateData.map((row) => row.join(",")).join("\n")
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `plantilla_${templateType}_coordenadas.csv`)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }

      addNotification({
        type: "success",
        title: "Plantilla descargada",
        message: `Plantilla de ${templateType} simplificada descargada - el sistema ordenará automáticamente los puntos`,
      })
    },
    [addNotification],
  )

  return (
    <div className="space-y-4">
      {/* Controles del mapa */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center space-x-2">
            <Switch id="satellite-mode" checked={showSatellite} onCheckedChange={setShowSatellite} />
            <Label htmlFor="satellite-mode" className="text-sm">
              Vista Satelital
            </Label>
          </div>
        </div>

        {!readonly && (
          <div className="flex gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-1" />
                  Cargar Archivo
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Cargar Archivo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadTemplate("finca")}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Plantilla Finca
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadTemplate("lote")}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Descargar Plantilla Lote
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Input ref={fileInputRef} type="file" accept=".xlsx,.csv" onChange={handleFileUpload} className="hidden" />

            <Button
              onClick={() => setIsAddingPoint(!isAddingPoint)}
              variant={isAddingPoint ? "default" : "outline"}
              size="sm"
              className={isAddingPoint ? "bg-green-600 hover:bg-green-700" : ""}
            >
              <Plus className="h-4 w-4 mr-1" />
              {isAddingPoint ? "Modo Activo" : "Agregar Punto"}
            </Button>

            <Button onClick={centerMap} variant="outline" size="sm">
              <Navigation className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Centrar</span>
            </Button>
            <Button onClick={removeLastPoint} variant="outline" size="sm" disabled={coordinates.length === 0}>
              <RotateCcw className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Deshacer</span>
            </Button>
            <Button onClick={clearCoordinates} variant="outline" size="sm" disabled={coordinates.length === 0}>
              <Trash2 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Limpiar</span>
            </Button>
          </div>
        )}
      </div>

      {/* Indicador de modo agregar punto */}
      {!readonly && isAddingPoint && (
        <Alert className="bg-green-50 border-green-200">
          <MapPin className="h-4 w-4" />
          <AlertDescription className="text-green-800">
            <strong>Modo Agregar Punto Activo:</strong> Haz clic en cualquier lugar del mapa para agregar puntos. El
            modo permanecerá activo hasta que lo desactives.
          </AlertDescription>
        </Alert>
      )}

      {/* Mapa */}
      <div className="w-full relative">
        <GoogleMap
          center={mapCenter}
          zoom={currentZoom}
          height="400px"
          onMapLoad={handleMapLoad}
          onMapClick={handleMapClick}
          showSatellite={showSatellite}
        />

        {/* Menú contextual */}
        {contextMenu.visible && !readonly && (
          <div
            className="absolute bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
          >
            <button
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
              onClick={() => addPointFromContext(contextMenu.lat, contextMenu.lng)}
            >
              <Plus className="h-4 w-4 text-green-600" />
              Agregar Punto Aquí
            </button>
            {coordinates.length > 0 && (
              <button
                className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
                onClick={() => removeNearestPoint(contextMenu.lat, contextMenu.lng)}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
                Eliminar Punto Cercano
              </button>
            )}
          </div>
        )}
      </div>

      {/* Información del polígono */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
            {title}
            {readonly ? (
              <Badge variant="secondary" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                Solo Vista
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                <Edit className="h-3 w-3 mr-1" />
                Editable
              </Badge>
            )}
            {isLote && (
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                Lote
              </Badge>
            )}
            {!isLote && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                Finca
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Puntos definidos:</p>
              <Badge variant="outline" className="text-sm sm:text-lg px-2 sm:px-3 py-1">
                {coordinates.length} puntos
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Área calculada:</p>
              <Badge variant="outline" className="text-sm sm:text-lg px-2 sm:px-3 py-1">
                {area.toFixed(2)} Ha
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Estado:</p>
              <Badge
                variant={coordinates.length >= 3 ? "default" : "secondary"}
                className="text-sm sm:text-lg px-2 sm:px-3 py-1"
              >
                {coordinates.length >= 3 ? "Válido" : "Incompleto"}
              </Badge>
            </div>
          </div>

          {/* Leyenda de colores */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Leyenda de Colores:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {fincaBounds && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-green-500 border border-green-600 rounded"></div>
                  <span>Límites de la Finca</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-blue-500 border border-blue-600 rounded"></div>
                <span>Polígono de Finca</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-3 bg-orange-500 border border-orange-600 rounded"></div>
                <span>Polígono de Lote</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full border border-white"></div>
                <span>Puntos Editables</span>
              </div>
            </div>
          </div>

          {/* Lista de coordenadas */}
          {coordinates.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Coordenadas:</p>
              <div className="max-h-32 overflow-y-auto bg-gray-50 rounded p-2">
                {coordinates.map((coord, index) => (
                  <div key={index} className="flex items-center justify-between text-xs py-1">
                    <span className="truncate mr-2">
                      Punto {index + 1}: {coord.lat.toFixed(6)}, {coord.lng.toFixed(6)}
                    </span>
                    {!readonly && coordinates.length > 3 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removePoint(index)}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 flex-shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instrucciones */}
          {!readonly && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Instrucciones:</strong>
                <ul className="mt-2 text-sm space-y-1">
                  <li>• Activa "Agregar Punto" y haz clic en el mapa para agregar múltiples puntos</li>
                  <li>• Click derecho en el mapa para mostrar menú contextual</li>
                  <li>• Arrastra los puntos para ajustar la forma</li>
                  <li>• Click derecho en un punto para eliminarlo</li>
                  <li>• Necesitas mínimo 3 puntos para formar un polígono</li>
                  {fincaBounds && <li>• Los puntos deben estar dentro de los límites de la finca (área verde)</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {fincaBounds && (
            <Alert className="mt-2">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                El área <strong className="text-green-600">verde</strong> muestra los límites de la finca. Todos los
                puntos del lote deben estar dentro de esta área.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

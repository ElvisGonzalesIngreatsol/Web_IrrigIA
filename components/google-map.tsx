"use client"

import { useEffect, useRef, useState, useMemo } from "react"

interface GoogleMapProps {
  center: { lat: number; lng: number }
  zoom: number
  fincas?: any[]
  markers?: Array<{
    position: { lat: number; lng: number }
    title: string
    type: "finca" | "valve" | "sensor"
    status?: "active" | "inactive"
  }>
  onMapLoad?: (map: any) => void
  onMapClick?: (event: any) => void
  mapTypeId?: string
  focusLocation?: { lat: number; lng: number } | null
  selectedFinca?: string | null
  onFincaSelect?: (fincaId: string | null) => void
  height?: string
  showSatellite?: boolean
}

declare global {
  interface Window {
    google: any
    initGoogleMap: () => void
  }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
const GOOGLE_MAPS_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID

const validateCoordinate = (coord: any): { lat: number; lng: number } | null => {
  if (!coord) return null

  let lat: number, lng: number

  // Handle different coordinate formats
  if (typeof coord === "object") {
    lat = typeof coord.lat === "string" ? Number.parseFloat(coord.lat) : coord.lat
    lng = typeof coord.lng === "string" ? Number.parseFloat(coord.lng) : coord.lng

    // Also check for latitude/longitude properties
    if (isNaN(lat) && coord.latitude !== undefined) {
      lat = typeof coord.latitude === "string" ? Number.parseFloat(coord.latitude) : coord.latitude
    }
    if (isNaN(lng) && coord.longitude !== undefined) {
      lng = typeof coord.longitude === "string" ? Number.parseFloat(coord.longitude) : coord.longitude
    }
  } else {
    return null
  }

  // Validate that coordinates are finite numbers
  if (!isFinite(lat) || !isFinite(lng) || isNaN(lat) || isNaN(lng)) {
    return null
  }

  // Validate coordinate ranges
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null
  }

  return { lat, lng }
}

const validateCoordinateArray = (coordinates: any[]): { lat: number; lng: number }[] => {
  if (!Array.isArray(coordinates)) return []

  return coordinates
    .map((coord) => validateCoordinate(coord))
    .filter((coord): coord is { lat: number; lng: number } => coord !== null)
}

// Default center for Costa Rica (safe fallback)
const DEFAULT_CENTER = { lat: 9.934739, lng: -84.087502 }

export function GoogleMap({
  center,
  zoom,
  fincas = [],
  markers = [],
  onMapLoad,
  onMapClick,
  onFincaSelect,
  height = "100%",
  showSatellite = true,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [map, setMap] = useState<any>(null)
  const markersRef = useRef<any[]>([])
  const polygonsRef = useRef<any[]>([])
  const labelsRef = useRef<any[]>([])

  const validCenter = useMemo(() => {
    const validatedCenter = validateCoordinate(center)
    if (validatedCenter) {
      console.log("[v0] Using provided center:", validatedCenter)
      return validatedCenter
    }
    console.log("[v0] Invalid center provided, using default:", DEFAULT_CENTER)
    return DEFAULT_CENTER
  }, [center])

  const validZoom = useMemo(() => {
    const zoomNum = typeof zoom === "string" ? Number.parseInt(zoom) : zoom
    if (isFinite(zoomNum) && zoomNum >= 1 && zoomNum <= 22) {
      return zoomNum
    }
    console.log("[v0] Invalid zoom provided, using default: 15")
    return 15
  }, [zoom])

  const loadGoogleMapsScript = () => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error("Google Maps API key not found in environment variables")
      setErrorMessage("API key de Google Maps no configurada. Verifica las variables de entorno.")
      setIsError(true)
      setIsLoaded(true)
      return
    }

    if (window.google?.maps) {
      initializeMapWithRetry()
      return
    }

    const existingScript = document.querySelector("script.gmaps")
    if (existingScript) {
      existingScript.remove()
    }

    console.log("Loading Google Maps with API Key:", GOOGLE_MAPS_API_KEY.substring(0, 10) + "...")

    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=initGoogleMap&v=weekly`
    script.async = true
    script.defer = true
    script.className = "gmaps"

    window.initGoogleMap = () => {
      console.log("Google Maps loaded successfully via callback")
      initializeMapWithRetry()
    }

    script.onerror = (error) => {
      console.error("Failed to load Google Maps:", error)
      setErrorMessage("Error al cargar Google Maps. Verifica la API key y la conexión.")
      setIsError(true)
      setIsLoaded(true)
    }

    document.head.appendChild(script)

    setTimeout(() => {
      if (!window.google?.maps && !isLoaded) {
        console.error("Google Maps loading timeout")
        setErrorMessage("Tiempo de espera agotado. Verifica tu conexión a internet.")
        setIsError(true)
        setIsLoaded(true)
      }
    }, 10000)
  }

  const initializeMapWithRetry = (retryCount = 0) => {
    const maxRetries = 10
    const retryDelay = 100

    if (!mapRef.current) {
      if (retryCount < maxRetries) {
        console.log(`Map container not ready, retrying... (${retryCount + 1}/${maxRetries})`)
        setTimeout(() => initializeMapWithRetry(retryCount + 1), retryDelay)
        return
      } else {
        console.error("Map container not found after maximum retries")
        setErrorMessage("Contenedor del mapa no disponible")
        setIsError(true)
        setIsLoaded(true)
        return
      }
    }

    initializeMap()
  }

  const initializeMap = () => {
    if (!window.google?.maps) {
      console.error("Google Maps API not available")
      setErrorMessage("API de Google Maps no disponible")
      setIsError(true)
      setIsLoaded(true)
      return
    }

    try {
      console.log("[v0] Initializing map with validated center:", validCenter, "zoom:", validZoom)

      const mapOptions = {
        center: validCenter,
        zoom: validZoom,
        mapId: GOOGLE_MAPS_MAP_ID,
        mapTypeId: showSatellite ? "hybrid" : "roadmap",
        gestureHandling: "cooperative",
        zoomControl: true,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [],
      }

      const mapInstance = new window.google.maps.Map(mapRef.current, mapOptions)

      setMap(mapInstance)
      setIsLoaded(true)
      setIsError(false)
      onMapLoad?.(mapInstance)

      if (onMapClick) {
        mapInstance.addListener("click", onMapClick)
      }

      console.log("[v0] Map initialized successfully")
    } catch (error) {
      console.error("[v0] Error initializing map:", error)
      setErrorMessage(`Error al inicializar el mapa: ${error.message}`)
      setIsError(true)
      setIsLoaded(true)
    }
  }

  const clearMapElements = () => {
    markersRef.current.forEach((marker) => {
      try {
        marker.setMap(null)
      } catch (e) {
        console.warn("Error removing marker:", e)
      }
    })
    markersRef.current = []

    polygonsRef.current.forEach((polygon) => {
      try {
        polygon.setMap(null)
      } catch (e) {
        console.warn("Error removing polygon:", e)
      }
    })
    polygonsRef.current = []

    labelsRef.current.forEach((label) => {
      try {
        label.setMap(null)
      } catch (e) {
        console.warn("Error removing label:", e)
      }
    })
    labelsRef.current = []
  }

  const createLoteIcon = (text: string) => {
    const textWidth = text.length * 9
    const viewBoxWidth = textWidth + 10
    const viewBoxHeight = 24

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}">
          <style>
            text {
              font-family: sans-serif;
              font-size: 16px;
              font-weight: 900;
              fill: white;
              stroke: black;
              stroke-width: 2px;
              paint-order: stroke;
            }
          </style>
          <text x="50%" y="16" dominantBaseline="middle" textAnchor="middle">${text}</text>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(viewBoxWidth, viewBoxHeight),
      anchor: new window.google.maps.Point(viewBoxWidth / 2, viewBoxHeight / 2),
    }
  }

  const createFincaPolygons = () => {
    if (!map || !window.google?.maps) return

    fincas.forEach((finca) => {
      try {
        if (finca.coordinates && Array.isArray(finca.coordinates) && finca.coordinates.length > 0) {
          const validatedCoordinates = validateCoordinateArray(finca.coordinates)

          if (validatedCoordinates.length < 3) {
            console.warn("[v0] Finca has insufficient valid coordinates:", finca.name, validatedCoordinates.length)
            return
          }

          console.log("[v0] Creating finca polygon with", validatedCoordinates.length, "valid coordinates")

          const fincaPolygon = new window.google.maps.Polygon({
            paths: validatedCoordinates,
            strokeColor: "#22C55E",
            strokeOpacity: 1.0,
            strokeWeight: 3,
            fillColor: "#22C55E",
            fillOpacity: 0.0,
            map: map,
          })

          polygonsRef.current.push(fincaPolygon)

          if (fincas.length === 1) {
            const bounds = new window.google.maps.LatLngBounds()
            validatedCoordinates.forEach((coord) => bounds.extend(coord))
            map.fitBounds(bounds)
            setTimeout(() => {
              const currentZoom = map.getZoom()
              if (currentZoom > 18) map.setZoom(18)
              if (currentZoom < 12) map.setZoom(12)
            }, 100)
          }

          const fincaInfoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 12px; font-family: system-ui; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937; font-size: 16px;">${finca.name}</h3>
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">📍 ${finca.location}</p>
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #6b7280;">📏 Área: ${finca.area} Ha</p>
                <p style="margin: 0; font-size: 13px; color: #6b7280;">🍌 Cultivo: Banano</p>
              </div>
            `,
          })

          fincaPolygon.addListener("click", (event) => {
            fincaInfoWindow.setPosition(event.latLng)
            fincaInfoWindow.open(map)
            onFincaSelect?.(finca.id)
          })
        }

        if (finca.lotes && finca.lotes.length > 0) {
          finca.lotes.forEach((lote) => {
            if (lote.coordinates && Array.isArray(lote.coordinates) && lote.coordinates.length > 0) {
              const validatedLoteCoordinates = validateCoordinateArray(lote.coordinates)

              if (validatedLoteCoordinates.length < 3) {
                console.warn(
                  "[v0] Lote has insufficient valid coordinates:",
                  lote.name,
                  validatedLoteCoordinates.length,
                )
                return
              }

              const getLoteStatus = (lote) => {
                if (!lote.valvulas || lote.valvulas.length === 0) {
                  return { status: "no-valves", color: "#9CA3AF", opacity: 0.3 }
                }

                const activeValves = lote.valvulas.filter((v) => v.isOpen && v.status !== "maintenance")
                const maintenanceValves = lote.valvulas.filter((v) => v.status === "maintenance")

                if (activeValves.length > 0) {
                  return { status: "irrigating", color: "#3B82F6", opacity: 0.4 }
                } else if (maintenanceValves.length > 0) {
                  return { status: "maintenance", color: "#EF4444", opacity: 0.4 }
                } else {
                  const recentlyIrrigated = lote.valvulas.some((v) => {
                    const timeSinceLastActivity = Date.now() - new Date(v.lastActivity).getTime()
                    return timeSinceLastActivity < 2 * 60 * 60 * 1000
                  })

                  if (recentlyIrrigated) {
                    return { status: "irrigated", color: "#22C55E", opacity: 0.4 }
                  } else {
                    return { status: "inactive", color: "#EF4444", opacity: 0.4 }
                  }
                }
              }

              const loteStatusInfo = getLoteStatus(lote)

              const lotePolygon = new window.google.maps.Polygon({
                paths: validatedLoteCoordinates,
                strokeColor: loteStatusInfo.color,
                strokeOpacity: 1.0,
                strokeWeight: 2,
                fillColor: loteStatusInfo.color,
                fillOpacity: loteStatusInfo.opacity,
                map: map,
              })

              polygonsRef.current.push(lotePolygon)

              if (lote.centerCoordinates) {
                const validatedCenter = validateCoordinate(lote.centerCoordinates)
                if (validatedCenter) {
                  const loteMarker = new window.google.maps.Marker({
                    position: validatedCenter,
                    map: map,
                    icon: createLoteIcon(lote.name),
                  })

                  markersRef.current.push(loteMarker)
                  labelsRef.current.push(loteMarker)

                  const getStatusText = (status) => {
                    switch (status) {
                      case "irrigating":
                        return "💧 Regando Ahora"
                      case "maintenance":
                        return "🔧 En Mantenimiento"
                      case "irrigated":
                        return "✅ Recientemente Regado"
                      case "inactive":
                        return "⏸️ Inactivo"
                      case "no-valves":
                        return "❌ Sin Válvulas"
                      default:
                        return "❓ Estado Desconocido"
                    }
                  }

                  const loteInfoWindow = new window.google.maps.InfoWindow({
                    content: `
                      <div style="padding: 10px; font-family: system-ui; min-width: 200px;">
                        <h4 style="margin: 0 0 6px 0; font-weight: bold; color: #1f2937; font-size: 14px;">${lote.name}</h4>
                        <p style="margin: 0 0 3px 0; font-size: 12px; color: #6b7280;">📏 Área: ${lote.area} Ha</p>
                        <p style="margin: 0 0 3px 0; font-size: 12px; color: #6b7280;">🌱 Cultivo: ${lote.crop}</p>
                        <p style="margin: 0 0 3px 0; font-size: 12px; color: #6b7280;">💧 Válvulas: ${lote.valvulas?.length || 0}</p>
                        <p style="margin: 0; font-size: 12px; font-weight: bold; color: ${loteStatusInfo.color};">${getStatusText(loteStatusInfo.status)}</p>
                      </div>
                    `,
                  })

                  lotePolygon.addListener("click", (event) => {
                    loteInfoWindow.setPosition(event.latLng)
                    loteInfoWindow.open(map)
                  })

                  loteMarker.addListener("click", () => {
                    loteInfoWindow.setPosition(validatedCenter)
                    loteInfoWindow.open(map)
                  })
                }
              }

              if (lote.valvulas && lote.valvulas.length > 0) {
                lote.valvulas.forEach((valvula) => {
                  let vLat = valvula.latitud || valvula.coordinates?.lat || valvula.lat
                  let vLng = valvula.longitud || valvula.coordinates?.lng || valvula.lng

                  // Convert strings to numbers if needed
                  if (typeof vLat === "string") vLat = Number.parseFloat(vLat)
                  if (typeof vLng === "string") vLng = Number.parseFloat(vLng)

                  if (!isFinite(vLat) || !isFinite(vLng) || isNaN(vLat) || isNaN(vLng)) {
                    console.warn("[v0] Invalid valve coordinates:", valvula.name, vLat, vLng)
                    return
                  }

                  const valvePosition = { lat: vLat, lng: vLng }

                  const getValveColor = () => {
                    if (valvula.status === "maintenance") return "#EF4444"
                    if (valvula.isOpen) return "#3B82F6"
                    return "#6B7280"
                  }

                  const valveMarker = new window.google.maps.Marker({
                    position: valvePosition,
                    map: map,
                    title: `Válvula ${valvula.nombre || valvula.name}`,
                    icon: {
                      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="8" fill="${getValveColor()}" stroke="white" strokeWidth="2"/>
                          ${valvula.isOpen && valvula.status !== "maintenance" ? '<circle cx="12" cy="12" r="4" fill="white" opacity="0.9"><animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.5s" repeatCount="indefinite"/></circle>' : ""}
                          ${valvula.status === "maintenance" ? '<path d="M8 8l8 8M16 8l-8 8" stroke="white" strokeWidth="2" strokeLinecap="round"/>' : ""}
                        </svg>
                      `)}`,
                      scaledSize: new window.google.maps.Size(24, 24),
                      anchor: new window.google.maps.Point(12, 12),
                    },
                  })

                  markersRef.current.push(valveMarker)

                  const getValveStatusText = () => {
                    if (valvula.status === "maintenance") return "🔧 En Mantenimiento"
                    if (valvula.isOpen) return "🟢 Regando"
                    return "⚫ Inactiva"
                  }

                  const valveInfoWindow = new window.google.maps.InfoWindow({
                    content: `
                      <div style="padding: 8px; font-family: system-ui;">
                        <h4 style="margin: 0 0 4px 0; font-weight: bold; color: #1f2937;">${valvula.name}</h4>
                        <p style="margin: 0; font-size: 12px; color: #6b7280;">Estado: ${getValveStatusText()}</p>
                        <p style="margin: 0; font-size: 12px; color: #6b7280;">Caudal: ${valvula.caudal || valvula.flowRate || 0} L/min</p>
                        <p style="margin: 0; font-size: 12px; color: #6b7280;">Presión: ${valvula.presion || 0} bar</p>
                      </div>
                    `,
                  })

                  valveMarker.addListener("click", () => {
                    valveInfoWindow.open(map, valveMarker)
                  })
                })
              }
            }
          })
        }
      } catch (error) {
        console.warn("[v0] Error creating finca polygons:", error)
      }
    })
  }

  const createDirectMarkers = () => {
    if (!map || !window.google?.maps) return

    markers.forEach((markerData) => {
      try {
        const validatedPosition = validateCoordinate(markerData.position)
        if (!validatedPosition) {
          console.warn("[v0] Invalid marker position:", markerData.title, markerData.position)
          return
        }

        const marker = new window.google.maps.Marker({
          position: validatedPosition,
          map: map,
          title: markerData.title,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" fill="${markerData.status === "active" ? "#3B82F6" : "#6B7280"}" stroke="white" strokeWidth="2"/>
                ${markerData.status === "active" ? '<circle cx="12" cy="12" r="4" fill="white" opacity="0.8"><animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite"/></circle>' : ""}
              </svg>
            `)}`,
            scaledSize: new window.google.maps.Size(24, 24),
            anchor: new window.google.maps.Point(12, 12),
          },
        })

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; font-family: system-ui;">
              <h3 style="margin: 0 0 4px 0; font-weight: bold; color: #1f2937;">${markerData.title}</h3>
              <p style="margin: 0; font-size: 12px; color: #6b7280;">Estado: ${markerData.status === "active" ? "🟢 Regando" : "⚫ Inactiva"}</p>
            </div>
          `,
        })

        marker.addListener("click", () => {
          infoWindow.open(map, marker)
        })

        markersRef.current.push(marker)
      } catch (error) {
        console.warn("[v0] Error creating marker:", error)
      }
    })
  }

  useEffect(() => {
    loadGoogleMapsScript()

    return () => {
      const gmapsScript = document.querySelector("script.gmaps")
      if (gmapsScript) {
        gmapsScript.remove()
      }
      if (window.initGoogleMap) {
        delete window.initGoogleMap
      }
    }
  }, [])

  useEffect(() => {
    if (map) {
      map.setCenter(validCenter)
      map.setZoom(validZoom)
      map.setMapTypeId(showSatellite ? "hybrid" : "roadmap")
    }
  }, [map, validCenter, validZoom, showSatellite])

  useEffect(() => {
    if (map) {
      clearMapElements()
      createFincaPolygons()
      createDirectMarkers()
    }
  }, [map, fincas, markers])

  if (!isLoaded) {
    return (
      <div className="w-full relative rounded-lg overflow-hidden border border-gray-200 shadow-sm" style={{ height }}>
        <div ref={mapRef} className="w-full h-full absolute inset-0" style={{ visibility: "hidden" }} />
        <div className="w-full h-full bg-gray-50 flex items-center justify-center border-2 border-dashed border-gray-200 absolute inset-0">
          <div className="text-center p-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200 border-t-green-600 mx-auto mb-4"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              </div>
            </div>
            <p className="text-lg font-medium text-gray-700 mb-1">Cargando mapa...</p>
            <p className="text-sm text-gray-500">Conectando con Google Maps</p>
            <div className="mt-3 flex items-center justify-center space-x-1">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-green-600 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-green-600 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="w-full relative rounded-lg overflow-hidden border border-gray-200 shadow-sm" style={{ height }}>
        <div ref={mapRef} className="w-full h-full absolute inset-0" style={{ visibility: "hidden" }} />
        <div className="w-full h-full bg-red-50 flex items-center justify-center border-2 border-red-200 absolute inset-0">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error al cargar el mapa</h3>
            <p className="text-sm text-red-600 mb-2">{errorMessage || "No se pudo conectar con Google Maps"}</p>
            <p className="text-xs text-red-500 mb-4">Verifica la configuración de variables de entorno</p>
            <button
              onClick={() => {
                setIsError(false)
                setIsLoaded(false)
                setErrorMessage("")
                loadGoogleMapsScript()
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full relative rounded-lg overflow-hidden border border-gray-200 shadow-sm" style={{ height }}>
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}

export default GoogleMap

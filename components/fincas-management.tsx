"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNotifications } from "@/components/notification-system"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/table-pagination"
import { Building2, Plus, Edit, Trash2, Search, MapPin, Calendar, Layers, Eye, Loader2 } from "lucide-react"
import { LoteMapEditor } from "./lote-map-editor"
import { GoogleMap } from "./google-map"
import type { Finca, LoteCoordinate } from "@/types"
import { apiService } from "@/lib/api"
import Swal from "sweetalert2"

export function FincasManagement() {
  const [fincas, setFincas] = useState<Finca[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { addNotification } = useNotifications()
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFinca, setEditingFinca] = useState<Finca | null>(null)
  const [viewingFinca, setViewingFinca] = useState<Finca | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(6)
  const [submitting, setSubmitting] = useState(false)
  // const [isRefreshing, setIsRefreshing] = useState(false)

  const [formData, setFormData] = useState({
    nombre: "",
    location: "",
    area: 0,
    coordinates: [] as LoteCoordinate[],
    lat: 0.0,
    lng: 0.0,
    zoom: 15,
    applicationId: "",
  })

  useEffect(() => {
    fetchFincas()
  }, [])

  const fetchFincas = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("[v0] Fetching fincas from backend...")
      const result = await apiService.getFincas()
      // Normalize response: support both an array response or an object with a `data` array
      const fincasArray = Array.isArray(result)
        ? result
        : Array.isArray((result as any)?.data)
        ? (result as any).data
        : []
      setFincas(fincasArray)
      console.log("[v0] Fincas loaded successfully:", fincasArray.length)
    } catch (err) {
      console.error("[v0] Error fetching fincas:", err)
      setFincas([])
      setError(err instanceof Error ? err.message : "Error al cargar las fincas")
      addNotification({
        type: "error",
        title: "Error de conexión",
        message: "No se pudieron cargar las fincas. Verifica tu conexión al backend.",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredFincas = (Array.isArray(fincas) ? fincas : [])
    .filter(
      (finca) =>
        finca.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        finca.location?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const recentFincas = filteredFincas.slice(0, 3)
  const remainingFincas = filteredFincas.slice(3)

  const totalItems = remainingFincas.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)
  const paginatedFincas = remainingFincas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nombre || !formData.location || formData.coordinates?.length < 3) {
      addNotification({
        type: "error",
        title: "Error de validación",
        message: "Por favor completa todos los campos y define al menos 3 puntos en el mapa",
      })
      return
    }

    setSubmitting(true)
    try {
      const calculatedArea = calculatePolygonArea(formData.coordinates)
      const payload = {
        // Enviar 'name' para cumplir con la firma de apiService y mantener 'nombre' para la UI
        name: formData.nombre,
        nombre: formData.nombre,
        location: formData.location,
        area: calculatedArea,
        coordinates: formData.coordinates,
        latitude: formData.lat,
        longitude: formData.lng,
        // AGREGADO: Incluir applicationId, enviando null si está vacío
        applicationId: formData.applicationId || null, 
      }

      if (editingFinca) {
        console.log("[v0] Updating finca:", editingFinca.id)
        const updatedFinca = await apiService.updateFinca(editingFinca.id, payload)
        setFincas((prev) => prev.map((f) => (f.id === editingFinca.id ? updatedFinca : f)))
        addNotification({
          type: "success",
          title: "Finca actualizada",
          message: `${formData.nombre} ha sido actualizada correctamente`,
        })
      } else {
        console.log("[v0] Creating new finca")
        const newFinca = await apiService.createFinca(payload)
        setFincas((prev) => [newFinca, ...prev])
        addNotification({
          type: "success",
          title: "Finca creada",
          message: `${formData.nombre} ha sido creada correctamente`,
        })
      }

      resetForm()
      setIsDialogOpen(false)
    } catch (err) {
      console.error("[v0] Error saving finca:", err)
      addNotification({
        type: "error",
        title: "Error al guardar",
        message: err instanceof Error ? err.message : "Error al guardar la finca",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const calculatePolygonArea = (coordinates: LoteCoordinate[]): number => {
    if (coordinates?.length < 3) return 0

    let area = 0
    const earthRadius = 6371000 // metros

    for (let i = 0; i < coordinates?.length; i++) {
      const j = (i + 1) % coordinates.length
      const lat1 = (coordinates[i].lat * Math.PI) / 180
      const lat2 = (coordinates[j].lat * Math.PI) / 180
      const lng1 = (coordinates[i].lng * Math.PI) / 180
      const lng2 = (coordinates[j].lng * Math.PI) / 180

      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2))
    }

    area = Math.abs((area * earthRadius * earthRadius) / 2)
    return area / 10000 // convertir a hectáreas
  }

  const resetForm = () => {
    setFormData({
      nombre: "",
      location: "",
      area: 0,
      coordinates: [],
      lat: 0.0,
      lng: 0.0,
      zoom: 15,
      applicationId: "",
    })
    setEditingFinca(null)
  }

  const handleEdit = (finca: Finca) => {
    setEditingFinca(finca)
    
    let rawCoordinates = Array.isArray(finca.coordinates) ? finca.coordinates : []
    
    // CORRECCIÓN CLAVE: Mapeo defensivo para asegurar que cada objeto de coordenada tenga las claves 'lat' y 'lng'
    // Esto resuelve el problema si el backend devuelve 'latitude'/'longitude' en el array de puntos.
    const fincaCoordinates = rawCoordinates.map((c: any) => ({
        lat: c.lat || c.latitude, // Intenta obtener 'lat' o 'latitude'
        lng: c.lng || c.longitude, // Intenta obtener 'lng' o 'longitude'
    })).filter(c => c.lat !== undefined && c.lng !== undefined) as LoteCoordinate[]
    
    console.log("[v0] Coordenadas cargadas (mapeadas) para edición:", fincaCoordinates)
    
    setFormData({
      nombre: finca.nombre,
      location: finca.location ?? "",
      area: finca.area,
      // Coordenadas para centrar el mapa (ya estaba bien)
      lat: finca.latitude, 
      lng: finca.longitude,
      
      zoom: 15,
      coordinates: fincaCoordinates, // Usar las coordenadas mapeadas
      applicationId: (finca as any).applicationId ?? "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (fincaId: number) => {
    const finca = fincas.find((f) => f.id === fincaId)
    if (finca) {
      const result = await Swal.fire({
        title: "¿Estás seguro?",
        text: `¿Estás seguro de eliminar la finca ${finca.nombre}? Esto también eliminará todos sus lotes y válvulas.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#1C352D",
        cancelButtonColor: "#A6B28B",
        confirmButtonText: "Aceptar",
        cancelButtonText: "Cancelar",
        customClass: {
          popup: "rounded-lg",
          title: "text-lg font-semibold",
        },
      })

      if (result.isConfirmed) {
        try {
          console.log("[v0] Deleting finca:", fincaId)
          await apiService.deleteFinca(fincaId)
          setFincas((prev) => prev.filter((f) => f.id !== fincaId))
          addNotification({
            type: "warning",
            title: "Finca eliminada",
            message: `${finca.nombre} ha sido eliminada del sistema`,
          })
          await Swal.fire({
            title: "¡Eliminado!",
            text: "La finca ha sido eliminada correctamente",
            icon: "success",
            confirmButtonColor: "#1C352D",
          })
        } catch (err) {
          console.error("[v0] Error deleting finca:", err)
          addNotification({
            type: "error",
            title: "Error al eliminar",
            message: err instanceof Error ? err.message : "Error al eliminar la finca",
          })
        }
      }
    }
  }

  const getFincaStats = (fincaId: number) => {
    const finca = fincas.find((f) => f.id === fincaId)
    if (!finca || !finca.lotes) {
      return { lotes: 0, valvulas: 0, activeValvulas: 0 }
    }

    const totalValvulas = finca.lotes.reduce((sum, lote) => sum + (lote.valvulas?.length || 0), 0)
    const activeValvulas = finca.lotes.reduce(
      (sum, lote) => sum + (lote.valvulas?.filter((v) => (v as any).isOpen)?.length || 0),
      0,
    )

    return {
      lotes: finca.lotes.length,
      valvulas: totalValvulas,
      activeValvulas: activeValvulas,
    }
  }

  const handleViewFinca = (finca: Finca) => {
    setViewingFinca(finca)
    setIsViewDialogOpen(true)
  }

  const buildFincaWithLotes = (finca: Finca) => {
    const fincaObj = fincas.find((f) => f.id === finca.id)
    const fincaLotes = fincaObj?.lotes || []
    const fincaValvulas =
      (fincaObj?.lotes ?? []).reduce((acc, lote) => {
        return [...acc, ...(lote.valvulas || [])]
      }, [] as any[]) || []

    return {
      ...finca,
      lotes: fincaLotes.map((lote) => ({
        ...lote,
        valvulas: fincaValvulas.filter((v) => v.loteId === lote.id),
      })),
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando fincas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Building2 className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Error de conexión</h3>
            <p className="text-muted-foreground text-center mb-4">{error}</p>
            <Button onClick={fetchFincas} variant="outline">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  // const handleRefresh = async () => {
  //   setIsRefreshing(true)
  //   await fetchData()
  //   showSuccess("Actualizado", "Estado de las fincas actualizado")
  // }
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pb-2 border-b border-gray-100">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[rgba(28,53,45,1)] leading-tight">Gestión de Fincas</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Administra las fincas del sistema</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="w-full sm:w-auto shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Finca
            </Button>
            {/* <Button
              className="text-slate-700 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 shadow-sm transition-all duration-200"
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
              size="lg"
            >
              <RefreshCw className={`h-5 w-5 mr-3 ${isRefreshing ? "animate-spin" : ""}`} />
              Actualizar
            </Button> */}
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto m-4">
            <DialogHeader>
              <DialogTitle>{editingFinca ? "Editar Finca" : "Crear Nueva Finca"}</DialogTitle>
              <DialogDescription>
                {editingFinca ? "Modifica los datos de la finca" : "Completa la información de la nueva finca"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Finca *</Label>
                  <Input
                    id="name"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Finca San José"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ej: Cundinamarca, Colombia"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitud *</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.lat || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lat: Number.parseFloat(e.target.value),
                      })
                    }
                    placeholder="Ej: 4.711"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitud *</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={formData.lng}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lng: Number.parseFloat(e.target.value),
                      })
                    }
                    placeholder="Ej: -74.0721"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicationId">Aplicacion ID </Label>
                  <Input
                    id="applicationId"
                    type="number"
                    step="any"
                    value={formData.applicationId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        applicationId: e.target.value,
                      })
                    }
                    placeholder="Ej: f04e0c1f"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Definir Límites de la Finca *</Label>
                <LoteMapEditor
                  center={{ lat: formData.lat, lng: formData.lng }}
                  zoom={formData?.zoom}
                  coordinates={formData.coordinates}
                  onCoordinatesChange={(coordinates) => {
                    setFormData({ ...formData, coordinates })
                  }}
                  title="Límites de la Finca"
                  isLote={false}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingFinca ? "Actualizar Finca" : "Crear Finca"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 py-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Total Fincas</CardTitle>
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{fincas.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Total Área</CardTitle>
            <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {fincas.reduce((sum, f) => sum + f.area, 0).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Hectáreas</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Total Lotes</CardTitle>
            <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {fincas.reduce((sum, f) => sum + (f.lotes?.length || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Total Válvulas</CardTitle>
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl sm:text-2xl font-bold text-purple-600">
              {fincas.reduce(
                (sum, f) => sum + (f.lotes?.reduce((loteSum, lote) => loteSum + (lote.valvulas?.length || 0), 0) || 0),
                0,
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-base sm:text-lg text-gray-800">Buscar Fincas</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 py-3 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      {recentFincas.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              {searchTerm ? "Resultados de Búsqueda" : "Fincas Recientes"}
            </h2>
            <Badge variant="secondary" className="text-xs">
              {recentFincas.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {recentFincas.map((finca) => {
              const stats = getFincaStats(finca.id)
              return (
                <Card key={finca.id} className="hover:shadow-lg transition-all duration-200 border-gray-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base sm:text-lg truncate">{finca.nombre}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{finca.location}</span>
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {finca.area.toFixed(1)} Ha
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="text-sm font-semibold text-blue-600">{stats.lotes}</div>
                          <div className="text-xs text-blue-500 mt-1">Lotes</div>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                          <div className="text-sm font-semibold text-purple-600">{stats.valvulas}</div>
                          <div className="text-xs text-purple-500 mt-1">Válvulas</div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                          <div className="text-sm font-semibold text-green-600">{stats.activeValvulas}</div>
                          <div className="text-xs text-green-500 mt-1">Activas</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 border-t border-gray-100">
                        <Calendar className="h-3 w-3" />
                        Creada: {finca.createdAt}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(finca)} className="flex-1">
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(finca.id)}
                          className="flex-1 text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                      <div className="flex pt-1">
                        <Button variant="outline" size="sm" onClick={() => handleViewFinca(finca)} className="w-full">
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {remainingFincas.length > 0 && (
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-4 border-b border-gray-100">
            <CardTitle className="text-base sm:text-lg text-gray-800">
              Todas las Fincas ({filteredFincas.length})
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">Lista completa de fincas en el sistema</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="sm:hidden space-y-3">
              {paginatedFincas.map((finca) => {
                const stats = getFincaStats(finca.id)
                return (
                  <Card key={finca.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium truncate">{finca.nombre}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{finca.location}</span>
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {finca.area.toFixed(1)} Ha
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div className="text-xs">
                        <div className="font-semibold text-blue-600">{stats.lotes}</div>
                        <div className="text-muted-foreground">Lotes</div>
                      </div>
                      <div className="text-xs">
                        <div className="font-semibold text-purple-600">{stats.valvulas}</div>
                        <div className="text-muted-foreground">Válvulas</div>
                      </div>
                      <div className="text-xs">
                        <div className="font-semibold text-green-600">{stats.activeValvulas}</div>
                        <div className="text-muted-foreground">Activas</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(finca)} className="flex-1">
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(finca.id)}
                        className="flex-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                    <div className="flex pt-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewFinca(finca)} className="w-full">
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>

            <div className="hidden sm:block">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Finca</TableHead>
                      <TableHead>Área</TableHead>
                      <TableHead>Lotes</TableHead>
                      <TableHead>Válvulas</TableHead>
                      <TableHead>Activas</TableHead>
                      <TableHead>Creada</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFincas.map((finca) => {
                      const stats = getFincaStats(finca.id)
                      return (
                        <TableRow key={finca.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{finca.nombre}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {finca.location}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{finca.area.toFixed(1)} Ha</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{stats.lotes}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{stats.valvulas}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={stats.activeValvulas > 0 ? "default" : "secondary"}>
                              {stats.activeValvulas}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{finca.createdAt}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleEdit(finca)}>
                                <Edit className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(finca.id)}
                                className="text-red-600 hover:text-red-700 hover:border-red-300"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eliminar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewFinca(finca)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {totalItems > 0 && (
                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  startItem={startItem}
                  endItem={endItem}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista de Finca - {viewingFinca?.nombre}</DialogTitle>
            <DialogDescription>Visualización de la finca con sus lotes y límites definidos</DialogDescription>
          </DialogHeader>
          {viewingFinca && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{viewingFinca.area.toFixed(1)} Ha</div>
                  <div className="text-xs text-green-500">Área Total</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{getFincaStats(viewingFinca.id).lotes}</div>
                  <div className="text-xs text-blue-500">Lotes</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">{getFincaStats(viewingFinca.id).valvulas}</div>
                  <div className="text-xs text-purple-500">Válvulas</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-lg font-bold text-orange-600">
                    {getFincaStats(viewingFinca.id).activeValvulas}
                  </div>
                  <div className="text-xs text-orange-500">Activas</div>
                </div>
              </div>

                <div className="h-[500px] rounded-lg overflow-hidden border">
                <GoogleMap
                  center={{
                  lat: viewingFinca.latitude || -1.02492965174485,
                  lng: viewingFinca.longitude || -79.47104509239567
                  }}
                  zoom={16}
                  showSatellite={true}
                  height="500px"
                  fincas={[
                  {
                    // Normalize IDs to strings to avoid TS type mismatch (backend may return numbers)
                    ...viewingFinca,
                    id: String(viewingFinca.id),
                    coordinates: viewingFinca.coordinates || [],
                    lotes: (viewingFinca.lotes || []).map((lote) => ({
                    ...lote,
                    id: String((lote as any).id),
                    // ensure valvulas ids/loteId are strings too
                    valvulas: (lote.valvulas || []).map((v) => ({
                      ...v,
                      id: String((v as any).id),
                      loteId: String((v as any).loteId),
                    })),
                    })),
                  },
                  ]}
                />
                </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {filteredFincas.length === 0 && (
        <Card className="shadow-sm border-gray-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-16 w-16 text-muted-foreground mb-6" />
            <h3 className="text-lg font-medium mb-3 text-gray-800">No se encontraron fincas</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {searchTerm ? "Intenta ajustar los términos de búsqueda" : "Comienza creando tu primera finca"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

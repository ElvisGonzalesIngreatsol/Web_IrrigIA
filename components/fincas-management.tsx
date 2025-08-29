"use client"

import type React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useNotifications } from "@/components/notification-system"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/table-pagination"
import { Building2, Plus, Edit, Trash2, Search, MapPin, Calendar, Layers, Eye, Loader2 } from "lucide-react"
import { LoteMapEditor } from "./lote-map-editor"
import { GoogleMap } from "./google-map"
import type { Finca, LoteCoordinate } from "@/types"
import { apiService } from "@/lib/api"
import Swal from "sweetalert2"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// --- Componente principal ---
export function FincasManagement() {
  const [fincas, setFincas] = useState<Finca[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { addNotification } = useNotifications()
  const [searchTerm, setSearchTerm] = useState("")
  const [dialogMode, setDialogMode] = useState<"none" | "create" | "edit" | "view">("none")
  const [currentFinca, setCurrentFinca] = useState<Finca | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(6)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    area: 0,
    coordinates: [] as LoteCoordinate[],
    latitude: 0.0,
    longitude: 0.0,
    zoom: 15,
  })

  // --- Funciones memoizadas ---
  const fetchFincas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("[v1] Fetching fincas from backend...")
      const fincasData = await apiService.getFincas()
      setFincas(Array.isArray(fincasData) ? fincasData : [])
      console.log("[v1] Fincas loaded successfully:", fincasData?.length || 0)
    } catch (err) {
      console.error("[v1] Error fetching fincas:", err)
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
  }, [addNotification])

  const calculatePolygonArea = useCallback((coordinates: LoteCoordinate[]): number => {
    if (coordinates?.length < 3) return 0
    let area = 0
    const earthRadius = 6371000 // meters

    for (let i = 0; i < coordinates?.length; i++) {
      const j = (i + 1) % coordinates.length
      const lat1 = (coordinates[i].lat * Math.PI) / 180
      const lat2 = (coordinates[j].lat * Math.PI) / 180
      const lng1 = (coordinates[i].lng * Math.PI) / 180
      const lng2 = (coordinates[j].lng * Math.PI) / 180

      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2))
    }
    area = Math.abs((area * earthRadius * earthRadius) / 2)
    return area / 10000 // Convert to hectares
  }, [])

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      location: "",
      area: 0,
      coordinates: [],
      latitude: 0.0,
      longitude: 0.0,
      zoom: 15,
    })
    setCurrentFinca(null)
  }, [])

  // --- Efectos ---
  useEffect(() => {
    fetchFincas()
  }, [fetchFincas])

  // --- Lógica del componente (memoizada) ---
  const filteredAndSortedFincas = useMemo(() => {
    const validFincas = Array.isArray(fincas) ? fincas : []
    return validFincas
      .filter(
        (finca) =>
          finca.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          finca.location.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [fincas, searchTerm])

  const recentFincas = useMemo(() => filteredAndSortedFincas.slice(0, 3), [filteredAndSortedFincas])

  const remainingFincas = useMemo(() => filteredAndSortedFincas.slice(3), [filteredAndSortedFincas])

  const totalItems = remainingFincas.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)
  const paginatedFincas = remainingFincas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const getFincaStats = useCallback((finca: Finca) => {
    const lotes = finca.lotes?.length || 0
    const valvulas = finca.lotes?.reduce((sum, lote) => sum + (lote.valvulas?.length || 0), 0) || 0
    const activeValvulas = finca.lotes?.reduce((sum, lote) => sum + (lote.valvulas?.filter((v) => v.isOpen).length || 0), 0) || 0
    return { lotes, valvulas, activeValvulas }
  }, [])

  // --- Manejadores de eventos ---
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.location || formData.coordinates?.length < 3) {
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
      const fincaData = { ...formData, area: calculatedArea }

      if (dialogMode === "edit" && currentFinca) {
        console.log("[v1] Updating finca:", currentFinca.id)
        const updatedFinca = await apiService.updateFinca(currentFinca.id, fincaData)
        setFincas((prev) => prev.map((f) => (f.id === currentFinca.id ? updatedFinca : f)))
        addNotification({
          type: "success",
          title: "Finca actualizada",
          message: `${formData.name} ha sido actualizada correctamente`,
        })
      } else {
        console.log("[v1] Creating new finca")
        const newFinca = await apiService.createFinca(fincaData)
        setFincas((prev) => [newFinca, ...prev])
        addNotification({
          type: "success",
          title: "Finca creada",
          message: `${formData.name} ha sido creada correctamente`,
        })
      }

      resetForm()
      setDialogMode("none")
    } catch (err) {
      console.error("[v1] Error saving finca:", err)
      addNotification({
        type: "error",
        title: "Error al guardar",
        message: err instanceof Error ? err.message : "Error al guardar la finca",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (finca: Finca) => {
    setCurrentFinca(finca)
    setFormData({
      name: finca.name,
      location: finca.location,
      area: finca.area,
      latitude: finca.latitude,
      longitude: finca.longitude, // CORREGIDO
      zoom: 15,
      coordinates: finca.coordinates,
    })
    setDialogMode("edit")
  }

  const handleDelete = async (fincaId: number) => {
    const finca = fincas.find((f) => f.id === fincaId)
    if (!finca) return

    const result = await Swal.fire({
      title: "¿Estás seguro?",
      text: `¿Estás seguro de eliminar la finca ${finca.name}? Esto también eliminará todos sus lotes y válvulas.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#1C352D",
      cancelButtonColor: "#A6B28B",
      confirmButtonText: "Aceptar",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: "rounded-lg",
        title: "text-lg font-semibold",
        content: "text-sm",
      },
    })

    if (result.isConfirmed) {
      try {
        console.log("[v1] Deleting finca:", fincaId)
        await apiService.deleteFinca(fincaId)
        setFincas((prev) => prev.filter((f) => f.id !== fincaId))
        addNotification({
          type: "warning",
          title: "Finca eliminada",
          message: `${finca.name} ha sido eliminada del sistema`,
        })
        Swal.fire({
          title: "¡Eliminado!",
          text: "La finca ha sido eliminada correctamente",
          icon: "success",
          confirmButtonColor: "#1C352D",
        })
      } catch (err) {
        console.error("[v1] Error deleting finca:", err)
        addNotification({
          type: "error",
          title: "Error al eliminar",
          message: err instanceof Error ? err.message : "Error al eliminar la finca",
        })
      }
    }
  }

  const handleViewFinca = (finca: Finca) => {
    setCurrentFinca(finca)
    setDialogMode("view")
  }

  // --- Renderización condicional ---
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

  // --- Renderización del componente principal ---
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[rgba(28,53,45,1)]">Gestión de Fincas</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Administra las fincas del sistema</p>
        </div>
        <Dialog open={dialogMode === "create" || dialogMode === "edit"} onOpenChange={(open) => setDialogMode(open ? dialogMode : "none")}>
          <DialogTrigger asChild>
            <Button onClick={() => setDialogMode("create")} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Finca
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{dialogMode === "edit" ? "Editar Finca" : "Crear Nueva Finca"}</DialogTitle>
              <DialogDescription>
                {dialogMode === "edit" ? "Modifica los datos de la finca" : "Completa la información de la nueva finca"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Finca *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Finca San José" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación *</Label>
                  <Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Ej: Cundinamarca, Colombia" required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitud *</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={formData.latitude || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        latitude: Number.parseFloat(e.target.value),
                      }))
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
                    value={formData.longitude || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        longitude: Number.parseFloat(e.target.value),
                      }))
                    }
                    placeholder="Ej: -74.0721"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Definir Límites de la Finca *</Label>
                <LoteMapEditor
                  center={{ lat: formData.latitude, lng: formData.longitude }}
                  zoom={formData.zoom}
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
                  {dialogMode === "edit" ? "Actualizar Finca" : "Crear Finca"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogMode("none")} className="flex-1">
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Fincas</CardTitle>
            <Building2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{fincas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Área</CardTitle>
            <Layers className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              {fincas.reduce((sum, f) => sum + f.area, 0).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">Hectáreas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Lotes</CardTitle>
            <Layers className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-blue-600">
              {fincas.reduce((sum, f) => sum + (f.lotes?.length || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Válvulas</CardTitle>
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-purple-600">
              {fincas.reduce((sum, f) => sum + (f.lotes?.reduce((loteSum, lote) => loteSum + (lote.valvulas?.length || 0), 0) || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Buscar Fincas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre o ubicación..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8" />
          </div>
        </CardContent>
      </Card>
      {filteredAndSortedFincas.length > 0 && (
        <div className="space-y-6">
          {recentFincas.length > 0 && (
            <div>
              <h2 className="text-lg sm:text-xl font-semibold mb-4">{searchTerm ? "Resultados de Búsqueda" : "Fincas Recientes"}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {recentFincas.map((finca) => {
                  const stats = getFincaStats(finca)
                  return (
                    <Card key={finca.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-base sm:text-lg truncate">{finca.name}</CardTitle>
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
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <div className="text-sm font-semibold text-blue-600">{stats.lotes}</div>
                              <div className="text-xs text-blue-500">Lotes</div>
                            </div>
                            <div className="p-2 bg-purple-50 rounded-lg">
                              <div className="text-sm font-semibold text-purple-600">{stats.valvulas}</div>
                              <div className="text-xs text-purple-500">Válvulas</div>
                            </div>
                            <div className="p-2 bg-green-50 rounded-lg">
                              <div className="text-sm font-semibold text-green-600">{stats.activeValvulas}</div>
                              <div className="text-xs text-green-500">Activas</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Creada: {format(new Date(finca.createdAt), "PPP", { locale: es })}
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(finca)} className="flex-1">
                              <Edit className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(finca.id)} className="flex-1 text-red-600 hover:text-red-700">
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
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Todas las Fincas ({filteredAndSortedFincas.length})</CardTitle>
                <CardDescription>Lista completa de fincas en el sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="sm:hidden space-y-3">
                  {paginatedFincas.map((finca) => {
                    const stats = getFincaStats(finca)
                    return (
                      <Card key={finca.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium truncate">{finca.name}</h3>
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
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(finca.id)} className="flex-1 text-red-600 hover:text-red-700">
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
                          const stats = getFincaStats(finca)
                          return (
                            <TableRow key={finca.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{finca.name}</div>
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
                              <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(finca.createdAt), "dd/MM/yyyy", { locale: es })}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <Button variant="outline" size="sm" onClick={() => handleEdit(finca)}>
                                    <Edit className="h-4 w-4 mr-1" />
                                    Editar
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleDelete(finca.id)} className="text-red-600 hover:text-red-700">
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Eliminar
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleViewFinca(finca)} className="text-blue-600 hover:text-blue-700">
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
        </div>
      )}
      <Dialog open={dialogMode === "view"} onOpenChange={(open) => setDialogMode(open ? "view" : "none")}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista de Finca - {currentFinca?.name}</DialogTitle>
            <DialogDescription>Visualización de la finca con sus lotes y límites definidos</DialogDescription>
          </DialogHeader>
          {currentFinca && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{currentFinca.area.toFixed(1)} Ha</div>
                  <div className="text-xs text-green-500">Área Total</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">{getFincaStats(currentFinca).lotes}</div>
                  <div className="text-xs text-blue-500">Lotes</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-600">{getFincaStats(currentFinca).valvulas}</div>
                  <div className="text-xs text-purple-500">Válvulas</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-lg font-bold text-orange-600">{getFincaStats(currentFinca).activeValvulas}</div>
                  <div className="text-xs text-orange-500">Activas</div>
                </div>
              </div>
              <div className="h-[500px] rounded-lg overflow-hidden border">
                <GoogleMap
                  center={{ lat: currentFinca.latitude, lng: currentFinca.longitude }} // CORREGIDO
                  zoom={15}
                  showSatellite={true}
                  height="500px"
                  finca={currentFinca}
                />
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setDialogMode("none")}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {filteredAndSortedFincas.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No se encontraron fincas</h3>
            <p className="text-muted-foreground text-center">{searchTerm ? "Intenta ajustar los términos de búsqueda" : "Comienza creando tu primera finca"}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
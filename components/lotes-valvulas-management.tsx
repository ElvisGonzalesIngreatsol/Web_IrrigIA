"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useData } from "@/contexts/data-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/table-pagination"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Droplets, Layers, Eye, Power, Wrench } from "lucide-react"
import { LoteMapEditor } from "./lote-map-editor"
import { useNotifications } from "./notification-system"
import type { LoteCoordinate, Lote, Valvula } from "@/types"
import Swal from "sweetalert2"
import { apiService } from "@/lib/api"

export function LotesValvulasManagement() {
  const { user } = useAuth()
  const { valvulas, addLote, updateLote, deleteLote, addValvula, updateValvula, deleteValvula } = useData()
  const { showSuccess, showError } = useNotifications()

  const [fincas, setFincas] = useState<any[]>([])
  const [loadingFincas, setLoadingFincas] = useState(true)
  const [fincasError, setFincasError] = useState<string | null>(null)

  const [lotes, setLotes] = useState<any[]>([])
  const [loadingLotes, setLoadingLotes] = useState(false)
  const [lotesError, setLotesError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(6)

  // Filtrar fincas según el rol del usuario
  const userFincas = user?.role === "ADMIN" ? fincas : user?.fincaId ? fincas.filter((f) => f.id === user.fincaId) : []

  // Estados para lotes
  const [selectedFincaId, setSelectedFincaId] = useState<string>(user?.fincaId || "")
  const [isLoteDialogOpen, setIsLoteDialogOpen] = useState(false)
  const [editingLote, setEditingLote] = useState<string | null>(null)
  const [viewingLote, setViewingLote] = useState<string | null>(null)
  const [loteFormData, setLoteFormData] = useState({
    name: "",
    cultivo: "",
    descripcion: "",
    coordinates: [] as LoteCoordinate[],
  })

  // Estados para válvulas
  const [isValvulaDialogOpen, setIsValvulaDialogOpen] = useState(false)
  const [editingValvula, setEditingValvula] = useState<string | null>(null)
  const [valvulaFormData, setValvulaFormData] = useState({
    name: "",
    loteId: "",
    tipo: "aspersion" as "aspersion" | "goteo" | "microaspersion",
    caudal: "",
    presion: "",
    descripcion: "",
    deviceId: "",
    coordinates: { lat: 0, lng: 0 },
    isActive: true,
    needsMaintenance: false,
    maintenanceDate: "",
    maintenanceNotes: "",
  })

  const selectedFinca = selectedFincaId ? fincas.find((f) => f.id === selectedFincaId) : null

  const fetchLotes = async (fincaId: string) => {
    if (!fincaId) {
      setLotes([])
      return
    }

    setLoadingLotes(true)
    setLotesError(null)

    try {
      console.log(`[v0] Fetching lotes for finca: ${fincaId}`)
      const response = await apiService.getLotes({ fincaId })

      if (response.success && response.data) {
        console.log(`[v0] Lotes loaded successfully:`, response.data.length)
        setLotes(Array.isArray(response.data) ? response.data : [])
      } else {
        console.error(`[v0] Error loading lotes:`, response.error)
        setLotesError(response.error || "Error al cargar lotes")
        setLotes([])
      }
    } catch (error) {
      console.error(`[v0] Exception loading lotes:`, error)
      setLotesError("Error de conexión al cargar lotes")
      setLotes([])
    } finally {
      setLoadingLotes(false)
    }
  }

  useEffect(() => {
    if (selectedFincaId) {
      fetchLotes(selectedFincaId)
    } else {
      setLotes([])
    }
  }, [selectedFincaId])

  const filteredValvulas = valvulas
    .filter((valvula) => valvula.fincaId === selectedFincaId)
    .filter(
      (valvula) =>
        valvula.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lotes
          .find((l) => l.id === valvula.loteId)
          ?.name.toLowerCase()
          .includes(searchTerm.toLowerCase()),
    )

  const totalValvulas = filteredValvulas.length
  const totalPages = Math.ceil(totalValvulas / itemsPerPage)
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalValvulas)
  const paginatedValvulas = filteredValvulas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }

  const resetLoteForm = () => {
    setLoteFormData({
      name: "",
      cultivo: "",
      descripcion: "",
      coordinates: [],
    })
    setEditingLote(null)
  }

  const handleLoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFincaId) {
      showError("Error", "Debe seleccionar una finca")
      return
    }

    if (loteFormData.coordinates.length < 3) {
      showError("Error de Validación", "Debes definir al menos 3 puntos para crear el lote")
      return
    }

    try {
      const loteData = {
        ...loteFormData,
        fincaId: selectedFincaId,
        area: calculateArea(loteFormData.coordinates),
        centerCoordinates: calculateCenter(loteFormData.coordinates),
      }

      if (editingLote) {
        updateLote(editingLote, loteData)
        showSuccess("Lote Actualizado", `El lote "${loteFormData.name}" ha sido actualizado exitosamente`)
      } else {
        addLote(loteData)
        showSuccess("Lote Creado", `El lote "${loteFormData.name}" ha sido creado exitosamente`)
      }

      fetchLotes(selectedFincaId)

      resetLoteForm()
      setIsLoteDialogOpen(false)
    } catch (error) {
      showError("Error", "Ocurrió un error al procesar el lote")
    }
  }

  const handleEditLote = (lote: any) => {
    setLoteFormData({
      name: lote.name,
      cultivo: lote.cultivo,
      descripcion: lote.descripcion || "",
      coordinates: lote.coordinates,
    })
    setEditingLote(lote.id)
    setIsLoteDialogOpen(true)
  }

  const handleDeleteLote = (lote: Lote) => {
    Swal.fire({
      title: "¿Estás seguro?",
      text: `Se eliminará el lote "${lote.name}" y todas sus válvulas asociadas`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#1C352D",
      cancelButtonColor: "#A6B28B",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        deleteLote(lote.id)
        Swal.fire({
          title: "¡Eliminado!",
          text: "El lote ha sido eliminado correctamente",
          icon: "success",
          confirmButtonColor: "#1C352D",
        })
      }
    })
  }

  // Funciones para válvulas
  const resetValvulaForm = () => {
    setValvulaFormData({
      name: "",
      loteId: "",
      tipo: "aspersion",
      caudal: "",
      presion: "",
      descripcion: "",
      deviceId: "",
      coordinates: { lat: 0, lng: 0 },
      isActive: true,
      needsMaintenance: false,
      maintenanceDate: "",
      maintenanceNotes: "",
    })
    setEditingValvula(null)
  }

  const handleValvulaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const valvulaData = {
        ...valvulaFormData,
        fincaId: selectedFincaId,
        caudal: valvulaFormData.caudal ? Number.parseFloat(valvulaFormData.caudal) : null,
        presion: valvulaFormData.presion ? Number.parseFloat(valvulaFormData.presion) : null,
        isOpen: false,
        flowRate: 0,
        status: valvulaFormData.isActive ? "active" : ("inactive" as const),
        coordinates: valvulaFormData.coordinates,
        deviceId: valvulaFormData.deviceId || `LORA_${Date.now()}`,
        needsMaintenance: valvulaFormData.needsMaintenance,
        maintenanceDate: valvulaFormData.maintenanceDate || null,
        maintenanceNotes: valvulaFormData.maintenanceNotes || null,
      }

      if (editingValvula) {
        updateValvula(editingValvula, valvulaData)
        showSuccess("Válvula Actualizada", `La válvula "${valvulaFormData.name}" ha sido actualizada exitosamente`)
      } else {
        addValvula(valvulaData)
        showSuccess("Válvula Creada", `La válvula "${valvulaFormData.name}" ha sido creada exitosamente`)
      }

      resetValvulaForm()
      setIsValvulaDialogOpen(false)
    } catch (error) {
      showError("Error", "Ocurrió un error al procesar la válvula")
    }
  }

  const handleEditValvula = (valvula: any) => {
    setValvulaFormData({
      name: valvula.name || "",
      loteId: valvula.loteId || "",
      tipo: valvula.tipo || "aspersion",
      caudal: valvula.caudal?.toString() || "",
      presion: valvula.presion?.toString() || "",
      descripcion: valvula.descripcion || "",
      deviceId: valvula.deviceId || "",
      coordinates: valvula.coordinates || { lat: 0, lng: 0 },
      isActive: valvula.status === "active",
      needsMaintenance: valvula.needsMaintenance || false,
      maintenanceDate: valvula.maintenanceDate || "",
      maintenanceNotes: valvula.maintenanceNotes || "",
    })
    setEditingValvula(valvula.id)
    setIsValvulaDialogOpen(true)
  }

  const handleDeleteValvula = (valvula: Valvula) => {
    Swal.fire({
      title: "¿Estás seguro?",
      text: `Se eliminará la válvula "${valvula.name}"`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#1C352D",
      cancelButtonColor: "#A6B28B",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        deleteValvula(valvula.id)
        Swal.fire({
          title: "¡Eliminado!",
          text: "La válvula ha sido eliminada correctamente",
          icon: "success",
          confirmButtonColor: "#1C352D",
        })
      }
    })
  }

  const calculateArea = (coordinates: LoteCoordinate[]): number => {
    if (coordinates.length < 3) return 0

    let area = 0
    for (let i = 0; i < coordinates.length; i++) {
      const j = (i + 1) % coordinates.length
      area += coordinates[i].lat * coordinates[j].lng
      area -= coordinates[j].lat * coordinates[i].lng
    }
    return ((Math.abs(area) / 2) * 111320 * 111320) / 10000 // Conversión aproximada a hectáreas
  }

  const calculateCenter = (coordinates: LoteCoordinate[]): LoteCoordinate => {
    if (coordinates.length === 0) return { lat: 0, lng: 0 }

    const centerLat = coordinates.reduce((sum, coord) => sum + coord.lat, 0) / coordinates.length
    const centerLng = coordinates.reduce((sum, coord) => sum + coord.lng, 0) / coordinates.length

    return { lat: centerLat, lng: centerLng }
  }

  const viewingLoteData = viewingLote ? lotes.find((l) => l.id === viewingLote) : null

  useEffect(() => {
    const fetchFincas = async () => {
      try {
        setLoadingFincas(true)
        setFincasError(null)
        const response = await apiService.getAllFincas()
        if (response.success && response.data) {
          setFincas(response.data)
        } else {
          setFincasError("Error al cargar las fincas")
          showError("Error al cargar las fincas")
        }
      } catch (error) {
        console.error("Error fetching fincas:", error)
        setFincasError("Error al cargar las fincas")
        showError("Error al cargar las fincas")
      } finally {
        setLoadingFincas(false)
      }
    }

    fetchFincas()
  }, [showError])

  const filteredLotes = useMemo(() => {
    return lotes.filter(
      (lote) =>
        lote.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lote.cultivo.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [lotes, searchTerm])

  return (
    <div className="space-y-8 p-6 min-h-screen" style={{ backgroundColor: "#F9F6F3" }}>
      <div className="rounded-xl shadow-sm p-6 border" style={{ backgroundColor: "#F9F6F3", borderColor: "#A6B28B" }}>
        <h1 className="text-3xl font-bold" style={{ color: "#1C352D" }}>
          Gestión de Lotes y Válvulas
        </h1>
        <p className="mt-2" style={{ color: "#1C352D" }}>
          {user?.role === "ADMIN"
            ? "Administra los lotes y válvulas de riego de todas las fincas"
            : `Administra los lotes y válvulas de tu finca`}
        </p>
      </div>
      

      {/* Selector de Finca - Solo si es admin o si no tiene finca asignada */}
      {(user?.role === "ADMIN" || !user?.fincaId) && (
        <Card className="shadow-lg border-0" style={{ backgroundColor: "#F9F6F3" }}>
          <CardHeader
            className="rounded-t-lg border px-6 py-6 rounded-xl shadow-sm"
            style={{ backgroundColor: "#F9F6F3", color: "#F9F6F3" }}
          >
            <CardTitle className="flex items-center gap-2 text-[rgba(28,53,45,1)]">
              <Layers className="h-5 w-5" />
              Seleccionar Finca
            </CardTitle>
            <CardDescription className="text-[rgba(28,53,45,1)]" style={{ color: "#A6B28B" }}>
              Elige una finca para gestionar sus lotes y válvulas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Select value={selectedFincaId} onValueChange={setSelectedFincaId} disabled={loadingFincas}>
              <SelectTrigger className="w-full h-12 border-2 transition-colors" style={{ borderColor: "#A6B28B" }}>
                <SelectValue
                  placeholder={
                    loadingFincas
                      ? "Cargando fincas..."
                      : fincasError
                        ? "Error al cargar fincas"
                        : "Selecciona una finca"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {loadingFincas ? (
                  <SelectItem value="loading" disabled>
                    Cargando fincas...
                  </SelectItem>
                ) : fincasError ? (
                  <SelectItem value="error" disabled>
                    Error: {fincasError}
                  </SelectItem>
                ) : fincas.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    No hay fincas disponibles
                  </SelectItem>
                ) : (
                  userFincas.map((finca) => (
                    <SelectItem key={finca.id} value={finca.id}>
                      {finca.name} - {finca.location}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {selectedFincaId && (
        <Tabs defaultValue="lotes" className="w-full">
          <TabsList
            className="grid w-full grid-cols-2 shadow-lg rounded-xl p-2 border-0"
            style={{ backgroundColor: "#F9F6F3" }}
          >
            <TabsTrigger
              value="lotes"
              className="rounded-lg transition-all duration-300 data-[state=active]:text-white"
              style={{
                backgroundColor: "transparent",
                color: "#1C352D",
              }}
            >
              <Layers className="h-4 w-4 mr-2" />
              Lotes ({lotes.length})
            </TabsTrigger>
            <TabsTrigger
              value="valvulas"
              className="rounded-lg transition-all duration-300 data-[state=active]:text-white"
              style={{
                backgroundColor: "transparent",
                color: "#1C352D",
              }}
            >
              <Droplets className="h-4 w-4 mr-2" />
              Válvulas ({valvulas.filter((v) => v.fincaId === selectedFincaId).length})
            </TabsTrigger>
          </TabsList>

          {/* Tab de Lotes */}
          <TabsContent value="lotes" className="space-y-6 mt-6">
            <div
              className="flex justify-between items-center rounded-xl p-6 shadow-lg border-0"
              style={{ backgroundColor: "#F9F6F3" }}
            >
              <h2 className="text-2xl font-semibold" style={{ color: "#1C352D" }}>
                Lotes de {selectedFinca?.name}
              </h2>
              <Dialog
                open={isLoteDialogOpen}
                onOpenChange={(open) => {
                  if (!open) {
                    resetLoteForm()
                  }
                  setIsLoteDialogOpen(open)
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    className="shadow-lg transition-all duration-300 transform hover:scale-105"
                    style={{
                      backgroundColor: "#1C352D",
                      color: "#F9F6F3",
                      borderColor: "#A6B28B",
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Lote
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-gray-800">
                      {editingLote ? "Editar Lote" : "Crear Nuevo Lote"}
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                      {editingLote
                        ? "Modifica los datos del lote existente"
                        : "Crea un nuevo lote dentro de la finca seleccionada"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleLoteSubmit}>
                    <div className="grid gap-6 py-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="lote-name" className="text-right font-medium">
                              Nombre
                            </Label>
                            <Input
                              id="lote-name"
                              value={loteFormData.name}
                              onChange={(e) => setLoteFormData({ ...loteFormData, name: e.target.value })}
                              className="col-span-3 border-2 focus:border-blue-500 transition-colors"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="lote-cultivo" className="text-right font-medium">
                              Cultivo
                            </Label>
                            <Input
                              id="lote-cultivo"
                              value={loteFormData.cultivo}
                              onChange={(e) => setLoteFormData({ ...loteFormData, cultivo: e.target.value })}
                              className="col-span-3 border-2 focus:border-blue-500 transition-colors"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="lote-descripcion" className="text-right font-medium">
                              Descripción
                            </Label>
                            <Textarea
                              id="lote-descripcion"
                              value={loteFormData.descripcion}
                              onChange={(e) => setLoteFormData({ ...loteFormData, descripcion: e.target.value })}
                              className="col-span-3 border-2 focus:border-blue-500 transition-colors"
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>

                      {selectedFinca && (
                        <div className="col-span-full">
                          <Label className="text-sm font-medium mb-4 block">Definir Coordenadas del Lote</Label>
                          <LoteMapEditor
                            center={selectedFinca.mapCoordinates || { lat: -2.1894, lng: -79.889 }}
                            zoom={selectedFinca.mapCoordinates?.zoom || 15}
                            coordinates={loteFormData.coordinates}
                            onCoordinatesChange={(coordinates) => setLoteFormData({ ...loteFormData, coordinates })}
                            title="Polígono del Lote"
                            fincaBounds={selectedFinca.coordinates}
                            isLote={true}
                          />
                        </div>
                      )}
                    </div>
                    <DialogFooter className="gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsLoteDialogOpen(false)
                          resetLoteForm()
                        }}
                        className="border-2 hover:bg-gray-50"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={loteFormData.coordinates.length < 3}
                        className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 bg-[rgba(28,53,45,1)]"
                      >
                        {editingLote ? "Actualizar Lote" : "Crear Lote"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Lista de Lotes */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {loadingLotes ? (
                <div className="col-span-full flex justify-center items-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1C352D] mx-auto mb-2"></div>
                    <p className="text-[#1C352D]">Cargando lotes...</p>
                  </div>
                </div>
              ) : lotesError ? (
                <div className="col-span-full flex justify-center items-center py-8">
                  <div className="text-center text-red-600">
                    <p>Error al cargar lotes: {lotesError}</p>
                    <Button 
                      onClick={() => fetchLotes(selectedFincaId)} 
                      variant="outline" 
                      className="mt-2"
                    >
                      Reintentar
                    </Button>
                  </div>
                </div>
              ) : lotes.length === 0 ? (
                <div className="col-span-full flex justify-center items-center py-8">
                  <p className="text-[#1C352D]">No hay lotes registrados para esta finca</p>
                </div>
              ) : (
                lotes.map((lote) => {
                  const loteValvulas = valvulas.filter((v) => v.loteId === lote.id)
                  return (
                    <Card
                      key={lote.id}
                      className="shadow-lg border-0 backdrop-blur-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                      style={{ backgroundColor: "#F9F6F3" }}
                    >
                    <CardHeader className="rounded-t-lg pb-3" style={{ backgroundColor: "#1C352D", color: "#F9F6F3" }}>
                      <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                        <Layers className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                        <span className="truncate">{lote.name}</span>
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm truncate" style={{ color: "#F5C9B0" }}>
                        {lote.cultivo}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      <div className="space-y-3 sm:space-y-4">
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span style={{ color: "#1C352D" }}>Área:</span>
                          <span className="font-semibold" style={{ color: "#1C352D" }}>
                            {lote.area.toFixed(2)} Ha
                          </span>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span style={{ color: "#1C352D" }}>Válvulas:</span>
                          <Badge variant="outline" style={{ borderColor: "#A6B28B", color: "#1C352D" }}>
                            {loteValvulas.length}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span style={{ color: "#1C352D" }}>Puntos:</span>
                          <Badge variant="outline" style={{ borderColor: "#A6B28B", color: "#1C352D" }}>
                            {lote.coordinates.length}
                          </Badge>
                        </div>
                        {lote.descripcion && (
                          <p className="text-xs truncate" style={{ color: "#1C352D" }}>
                            {lote.descripcion}
                          </p>
                        )}
                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-2 transition-colors bg-transparent text-xs sm:text-sm h-8 sm:h-9"
                            style={{
                              borderColor: "#A6B28B",
                              color: "#1C352D",
                              backgroundColor: "transparent",
                            }}
                            onClick={() => setViewingLote(lote.id)}
                          >
                            <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                            <span>Ver</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-2 transition-colors bg-transparent text-xs sm:text-sm h-8 sm:h-9"
                            style={{
                              borderColor: "#A6B28B",
                              color: "#1C352D",
                              backgroundColor: "transparent",
                            }}
                            onClick={() => handleEditLote(lote)}
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                            <span>Editar</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-2 transition-colors bg-transparent text-xs sm:text-sm h-8 sm:h-9"
                            style={{
                              borderColor: "#F5C9B0",
                              color: "#1C352D",
                              backgroundColor: "transparent",
                            }}
                            onClick={() => handleDeleteLote(lote)}
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                            <span>Eliminar</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

            </div>
            {filteredLotes.length === 0 && (
              <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                <CardContent className="text-center py-12">
                  <Layers className="h-16 w-16 text-gray-300 mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-3">No hay lotes</h3>
                  <p className="text-gray-500 mb-6">Crea el primer lote para esta finca</p>
                  <Button
                    onClick={() => setIsLoteDialogOpen(true)}
                    className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white shadow-lg bg-[rgba(28,53,45,1)]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primer Lote
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab de Válvulas */}
          <TabsContent value="valvulas" className="space-y-6 mt-6">
            <div className="flex justify-between items-center bg-white rounded-xl p-6 shadow-lg border-0">
              <h2 className="text-2xl font-semibold text-gray-800">Válvulas de {selectedFinca?.name}</h2>
              <Dialog
                open={isValvulaDialogOpen}
                onOpenChange={(open) => {
                  if (!open) {
                    resetValvulaForm()
                  }
                  setIsValvulaDialogOpen(open)
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    disabled={lotes.length === 0}
                    className="shadow-lg transition-all duration-300 transform hover:scale-105"
                    style={{
                      backgroundColor: "#1C352D",
                      color: "#F9F6F3",
                      borderColor: "#A6B28B",
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2 text-white" />
                    Nueva Válvula
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                  <DialogHeader className="flex-shrink-0">
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                      {editingValvula ? "Editar Válvula" : "Crear Nueva Válvula"}
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                      {editingValvula
                        ? "Modifica los datos de la válvula existente"
                        : "Instala una nueva válvula en un lote"}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto pr-2">
                    <form onSubmit={handleValvulaSubmit} className="h-full flex flex-col">
                      <div className="space-y-6 py-6 flex-1">
                        <div
                          className="p-6 rounded-xl border"
                          style={{ backgroundColor: "#F5C9B0", borderColor: "#A6B28B" }}
                        >
                          <h3
                            className="text-lg font-semibold mb-4 flex items-center gap-2"
                            style={{ color: "#1C352D" }}
                          >
                            <Droplets className="h-5 w-5" style={{ color: "#1C352D" }} />
                            Información Básica
                          </h3>
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <Label
                                htmlFor="valvula-name"
                                className="text-sm font-medium"
                                style={{ color: "#1C352D" }}
                              >
                                Nombre *
                              </Label>
                              <Input
                                id="valvula-name"
                                value={valvulaFormData.name}
                                onChange={(e) => setValvulaFormData({ ...valvulaFormData, name: e.target.value })}
                                className="border-2 transition-colors h-12"
                                style={{ borderColor: "#A6B28B" }}
                                placeholder="Ej: Válvula Norte A1"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label
                                htmlFor="valvula-lote"
                                className="text-sm font-medium"
                                style={{ color: "#1C352D" }}
                              >
                                Lote *
                              </Label>
                              <Select
                                value={valvulaFormData.loteId}
                                onValueChange={(value) => setValvulaFormData({ ...valvulaFormData, loteId: value })}
                              >
                                <SelectTrigger className="border-2 h-12" style={{ borderColor: "#A6B28B" }}>
                                  <SelectValue placeholder="Seleccionar lote" />
                                </SelectTrigger>
                                <SelectContent>
                                  {lotes.map((lote) => (
                                    <SelectItem key={lote.id} value={lote.id}>
                                      {lote.name} - {lote.cultivo}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="valvula-device-id" className="text-sm font-medium text-gray-700">
                                Device ID (LoRa) *
                              </Label>
                              <Input
                                id="valvula-device-id"
                                value={valvulaFormData.deviceId || ""}
                                onChange={(e) => setValvulaFormData({ ...valvulaFormData, deviceId: e.target.value })}
                                className="border-2 focus:border-blue-500 transition-colors h-12"
                                placeholder="LORA_XXX"
                                required
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border border-green-100">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <svg
                              className="h-5 w-5 text-green-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                            Ubicación
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="valvula-lat" className="text-sm font-medium text-gray-700">
                                Latitud *
                              </Label>
                              <Input
                                id="valvula-lat"
                                type="number"
                                step="any"
                                value={valvulaFormData.coordinates.lat.toString()}
                                onChange={(e) =>
                                  setValvulaFormData({
                                    ...valvulaFormData,
                                    coordinates: {
                                      ...valvulaFormData.coordinates,
                                      lat: Number.parseFloat(e.target.value) || 0,
                                    },
                                  })
                                }
                                className="border-2 focus:border-green-500 transition-colors h-12"
                                placeholder="0"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="valvula-lng" className="text-sm font-medium text-gray-700">
                                Longitud *
                              </Label>
                              <Input
                                id="valvula-lng"
                                type="number"
                                step="any"
                                value={valvulaFormData.coordinates.lng.toString()}
                                onChange={(e) =>
                                  setValvulaFormData({
                                    ...valvulaFormData,
                                    coordinates: {
                                      ...valvulaFormData.coordinates,
                                      lng: Number.parseFloat(e.target.value) || 0,
                                    },
                                  })
                                }
                                className="border-2 focus:border-green-500 transition-colors h-12"
                                placeholder="0"
                                required
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Power className="h-5 w-5 text-purple-500" />
                            Control de Válvula
                          </h3>
                          <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-purple-200">
                            <input
                              type="checkbox"
                              id="valvula-active"
                              checked={valvulaFormData.isActive}
                              onChange={(e) => setValvulaFormData({ ...valvulaFormData, isActive: e.target.checked })}
                              className="w-5 h-5 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
                            />
                            <Label htmlFor="valvula-active" className="text-sm font-medium text-gray-700">
                              {valvulaFormData.isActive ? "✅ Válvula Activa" : "❌ Válvula Inactiva"}
                            </Label>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-xl border border-orange-100">
                          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Wrench className="h-5 w-5 text-orange-500" />
                            Programación de Mantenimiento
                          </h3>
                          <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-orange-200">
                              <input
                                type="checkbox"
                                id="valvula-maintenance"
                                checked={valvulaFormData.needsMaintenance}
                                onChange={(e) =>
                                  setValvulaFormData({ ...valvulaFormData, needsMaintenance: e.target.checked })
                                }
                                className="w-5 h-5 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                              />
                              <Label htmlFor="valvula-maintenance" className="text-sm font-medium text-gray-700">
                                🔧 Programar mantenimiento
                              </Label>
                            </div>

                            {valvulaFormData.needsMaintenance && (
                              <div className="space-y-4 p-4 bg-white rounded-lg border border-orange-200">
                                <div className="space-y-2">
                                  <Label
                                    htmlFor="valvula-maintenance-date"
                                    className="text-sm font-medium text-gray-700"
                                  >
                                    Fecha de Mantenimiento
                                  </Label>
                                  <Input
                                    id="valvula-maintenance-date"
                                    type="date"
                                    value={valvulaFormData.maintenanceDate}
                                    onChange={(e) =>
                                      setValvulaFormData({ ...valvulaFormData, maintenanceDate: e.target.value })
                                    }
                                    className="border-2 focus:border-orange-500 transition-colors h-12"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label
                                    htmlFor="valvula-maintenance-notes"
                                    className="text-sm font-medium text-gray-700"
                                  >
                                    Notas de Mantenimiento
                                  </Label>
                                  <Textarea
                                    id="valvula-maintenance-notes"
                                    value={valvulaFormData.maintenanceNotes}
                                    onChange={(e) =>
                                      setValvulaFormData({ ...valvulaFormData, maintenanceNotes: e.target.value })
                                    }
                                    className="border-2 focus:border-orange-500 transition-colors"
                                    rows={3}
                                    placeholder="Descripción del mantenimiento requerido..."
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <DialogFooter className="flex-shrink-0 gap-3 pt-4 border-t bg-white">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsValvulaDialogOpen(false)
                            resetValvulaForm()
                          }}
                          className="border-2 hover:bg-gray-50"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white shadow-lg bg-[rgba(28,53,45,1)]"
                        >
                          {editingValvula ? "Actualizar Válvula" : "Crear Válvula"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl font-semibold text-gray-800">
                  Válvulas Instaladas ({filteredValvulas.length})
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Gestiona las válvulas de riego de la finca
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mobile Card Layout */}
                <div className="block sm:hidden">
                  <div className="space-y-3 p-4">
                    {paginatedValvulas.map((valvula) => {
                      const lote = lotes.find((l) => l.id === valvula.loteId)
                      return (
                        <Card key={valvula.id} className="p-4 border border-gray-200">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-sm truncate" style={{ color: "#1C352D" }}>
                                  {valvula.name}
                                </h4>
                                <p className="text-xs text-gray-500 truncate">{lote?.name}</p>
                              </div>
                              <Badge
                                className="text-xs font-medium ml-2 flex-shrink-0"
                                style={{
                                  backgroundColor: valvula.status === "active" ? "#1C352D" : "#F5C9B0",
                                  color: valvula.status === "active" ? "#F9F6F3" : "#1C352D",
                                }}
                              >
                                {valvula.status === "active" ? "Activo" : "Inactivo"}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-500">Flujo:</span>
                                <div className="font-medium" style={{ color: "#1C352D" }}>
                                  {valvula.flowRate?.toFixed(1) || "0.0"} L/min
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500">Presión:</span>
                                <div className="font-medium" style={{ color: "#1C352D" }}>
                                  {valvula.presion?.toFixed(1) || "0.0"} bar
                                </div>
                              </div>
                            </div>

                            <div className="text-xs">
                              <span className="text-gray-500">Device ID:</span>
                              <div className="font-mono text-xs mt-1" style={{ color: "#1C352D" }}>
                                {valvula.deviceId || "N/A"}
                              </div>
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 border-2 transition-colors bg-transparent text-xs h-8"
                                style={{
                                  borderColor: "#A6B28B",
                                  color: "#1C352D",
                                  backgroundColor: "transparent",
                                }}
                                onClick={() => handleEditValvula(valvula)}
                              >
                                <Edit className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span>Editar</span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 border-2 transition-colors bg-transparent text-xs h-8"
                                style={{
                                  borderColor: "#F5C9B0",
                                  color: "#1C352D",
                                  backgroundColor: "transparent",
                                }}
                                onClick={() => handleDeleteValvula(valvula)}
                              >
                                <Trash2 className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span>Eliminar</span>
                              </Button>
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow style={{ borderColor: "#A6B28B" }}>
                        <TableHead className="font-semibold" style={{ color: "#1C352D" }}>
                          Válvula
                        </TableHead>
                        <TableHead className="font-semibold" style={{ color: "#1C352D" }}>
                          Lote
                        </TableHead>
                        <TableHead className="font-semibold" style={{ color: "#1C352D" }}>
                          Flujo
                        </TableHead>
                        <TableHead className="font-semibold" style={{ color: "#1C352D" }}>
                          Presión
                        </TableHead>
                        <TableHead className="font-semibold" style={{ color: "#1C352D" }}>
                          Estado
                        </TableHead>
                        <TableHead className="font-semibold" style={{ color: "#1C352D" }}>
                          Device ID
                        </TableHead>
                        <TableHead className="text-center font-semibold" style={{ color: "#1C352D" }}>
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedValvulas.map((valvula) => {
                        const lote = lotes.find((l) => l.id === valvula.loteId)
                        return (
                          <TableRow key={valvula.id} style={{ borderColor: "#A6B28B" }}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Droplets className="h-4 w-4 flex-shrink-0" style={{ color: "#A6B28B" }} />
                                <span className="font-medium truncate" style={{ color: "#1C352D" }}>
                                  {valvula.name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" style={{ borderColor: "#A6B28B", color: "#1C352D" }}>
                                {lote?.name || "Sin asignar"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm" style={{ color: "#1C352D" }}>
                                {valvula.flowRate?.toFixed(1) || "0.0"} L/min
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm" style={{ color: "#1C352D" }}>
                                {valvula.presion?.toFixed(1) || "0.0"} bar
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className="text-white font-medium"
                                style={{
                                  backgroundColor: valvula.status === "active" ? "#1C352D" : "#F5C9B0",
                                  color: valvula.status === "active" ? "#F9F6F3" : "#1C352D",
                                }}
                              >
                                {valvula.status === "active" ? "Activo" : "Inactivo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm truncate max-w-[100px]" style={{ color: "#1C352D" }}>
                                  {valvula.deviceId || "N/A"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1 xl:gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-2 transition-colors bg-transparent text-xs xl:text-sm h-8 px-2 xl:px-3"
                                  style={{
                                    borderColor: "#A6B28B",
                                    color: "#1C352D",
                                    backgroundColor: "transparent",
                                  }}
                                  onClick={() => handleEditValvula(valvula)}
                                >
                                  <Edit className="h-3 w-3 xl:mr-1 flex-shrink-0" />
                                  <span className="hidden xl:inline">Editar</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-2 transition-colors bg-transparent text-xs xl:text-sm h-8 px-2 xl:px-3"
                                  style={{
                                    borderColor: "#F5C9B0",
                                    color: "#1C352D",
                                    backgroundColor: "transparent",
                                  }}
                                  onClick={() => handleDeleteValvula(valvula)}
                                >
                                  <Trash2 className="h-3 w-3 xl:mr-1 flex-shrink-0" />
                                  <span className="hidden xl:inline">Eliminar</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="px-4 sm:px-6 py-4 border-t" style={{ borderColor: "#A6B28B" }}>
                  <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalValvulas}
                    itemsPerPage={itemsPerPage}
                    startItem={startItem}
                    endItem={endItem}
                    onPageChange={handlePageChange}
                    onItemsPerPageChange={handleItemsPerPageChange}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog para ver lote en mapa */}
      <Dialog open={!!viewingLote} onOpenChange={() => setViewingLote(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800">{viewingLoteData?.name}</DialogTitle>
            <DialogDescription className="text-gray-600">
              {viewingLoteData?.cultivo} - Área: {viewingLoteData?.area.toFixed(2)} Ha
            </DialogDescription>
          </DialogHeader>
          {viewingLoteData && selectedFinca && (
            <LoteMapEditor
              center={selectedFinca.mapCoordinates}
              zoom={selectedFinca.zoom}
              coordinates={viewingLoteData.coordinates}
              onCoordinatesChange={() => {}} // Read-only
              readonly={true}
              fincaBounds={selectedFinca.coordinates}
              isLote={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

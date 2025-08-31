"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
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
import { Plus, Edit, Trash2, Droplets, Search } from "lucide-react"
import { useNotifications } from "./notification-system"
import type { Valvula, Finca, Lote } from "@/types"
import Swal from "sweetalert2"
import { apiService } from "@/lib/api"
export function ValvulasManagement() {
  const { showSuccess, showError } = useNotifications()

  const [fincas, setFincas] = useState<Finca[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [valvulas, setValvulas] = useState<Valvula[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(6)
  const [selectedFincaId, setSelectedFincaId] = useState<string>("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingValvula, setEditingValvula] = useState<string | null>(null)
  const [valvulaFormData, setValvulaFormData] = useState({
    nombre: "",
    estado: "ABIERTA" | "CERRADA",
    caudal: "",
    presion: "",
    descripcion: "",
    deviceId: "",
    isActive: true,
  })

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [fincasResponse, valvulasResponse] = await Promise.all([
        apiService.getFincas(),
        apiService.getValvulas(),
      ])
      setFincas(fincasResponse.data || [])
      setValvulas(valvulasResponse.data || [])
      if (!selectedFincaId && fincasResponse.data && fincasResponse.data.length > 0) {
        setSelectedFincaId(fincasResponse.data[0].id)
      }
    } catch (err) {
      setError("Error al cargar los datos.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedFincaId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredValvulas = valvulas
    .filter((valvula) => !selectedFincaId || valvula.fincaId === selectedFincaId)
    .filter(
      (valvula) =>
        valvula.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        valvula.deviceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lotes
          .find((l) => l.id === valvula.loteId)
          ?.name?.toLowerCase()
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

  const resetForm = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFincaId) {
      showError("Error", "Debe seleccionar una finca")
      return
    }

    try {
      const valvulaData = {
        ...valvulaFormData,
        fincaId: selectedFincaId,
        caudal: valvulaFormData.caudal ? Number.parseFloat(valvulaFormData.caudal) : 0,
        presion: valvulaFormData.presion ? Number.parseFloat(valvulaFormData.presion) : 0,
        isOpen: false,
        flowRate: 0,
        status: valvulaFormData.isActive ? "active" : ("inactive" as const),
        coordinates: valvulaFormData.coordinates,
        deviceId: valvulaFormData.deviceId || `LORA_${Date.now()}`,
        needsMaintenance: valvulaFormData.needsMaintenance,
        maintenanceDate: valvulaFormData.maintenanceDate || null,
        maintenanceNotes: valvulaFormData.maintenanceNotes || null,
        lastActivity: new Date().toISOString(),
      }

      let response
      if (editingValvula) {
        response = await apiService.updateValvula(editingValvula, valvulaData)
        if (response.success) {
          showSuccess("Válvula Actualizada", `La válvula "${valvulaFormData.name}" ha sido actualizada exitosamente`)
        } else {
          showError("Error", response.error || "Ocurrió un error al actualizar la válvula")
        }
      } else {
        response = await apiService.createValvula(valvulaData)
        if (response.success) {
          showSuccess("Válvula Creada", `La válvula "${valvulaFormData.name}" ha sido creada exitosamente`)
        } else {
          showError("Error", response.error || "Ocurrió un error al crear la válvula")
        }
      }

      if (response.success) {
        resetForm()
        setIsDialogOpen(false)
        fetchData() // Vuelve a cargar los datos para actualizar la tabla
      }
    } catch (error) {
      showError("Error", "Ocurrió un error al procesar la válvula")
    }
  }

  const handleEdit = (valvula: Valvula) => {
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
    setIsDialogOpen(true)
  }

  const handleDelete = (valvula: Valvula) => {
    Swal.fire({
      title: "¿Estás seguro?",
      text: `Se eliminará la válvula "${valvula.name}"`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#1C352D",
      cancelButtonColor: "#A6B28B",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        const response = await apiService.deleteValvula(valvula.id)
        if (response.success) {
          Swal.fire({
            title: "¡Eliminado!",
            text: "La válvula ha sido eliminada correctamente",
            icon: "success",
            confirmButtonColor: "#1C352D",
          })
          fetchData() // Vuelve a cargar los datos
        } else {
          Swal.fire({
            title: "Error",
            text: response.error || "Hubo un problema al eliminar la válvula",
            icon: "error",
            confirmButtonColor: "#1C352D",
          })
        }
      }
    })
  }

  const getStatusBadge = (valvula: Valvula) => {
    if (valvula.needsMaintenance || valvula.status === "maintenance") {
      return (
        <Badge variant="destructive" className="bg-orange-100 text-orange-800 border-orange-200">
          Mantenimiento
        </Badge>
      )
    }
    if (valvula.isOpen) {
      return (
        <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">
          Regando
        </Badge>
      )
    }
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
        Inactiva
      </Badge>
    )
  }

  const getTypeBadge = (tipo: string) => {
    const typeColors = {
      aspersion: "bg-green-100 text-green-800 border-green-200",
      goteo: "bg-blue-100 text-blue-800 border-blue-200",
      microaspersion: "bg-purple-100 text-purple-800 border-purple-200",
    }

    const typeNames = {
      aspersion: "Aspersión",
      goteo: "Goteo",
      microaspersion: "Microaspersión",
    }

    return (
      <Badge variant="outline" className={typeColors[tipo as keyof typeof typeColors] || "bg-gray-100 text-gray-800"}>
        {typeNames[tipo as keyof typeof typeNames] || tipo}
      </Badge>
    )
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
    <div className="space-y-6 p-6" style={{ backgroundColor: "#F9F6F3", minHeight: "100vh" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#1C352D" }}>
            Gestión de Válvulas
          </h1>
          <p className="text-muted-foreground" style={{ color: "#A6B28B" }}>
            Administra las válvulas del sistema de riego
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              resetForm()
            }
            setIsDialogOpen(open)
          }}
        >
          <DialogTrigger asChild>
            <Button
              className="shadow-lg transition-all duration-300 transform hover:scale-105"
              style={{
                backgroundColor: "#1C352D",
                color: "#F9F6F3",
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Válvula
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold" style={{ color: "#1C352D" }}>
                {editingValvula ? "Editar Válvula" : "Nueva Válvula"}
              </DialogTitle>
              <DialogDescription style={{ color: "#A6B28B" }}>
                {editingValvula ? "Modifica los datos de la válvula" : "Crea una nueva válvula en el sistema"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información básica */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={valvulaFormData.name}
                      onChange={(e) => setValvulaFormData({ ...valvulaFormData, name: e.target.value })}
                      placeholder="Ej: Válvula Norte A1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deviceId">Device ID *</Label>
                    <Input
                      id="deviceId"
                      value={valvulaFormData.deviceId}
                      onChange={(e) => setValvulaFormData({ ...valvulaFormData, deviceId: e.target.value })}
                      placeholder="LORA_XXX"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="finca">Finca *</Label>
                  <Select value={selectedFincaId} onValueChange={setSelectedFincaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar finca" />
                    </SelectTrigger>
                    <SelectContent>
                      {fincas.map((finca) => (
                        <SelectItem key={finca.id} value={finca.id}>
                          {finca.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lote">Lote *</Label>
                    <Select
                      value={valvulaFormData.loteId}
                      onValueChange={(value) => setValvulaFormData({ ...valvulaFormData, loteId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar lote" />
                      </SelectTrigger>
                      <SelectContent>
                        {lotes
                          .filter((lote) => !selectedFincaId || lote.fincaId === selectedFincaId)
                          .map((lote) => (
                            <SelectItem key={lote.id} value={lote.id}>
                              {lote.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo *</Label>
                    <Select
                      value={valvulaFormData.tipo}
                      onValueChange={(value) => setValvulaFormData({ ...valvulaFormData, tipo: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aspersion">Aspersión</SelectItem>
                        <SelectItem value="goteo">Goteo</SelectItem>
                        <SelectItem value="microaspersion">Microaspersión</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="caudal">Caudal (L/min)</Label>
                    <Input
                      id="caudal"
                      type="number"
                      step="0.1"
                      value={valvulaFormData.caudal}
                      onChange={(e) => setValvulaFormData({ ...valvulaFormData, caudal: e.target.value })}
                      placeholder="0.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="presion">Presión (bar)</Label>
                    <Input
                      id="presion"
                      type="number"
                      step="0.1"
                      value={valvulaFormData.presion}
                      onChange={(e) => setValvulaFormData({ ...valvulaFormData, presion: e.target.value })}
                      placeholder="0.0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={valvulaFormData.descripcion}
                    onChange={(e) => setValvulaFormData({ ...valvulaFormData, descripcion: e.target.value })}
                    placeholder="Descripción opcional de la válvula"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    resetForm()
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  style={{
                    backgroundColor: "#1C352D",
                    color: "#F9F6F3",
                  }}
                >
                  {editingValvula ? "Actualizar Válvula" : "Crear Válvula"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card style={{ backgroundColor: "#F9F6F3", borderColor: "#A6B28B" }}>
        <CardHeader>
          <CardTitle style={{ color: "#1C352D" }}>Filtrar por Finca</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedFincaId} onValueChange={setSelectedFincaId}>
            <SelectTrigger>
              <SelectValue placeholder="Todas las fincas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las fincas</SelectItem>
              {fincas.map((finca) => (
                <SelectItem key={finca.id} value={finca.id}>
                  {finca.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabla de válvulas */}
      <Card style={{ backgroundColor: "#F9F6F3", borderColor: "#A6B28B" }}>
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 gap-4">
            <div>
              <CardTitle style={{ color: "#1C352D" }}>Lista de Válvulas</CardTitle>
              <CardDescription style={{ color: "#A6B28B" }}>{totalValvulas} válvulas registradas</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4" style={{ color: "#A6B28B" }} />
              <Input
                placeholder="Buscar válvulas..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full sm:w-64"
                style={{ borderColor: "#A6B28B" }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ backgroundColor: "#A6B28B" }}>
                  <TableHead className="font-semibold min-w-[200px]" style={{ color: "#F9F6F3" }}>
                    Válvula
                  </TableHead>
                  <TableHead className="font-semibold min-w-[120px]" style={{ color: "#F9F6F3" }}>
                    Lote
                  </TableHead>
                  <TableHead className="font-semibold min-w-[100px]" style={{ color: "#F9F6F3" }}>
                    Tipo
                  </TableHead>
                  <TableHead className="font-semibold min-w-[120px]" style={{ color: "#F9B28B" }}>
                    Device ID
                  </TableHead>
                  <TableHead className="font-semibold min-w-[100px]" style={{ color: "#F9F6F3" }}>
                    Estado
                  </TableHead>
                  <TableHead className="font-semibold min-w-[180px]" style={{ color: "#F9F6F3" }}>
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedValvulas.map((valvula, index) => {
                  const lote = lotes.find((l) => l.id === valvula.loteId)
                  const finca = fincas.find((f) => f.id === valvula.fincaId)

                  return (
                    <TableRow
                      key={valvula.id}
                      style={{
                        backgroundColor: index % 2 === 0 ? "#F9F6F3" : "#F5C9B0",
                      }}
                    >
                      <TableCell className="min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: "#1C352D" }}
                          >
                            <Droplets className="h-5 w-5" style={{ color: "#F9F6F3" }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate" style={{ color: "#1C352D" }}>
                              {valvula.name}
                            </div>
                            <div className="text-sm truncate" style={{ color: "#A6B28B" }}>
                              Creado: {valvula.lastActivity ? new Date(valvula.lastActivity).toLocaleDateString() : "N/A"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div style={{ color: "#1C352D" }}>
                          <div className="font-medium truncate">{lote?.name || "N/A"}</div>
                          <div className="text-sm truncate" style={{ color: "#A6B28B" }}>
                            {finca?.name || "N/A"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[100px]">{getTypeBadge(valvula.tipo)}</TableCell>
                      <TableCell className="min-w-[120px]">
                        <code
                          className="text-sm font-mono px-2 py-1 rounded truncate block"
                          style={{ backgroundColor: "#A6B28B", color: "#F9F6F3" }}
                        >
                          {valvula.deviceId || "N/A"}
                        </code>
                      </TableCell>
                      <TableCell className="min-w-[100px]">{getStatusBadge(valvula)}</TableCell>
                      <TableCell className="min-w-[180px]">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(valvula)}
                            style={{
                              borderColor: "#A6B28B",
                              color: "#1C352D",
                            }}
                            className="flex-shrink-0"
                          >
                            <Edit className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Editar</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(valvula)}
                            style={{
                              borderColor: "#F5C9B0",
                              color: "#1C352D",
                            }}
                            className="flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">Eliminar</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {totalValvulas > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalValvulas}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              startItem={startItem}
              endItem={endItem}
            />
          )}

          {totalValvulas === 0 && (
            <div className="text-center py-12">
              <Droplets className="h-16 w-16 mx-auto mb-4" style={{ color: "#A6B28B" }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: "#1C352D" }}>
                No hay válvulas
              </h3>
              <p style={{ color: "#A6B28B" }}>
                {searchTerm
                  ? "No se encontraron válvulas con los filtros aplicados"
                  : "No hay válvulas registradas en el sistema"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
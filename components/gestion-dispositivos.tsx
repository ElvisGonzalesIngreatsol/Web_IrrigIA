"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Cpu, Settings } from "lucide-react"
import { apiService } from "@/lib/api"
import Swal from "sweetalert2"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch" // Asegúrate de tener este componente

interface Device {
    id: string
    deviceEui: string
    nombre: string
    descripcion?: string
    lat?: Float16Array
    lng?: Float16Array
    isActive: boolean
    fincaid: number
    deviceProfile: string
    joinEui: string

}

export function GestionDispositivos() {
    // Paginación y modal de configuración
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [configDevice, setConfigDevice] = useState<Device | null>(null);
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingDevice, setEditingDevice] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        deviceEui: "",
        nombre: "",
        descripcion: "",
        lat: "",
        lng: "",
        isActive: false,
        fincaId: "",
        joinEui: "",
        deviceProfile: "",
    })
    const [fincas, setFincas] = useState<{ id: number; nombre: string }[]>([])
    const [loadingFincas, setLoadingFincas] = useState(false)
    const [fincasError, setFincasError] = useState<string | null>(null)

    // Estado para los switches y campos del modal de configuración
    const [valvulas, setValvulas] = useState([false, false, false, false]);
    const [presiones, setPresiones] = useState([false, false, false, false]);
    const [presionNumeros, setPresionNumeros] = useState(["", "", "", ""]);
    const [sht20, setSht20] = useState(false);
    const [thphs, setThphs] = useState(false);
    const [thphsOpciones, setThphsOpciones] = useState<string[]>([]);

    const opcionesTHPHS = [
        "Temperatura",
        "Humedad",
        "Ph",
        "-S",
        "EC",
        "Salinidad",
        "Nitrogeno",
        "Fosforo",
        "Potasio"
    ];

    const resetForm = () => {
        setFormData({
            deviceEui: "",
            nombre: "",
            descripcion: "",
            lat: "",
            lng: "",
            isActive: false,
            fincaId: "",
            joinEui: "",
            deviceProfile: "",
        })
        setEditingDevice(null)
    }

    const fetchDevices = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await apiService.getDevices?.()
            if (response && response.success) {
                setDevices(response.data.data || [])
            } else {
                setDevices([])
                setError(response?.error || "Error al obtener dispositivos")
            }
        } catch (err: any) {
            setDevices([])
            setError(err?.message || "Error al cargar dispositivos")
        } finally {
            setLoading(false)
        }
    }

    // Cargar fincas solo cuando se abre el modal, con loading y error
    useEffect(() => {
        if (isDialogOpen) {
            setLoadingFincas(true)
            setFincasError(null)
            apiService.getAllFincasFromTodas()
                .then((response) => {
                    // Normalize response: it might be an array already or an object with nested data
                    const data = Array.isArray(response)
                        ? response
                        : ((response as any)?.data?.data ?? (response as any)?.data ?? [])
                    if (Array.isArray(data) && (Array.isArray(response) || (response && (response as any).success))) {
                        setFincas(data)
                    } else {
                        setFincas([])
                        setFincasError("No se pudieron cargar las fincas")
                    }
                })
                .catch(() => {
                    setFincas([])
                    setFincasError("Error al cargar fincas")
                })
                .finally(() => setLoadingFincas(false))
        } else {
            setFincas([])
            setFincasError(null)
        }
    }, [isDialogOpen])

    useEffect(() => {
        fetchDevices()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const payload = {
                deviceEui: formData.deviceEui,
                nombre: formData.nombre,
                descripcion: formData.descripcion || null,
                lat:
                    formData.lat !== null && formData.lat !== undefined && formData.lat !== ""
                        ? parseFloat(String(formData.lat))
                        : null,
                lng:
                    formData.lng !== null && formData.lng !== undefined && formData.lng !== ""
                        ? parseFloat(String(formData.lng))
                        : null,
                isActive: formData.isActive,
                fincaId: formData.fincaId ? Number(formData.fincaId) : null,
                // Fields required by apiService.updateDevice
                joinEui: formData.joinEui,
                deviceProfile: formData.deviceProfile,
                // API expects isDisabled, derive from isActive
                isDisabled: !formData.isActive,
            }

            let response
            if (editingDevice) {
                const updatePayload = {
                    nombre: payload.nombre,
                    descripcion: payload.descripcion === null ? undefined : payload.descripcion,
                    deviceEui: payload.deviceEui,
                    joinEui: payload.joinEui,
                    deviceProfile: payload.deviceProfile,
                    isDisabled: payload.isDisabled,
                }
                response = await apiService.updateDevice?.(editingDevice, updatePayload)
            } else {
                // Crear un payload que respete la firma esperada por createDevice
                const createPayload = {
                    nombre: payload.nombre,
                    descripcion: payload.descripcion === null ? undefined : payload.descripcion,
                    deviceEui: payload.deviceEui,
                    joinEui: payload.joinEui,
                    deviceProfile: payload.deviceProfile,
                    isDisabled: payload.isDisabled,
                }
                response = await apiService.createDevice?.(createPayload)
            }

            if (response && response.success) {
                await Swal.fire({
                    title: editingDevice ? "Dispositivo actualizado" : "Dispositivo creado",
                    icon: "success",
                    confirmButtonColor: "#1C352D",
                })
                setIsDialogOpen(false)
                resetForm()
                fetchDevices()
            } else {
                await Swal.fire({
                    title: "Error",
                    text: response?.error || "No se pudo guardar el dispositivo",
                    icon: "error",
                    confirmButtonColor: "#1C352D",
                })
            }
        } catch (err: any) {
            await Swal.fire({
                title: "Error",
                text: err?.message || "Ocurrió un error al guardar el dispositivo",
                icon: "error",
                confirmButtonColor: "#1C352D",
            })
        }
    }
    const handleEdit = (device: Device) => {
        setFormData({
            nombre: device.nombre,
            descripcion: device.descripcion || "",
            deviceEui: device.deviceEui,
            lat: device.lat !== undefined && device.lat !== null ? String(device.lat) : "",
            lng: device.lng !== undefined && device.lng !== null ? String(device.lng) : "",
            isActive: !!device.isActive,
            fincaId: device.fincaid ? String(device.fincaid) : "",
            joinEui: device.joinEui || "",
            deviceProfile: device.deviceProfile || "",
        })
        setEditingDevice(device.id)
        setIsDialogOpen(true)
    }

    const handleDelete = (device: Device) => {
        Swal.fire({
            title: "¿Estás seguro?",
            text: `Se eliminará el dispositivo "${device.nombre}"`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#1C352D",
            cancelButtonColor: "#A6B28B",
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await apiService.deleteDevice?.(device.id)
                    if (response && response.success) {
                        Swal.fire({
                            title: "¡Eliminado!",
                            text: "El dispositivo ha sido eliminado correctamente",
                            icon: "success",
                            confirmButtonColor: "#1C352D",
                        })
                        fetchDevices()
                    } else {
                        Swal.fire({
                            title: "Error",
                            text: response?.error || "No se pudo eliminar el dispositivo",
                            icon: "error",
                            confirmButtonColor: "#1C352D",
                        })
                    }
                } catch (err: any) {
                    Swal.fire({
                        title: "Error",
                        text: err?.message || "No se pudo eliminar el dispositivo",
                        icon: "error",
                        confirmButtonColor: "#1C352D",
                    })
                }
            }
        })
    }

    // Lógica de paginación
    const totalPages = Math.ceil(devices.length / rowsPerPage);
    const paginatedDevices = devices.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    return (
        <div className="space-y-8 p-6 min-h-screen" style={{ backgroundColor: "#F9F6F3" }}>
            <div className="rounded-xl shadow-sm p-6 border" style={{ backgroundColor: "#F9F6F3", borderColor: "#A6B28B" }}>
                <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: "#1C352D" }}>
                    <Cpu className="h-7 w-7" />
                    Gestión de Dispositivos
                </h1>
                <p className="mt-2" style={{ color: "#1C352D" }}>
                    Administra los dispositivos conectados al sistema.
                </p>
            </div>

            <Card className="shadow-lg border-0" style={{ backgroundColor: "#F9F6F3" }}>
                <CardHeader className="flex flex-row items-center justify-between rounded-t-lg border px-6 py-6 rounded-xl shadow-sm" style={{ backgroundColor: "#F9F6F3" }}>
                    <div>
                        <CardTitle className="flex items-center gap-2 text-[rgba(28,53,45,1)]">
                            <Cpu className="h-5 w-5" />
                            Dispositivos
                        </CardTitle>
                        <CardDescription className="text-[rgba(28,53,45,1)]" style={{ color: "#A6B28B" }}>
                            Lista de dispositivos registrados
                        </CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open) }}>
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
                                Nuevo Dispositivo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold text-gray-800">
                                    {editingDevice ? "Editar Dispositivo" : "Agregar Dispositivo"}
                                </DialogTitle>
                                <DialogDescription className="text-gray-600">
                                    {editingDevice
                                        ? "Modifica los datos del dispositivo"
                                        : "Agrega un nuevo dispositivo al sistema"}
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit}>
                                <div className="grid gap-6 py-4">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="device-nombre" className="text-right font-medium">
                                                Nombre del dispositivo
                                            </Label>
                                            <Input
                                                id="device-nombre"
                                                value={formData.nombre}
                                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                                className="col-span-3 border-2 focus:border-blue-500 transition-colors"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="device-descripcion" className="text-right font-medium">
                                                Descripción
                                            </Label>
                                            <Textarea
                                                id="device-descripcion"
                                                value={formData.descripcion}
                                                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                                className="col-span-3 border-2 focus:border-blue-500 transition-colors"
                                                rows={2}
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="device-eui" className="text-right font-medium">
                                                Device EUI (EUI64)
                                            </Label>
                                            <Input
                                                id="device-eui"
                                                value={formData.deviceEui}
                                                onChange={(e) => setFormData({ ...formData, deviceEui: e.target.value })}
                                                className="col-span-3 border-2 focus:border-blue-500 transition-colors"
                                                required
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="device-lat" className="text-right font-medium">
                                                Latitud
                                            </Label>
                                            <Input
                                                id="device-lat"
                                                type="number"
                                                step="any"
                                                value={formData.lat}
                                                onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                                                className="col-span-3 border-2 focus:border-blue-500 transition-colors"
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="device-lng" className="text-right font-medium">
                                                Longitud
                                            </Label>
                                            <Input
                                                id="device-lng"
                                                type="number"
                                                step="any"
                                                value={formData.lng}
                                                onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                                                className="col-span-3 border-2 focus:border-blue-500 transition-colors"
                                            />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="device-finca" className="text-right font-medium">
                                                Finca
                                            </Label>
                                            <Select
                                                value={formData.fincaId}
                                                onValueChange={(value) => setFormData({ ...formData, fincaId: value })}
                                                disabled={loadingFincas}
                                            >
                                                <SelectTrigger className="col-span-3 border-2 h-12" style={{ borderColor: "#A6B28B" }}>
                                                    <SelectValue placeholder={loadingFincas ? "Cargando fincas..." : fincasError ? fincasError : "Seleccionar finca"}>
                                                        {fincas.length > 0 && formData.fincaId
                                                            ? fincas.find((f) => String(f.id) === formData.fincaId)?.nombre
                                                            : ""}
                                                    </SelectValue>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {loadingFincas && (
                                                        <SelectItem value="__loading" disabled>
                                                            Cargando fincas...
                                                        </SelectItem>
                                                    )}
                                                    {fincasError && (
                                                        <SelectItem value="__error" disabled>
                                                            {fincasError}
                                                        </SelectItem>
                                                    )}
                                                    {!loadingFincas && !fincasError && fincas.length === 0 && (
                                                        <SelectItem value="__empty" disabled>
                                                            No hay fincas disponibles
                                                        </SelectItem>
                                                    )}
                                                    {fincas.map((finca) => (
                                                        <SelectItem key={finca.id} value={String(finca.id)}>
                                                            {finca.nombre}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="device-active" className="text-right font-medium">
                                                ¿Está activo?
                                            </Label>
                                            <input
                                                id="device-active"
                                                type="checkbox"
                                                checked={formData.isActive}
                                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                                className="col-span-3 w-5 h-5"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter className="gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsDialogOpen(false)
                                            resetForm()
                                        }}
                                        className="border-2 hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="shadow-lg transition-all duration-300 transform hover:scale-105"
                                        style={{
                                            backgroundColor: "#1C352D",
                                            color: "#F9F6F3",
                                            borderColor: "#A6B28B",
                                        }}
                                    >
                                        {editingDevice ? "Actualizar Dispositivo" : "Agregar Dispositivo"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent className="p-6">
                    {loading ? (
                        <div className="text-center text-lg text-gray-500 py-8">Cargando dispositivos...</div>
                    ) : error ? (
                        <div className="text-center text-lg text-red-500 py-8">{error}</div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow style={{ borderColor: "#A6B28B" }}>
                                        <TableHead style={{ color: "#1C352D" }}>Nombre</TableHead>
                                        <TableHead style={{ color: "#1C352D" }}>Descripción</TableHead>
                                        <TableHead style={{ color: "#1C352D" }}>Device EUI</TableHead>
                                        <TableHead style={{ color: "#1C352D" }}>Latitud</TableHead>
                                        <TableHead style={{ color: "#1C352D" }}>Longitud</TableHead>
                                        <TableHead style={{ color: "#1C352D" }}>Finca</TableHead>
                                        <TableHead style={{ color: "#1C352D" }}>Estado</TableHead>
                                        <TableHead className="text-center" style={{ color: "#1C352D" }}>Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Array.isArray(paginatedDevices) && paginatedDevices.map((device) => (
                                        <TableRow key={device.id} style={{ borderColor: "#A6B28B" }}>
                                            <TableCell>{device.nombre}</TableCell>
                                            <TableCell>{device.descripcion}</TableCell>
                                            <TableCell>{device.deviceEui}</TableCell>
                                            <TableCell>{device.lat}</TableCell>
                                            <TableCell>{device.lng}</TableCell>
                                            <TableCell>
                                                {Array.isArray(fincas)
                                                    ? fincas.find((f) => f.id === device.fincaid)?.nombre || device.fincaid
                                                    : device.fincaid}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className="text-xs font-medium"
                                                    style={{
                                                        backgroundColor: device.isActive ? "#1C352D" : "#F5C9B0",
                                                        color: device.isActive ? "#F9F6F3" : "#1C352D",
                                                    }}
                                                >
                                                    {device.isActive ? "Activo" : "Deshabilitado"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2 justify-center">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-2 transition-colors bg-transparent text-xs h-8"
                                                        style={{
                                                            borderColor: "#A6B28B",
                                                            color: "#1C352D",
                                                            backgroundColor: "transparent",
                                                        }}
                                                        onClick={() => handleEdit(device)}
                                                    >
                                                        <Edit className="h-3 w-3 mr-1 flex-shrink-0" />
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-2 transition-colors bg-transparent text-xs h-8"
                                                        style={{
                                                            borderColor: "#F5C9B0",
                                                            color: "#1C352D",
                                                            backgroundColor: "transparent",
                                                        }}
                                                        onClick={() => handleDelete(device)}
                                                    >
                                                        <Trash2 className="h-3 w-3 mr-1 flex-shrink-0" />
                                                        Eliminar
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-2 transition-colors bg-transparent text-xs h-8"
                                                        style={{
                                                            borderColor: "#A6B28B",
                                                            color: "#1C352D",
                                                            backgroundColor: "transparent",
                                                        }}
                                                        onClick={() => { setConfigDevice(device); setIsConfigOpen(true); }}
                                                    >
                                                        <Settings className="h-3 w-3 mr-1 flex-shrink-0" />
                                                        Configuración
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {/* Paginación */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">Filas por página:</span>
                                <select
                                  className="border rounded px-2 py-1"
                                  value={rowsPerPage}
                                  onChange={e => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                >
                                  <option value={5}>5</option>
                                  <option value={8}>8</option>
                                  <option value={10}>10</option>
                                </select>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} size="sm">Anterior</Button>
                                <span className="text-sm">Página {currentPage} de {totalPages}</span>
                                <Button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} size="sm">Siguiente</Button>
                              </div>
                            </div>
                            {/* Modal de Configuración */}
                            <Dialog open={isConfigOpen} onOpenChange={(open) => { if (!open) { setIsConfigOpen(false); setConfigDevice(null); } }}>
                                <DialogContent
                                    onInteractOutside={e => e.preventDefault()} // Evita cerrar por click fuera
                                    onEscapeKeyDown={e => e.preventDefault()} // Evita cerrar con ESC
                                    className="max-w-3xl w-full"
                            >
                                <DialogHeader>
                                    <DialogTitle>Configuración de Dispositivo</DialogTitle>
                                    <DialogDescription>
                                        Configura el dispositivo <b>{configDevice?.nombre}</b>
                                    </DialogDescription>
                                </DialogHeader>
                                {/* NUEVO CONTENIDO VISUAL RESPONSIVO */}
                                <div className="flex flex-col gap-8 py-4 w-full">
                                    {/* Válvulas */}
                                    <div>
                                        <span className="font-semibold">Válvulas</span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-2 w-full">
                                            {[1,2,3,4].map((n, i) => (
                                                <div key={n} className="flex items-center gap-3 bg-[#F9F6F3] rounded-lg p-3 border border-[#A6B28B]">
                                                    <Label className="flex-1 min-w-[80px]">Válvula {n}</Label>
                                                    <Switch checked={valvulas[i]} onCheckedChange={v => setValvulas(valvulas.map((val, idx) => idx === i ? v : val))} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Presiones */}
                                    <div>
                                        <span className="font-semibold">Presiones</span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-2 w-full">
                                            {[1,2,3,4].map((n, i) => (
                                                <div key={n} className="flex flex-col gap-2 bg-[#F9F6F3] rounded-lg p-3 border border-[#A6B28B]">
                                                    <div className="flex items-center gap-3">
                                                        <Label className="flex-1 min-w-[80px]">Presión {n}</Label>
                                                        <Switch checked={presiones[i]} onCheckedChange={v => setPresiones(presiones.map((val, idx) => idx === i ? v : val))} />
                                                    </div>
                                                    <Input
                                                        type="number"
                                                        maxLength={3}
                                                        value={presionNumeros[i]}
                                                        onChange={e => {
                                                            const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                                                            setPresionNumeros(presionNumeros.map((num, idx) => idx === i ? val : num));
                                                        }}
                                                        className="w-full mt-1"
                                                        placeholder="###"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* SHT20 */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                        <Label className="w-24">SHT20</Label>
                                        <Switch checked={sht20} onCheckedChange={setSht20} />
                                    </div>
                                    {/* THPH-S */}
                                    <div>
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                            <Label className="w-24">THPH-S</Label>
                                            <Switch checked={thphs} onCheckedChange={setThphs} />
                                        </div>
                                        {thphs && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2 ml-0 sm:ml-6">
                                                {opcionesTHPHS.map(op => (
                                                    <label key={op} className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={thphsOpciones.includes(op)}
                                                            onChange={e => {
                                                                if (e.target.checked) {
                                                                    setThphsOpciones([...thphsOpciones, op]);
                                                                } else {
                                                                    setThphsOpciones(thphsOpciones.filter(o => o !== op));
                                                                }
                                                            }}
                                                        />
                                                        <span>{op}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <DialogFooter className="gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => { setIsConfigOpen(false); setConfigDevice(null); }}
                                        className="border-2 hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="button"
                                        className="shadow-lg transition-all duration-300 transform hover:scale-105"
                                        style={{ backgroundColor: "#1C352D", color: "#F9F6F3", borderColor: "#A6B28B" }}
                                        onClick={() => { setIsConfigOpen(false); setConfigDevice(null); }}
                                    >
                                        Guardar
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}


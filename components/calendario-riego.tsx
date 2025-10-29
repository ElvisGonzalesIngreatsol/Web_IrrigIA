"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { apiService } from "@/lib/api"
import { useData } from "@/contexts/data-context"
import { useAuth } from "@/contexts/auth-context"
import { useNotifications } from "./notification-system"
import { Calendar, Plus, Loader2, Edit, Trash2, Play, ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react"
import Swal from "sweetalert2"

export function CalendarioRiego() {
  const { schedules, fincas, addSchedule, updateSchedule, deleteSchedule } = useData()
  const { user } = useAuth()
  const { addNotification } = useNotifications()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedFinca, setSelectedFinca] = useState("")
  const [selectedLote, setSelectedLote] = useState("")
  // Agregar la nueva vista semanal
  const [viewMode, setViewMode] = useState<"calendar" | "list" | "week">("calendar")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [newSchedule, setNewSchedule] = useState({
    nombre: "",
    loteId: "",
    valvulaIds: [] as string[],
    startDate: "",
    startTime: "",
    duration: 30,
    frequency: "once" as "once" | "weekly_range" | "everyday" | "weekly_weekday",
    endDate: "",
    selectedWeekday: "",
    isActive: true,
  })
  const [fincasData, setFincasData] = useState<any[]>([])
  const [lotesData, setLotesData] = useState<any[]>([])
  const [valvulasData, setValvulasData] = useState<any[]>([])
  const [selectedFincaId, setSelectedFincaId] = useState<string>("")
  const [selectedLoteId, setSelectedLoteId] = useState<string>("")
  const [loadingFincas, setLoadingFincas] = useState(false)
  const [loadingLotes, setLoadingLotes] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null)
  const [submittingSchedules, setSubmittingSchedules] = useState(false)

  // Función para generar las horas del día (1 AM a 11 PM)
  const generateHourLabels = () => {
    const hours = []
    for (let i = 0; i < 24; i++) {
      hours.push(`${i}:00`)
    }
    return hours
  }

  // Función para obtener los días de la semana actual
  const getWeekDays = () => {
    const days = []
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()) // Comenzar desde el domingo

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    return days
  }

  // Función para obtener los programas de riego para un día específico
  const getSchedulesForDay = (date: Date) => {
    return schedules.filter((schedule) => {
      const scheduleDate = new Date(schedule.nextExecution)
      return scheduleDate.toDateString() === date.toDateString()
    })
  }

  // Función para obtener la posición y altura del evento en la grilla
  const getEventPosition = (startTime: string) => {
    const [hours, minutes] = startTime.split(":").map(Number)
    const topPosition = (hours * 60 + minutes) * (100 / 1440) // (minutos desde medianoche * altura por minuto)
    return `${topPosition}%`
  }

  // Función para navegar entre semanas
  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setDate(prev.getDate() - 7)
      } else {
        newDate.setDate(prev.getDate() + 7)
      }
      return newDate
    })
  }

  // 1. Cargar fincas al montar el componente
  useEffect(() => {
    setLoadingFincas(true)
    apiService.getAllFincas()
      .then((resp) => {
        // Normalizar la carga: el servicio puede devolver directamente un array o un objeto con la propiedad `data`.
        const payload: any = (resp && typeof resp === "object" && "data" in resp) ? (resp as any).data : resp
        const rawFincas =
          Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : []
        // Asegurar id como string y normalizar campos básicos
        const fincasArr = rawFincas.map((f: any) => ({
          ...f,
          id: f.id != null ? String(f.id) : f.id,
          nombre: f.nombre ?? f.name,
          location: f.location ?? f.ubicacion ?? f.address,
          // mantener lotes si vienen embebidos; si no, se cargarán al seleccionar la finca
          lotes: Array.isArray(f.lotes) ? f.lotes : undefined,
        }))
        setFincasData(fincasArr)
        // Si es usuario cliente con 1 finca asignada, seleccionar automáticamente (dispara carga de lotes)
        if (user?.role === "USER" && fincasArr.length === 1 && !selectedFinca) {
          setSelectedFinca(fincasArr[0].id)
        }
      })
      .finally(() => setLoadingFincas(false))
  }, [])

  // 2. Cargar lotes cuando se selecciona una finca (igual que en control de válvulas)
  useEffect(() => {
    if (!selectedFinca) {
      setLotesData([])
      setSelectedLote("")
      return
    }
    setLoadingLotes(true)
    apiService.request(`/api/lotes/all/${selectedFinca}`)
      .then((resp) => {
        // Normalizar la respuesta: puede venir como array directo o como { data: { data: [...] } } u otras variantes.
        const payload: any = (resp && typeof resp === "object" && "data" in resp) ? (resp as any).data : resp
        const lotesArr =
          Array.isArray(payload?.data)
            ? payload.data
            : Array.isArray(payload)
              ? payload
              : []
        setLotesData(lotesArr)
      })
      .finally(() => setLoadingLotes(false))
    setSelectedLote("")
  }, [selectedFinca])

  const userFincas = useMemo(() => {
    if (user?.role === "ADMIN") {
      return fincasData
    }

    // Comparar ids como strings para evitar mismatch number/string
    const assignedFincas = (() => {
      if (user?.fincaIds && Array.isArray(user.fincaIds)) {
        const userIds = user.fincaIds.map((id: any) => String(id))
        return fincasData.filter((f) => userIds.includes(String(f.id)))
      }
      if (user?.fincaId != null) {
        const uid = String(user.fincaId)
        return fincasData.filter((f) => String(f.id) === uid)
      }
      return []
    })()

    return assignedFincas
  }, [fincasData, user])

  const autoSelectedFinca = useMemo(() => {
    if (user?.role === "USER" && userFincas.length === 1) {
      return userFincas[0].id
    }
    return selectedFinca
  }, [user, userFincas, selectedFinca])

  // 2. Cargar lotes de la finca seleccionada
  useEffect(() => {
    // Usa el valor correcto para el combo de finca
    const fincaId = selectedFinca || autoSelectedFinca
    if (!fincaId) {
      setLotesData([])
      setSelectedLote("")
      return
    }
    // Busca la finca seleccionada en fincasData y toma sus lotes directamente
    let fincaObj = fincasData.find((f) => String(f.id) === String(fincaId))

    // Si no encuentra, intenta buscar por nombre (por si el id no está bien)
    if (!fincaObj && fincasData.length > 0) {
      fincaObj = fincasData.find((f) => String(f.nombre) === String(fincaId))
    }
    if (fincaObj && Array.isArray(fincaObj.lotes) && fincaObj.lotes.length > 0) {
      setLotesData(fincaObj.lotes)
    } else {
      // Si no trae lotes embebidos, pedir al backend
      setLoadingLotes(true)
      apiService.request(`/api/lotes/all/${String(fincaId)}`)
        .then((resp) => {
          const payload: any = (resp && typeof resp === "object" && "data" in resp) ? (resp as any).data : resp
          const lotesArr =
            Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload)
                ? payload
                : []
          // Normalizar ids a string
          const normalizedLotes = lotesArr.map((l: any) => ({ ...l, id: l.id != null ? String(l.id) : l.id }))
          setLotesData(normalizedLotes)
        })
        .catch(() => setLotesData([]))
        .finally(() => setLoadingLotes(false))
    }
    setSelectedLote("")
  }, [selectedFinca, autoSelectedFinca, fincasData])

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const current = new Date(startDate)

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const getSchedulesForDate = (date: Date) => {
    return schedules.filter((schedule) => {
      const scheduleDate = new Date(schedule.nextExecution)
      return scheduleDate.toDateString() === date.toDateString() && schedule.isActive
    })
  }

  const getScheduleColor = (schedule: any, index: number) => {
    const colors = [
      "bg-blue-500", // Primary irrigation
      "bg-green-500", // Completed irrigation
      "bg-orange-500", // Maintenance
      "bg-purple-500", // Special programs
      "bg-red-500", // Emergency/alerts
    ]
    return colors[index % colors.length]
  }

  const selectedFincaData = fincasData.find((f: any) => f.id === autoSelectedFinca)
  const availableLotes = selectedFincaData?.lotes || []
  const selectedLoteData = availableLotes.find((l: any) => l.id === selectedLote)
  const availableValvulas = selectedLoteData?.valvulas || []

  useEffect(() => {
    if (user?.role === "USER" && userFincas.length === 1 && availableLotes.length > 0 && !selectedLote) {
      const firstLote = availableLotes[0]
      setSelectedLote(firstLote.id)
      setNewSchedule((prev) => ({ ...prev, loteId: firstLote.id }))
    }
  }, [user, userFincas, availableLotes, selectedLote])

  // Si el usuario cambia la fecha de inicio y la frecuencia es semanal por día, preseleccionar el día
  useEffect(() => {
    if (newSchedule.frequency === "weekly_weekday" && newSchedule.startDate && !newSchedule.selectedWeekday) {
      const d = new Date(newSchedule.startDate)
      setNewSchedule((prev) => ({ ...prev, selectedWeekday: String(d.getDay()) }))
    }
  }, [newSchedule.frequency, newSchedule.startDate, newSchedule.selectedWeekday])

  // Protege el acceso a lotes y válvulas para evitar errores si no existen
  const allValvulas = Array.isArray(fincasData)
    ? fincasData.flatMap((finca: any) =>
      Array.isArray(finca.lotes)
        ? finca.lotes.flatMap((lote: any) =>
          Array.isArray(lote.valvulas)
            ? lote.valvulas.map((valvula: any) => ({
              ...valvula,
              lotenombre: lote.nombre,
              fincanombre: finca.nombre,
            }))
            : []
        )
        : []
    )
    : []

  const handleAddSchedule = async () => {
    if (
      !newSchedule.loteId ||
      newSchedule.valvulaIds.length === 0 ||
      !newSchedule.startTime ||
      !newSchedule.startDate
    ) {
      addNotification({
        type: "error",
        title: "Error",
        message: "Por favor completa todos los campos requeridos incluyendo fecha y al menos una válvula",
        duration: 3000,
      })
      return
    }

    const [year, month, day] = newSchedule.startDate.split("-").map(Number)
    const [hours, minutes] = newSchedule.startTime.split(":").map(Number)
    const nextExecutionDate = new Date(year, month - 1, day, hours, minutes, 0, 0)

    if (nextExecutionDate < new Date()) {
      addNotification({
        type: "error",
        title: "Error",
        message: "La fecha y hora seleccionada debe ser futura",
        duration: 3000,
      })
      return
    }

    setSubmittingSchedules(true)
    try {
      const loteInfo = lotesData.find((l) => l.id?.toString() === (newSchedule.loteId || selectedLote)?.toString())
      
      // Determinar endDate y weekdays según la frecuencia
      let endDateIso: string | undefined = undefined
      const startDateObj = new Date(newSchedule.startDate)
      if (newSchedule.frequency === "weekly_range") {
        // por defecto la semana completa: 7 días desde la fecha seleccionada
        const end = new Date(startDateObj)
        end.setDate(end.getDate() + 6)
        endDateIso = end.toISOString()
      } else if (newSchedule.frequency === "everyday" || newSchedule.frequency === "weekly_weekday") {
        if (!newSchedule.endDate) {
          throw new Error("Por favor selecciona una fecha de vencimiento para la frecuencia elegida")
        }
        endDateIso = new Date(newSchedule.endDate).toISOString()
      }

      const weekdays = newSchedule.frequency === "weekly_weekday"
        ? (newSchedule.selectedWeekday ? [Number(newSchedule.selectedWeekday)] : [startDateObj.getDay()])
        : undefined

      // Crear un único payload con todas las válvulas
      const schedulePayload: any = {
        nombre: newSchedule.nombre || `${loteInfo?.nombre || "Lote"} - Programa múltiple`,
        loteId: Number(newSchedule.loteId),
        valvulaIds: newSchedule.valvulaIds.map(id => Number(id)), // Array de IDs de válvulas
        startDate: newSchedule.startDate,
        startTime: newSchedule.startTime,
        duration: newSchedule.duration,
        frequency: newSchedule.frequency,
        isActive: newSchedule.isActive,
        nextExecution: nextExecutionDate.toISOString(),
        endDate: endDateIso,
        weekdays,
      }

      // Enviar un solo request al backend
      const response = await apiService.request("/api/riego/programar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedulePayload),
      })

      if (response && (response as any).success === true) {
        const respAny: any = response
        const created = respAny?.data ?? respAny?.data?.data ?? schedulePayload

        // Añadir el programa al estado local
        try {
          addSchedule(created)
          addNotification({
            type: "success",
            title: "Programa creado",
            message: `Se ha creado el programa de riego para ${newSchedule.valvulaIds.length} válvulas correctamente`,
            duration: 3000,
          })

          // limpieza y cierre del modal
          setNewSchedule({
            nombre: "",
            loteId: "",
            valvulaIds: [],
            startDate: "",
            startTime: "",
            duration: 30,
            frequency: "once",
            endDate: "",
            selectedWeekday: "",
            isActive: true,
          })
          setSelectedFinca("")
          setSelectedLote("")
          setShowAddDialog(false)
        } catch (error) {
          console.error("Error al añadir el programa al estado:", error)
          addNotification({
            type: "error",
            title: "Error al crear programa",
            message: "Hubo un error al crear el programa en el estado local",
            duration: 6000,
          })
        }
      }
    } catch (err) {
      console.error("Error al programar riego:", err)
      addNotification({
        type: "error",
        title: "Error de conexión",
        message: err instanceof Error ? err.message : "No se pudo conectar al servidor",
        duration: 4000,
      })
    } finally {
      setSubmittingSchedules(false)
    }
  }

  const handleFincaChange = (fincaId: string) => {
    setSelectedFinca(fincaId)
    setSelectedLote("")
    setNewSchedule((prev) => ({ ...prev, loteId: "", valvulaIds: [] }))
  }

  const handleLoteChange = (loteId: string) => {
    setSelectedLote(loteId)
    const loteInfo = lotesData.find(l => l.id?.toString() === loteId)
    setNewSchedule((prev) => ({ 
      ...prev, 
      loteId, 
      valvulaIds: [],
      nombre: loteInfo ? `Riego ${loteInfo.nombre}` : ""
    }))
  }

  const handleValvulaToggle = (valvulaId: string, checked: boolean) => {
    setNewSchedule((prev) => ({
      ...prev,
      valvulaIds: checked ? [...prev.valvulaIds, valvulaId] : prev.valvulaIds.filter((id) => id !== valvulaId),
    }))
  }

  const handleSelectAllValvulas = (selectAll: boolean) => {
    setNewSchedule((prev) => ({
      ...prev,
      valvulaIds: selectAll ? availableValvulas.map((v: any) => v.id) : [],
    }))
  }

  const getValvulaInfo = (valvulaId: string | number) => {
    const idStr = valvulaId != null ? valvulaId.toString() : ""
    return allValvulas.find((v) => v.id?.toString() === idStr)
  }

  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case "once":
        return "Una vez"
      case "weekly_range":
        return "Semanal (7 días)"
      case "everyday":
        return "Cada día"
      case "weekly_weekday":
        return "Cada semana (día seleccionado)"
      // legacy / compat
      case "daily":
        return "Diario"
      case "weekly":
        return "Semanal"
      case "custom":
        return "Personalizado"
      default:
        return frequency
    }
  }

  const filteredSchedules = useMemo(() => {
    if (user?.role === "ADMIN") {
      return schedules
    }

    // For client users, only show schedules from their assigned fincas
    const userFincaIds = userFincas.map((f: any) => f.id)
    return schedules.filter((schedule) => {
      const valvulaInfo = getValvulaInfo(schedule.valvulaId)
      return (
        valvulaInfo &&
        userFincaIds.some((fincaId: any) => {
          const finca = fincasData.find((f: any) => f.id === fincaId)
          // protege si no hay lotes o la estructura no es la esperada
          if (!finca || !Array.isArray(finca.lotes)) return false
          return finca.lotes.some((l: any) => {
            // protege si l.valvulas no es un array
            if (!l || !Array.isArray(l.valvulas)) return false
            return l.valvulas.some((v: any) => v.id === schedule.valvulaId)
          })
        })
      )
    })
  }, [schedules, user, userFincas, fincasData])

  const activeSchedules = filteredSchedules.filter((s) => s.isActive).length
  const totalSchedules = filteredSchedules.length

  const monthNames = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ]

  const dayNames = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"]

  const handleToggleSchedule = (scheduleId: string | number, checked: boolean) => {
    updateSchedule(String(scheduleId), { isActive: checked })
    addNotification({
      type: "success",
      title: "Programa Actualizado",
      message: `El programa de riego ha sido ${checked ? "activado" : "desactivado"} exitosamente`,
      duration: 3000,
    })
  }

  const handleDeleteSchedule = (scheduleId: string) => {
    deleteSchedule(scheduleId)
    addNotification({
      type: "success",
      title: "Programa Eliminado",
      message: "El programa de riego ha sido eliminado exitosamente",
      duration: 3000,
    })
  }

  // Función para abrir el modal de edición
  const openEditSchedule = (schedule: any) => {
    setEditingSchedule(schedule)
    setShowAddDialog(true)
    setSelectedFinca(schedule.fincaId?.toString() || "")
    setSelectedLote(schedule.loteId?.toString() || "")
    setNewSchedule({
      nombre: schedule.nombre || "",
      loteId: schedule.loteId?.toString() || "",
      valvulaIds: [schedule.valvulaId?.toString()],
      startDate: schedule.startDate || "",
      startTime: schedule.startTime || "",
      duration: schedule.duration || 30,
      frequency: schedule.frequency || "once",
      endDate: schedule.endDate || "",
      selectedWeekday: schedule.weekdays && Array.isArray(schedule.weekdays) && schedule.weekdays.length > 0 ? String(schedule.weekdays[0]) : (schedule.selectedWeekday ? String(schedule.selectedWeekday) : ""),
      isActive: schedule.isActive ?? true,
    })
  }

  // Función para eliminar con confirmación
  const confirmDeleteSchedule = (scheduleId: string | number) => {
    Swal.fire({
      title: "¿Eliminar programa?",
      text: "¿Estás seguro que deseas eliminar este programa de riego?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#1C352D",
      cancelButtonColor: "#A6B28B",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then((result) => {
      if (result.isConfirmed) {
        handleDeleteSchedule(String(scheduleId))
      }
    })
  }

  // Cargar válvulas del lote seleccionado
  useEffect(() => {
    if (!selectedLote) {
      setValvulasData([])
      return
    }
    // Busca el lote en lotesData y toma sus válvulas
    const loteObj = lotesData.find((l) => l.id?.toString() === selectedLote?.toString())
    if (loteObj && Array.isArray(loteObj.valvulas) && loteObj.valvulas.length > 0) {
      setValvulasData(loteObj.valvulas)
    } else {
      // Si no tiene valvulas, intenta cargar por API (por si el backend no las incluye en el lote)
      apiService.request(`/api/valvulas/lote/${selectedLote}`)
        .then((resp) => {
          // Normalizar la respuesta: puede venir como array directo o como { data: { data: [...] } } u otras variantes.
          const payload: any = (resp && typeof resp === "object" && "data" in resp) ? (resp as any).data : resp
          const valvulasArr =
            Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload)
                ? payload
                : []
          setValvulasData(valvulasArr)
        })
        .catch(() => setValvulasData([]))
    }
  }, [selectedLote, lotesData])

  // Función para limpiar todos los campos y selecciones del formulario
  const resetScheduleForm = () => {
    setSelectedFinca("")
    setSelectedLote("")
    setValvulasData([])
    setNewSchedule({
      nombre: "",
      loteId: "",
      valvulaIds: [],
      startDate: "",
      startTime: "",
      duration: 30,
      frequency: "once",
      endDate: "",
      selectedWeekday: "",
      isActive: true,
    })
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-[rgba(28,53,45,1)] leading-tight">
            {user?.role === "USER" ? "Mi Calendario de Riego" : "Calendario de Riego"}
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            {user?.role === "USER"
              ? "Visualiza y gestiona los horarios de riego de tu finca"
              : "Programa y gestiona los horarios de riego automático"}
          </p>
          {user?.role === "USER" && userFincas.length === 1 && (
            <div className="mt-3 flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-[rgba(166,178,139,0.1)] text-[rgba(28,53,45,1)] border-[rgba(166,178,139,1)] px-4 py-2"
              >
                📍 {userFincas[0].name} - {userFincas[0].location}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <div className="flex rounded-lg border p-1 bg-[rgba(166,178,139,1)]">
            <Button
              className="px-4 py-2"
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Mes
            </Button>
            <Button
              className="px-4 py-2"
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
            >
              {/* Puedes cambiar el ícono por uno más representativo si lo deseas */}
              <CalendarDays className="h-4 w-4 mr-2" />
              Semanal
            </Button>
            <Button
              className="px-4 py-2"
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4 mr-2" />
              Lista
            </Button>
          </div>

          {/* Dialog de edición/creación de programa */}
          <Dialog
            open={showAddDialog}
            onOpenChange={(open) => {
              if (!open) {
                resetScheduleForm()
                setEditingSchedule(null)
              }
              setShowAddDialog(open)
            }}
          >
            <DialogTrigger asChild>
              <Button className="px-6 py-2">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Programa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl p-0 flex flex-col max-h-[90vh]">
              <div className="flex-1 overflow-y-auto p-8">
                <DialogHeader className="space-y-3">
                  <DialogTitle className="text-xl font-semibold">Nuevo Programa de Riego</DialogTitle>
                  <DialogDescription className="text-base">
                    Configura un nuevo programa de riego automático
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="nombre" className="text-sm font-medium">
                    Nombre del Programa
                  </Label>
                  <Input
                    id="nombre"
                    value={newSchedule.nombre}
                    onChange={(e) => setNewSchedule((prev) => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Nombre del programa de riego"
                    className="h-11"
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  {(user?.role === "ADMIN" || userFincas.length > 1) && (
                    <div className="space-y-3">
                      <Label htmlFor="finca" className="text-sm font-medium">
                        Finca
                      </Label>
                      <Select value={autoSelectedFinca} onValueChange={handleFincaChange}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Selecciona una finca" />
                        </SelectTrigger>
                        <SelectContent>
                          {userFincas.map((finca) => (
                            <SelectItem key={finca.id} value={finca.id} className="py-3">
                              {finca.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {user?.role === "USER" && userFincas.length === 1 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Finca</Label>
                      <div className="p-3 bg-muted rounded-md text-sm font-medium">{userFincas[0].nombre}</div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label htmlFor="lote" className="text-sm font-medium">
                      Lote
                    </Label>
                    <Select value={selectedLote} onValueChange={handleLoteChange} disabled={loadingLotes || lotesData.length === 0}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={loadingLotes ? "Cargando lotes..." : "Selecciona un lote"} />
                      </SelectTrigger>
                      <SelectContent>
                        {lotesData.map((lote) => (
                          <SelectItem key={lote.id?.toString()} value={lote.id?.toString()} className="py-3">
                            {lote.nombre} {lote.cropType ? `- ${lote.cropType}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {valvulasData.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Seleccionar Válvulas</Label>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setNewSchedule((prev) => ({
                            ...prev,
                            valvulaIds: valvulasData.map((v) => v.id)
                          }))}
                          className="px-4 py-2"
                        >
                          Seleccionar Todas
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setNewSchedule((prev) => ({
                            ...prev,
                            valvulaIds: []
                          }))}
                          className="px-4 py-2"
                        >
                          Deseleccionar Todas
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-h-48 overflow-y-auto border rounded-lg p-4">
                      {valvulasData.map((valvula) => (
                        <div key={valvula.id} className="flex items-center space-x-3 p-3 hover:bg-muted/50 rounded-md">
                          <input
                            type="checkbox"
                            id={`valvula-${valvula.id}`}
                            checked={newSchedule.valvulaIds.includes(valvula.id)}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setNewSchedule((prev) => ({
                                ...prev,
                                valvulaIds: checked
                                  ? [...prev.valvulaIds, valvula.id]
                                  : prev.valvulaIds.filter((id) => id !== valvula.id)
                              }))
                            }}
                            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`valvula-${valvula.id}`}
                            className="flex-1 text-sm font-medium cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <span>{valvula.nombre || valvula.name}</span>
                              
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      {newSchedule.valvulaIds.length} de {valvulasData.length} válvulas seleccionadas
                    </div>
                  </div>
                )}

                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-3">
                    <Label htmlFor="startDate" className="text-sm font-medium">
                      Fecha de Inicio
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newSchedule.startDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setNewSchedule((prev) => ({ ...prev, startDate: e.target.value }))}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="startTime" className="text-sm font-medium">
                      Hora de Inicio
                    </Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={newSchedule.startTime}
                      onChange={(e) => setNewSchedule((prev) => ({ ...prev, startTime: e.target.value }))}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="duration" className="text-sm font-medium">
                      Duración (minutos)
                    </Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      max="180"
                      value={newSchedule.duration}
                      onChange={(e) =>
                        setNewSchedule((prev) => ({ ...prev, duration: Number.parseInt(e.target.value) }))
                      }
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="frequency" className="text-sm font-medium">
                      Frecuencia
                    </Label>
                    <Select
                      value={newSchedule.frequency}
                      onValueChange={(value: string) =>
                        setNewSchedule((prev) => ({ ...prev, frequency: value as any }))
                      }
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once" className="py-3">
                          Diario (Una vez)
                        </SelectItem>
                        <SelectItem value="weekly_range" className="py-3">
                          Semanal (7 días)
                        </SelectItem>
                        <SelectItem value="everyday" className="py-3">
                          Cada día (con vencimiento)
                        </SelectItem>
                        <SelectItem value="weekly_weekday" className="py-3">
                          Cada semana - Día seleccionado (vencimiento)
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Campos condicionales según la frecuencia seleccionada */}
                    {(newSchedule.frequency === "everyday" || newSchedule.frequency === "weekly_weekday") && (
                      <div className="mt-5 grid gap-5 md:grid-cols-2">
                        <div className="space-y-5">
                          <Label htmlFor="endDate" className="text-sm font-medium">
                            Fecha de vencimiento
                          </Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={newSchedule.endDate}
                            min={newSchedule.startDate || new Date().toISOString().split("T")[0]}
                            onChange={(e) => setNewSchedule((prev) => ({ ...prev, endDate: e.target.value }))}
                            className="h-11"
                          />
                        </div>

                        {newSchedule.frequency === "weekly_weekday" && (
                          <div className="space-y-3">
                            <Label htmlFor="weekday" className="text-sm font-medium">Día de la semana</Label>
                            <Select
                              value={newSchedule.selectedWeekday}
                              onValueChange={(v: string) => setNewSchedule((prev) => ({ ...prev, selectedWeekday: v }))}
                            >
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder="Selecciona día" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">Domingo</SelectItem>
                                <SelectItem value="1">Lunes</SelectItem>
                                <SelectItem value="2">Martes</SelectItem>
                                <SelectItem value="3">Miércoles</SelectItem>
                                <SelectItem value="4">Jueves</SelectItem>
                                <SelectItem value="5">Viernes</SelectItem>
                                <SelectItem value="6">Sábado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 pt-8">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={newSchedule.isActive}
                      onChange={(e) => setNewSchedule((prev) => ({ ...prev, isActive: e.target.checked }))}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <Label htmlFor="isActive" className="cursor-pointer text-sm font-medium">
                      Activar programa inmediatamente
                    </Label>
                  </div>
                </div>
              </div>
              </div>
              <DialogFooter className="gap-3 p-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    resetScheduleForm()
                    setShowAddDialog(false)
                    setEditingSchedule(null)
                  }}
                  className="px-6 py-2"
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddSchedule} className="px-6 py-2" disabled={submittingSchedules}>
                  {submittingSchedules ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      {editingSchedule ? "Actualizar Programa" : "Crear Programa"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {user?.role === "USER" ? "Mis Programas Activos" : "Programas Activos"}
            </CardTitle>
            <Play className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-green-600 mb-2">{activeSchedules}</div>
            <p className="text-sm text-muted-foreground">de {totalSchedules} programas totales</p>
          </CardContent>
        </Card>

        <Card className="p-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">Próxima Ejecución</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              {user?.role === "USER" ? "Tu próximo riego programado" : "Verifica la próxima ejecución programada"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {filteredSchedules.filter((s) => s.isActive).length > 0
                ? new Date(
                  Math.min(...filteredSchedules.filter((s) => s.isActive).map((s) => s.nextExecution.getTime())),
                ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "--:--"}
            </div>
            <p className="text-sm text-muted-foreground">siguiente riego programado</p>
          </CardContent>
        </Card>
      </div>

      {viewMode === "week" && (
        <Card className="p-1">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Button variant="outline" size="sm" onClick={goToToday} className="px-4 py-2 bg-transparent">
                  Hoy
                </Button>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")} className="p-2">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-semibold">
                    {`${getWeekDays()[0].toLocaleDateString('es', { month: 'short', day: 'numeric' })} - ${getWeekDays()[6].toLocaleDateString('es', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => navigateWeek("next")} className="p-2">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex">
              {/* Columna de horas */}
              <div className="w-20 border-r">
                <div className="h-12"></div> {/* Espacio para el header de días */}
                {generateHourLabels().map((hour) => (
                  <div key={hour} className="h-12 border-b text-xs text-muted-foreground pr-2 text-right">
                    {hour}
                  </div>
                ))}
              </div>

              {/* Grilla de días y eventos */}
              <div className="flex-1 relative">
                <div className="grid grid-cols-7">
                  {/* Headers de días */}
                  {getWeekDays().map((day, index) => (
                    <div
                      key={index}
                      className={`h-12 border-b border-r p-2 text-center ${
                        day.toDateString() === new Date().toDateString() ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="text-sm font-medium">
                        {day.toLocaleDateString('es', { weekday: 'short' }).toUpperCase()}
                      </div>
                      <div className={`text-2xl ${
                        day.toDateString() === new Date().toDateString() ? "text-blue-600" : ""
                      }`}>
                        {day.getDate()}
                      </div>
                    </div>
                  ))}

                  {/* Celdas de horas para cada día */}
                  {getWeekDays().map((day, dayIndex) => (
                    <div key={dayIndex} className="relative">
                      {generateHourLabels().map((hour, hourIndex) => (
                        <div
                          key={`${dayIndex}-${hourIndex}`}
                          className="h-12 border-b border-r hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setShowAddDialog(true)
                            const [h] = hour.split(':')
                            const newDate = new Date(day)
                            newDate.setHours(parseInt(h), 0, 0)
                            setNewSchedule(prev => ({
                              ...prev,
                              startDate: newDate.toISOString().split('T')[0],
                              startTime: `${h.padStart(2, '0')}:00`
                            }))
                          }}
                        ></div>
                      ))}

                      {/* Renderizar programas de riego */}
                      {getSchedulesForDay(day).map((schedule, index) => {
                        const valvulaInfo = getValvulaInfo(schedule.valvulaId)
                        return (
                          <div
                            key={schedule.id}
                            className="absolute left-0 right-1 p-1 rounded text-white text-xs"
                            style={{
                              top: getEventPosition(schedule.startTime),
                              height: `${(schedule.duration / 15)}%`,
                              backgroundColor: getScheduleColor(schedule, index),
                              zIndex: 10
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              Swal.fire({
                                title: "Programa de Riego",
                                html: `
                                  <div style='text-align:left'>
                                    <b>Válvula:</b> ${valvulaInfo?.nombre || valvulaInfo?.name}<br/>
                                    <b>Hora:</b> ${schedule.startTime}<br/>
                                    <b>Duración:</b> ${schedule.duration} min<br/>
                                  </div>
                                `,
                                showCancelButton: true,
                                showDenyButton: true,
                                confirmButtonText: "Editar",
                                denyButtonText: "Eliminar",
                                cancelButtonText: "Cerrar",
                                confirmButtonColor: "#1C352D",
                                denyButtonColor: "#F5C9B0",
                              }).then((result) => {
                                if (result.isConfirmed) {
                                  openEditSchedule(schedule)
                                } else if (result.isDenied) {
                                  confirmDeleteSchedule(schedule.id)
                                }
                              })
                            }}
                          >
                            {valvulaInfo?.nombre || valvulaInfo?.name}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === "calendar" && (
        <Card className="p-1">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <Button variant="outline" size="sm" onClick={goToToday} className="px-4 py-2 bg-transparent">
                  Hoy
                </Button>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")} className="p-2">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="text-xl font-semibold px-4">
                    {monthNames[currentDate.getMonth()]} DE {currentDate.getFullYear()}
                  </h2>
                  <Button variant="outline" size="sm" onClick={() => navigateMonth("next")} className="p-2">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-7 gap-2 mb-6">
              {dayNames.map((day) => (
                <div key={day} className="p-3 text-center text-sm font-semibold text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {generateCalendarDays().map((date, index) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth()
                const isToday = date.toDateString() === new Date().toDateString()
                const daySchedules = getSchedulesForDate(date)

                return (
                  <div
                    key={index}
                    className={`min-h-[100px] p-2 border rounded-lg ${isCurrentMonth ? "bg-background" : "bg-muted/30"
                      } ${isToday ? "ring-2 ring-primary" : ""}`}
                  >
                    <div
                      className={`text-sm font-semibold mb-2 ${isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                        }`}
                    >
                      {date.getDate()}
                    </div>
                    <div className="space-y-1">
                      {daySchedules.slice(0, 3).map((schedule, scheduleIndex) => {
                        const valvulaInfo = getValvulaInfo(schedule.valvulaId)
                        return (
                          <div
                            key={schedule.id}
                            className={`text-xs p-1 rounded text-white font-medium ${getScheduleColor(schedule, scheduleIndex)} cursor-pointer`}
                            onClick={() => {
                              // Mostrar opciones de editar/eliminar
                              Swal.fire({
                                title: "Programa de Riego",
                                html: `
                                  <div style='text-align:left'>
                                    <b>Válvula:</b> ${valvulaInfo?.nombre || valvulaInfo?.name}<br/>
                                    <b>Hora:</b> ${schedule.startTime}<br/>
                                    <b>Duración:</b> ${schedule.duration} min<br/>
                                  </div>
                                `,
                                showCancelButton: true,
                                showDenyButton: true,
                                confirmButtonText: "Editar",
                                denyButtonText: "Eliminar",
                                cancelButtonText: "Cerrar",
                                confirmButtonColor: "#1C352D",
                                denyButtonColor: "#F5C9B0",
                              }).then((result) => {
                                if (result.isConfirmed) {
                                  openEditSchedule(schedule)
                                } else if (result.isDenied) {
                                  confirmDeleteSchedule(schedule.id)
                                }
                              })
                            }}
                          >
                            {schedule.startTime} {valvulaInfo?.nombre || valvulaInfo?.name}
                          </div>
                        )
                      })}
                      {daySchedules.length > 3 && (
                        <div className="text-xs text-muted-foreground font-medium">+{daySchedules.length - 3} más</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de programas */}
      {viewMode === "list" && (
        <Card className="p-1">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl font-semibold">
              {user?.role === "USER" ? "Mis Programas de Riego" : "Programas de Riego"}
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {user?.role === "USER"
                ? "Gestiona los programas de riego de tu finca"
                : "Gestiona todos los programas de riego configurados"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredSchedules.length > 0 ? (
              <div className="space-y-6">
                {filteredSchedules.map((schedule) => {
                  const valvulaInfo = getValvulaInfo(schedule.valvulaId)
                  return (
                    <div key={schedule.id} className="flex items-center justify-between p-6 border rounded-lg">
                      <div className="flex items-center gap-6">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="space-y-2">
                          <p className="font-semibold text-base">
                            {valvulaInfo?.name} - {valvulaInfo?.loteName}
                          </p>
                          {user?.role === "ADMIN" && (
                            <p className="text-sm text-muted-foreground">Finca: {valvulaInfo?.fincaName}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {schedule.startTime} • {schedule.duration} min • {getFrequencyText(schedule.frequency)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Próxima ejecución: {schedule.nextExecution.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <Badge variant={schedule.isActive ? "default" : "secondary"} className="px-3 py-1">
                          {schedule.isActive ? "Activo" : "Inactivo"}
                        </Badge>

                        <Switch
                          checked={schedule.isActive}
                          onCheckedChange={(checked) => handleToggleSchedule(schedule.id, checked)}
                        />

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            addNotification({
                              type: "info",
                              title: "Función en Desarrollo",
                              message: "La edición de programas estará disponible pronto",
                              //autoClose: true,
                              duration: 3000,
                            })
                          }}
                          className="p-2"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => confirmDeleteSchedule(schedule.id)}
                          className="p-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">
                  {user?.role === "USER"
                    ? "No tienes programas de riego configurados"
                    : "No hay programas de riego configurados"}
                </p>
                <Button
                  variant="outline"
                  className="mt-4 bg-transparent px-6 py-2"
                  onClick={() => setShowAddDialog(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {user?.role === "USER" ? "Crear Mi Primer Programa" : "Crear Primer Programa"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

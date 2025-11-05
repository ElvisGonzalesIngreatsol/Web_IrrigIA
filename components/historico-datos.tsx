"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { BarChart2, Table as TableIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { apiService } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { useData } from "@/contexts/data-context"
import { Label } from "@/components/ui/label"


// Interfaz para el historial
interface HistorialRecord {
  id: number
  valvulaNombre: string
  loteNombre: string
  presion: number
  caudal: number
  tiempoOperacion: number
  timestamp: string
  fincaId?: number
  loteId?: number
}

export function HistoricoDatos() {
  const [tab, setTab] = useState("tabla")
  const [historialData, setHistorialData] = useState<HistorialRecord[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isLoading, setIsLoading] = useState(true)
  const [totalRecords, setTotalRecords] = useState(0)
  const [loadingLotes, setLoadingLotes] = useState(false)
  const [lotesData, setLotesData] = useState<any[]>([])
  const { user } = useAuth()
  const { fincas: dataFincas } = useData() as any
  const [fincasData, setFincasData] = useState<any[]>([])
  const [selectedFinca, setSelectedFinca] = useState("")
  const [selectedLote, setSelectedLote] = useState("")
  const [newSchedule, setNewSchedule] = useState({
    loteId: "",
    valvulaIds: [] as string[],
    nombre: ""
  })

  // Sincronizar fincas desde el contexto
  useEffect(() => {
    if (Array.isArray(dataFincas)) {
      const normalized = dataFincas.map((f: any) => ({ 
        id: f.id?.toString(), 
        nombre: f.nombre ?? f.name 
      }))
      setFincasData(normalized)

      // Auto-seleccionar finca para usuarios normales
      if (user?.role === "USER") {
        if (user.fincaId) {
          setSelectedFinca(String(user.fincaId))
        } else if (Array.isArray(user.fincaIds) && user.fincaIds.length === 1) {
          setSelectedFinca(String(user.fincaIds[0]))
        }
      }
    }
  }, [user, dataFincas])

  // Fallback: si no hay fincas en el contexto, cargarlas desde el backend
  useEffect(() => {
    const fetchFincasFromApi = async () => {
      if ((!Array.isArray(dataFincas) || dataFincas.length === 0) && fincasData.length === 0) {
        try {
          const resp = await apiService.getAllFincas()
          const payload: any = resp?.data ?? resp
          let arr: any[] = []
          if (Array.isArray(payload)) arr = payload
          else if (payload && Array.isArray(payload.data)) arr = payload.data
          else if (payload && Array.isArray(payload.results)) arr = payload.results

          const normalized = arr.map((f: any) => ({ id: String(f.id), nombre: f.nombre ?? f.name }))
          setFincasData(normalized)
        } catch (error) {
          console.error("Error fetching fincas from API:", error)
        }
      }
    }

    fetchFincasFromApi()
  }, [dataFincas, fincasData])

  useEffect(() => {
    const fetchLotes = async () => {
      if (selectedFinca && selectedFinca !== "all") {
        try {
          const resp = await apiService.request(`/api/lotes/all/${selectedFinca}`)
          const payload: any = resp?.data ?? resp
          let arr: any[] = []
          if (Array.isArray(payload)) arr = payload
          else if (payload && Array.isArray(payload.data)) arr = payload.data
          else if (payload && Array.isArray(payload.results)) arr = payload.results
          setLotesData(arr || [])
        } catch (error) {
          console.error("Error fetching lotes:", error)
        }
      } else {
        setLotesData([])
      }
    }
    fetchLotes()
  }, [selectedFinca])

  useEffect(() => {
    const fetchHistorial = async () => {
      setIsLoading(true)
      try {
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: pageSize.toString(),
          ...(selectedFinca !== "all" && { fincaId: selectedFinca }),
          ...(selectedLote !== "all" && { loteId: selectedLote })
        })

        const resp = await apiService.request(`/api/historial?${queryParams}`)
        const payload: any = resp?.data ?? resp
        let records: HistorialRecord[] = []
        let total = 0

        if (payload) {
          if (Array.isArray(payload.records)) {
            records = payload.records
            total = payload.total ?? records.length
          } else if (payload.data && Array.isArray(payload.data.records)) {
            records = payload.data.records
            total = payload.data.total ?? records.length
          } else if (Array.isArray(payload.data)) {
            records = payload.data
            total = payload.data.length
          } else if (Array.isArray(payload)) {
            records = payload
            total = payload.length
          }
        }

        setHistorialData(records || [])
        setTotalRecords(total || 0)
      } catch (error) {
        console.error("Error fetching historial:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchHistorial()
  }, [currentPage, pageSize, selectedFinca, selectedLote])

  const totalPages = Math.ceil(totalRecords / pageSize)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
    }
  }
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

  return (
    <div className="space-y-8 p-6">
      <Card className="shadow-lg border-0">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-[#1C352D]" />
            Histórico de Datos
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Registros por página" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 por página</SelectItem>
                  <SelectItem value="10">10 por página</SelectItem>
                  <SelectItem value="20">20 por página</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="tabla" className="flex items-center gap-2">
                  <TableIcon className="h-4 w-4" />
                  Tabla
                </TabsTrigger>
                <TabsTrigger value="graficos" className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4" />
                  Gráficos
                </TabsTrigger>
              </TabsList>
              <TabsContent value="tabla">
                <div className="space-y-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Válvula</TableHead>
                          <TableHead>Lote</TableHead>
                          <TableHead>Presión</TableHead>
                          <TableHead>Caudal</TableHead>
                          <TableHead>Minutos</TableHead>
                          <TableHead>Fecha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4">
                              Cargando datos...
                            </TableCell>
                          </TableRow>
                        ) : historialData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-4">
                              No hay registros disponibles
                            </TableCell>
                          </TableRow>
                        ) : (
                          historialData.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.valvulaNombre}</TableCell>
                              <TableCell>{record.loteNombre}</TableCell>
                              <TableCell>{record.presion.toFixed(1)} PSI</TableCell>
                              <TableCell>{record.caudal.toFixed(1)} L/min</TableCell>
                              <TableCell>{record.tiempoOperacion} min</TableCell>
                              <TableCell>{new Date(record.timestamp).toLocaleString()}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginación */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Mostrando {Math.min((currentPage - 1) * pageSize + 1, totalRecords)} a{" "}
                      {Math.min(currentPage * pageSize, totalRecords)} de {totalRecords} registros
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Página {currentPage} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="graficos">
                <div className="flex items-center justify-center h-48 text-gray-500">
                  (Aquí irán los gráficos de caudal/minutos por válvula/lote)
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

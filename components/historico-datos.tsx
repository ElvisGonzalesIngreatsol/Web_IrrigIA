"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { BarChart2, Table as TableIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { apiService } from "@/lib/api"
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
  const [fincasData, setFincasData] = useState<any[]>([])
  const [selectedFinca, setSelectedFinca] = useState("")
  const [selectedLote, setSelectedLote] = useState("")

  // Cargar fincas desde el endpoint correcto del calendario de riego
  useEffect(() => {
    const fetchFincas = async () => {
      try {
        const resp = await apiService.request("/api/fincas")
        const payload: any = resp?.data ?? resp
        let fincas: any[] = []

        if (Array.isArray(payload)) {
          fincas = payload
        } else if (payload && Array.isArray(payload.data)) {
          fincas = payload.data
        } else if (payload && Array.isArray(payload.results)) {
          fincas = payload.results
        }

        const normalizedFincas = fincas.map((f: any) => ({
          id: String(f.id),
          nombre: f.nombre ?? f.name,
        }))
        setFincasData(normalizedFincas)
      } catch (error) {
        console.error("Error fetching fincas:", error)
      }
    }

    fetchFincas()
  }, [])

  // Cargar lotes desde la API
  useEffect(() => {
    const fetchLotes = async () => {
      if (selectedFinca) {
        setLoadingLotes(true)
        try {
          const resp = await apiService.request(`/api/lotes/all/${selectedFinca}`)
          const payload: any = resp?.data ?? resp
          let lotes: any[] = []

          if (Array.isArray(payload)) {
            lotes = payload
          } else if (payload && Array.isArray(payload.data)) {
            lotes = payload.data
          } else if (payload && Array.isArray(payload.results)) {
            lotes = payload.results
          }

          setLotesData(lotes)
        } catch (error) {
          console.error("Error fetching lotes:", error)
        } finally {
          setLoadingLotes(false)
        }
      } else {
        setLotesData([])
      }
    }

    fetchLotes()
  }, [selectedFinca])

  // Cargar historial desde la API
  useEffect(() => {
    const fetchHistorial = async () => {
      setIsLoading(true)
      try {
        const queryParams = new URLSearchParams({
          //page: currentPage.toString(),
          //limit: pageSize.toString(),
          ...(selectedFinca && { fincaId: selectedFinca }),
          ...(selectedLote && { loteId: selectedLote }),
        })

        const resp = await apiService.request(`/api/valvulas/historial?${queryParams}`)
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

        setHistorialData(records)
        setTotalRecords(total)
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

  const handleFincaChange = (fincaId: string) => {
    setSelectedFinca(fincaId)
    setSelectedLote("")
  }

  const handleLoteChange = (loteId: string) => {
    setSelectedLote(loteId)
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
            <div className="space-y-3">
              <Label htmlFor="finca" className="text-sm font-medium">
                Finca
              </Label>
              <Select value={selectedFinca} onValueChange={handleFincaChange}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecciona una finca" />
                </SelectTrigger>
                <SelectContent>
                  {fincasData.map((finca) => (
                    <SelectItem key={finca.id} value={finca.id} className="py-3">
                      {finca.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

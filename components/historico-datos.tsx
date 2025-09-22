"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart2, Table as TableIcon } from "lucide-react"

// Datos de ejemplo, reemplaza por tu fetch real
const mockData = [
  { valvula: "Válvula 1", lote: "Lote 1", caudal: 12.5, minutos: 30 },
  { valvula: "Válvula 2", lote: "Lote 2", caudal: 10.2, minutos: 25 },
  { valvula: "Válvula 3", lote: "Lote 1", caudal: 15.1, minutos: 40 },
]

export function HistoricoDatos() {
  const [tab, setTab] = useState("tabla")

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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Válvula</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Caudal</TableHead>
                      <TableHead>Minutos</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockData.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{row.valvula}</TableCell>
                        <TableCell>{row.lote}</TableCell>
                        <TableCell>{row.caudal} L/min</TableCell>
                        <TableCell>{row.minutos}</TableCell>
                        <TableCell>
                          {/* Aquí puedes poner botones de acciones */}
                          <button className="text-blue-600 hover:underline text-sm">Ver</button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="graficos">
              {/* Aquí puedes poner tus componentes de gráficos */}
              <div className="flex items-center justify-center h-48 text-gray-500">
                (Aquí irán los gráficos de caudal/minutos por válvula/lote)
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

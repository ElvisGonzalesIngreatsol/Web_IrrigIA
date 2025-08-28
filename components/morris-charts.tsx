"use client"

import type React from "react"
import { Line, LineChart, Area, AreaChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { useData } from "@/contexts/data-context"
import { useAuth } from "@/contexts/auth-context"
import { Droplets, Activity, Clock } from "lucide-react"

const irrigationData = [
  { period: "Sem 1", "Eficiencia Riego": 85, "Humedad Suelo": 68, Temperatura: 26 },
  { period: "Sem 2", "Eficiencia Riego": 92, "Humedad Suelo": 72, Temperatura: 28 },
  { period: "Sem 3", "Eficiencia Riego": 78, "Humedad Suelo": 65, Temperatura: 30 },
  { period: "Sem 4", "Eficiencia Riego": 88, "Humedad Suelo": 70, Temperatura: 27 },
  { period: "Sem 5", "Eficiencia Riego": 95, "Humedad Suelo": 75, Temperatura: 25 },
  { period: "Sem 6", "Eficiencia Riego": 90, "Humedad Suelo": 73, Temperatura: 29 },
]

const waterUsageData = [
  { day: "Lun", "Consumo Actual": 125, "Consumo Anterior": 110 },
  { day: "Mar", "Consumo Actual": 142, "Consumo Anterior": 135 },
  { day: "Mié", "Consumo Actual": 118, "Consumo Anterior": 125 },
  { day: "Jue", "Consumo Actual": 155, "Consumo Anterior": 142 },
  { day: "Vie", "Consumo Actual": 168, "Consumo Anterior": 155 },
  { day: "Sáb", "Consumo Actual": 145, "Consumo Anterior": 138 },
  { day: "Dom", "Consumo Actual": 132, "Consumo Anterior": 128 },
]

export const IrrigationAreaChart: React.FC = () => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg font-semibold text-[#1C352D]">
          Parámetros de Riego y Sensores
        </CardTitle>
        <CardDescription className="text-sm">
          Eficiencia de riego, humedad del suelo y temperatura semanal
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        <ChartContainer
          config={{
            "Eficiencia Riego": {
              label: "Eficiencia Riego (%)",
              color: "#22D3EE",
            },
            "Humedad Suelo": {
              label: "Humedad Suelo (%)",
              color: "#10B981",
            },
            Temperatura: {
              label: "Temperatura (°C)",
              color: "#F59E0B",
            },
          }}
          className="h-[200px] sm:h-[250px] md:h-[300px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={irrigationData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="period" stroke="#6B7280" fontSize={10} className="text-xs sm:text-sm" />
              <YAxis stroke="#6B7280" fontSize={10} className="text-xs sm:text-sm" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Area
                type="monotone"
                dataKey="Eficiencia Riego"
                stackId="1"
                stroke="#22D3EE"
                fill="#22D3EE"
                fillOpacity={0.6}
              />
              <Area
                type="monotone"
                dataKey="Humedad Suelo"
                stackId="2"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.4}
              />
              <Area
                type="monotone"
                dataKey="Temperatura"
                stackId="3"
                stroke="#F59E0B"
                fill="#F59E0B"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export const WaterUsageLineChart: React.FC = () => {
  const { valvulas, lotes, fincas } = useData()
  const { user } = useAuth()

  const userFincas = user?.role === "admin" ? fincas : user?.fincaId ? fincas.filter((f) => f.id === user.fincaId) : []
  const userLotes = user?.role === "admin" ? lotes : lotes.filter((l) => userFincas.some((f) => f.id === l.fincaId))
  const userValvulas =
    user?.role === "admin" ? valvulas : valvulas.filter((v) => userFincas.some((f) => f.id === v.fincaId))

  const activeValvulas = userValvulas.filter((v) => v.isOpen)
  const totalDailyConsumption = activeValvulas.reduce((sum, v) => sum + (v.flowRate || 0) * 60 * 24, 0) // L/day

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg font-semibold text-[#1C352D]">Consumo de Agua Diario</CardTitle>
        <CardDescription className="text-sm">
          Comparación del consumo diario actual vs semana anterior (Litros)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          <div className="lg:col-span-1">
            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                Válvulas Regando
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activeValvulas.length === 0 ? (
                  <p className="text-xs text-blue-600">No hay válvulas activas</p>
                ) : (
                  activeValvulas.map((valvula) => {
                    const lote = userLotes.find((l) => l.id === valvula.loteId)
                    const consumoLitros = (valvula.flowRate || 0) * 60 // L/hour

                    return (
                      <div key={valvula.id} className="bg-white rounded p-2 border border-blue-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium truncate">{valvula.name}</span>
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                        <div className="text-xs text-gray-600 mb-1">{lote?.name}</div>
                        <div className="text-sm font-bold text-blue-600">{consumoLitros.toFixed(0)} L/h</div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <ChartContainer
              config={{
                "Consumo Actual": {
                  label: "Consumo Actual (L)",
                  color: "#8B5CF6",
                },
                "Consumo Anterior": {
                  label: "Consumo Anterior (L)",
                  color: "#22D3EE",
                },
              }}
              className="h-[200px] sm:h-[250px] md:h-[300px] w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={waterUsageData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="day" stroke="#6B7280" fontSize={10} className="text-xs sm:text-sm" />
                  <YAxis stroke="#6B7280" fontSize={10} className="text-xs sm:text-sm" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line
                    type="monotone"
                    dataKey="Consumo Actual"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    dot={{ fill: "#8B5CF6", strokeWidth: 1, r: 3 }}
                    activeDot={{ r: 4, stroke: "#8B5CF6", strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Consumo Anterior"
                    stroke="#22D3EE"
                    strokeWidth={2}
                    dot={{ fill: "#22D3EE", strokeWidth: 1, r: 3 }}
                    activeDot={{ r: 4, stroke: "#22D3EE", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-800">Válvulas Activas</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{activeValvulas.length}</div>
              <div className="text-xs text-green-600">de {userValvulas.length} total</div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">Consumo Total</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{(totalDailyConsumption / 1000).toFixed(1)}</div>
              <div className="text-xs text-blue-600">m³/día estimado</div>
            </div>

            <div className="bg-purple-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-800">Días Activos</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">7</div>
              <div className="text-xs text-purple-600">esta semana</div>
            </div>
          </div>

          {activeValvulas.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h5 className="text-sm font-semibold text-gray-800 mb-2">Resumen de Riego Activo</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {activeValvulas.map((valvula) => {
                  const lote = userLotes.find((l) => l.id === valvula.loteId)
                  const finca = userFincas.find((f) => f.id === valvula.fincaId)

                  return (
                    <div key={valvula.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate">{valvula.name}</div>
                        <div className="text-xs text-gray-500">
                          {lote?.name} - {finca?.name}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {((valvula.flowRate || 0) * 60).toFixed(0)} L/h
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

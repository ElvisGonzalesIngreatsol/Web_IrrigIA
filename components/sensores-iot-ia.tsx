// Interfaz para los datos de WeatherLink
interface AirWeatherData {
  temperature_c: number;
  temperature_f?: number;
  humidity: number;
}
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useData } from "@/contexts/data-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Thermometer,
  Droplets,
  Activity,
  Brain,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Cloud,
  Sprout,
  Gauge,
} from "lucide-react"

// Función para consumir el endpoint del backend
async function fetchAirWeatherData() {
  const res = await fetch("https://back.irrigia.ingreatsol.com/api/weatherlink/air");
  if (!res.ok) throw new Error("Error al obtener datos de WeatherLink");
  return res.json();
}

// Componente auxiliar para mostrar los datos de WeatherLink
function WeatherLinkAirCards() {
  const [airData, setAirData] = useState<AirWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const fetchData = () => {
      fetchAirWeatherData()
        .then((data) => {
          if (isMounted) {
            setAirData(data);
            setError(null);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setError("No se pudo obtener datos de WeatherLink");
            setLoading(false);
          }
        });
    };

    fetchData();
    intervalId = setInterval(fetchData, 5000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  if (loading) return <div className="col-span-2 text-center">Cargando datos meteorológicos...</div>;
  if (error) return <div className="col-span-2 text-center text-red-500">{error}</div>;
  if (!airData) return null;

  return (
    <>
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-base">Temperatura Aire (WeatherLink)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center p-3 bg-orange-50 rounded">
            <div className="text-2xl font-bold text-orange-600">
              {airData.temperature_c !== null && airData.temperature_c !== undefined ? `${airData.temperature_c}°C` : "N/A"}
            </div>
            <div className="text-sm text-orange-600">Temperatura</div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-base">Humedad Aire (WeatherLink)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center p-3 bg-blue-50 rounded">
            <div className="text-2xl font-bold text-blue-600">
              {airData.humidity !== null && airData.humidity !== undefined ? `${airData.humidity}%` : "N/A"}
            </div>
            <div className="text-sm text-blue-600">Humedad</div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export function SensoresIoTIA() {
  const { user } = useAuth()
  const { fincas, lotes, sensors, suggestions, addSuggestion, removeSuggestion, applySuggestion } = useData()
  const [activeTab, setActiveTab] = useState("aire")
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  const userFincas = user?.role === "ADMIN" ? fincas : user?.fincaId ? fincas.filter((f) => f.id === user.fincaId) : []
  const userLotes = user?.role === "ADMIN" ? lotes : lotes.filter((l) => userFincas.some((f) => f.id === l.fincaId))
  const userSensors = user?.role === "ADMIN" ? sensors : sensors.filter((s) => userLotes.some((l) => l.id === s.loteId))
  const userSuggestions =
    user?.role === "ADMIN" ? suggestions : suggestions.filter((s) => userFincas.some((f) => f.id === s.fincaId))

  const airSensors = userSensors.filter(
    (s) => (s.type === "temperature" || s.type === "humidity") && s.location === "air",
  )
  const soilSensors = userSensors.filter(
    (s) => (s.type === "temperature" || s.type === "humidity" || s.type === "ph") && s.location === "soil",
  )
  const waterSensors = userSensors.filter((s) => (s.type === "flow" || s.type === "pressure") && s.location === "water")

  const totalSensors = userSensors.length
  const activeSensors = userSensors.filter((s) => s.status === "online").length
  const systemHealth = totalSensors > 0 ? Math.round((activeSensors / totalSensors) * 100) : 100
  const aiSuggestions = userSuggestions.filter((s) => s.priority === "high").length
  const activeAlerts = userSensors.filter((s) => s.status === "warning").length
  const aiEfficiency = 94 // Mock AI efficiency percentage

  const handleGenerateAISuggestions = async () => {
    setIsGeneratingAI(true)

    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Generate mock AI suggestion
        const mockSuggestion = {
          fincaId: userFincas[0]?.id ? Number(userFincas[0].id) : 0,
          loteId: userLotes[0]?.id ? Number(userLotes[0].id) : 0,
          loteName: userLotes[0]?.nombre || "Lote 1",
          priority: "high" as const,
          reason: "Humedad del suelo baja (45%) y temperatura alta prevista (32°C)",
          recommendedDuration: 90,
          estimatedWaterUsage: 450,
          timestamp: new Date(),
        }
    
        addSuggestion(mockSuggestion)
        setIsGeneratingAI(false)
  }

  const handleApplySuggestion = (suggestionId: string) => {
    console.log("[v0] Aplicando sugerencia:", suggestionId)
    applySuggestion(suggestionId)
  }

  const handleDiscardSuggestion = (suggestionId: string) => {
    console.log("[v0] Descartando sugerencia:", suggestionId)
    removeSuggestion(suggestionId)
  }



  const getSensorIcon = (type: string) => {
    switch (type) {
      case "temperature":
        return <Thermometer className="h-4 w-4 text-orange-500" />
      case "humidity":
        return <Droplets className="h-4 w-4 text-blue-500" />
      case "ph":
        return <Sprout className="h-4 w-4 text-green-500" />
      case "flow":
      case "pressure":
        return <Gauge className="h-4 w-4 text-cyan-500" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[rgba(28,53,45,1)]">Sensores IoT & IA</h1>
          <p className="text-muted-foreground">Monitoreo inteligente con sugerencias automáticas de riego</p>
        </div>
        <Button
          onClick={handleGenerateAISuggestions}
          disabled={isGeneratingAI}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Brain className={`h-4 w-4 mr-2 ${isGeneratingAI ? "animate-spin" : ""}`} />
          Generar Sugerencias IA
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado del Sistema</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{systemHealth}%</div>
            <p className="text-xs text-muted-foreground">
              {activeSensors}/{totalSensors} sensores activos
            </p>
            <Progress value={systemHealth} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sugerencias IA</CardTitle>
            <Brain className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{aiSuggestions}</div>
            <p className="text-xs text-muted-foreground">1 prioritarias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{activeAlerts}</div>
            <p className="text-xs text-muted-foreground">0 críticas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiencia IA</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{aiEfficiency}%</div>
            <p className="text-xs text-muted-foreground">Precisión de predicciones</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <Brain className="h-5 w-5" />
            Sugerencias Inteligentes de Riego
          </CardTitle>
          <CardDescription>
            Recomendaciones basadas en análisis de sensores y predicciones meteorológicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userSuggestions.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-purple-300 mx-auto mb-4" />
              <p className="text-purple-600 font-medium">No hay sugerencias pendientes</p>
              <p className="text-sm text-purple-500">Presiona "Generar Sugerencias IA" para obtener recomendaciones</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userSuggestions.slice(0, 1).map((suggestion) => (
                <div key={suggestion.id} className="bg-white p-4 rounded-lg border border-purple-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-600">
                        Alto
                      </Badge>
                      <span className="text-sm text-gray-600">87% confianza</span>
                      <span className="text-sm text-gray-600">{userFincas[0]?.nombre}</span>
                    </div>
                  </div>

                  <h3 className="font-semibold text-lg mb-2">
                    Riego sugerido para {suggestion.recommendedDuration / 60} válvula(s)
                  </h3>
                  <p className="text-gray-600 mb-4">{suggestion.reason}</p>

                  <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <span className="font-medium">Hora sugerida:</span>
                      <div>11:11</div>
                    </div>
                    <div>
                      <span className="font-medium">Duración:</span>
                      <div>{suggestion.recommendedDuration} min</div>
                    </div>
                    <div>
                      <span className="font-medium">Hum. Suelo:</span>
                      <div>45.8%</div>
                    </div>
                    <div>
                      <span className="font-medium">Temp. Aire:</span>
                      <div>28.5°C</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApplySuggestion(String(suggestion.id))}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Droplets className="h-4 w-4 mr-2" />
                      Aplicar
                    </Button>
                    <Button variant="outline" onClick={() => handleDiscardSuggestion(String(suggestion.id))}>
                      Descartar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monitoreo de Sensores</CardTitle>
          <CardDescription>Datos en tiempo real categorizados por tipo de sensor</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="aire">Sensores de Aire</TabsTrigger>
              <TabsTrigger value="suelo">Sensores de Suelo</TabsTrigger>
              <TabsTrigger value="agua">Sensores de Agua</TabsTrigger>
              <TabsTrigger value="clima">Predicción Clima</TabsTrigger>
            </TabsList>

            <TabsContent value="aire" className="mt-6">
              <div className="grid gap-4 md:grid-cols-2">
                {/* WeatherLink Cards */}
                <WeatherLinkAirCards />
                {/* Sensores propios */}
                {airSensors.length > 0 && airSensors.map((sensor) => {
                  const lote = userLotes.find((l) => l.id === sensor.loteId)
                  const finca = userFincas.find((f) => f.id === lote?.fincaId)
                  return (
                    <Card key={sensor.id} className="border-2">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getSensorIcon(sensor.type)}
                            <CardTitle className="text-base">
                              {sensor.type === "temperature" ? "Sensor Temperatura Aire" : "Sensor Humedad Aire"} {lote?.nombre}
                            </CardTitle>
                          </div>
                          <Badge variant={sensor.status === "online" ? "default" : "destructive"}>
                            {sensor.status === "online" ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                        <CardDescription className="text-sm">{finca?.nombre}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-3 bg-orange-50 rounded">
                            <Thermometer className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-orange-600">
                              {sensor.type === "temperature" ? `${sensor.value?.toFixed(1) || 0}°C` : "28.5°C"}
                            </div>
                            <div className="text-sm text-orange-600">Temperatura</div>
                          </div>
                          <div className="text-center p-3 bg-blue-50 rounded">
                            <Droplets className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-blue-600">
                              {sensor.type === "humidity" ? `${sensor.value?.toFixed(1) || 0}%` : "65.2%"}
                            </div>
                            <div className="text-sm text-blue-600">Humedad</div>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Estado:</span>
                            <Badge variant={sensor.status === "online" ? "default" : "destructive"}>
                              {sensor.status === "online" ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Device ID:</span>
                            <span className="font-mono">{(sensor as any).deviceId || "AIR_001"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Última lectura:</span>
                            <span>
                              {sensor.lastReading?.toLocaleTimeString("es-EC", {
                                hour: "2-digit",
                                minute: "2-digit",
                              }) || "04:38 p. m."}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="suelo" className="mt-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {soilSensors.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <Sprout className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No hay sensores de suelo disponibles</p>
                  </div>
                ) : (
                  soilSensors.map((sensor) => {
                    const lote = userLotes.find((l) => l.id === sensor.loteId)
                    const finca = userFincas.find((f) => f.id === lote?.fincaId)

                    return (
                      <Card key={sensor.id} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getSensorIcon(sensor.type)}
                              <CardTitle className="text-base">
                                {sensor.type === "temperature" && "Sensor Temperatura Suelo"}
                                {sensor.type === "humidity" && "Sensor Humedad Suelo"}
                                {sensor.type === "ph" && "Sensor pH Suelo"} {lote?.nombre}
                              </CardTitle>
                            </div>
                            <Badge variant={sensor.status === "online" ? "default" : "destructive"}>
                              {sensor.status === "online" ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                          <CardDescription className="text-sm">{finca?.nombre}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center mb-4">
                            <div className="text-3xl font-bold text-green-600">
                              {sensor.value?.toFixed(1) || 0}
                              {sensor.type === "temperature" ? "°C" : sensor.type === "humidity" ? "%" : ""}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {sensor.type === "temperature" && "Temperatura del suelo"}
                              {sensor.type === "humidity" && "Humedad del suelo"}
                              {sensor.type === "ph" && "pH del suelo"}
                            </div>
                          </div>

                          {sensor.type === "ph" && <Progress value={(sensor.value / 14) * 100} className="mb-4" />}

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Device ID:</span>
                              <span className="font-mono">{(sensor as any).deviceId || "SOIL_001"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Última lectura:</span>
                              <span>
                                {sensor.lastReading?.toLocaleTimeString("es-EC", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }) || "04:38 p. m."}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="agua" className="mt-6">
              <div className="grid gap-4 md:grid-cols-2">
                {waterSensors.length === 0 ? (
                  <div className="col-span-2 text-center py-8">
                    <Gauge className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No hay sensores de agua disponibles</p>
                  </div>
                ) : (
                  waterSensors.map((sensor) => {
                    const lote = userLotes.find((l) => l.id === sensor.loteId)
                    const finca = userFincas.find((f) => f.id === lote?.fincaId)

                    return (
                      <Card key={sensor.id} className="border-2">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Gauge className="h-4 w-4 text-cyan-500" />
                              <CardTitle className="text-base">
                                {sensor.type === "flow" ? "Sensor Flujo" : "Sensor Presión"} Válvula {lote?.nombre}
                              </CardTitle>
                            </div>
                            <Badge variant={sensor.status === "online" ? "default" : "destructive"}>
                              {sensor.status === "online" ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                          <CardDescription className="text-sm">{finca?.nombre}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center mb-4">
                            <div className="text-3xl font-bold text-cyan-600">
                              {sensor.value?.toFixed(1) || 0}{" "}
                              {sensor.unit || (sensor.type === "flow" ? "L/min" : "bar")}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {sensor.type === "flow" ? "Flujo de agua" : "Presión del agua"}
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Estado Válvula:</span>
                              <Badge variant="default" className="bg-green-600">
                                Operativa
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Device ID:</span>
                              <span className="font-mono">{(sensor as any).deviceId || "WATER_001"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Última lectura:</span>
                              <span>
                                {sensor.lastReading?.toLocaleTimeString("es-EC", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }) || "04:38 p. m."}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="clima" className="mt-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cloud className="h-5 w-5 text-blue-500" />
                      Hoy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-2xl font-bold">28°C</div>
                      <div className="text-sm text-muted-foreground">Parcialmente nublado</div>
                      <div className="mt-2 text-sm">
                        <div>Humedad: 65%</div>
                        <div>Precipitación: 0mm</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cloud className="h-5 w-5 text-gray-500" />
                      Mañana
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-2xl font-bold">32°C</div>
                      <div className="text-sm text-muted-foreground">Soleado</div>
                      <div className="mt-2 text-sm">
                        <div>Humedad: 58%</div>
                        <div>Precipitación: 0mm</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cloud className="h-5 w-5 text-blue-600" />
                      Pasado mañana
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-2xl font-bold">26°C</div>
                      <div className="text-sm text-muted-foreground">Lluvia ligera</div>
                      <div className="mt-2 text-sm">
                        <div>Humedad: 78%</div>
                        <div>Precipitación: 5mm</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export { SensoresIoTIA as SensoresIotIa }

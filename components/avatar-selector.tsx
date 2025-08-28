"use client"
import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RotateCcw, Check, Shuffle } from "lucide-react"

interface AvatarSelectorProps {
  userName: string
  onSave: (avatarUrl: string) => void
  onCancel: () => void
  isLoading?: boolean
}

export function AvatarSelector({ userName, onSave, onCancel, isLoading = false }: AvatarSelectorProps) {
  const [currentAvatar, setCurrentAvatar] = useState<string>(() => {
    // Generate initial random avatar
    const seed = Math.random().toString(36).substring(7)
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`
  })

  const [isGenerating, setIsGenerating] = useState(false)

  const generateNewAvatar = async () => {
    setIsGenerating(true)
    // Add a small delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 300))

    const seed = Math.random().toString(36).substring(7)
    const newAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`
    setCurrentAvatar(newAvatar)
    setIsGenerating(false)
  }

  const handleSaveAvatar = () => {
    onSave(currentAvatar)
  }

  return (
    <div className="space-y-6">
      {/* Avatar Preview */}
      <div className="flex justify-center">
        <Card className="p-4">
          <CardContent className="flex flex-col items-center space-y-4 p-0">
            <Avatar className="h-32 w-32 border-4 border-primary/20">
              <AvatarImage
                src={currentAvatar || "/placeholder.svg"}
                alt="Avatar preview"
                className={isGenerating ? "opacity-50 transition-opacity" : "transition-opacity"}
              />
              <AvatarFallback className="text-2xl">
                {userName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="text-center">
              <p className="text-sm font-medium">Vista previa del avatar</p>
              <p className="text-xs text-muted-foreground">
                {isGenerating ? "Generando nuevo avatar..." : "¿Te gusta este avatar?"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generation Controls */}
      <div className="space-y-4">
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={generateNewAvatar}
            disabled={isGenerating || isLoading}
            className="h-12 px-6 bg-transparent"
          >
            {isGenerating ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <Shuffle className="h-4 w-4 mr-2" />
                Generar Otro Avatar
              </>
            )}
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Haz clic en "Generar Otro Avatar" hasta encontrar uno que te guste
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isLoading} className="flex-1 bg-transparent">
          Cancelar
        </Button>
        <Button onClick={handleSaveAvatar} disabled={isLoading || isGenerating} className="flex-1">
          {isLoading ? (
            <>
              <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Usar Este Avatar
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

"use client"

import type React from "react"
import { useState, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, Upload, Edit2, User } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { ImageEditor } from "./image-editor"
import { ProfileEditDialog } from "./profile-edit-dialog"
import { AvatarSelector } from "./avatar-selector"

export function ProfileManagement() {
  const { user, updateProfile } = useAuth()
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [showImageEditor, setShowImageEditor] = useState(false)
  const [showAvatarSelector, setShowAvatarSelector] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [editDialog, setEditDialog] = useState<{
    isOpen: boolean
    field: "name" | "email"
    currentValue: string
  }>({
    isOpen: false,
    field: "name",
    currentValue: "",
  })

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        toast({
          title: "Error",
          description: "La imagen debe ser menor a 5MB",
          variant: "destructive",
        })
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string)
        setShowImageEditor(true)
        setShowAvatarSelector(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleGenerateAvatar = () => {
    setShowAvatarSelector(true)
    setShowImageEditor(false)
    setSelectedImage(null)
  }

  const handleSaveAvatar = async (finalImage?: string) => {
    if ((!selectedImage && !finalImage) || !user) return

    setIsUploading(true)
    try {
      const imageToSave = finalImage || selectedImage!
      const success = await updateProfile({ avatar: imageToSave })

      if (success) {
        toast({
          title: "Éxito",
          description: "Avatar actualizado correctamente",
        })
        setIsAvatarDialogOpen(false)
        setSelectedImage(null)
        setShowImageEditor(false)
        setShowAvatarSelector(false)
      } else {
        toast({
          title: "Error",
          description: "No se pudo actualizar el avatar",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al procesar la imagen",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleEditField = (field: "name" | "email") => {
    if (!user) return
    setEditDialog({
      isOpen: true,
      field,
      currentValue: field === "name" ? user.name : user.email,
    })
  }

  const resetAvatarDialog = () => {
    setSelectedImage(null)
    setShowImageEditor(false)
    setShowAvatarSelector(false)
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[rgba(28,53,45,1)]">Mi Perfil</h1>
        <p className="text-muted-foreground">Gestiona tu información personal y configuración</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Perfil</CardTitle>
          <CardDescription>Tu información personal y configuración de cuenta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback className="text-lg">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                onClick={() => setIsAvatarDialogOpen(true)}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                {user.role === "admin" ? "Administrador" : "Cliente"}
              </Badge>
            </div>
          </div>

          {/* User Information - Made fields editable */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre Completo</Label>
              <div className="flex gap-2">
                <Input value={user.name} disabled className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => handleEditField("name")}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Correo Electrónico</Label>
              <div className="flex gap-2">
                <Input value={user.email} disabled className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => handleEditField("email")}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Input value={user.role === "admin" ? "Administrador" : "Cliente"} disabled />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Input value={user.isActive ? "Activo" : "Inactivo"} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avatar Selection Dialog */}
      <Dialog
        open={isAvatarDialogOpen}
        onOpenChange={(open) => {
          setIsAvatarDialogOpen(open)
          if (!open) resetAvatarDialog()
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cambiar Avatar</DialogTitle>
            <DialogDescription>
              {showImageEditor
                ? "Ajusta tu imagen para crear el avatar perfecto"
                : showAvatarSelector
                  ? "Genera avatares aleatorios hasta encontrar el que más te guste"
                  : "Selecciona cómo quieres cambiar tu avatar"}
            </DialogDescription>
          </DialogHeader>

          {showImageEditor && selectedImage ? (
            <ImageEditor
              imageSrc={selectedImage}
              onSave={handleSaveAvatar}
              onCancel={() => {
                setShowImageEditor(false)
                setSelectedImage(null)
              }}
            />
          ) : showAvatarSelector ? (
            <AvatarSelector
              userName={user.name}
              onSave={handleSaveAvatar}
              onCancel={() => setShowAvatarSelector(false)}
              isLoading={isUploading}
            />
          ) : (
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Subir Imagen</TabsTrigger>
                <TabsTrigger value="generate">Avatar Aleatorio</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <div className="flex justify-center">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={user.avatar || "/placeholder.svg"} alt="Current avatar" />
                    <AvatarFallback className="text-2xl">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full h-12">
                  <Upload className="h-4 w-4 mr-2" />
                  Seleccionar Imagen
                </Button>

                <div className="text-sm text-muted-foreground text-center">
                  Sube una imagen desde tu dispositivo. Podrás editarla con herramientas de zoom y recorte.
                </div>
              </TabsContent>

              <TabsContent value="generate" className="space-y-4">
                <div className="flex justify-center">
                  <Avatar className="h-32 w-32">
                    <AvatarImage src={user.avatar || "/placeholder.svg"} alt="Current avatar" />
                    <AvatarFallback className="text-2xl">
                      {user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <Button variant="outline" onClick={handleGenerateAvatar} className="w-full h-12 bg-transparent">
                  <User className="h-4 w-4 mr-2" />
                  Generar Avatares Aleatorios
                </Button>

                <div className="text-sm text-muted-foreground text-center">
                  Genera avatares únicos de forma continua hasta encontrar el perfecto para ti.
                </div>
              </TabsContent>
            </Tabs>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
        </DialogContent>
      </Dialog>

      <ProfileEditDialog
        isOpen={editDialog.isOpen}
        onClose={() => setEditDialog({ ...editDialog, isOpen: false })}
        field={editDialog.field}
        currentValue={editDialog.currentValue}
      />
    </div>
  )
}

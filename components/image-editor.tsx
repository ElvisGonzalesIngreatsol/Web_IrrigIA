"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { ZoomIn, RotateCcw, Check, X } from "lucide-react"

interface ImageEditorProps {
  imageSrc: string
  onSave: (croppedImage: string) => void
  onCancel: () => void
}

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export function ImageEditor({ imageSrc, onSave, onCancel }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageLoaded, setImageLoaded] = useState(false)
  const [cropSize] = useState(200) // Fixed crop size for profile pictures

  useEffect(() => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => {
      imageRef.current = image
      setImageLoaded(true)
      drawCanvas()
    }
    image.src = imageSrc
  }, [imageSrc])

  useEffect(() => {
    if (imageLoaded) {
      drawCanvas()
    }
  }, [zoom, position, imageLoaded])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return

    const ctx = canvas.getContext("2d")!
    const canvasSize = 300
    canvas.width = canvasSize
    canvas.height = canvasSize

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize, canvasSize)

    // Calculate image dimensions
    const imageAspect = image.width / image.height
    const drawWidth = image.width * zoom
    const drawHeight = image.height * zoom

    // Center the image initially if it's the first load
    const centerX = (canvasSize - drawWidth) / 2 + position.x
    const centerY = (canvasSize - drawHeight) / 2 + position.y

    // Draw image
    ctx.drawImage(image, centerX, centerY, drawWidth, drawHeight)

    // Draw crop overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
    ctx.fillRect(0, 0, canvasSize, canvasSize)

    // Clear crop area
    const cropX = (canvasSize - cropSize) / 2
    const cropY = (canvasSize - cropSize) / 2
    ctx.clearRect(cropX, cropY, cropSize, cropSize)

    // Draw crop border
    ctx.strokeStyle = "#3b82f6"
    ctx.lineWidth = 2
    ctx.strokeRect(cropX, cropY, cropSize, cropSize)

    // Draw corner indicators
    const cornerSize = 10
    ctx.fillStyle = "#3b82f6"
    // Top-left
    ctx.fillRect(cropX - cornerSize / 2, cropY - cornerSize / 2, cornerSize, cornerSize)
    // Top-right
    ctx.fillRect(cropX + cropSize - cornerSize / 2, cropY - cornerSize / 2, cornerSize, cornerSize)
    // Bottom-left
    ctx.fillRect(cropX - cornerSize / 2, cropY + cropSize - cornerSize / 2, cornerSize, cornerSize)
    // Bottom-right
    ctx.fillRect(cropX + cropSize - cornerSize / 2, cropY + cropSize - cornerSize / 2, cornerSize, cornerSize)
  }, [zoom, position, cropSize, imageLoaded])

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoomChange = (value: number[]) => {
    setZoom(value[0])
  }

  const resetPosition = () => {
    setPosition({ x: 0, y: 0 })
    setZoom(1)
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return

    // Create a new canvas for the cropped image
    const cropCanvas = document.createElement("canvas")
    const cropCtx = cropCanvas.getContext("2d")!
    cropCanvas.width = cropSize
    cropCanvas.height = cropSize

    // Calculate the source area from the main canvas
    const canvasSize = 300
    const cropX = (canvasSize - cropSize) / 2
    const cropY = (canvasSize - cropSize) / 2

    // Calculate image position and size
    const drawWidth = image.width * zoom
    const drawHeight = image.height * zoom
    const centerX = (canvasSize - drawWidth) / 2 + position.x
    const centerY = (canvasSize - drawHeight) / 2 + position.y

    // Calculate source coordinates on the original image
    const sourceX = (cropX - centerX) / zoom
    const sourceY = (cropY - centerY) / zoom
    const sourceWidth = cropSize / zoom
    const sourceHeight = cropSize / zoom

    // Draw the cropped portion
    cropCtx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, cropSize, cropSize)

    const croppedDataUrl = cropCanvas.toDataURL("image/jpeg", 0.8)
    onSave(croppedDataUrl)
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Editor de Imagen</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Ajusta la posición y el zoom de tu imagen. El área azul será tu foto de perfil.
        </p>
      </div>

      <div className="flex justify-center">
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="border border-gray-300 rounded-lg cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ZoomIn className="h-4 w-4" />
            Zoom: {zoom.toFixed(1)}x
          </Label>
          <Slider value={[zoom]} onValueChange={handleZoomChange} min={0.5} max={3} step={0.1} className="w-full" />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetPosition} className="flex-1 bg-transparent">
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetear
          </Button>
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} className="flex-1 bg-transparent">
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button onClick={handleSave} className="flex-1">
          <Check className="h-4 w-4 mr-2" />
          Guardar
        </Button>
      </div>
    </div>
  )
}

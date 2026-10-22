import * as React from "react"
import { toast } from "sonner"

import ImageUploader from "@/components/wizard/passport/ImageUploader"
import ManualCropper from "@/components/wizard/passport/ManualCropper"
import {
  compressImageDataUrlIfNeeded,
  IMAGE_UPLOAD_MAX_BYTES,
} from "@/utils/imageCompression"

type PassportUploadPanelProps = {
  photoProcessed?: string
  onPhotoProcessed: (value?: string) => void
}

export function PassportUploadPanel({
  photoProcessed,
  onPhotoProcessed,
}: PassportUploadPanelProps) {
  const [acceptedImage, setAcceptedImage] = React.useState<string | null>(null)
  const [rawImage, setRawImage] = React.useState<string | null>(null)
  const [isCropping, setIsCropping] = React.useState(false)

  const rawImageUrlRef = React.useRef<string | null>(null)

  const releaseRawImage = React.useCallback(() => {
    if (rawImageUrlRef.current) {
      URL.revokeObjectURL(rawImageUrlRef.current)
      rawImageUrlRef.current = null
    }
    setRawImage(null)
  }, [])

  React.useEffect(() => {
    return () => {
      if (rawImageUrlRef.current) {
        URL.revokeObjectURL(rawImageUrlRef.current)
      }
    }
  }, [])

  const handleUpload = React.useCallback(
    (file?: File) => {
      if (!file) return
      if (!file.type.startsWith("image/")) {
        toast.error("Upload a valid passport image file.")
        return
      }
      releaseRawImage()
      setIsCropping(false)
      setAcceptedImage(null)
      onPhotoProcessed(undefined)
      const objectUrl = URL.createObjectURL(file)
      const img = new Image()
      img.src = objectUrl
      img.onload = () => {
        rawImageUrlRef.current = objectUrl
        setRawImage(objectUrl)
        setIsCropping(true)
      }
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        toast.error("Unable to load the selected passport image.")
      }
    },
    [onPhotoProcessed, releaseRawImage]
  )

  const handleCropComplete = React.useCallback(
    async (croppedBase64: string) => {
      try {
        const optimizedPassport = await compressImageDataUrlIfNeeded(croppedBase64, {
          maxBytes: IMAGE_UPLOAD_MAX_BYTES,
          fileName: "passport",
          preferredType: "image/jpeg",
          allowJpegFallback: true,
          maxWidthOrHeight: 900,
        })
        setIsCropping(false)
        releaseRawImage()
        setAcceptedImage(optimizedPassport.value)
        onPhotoProcessed(optimizedPassport.value)
        if (optimizedPassport.compressed) {
          toast.info("Passport compressed below 100KB.")
        }
        toast.success("Passport cropped and saved.")
      } catch (error) {
        console.error("Passport compression failed:", error)
        toast.error(
          error instanceof Error && error.message.trim()
            ? error.message
            : "Unable to prepare the passport photo."
        )
      }
    },
    [onPhotoProcessed, releaseRawImage]
  )

  return (
    <div className="space-y-4">
      <ImageUploader onLoad={handleUpload} />

      {isCropping && rawImage && (
        <ManualCropper
          imgSrc={rawImage}
          onComplete={handleCropComplete}
          onCancel={() => {
            setIsCropping(false)
            releaseRawImage()
          }}
        />
      )}

      {(acceptedImage || photoProcessed) && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-center sm:p-4">
          <div className="mt-1 flex flex-col items-center">
            <img
              src={acceptedImage || photoProcessed}
              alt="Accepted passport"
              className="h-60 w-[180px] rounded-lg border-2 border-emerald-600 bg-white object-cover"
            />
            <p className="mt-2 text-sm text-emerald-700">Passport photo saved</p>
          </div>
        </div>
      )}
    </div>
  )
}

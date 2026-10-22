import { useRef, useState, type SyntheticEvent } from "react"
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type PercentCrop,
  type PixelCrop,
} from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import "./ManualCropper.css"

import { Button } from "@/components/ui/button"

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): PercentCrop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  )
}

type ManualCropperProps = {
  imgSrc: string
  onComplete: (croppedBase64: string) => void | Promise<void>
  onCancel: () => void
}

export default function ManualCropper({
  imgSrc,
  onComplete,
  onCancel,
}: ManualCropperProps) {
  const [crop, setCrop] = useState<PercentCrop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [isSaving, setIsSaving] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  function onImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    const { width, height } = event.currentTarget
    setCrop(centerAspectCrop(width, height, 3.5 / 4.5))
  }

  async function handleCropConfirm() {
    const image = imgRef.current
    const cropValue = completedCrop

    if (!image || !cropValue || isSaving) return

    const canvas = document.createElement("canvas")
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    canvas.width = 600
    canvas.height = 771

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(
      image,
      cropValue.x * scaleX,
      cropValue.y * scaleY,
      cropValue.width * scaleX,
      cropValue.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    )

    const base64Image = canvas.toDataURL("image/jpeg")
    setIsSaving(true)
    try {
      await Promise.resolve(onComplete(base64Image))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/85 p-3 sm:items-center sm:p-4">
      <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white p-4 text-center shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:p-5">
        <div className="shrink-0">
          <h3 className="text-lg font-semibold text-slate-900">Adjust Your Photo</h3>
          <p className="mt-1 text-sm text-slate-600">
            Drag to fit the passport photo within the box.
          </p>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-md bg-slate-900 p-2">
          <ReactCrop
            className="passport-react-crop"
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(nextCrop) => setCompletedCrop(nextCrop)}
            aspect={3.5 / 4.5}
            keepSelection
          >
            <img
              ref={imgRef}
              src={imgSrc}
              onLoad={onImageLoad}
              alt="Crop passport"
              className="max-h-[55dvh] max-w-full object-contain sm:max-h-[60dvh]"
            />
          </ReactCrop>
        </div>

        <div className="mt-4 flex shrink-0 gap-3 sm:mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleCropConfirm()}
            disabled={isSaving}
            style={{ flex: 1, padding: '10px', background: '#0f1c2f', color: 'white', borderRadius: '6px', fontWeight: 'bold' }}
          >
            {isSaving ? "Saving..." : "Confirm Crop"}
          </button>
        </div>
      </div>
    </div>
  )
}

import { Upload } from "lucide-react"

import { Input } from "@/components/ui/input"

type ImageUploaderProps = {
  disabled?: boolean
  onLoad: (file?: File) => void
}

export default function ImageUploader({ disabled = false, onLoad }: ImageUploaderProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 sm:p-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Upload className="h-8 w-8 text-slate-500" />
        <p className="text-sm text-slate-600">
          Upload any passport image and crop it to fit.
        </p>
        <Input
          type="file"
          accept="image/*"
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.currentTarget.value = ""
            onLoad(file)
          }}
        />
      </div>
    </div>
  )
}

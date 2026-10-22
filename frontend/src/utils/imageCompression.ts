import imageCompression, { type Options as ImageCompressionOptions } from "browser-image-compression"

export const IMAGE_UPLOAD_MAX_BYTES = 100 * 1024
const MIN_COMPRESSION_WIDTH = 96
const MIN_COMPRESSION_QUALITY = 0.18

type CompressionOptions = {
  maxBytes?: number
  fileName?: string
  preferredType?: string
  allowJpegFallback?: boolean
  maxWidthOrHeight?: number
}

type CompressionResult<T> = {
  value: T
  compressed: boolean
  originalBytes: number
  finalBytes: number
}

const DATA_URL_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i

export const isImageDataUrl = (value: string) => DATA_URL_PATTERN.test(value.trim())

export const getDataUrlByteSize = (dataUrl: string) => {
  const base64 = dataUrl.split(",")[1] ?? ""
  const padding = (base64.match(/=*$/)?.[0]?.length ?? 0)
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding)
}

export const dataUrlToFile = (dataUrl: string, fallbackName: string) => {
  const match = dataUrl.match(DATA_URL_PATTERN)
  if (!match) return null
  const mimeType = match[1]
  const base64Data = match[2]
  try {
    const binary = atob(base64Data)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    const extension = mimeType.split("/")[1]?.toLowerCase() || "png"
    const safeExtension = extension.replace(/[^a-z0-9]/gi, "") || "png"
    return new File([bytes], `${fallbackName}.${safeExtension}`, { type: mimeType })
  } catch {
    return null
  }
}

const normalizeFileName = (value?: string | null, fallback = "image") => {
  const trimmed = String(value ?? "").trim()
  return trimmed || fallback
}

const ensureFileInstance = (blob: Blob, fileName: string, fallbackType?: string) => {
  if (blob instanceof File && blob.name) return blob
  return new File([blob], fileName, {
    type: blob.type || fallbackType || "image/png",
    lastModified: Date.now(),
  })
}

const buildCompressionAttempts = (maxWidthOrHeight?: number) => {
  const base = Math.max(MIN_COMPRESSION_WIDTH, Math.round(maxWidthOrHeight ?? 1200))
  const widths = new Set<number>()
  let width = base
  let quality = 0.92
  const attempts: Array<{ quality: number; width: number }> = []

  while (!widths.has(width)) {
    widths.add(width)
    attempts.push({
      quality: Number(quality.toFixed(2)),
      width,
    })
    if (width === MIN_COMPRESSION_WIDTH) break

    const nextWidth = width > 480 ? Math.round(width * 0.82) : Math.round(width * 0.72)
    width = Math.max(MIN_COMPRESSION_WIDTH, nextWidth)
    quality = Math.max(MIN_COMPRESSION_QUALITY, quality - 0.08)
  }

  return attempts
}

const ensureCompressedWithinLimit = (file: File, maxBytes: number) => {
  if (file.size <= maxBytes) return file
  const limitInKb = Math.round(maxBytes / 1024)
  throw new Error(`Image could not be compressed below ${limitInKb}KB. Please crop or use a simpler image.`)
}

const compressFileByProfiles = async (
  input: File,
  options: {
    maxBytes: number
    fileName: string
    fileType?: string
    maxWidthOrHeight?: number
  }
) => {
  const maxSizeMB = options.maxBytes / (1024 * 1024)
  const attempts = buildCompressionAttempts(options.maxWidthOrHeight)

  let current = input
  let best = input

  for (const attempt of attempts) {
    const compressionOptions: ImageCompressionOptions = {
      maxSizeMB,
      maxWidthOrHeight: attempt.width,
      useWebWorker: true,
      maxIteration: 12,
      initialQuality: attempt.quality,
      alwaysKeepResolution: false,
      preserveExif: false,
      fileType: options.fileType || current.type || "image/jpeg",
    }
    try {
      const next = await imageCompression(current, compressionOptions)
      const nextFile = ensureFileInstance(next, options.fileName, compressionOptions.fileType)
      if (nextFile.size < best.size) best = nextFile
      current = nextFile
      if (nextFile.size <= options.maxBytes) {
        return nextFile
      }
    } catch {
      // Continue with the current candidate if one attempt fails.
    }
  }

  return best
}

export const compressImageFileIfNeeded = async (
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult<File>> => {
  const maxBytes = options.maxBytes ?? IMAGE_UPLOAD_MAX_BYTES
  const originalBytes = file.size
  if (originalBytes <= maxBytes) {
    return {
      value: file,
      compressed: false,
      originalBytes,
      finalBytes: originalBytes,
    }
  }

  const fileName = normalizeFileName(options.fileName, file.name || "image")
  const preferredType = options.preferredType || file.type || "image/jpeg"
  const candidate = await compressFileByProfiles(file, {
    maxBytes,
    fileName,
    fileType: preferredType,
    maxWidthOrHeight: options.maxWidthOrHeight,
  })

  let finalFile = candidate

  if (
    finalFile.size > maxBytes &&
    options.allowJpegFallback !== false &&
    preferredType !== "image/jpeg" &&
    finalFile.type !== "image/jpeg"
  ) {
    const jpegCandidate = await compressFileByProfiles(finalFile, {
      maxBytes,
      fileName,
      fileType: "image/jpeg",
      maxWidthOrHeight: options.maxWidthOrHeight,
    })
    if (jpegCandidate.size < finalFile.size) {
      finalFile = jpegCandidate
    }
  }

  finalFile = ensureCompressedWithinLimit(finalFile, maxBytes)

  return {
    value: finalFile,
    compressed: finalFile.size < originalBytes,
    originalBytes,
    finalBytes: finalFile.size,
  }
}

export const compressImageDataUrlIfNeeded = async (
  dataUrl: string,
  options: CompressionOptions = {}
): Promise<CompressionResult<string>> => {
  const normalized = String(dataUrl ?? "").trim()
  const originalBytes = getDataUrlByteSize(normalized)
  const maxBytes = options.maxBytes ?? IMAGE_UPLOAD_MAX_BYTES

  if (!isImageDataUrl(normalized) || originalBytes <= maxBytes) {
    return {
      value: normalized,
      compressed: false,
      originalBytes,
      finalBytes: originalBytes,
    }
  }

  const sourceFile = dataUrlToFile(normalized, normalizeFileName(options.fileName))
  if (!sourceFile) {
    return {
      value: normalized,
      compressed: false,
      originalBytes,
      finalBytes: originalBytes,
    }
  }

  const compressed = await compressImageFileIfNeeded(sourceFile, options)
  const nextDataUrl = await imageCompression.getDataUrlFromFile(compressed.value)
  const finalBytes = getDataUrlByteSize(nextDataUrl)

  return {
    value: nextDataUrl,
    compressed: compressed.compressed || finalBytes < originalBytes,
    originalBytes,
    finalBytes,
  }
}

export const toCompressedImageFile = async (
  value: unknown,
  options: CompressionOptions = {}
) => {
  if (value == null) return null

  let sourceFile: File | null = null
  if (value instanceof File) {
    sourceFile = value
  } else if (value instanceof Blob) {
    sourceFile = new File([value], normalizeFileName(options.fileName), {
      type: value.type || options.preferredType || "image/png",
      lastModified: Date.now(),
    })
  } else if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed || !isImageDataUrl(trimmed)) return null
    sourceFile = dataUrlToFile(trimmed, normalizeFileName(options.fileName))
  }

  if (!sourceFile) return null
  const compressed = await compressImageFileIfNeeded(sourceFile, options)
  return compressed.value
}

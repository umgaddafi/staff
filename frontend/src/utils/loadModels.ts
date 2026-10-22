type FaceApiNet = {
  loadFromUri: (url: string) => Promise<unknown>
}

type FaceApiDetectionChain = {
  withFaceLandmarks: () => {
    withFaceExpressions: () => Promise<FaceApiFaceDetection[]>
  }
}

export type FaceApiFaceDetection = {
  detection: {
    box: {
      x: number
      y: number
      width: number
      height: number
    }
  }
  expressions: {
    happy?: number
  }
  landmarks: {
    getLeftEye: () => unknown[]
    getRightEye: () => unknown[]
  }
}

export type FaceApiRuntime = {
  nets: {
    tinyFaceDetector: FaceApiNet
    faceLandmark68Net: FaceApiNet
    faceExpressionNet: FaceApiNet
  }
  TinyFaceDetectorOptions: new () => unknown
  detectAllFaces: (
    image: HTMLImageElement,
    options: unknown
  ) => FaceApiDetectionChain
}

declare global {
  interface Window {
    faceapi?: FaceApiRuntime
  }
}

let scriptLoadPromise: Promise<void> | null = null
let modelLoadPromise: Promise<void> | null = null

const resolvePublicAssetUrl = (relativePath: string) => {
  const configuredBaseUrl = String(import.meta.env.BASE_URL ?? "/").trim()
  const normalizedBaseUrl = configuredBaseUrl
    ? configuredBaseUrl.endsWith("/")
      ? configuredBaseUrl
      : `${configuredBaseUrl}/`
    : "/"
  const normalizedPath = relativePath.replace(/^\/+/, "")

  if (typeof window === "undefined") {
    return `${normalizedBaseUrl}${normalizedPath}`
  }

  return new URL(
    normalizedPath,
    new URL(normalizedBaseUrl, window.location.origin)
  ).toString()
}

const resolveModelUrl = () => {
  const configuredBaseUrl = String(import.meta.env.BASE_URL ?? "/").trim()
  const normalizedBaseUrl = configuredBaseUrl
    ? configuredBaseUrl.endsWith("/")
      ? configuredBaseUrl
      : `${configuredBaseUrl}/`
    : "/"

  if (typeof window === "undefined") {
    return `${normalizedBaseUrl.replace(/\/+$/, "")}/models`
  }

  return new URL("models", new URL(normalizedBaseUrl, window.location.origin)).toString()
}

const loadFaceApiScript = async () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Passport validation can only run in the browser.")
  }
  if (window.faceapi) return
  if (scriptLoadPromise) return scriptLoadPromise

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = resolvePublicAssetUrl("vendor/face-api/face-api.min.js")
    script.async = true
    script.dataset.faceApiRuntime = "true"
    script.onload = () => {
      if (window.faceapi) {
        resolve()
        return
      }
      scriptLoadPromise = null
      reject(new Error("Passport validation runtime did not initialize."))
    }
    script.onerror = () => {
      scriptLoadPromise = null
      reject(new Error("Unable to load passport validation runtime."))
    }
    document.head.appendChild(script)
  })

  return scriptLoadPromise
}

export const getFaceApiRuntime = async () => {
  await loadFaceApiScript()
  if (!window.faceapi) {
    throw new Error("Passport validation runtime is unavailable.")
  }
  return window.faceapi
}

export const loadModels = async () => {
  if (modelLoadPromise) {
    return modelLoadPromise
  }

  const modelUrl = resolveModelUrl()

  modelLoadPromise = getFaceApiRuntime()
    .then((faceapi) =>
      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
        faceapi.nets.faceExpressionNet.loadFromUri(modelUrl),
      ])
    )
    .then(() => undefined)
    .catch((error) => {
      modelLoadPromise = null
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Unknown error while loading models."
      throw new Error(`Unable to load passport validation models from ${modelUrl}. ${message}`)
    })

  return modelLoadPromise
}

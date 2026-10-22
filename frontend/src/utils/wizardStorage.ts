const INLINE_IMAGE_DATA_URL_PATTERN = /^data:image\//i

const isInlineImageDataUrl = (value: unknown) =>
  typeof value === "string" && INLINE_IMAGE_DATA_URL_PATTERN.test(value.trim())

export const sanitizeWizardDataForStorage = <T extends Record<string, unknown>>(data: T) => {
  const sanitizedEntries = Object.entries(data).filter(([key]) => key !== "signatureOriginal")
  return Object.fromEntries(sanitizedEntries) as Partial<T>
}

export const persistWizardStateSafely = <T extends Record<string, unknown>>(
  storageKey: string,
  payload: { step: number; data: T }
) => {
  if (typeof window === "undefined") return

  const sanitizedData = sanitizeWizardDataForStorage(payload.data)
  try {
    localStorage.setItem(storageKey, JSON.stringify({ step: payload.step, data: sanitizedData }))
    return
  } catch (error) {
    console.warn("Unable to persist wizard state with image data.", error)
  }

  const textOnlyData = Object.fromEntries(
    Object.entries(sanitizedData).filter(([, value]) => !isInlineImageDataUrl(value))
  ) as Partial<T>

  try {
    localStorage.setItem(storageKey, JSON.stringify({ step: payload.step, data: textOnlyData }))
  } catch (error) {
    console.warn("Unable to persist wizard state.", error)
  }
}

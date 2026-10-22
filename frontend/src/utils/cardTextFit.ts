export type TextFitResult = {
  text: string
  fontSize: number
  letterSpacingEm: number
}

export type TextFitOptions = {
  minFontSize: number
  maxFontSize: number
  paddingLeft?: number
  safeMargin?: number
  targetWidthRatio?: number
  maxStretchLetterSpacing?: number
  letterSpacingCandidates?: readonly number[]
  fontFamily?: string
  fontWeight?: number | string
}

const DEFAULT_FONT_FAMILY = '"Teko", sans-serif'
const DEFAULT_FONT_WEIGHT = 700
const DEFAULT_LETTER_SPACING_CANDIDATES = [0]

let measurementCanvas: HTMLCanvasElement | null = null

export function normalizeSingleLineText(value?: string | null) {
  return String(value ?? "").replace(/\s+/g, " ").trim()
}

function getMeasurementContext() {
  if (typeof document === "undefined") return null
  if (!measurementCanvas) {
    measurementCanvas = document.createElement("canvas")
  }
  return measurementCanvas.getContext("2d")
}

function measureTextGlyphWidth(text: string, fontSize: number, options: TextFitOptions) {
  if (!text) return 0

  const context = getMeasurementContext()
  if (!context) {
    return text.length * fontSize * 0.62
  }

  const fontFamily = options.fontFamily ?? DEFAULT_FONT_FAMILY
  const fontWeight = options.fontWeight ?? DEFAULT_FONT_WEIGHT
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  return context.measureText(text).width
}

function measureTextWidth(
  text: string,
  fontSize: number,
  letterSpacingEm: number,
  options: TextFitOptions
) {
  if (!text) return 0

  const glyphWidth = measureTextGlyphWidth(text, fontSize, options)
  const letterSpacingWidth = Math.max(0, text.length - 1) * letterSpacingEm * fontSize
  return glyphWidth + letterSpacingWidth
}

function findLargestFittingFontSize(
  text: string,
  availableWidth: number,
  letterSpacingEm: number,
  options: TextFitOptions
) {
  for (let size = options.maxFontSize; size >= options.minFontSize; size -= 0.25) {
    if (measureTextWidth(text, size, letterSpacingEm, options) <= availableWidth) {
      return Number(size.toFixed(2))
    }
  }

  return options.minFontSize
}

function stretchLetterSpacing(
  text: string,
  fontSize: number,
  baseLetterSpacingEm: number,
  availableWidth: number,
  options: TextFitOptions
) {
  const slots = Math.max(0, text.length - 1)
  if (slots <= 0) return baseLetterSpacingEm

  const glyphWidth = measureTextGlyphWidth(text, fontSize, options)
  const currentWidth = glyphWidth + slots * baseLetterSpacingEm * fontSize
  const targetWidthRatio = options.targetWidthRatio ?? 1
  const targetWidth = Math.min(availableWidth, availableWidth * targetWidthRatio)
  if (currentWidth >= targetWidth) return baseLetterSpacingEm

  const maxStretchLetterSpacing = options.maxStretchLetterSpacing ?? baseLetterSpacingEm
  const idealSpacing = (targetWidth - glyphWidth) / (slots * fontSize)
  const clampedIdeal = Math.max(
    baseLetterSpacingEm,
    Math.min(maxStretchLetterSpacing, idealSpacing)
  )
  const maxSpacingThatFits = (availableWidth - glyphWidth) / (slots * fontSize)
  const clampedMaxFit = Math.max(
    baseLetterSpacingEm,
    Math.min(maxStretchLetterSpacing, maxSpacingThatFits)
  )

  return Math.min(clampedIdeal, clampedMaxFit)
}

export function fitTextCandidatesToWidth(
  rawCandidates: string[],
  boxWidth: number,
  options: TextFitOptions
): TextFitResult {
  const letterSpacingCandidates =
    options.letterSpacingCandidates?.length
      ? options.letterSpacingCandidates
      : DEFAULT_LETTER_SPACING_CANDIDATES
  const candidates = rawCandidates.map(normalizeSingleLineText).filter(Boolean)

  if (candidates.length === 0) {
    return {
      text: "",
      fontSize: options.maxFontSize,
      letterSpacingEm: letterSpacingCandidates[0] ?? 0,
    }
  }

  const paddingLeft = options.paddingLeft ?? 0
  const safeMargin = options.safeMargin ?? 0
  const availableWidth = Math.max(20, boxWidth - paddingLeft - safeMargin)
  let bestResult: TextFitResult | null = null

  for (const candidate of candidates) {
    for (const letterSpacingEm of letterSpacingCandidates) {
      const fontSize = findLargestFittingFontSize(candidate, availableWidth, letterSpacingEm, options)
      const width = measureTextWidth(candidate, fontSize, letterSpacingEm, options)
      const fits = width <= availableWidth + 0.25
      if (!fits && fontSize <= options.minFontSize) continue

      const nextResult: TextFitResult = {
        text: candidate,
        fontSize,
        letterSpacingEm,
      }

      const isBetter =
        !bestResult ||
        nextResult.fontSize > bestResult.fontSize ||
        (nextResult.fontSize === bestResult.fontSize &&
          nextResult.text.length > bestResult.text.length)

      if (isBetter) {
        bestResult = nextResult
      }
    }
  }

  if (bestResult) {
    return {
      ...bestResult,
      letterSpacingEm: stretchLetterSpacing(
        bestResult.text,
        bestResult.fontSize,
        bestResult.letterSpacingEm,
        availableWidth,
        options
      ),
    }
  }

  const ellipsis = "…"
  const seed = candidates[0] ?? ""
  let trimmed = seed
  const fallbackSpacing = letterSpacingCandidates[letterSpacingCandidates.length - 1] ?? 0

  while (
    trimmed.length > 1 &&
    measureTextWidth(`${trimmed}${ellipsis}`, options.minFontSize, fallbackSpacing, options) >
      availableWidth
  ) {
    trimmed = trimmed.slice(0, -1).trimEnd()
  }

  return {
    text: `${trimmed}${ellipsis}`,
    fontSize: options.minFontSize,
    letterSpacingEm: fallbackSpacing,
  }
}

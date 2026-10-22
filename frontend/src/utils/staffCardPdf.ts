import { jsPDF } from "jspdf"
import juniorStaffFrontTemplate from "@/assets/JF.jpg"
import { buildStaffDisplayName } from "@/utils/staffName"
import { resolveStaffReferenceNumber } from "@/utils/staffReference"
import { abbreviateStaffRank } from "@/utils/staffRank"
import { isJuniorStaffTemplate } from "@/utils/staffTemplate"

export type StaffCardRecord = {
  id?: number | string
  fileNo?: string
  file_no?: string
  pfNumber?: string
  pf_number?: string
  category?: string
  referenceNumber?: string
  reference_number?: string
  firstName?: string
  first_name?: string
  lastName?: string
  last_name?: string
  otherName?: string
  other_name?: string
  departmentId?: string
  department?: string
  departmentName?: string
  rank?: string
  passport?: string
  passport_url?: string
  photoProcessed?: string
  signature?: string
  signature_url?: string
  signatureProcessed?: string
}

export type StaffFrontTextSizing = {
  nameFontPx: number
  nameMinFontPx: number
  departmentFontPx: number
  departmentMinFontPx: number
  rankFontPx: number
  rankMinFontPx: number
  fileNoFontPx: number
  fileNoMinFontPx: number
}

type GenerateStaffCardPdfParams = {
  staff: StaffCardRecord
  templateFrontUrl: string
  templateBackUrl: string
  resolveAssetUrl?: (pathOrUrl: string) => string
  frontTextSizing?: Partial<StaffFrontTextSizing>
  fileName?: string
  download?: boolean
}

type GenerateBulkStaffCardsParams = {
  staff: StaffCardRecord[]
  templateFrontUrl: string
  templateBackUrl: string
  resolveAssetUrl?: (pathOrUrl: string) => string
  frontTextSizing?: Partial<StaffFrontTextSizing>
  fileName?: string
  download?: boolean
}

const STAFF_FRONT_TEMPLATE_WIDTH_PX = 439
const STAFF_FRONT_TEMPLATE_HEIGHT_PX = 683
const STAFF_BACK_TEMPLATE_WIDTH_PX = 441
const STAFF_BACK_TEMPLATE_HEIGHT_PX = 687
const STAFF_PDF_WIDTH_MM = 90
const STAFF_PDF_HEIGHT_MM =
  (STAFF_PDF_WIDTH_MM * STAFF_FRONT_TEMPLATE_HEIGHT_PX) / STAFF_FRONT_TEMPLATE_WIDTH_PX
const frontXmm = (px: number) => (px / STAFF_FRONT_TEMPLATE_WIDTH_PX) * STAFF_PDF_WIDTH_MM
const frontYmm = (px: number) => (px / STAFF_FRONT_TEMPLATE_HEIGHT_PX) * STAFF_PDF_HEIGHT_MM
const backXmm = (px: number) => (px / STAFF_BACK_TEMPLATE_WIDTH_PX) * STAFF_PDF_WIDTH_MM
const backYmm = (px: number) => (px / STAFF_BACK_TEMPLATE_HEIGHT_PX) * STAFF_PDF_HEIGHT_MM
const FRONT_MM_PER_PX_Y = STAFF_PDF_HEIGHT_MM / STAFF_FRONT_TEMPLATE_HEIGHT_PX
const BACK_MM_PER_PX_Y = STAFF_PDF_HEIGHT_MM / STAFF_BACK_TEMPLATE_HEIGHT_PX
const fontPtFromFrontPx = (px: number) => (px * FRONT_MM_PER_PX_Y * 72) / 25.4
const fontPtFromBackPx = (px: number) => (px * BACK_MM_PER_PX_Y * 72) / 25.4

// Calibrated to SF/SB template guides to avoid clipping.
const FRONT_PHOTO_BOX = { xPx: 127, yPx: 309, wPx: 185, hPx: 192 }
const FRONT_NAME_BOX = { xPx: 152, yPx: 512, wPx: 245, hPx: 25 }
const FRONT_DEPT_BOX = { xPx: 145, yPx: 540, wPx: 238, hPx: 25 }
const FRONT_RANK_BOX = { xPx: 173, yPx: 569, wPx: 212, hPx: 25 }
const FRONT_FILE_NO_BOX = { xPx: 196, yPx: 595, wPx: 190, hPx: 25 }
const FRONT_SIGNATURE_BOX = { xPx: 200, yPx: 630, wPx: 110, hPx: 23 }
const BACK_QR_BOX = { xPx: 138, yPx: 473, sizePx: 166 }
const BACK_QR_CLEAR_BLEED_PX = 2
const BACK_REFERENCE_TEXT = { xPx: 430, yPx: 550, fontPx: 24 ,letterSpacingPx: 1.7 }
const DEFAULT_STAFF_FRONT_TEXT_SIZING: StaffFrontTextSizing = {
  nameFontPx: 24,
  nameMinFontPx: 12,
  departmentFontPx: 21,
  departmentMinFontPx: 11,
  rankFontPx: 20,
  rankMinFontPx: 11,
  fileNoFontPx: 20,
  fileNoMinFontPx: 11,
}

const DEFAULT_QR_RENDER_SIZE_PX = 512

const QR_IMAGE_URL_FACTORIES = [
  (payload: string, sizePx: number) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=${sizePx}x${sizePx}&margin=0&ecclevel=M&bgcolor=ffffff&color=000000&data=${encodeURIComponent(payload)}`,
  (payload: string, sizePx: number) =>
    `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=${sizePx}&margin=0&ecLevel=M&dark=000000&light=ffffff`,
]

const CARD_FONT_NAME = "Teko"
const CARD_FONT_STYLE = "normal"

const resolveAppAssetPath = (path: string) => {
  const relativePath = path.replace(/^\/+/, "")
  const baseUrl = String(import.meta.env.BASE_URL ?? "/").trim()
  if (!baseUrl || baseUrl === "/") return `/${relativePath}`
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
  return `${normalizedBase}${relativePath}`
}

const DEFAULT_CARD_FONT_URL = resolveAppAssetPath("fonts/Teko-Bold.ttf")
const CARD_FONT_FILE_NAME = "Teko-Bold.ttf"
let cachedCardFontBase64: string | null = null

const isDataUrl = (value: string) => value.startsWith("data:image/")

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url, { mode: "cors", cache: "no-cache" })
  if (!res.ok) throw new Error(`Failed to load image: ${url}`)
  const contentType = res.headers.get("content-type") || ""
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error(`Non-image response for ${url} (${contentType || "unknown content-type"})`)
  }
  const blob = await res.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Failed to convert image to base64"))
    reader.readAsDataURL(blob)
  })
}

async function ensureDataUrl(src?: string): Promise<string | null> {
  if (!src) return null
  if (isDataUrl(src)) return src
  return await urlToDataUrl(src)
}

type NormalizedImageData = {
  dataUrl: string
  format: "PNG" | "JPEG"
  width: number
  height: number
}

async function normalizeImageDataUrl(src?: string | null): Promise<NormalizedImageData | null> {
  if (!src) return null
  let dataUrl: string
  try {
    dataUrl = await ensureDataUrl(src)
  } catch (error) {
    console.warn("Failed to load image source", error)
    return null
  }
  if (!dataUrl) return null

  const image = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
  if (!image) return null

  const canvas = document.createElement("canvas")
  canvas.width = image.naturalWidth || image.width
  canvas.height = image.naturalHeight || image.height
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  ctx.drawImage(image, 0, 0)

  return {
    dataUrl: canvas.toDataURL("image/png"),
    format: "PNG",
    width: canvas.width,
    height: canvas.height,
  }
}

function addFilledImage({
  pdf,
  image,
  x,
  y,
  width,
  height,
}: {
  pdf: jsPDF
  image: NormalizedImageData
  x: number
  y: number
  width: number
  height: number
}) {
  pdf.addImage(image.dataUrl, image.format, x, y, width, height, undefined, "FAST")
}

function addContainedImage({
  pdf,
  image,
  x,
  y,
  width,
  height,
}: {
  pdf: jsPDF
  image: NormalizedImageData
  x: number
  y: number
  width: number
  height: number
}) {
  const sourceWidth = Number(image.width) || 1
  const sourceHeight = Number(image.height) || 1
  const scale = Math.min(width / sourceWidth, height / sourceHeight)
  const renderWidth = sourceWidth * scale
  const renderHeight = sourceHeight * scale
  const offsetX = x + (width - renderWidth) / 2
  const offsetY = y + (height - renderHeight) / 2
  pdf.addImage(image.dataUrl, image.format, offsetX, offsetY, renderWidth, renderHeight, undefined, "FAST")
}

async function addCoveredImage({
  pdf,
  image,
  x,
  y,
  width,
  height,
}: {
  pdf: jsPDF
  image: NormalizedImageData
  x: number
  y: number
  width: number
  height: number
}) {
  const sourceWidth = Number(image.width) || 1
  const sourceHeight = Number(image.height) || 1
  const targetAspect = width / height
  const sourceAspect = sourceWidth / sourceHeight

  let sourceX = 0
  let sourceY = 0
  let sourceCropWidth = sourceWidth
  let sourceCropHeight = sourceHeight

  if (sourceAspect > targetAspect) {
    sourceCropWidth = sourceHeight * targetAspect
    sourceX = (sourceWidth - sourceCropWidth) / 2
  } else {
    sourceCropHeight = sourceWidth / targetAspect
    sourceY = (sourceHeight - sourceCropHeight) / 2
  }

  const imageElement = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = image.dataUrl
  })

  if (!imageElement) {
    addFilledImage({ pdf, image, x, y, width, height })
    return
  }

  const cropCanvas = document.createElement("canvas")
  cropCanvas.width = Math.max(1, Math.round(sourceCropWidth))
  cropCanvas.height = Math.max(1, Math.round(sourceCropHeight))
  const cropContext = cropCanvas.getContext("2d")
  if (!cropContext) {
    addFilledImage({ pdf, image, x, y, width, height })
    return
  }

  cropContext.drawImage(
    imageElement,
    sourceX,
    sourceY,
    sourceCropWidth,
    sourceCropHeight,
    0,
    0,
    cropCanvas.width,
    cropCanvas.height
  )

  pdf.addImage(cropCanvas.toDataURL("image/png"), "PNG", x, y, width, height, undefined, "FAST")
}

async function loadCardFont(pdf: jsPDF, fontUrl = DEFAULT_CARD_FONT_URL) {
  if (!cachedCardFontBase64) {
    const res = await fetch(fontUrl, { mode: "cors", cache: "no-cache" })
    if (!res.ok) {
      throw new Error(`Failed to load Teko font from ${fontUrl}`)
    }
    const buffer = await res.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ""
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
    cachedCardFontBase64 = btoa(binary)
  }
  pdf.addFileToVFS(CARD_FONT_FILE_NAME, cachedCardFontBase64)
  pdf.addFont(CARD_FONT_FILE_NAME, CARD_FONT_NAME, CARD_FONT_STYLE)
}

function normalize(value?: string | null) {
  return String(value ?? "").replace(/\s+/g, " ").trim()
}

function pickFirstAvailable(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = normalize(value)
    if (normalized) return normalized
  }
  return ""
}

function resolveStaffFrontTextSizing(
  overrides?: Partial<StaffFrontTextSizing>
): StaffFrontTextSizing {
  const toPositiveNumber = (value: unknown, fallback: number) => {
    const numeric = typeof value === "number" ? value : Number(value)
    return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
  }

  return {
    nameFontPx: toPositiveNumber(
      overrides?.nameFontPx,
      DEFAULT_STAFF_FRONT_TEXT_SIZING.nameFontPx
    ),
    nameMinFontPx: toPositiveNumber(
      overrides?.nameMinFontPx,
      DEFAULT_STAFF_FRONT_TEXT_SIZING.nameMinFontPx
    ),
    departmentFontPx: toPositiveNumber(
      overrides?.departmentFontPx,
      DEFAULT_STAFF_FRONT_TEXT_SIZING.departmentFontPx
    ),
    departmentMinFontPx: toPositiveNumber(
      overrides?.departmentMinFontPx,
      DEFAULT_STAFF_FRONT_TEXT_SIZING.departmentMinFontPx
    ),
    rankFontPx: toPositiveNumber(
      overrides?.rankFontPx,
      DEFAULT_STAFF_FRONT_TEXT_SIZING.rankFontPx
    ),
    rankMinFontPx: toPositiveNumber(
      overrides?.rankMinFontPx,
      DEFAULT_STAFF_FRONT_TEXT_SIZING.rankMinFontPx
    ),
    fileNoFontPx: toPositiveNumber(
      overrides?.fileNoFontPx,
      DEFAULT_STAFF_FRONT_TEXT_SIZING.fileNoFontPx
    ),
    fileNoMinFontPx: toPositiveNumber(
      overrides?.fileNoMinFontPx,
      DEFAULT_STAFF_FRONT_TEXT_SIZING.fileNoMinFontPx
    ),
  }
}

type NormalizedStaffCardRecord = {
  id: number | string | null
  fileNo: string
  category: string
  referenceNumber: string
  firstName: string
  otherName: string
  lastName: string
  department: string
  rank: string
  passport: string
  signature: string
}

function normalizeStaffCardRecord(staff: StaffCardRecord): NormalizedStaffCardRecord {
  const normalizedId =
    typeof staff.id === "number" || typeof staff.id === "string" ? staff.id : null
  const normalizedReferenceNumber = resolveStaffReferenceNumber(
    pickFirstAvailable(staff.referenceNumber, staff.reference_number)
  )

  return {
    id: normalizedId,
    fileNo: pickFirstAvailable(staff.fileNo, staff.file_no, staff.pfNumber, staff.pf_number),
    category: pickFirstAvailable(staff.category),
    referenceNumber: normalizedReferenceNumber,
    firstName: pickFirstAvailable(staff.firstName, staff.first_name),
    otherName: pickFirstAvailable(staff.otherName, staff.other_name),
    lastName: pickFirstAvailable(staff.lastName, staff.last_name),
    department: pickFirstAvailable(staff.departmentId, staff.department, staff.departmentName),
    rank: pickFirstAvailable(staff.rank),
    passport: pickFirstAvailable(staff.passport, staff.passport_url, staff.photoProcessed),
    signature: pickFirstAvailable(staff.signature, staff.signature_url, staff.signatureProcessed),
  }
}

function safeUpper(value?: string | null) {
  const raw = normalize(value)
  return raw ? raw.toUpperCase() : "--"
}

function joinName(staff: NormalizedStaffCardRecord) {
  return buildStaffDisplayName({
    firstName: staff.firstName,
    otherName: staff.otherName,
    lastName: staff.lastName,
  })
}

function drawFittedText({
  pdf,
  text,
  x,
  y,
  maxWidth,
  fontSize,
  minFontSize = 6.5,
  absoluteMinFontSize = minFontSize,
  fontStep = 0.25,
}: {
  pdf: jsPDF
  text: string
  x: number
  y: number
  maxWidth: number
  fontSize: number
  minFontSize?: number
  absoluteMinFontSize?: number
  fontStep?: number
}) {
  const ellipsis = "..."
  const value = normalize(text) || "--"
  let size = fontSize
  pdf.setFont(CARD_FONT_NAME, CARD_FONT_STYLE)
  pdf.setFontSize(size)
  let output = value
  let width = pdf.getTextWidth(output)
  while (width > maxWidth && size > minFontSize) {
    size = Math.max(minFontSize, size - fontStep)
    pdf.setFontSize(size)
    width = pdf.getTextWidth(output)
  }
  while (width > maxWidth && size > absoluteMinFontSize) {
    size = Math.max(absoluteMinFontSize, size - 0.25)
    pdf.setFontSize(size)
    width = pdf.getTextWidth(output)
  }
  let trimEndIndex = value.length
  while (width > maxWidth && trimEndIndex > 1) {
    trimEndIndex -= 1
    output = `${value.slice(0, trimEndIndex).trimEnd()}${ellipsis}`
    width = pdf.getTextWidth(output)
  }
  pdf.text(output, x, y, { baseline: "middle" })
}

function drawFittedFrontBoxText({
  pdf,
  text,
  box,
  maxFontPx,
  minFontPx,
  paddingXPx = 2,
  verticalNudgePx = 0.5,
}: {
  pdf: jsPDF
  text: string
  box: { xPx: number; yPx: number; wPx: number; hPx: number }
  maxFontPx: number
  minFontPx: number
  paddingXPx?: number
  verticalNudgePx?: number
}) {
  const cappedMaxFontPx = Math.min(maxFontPx, box.hPx - 1)
  const safeMinFontPx = Math.min(minFontPx, cappedMaxFontPx)
  const absoluteMinFontPx = Math.max(8, safeMinFontPx - 1.5)

  drawFittedText({
    pdf,
    text,
    x: frontXmm(box.xPx + paddingXPx),
    y: frontYmm(box.yPx + box.hPx / 2 + verticalNudgePx),
    maxWidth: frontXmm(box.wPx - paddingXPx * 2),
    fontSize: fontPtFromFrontPx(cappedMaxFontPx),
    minFontSize: fontPtFromFrontPx(safeMinFontPx),
    absoluteMinFontSize: fontPtFromFrontPx(Math.min(absoluteMinFontPx, safeMinFontPx)),
    fontStep: 0.25,
  })
}

async function drawFrontPage({
  pdf,
  staff,
  templateFrontUrl,
  resolveAssetUrl,
  frontTextSizing,
}: {
  pdf: jsPDF
  staff: StaffCardRecord
  templateFrontUrl: string
  resolveAssetUrl?: (pathOrUrl: string) => string
  frontTextSizing: StaffFrontTextSizing
}) {
  const normalizedStaff = normalizeStaffCardRecord(staff)
  await loadCardFont(pdf)

  const frontTemplateUrl = isJuniorStaffTemplate({
    category: normalizedStaff.category,
    pfNumber: normalizedStaff.fileNo,
    fileNo: normalizedStaff.fileNo,
  })
    ? juniorStaffFrontTemplate
    : templateFrontUrl
  const templateImage = await normalizeImageDataUrl(frontTemplateUrl)
  if (!templateImage) throw new Error("Staff front template image missing.")
  addFilledImage({
    pdf,
    image: templateImage,
    x: 0,
    y: 0,
    width: STAFF_PDF_WIDTH_MM,
    height: STAFF_PDF_HEIGHT_MM,
  })

  const passportSrc = normalizedStaff.passport
    ? (resolveAssetUrl ? resolveAssetUrl(normalizedStaff.passport) : normalizedStaff.passport)
    : ""
  const signatureSrc = normalizedStaff.signature
    ? (resolveAssetUrl ? resolveAssetUrl(normalizedStaff.signature) : normalizedStaff.signature)
    : ""
  const passportImage = await normalizeImageDataUrl(passportSrc || undefined)
  const signatureImage = await normalizeImageDataUrl(signatureSrc || undefined)

  if (passportImage) {
    addFilledImage({
      pdf,
      image: passportImage,
      x: frontXmm(FRONT_PHOTO_BOX.xPx),
      y: frontYmm(FRONT_PHOTO_BOX.yPx),
      width: frontXmm(FRONT_PHOTO_BOX.wPx),
      height: frontYmm(FRONT_PHOTO_BOX.hPx),
    })
  }

  if (signatureImage) {
    const signatureX = frontXmm(FRONT_SIGNATURE_BOX.xPx)
    const signatureY = frontYmm(FRONT_SIGNATURE_BOX.yPx)
    const signatureWidth = frontXmm(FRONT_SIGNATURE_BOX.wPx)
    const signatureHeight = frontYmm(FRONT_SIGNATURE_BOX.hPx)
    pdf.setFillColor(255, 255, 255)
    pdf.rect(signatureX, signatureY, signatureWidth, signatureHeight, "F")
    addFilledImage({
      pdf,
      image: signatureImage,
      x: signatureX,
      y: signatureY,
      width: signatureWidth,
      height: signatureHeight,
    })
  }

  pdf.setTextColor(0, 0, 0)
  drawFittedFrontBoxText({
    pdf,
    text: safeUpper(joinName(normalizedStaff)),
    box: FRONT_NAME_BOX,
    maxFontPx: frontTextSizing.nameFontPx,
    minFontPx: frontTextSizing.nameMinFontPx,
  })
  drawFittedFrontBoxText({
    pdf,
    text: safeUpper(normalizedStaff.department),
    box: FRONT_DEPT_BOX,
    maxFontPx: frontTextSizing.departmentFontPx,
    minFontPx: frontTextSizing.departmentMinFontPx,
  })
  drawFittedFrontBoxText({
    pdf,
    text: safeUpper(abbreviateStaffRank(normalizedStaff.rank)),
    box: FRONT_RANK_BOX,
    maxFontPx: frontTextSizing.rankFontPx,
    minFontPx: frontTextSizing.rankMinFontPx,
  })
  drawFittedFrontBoxText({
    pdf,
    text: safeUpper(normalizedStaff.fileNo),
    box: FRONT_FILE_NO_BOX,
    maxFontPx: frontTextSizing.fileNoFontPx,
    minFontPx: frontTextSizing.fileNoMinFontPx,
  })
}

async function drawBackPage({
  pdf,
  staff,
  templateBackUrl,
}: {
  pdf: jsPDF
  staff: StaffCardRecord
  templateBackUrl: string
}) {
  const normalizedStaff = normalizeStaffCardRecord(staff)
  await loadCardFont(pdf)
  const templateImage = await normalizeImageDataUrl(templateBackUrl)
  if (!templateImage) throw new Error("Staff back template image missing.")
  addFilledImage({
    pdf,
    image: templateImage,
    x: 0,
    y: 0,
    width: STAFF_PDF_WIDTH_MM,
    height: STAFF_PDF_HEIGHT_MM,
  })

  const referenceNumber = normalize(normalizedStaff.referenceNumber)
  if (referenceNumber) {
    pdf.setTextColor(0, 0, 0)
    pdf.setFont(CARD_FONT_NAME, CARD_FONT_STYLE)
    pdf.setFontSize(fontPtFromBackPx(BACK_REFERENCE_TEXT.fontPx))
    pdf.text(
      referenceNumber,
      backXmm(BACK_REFERENCE_TEXT.xPx),
      backYmm(BACK_REFERENCE_TEXT.yPx),
      { angle: 90,
        charSpace:fontPtFromBackPx(BACK_REFERENCE_TEXT.letterSpacingPx) 
       }
    )
  }

  const payloadParts = [
    normalize(joinName(normalizedStaff)),
    normalize(normalizedStaff.fileNo),
    referenceNumber,
    normalize(normalizedStaff.department),
    normalize(normalizedStaff.rank),
  ]
  const hasPayload = payloadParts.some((part) => part.length > 0)
  if (!hasPayload) return
  const payload = payloadParts.join("|")

  let qrImage: NormalizedImageData | null = null
  for (const getQrUrl of QR_IMAGE_URL_FACTORIES) {
    try {
      qrImage = await normalizeImageDataUrl(getQrUrl(payload, DEFAULT_QR_RENDER_SIZE_PX))
      if (qrImage) break
    } catch (error) {
      console.warn("QR image generation provider failed", error)
    }
  }
  if (!qrImage) return

  const boxX = backXmm(BACK_QR_BOX.xPx)
  const boxY = backYmm(BACK_QR_BOX.yPx)
  const boxSize = backXmm(BACK_QR_BOX.sizePx)
  const clearBoxX = backXmm(BACK_QR_BOX.xPx - BACK_QR_CLEAR_BLEED_PX)
  const clearBoxY = backYmm(BACK_QR_BOX.yPx - BACK_QR_CLEAR_BLEED_PX)
  const clearBoxSize = backXmm(BACK_QR_BOX.sizePx + BACK_QR_CLEAR_BLEED_PX * 2)
  pdf.setFillColor(255, 255, 255)
  pdf.rect(clearBoxX, clearBoxY, clearBoxSize, clearBoxSize, "F")
  addFilledImage({
    pdf,
    image: qrImage,
    x: boxX,
    y: boxY,
    width: boxSize,
    height: boxSize,
  })
}

export async function generateStaffIdCardPdf({
  staff,
  templateFrontUrl,
  templateBackUrl,
  resolveAssetUrl,
  frontTextSizing,
  fileName,
  download = false,
}: GenerateStaffCardPdfParams): Promise<string | void> {
  const normalizedStaff = normalizeStaffCardRecord(staff)
  const resolvedFrontTextSizing = resolveStaffFrontTextSizing(frontTextSizing)
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [STAFF_PDF_WIDTH_MM, STAFF_PDF_HEIGHT_MM],
    compress: true,
  })

  await drawFrontPage({
    pdf,
    staff: normalizedStaff,
    templateFrontUrl,
    resolveAssetUrl,
    frontTextSizing: resolvedFrontTextSizing,
  })
  pdf.addPage([STAFF_PDF_WIDTH_MM, STAFF_PDF_HEIGHT_MM], "portrait")
  await drawBackPage({ pdf, staff: normalizedStaff, templateBackUrl })

  const outName = fileName?.trim() || `staff-card-${normalizedStaff.fileNo || "staff"}.pdf`
  if (download) {
    pdf.save(outName)
    return
  }
  return URL.createObjectURL(pdf.output("blob"))
}

export async function generateBulkStaffIdCardsPdf({
  staff,
  templateFrontUrl,
  templateBackUrl,
  resolveAssetUrl,
  frontTextSizing,
  fileName,
  download = false,
}: GenerateBulkStaffCardsParams): Promise<string | void> {
  if (staff.length === 0) throw new Error("No staff cards to export.")
  const resolvedFrontTextSizing = resolveStaffFrontTextSizing(frontTextSizing)

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [STAFF_PDF_WIDTH_MM, STAFF_PDF_HEIGHT_MM],
    compress: true,
  })

  for (let i = 0; i < staff.length; i += 1) {
    const member = normalizeStaffCardRecord(staff[i])
    if (i > 0) {
      pdf.addPage([STAFF_PDF_WIDTH_MM, STAFF_PDF_HEIGHT_MM], "portrait")
    }
    await drawFrontPage({
      pdf,
      staff: member,
      templateFrontUrl,
      resolveAssetUrl,
      frontTextSizing: resolvedFrontTextSizing,
    })
    pdf.addPage([STAFF_PDF_WIDTH_MM, STAFF_PDF_HEIGHT_MM], "portrait")
    await drawBackPage({ pdf, staff: member, templateBackUrl })
  }

  const outName = fileName?.trim() || "bulk-staff-cards.pdf"
  if (download) {
    pdf.save(outName)
    return
  }
  return URL.createObjectURL(pdf.output("blob"))
}

import { jsPDF } from "jspdf"

export type IdCardStudent = {
  id?: string | number
  matric: string
  referenceNumber?: string
  firstName: string
  lastName: string
  otherName?: string
  departmentName?: string
  departmentId?: string
  graduationYear?: string
  passport?: string
  signature?: string
}

const CARD_PDF_WIDTH_MM = 101.9
const CARD_PDF_HEIGHT_MM = 65.9
const PX_PER_MM = 10

const mm = (px: number) => px / PX_PER_MM

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

export const PDF_BLOB_URL_REVOKE_DELAY_MS = 60_000

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

/** object-contain equivalent */
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

/** object-fill equivalent (stretch to fill box) */
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

/** object-cover equivalent (crop to fill box) */
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
    addContainedImage({ pdf, image, x, y, width, height })
    return
  }

  const cropCanvas = document.createElement("canvas")
  cropCanvas.width = Math.max(1, Math.round(sourceCropWidth))
  cropCanvas.height = Math.max(1, Math.round(sourceCropHeight))
  const cropContext = cropCanvas.getContext("2d")
  if (!cropContext) {
    addContainedImage({ pdf, image, x, y, width, height })
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
    cropCanvas.height,
  )

  pdf.addImage(cropCanvas.toDataURL("image/png"), "PNG", x, y, width, height, undefined, "FAST")
}

function safeUpper(value?: string) {
  return (value ?? "").toString().trim().toUpperCase()
}

function normalizeDepartmentKey(value?: string) {
  return (value ?? "")
    .toString()
    .toLowerCase()
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s*&\s*/g, " & ")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim()
}

const PDF_DEPARTMENT_ABBREVIATIONS = new Map<string, string>([
  ["mathematics / computer science education", "Math/Computer Sci. Ed."],
  ["agric-economics & management technology", "Agric. Econ. & Mgt. Tech."],
  ["pre-primary education (social studies)", "Pre-Prim. Ed. (Soc. Stud.)"],
  ["statistics / computer science education", "Stats/Computer Sci. Ed."],
  ["educational administration & planning", "Ed. Admin. & Plan."],
  ["agricultural marketing & cooperative", "Agric. Marketing. & Coop."],
  ["electrical / electronics engineering", "ELEC./ELEC. ENGINEERING"],
  ["mathematics / statistics education", "Math/Statistics Ed."],
  ["educational management & planning", "Ed. Mgt. & Planning."],
  ["agricultural science & education", "Agric. Sci. & Ed."],
  ["crop & environmental protection", "Crop & Envtl. Protection."],
  ["forestry & wildlife management", "Forestry & Wildlife Mgt."],
  ["sustainable social development", "Sust. Soc. Development."],
  ["education & integrated science", "Ed. & Integrated. Sci."],
  ["industrial technical education", "Industrial. Tech. Ed."],
  ["plant breeding & seed science", "Plant Breed. & Seed Sci."],
  ["library & information science", "Library. & Info. Sci."],
  ["telecommunication engineering", "Telecom Engineering."],
  ["environmental sustainability", "Environmental Sust."],
  ["food science & technology", "Food Sci. & Tech."],
])

function abbreviateDepartmentForPdf(value?: string) {
  const raw = (value ?? "").toString().trim()
  if (!raw) return ""
  const normalized = normalizeDepartmentKey(raw)
  return PDF_DEPARTMENT_ABBREVIATIONS.get(normalized) ?? raw
}

function resolveDepartmentFontBounds(text: string) {
  const length = text.trim().length
  let maxFontSize = defaultTextLayout.deptMaxFontSize
  let minFontSize = defaultTextLayout.deptMinFontSize

  // Extra guard for exceptionally long department values.
  if (length >= 36) {
    maxFontSize -= 1.0
    minFontSize -= 1.0
  } else if (length >= 30) {
    maxFontSize -= 0.75
    minFontSize -= 0.75
  } else if (length >= 26) {
    maxFontSize -= 0.5
    minFontSize -= 0.5
  }

  return {
    maxFontSize: Math.max(8, maxFontSize),
    minFontSize: Math.max(6.5, minFontSize),
  }
}

function middleInitial(value?: string) {
  const normalized = (value ?? "").toString().trim()
  return normalized[0] ? `${normalized[0]}.` : ""
}

function joinName(s: IdCardStudent) {
  const firstName = (s.firstName ?? "").toString().trim()
  const otherName = (s.otherName ?? "").toString().trim()
  const lastName = (s.lastName ?? "").toString().trim()

  if (firstName && otherName && lastName) {
    return [firstName, middleInitial(otherName), lastName].filter(Boolean).join(" ").trim()
  }

  return [firstName, otherName, lastName].filter(Boolean).join(" ").trim()
}

function joinFullName(s: IdCardStudent) {
  const firstName = (s.firstName ?? "").toString().trim()
  const otherName = (s.otherName ?? "").toString().trim()
  const lastName = (s.lastName ?? "").toString().trim()
  return [firstName, otherName, lastName].filter(Boolean).join(" ").trim()
}

type GenerateIdCardPdfParams = {
  student: IdCardStudent
  templateFrontUrl: string
  templateBackUrl: string
  resolveAssetUrl?: (pathOrUrl: string) => string
  fileName?: string
  download?: boolean
}

type GenerateBulkParams = {
  students: IdCardStudent[]
  templateFrontUrl: string
  templateBackUrl: string
  resolveAssetUrl?: (pathOrUrl: string) => string
  fileName?: string
  download?: boolean
}

const defaultPassportBox = {
  xPx: 689,
  yPx: 105,
  wPx: 255,
  hPx: 282,
}

const defaultSignatureBox = {
  xPx: 710,
  yPx: 595,
  wPx: 170,
  hPx: 45,
}

const defaultBackQrBox = {
  xPx: 29,
  yPx: 404,
  sizePx: 216,
}

const defaultBackReferenceText = {
  textXPx: 996,
  textYPx: 625,
  fontSizePt: 11,
}

const DEFAULT_QR_RENDER_SIZE_PX = 512

const QR_IMAGE_URL_FACTORIES = [
  (payload: string, sizePx: number) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=${sizePx}x${sizePx}&margin=0&ecclevel=M&data=${encodeURIComponent(payload)}`,
  (payload: string, sizePx: number) =>
    `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=${sizePx}&margin=0&ecLevel=M`,
]

const defaultTextLayout = {
  xBasePx: 580 + 70,
  xNameOffsetPx: -70,
  xDeptOffsetPx: -74,
  xMatOffsetPx: -35,
  xValOffsetPx: 0,
  rowNameYPx: 430 + 4,
  rowDeptYPx: 470 + 8,
  rowMatYPx: 520 + 4,
  rowValYPx: 560 + 6,
  nameMaxFontSize: 12.5,
  nameMinFontSize: 8.5,
  deptMaxFontSize: 12.5,
  deptMinFontSize: 8.5,
  matFontSize: 11.5,
  valFontSize: 11.5,
  nameWidthPx: 426,
  deptWidthPx: 436,
  matWidthPx: 397,
  valWidthPx: 361,
}

const textMaxWidth = {
  name: mm(defaultTextLayout.nameWidthPx),
  dept: mm(defaultTextLayout.deptWidthPx),
  mat: mm(defaultTextLayout.matWidthPx),
  val: mm(defaultTextLayout.valWidthPx),
}

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

async function loadCardFont(pdf: jsPDF, fontUrl = DEFAULT_CARD_FONT_URL) {
  if (!cachedCardFontBase64) {
    const res = await fetch(fontUrl, { mode: "cors", cache: "no-cache" })
    if (!res.ok) {
      console.error("Card font fetch failed", res.status, fontUrl)
      throw new Error(`Failed to load Teko font from ${fontUrl}`)
    }
    const buffer = await res.arrayBuffer()
    if (!buffer || buffer.byteLength === 0) {
      console.error("Card font empty response", fontUrl)
      throw new Error(`Empty Teko font response from ${fontUrl}`)
    }
    const bytes = new Uint8Array(buffer)
    let binary = ""
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
    cachedCardFontBase64 = btoa(binary)
  }
  pdf.addFileToVFS(CARD_FONT_FILE_NAME, cachedCardFontBase64)
  pdf.addFont(CARD_FONT_FILE_NAME, CARD_FONT_NAME, CARD_FONT_STYLE)
}

function drawFittedText({
  pdf,
  text,
  x,
  y,
  maxWidth,
  fontSize,
  minFontSize = 6,
  absoluteMinFontSize = minFontSize,
  fontStep = 0.5,
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
  const value = text?.trim() || "--"
  pdf.setFont(CARD_FONT_NAME, CARD_FONT_STYLE)
  let size = fontSize
  pdf.setFontSize(size)
  if (maxWidth > 0) {
    let width = pdf.getTextWidth(value)
    while (width > maxWidth && size > minFontSize) {
      size -= fontStep
      pdf.setFontSize(size)
      width = pdf.getTextWidth(value)
    }

    // Safety fallback: if still overflowing, continue shrinking a bit more.
    while (width > maxWidth && size > absoluteMinFontSize) {
      size -= 0.25
      pdf.setFontSize(size)
      width = pdf.getTextWidth(value)
    }
  }
  pdf.text(value, x, y, { baseline: "middle" })
}

async function drawFrontPage({
  pdf,
  student,
  templateFrontUrl,
  resolveAssetUrl,
}: {
  pdf: jsPDF
  student: IdCardStudent
  templateFrontUrl: string
  resolveAssetUrl?: (pathOrUrl: string) => string
}) {
  await loadCardFont(pdf)

  const templateImage = await normalizeImageDataUrl(templateFrontUrl)
  if (!templateImage) throw new Error("Template image missing.")
  pdf.addImage(
    templateImage.dataUrl,
    templateImage.format,
    0,
    0,
    CARD_PDF_WIDTH_MM,
    CARD_PDF_HEIGHT_MM,
    undefined,
    "FAST",
  )

  const passportSrc = student.passport ? (resolveAssetUrl ? resolveAssetUrl(student.passport) : student.passport) : ""
  const signatureSrc = student.signature ? (resolveAssetUrl ? resolveAssetUrl(student.signature) : student.signature) : ""

  const passportImage = await normalizeImageDataUrl(passportSrc || undefined)
  const signatureImage = await normalizeImageDataUrl(signatureSrc || undefined)

  // ✅ PASSPORT: object-fill (stretch) — replace with addCoveredImage for cover, addContainedImage for contain
  if (passportImage) {
    addFilledImage({
      pdf,
      image: passportImage,
      x: mm(defaultPassportBox.xPx),
      y: mm(defaultPassportBox.yPx),
      width: mm(defaultPassportBox.wPx),
      height: mm(defaultPassportBox.hPx),
    })
  }

  // Signature: object-fill (stretch to fill signature box)
  if (signatureImage) {
    addFilledImage({
      pdf,
      image: signatureImage,
      x: mm(defaultSignatureBox.xPx),
      y: mm(defaultSignatureBox.yPx),
      width: mm(defaultSignatureBox.wPx),
      height: mm(defaultSignatureBox.hPx),
    })
  }

  const name = safeUpper(joinName(student))
  const dept = safeUpper(abbreviateDepartmentForPdf(student.departmentName || student.departmentId))
  const deptFontBounds = resolveDepartmentFontBounds(dept)
  const matric = safeUpper(student.matric)
  const validity = student.graduationYear?.trim() ? safeUpper(student.graduationYear) : ""

  pdf.setTextColor(0, 0, 0)

  drawFittedText({
    pdf,
    text: name,
    x: mm(defaultTextLayout.xBasePx + defaultTextLayout.xNameOffsetPx),
    y: mm(defaultTextLayout.rowNameYPx),
    maxWidth: textMaxWidth.name,
    fontSize: defaultTextLayout.nameMaxFontSize,
    minFontSize: defaultTextLayout.nameMinFontSize,
  })
  drawFittedText({
    pdf,
    text: dept,
    x: mm(defaultTextLayout.xBasePx + defaultTextLayout.xDeptOffsetPx),
    y: mm(defaultTextLayout.rowDeptYPx),
    maxWidth: textMaxWidth.dept,
    fontSize: deptFontBounds.maxFontSize,
    minFontSize: deptFontBounds.minFontSize,
    absoluteMinFontSize: 6.5,
    fontStep: 0.25,
  })
  drawFittedText({
    pdf,
    text: matric,
    x: mm(defaultTextLayout.xBasePx + defaultTextLayout.xMatOffsetPx),
    y: mm(defaultTextLayout.rowMatYPx),
    maxWidth: textMaxWidth.mat,
    fontSize: defaultTextLayout.matFontSize,
  })
  if (validity) {
    drawFittedText({
      pdf,
      text: validity,
      x: mm(defaultTextLayout.xBasePx + defaultTextLayout.xValOffsetPx),
      y: mm(defaultTextLayout.rowValYPx),
      maxWidth: textMaxWidth.val,
      fontSize: defaultTextLayout.valFontSize,
    })
  }
}

async function drawBackPage({
  pdf,
  student,
  templateBackUrl,
}: {
  pdf: jsPDF
  student: IdCardStudent
  templateBackUrl: string
}) {
  const templateImage = await normalizeImageDataUrl(templateBackUrl)
  if (!templateImage) throw new Error("Back template image missing.")
  pdf.addImage(templateImage.dataUrl, templateImage.format, 0, 0, CARD_PDF_WIDTH_MM, CARD_PDF_HEIGHT_MM, undefined, "FAST")

  const fullName = joinFullName(student)
  const matric = (student.matric ?? "").toString().trim()
  const referenceNumber = (student.referenceNumber ?? "").toString().trim().toUpperCase()
  const department = (student.departmentName ?? student.departmentId ?? "").toString().trim()
  const payload = `${fullName}|${matric}|${referenceNumber}|${department}`

  if (referenceNumber) {
    pdf.setFont(CARD_FONT_NAME, CARD_FONT_STYLE)
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(defaultBackReferenceText.fontSizePt)
    pdf.text(
      referenceNumber,
      mm(defaultBackReferenceText.textXPx),
      mm(defaultBackReferenceText.textYPx),
      // Match the back-preview vertical-rl text direction on the right edge.
      { angle: 90 }
    )
  }

  let qrImage: NormalizedImageData | null = null
  for (const getQrUrl of QR_IMAGE_URL_FACTORIES) {
    try {
      qrImage = await normalizeImageDataUrl(getQrUrl(payload, DEFAULT_QR_RENDER_SIZE_PX))
      if (qrImage) break
    } catch (error) {
      console.warn("QR image generation provider failed", error)
    }
  }

  if (!qrImage) {
    console.warn("Failed to generate QR image for back template", payload)
    return
  }

  const boxX = mm(defaultBackQrBox.xPx)
  const boxY = mm(defaultBackQrBox.yPx)
  const boxSize = mm(defaultBackQrBox.sizePx)

  pdf.setFillColor(255, 255, 255)
  pdf.rect(boxX, boxY, boxSize, boxSize, "F")

  addFilledImage({
    pdf,
    image: qrImage,
    x: boxX,
    y: boxY,
    width: boxSize,
    height: boxSize,
  })
}

export async function generateIdCardPdf({
  student,
  templateFrontUrl,
  templateBackUrl,
  resolveAssetUrl,
  fileName,
  download = false,
}: GenerateIdCardPdfParams): Promise<string | void> {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [CARD_PDF_WIDTH_MM, CARD_PDF_HEIGHT_MM],
    compress: true,
  })

  await drawFrontPage({ pdf, student, templateFrontUrl, resolveAssetUrl })
  pdf.addPage([CARD_PDF_WIDTH_MM, CARD_PDF_HEIGHT_MM], "landscape")
  await drawBackPage({ pdf, student, templateBackUrl })

  const outName = fileName?.trim() || `id-card-${student.matric || "student"}.pdf`
  if (download) {
    pdf.save(outName)
    return
  }
  return URL.createObjectURL(pdf.output("blob"))
}

export async function generateBulkIdCardsPdf({
  students,
  templateFrontUrl,
  templateBackUrl,
  resolveAssetUrl,
  fileName,
  download = false,
}: GenerateBulkParams): Promise<string | void> {
  if (students.length === 0) throw new Error("No students to export")

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [CARD_PDF_WIDTH_MM, CARD_PDF_HEIGHT_MM],
    compress: true,
  })

  for (let i = 0; i < students.length; i += 1) {
    const student = students[i]

    if (i > 0) {
      pdf.addPage([CARD_PDF_WIDTH_MM, CARD_PDF_HEIGHT_MM], "landscape")
    }
    await drawFrontPage({ pdf, student, templateFrontUrl, resolveAssetUrl })

    pdf.addPage([CARD_PDF_WIDTH_MM, CARD_PDF_HEIGHT_MM], "landscape")
    await drawBackPage({ pdf, student, templateBackUrl })
  }

  const outName = fileName?.trim() || "bulk-id-cards.pdf"
  if (download) {
    pdf.save(outName)
    return
  }
  return URL.createObjectURL(pdf.output("blob"))
}

import { jsPDF } from "jspdf"

import logoImage from "@/assets/logo.jpeg"
import { resolveStaffReferenceNumber } from "@/utils/staffReference"

const PAGE_WIDTH_MM = 210
const PAGE_HEIGHT_MM = 297
const PAGE_MARGIN_X_MM = 18
const PAGE_MARGIN_TOP_MM = 13
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - PAGE_MARGIN_X_MM * 2
const FIELD_GAP_MM = 6
const FIELD_WIDTH_MM = (CONTENT_WIDTH_MM - FIELD_GAP_MM) / 2
const PAGE_FRAME_INSET_MM = 10
const PAGE_FOOTER_Y_MM = PAGE_HEIGHT_MM - 14

type ReceiptParty = "student" | "staff"

type BaseReceiptPayload = {
  kind: ReceiptParty
  fullName: string
  department?: string | null
  email?: string | null
  paymentReference?: string | null
  paymentAmountKobo?: number | null
  fallbackAmountNaira?: number | null
  paymentChannel?: string | null
  paymentPaidAt?: string | null
  requestStatus?: string | null
  requestType?: string | null
  requestDetails?: string | null
  signatureUrl?: string | null
}

export type StudentRenewalReceiptPayload = BaseReceiptPayload & {
  kind: "student"
  matricNo?: string | null
  jambNo?: string | null
  referenceNumber?: string | null
  graduationYear?: string | number | null
}

export type StaffRenewalReceiptPayload = BaseReceiptPayload & {
  kind: "staff"
  pfNumber?: string | null
  referenceNumber?: string | null
  phone?: string | null
  rank?: string | null
  category?: string | null
}

export type RenewalReceiptPayload = StudentRenewalReceiptPayload | StaffRenewalReceiptPayload

type GenerateRenewalReceiptPdfParams = {
  payload: RenewalReceiptPayload
  autoPrint?: boolean
}

type ReceiptField = {
  label: string
  value: string
}

type NormalizedImageData = {
  dataUrl: string
  format: "PNG" | "JPEG"
  width: number
  height: number
}

const isDataUrl = (value: string) => value.startsWith("data:image/")
const RECEIPT_FONT_NAME = "DejaVuSans"
const RECEIPT_FONT_REGULAR_FILE_NAME = "DejaVuSans.ttf"
const RECEIPT_FONT_BOLD_FILE_NAME = "DejaVuSans-Bold.ttf"
let cachedReceiptRegularFontBase64: string | null = null
let cachedReceiptBoldFontBase64: string | null = null

const resolveAppAssetPath = (path: string) => {
  const relativePath = path.replace(/^\/+/, "")
  const baseUrl = String(import.meta.env.BASE_URL ?? "/").trim()
  if (!baseUrl || baseUrl === "/") return `/${relativePath}`
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
  return `${normalizedBase}${relativePath}`
}

const RECEIPT_FONT_REGULAR_URL = resolveAppAssetPath("fonts/DejaVuSans.ttf")
const RECEIPT_FONT_BOLD_URL = resolveAppAssetPath("fonts/DejaVuSans-Bold.ttf")

const toDisplayValue = (value?: string | number | null) => {
  const normalized = String(value ?? "").trim()
  return normalized || "--"
}

const formatCurrencyFromKobo = (amountKobo?: number | null, fallbackAmountNaira?: number | null) => {
  const normalizedKobo = Number.isFinite(amountKobo) && Number(amountKobo) > 0 ? Number(amountKobo) : null
  const amountNaira = normalizedKobo !== null ? normalizedKobo / 100 : fallbackAmountNaira ?? 0

  return `₦${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountNaira)}`
}

const formatDateTime = (value?: string | null) => {
  const normalized = String(value ?? "").trim()
  if (!normalized) return "--"

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return normalized

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

const formatRequestStatus = (value?: string | null) => {
  const normalized = String(value ?? "").trim()
  if (!normalized) return "--"

  return normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
}

const formatRequestType = (value?: string | null) => {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "reissue-lost":
      return "Lost card replacement"
    case "reissue-damaged":
      return "Damaged card replacement"
    case "renew-expired":
      return "Expired card renewal"
    default:
      return formatRequestStatus(value)
  }
}

const buildReceiptFileName = (payload: RenewalReceiptPayload) => {
  const identifier = payload.kind === "student" ? payload.matricNo : payload.pfNumber
  const safeIdentifier = String(identifier ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return `${payload.kind}-renewal-receipt-${safeIdentifier || "record"}.pdf`
}

async function urlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url, { mode: "cors", cache: "no-cache" })
  if (!response.ok) {
    throw new Error(`Failed to load image: ${url}`)
  }

  const contentType = response.headers.get("content-type") || ""
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error(`Invalid image response for ${url}`)
  }

  const blob = await response.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Failed to convert image to data URL."))
    reader.readAsDataURL(blob)
  })
}

async function fetchFontBase64(url: string) {
  const response = await fetch(url, { mode: "cors", cache: "no-cache" })
  if (!response.ok) {
    throw new Error(`Failed to load receipt font from ${url}`)
  }

  const buffer = await response.arrayBuffer()
  if (!buffer || buffer.byteLength === 0) {
    throw new Error(`Empty receipt font response from ${url}`)
  }

  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index])
  }
  return btoa(binary)
}

async function loadReceiptFonts(pdf: jsPDF) {
  if (!cachedReceiptRegularFontBase64) {
    cachedReceiptRegularFontBase64 = await fetchFontBase64(RECEIPT_FONT_REGULAR_URL)
  }
  if (!cachedReceiptBoldFontBase64) {
    cachedReceiptBoldFontBase64 = await fetchFontBase64(RECEIPT_FONT_BOLD_URL)
  }

  pdf.addFileToVFS(RECEIPT_FONT_REGULAR_FILE_NAME, cachedReceiptRegularFontBase64)
  pdf.addFont(RECEIPT_FONT_REGULAR_FILE_NAME, RECEIPT_FONT_NAME, "normal")
  pdf.addFileToVFS(RECEIPT_FONT_BOLD_FILE_NAME, cachedReceiptBoldFontBase64)
  pdf.addFont(RECEIPT_FONT_BOLD_FILE_NAME, RECEIPT_FONT_NAME, "bold")
}

async function normalizeImageDataUrl(src?: string | null): Promise<NormalizedImageData | null> {
  if (!src) return null

  let dataUrl = src
  if (!isDataUrl(src)) {
    try {
      dataUrl = await urlToDataUrl(src)
    } catch (error) {
      console.warn("Unable to prepare image for receipt PDF.", error)
      return null
    }
  }

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
  const context = canvas.getContext("2d")
  if (!context) return null

  context.drawImage(image, 0, 0)

  return {
    dataUrl: canvas.toDataURL("image/png"),
    format: "PNG",
    width: canvas.width,
    height: canvas.height,
  }
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

function drawFieldBlock({
  pdf,
  label,
  value,
  x,
  y,
  width,
  maxLines = 2,
}: {
  pdf: jsPDF
  label: string
  value: string
  x: number
  y: number
  width: number
  maxLines?: number
}) {
  pdf.setFont(RECEIPT_FONT_NAME, "bold")
  pdf.setFontSize(7.2)
  pdf.setTextColor(71, 85, 105)
  pdf.text(label.toUpperCase(), x, y)

  pdf.setFont(RECEIPT_FONT_NAME, "normal")
  pdf.setFontSize(9)
  pdf.setTextColor(15, 23, 42)
  const rawLines = pdf.splitTextToSize(toDisplayValue(value), width) as string[]
  const valueLines = rawLines.slice(0, maxLines)
  if (rawLines.length > maxLines) {
    let lastLine = valueLines[maxLines - 1] ?? ""
    while (lastLine.length > 0 && pdf.getTextWidth(`${lastLine}...`) > width) {
      lastLine = lastLine.slice(0, -1)
    }
    valueLines[maxLines - 1] = `${lastLine.trimEnd()}...`
  }
  pdf.text(valueLines, x, y + 4.5)

  return y + 4.5 + valueLines.length * 3.8
}

function drawFieldRow(pdf: jsPDF, y: number, leftField: ReceiptField, rightField?: ReceiptField) {
  const leftBottom = drawFieldBlock({
    pdf,
    label: leftField.label,
    value: leftField.value,
    x: PAGE_MARGIN_X_MM,
    y,
    width: FIELD_WIDTH_MM,
  })

  const rightBottom = rightField
    ? drawFieldBlock({
        pdf,
        label: rightField.label,
        value: rightField.value,
        x: PAGE_MARGIN_X_MM + FIELD_WIDTH_MM + FIELD_GAP_MM,
        y,
        width: FIELD_WIDTH_MM,
      })
    : leftBottom

  return Math.max(leftBottom, rightBottom) + 3.5
}

function drawFullWidthField(pdf: jsPDF, y: number, field: ReceiptField, maxLines = 2) {
  return drawFieldBlock({
    pdf,
    label: field.label,
    value: field.value,
    x: PAGE_MARGIN_X_MM,
    y,
    width: CONTENT_WIDTH_MM,
    maxLines,
  }) + 3.5
}

function drawBlankEntryLine({
  pdf,
  x,
  y,
  width,
  label,
}: {
  pdf: jsPDF
  x: number
  y: number
  width: number
  label: string
}) {
  pdf.setFont(RECEIPT_FONT_NAME, "normal")
  pdf.setFontSize(8.2)
  pdf.setTextColor(71, 85, 105)
  pdf.text(label, x, y)

  const lineStartX = x + pdf.getTextWidth(label) + 4
  const lineEndX = x + width
  pdf.setDrawColor(100, 116, 139)
  pdf.line(lineStartX, y + 0.5, lineEndX, y + 0.5)
}

function drawManualSignatureBox({
  pdf,
  x,
  y,
  width,
  height,
  title,
  fields,
}: {
  pdf: jsPDF
  x: number
  y: number
  width: number
  height: number
  title: string
  fields: string[]
}) {
  pdf.setDrawColor(203, 213, 225)
  pdf.roundedRect(x, y, width, height, 3, 3, "S")

  pdf.setFont(RECEIPT_FONT_NAME, "bold")
  pdf.setFontSize(8.2)
  pdf.setTextColor(15, 23, 42)
  pdf.text(title, x + 7, y + 5.8)

  let fieldY = y + 12.5
  for (const field of fields) {
    drawBlankEntryLine({
      pdf,
      x: x + 7,
      y: fieldY,
      width: width - 14,
      label: field,
    })
    fieldY += 7.5
  }

  pdf.setFont(RECEIPT_FONT_NAME, "normal")
  pdf.setFontSize(6.5)
  pdf.setTextColor(100, 116, 139)
  // pdf.text("Complete by hand after printing.", x + 7, y + height - 3.2)
}

function drawPageFrame(pdf: jsPDF) {
  pdf.setFillColor(248, 250, 252)
  pdf.rect(0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, "F")

  pdf.setDrawColor(203, 213, 225)
  pdf.setLineWidth(0.5)
  pdf.roundedRect(
    PAGE_FRAME_INSET_MM,
    PAGE_FRAME_INSET_MM,
    PAGE_WIDTH_MM - PAGE_FRAME_INSET_MM * 2,
    PAGE_HEIGHT_MM - PAGE_FRAME_INSET_MM * 2,
    4,
    4,
    "S",
  )
}

function drawCenteredFittedText({
  pdf,
  text,
  centerX,
  y,
  width,
  fontSize,
  minFontSize,
}: {
  pdf: jsPDF
  text: string
  centerX: number
  y: number
  width: number
  fontSize: number
  minFontSize: number
}) {
  let nextFontSize = fontSize
  pdf.setFont(RECEIPT_FONT_NAME, "bold")
  while (nextFontSize > minFontSize) {
    pdf.setFontSize(nextFontSize)
    if (pdf.getTextWidth(text) <= width) break
    nextFontSize -= 0.2
  }
  pdf.text(text, centerX, y, { align: "center" })
}

const buildStudentFieldRows = (payload: StudentRenewalReceiptPayload): Array<[ReceiptField, ReceiptField?]> => [
  [
    { label: "Student Name", value: payload.fullName },
    { label: "Matric Number", value: toDisplayValue(payload.matricNo) },
  ],
  [
    { label: "JAMB Number", value: toDisplayValue(payload.jambNo) },
    { label: "Department", value: toDisplayValue(payload.department) },
  ],
  [
    { label: "Graduation Year", value: toDisplayValue(payload.graduationYear) },
    { label: "Email", value: toDisplayValue(payload.email) },
  ],
  [
    { label: "Reference Number", value: toDisplayValue(payload.referenceNumber) },
    { label: "Payment Reference", value: toDisplayValue(payload.paymentReference) },
  ],
  [
    {
      label: "Amount Paid",
      value: formatCurrencyFromKobo(payload.paymentAmountKobo, payload.fallbackAmountNaira),
    },
    { label: "Paid On", value: formatDateTime(payload.paymentPaidAt) },
  ],
  [
    { label: "Payment Channel", value: toDisplayValue(payload.paymentChannel) },
    { label: "Request Status", value: formatRequestStatus(payload.requestStatus) },
  ],
]

const buildStaffFieldRows = (payload: StaffRenewalReceiptPayload): Array<[ReceiptField, ReceiptField?]> => [
  [
    { label: "Staff Name", value: payload.fullName },
    { label: "PF Number", value: toDisplayValue(payload.pfNumber) },
  ],
  [
    { label: "Reference Number", value: toDisplayValue(resolveStaffReferenceNumber(payload.referenceNumber)) },
    { label: "Department", value: toDisplayValue(payload.department) },
  ],
  [
    { label: "Rank", value: toDisplayValue(payload.rank) },
    { label: "Category", value: toDisplayValue(payload.category) },
  ],
  [
    { label: "Email", value: toDisplayValue(payload.email) },
    { label: "Phone", value: toDisplayValue(payload.phone) },
  ],
  [
    {
      label: "Amount Paid",
      value: formatCurrencyFromKobo(payload.paymentAmountKobo, payload.fallbackAmountNaira),
    },
    { label: "Paid On", value: formatDateTime(payload.paymentPaidAt) },
  ],
  [
    { label: "Payment Channel", value: toDisplayValue(payload.paymentChannel) },
    { label: "Request Status", value: formatRequestStatus(payload.requestStatus) },
  ],
  [
    { label: "Payment Reference", value: toDisplayValue(payload.paymentReference) },
  ],
]

export async function generateRenewalReceiptPdf({
  payload,
  autoPrint = false,
}: GenerateRenewalReceiptPdfParams): Promise<{ blobUrl: string; fileName: string }> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true })
  await loadReceiptFonts(pdf)
  const logo = await normalizeImageDataUrl(logoImage)
  const receiptTitle =
    payload.kind === "student" ? "Student ID Card Renewal Payment Receipt" : "STAFF ID CARD RENEWAL PAYMENT RECEIPT"
  const headerLogoSize = 16
  const headerBadgeWidth = 39
  const headerBadgeHeight = 12.5
  const headerBadgeX = PAGE_WIDTH_MM - PAGE_MARGIN_X_MM - headerBadgeWidth
  const headerBadgeY = PAGE_MARGIN_TOP_MM
  const headerTextLeftX = PAGE_MARGIN_X_MM + headerLogoSize + 5
  const headerTextRightX = headerBadgeX - 4
  const headerTextWidth = headerTextRightX - headerTextLeftX
  const headerTextCenterX = headerTextLeftX + headerTextWidth / 2

  drawPageFrame(pdf)

  if (logo) {
    addContainedImage({
      pdf,
      image: logo,
      x: PAGE_MARGIN_X_MM,
      y: PAGE_MARGIN_TOP_MM - 0.5,
      width: headerLogoSize,
      height: headerLogoSize,
    })
  }

  pdf.setTextColor(15, 23, 42)
  drawCenteredFittedText({
    pdf,
    text: "JOSEPH SARWUAN TARKA UNIVERSITY MAKURDI",
    centerX: headerTextCenterX,
    y: PAGE_MARGIN_TOP_MM + 4.2,
    width: headerTextWidth,
    fontSize: 10.2,
    minFontSize: 8.4,
  })

  pdf.setFont(RECEIPT_FONT_NAME, "normal")
  pdf.setFontSize(8)
  pdf.setTextColor(51, 65, 85)
  pdf.text("ID CARD SERVICES", headerTextCenterX, PAGE_MARGIN_TOP_MM + 9.2, { align: "center" })
  pdf.text(receiptTitle, headerTextCenterX, PAGE_MARGIN_TOP_MM + 13.4, { align: "center" })

  pdf.setFillColor(15, 118, 110)
  pdf.roundedRect(headerBadgeX, headerBadgeY, headerBadgeWidth, headerBadgeHeight, 3, 3, "F")
  pdf.setFont(RECEIPT_FONT_NAME, "bold")
  pdf.setFontSize(6.5)
  pdf.setTextColor(255, 255, 255)
  pdf.text("PAYMENT RECEIPT", headerBadgeX + headerBadgeWidth / 2, headerBadgeY + 4.2, { align: "center" })
  pdf.setFont(RECEIPT_FONT_NAME, "normal")
  pdf.setFontSize(4.8)
  const referenceLines = pdf.splitTextToSize(toDisplayValue(payload.paymentReference), headerBadgeWidth - 6)
  pdf.text(referenceLines.slice(0, 2), headerBadgeX + headerBadgeWidth / 2, headerBadgeY + 7.4, { align: "center" })

  pdf.setDrawColor(203, 213, 225)
  pdf.line(PAGE_MARGIN_X_MM, 33, PAGE_WIDTH_MM - PAGE_MARGIN_X_MM, 33)

  pdf.setFillColor(240, 253, 250)
  pdf.roundedRect(PAGE_MARGIN_X_MM, 37, CONTENT_WIDTH_MM, 13, 3, 3, "F")
  pdf.setFont(RECEIPT_FONT_NAME, "bold")
  pdf.setFontSize(9)
  pdf.setTextColor(6, 95, 70)
  pdf.text("Successful payment confirmed for ID card renewal.", PAGE_MARGIN_X_MM + 4, 43)
  pdf.setFont(RECEIPT_FONT_NAME, "normal")
  pdf.setFontSize(7.2)
  pdf.setTextColor(21, 128, 61)
  pdf.text(`Generated on ${formatDateTime(new Date().toISOString())}`, PAGE_MARGIN_X_MM + 4, 47.2)

  let currentY = 58
  const rows = payload.kind === "student" ? buildStudentFieldRows(payload) : buildStaffFieldRows(payload)
  for (const [leftField, rightField] of rows) {
    currentY = drawFieldRow(pdf, currentY, leftField, rightField)
  }

  currentY = drawFullWidthField(pdf, currentY, {
    label: "Renewal Type",
    value: formatRequestType(payload.requestType),
  })

  currentY = drawFullWidthField(pdf, currentY, {
    label: "Additional Details",
    value: toDisplayValue(payload.requestDetails),
  }, 2)

  currentY += 2
  const noteLines = pdf.splitTextToSize(
    "This document confirms payment for ID card renewal processing. Keep it for your records and present it whenever the admin team requests payment evidence.",
    CONTENT_WIDTH_MM - 8,
  )
  const noteHeight = 7 + Math.min(noteLines.length, 2) * 3.5
  pdf.setFillColor(248, 250, 252)
  pdf.roundedRect(PAGE_MARGIN_X_MM, currentY, CONTENT_WIDTH_MM, noteHeight, 3, 3, "F")
  pdf.setFont(RECEIPT_FONT_NAME, "bold")
  pdf.setFontSize(8.4)
  pdf.setTextColor(15, 23, 42)
  pdf.text("Receipt Note", PAGE_MARGIN_X_MM + 4, currentY + 4.8)
  pdf.setFont(RECEIPT_FONT_NAME, "normal")
  pdf.setFontSize(7.2)
  pdf.setTextColor(71, 85, 105)
  pdf.text((noteLines as string[]).slice(0, 2), PAGE_MARGIN_X_MM + 4, currentY + 8.1)
  currentY += noteHeight

  const signatureSectionY = Math.max(currentY + 7, 206)
  const signatureBoxYPadding = 5
  const signatureBoxHeight = 31

  pdf.setFont(RECEIPT_FONT_NAME, "bold")
  pdf.setFontSize(9.2)
  pdf.setTextColor(15, 23, 42)
  pdf.text("Manual Endorsement", PAGE_MARGIN_X_MM, signatureSectionY)

  const signatureBoxY = signatureSectionY + signatureBoxYPadding
  const signatureBoxWidth = (CONTENT_WIDTH_MM - 10) / 2
  const recipientLabel = payload.kind === "student" ? "Student" : "Staff"

  drawManualSignatureBox({
    pdf,
    x: PAGE_MARGIN_X_MM,
    y: signatureBoxY,
    width: signatureBoxWidth,
    height: signatureBoxHeight,
    title: `${recipientLabel} Confirmation`,
    fields: ["Signature", "Date"],
  })

  drawManualSignatureBox({
    pdf,
    x: PAGE_MARGIN_X_MM + signatureBoxWidth + 10,
    y: signatureBoxY,
    width: signatureBoxWidth,
    height: signatureBoxHeight,
    title: "Admin Authorization",
    fields: ["Name", "Signature", "Date"],
  })

  pdf.setFont(RECEIPT_FONT_NAME, "normal")
  pdf.setFontSize(6.8)
  pdf.setTextColor(100, 116, 139)
  pdf.text(
    "Official receipt issued by the Directorate of ICT ID CARD Services unit of Joseph Sarwuan Tarka University, Makurdi.",
    PAGE_WIDTH_MM / 2,
    PAGE_FOOTER_Y_MM,
    { align: "center" },
  )

  if (autoPrint) {
    const printablePdf = pdf as jsPDF & { autoPrint?: () => void }
    if (typeof printablePdf.autoPrint === "function") {
      printablePdf.autoPrint()
    }
  }

  return {
    blobUrl: URL.createObjectURL(pdf.output("blob")),
    fileName: buildReceiptFileName(payload),
  }
}

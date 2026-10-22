import { jsPDF } from "jspdf"

import logoImage from "@/assets/logo.jpeg"

const PAGE_WIDTH_MM = 210
const PAGE_HEIGHT_MM = 297
const PAGE_MARGIN_X_MM = 18
const PAGE_MARGIN_TOP_MM = 14
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - PAGE_MARGIN_X_MM * 2

type NormalizedImageData = {
  dataUrl: string
  format: "PNG" | "JPEG"
  width: number
  height: number
}

export type StaffCollectionSlipPayload = {
  name: string
  pfNumber: string
  department: string
  rank?: string | null
  email?: string | null
  referenceNumber?: string | null
  passportUrl?: string | null
  pickupMessage?: string | null
}

type GenerateStaffCollectionSlipPdfParams = {
  payload: StaffCollectionSlipPayload
  autoPrint?: boolean
}

const isDataUrl = (value: string) => value.startsWith("data:image/")

const toDisplayValue = (value?: string | null) => {
  const normalized = String(value ?? "").trim()
  return normalized || "--"
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

async function normalizeImageDataUrl(src?: string | null): Promise<NormalizedImageData | null> {
  if (!src) return null

  let dataUrl = src
  if (!isDataUrl(src)) {
    try {
      dataUrl = await urlToDataUrl(src)
    } catch (error) {
      console.warn("Unable to prepare collection slip image.", error)
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

function drawPageFrame(pdf: jsPDF) {
  pdf.setFillColor(248, 250, 252)
  pdf.rect(0, 0, PAGE_WIDTH_MM, PAGE_HEIGHT_MM, "F")

  pdf.setDrawColor(203, 213, 225)
  pdf.setLineWidth(0.5)
  pdf.roundedRect(10, 10, PAGE_WIDTH_MM - 20, PAGE_HEIGHT_MM - 20, 4, 4, "S")
}

function drawFieldBlock({
  pdf,
  label,
  value,
  x,
  y,
  width,
}: {
  pdf: jsPDF
  label: string
  value: string
  x: number
  y: number
  width: number
}) {
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(7.5)
  pdf.setTextColor(71, 85, 105)
  pdf.text(label.toUpperCase(), x, y)

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(9.2)
  pdf.setTextColor(15, 23, 42)
  const lines = (pdf.splitTextToSize(toDisplayValue(value), width) as string[]).slice(0, 2)
  pdf.text(lines, x, y + 4.6)

  return y + 4.6 + lines.length * 3.8
}

function drawTextPanel({
  pdf,
  title,
  body,
  x,
  y,
  width,
}: {
  pdf: jsPDF
  title: string
  body: string
  x: number
  y: number
  width: number
}) {
  const lines = (pdf.splitTextToSize(toDisplayValue(body), width - 8) as string[]).slice(0, 4)
  const height = 9 + lines.length * 3.9

  pdf.setFillColor(248, 250, 252)
  pdf.roundedRect(x, y, width, height, 3, 3, "F")
  pdf.setDrawColor(226, 232, 240)
  pdf.roundedRect(x, y, width, height, 3, 3, "S")

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(8.5)
  pdf.setTextColor(15, 23, 42)
  pdf.text(title, x + 4, y + 5)

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(8.3)
  pdf.setTextColor(71, 85, 105)
  pdf.text(lines, x + 4, y + 9.5)

  return y + height
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
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(8.4)
  pdf.setTextColor(71, 85, 105)
  pdf.text(label, x, y)

  const lineStartX = x + pdf.getTextWidth(label) + 4
  pdf.setDrawColor(100, 116, 139)
  pdf.line(lineStartX, y + 0.5, x + width, y + 0.5)
}

function drawSignatureBox({
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

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(8.5)
  pdf.setTextColor(15, 23, 42)
  pdf.text(title, x + 7, y + 6)

  let nextY = y + 13
  for (const field of fields) {
    drawBlankEntryLine({
      pdf,
      x: x + 7,
      y: nextY,
      width: width - 14,
      label: field,
    })
    nextY += 8
  }
}

function buildFileName(payload: StaffCollectionSlipPayload) {
  const normalizedPfNumber = payload.pfNumber.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  return `staff-collection-slip-${normalizedPfNumber || "record"}.pdf`
}

export async function generateStaffCollectionSlipPdf({
  payload,
  autoPrint = false,
}: GenerateStaffCollectionSlipPdfParams): Promise<{ blobUrl: string; fileName: string }> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true })
  const logo = await normalizeImageDataUrl(logoImage)
  const passport = await normalizeImageDataUrl(payload.passportUrl)

  drawPageFrame(pdf)

  if (logo) {
    addContainedImage({
      pdf,
      image: logo,
      x: PAGE_MARGIN_X_MM,
      y: PAGE_MARGIN_TOP_MM,
      width: 18,
      height: 18,
    })
  }

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(11.2)
  pdf.setTextColor(15, 23, 42)
  pdf.text("JOSEPH SARWUAN TARKA UNIVERSITY MAKURDI", PAGE_WIDTH_MM / 2, PAGE_MARGIN_TOP_MM + 4.3, {
    align: "center",
  })

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(8.4)
  pdf.setTextColor(51, 65, 85)
  pdf.text("Staff ID Services", PAGE_WIDTH_MM / 2, PAGE_MARGIN_TOP_MM + 9.2, { align: "center" })
  pdf.text("Staff ID Card Collection Slip", PAGE_WIDTH_MM / 2, PAGE_MARGIN_TOP_MM + 13.8, {
    align: "center",
  })

  pdf.setFillColor(15, 118, 110)
  pdf.roundedRect(PAGE_WIDTH_MM - PAGE_MARGIN_X_MM - 40, PAGE_MARGIN_TOP_MM, 40, 12, 3, 3, "F")
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(6.8)
  pdf.setTextColor(255, 255, 255)
  pdf.text("COLLECTION SLIP", PAGE_WIDTH_MM - PAGE_MARGIN_X_MM - 20, PAGE_MARGIN_TOP_MM + 4.2, { align: "center" })
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(5.4)
  pdf.text(
    `Issued ${new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(new Date())}`,
    PAGE_WIDTH_MM - PAGE_MARGIN_X_MM - 20,
    PAGE_MARGIN_TOP_MM + 8.1,
    { align: "center" },
  )

  pdf.setDrawColor(203, 213, 225)
  pdf.line(PAGE_MARGIN_X_MM, 38, PAGE_WIDTH_MM - PAGE_MARGIN_X_MM, 38)

  pdf.setFillColor(239, 246, 255)
  pdf.roundedRect(PAGE_MARGIN_X_MM, 42, CONTENT_WIDTH_MM, 12, 3, 3, "F")
  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(8.8)
  pdf.setTextColor(29, 78, 216)
  pdf.text("Present this signed slip at the ID card desk during collection.", PAGE_MARGIN_X_MM + 4, 48)
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(7.2)
  pdf.setTextColor(30, 64, 175)
  pdf.text("Keep one printed copy for submission to the collection officer.", PAGE_MARGIN_X_MM + 4, 51.8)

  const detailsTopY = 61
  const detailsWidth = 115
  const photoBoxWidth = 42
  const photoBoxHeight = 49
  let currentY = detailsTopY

  currentY = drawFieldBlock({
    pdf,
    label: "Staff Name",
    value: payload.name,
    x: PAGE_MARGIN_X_MM,
    y: currentY,
    width: detailsWidth,
  }) + 3.5
  currentY = drawFieldBlock({
    pdf,
    label: "PF Number",
    value: payload.pfNumber,
    x: PAGE_MARGIN_X_MM,
    y: currentY,
    width: detailsWidth,
  }) + 3.5
  currentY = drawFieldBlock({
    pdf,
    label: "Department",
    value: payload.department,
    x: PAGE_MARGIN_X_MM,
    y: currentY,
    width: detailsWidth,
  }) + 3.5
  currentY = drawFieldBlock({
    pdf,
    label: "Rank",
    value: payload.rank ?? "",
    x: PAGE_MARGIN_X_MM,
    y: currentY,
    width: detailsWidth,
  }) + 3.5
  currentY = drawFieldBlock({
    pdf,
    label: "Reference Number",
    value: payload.referenceNumber ?? "",
    x: PAGE_MARGIN_X_MM,
    y: currentY,
    width: detailsWidth,
  }) + 3.5
  currentY = drawFieldBlock({
    pdf,
    label: "Email",
    value: payload.email ?? "",
    x: PAGE_MARGIN_X_MM,
    y: currentY,
    width: detailsWidth,
  })

  const photoBoxX = PAGE_WIDTH_MM - PAGE_MARGIN_X_MM - photoBoxWidth
  pdf.setDrawColor(203, 213, 225)
  pdf.roundedRect(photoBoxX, detailsTopY, photoBoxWidth, photoBoxHeight, 3, 3, "S")
  if (passport) {
    addContainedImage({
      pdf,
      image: passport,
      x: photoBoxX + 2,
      y: detailsTopY + 2,
      width: photoBoxWidth - 4,
      height: photoBoxHeight - 8,
    })
  } else {
    pdf.setFont("helvetica", "italic")
    pdf.setFontSize(8)
    pdf.setTextColor(100, 116, 139)
    pdf.text("Passport not available", photoBoxX + photoBoxWidth / 2, detailsTopY + photoBoxHeight / 2, {
      align: "center",
    })
  }
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(7)
  pdf.setTextColor(71, 85, 105)
  pdf.text("Staff Passport", photoBoxX + photoBoxWidth / 2, detailsTopY + photoBoxHeight - 2.5, {
    align: "center",
  })

  const pickupPanelY = Math.max(currentY + 6, detailsTopY + photoBoxHeight + 8)
  const pickupPanelBottom = drawTextPanel({
    pdf,
    title: "Collection Note",
    body: payload.pickupMessage || "Collect your ID card from the designated staff ID desk.",
    x: PAGE_MARGIN_X_MM,
    y: pickupPanelY,
    width: CONTENT_WIDTH_MM,
  })

  const signatureY = pickupPanelBottom + 60
  const signatureWidth = (CONTENT_WIDTH_MM - 10) / 2
  drawSignatureBox({
    pdf,
    x: PAGE_MARGIN_X_MM,
    y: signatureY,
    width: signatureWidth,
    height: 31,
    title: "Staff Acknowledgement",
    fields: ["Signature", "Date"],
  })
  drawSignatureBox({
    pdf,
    x: PAGE_MARGIN_X_MM + signatureWidth + 10,
    y: signatureY,
    width: signatureWidth,
    height: 31,
    title: "ID Card Desk Officer",
    fields: ["Name", "Signature", "Date"],
  })

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(6.9)
  pdf.setTextColor(100, 116, 139)
  pdf.text(
    "This slip should be signed and submitted during staff ID card pickup.",
    PAGE_WIDTH_MM / 2,
    PAGE_HEIGHT_MM - 16,
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
    fileName: buildFileName(payload),
  }
}

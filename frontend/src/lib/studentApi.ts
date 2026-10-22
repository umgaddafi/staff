import axios, { isAxiosError } from "axios";
import type { AxiosInstance } from "axios";
import {
  IMAGE_UPLOAD_MAX_BYTES,
  isImageDataUrl,
  toCompressedImageFile,
} from "@/utils/imageCompression"


// Configure base axios instance
// Use local defaults so the app runs without a `.env` file.
// You can still override these with `VITE_*` environment variables.
const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "")
const sanitizeConfiguredUrl = (value: string) =>
  value
    .trim()
    // Guard against malformed values like "http://https://example.com".
    .replace(/^(https?:\/\/)+(https?:\/\/)/i, "$2")

const DEFAULT_API_URL = "http://localhost/id-card-staff-student/backend/public/api"
const DEFAULT_ASSET_URL = "http://localhost/id-card-staff-student/backend"
const DEFAULT_ASSET_STORAGE_PATH = "storage/uploads"

const configuredApiUrl =
  sanitizeConfiguredUrl(import.meta.env.VITE_API_URL?.trim() || "") ||
  DEFAULT_API_URL
const apiBaseUrl = normalizeBaseUrl(configuredApiUrl)
const backendBaseUrl = normalizeBaseUrl(apiBaseUrl.replace(/\/api(?:\/v\d+)?$/i, ""))
const configuredAssetUrl = sanitizeConfiguredUrl(import.meta.env.VITE_ASSET_URL?.trim() || "") || DEFAULT_ASSET_URL
const configuredAssetStoragePath =
  import.meta.env.VITE_ASSET_STORAGE_PATH?.trim().replace(/^\/+|\/+$/g, "") || DEFAULT_ASSET_STORAGE_PATH

// If you need a different API host per environment, set VITE_API_URL.

const api: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

const normalizeStoragePath = (value: string) => {
  let normalized = value
  normalized = normalized.replace(/(\/storage\/uploads\/)+/gi, "/storage/uploads/")
  normalized = normalized.replace(/(\/app\/public\/)+/gi, "/app/public/")
  normalized = normalized.replace(/(\/storage\/app\/public\/)+/gi, "/storage/app/public/")
  normalized = normalized.replace(/\/backend\/storage\/app\/public\/app\/public\//gi, "/backend/storage/app/public/")
  return normalized
}

export const resolveApiAssetUrl = (value?: string | null): string => {
  const rawInput = String(value ?? "").trim()
  if (!rawInput) return ""
  let raw = normalizeStoragePath(rawInput)
  if (/^(data|blob):/i.test(raw)) return raw
  // Keep frontend-bundled/static assets untouched (Vite dev/prod /assets paths).
  if (/^(?:\/)?assets\//i.test(raw) || /^\/assets\//i.test(raw)) return raw.startsWith("/") ? raw : `/${raw}`

  const resolvedAssetBaseUrl = configuredAssetUrl?.startsWith("/")
    ? `${typeof window !== "undefined" && window.location?.origin ? window.location.origin : "http://localhost"}${configuredAssetUrl}`
    : configuredAssetUrl
  const assetBaseUrl = resolvedAssetBaseUrl
    ? normalizeBaseUrl(resolvedAssetBaseUrl)
    : normalizeBaseUrl(apiBaseUrl).replace(/\/api(?:\/v\d+)?$/i, "")
  const buildFromPath = (path: string) => {
    let cleanPath = normalizeStoragePath(path.replace(/^\/+/, ""))
    const lowerPath = cleanPath.toLowerCase()
    const storagePrefixedPath =
      lowerPath.startsWith("uploads/")
        ? `${configuredAssetStoragePath}/${cleanPath.replace(/^uploads\//i, "")}`
        : cleanPath
    if (!assetBaseUrl) return cleanPath
    try {
      const baseUrl = new URL(`${assetBaseUrl}/`)
      const basePath = baseUrl.pathname.replace(/^\/+|\/+$/g, "")
      const baseEndsWithBackend = /(?:^|\/)backend$/i.test(basePath)
      const normalizedJoinPath =
        baseEndsWithBackend && /^backend\//i.test(storagePrefixedPath)
          ? storagePrefixedPath.replace(/^backend\//i, "")
          : storagePrefixedPath
      const withBasePath =
        basePath && !normalizedJoinPath.toLowerCase().startsWith(`${basePath.toLowerCase()}/`)
          ? `${basePath}/${normalizedJoinPath}`
          : normalizedJoinPath
      return new URL(withBasePath, `${baseUrl.origin}/`).toString()
    } catch {
      return storagePrefixedPath
    }
  }

  if (/^(https?:)?\/\//i.test(raw)) {
    try {
      const fallbackOrigin =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : "http://localhost"
      const absoluteUrl = new URL(raw, fallbackOrigin)
      const fixedPath = normalizeStoragePath(absoluteUrl.pathname)
      const appOrigin =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : ""
      const pointsToFrontendAssets =
        fixedPath.toLowerCase().startsWith("/assets/") &&
        Boolean(appOrigin) &&
        absoluteUrl.origin === appOrigin
      if (pointsToFrontendAssets) {
        return absoluteUrl.toString()
      }
      if (/\/storage\/app\/public\//i.test(fixedPath) || /\/backend\/storage\//i.test(fixedPath)) {
        return buildFromPath(fixedPath)
      }
      const isLocalHost = /^(localhost|127(?:\.\d{1,3}){3}|::1)$/i.test(absoluteUrl.hostname)
      if (isLocalHost) {
        return buildFromPath(absoluteUrl.pathname)
      }
      return absoluteUrl.toString()
    } catch {
      return raw
    }
  }

  return buildFromPath(raw)
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

const toOptionalNullableString = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value === "string") return value
  return undefined
}

const toOptionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (["1", "true", "yes"].includes(normalized)) return true
    if (["0", "false", "no"].includes(normalized)) return false
  }
  return undefined
}

const toOptionalGraduationYear = (value: unknown): string | number | null | undefined => {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") return value.trim()
  return undefined
}

const resolveApiErrorMessage = (error: unknown, fallback: string) => {
  if (!isAxiosError(error)) {
    return error instanceof Error && error.message.trim() ? error.message : fallback
  }

  const payload = asRecord(error.response?.data)
  const message = typeof payload?.message === "string" ? payload.message.trim() : ""
  if (message) return message

  const errors = asRecord(payload?.errors)
  if (errors) {
    for (const value of Object.values(errors)) {
      if (Array.isArray(value)) {
        const firstMessage = value.find(
          (entry): entry is string => typeof entry === "string" && entry.trim() !== ""
        )
        if (firstMessage) return firstMessage.trim()
      }

      if (typeof value === "string" && value.trim()) {
        return value.trim()
      }
    }
  }

  if (error.message.trim()) return error.message.trim()
  return fallback
}

const toStudent = (value: unknown): Student | null => {
  const record = asRecord(value)
  if (!record) return null

  const idValue = record.id
  const idAsNumber =
    typeof idValue === "number"
      ? idValue
      : typeof idValue === "string"
        ? Number(idValue)
        : Number.NaN
  if (!Number.isFinite(idAsNumber)) return null

  return {
    id: idAsNumber,
    matric_no:
      toOptionalNullableString(record.matric_no) ??
      toOptionalNullableString(record.matric) ??
      undefined,
    reference_number:
      toOptionalNullableString(record.reference_number) ??
      toOptionalNullableString(record.referenceNumber),
    first_name: toOptionalNullableString(record.first_name),
    other_name: toOptionalNullableString(record.other_name),
    last_name: toOptionalNullableString(record.last_name),
    jamb_no: toOptionalNullableString(record.jamb_no),
    email: toOptionalNullableString(record.email),
    department_id:
      typeof record.department_id === "number"
        ? record.department_id
        : typeof record.department_id === "string" && record.department_id.trim() !== ""
          ? Number(record.department_id)
          : undefined,
    department: toOptionalNullableString(record.department),
    graduation_year: toOptionalGraduationYear(record.graduation_year),
    card_request_type:
      toOptionalNullableString(record.card_request_type) as CardRequestType | null | undefined,
    card_request_status:
      toOptionalNullableString(record.card_request_status) as CardRequestStatus | null | undefined,
    card_request_reason: toOptionalNullableString(record.card_request_reason),
    card_request_submitted_at: toOptionalNullableString(record.card_request_submitted_at),
    card_request_approved_at: toOptionalNullableString(record.card_request_approved_at),
    card_request_rejected_at: toOptionalNullableString(record.card_request_rejected_at),
    card_request_rejection_reason: toOptionalNullableString(record.card_request_rejection_reason),
    card_request_payment_reference: toOptionalNullableString(record.card_request_payment_reference),
    card_request_payment_status:
      toOptionalNullableString(record.card_request_payment_status) as CardRenewalPaymentStatus | null | undefined,
    card_request_payment_amount:
      typeof record.card_request_payment_amount === "number"
        ? record.card_request_payment_amount
        : typeof record.card_request_payment_amount === "string" && record.card_request_payment_amount.trim() !== ""
          ? Number(record.card_request_payment_amount)
          : undefined,
    card_request_payment_channel: toOptionalNullableString(record.card_request_payment_channel),
    card_request_payment_paid_at: toOptionalNullableString(record.card_request_payment_paid_at),
    is_submitted: toOptionalBoolean(record.is_submitted),
    is_printed: toOptionalBoolean(record.is_printed),
    is_collected: toOptionalBoolean(record.is_collected),
    card_collection_location: toOptionalNullableString(record.card_collection_location),
    card_collected_at: toOptionalNullableString(record.card_collected_at),
    card_collected_by: toOptionalNullableString(record.card_collected_by),
    card_issued_at: toOptionalNullableString(record.card_issued_at),
    card_expires_at: toOptionalNullableString(record.card_expires_at),
    archived_at:
      toOptionalNullableString(record.archived_at) ??
      toOptionalNullableString(record.archivedAt),
    admin_notice:
      toOptionalNullableString(record.admin_notice) ??
      toOptionalNullableString(record.adminNote),
    passport_url: toOptionalNullableString(record.passport_url),
    signature_url: toOptionalNullableString(record.signature_url),
    created_at: toOptionalNullableString(record.created_at),
    updated_at: toOptionalNullableString(record.updated_at),
  }
}

const toStaffRecord = (value: unknown): StaffRecord | null => {
  const record = asRecord(value)
  if (!record) return null

  const idValue = record.id
  const idAsNumber =
    typeof idValue === "number"
      ? idValue
      : typeof idValue === "string"
        ? Number(idValue)
        : Number.NaN
  if (!Number.isFinite(idAsNumber)) return null

  return {
    id: idAsNumber,
    pf_number:
      toOptionalNullableString(record.pf_number) ??
      toOptionalNullableString(record.pfNumber) ??
      undefined,
    reference_number:
      toOptionalNullableString(record.reference_number) ??
      toOptionalNullableString(record.referenceNumber),
    first_name: toOptionalNullableString(record.first_name),
    other_name: toOptionalNullableString(record.other_name),
    last_name: toOptionalNullableString(record.last_name),
    category:
      toOptionalNullableString(record.category) ??
      toOptionalNullableString(record.staff_category) ??
      toOptionalNullableString(record.email),
    email: toOptionalNullableString(record.email),
    phone: toOptionalNullableString(record.phone),
    department: toOptionalNullableString(record.department),
    rank: toOptionalNullableString(record.rank),
    card_request_type:
      toOptionalNullableString(record.card_request_type) as CardRequestType | null | undefined,
    card_request_status:
      toOptionalNullableString(record.card_request_status) as CardRequestStatus | null | undefined,
    card_request_reason: toOptionalNullableString(record.card_request_reason),
    card_request_submitted_at: toOptionalNullableString(record.card_request_submitted_at),
    card_request_approved_at: toOptionalNullableString(record.card_request_approved_at),
    card_request_rejected_at: toOptionalNullableString(record.card_request_rejected_at),
    card_request_rejection_reason: toOptionalNullableString(record.card_request_rejection_reason),
    card_request_payment_reference: toOptionalNullableString(record.card_request_payment_reference),
    card_request_payment_status:
      toOptionalNullableString(record.card_request_payment_status) as CardRenewalPaymentStatus | null | undefined,
    card_request_payment_amount:
      typeof record.card_request_payment_amount === "number"
        ? record.card_request_payment_amount
        : typeof record.card_request_payment_amount === "string" && record.card_request_payment_amount.trim() !== ""
          ? Number(record.card_request_payment_amount)
          : undefined,
    card_request_payment_channel: toOptionalNullableString(record.card_request_payment_channel),
    card_request_payment_paid_at: toOptionalNullableString(record.card_request_payment_paid_at),
    admin_notice:
      toOptionalNullableString(record.admin_notice) ??
      toOptionalNullableString(record.adminNotice),
    is_submitted: toOptionalBoolean(record.is_submitted),
    is_printed: toOptionalBoolean(record.is_printed),
    is_collected: toOptionalBoolean(record.is_collected),
    card_collection_location: toOptionalNullableString(record.card_collection_location),
    card_collected_at: toOptionalNullableString(record.card_collected_at),
    card_collected_by: toOptionalNullableString(record.card_collected_by),
    card_issued_at: toOptionalNullableString(record.card_issued_at),
    card_expires_at: toOptionalNullableString(record.card_expires_at),
    passport_url: toOptionalNullableString(record.passport_url),
    signature_url: toOptionalNullableString(record.signature_url),
    created_at: toOptionalNullableString(record.created_at),
    updated_at: toOptionalNullableString(record.updated_at),
  }
}

const pickStudentListFromPayload = (payload: unknown): Student[] => {
  if (Array.isArray(payload)) {
    return payload
      .map((entry) => toStudent(entry))
      .filter((entry): entry is Student => entry !== null)
  }
  const record = asRecord(payload)
  if (!record) return []
  if (Array.isArray(record.data)) {
    return record.data
      .map((entry) => toStudent(entry))
      .filter((entry): entry is Student => entry !== null)
  }
  if (Array.isArray(record.students)) {
    return record.students
      .map((entry) => toStudent(entry))
      .filter((entry): entry is Student => entry !== null)
  }
  return []
}

const pickStudentFromPayload = (payload: unknown): Student | null => {
  if (!payload) return null
  const root = asRecord(payload)
  const candidate =
    asRecord(root?.data) ??
    asRecord(root?.student) ??
    asRecord(root?.result) ??
    asRecord(payload)
  if (!candidate) return null
  const student = toStudent(candidate)
  if (!student) return null
  return {
    ...student,
    submission_email_sent: toOptionalBoolean(root?.submission_email_sent),
    submission_email_error: toOptionalNullableString(root?.submission_email_error),
  }
}

const pickStaffListFromPayload = (payload: unknown): StaffRecord[] => {
  if (Array.isArray(payload)) {
    return payload
      .map((entry) => toStaffRecord(entry))
      .filter((entry): entry is StaffRecord => entry !== null)
  }
  const record = asRecord(payload)
  if (!record) return []
  if (Array.isArray(record.data)) {
    return record.data
      .map((entry) => toStaffRecord(entry))
      .filter((entry): entry is StaffRecord => entry !== null)
  }
  if (Array.isArray(record.staff)) {
    return record.staff
      .map((entry) => toStaffRecord(entry))
      .filter((entry): entry is StaffRecord => entry !== null)
  }
  return []
}

const pickStaffFromPayload = (payload: unknown): StaffRecord | null => {
  if (!payload) return null
  const root = asRecord(payload)
  const candidate =
    asRecord(root?.data) ??
    asRecord(root?.staff) ??
    asRecord(root?.result) ??
    asRecord(payload)
  if (!candidate) return null
  const staff = toStaffRecord(candidate)
  if (!staff) return null
  return {
    ...staff,
    submission_email_sent: toOptionalBoolean(root?.submission_email_sent),
    submission_email_error: toOptionalNullableString(root?.submission_email_error),
  }
}

const normalizeMatric = (matric_no: string) => String(matric_no ?? "").trim().toUpperCase()
const encodeMatric = (matric_no: string) =>
  encodeURIComponent(normalizeMatric(matric_no)).replace(/%2F/gi, "/")
const normalizePfNumber = (pf_number: string) => {
  const upper = String(pf_number ?? "").trim().toUpperCase()
  if (!upper) return ""
  const alphanumeric = upper.replace(/[^A-Z0-9]/g, "")
  const matched = alphanumeric.match(/^([A-Z]+)(\d+)$/)
  if (!matched) return upper
  return `${matched[1]}/${matched[2]}`
}
const encodePfNumber = (pf_number: string) =>
  encodeURIComponent(normalizePfNumber(pf_number)).replace(/%2F/gi, "/")
const normalizeReferenceNumber = (reference_number: string) => String(reference_number ?? "").trim()
const encodeReferenceNumber = (reference_number: string) =>
  encodeURIComponent(normalizeReferenceNumber(reference_number))

const appendStudentFileField = async (
  formData: FormData,
  field: string,
  value: unknown,
  options?: {
    maxBytes?: number
    preferredType?: string
    allowJpegFallback?: boolean
    maxWidthOrHeight?: number
  }
) => {
  const isPassportField = field === "passport" || field === "profile_photo"
  const fallbackMaxBytes = IMAGE_UPLOAD_MAX_BYTES
  const compressedFile = await toCompressedImageFile(value, {
    maxBytes: options?.maxBytes ?? fallbackMaxBytes,
    fileName: field,
    preferredType: options?.preferredType ?? (isPassportField ? "image/jpeg" : "image/png"),
    allowJpegFallback: options?.allowJpegFallback ?? (isPassportField),
    maxWidthOrHeight: options?.maxWidthOrHeight ?? (isPassportField ? 900 : 1200),
  })
  if (!compressedFile) return
  formData.append(field, compressedFile)
}

const blobToDataUrl = async (blob: Blob) => {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(new Error("Failed to convert image blob to data URL"))
    reader.readAsDataURL(blob)
  })
}

const buildStudentFormData = async (payload: object) => {
  const formData = new FormData()
  const payloadRecord = asRecord(payload) ?? {}

  for (const [key, value] of Object.entries(payloadRecord)) {
    if (
      key === "passport" ||
      key === "signature" ||
      key === "passport_url" ||
      key === "signature_url"
    ) {
      continue
    }
    if (value === undefined) continue
    if (value === null) {
      formData.append(key, "")
      continue
    }
    if (typeof value === "boolean") {
      formData.append(key, value ? "1" : "0")
      continue
    }
    formData.append(key, String(value))
  }

  await appendStudentFileField(
    formData,
    "passport",
    payloadRecord.passport ?? payloadRecord.passport_url
  )
  await appendStudentFileField(
    formData,
    "signature",
    payloadRecord.signature ?? payloadRecord.signature_url
  )

  return formData
}

const buildStaffFormData = async (payload: object) => {
  const formData = new FormData()
  const payloadRecord = asRecord(payload) ?? {}

  for (const [key, value] of Object.entries(payloadRecord)) {
    if (
      key === "passport" ||
      key === "signature" ||
      key === "passport_url" ||
      key === "signature_url"
    ) {
      continue
    }
    if (value === undefined) continue
    if (value === null) {
      formData.append(key, "")
      continue
    }
    if (typeof value === "boolean") {
      formData.append(key, value ? "1" : "0")
      continue
    }
    formData.append(key, String(value))
  }

  await appendStudentFileField(
    formData,
    "passport",
    payloadRecord.passport ?? payloadRecord.passport_url
  )
  await appendStudentFileField(
    formData,
    "signature",
    payloadRecord.signature ?? payloadRecord.signature_url
  )

  return formData
}

const buildUserFormData = async (payload: object) => {
  const formData = new FormData()
  const payloadRecord = asRecord(payload) ?? {}

  for (const [key, value] of Object.entries(payloadRecord)) {
    if (key === "profile_photo") continue
    if (value === undefined) continue
    if (value === null) {
      formData.append(key, "")
      continue
    }
    if (typeof value === "boolean") {
      formData.append(key, value ? "1" : "0")
      continue
    }
    formData.append(key, String(value))
  }

  const profilePhotoValue = payloadRecord.profile_photo
  let profilePhotoDataValue = ""
  if (typeof profilePhotoValue === "string") {
    const trimmedProfilePhotoValue = profilePhotoValue.trim()
    if (isImageDataUrl(trimmedProfilePhotoValue)) {
      profilePhotoDataValue = trimmedProfilePhotoValue
    }
  } else if (profilePhotoValue instanceof Blob) {
    const compressedProfilePhoto = await toCompressedImageFile(profilePhotoValue, {
      maxBytes: 2 * 1024 * 1024,
      fileName: "profile_photo",
      preferredType: "image/jpeg",
      allowJpegFallback: true,
      maxWidthOrHeight: 1400,
    })
    if (compressedProfilePhoto) {
      profilePhotoDataValue = await blobToDataUrl(compressedProfilePhoto)
    }
  }

  if (profilePhotoDataValue) {
    formData.append("profile_photo_data", profilePhotoDataValue)
  }

  return formData
}

// debug helper for development
if (import.meta.env.DEV) {
  api.interceptors.request.use((cfg) => {
    console.debug("API Request:", cfg.method, cfg.baseURL + (cfg.url ?? ""), cfg.params ?? cfg.data ?? "")
    // expose resolved base URL to help diagnose host/port mismatches
    console.debug("Resolved API base URL:", apiBaseUrl)
    return cfg
  })
}

export interface Student {
  id: number;
  matric_no?: string;
  reference_number?: string | null;
  first_name?: string | null;
  other_name?: string | null;
  last_name?: string | null;
  jamb_no?: string | null;
  email?: string | null;
  department?: string | null;
  department_id?: number | null;
  graduation_year?: string | number | null;
  card_request_type?: CardRequestType | null;
  card_request_status?: CardRequestStatus | null;
  card_request_reason?: string | null;
  card_request_submitted_at?: string | null;
  card_request_approved_at?: string | null;
  card_request_rejected_at?: string | null;
  card_request_rejection_reason?: string | null;
  card_request_payment_reference?: string | null;
  card_request_payment_status?: "initialized" | "paid" | "failed" | null;
  card_request_payment_amount?: number | null;
  card_request_payment_channel?: string | null;
  card_request_payment_paid_at?: string | null;
  is_submitted?: boolean;
  is_printed?: boolean;
  is_collected?: boolean;
  card_collection_location?: string | null;
  card_collected_at?: string | null;
  card_collected_by?: string | null;
  card_issued_at?: string | null;
  card_expires_at?: string | null;
  archived_at?: string | null;
  admin_notice?: string | null;
  passport_url?: string | null;
  signature_url?: string | null;
  submission_email_sent?: boolean | null;
  submission_email_error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface StaffRecord {
  id: number;
  pf_number?: string;
  reference_number?: string | null;
  first_name?: string | null;
  other_name?: string | null;
  last_name?: string | null;
  category?: string | null;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  rank?: string | null;
  card_request_type?: CardRequestType | null;
  card_request_status?: CardRequestStatus | null;
  card_request_reason?: string | null;
  card_request_submitted_at?: string | null;
  card_request_approved_at?: string | null;
  card_request_rejected_at?: string | null;
  card_request_rejection_reason?: string | null;
  card_request_payment_reference?: string | null;
  card_request_payment_status?: "initialized" | "paid" | "failed" | null;
  card_request_payment_amount?: number | null;
  card_request_payment_channel?: string | null;
  card_request_payment_paid_at?: string | null;
  admin_notice?: string | null;
  is_submitted?: boolean;
  is_printed?: boolean;
  is_collected?: boolean;
  card_collection_location?: string | null;
  card_collected_at?: string | null;
  card_collected_by?: string | null;
  card_issued_at?: string | null;
  card_expires_at?: string | null;
  passport_url?: string | null;
  signature_url?: string | null;
  submission_email_sent?: boolean | null;
  submission_email_error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateStaffPayload {
  pf_number: string;
  first_name: string;
  other_name?: string | null;
  last_name: string;
  category?: string | null;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  rank?: string | null;
  admin_notice?: string | null;
  is_submitted?: boolean;
  is_printed?: boolean;
  passport_url?: string | null;
  signature_url?: string | null;
}

export interface AuthUser {
  id: number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  is_active?: boolean;
  profile_photo_url?: string | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface LoginOtpRequestResponse {
  message: string;
  mfa_required: boolean;
  otp_expires_in_minutes: number;
  dev_otp?: string;
}

export interface VerifyLoginOtpPayload {
  email: string;
  password: string;
  otp: string;
  timezone?: string;
  user_agent?: string;
  browser_info?: string;
  device_info?: string;
  os_info?: string;
  latitude?: number;
  longitude?: number;
}

export interface ApiUser {
  id: number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  is_active?: boolean;
  profile_photo_url?: string | null;
  last_login?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ApiDirectMessage {
  id: number;
  subject?: string | null;
  body?: string | null;
  read_at?: string | null;
  sender_archived_at?: string | null;
  recipient_archived_at?: string | null;
  sender_deleted_at?: string | null;
  recipient_deleted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  sender?: ApiUser | null;
  recipient?: ApiUser | null;
}

export type ComplaintComplainantType = "student" | "staff";
export type ComplaintStatus = "open" | "responded";

export interface ApiComplaint {
  id: number;
  complainant_type?: ComplaintComplainantType | null;
  matric_no?: string | null;
  pf_number?: string | null;
  email?: string | null;
  subject?: string | null;
  body?: string | null;
  status?: ComplaintStatus | null;
  response_subject?: string | null;
  response_body?: string | null;
  responded_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  responded_by?: ApiUser | null;
}

export interface ListDirectMessagesResponse {
  unread_count: number;
  inbox: ApiDirectMessage[];
  sent: ApiDirectMessage[];
  archived: ApiDirectMessage[];
}

export interface SendDirectMessagePayload {
  recipient_user_id?: number;
  recipient_email?: string;
  subject: string;
  body: string;
}

export interface SubmitComplaintPayload {
  complainant_type: ComplaintComplainantType;
  matric_no?: string;
  pf_number?: string;
  email: string;
  subject: string;
  body: string;
}

export interface ReplyComplaintPayload {
  subject: string;
  body: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role?: string;
  is_active?: boolean;
  profile_photo?: string | File | Blob | null;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  is_active?: boolean;
  profile_photo?: string | File | Blob | null;
}

export interface ForgotPasswordResponse {
  message: string;
  dev_reset_token?: string;
}

export interface ResetPasswordPayload {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

export interface RestoreEntitySummary {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  password_reset_required?: number;
}

export interface RestoreSystemBackupResponse {
  message: string;
  summary: {
    students: RestoreEntitySummary;
    staff: RestoreEntitySummary;
    users: RestoreEntitySummary;
  };
}

export interface NotificationDispatchPayload {
  channel: "email" | "sms";
  template: "card-ready" | "expired-card" | "custom" | "announcement";
  audience: "all" | "students" | "staff";
  subject?: string;
  message: string;
  source_announcement_id?: string;
  recipients: Array<{
    recipient_type: "student" | "staff";
    recipient_id: string;
    recipient_name: string;
    recipient_contact?: string;
  }>;
}

export interface NotificationDispatchResult {
  id: string;
  channel: "email" | "sms";
  template: "card-ready" | "expired-card" | "custom" | "announcement";
  audience: "all" | "students" | "staff";
  recipient_type: "student" | "staff";
  recipient_id: string;
  recipient_name: string;
  recipient_contact: string;
  subject?: string | null;
  message: string;
  status: "sent" | "skipped" | "failed";
  reason?: string | null;
  source_announcement_id?: string | null;
  created_at: string;
}

export interface NotificationDispatchResponse {
  message: string;
  provider: {
    channel: "email" | "sms";
    name: string;
    configured: boolean;
  };
  summary: {
    total: number;
    sent: number;
    skipped: number;
    failed: number;
  };
  dispatches: NotificationDispatchResult[];
}

export type CardRequestType = "new" | "reissue-lost" | "replacement-damaged" | "renew-expired";
export type CardRequestStatus = "pending" | "approved" | "rejected";
export type CardRenewalReason = "lost" | "damaged" | "expired";
export type CardRenewalPaymentStatus = "initialized" | "paid" | "failed";

export interface SubmitStudentCardRenewalRequestPayload {
  jamb_no: string;
  reason: CardRenewalReason;
  details?: string | null;
}

export interface SubmitStaffCardRenewalRequestPayload {
  phone: string;
  reason: CardRenewalReason;
  details?: string | null;
}

export interface InitializeStudentCardRenewalPaymentPayload {
  jamb_no: string;
  reason: CardRenewalReason;
  details?: string | null;
  callback_url: string;
  email?: string | null;
}

export interface InitializeStaffCardRenewalPaymentPayload {
  phone: string;
  reason: CardRenewalReason;
  details?: string | null;
  callback_url: string;
  email?: string | null;
}

export interface CardRenewalRequestResponse<TRecord> {
  message: string;
  data: TRecord;
}

export interface CardRenewalPaymentInitializationResponse {
  message: string;
  payment: {
    authorization_url: string;
    access_code?: string | null;
    reference: string;
    amount: number;
    currency: string;
    public_key?: string | null;
  };
}

export interface RenewalPricingConfig {
  student_amount_kobo: number;
  staff_amount_kobo: number;
  student_amount_naira: number;
  staff_amount_naira: number;
  currency: string;
}

export interface PrintNotificationTemplateConfig {
  print_ready_email_subject: string;
  print_ready_email_message: string;
  print_ready_sms_message: string;
}

export interface StudentStatusMessagesConfig {
  student_processing_message: string;
  student_printed_message: string;
}

export interface StudentLevelMappingsConfig {
  student_level_mappings: {
    "100L": string;
    "200L": string;
    "300L": string;
    "400L": string;
    "500L": string;
  };
}

export interface RolePermissionsApiConfig {
  super: Record<string, boolean>;
  admin: Record<string, boolean>;
  user: Record<string, boolean>;
}

export interface RolePermissionsConfigResponse {
  data: RolePermissionsApiConfig;
  stored_in_database: boolean;
}

export interface CreateStudentPayload {
  matric_no: string;
  first_name?: string | null;
  other_name?: string | null;
  last_name?: string | null;
  jamb_no?: string | null;
  email?: string | null;
  department?: string | null;
  graduation_year?: string | number | null;
  admin_notice?: string | null;
  is_printed?: boolean;
  is_collected?: boolean;
  card_collection_location?: string | null;
  card_collected_at?: string | null;
  card_collected_by?: string | null;
  passport_url?: string | null;
  signature_url?: string | null;
}

const toAuthUser = (value: unknown): AuthUser | null => {
  const record = asRecord(value)
  if (!record) return null

  const idValue = record.id
  const idAsNumber =
    typeof idValue === "number"
      ? idValue
      : typeof idValue === "string"
        ? Number(idValue)
        : Number.NaN
  if (!Number.isFinite(idAsNumber)) return null

  return {
    id: idAsNumber,
    name: toOptionalNullableString(record.name),
    email: toOptionalNullableString(record.email),
    role: toOptionalNullableString(record.role),
    is_active: toOptionalBoolean(record.is_active),
    profile_photo_url:
      toOptionalNullableString(record.profile_photo_url) ??
      toOptionalNullableString(record.passport_url),
  }
}

const toApiUser = (value: unknown): ApiUser | null => {
  const record = asRecord(value)
  if (!record) return null

  const idValue = record.id
  const idAsNumber =
    typeof idValue === "number"
      ? idValue
      : typeof idValue === "string"
        ? Number(idValue)
        : Number.NaN
  if (!Number.isFinite(idAsNumber)) return null

  return {
    id: idAsNumber,
    name: toOptionalNullableString(record.name),
    email: toOptionalNullableString(record.email),
    role: toOptionalNullableString(record.role),
    is_active: toOptionalBoolean(record.is_active),
    profile_photo_url: toOptionalNullableString(record.profile_photo_url),
    last_login: toOptionalNullableString(record.last_login),
    created_at: toOptionalNullableString(record.created_at),
    updated_at: toOptionalNullableString(record.updated_at),
  }
}

const pickUserListFromPayload = (payload: unknown): ApiUser[] => {
  if (Array.isArray(payload)) {
    return payload
      .map((entry) => toApiUser(entry))
      .filter((entry): entry is ApiUser => entry !== null)
  }
  const record = asRecord(payload)
  if (!record) return []
  if (Array.isArray(record.data)) {
    return record.data
      .map((entry) => toApiUser(entry))
      .filter((entry): entry is ApiUser => entry !== null)
  }
  if (Array.isArray(record.users)) {
    return record.users
      .map((entry) => toApiUser(entry))
      .filter((entry): entry is ApiUser => entry !== null)
  }
  return []
}

const pickUserFromPayload = (payload: unknown): ApiUser | null => {
  if (!payload) return null
  const root = asRecord(payload)
  const candidate =
    asRecord(root?.data) ??
    asRecord(root?.user) ??
    asRecord(root?.result) ??
    asRecord(payload)
  if (!candidate) return null
  return toApiUser(candidate)
}

const toDirectMessage = (value: unknown): ApiDirectMessage | null => {
  const record = asRecord(value)
  if (!record) return null

  const idValue = record.id
  const idAsNumber =
    typeof idValue === "number"
      ? idValue
      : typeof idValue === "string"
        ? Number(idValue)
        : Number.NaN
  if (!Number.isFinite(idAsNumber)) return null

  return {
    id: idAsNumber,
    subject: toOptionalNullableString(record.subject),
    body: toOptionalNullableString(record.body),
    read_at: toOptionalNullableString(record.read_at),
    sender_archived_at: toOptionalNullableString(record.sender_archived_at),
    recipient_archived_at: toOptionalNullableString(record.recipient_archived_at),
    sender_deleted_at: toOptionalNullableString(record.sender_deleted_at),
    recipient_deleted_at: toOptionalNullableString(record.recipient_deleted_at),
    created_at: toOptionalNullableString(record.created_at),
    updated_at: toOptionalNullableString(record.updated_at),
    sender: pickUserFromPayload(record.sender) ?? undefined,
    recipient: pickUserFromPayload(record.recipient) ?? undefined,
  }
}

const toComplaint = (value: unknown): ApiComplaint | null => {
  const record = asRecord(value)
  if (!record) return null

  const idValue = record.id
  const idAsNumber =
    typeof idValue === "number"
      ? idValue
      : typeof idValue === "string"
        ? Number(idValue)
        : Number.NaN
  if (!Number.isFinite(idAsNumber)) return null

  return {
    id: idAsNumber,
    complainant_type: toOptionalNullableString(record.complainant_type) as ComplaintComplainantType | null | undefined,
    matric_no: toOptionalNullableString(record.matric_no),
    pf_number: toOptionalNullableString(record.pf_number),
    email: toOptionalNullableString(record.email),
    subject: toOptionalNullableString(record.subject),
    body: toOptionalNullableString(record.body),
    status: toOptionalNullableString(record.status) as ComplaintStatus | null | undefined,
    response_subject: toOptionalNullableString(record.response_subject),
    response_body: toOptionalNullableString(record.response_body),
    responded_at: toOptionalNullableString(record.responded_at),
    created_at: toOptionalNullableString(record.created_at),
    updated_at: toOptionalNullableString(record.updated_at),
    responded_by:
      pickUserFromPayload(record.responded_by) ??
      pickUserFromPayload(record.respondedBy),
  }
}

const pickDirectMessageList = (value: unknown): ApiDirectMessage[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => toDirectMessage(entry))
    .filter((entry): entry is ApiDirectMessage => entry !== null)
}

const pickComplaintListFromPayload = (payload: unknown): ApiComplaint[] => {
  if (Array.isArray(payload)) {
    return payload
      .map((entry) => toComplaint(entry))
      .filter((entry): entry is ApiComplaint => entry !== null)
  }

  const record = asRecord(payload)
  if (!record) return []
  if (Array.isArray(record.data)) {
    return record.data
      .map((entry) => toComplaint(entry))
      .filter((entry): entry is ApiComplaint => entry !== null)
  }
  if (Array.isArray(record.complaints)) {
    return record.complaints
      .map((entry) => toComplaint(entry))
      .filter((entry): entry is ApiComplaint => entry !== null)
  }
  return []
}

const pickDirectMessageFromPayload = (payload: unknown): ApiDirectMessage | null => {
  if (!payload) return null
  const root = asRecord(payload)
  const candidate =
    asRecord(root?.data) ??
    asRecord(root?.message) ??
    asRecord(root?.result) ??
    asRecord(payload)
  if (!candidate) return null
  return toDirectMessage(candidate)
}

const pickComplaintFromPayload = (payload: unknown): ApiComplaint | null => {
  if (!payload) return null
  const root = asRecord(payload)
  const candidate =
    asRecord(root?.data) ??
    asRecord(root?.complaint) ??
    asRecord(root?.result) ??
    asRecord(payload)
  if (!candidate) return null
  return toComplaint(candidate)
}

const withAuthConfig = (token: string) => ({
  headers: {
    Authorization: `Bearer ${token.trim()}`,
  },
})

const toBooleanRecord = (value: unknown): Record<string, boolean> => {
  const record = asRecord(value)
  if (!record) return {}

  return Object.entries(record).reduce<Record<string, boolean>>((acc, [key, entry]) => {
    const normalized = toOptionalBoolean(entry)
    if (normalized === undefined) return acc
    acc[key] = normalized
    return acc
  }, {})
}

const toRolePermissionsApiConfig = (value: unknown): RolePermissionsApiConfig => {
  const record = asRecord(value)

  return {
    super: toBooleanRecord(record?.super),
    admin: toBooleanRecord(record?.admin),
    user: toBooleanRecord(record?.user),
  }
}

export const loginUser = async (
  email: string,
  password: string
): Promise<LoginOtpRequestResponse> => {
  const normalizedEmail = email.trim()
  const res = await api.post("/v1/auth/login", {
    email: normalizedEmail,
    password,
  })
  const body = asRecord(res.data)
  const expiresRaw = Number(body?.otp_expires_in_minutes)
  const expiresInMinutes =
    Number.isFinite(expiresRaw) && expiresRaw > 0 ? Math.floor(expiresRaw) : 10

  return {
    message:
      (typeof body?.message === "string" && body.message.trim()) ||
      "A one-time password has been sent to your email.",
    mfa_required: Boolean(body?.mfa_required),
    otp_expires_in_minutes: expiresInMinutes,
    dev_otp:
      typeof body?.dev_otp === "string" && body.dev_otp.trim()
        ? body.dev_otp.trim()
        : undefined,
  }
}

export const requestLoginOtp = async (
  email: string,
  password: string
): Promise<LoginOtpRequestResponse> => {
  return loginUser(email, password)
}

export const verifyLoginOtp = async (
  payload: VerifyLoginOtpPayload
): Promise<LoginResponse> => {
  const requestBody: Record<string, string | number> = {
    email: payload.email.trim(),
    password: payload.password,
    otp: payload.otp.trim(),
  }

  const optionalStringFields: Array<keyof VerifyLoginOtpPayload> = [
    "timezone",
    "user_agent",
    "browser_info",
    "device_info",
    "os_info",
  ]
  optionalStringFields.forEach((field) => {
    const value = payload[field]
    if (typeof value === "string" && value.trim()) {
      requestBody[field] = value.trim()
    }
  })

  if (typeof payload.latitude === "number" && Number.isFinite(payload.latitude)) {
    requestBody.latitude = payload.latitude
  }
  if (typeof payload.longitude === "number" && Number.isFinite(payload.longitude)) {
    requestBody.longitude = payload.longitude
  }

  const res = await api.post("/v1/auth/login/verify-otp", {
    ...requestBody,
  })
  const body = asRecord(res.data)
  const token = typeof body?.token === "string" ? body.token.trim() : ""
  const user = toAuthUser(body?.user)

  if (!token || !user) {
    throw new Error("OTP verification succeeded but response did not include a valid token and user.")
  }

  return { token, user }
}

export const logoutUser = async (token: string): Promise<void> => {
  const authToken = token.trim()
  if (!authToken) return
  await api.post(
    "/v1/auth/logout",
    {},
    withAuthConfig(authToken)
  )
}

export const requestPasswordReset = async (email: string): Promise<ForgotPasswordResponse> => {
  const normalizedEmail = email.trim()
  const res = await api.post("/v1/auth/forgot-password", {
    email: normalizedEmail,
  })
  const payload = asRecord(res.data)
  return {
    message:
      (typeof payload?.message === "string" && payload.message.trim()) ||
      "Password reset token has been sent to your email.",
    dev_reset_token:
      typeof payload?.dev_reset_token === "string" && payload.dev_reset_token.trim()
        ? payload.dev_reset_token.trim()
        : undefined,
  }
}

export const resetPassword = async (payload: ResetPasswordPayload): Promise<{ message: string }> => {
  const res = await api.post("/v1/auth/reset-password", payload)
  const body = asRecord(res.data)
  return {
    message:
      (typeof body?.message === "string" && body.message.trim()) || "Password reset successful.",
  }
}

export const listUsers = async (token: string): Promise<ApiUser[]> => {
  const res = await api.get("/v1/users", withAuthConfig(token))
  return pickUserListFromPayload(res.data as unknown)
}

export const getCurrentUser = async (token: string): Promise<ApiUser> => {
  const res = await api.get("/v1/users/me", withAuthConfig(token))
  const user = pickUserFromPayload(res.data)
  if (user) return user
  throw new Error("Current user request succeeded but no user record was returned.")
}

export const listMessageDirectoryUsers = async (token: string): Promise<ApiUser[]> => {
  const res = await api.get("/v1/users/directory", withAuthConfig(token))
  return pickUserListFromPayload(res.data as unknown)
}

export const listDirectMessages = async (token: string): Promise<ListDirectMessagesResponse> => {
  const res = await api.get("/v1/messages", withAuthConfig(token))
  const body = asRecord(res.data)
  const unreadCountRaw = Number(body?.unread_count ?? 0)

  return {
    unread_count: Number.isFinite(unreadCountRaw) && unreadCountRaw >= 0 ? Math.floor(unreadCountRaw) : 0,
    inbox: pickDirectMessageList(body?.inbox),
    sent: pickDirectMessageList(body?.sent),
    archived: pickDirectMessageList(body?.archived),
  }
}

export const sendDirectMessage = async (
  token: string,
  payload: SendDirectMessagePayload
): Promise<ApiDirectMessage> => {
  const requestBody: Record<string, string | number> = {
    subject: payload.subject.trim(),
    body: payload.body,
  }

  if (typeof payload.recipient_user_id === "number" && Number.isFinite(payload.recipient_user_id)) {
    requestBody.recipient_user_id = Math.floor(payload.recipient_user_id)
  }

  if (typeof payload.recipient_email === "string" && payload.recipient_email.trim()) {
    requestBody.recipient_email = payload.recipient_email.trim()
  }

  const res = await api.post("/v1/messages", requestBody, withAuthConfig(token))
  const message = pickDirectMessageFromPayload(res.data as unknown)
  if (message) return message
  throw new Error("Message sent but API response did not include retrievable message data.")
}

export const markDirectMessageRead = async (token: string, messageId: number): Promise<ApiDirectMessage> => {
  const res = await api.patch(`/v1/messages/${messageId}/read`, {}, withAuthConfig(token))
  const message = pickDirectMessageFromPayload(res.data as unknown)
  if (message) return message
  throw new Error("Message updated but API response did not include retrievable message data.")
}

export const markAllDirectMessagesRead = async (
  token: string
): Promise<{ message: string; updated: number }> => {
  const res = await api.post("/v1/messages/read-all", {}, withAuthConfig(token))
  const body = asRecord(res.data)
  const updatedRaw = Number(body?.updated ?? 0)

  return {
    message:
      (typeof body?.message === "string" && body.message.trim()) || "All inbox messages marked as read.",
    updated: Number.isFinite(updatedRaw) && updatedRaw >= 0 ? Math.floor(updatedRaw) : 0,
  }
}

export const archiveDirectMessage = async (token: string, messageId: number): Promise<ApiDirectMessage> => {
  const res = await api.patch(`/v1/messages/${messageId}/archive`, {}, withAuthConfig(token))
  const message = pickDirectMessageFromPayload(res.data as unknown)
  if (message) return message
  throw new Error("Message archived but API response did not include retrievable message data.")
}

export const restoreDirectMessage = async (token: string, messageId: number): Promise<ApiDirectMessage> => {
  const res = await api.patch(`/v1/messages/${messageId}/restore`, {}, withAuthConfig(token))
  const message = pickDirectMessageFromPayload(res.data as unknown)
  if (message) return message
  throw new Error("Message restored but API response did not include retrievable message data.")
}

export const deleteDirectMessage = async (token: string, messageId: number): Promise<ApiDirectMessage> => {
  const res = await api.delete(`/v1/messages/${messageId}`, withAuthConfig(token))
  const message = pickDirectMessageFromPayload(res.data as unknown)
  if (message) return message
  throw new Error("Message deleted but API response did not include retrievable message data.")
}

export const submitComplaint = async (payload: SubmitComplaintPayload): Promise<ApiComplaint> => {
  const requestBody: Record<string, string> = {
    complainant_type: payload.complainant_type,
    email: payload.email.trim(),
    subject: payload.subject.trim(),
    body: payload.body.trim(),
  }

  if (payload.complainant_type === "student") {
    requestBody.matric_no = String(payload.matric_no ?? "").trim()
  } else {
    requestBody.pf_number = String(payload.pf_number ?? "").trim()
  }

  try {
    const res = await api.post("/v1/complaints", requestBody)
    const complaint = pickComplaintFromPayload(res.data as unknown)
    if (complaint) return complaint
  } catch (error) {
    throw new Error(resolveApiErrorMessage(error, "Unable to submit complaint."))
  }

  throw new Error("Complaint submitted but API response did not include retrievable complaint data.")
}

export const listComplaints = async (token: string): Promise<ApiComplaint[]> => {
  const res = await api.get("/v1/complaints", withAuthConfig(token))
  return pickComplaintListFromPayload(res.data as unknown)
}

export const replyToComplaint = async (
  token: string,
  complaintId: number,
  payload: ReplyComplaintPayload
): Promise<ApiComplaint> => {
  const res = await api.post(
    `/v1/complaints/${complaintId}/reply`,
    {
      subject: payload.subject.trim(),
      body: payload.body.trim(),
    },
    withAuthConfig(token)
  )
  const complaint = pickComplaintFromPayload(res.data as unknown)
  if (complaint) return complaint
  throw new Error("Complaint response was sent but API response did not include retrievable complaint data.")
}

export const resolveBroadcastAuthEndpoint = (): string => {
  return `${backendBaseUrl}/broadcasting/auth`
}

export const createUser = async (token: string, payload: CreateUserPayload): Promise<ApiUser> => {
  const body = await buildUserFormData(payload)
  const res = await api.post("/v1/users", body, {
    ...withAuthConfig(token),
    headers: {
      ...withAuthConfig(token).headers,
      "Content-Type": "multipart/form-data",
    },
  })
  const fromBody = pickUserFromPayload(res.data)
  if (fromBody) return fromBody
  throw new Error("User created but API response did not include retrievable user data.")
}

export const updateUser = async (
  token: string,
  userId: number,
  payload: UpdateUserPayload
): Promise<ApiUser> => {
  const authConfig = withAuthConfig(token)
  const buildMultipartConfig = () => ({
    ...authConfig,
    headers: {
      ...authConfig.headers,
      "Content-Type": "multipart/form-data",
    },
  })

  try {
    const body = await buildUserFormData(payload)
    body.append("_method", "PUT")
    const res = await api.post(`/v1/users/${userId}`, body, buildMultipartConfig())
    const fromBody = pickUserFromPayload(res.data)
    if (fromBody) return fromBody
  } catch (error) {
    if (!isAxiosError(error)) throw error
    const status = error.response?.status
    const shouldRetryAsNativePut = status === 404 || status === 405
    if (!shouldRetryAsNativePut) throw error

    const body = await buildUserFormData(payload)
    const res = await api.put(`/v1/users/${userId}`, body, buildMultipartConfig())
    const fromBody = pickUserFromPayload(res.data)
    if (fromBody) return fromBody
  }

  throw new Error("User updated but API response did not include retrievable user data.")
}

export const deleteUser = async (token: string, userId: number): Promise<void> => {
  const authConfig = withAuthConfig(token)

  try {
    await api.delete(`/v1/users/${userId}`, authConfig)
    return
  } catch (error) {
    if (!isAxiosError(error)) throw error
    const status = error.response?.status
    const shouldRetryAsMethodOverride = status === 404 || status === 405
    if (!shouldRetryAsMethodOverride) throw error
  }

  const body = new FormData()
  body.append("_method", "DELETE")
  await api.post(`/v1/users/${userId}`, body, {
    ...authConfig,
    headers: {
      ...authConfig.headers,
      "Content-Type": "multipart/form-data",
    },
  })
}

export const restoreSystemBackup = async (
  token: string,
  snapshot: unknown
): Promise<RestoreSystemBackupResponse> => {
  const res = await api.post(
    "/v1/system/backup/restore",
    { snapshot },
    withAuthConfig(token)
  )
  const payload = asRecord(res.data)
  const summaryRecord = asRecord(payload?.summary)
  const toSummary = (value: unknown): RestoreEntitySummary => {
    const record = asRecord(value)
    return {
      created: Number(record?.created ?? 0) || 0,
      updated: Number(record?.updated ?? 0) || 0,
      skipped: Number(record?.skipped ?? 0) || 0,
      failed: Number(record?.failed ?? 0) || 0,
      password_reset_required:
        typeof record?.password_reset_required === "number"
          ? record.password_reset_required
          : Number(record?.password_reset_required ?? 0) || 0,
    }
  }

  return {
    message:
      (typeof payload?.message === "string" && payload.message.trim()) ||
      "Backup restore completed.",
    summary: {
      students: toSummary(summaryRecord?.students),
      staff: toSummary(summaryRecord?.staff),
      users: toSummary(summaryRecord?.users),
    },
  }
}

export const dispatchNotifications = async (
  token: string,
  payload: NotificationDispatchPayload
): Promise<NotificationDispatchResponse> => {
  const res = await api.post(
    "/v1/notifications/dispatch",
    payload,
    withAuthConfig(token)
  )
  const body = asRecord(res.data)
  const provider = asRecord(body?.provider)
  const summary = asRecord(body?.summary)
  const rawDispatches = Array.isArray(body?.dispatches) ? body.dispatches : []

  return {
    message:
      (typeof body?.message === "string" && body.message.trim()) ||
      "Notification dispatch completed.",
    provider: {
      channel: provider?.channel === "sms" ? "sms" : "email",
      name: (typeof provider?.name === "string" && provider.name.trim()) || "Provider",
      configured: Boolean(provider?.configured),
    },
    summary: {
      total: Number(summary?.total ?? 0) || 0,
      sent: Number(summary?.sent ?? 0) || 0,
      skipped: Number(summary?.skipped ?? 0) || 0,
      failed: Number(summary?.failed ?? 0) || 0,
    },
    dispatches: rawDispatches
      .map((entry) => {
        const record = asRecord(entry)
        if (!record) return null
        const status =
          record.status === "sent" || record.status === "skipped" || record.status === "failed"
            ? record.status
            : null
        const channel =
          record.channel === "sms" || record.channel === "email"
            ? record.channel
            : null
        const template =
          record.template === "card-ready" ||
          record.template === "expired-card" ||
          record.template === "custom" ||
          record.template === "announcement"
            ? record.template
            : null
        const audience =
          record.audience === "students" || record.audience === "staff" || record.audience === "all"
            ? record.audience
            : null
        const recipientType =
          record.recipient_type === "student" || record.recipient_type === "staff"
            ? record.recipient_type
            : null
        const recipientId = typeof record.recipient_id === "string" ? record.recipient_id.trim() : ""
        const recipientName = typeof record.recipient_name === "string" ? record.recipient_name.trim() : ""
        const message = typeof record.message === "string" ? record.message.trim() : ""
        const createdAt = typeof record.created_at === "string" ? record.created_at.trim() : ""
        if (!status || !channel || !template || !audience || !recipientType || !recipientId || !recipientName || !message) {
          return null
        }

        return {
          id:
            (typeof record.id === "string" && record.id.trim()) ||
            `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
          channel,
          template,
          audience,
          recipient_type: recipientType,
          recipient_id: recipientId,
          recipient_name: recipientName,
          recipient_contact:
            (typeof record.recipient_contact === "string" && record.recipient_contact.trim()) || "--",
          subject: typeof record.subject === "string" ? record.subject : null,
          message,
          status,
          reason: typeof record.reason === "string" ? record.reason : null,
          source_announcement_id:
            typeof record.source_announcement_id === "string" ? record.source_announcement_id : null,
          created_at: createdAt || new Date().toISOString(),
        } satisfies NotificationDispatchResult
      })
      .filter((entry): entry is NotificationDispatchResult => entry !== null),
  }
}

export type StudentDepartmentOption = {
  id: number
  name: string
}

export const listStudentDepartments = async (): Promise<StudentDepartmentOption[]> => {
  const res = await api.get("/v1/students/departments")
  const payload = res.data as unknown
  const record = asRecord(payload)
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(record?.data)
      ? record.data
      : Array.isArray(record?.departments)
        ? record.departments
        : []
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      if (typeof entry === "string") {
        const name = entry.trim()
        return name ? { id: Number.NaN, name } : null
      }
      const objectEntry = asRecord(entry)
      if (!objectEntry) return null
      const idValue = Number(objectEntry.id)
      const candidate = objectEntry.name ?? objectEntry.department ?? objectEntry.value
      const name = typeof candidate === "string" ? candidate.trim() : ""
      if (!name) return null
      return {
        id: Number.isFinite(idValue) ? idValue : Number.NaN,
        name,
      }
    })
    .filter((entry): entry is StudentDepartmentOption => entry !== null && Number.isFinite(entry.id))
}

export type RequestCardDepartment = {
  id: number
  name: string
}

const toRequestCardDepartment = (value: unknown): RequestCardDepartment | null => {
  const record = asRecord(value)
  if (!record) return null

  const id = Number(record.id)
  const name = typeof record.name === "string" ? record.name.trim() : ""
  if (!Number.isFinite(id) || !name) return null

  return { id, name }
}

export const listRequestCardDepartments = async (): Promise<RequestCardDepartment[]> => {
  const res = await api.get("/v1/departments")
  const payload = res.data as unknown
  const record = asRecord(payload)
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(record?.data)
      ? record.data
      : Array.isArray(record?.departments)
        ? record.departments
        : []

  return raw
    .map(toRequestCardDepartment)
    .filter((entry): entry is RequestCardDepartment => entry !== null)
}

export const createRequestCardDepartment = async (
  name: string,
  token: string
): Promise<RequestCardDepartment> => {
  const res = await api.post("/v1/departments", { name }, withAuthConfig(token))
  const payload = res.data as unknown
  const record = asRecord(payload)
  const department = toRequestCardDepartment(record?.department ?? record?.data ?? payload)
  if (!department) throw new Error("Department created but API response was invalid.")
  return department
}

export const updateRequestCardDepartment = async (
  id: number,
  name: string,
  token: string
): Promise<RequestCardDepartment> => {
  const res = await api.put(`/v1/departments/${encodeURIComponent(String(id))}`, { name }, withAuthConfig(token))
  const payload = res.data as unknown
  const record = asRecord(payload)
  const department = toRequestCardDepartment(record?.department ?? record?.data ?? payload)
  if (!department) throw new Error("Department updated but API response was invalid.")
  return department
}

export const deleteRequestCardDepartment = async (id: number, token: string): Promise<void> => {
  await api.delete(`/v1/departments/${encodeURIComponent(String(id))}`, withAuthConfig(token))
}

export const listStaffDepartments = async (): Promise<string[]> => {
  const res = await api.get("/v1/staff/departments")
  const payload = res.data as unknown
  const record = asRecord(payload)
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(record?.data)
      ? record.data
      : Array.isArray(record?.departments)
        ? record.departments
        : []
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      if (typeof entry === "string") return entry.trim()
      const objectEntry = asRecord(entry)
      if (!objectEntry) return ""
      const candidate = objectEntry.department ?? objectEntry.name ?? objectEntry.value
      return typeof candidate === "string" ? candidate.trim() : ""
    })
    .filter(Boolean)
}

export const getStudentMatricCount = async (): Promise<number> => {
  const res = await api.get("/v1/students/matric-count")
  const payload = res.data as unknown
  const record = asRecord(payload)
  const nested = asRecord(record?.data)
  const candidate =
    record?.count ??
    record?.matric_no_count ??
    record?.matric_count ??
    nested?.count ??
    nested?.matric_no_count ??
    nested?.matric_count ??
    record?.data ??
    payload
  const numeric = Number(candidate)
  return Number.isFinite(numeric) ? numeric : 0
}

const pickNumericCount = (payload: unknown, keys: string[]): number => {
  const record = asRecord(payload)
  const nested = asRecord(record?.data)
  const candidates = [
    ...keys.map((key) => record?.[key]),
    ...keys.map((key) => nested?.[key]),
    record?.data,
    payload,
  ]
  for (const candidate of candidates) {
    const numeric = Number(candidate)
    if (Number.isFinite(numeric)) return numeric
  }
  return 0
}

export const getSubmittedStudentCount = async (): Promise<number> => {
  const res = await api.get("/v1/students/submitted-count")
  return pickNumericCount(res.data as unknown, [
    "count",
    "submitted_count",
    "is_submitted_count",
  ])
}

export const getPrintedStudentCount = async (): Promise<number> => {
  const res = await api.get("/v1/students/printed-count")
  return pickNumericCount(res.data as unknown, [
    "count",
    "printed_count",
    "is_printed_count",
  ])
}

export const getSubmittedStaffCount = async (): Promise<number> => {
  const res = await api.get("/v1/staff/submitted-count")
  return pickNumericCount(res.data as unknown, [
    "count",
    "submitted_count",
    "is_submitted_count",
  ])
}

export const getPrintedStaffCount = async (): Promise<number> => {
  const res = await api.get("/v1/staff/printed-count")
  return pickNumericCount(res.data as unknown, [
    "count",
    "printed_count",
    "is_printed_count",
  ])
}

export const listStudents = async (options?: {
  includeArchived?: boolean
  onlyArchived?: boolean
}): Promise<Student[]> => {
  const params: Record<string, string> = {}
  if (options?.includeArchived) {
    params.include_archived = "1"
  }
  if (options?.onlyArchived) {
    params.only_archived = "1"
  }
  const res = await api.get('/v1/students', { params });
  return pickStudentListFromPayload(res.data as unknown)
};

export const listStaff = async (): Promise<StaffRecord[]> => {
  const res = await api.get('/v1/staff')
  return pickStaffListFromPayload(res.data as unknown)
}

// GET /v1/students/{matric_no}
export const getStudent = async (matric_no: string): Promise<Student | null> => {
  const normalized = normalizeMatric(matric_no)
  try {
    const res = await api.get(`/v1/students/${encodeMatric(normalized)}`);
    if (!res.data) return null;
    return pickStudentFromPayload(res.data)
  } catch (error) {
    if (!isAxiosError(error) || error.response?.status !== 404) throw error

    const students = await listStudents({ includeArchived: true })
    const matched = students.find(
      (student) => normalizeMatric(student.matric_no ?? "") === normalized
    )
    return matched ?? null
  }
};

type StudentWritePayload = Partial<Student> & {
  passport?: string | File | Blob | null;
  signature?: string | File | Blob | null;
}

type StaffWritePayload = Partial<StaffRecord> & {
  passport?: string | File | Blob | null;
  signature?: string | File | Blob | null;
}

// Fetch a student using matric_no route: GET /v1/students/{matric_no}
export const getStudentByMatric = async (matric_no: string): Promise<Student | null> => {
  return getStudent(matric_no)
}

export const getStaff = async (pf_number: string): Promise<StaffRecord | null> => {
  const normalized = normalizePfNumber(pf_number)
  const res = await api.get(`/v1/staff/${encodePfNumber(normalized)}`)
  if (!res.data) return null
  return pickStaffFromPayload(res.data)
}

export const getStaffByPfNumber = async (pf_number: string): Promise<StaffRecord | null> => {
  return getStaff(pf_number)
}

export const getStaffByReferenceNumber = async (
  reference_number: string
): Promise<StaffRecord | null> => {
  const normalized = normalizeReferenceNumber(reference_number)
  const res = await api.get(`/v1/staff-reference/${encodeReferenceNumber(normalized)}`)
  if (!res.data) return null
  return pickStaffFromPayload(res.data)
}

export const getStudentByReferenceNumber = async (
  reference_number: string
): Promise<Student | null> => {
  const normalized = normalizeReferenceNumber(reference_number)
  const res = await api.get(`/v1/student-reference/${encodeReferenceNumber(normalized)}`)
  if (!res.data) return null
  return pickStudentFromPayload(res.data)
}

// PUT /v1/students/{matric_no}
export const updateStudent = async (matric_no: string, payload: StudentWritePayload): Promise<Student> => {
  const normalized = normalizeMatric(matric_no)
  const buildMultipartConfig = () => ({
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  try {
    // Laravel/PHP commonly ignores multipart payloads on native PUT requests.
    // Use POST + _method=PUT to ensure all fields/files are parsed.
    const body = await buildStudentFormData(payload)
    body.append("_method", "PUT")
    const res = await api.post(`/v1/students/${encodeMatric(normalized)}`, body, buildMultipartConfig())
    const fromBody = pickStudentFromPayload(res.data)
    if (fromBody) return fromBody
  } catch (error) {
    if (!isAxiosError(error)) throw error
    const status = error.response?.status
    const shouldRetryAsNativePut = status === 404 || status === 405
    if (!shouldRetryAsNativePut) throw error

    const body = await buildStudentFormData(payload)
    const res = await api.put(`/v1/students/${encodeMatric(normalized)}`, body, buildMultipartConfig())
    const fromBody = pickStudentFromPayload(res.data)
    if (fromBody) return fromBody
  }

  const nextMatric = String(payload.matric_no ?? matric_no)
  const fallback = await getStudent(nextMatric)
  if (fallback) return fallback
  throw new Error("Student updated but API response did not include retrievable student data.")
};

export const createStudent = async (payload: CreateStudentPayload): Promise<Student> => {
  const body = await buildStudentFormData(payload)
  const res = await api.post('/v1/students', body, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  const fromBody = pickStudentFromPayload(res.data)
  if (fromBody) return fromBody
  const fallback = await getStudentByMatric(payload.matric_no)
  if (fallback) return fallback
  throw new Error("Student created but API response did not include retrievable student data.")
};

export const createStaff = async (payload: CreateStaffPayload): Promise<StaffRecord> => {
  const body = await buildStaffFormData(payload)
  const res = await api.post('/v1/staff', body, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })
  const fromBody = pickStaffFromPayload(res.data)
  if (fromBody) return fromBody
  const fallback = await getStaffByPfNumber(payload.pf_number)
  if (fallback) return fallback
  throw new Error("Staff created but API response did not include retrievable staff data.")
}

// Update by matric_no: PUT /v1/students/{matric_no}
export const updateStudentByMatric = async (matric_no: string, payload: StudentWritePayload): Promise<Student> => {
  return updateStudent(matric_no, payload)
}

export const updateStaff = async (
  pf_number: string,
  payload: StaffWritePayload
): Promise<StaffRecord> => {
  const normalized = normalizePfNumber(pf_number)
  const buildMultipartConfig = () => ({
    headers: {
      "Content-Type": "multipart/form-data",
    },
  })

  try {
    const body = await buildStaffFormData(payload)
    body.append("_method", "PUT")
    const res = await api.post(`/v1/staff/${encodePfNumber(normalized)}`, body, buildMultipartConfig())
    const fromBody = pickStaffFromPayload(res.data)
    if (fromBody) return fromBody
  } catch (error) {
    if (!isAxiosError(error)) throw error
    const status = error.response?.status
    const shouldRetryAsNativePut = status === 404 || status === 405
    if (!shouldRetryAsNativePut) throw error

    const body = await buildStaffFormData(payload)
    const res = await api.put(`/v1/staff/${encodePfNumber(normalized)}`, body, buildMultipartConfig())
    const fromBody = pickStaffFromPayload(res.data)
    if (fromBody) return fromBody
  }

  const nextPfNumber = String(payload.pf_number ?? pf_number)
  const fallback = await getStaff(nextPfNumber)
  if (fallback) return fallback
  throw new Error("Staff updated but API response did not include retrievable staff data.")
}

export const updateStaffByPfNumber = async (
  pf_number: string,
  payload: StaffWritePayload
): Promise<StaffRecord> => {
  return updateStaff(pf_number, payload)
}

export const submitStudentCardRenewalRequest = async (
  matric_no: string,
  payload: SubmitStudentCardRenewalRequestPayload
): Promise<CardRenewalRequestResponse<Student>> => {
  const normalized = normalizeMatric(matric_no)
  const res = await api.post(`/v1/students/${encodeMatric(normalized)}/card-renewal-request`, {
    jamb_no: payload.jamb_no.trim().toUpperCase(),
    reason: payload.reason,
    details: payload.details?.trim() || undefined,
  })
  const fromBody = pickStudentFromPayload(res.data)
  if (!fromBody) {
    throw new Error("Card renewal request submitted but the updated student record was not returned.")
  }
  const body = asRecord(res.data)
  return {
    message:
      (typeof body?.message === "string" && body.message.trim()) ||
      "Student card renewal request submitted successfully.",
    data: fromBody,
  }
}

export const initializeStudentCardRenewalPayment = async (
  matric_no: string,
  payload: InitializeStudentCardRenewalPaymentPayload
): Promise<CardRenewalPaymentInitializationResponse> => {
  const normalized = normalizeMatric(matric_no)
  const res = await api.post(`/v1/students/${encodeMatric(normalized)}/card-renewal-payment/initialize`, {
    jamb_no: payload.jamb_no.trim().toUpperCase(),
    reason: payload.reason,
    details: payload.details?.trim() || undefined,
    callback_url: payload.callback_url.trim(),
    email: payload.email?.trim().toLowerCase() || undefined,
  })
  const body = asRecord(res.data)
  const payment = asRecord(body?.payment)
  if (!payment || typeof payment.authorization_url !== "string" || typeof payment.reference !== "string") {
    throw new Error("Renewal payment initialized but the payment gateway response was incomplete.")
  }
  return {
    message:
      (typeof body?.message === "string" && body.message.trim()) ||
      "Student renewal payment initialized successfully.",
    payment: {
      authorization_url: payment.authorization_url,
      access_code: toOptionalNullableString(payment.access_code),
      reference: payment.reference,
      amount:
        typeof payment.amount === "number"
          ? payment.amount
          : Number(payment.amount ?? 0),
      currency: typeof payment.currency === "string" ? payment.currency : "NGN",
      public_key: toOptionalNullableString(payment.public_key),
    },
  }
}

export const verifyStudentCardRenewalPayment = async (
  reference: string
): Promise<CardRenewalRequestResponse<Student>> => {
  const res = await api.post(`/v1/students/card-renewal-payment/verify`, {
    reference: reference.trim(),
  })
  const fromBody = pickStudentFromPayload(res.data)
  if (!fromBody) {
    throw new Error("Student renewal payment verified but the updated student record was not returned.")
  }
  const body = asRecord(res.data)
  return {
    message:
      (typeof body?.message === "string" && body.message.trim()) ||
      "Student renewal payment verified successfully.",
    data: fromBody,
  }
}

export const submitStaffCardRenewalRequest = async (
  pf_number: string,
  payload: SubmitStaffCardRenewalRequestPayload
): Promise<CardRenewalRequestResponse<StaffRecord>> => {
  const normalized = normalizePfNumber(pf_number)
  const res = await api.post(`/v1/staff/${encodePfNumber(normalized)}/card-renewal-request`, {
    phone: payload.phone.trim(),
    reason: payload.reason,
    details: payload.details?.trim() || undefined,
  })
  const fromBody = pickStaffFromPayload(res.data)
  if (!fromBody) {
    throw new Error("Card renewal request submitted but the updated staff record was not returned.")
  }
  const body = asRecord(res.data)
  return {
    message:
      (typeof body?.message === "string" && body.message.trim()) ||
      "Staff card renewal request submitted successfully.",
    data: fromBody,
  }
}

export const initializeStaffCardRenewalPayment = async (
  pf_number: string,
  payload: InitializeStaffCardRenewalPaymentPayload
): Promise<CardRenewalPaymentInitializationResponse> => {
  const normalized = normalizePfNumber(pf_number)
  const res = await api.post(`/v1/staff/${encodePfNumber(normalized)}/card-renewal-payment/initialize`, {
    phone: payload.phone.trim(),
    reason: payload.reason,
    details: payload.details?.trim() || undefined,
    callback_url: payload.callback_url.trim(),
    email: payload.email?.trim().toLowerCase() || undefined,
  })
  const body = asRecord(res.data)
  const payment = asRecord(body?.payment)
  if (!payment || typeof payment.authorization_url !== "string" || typeof payment.reference !== "string") {
    throw new Error("Renewal payment initialized but the payment gateway response was incomplete.")
  }
  return {
    message:
      (typeof body?.message === "string" && body.message.trim()) ||
      "Staff renewal payment initialized successfully.",
    payment: {
      authorization_url: payment.authorization_url,
      access_code: toOptionalNullableString(payment.access_code),
      reference: payment.reference,
      amount:
        typeof payment.amount === "number"
          ? payment.amount
          : Number(payment.amount ?? 0),
      currency: typeof payment.currency === "string" ? payment.currency : "NGN",
      public_key: toOptionalNullableString(payment.public_key),
    },
  }
}

export const verifyStaffCardRenewalPayment = async (
  reference: string
): Promise<CardRenewalRequestResponse<StaffRecord>> => {
  const res = await api.post(`/v1/staff/card-renewal-payment/verify`, {
    reference: reference.trim(),
  })
  const fromBody = pickStaffFromPayload(res.data)
  if (!fromBody) {
    throw new Error("Staff renewal payment verified but the updated staff record was not returned.")
  }
  const body = asRecord(res.data)
  return {
    message:
      (typeof body?.message === "string" && body.message.trim()) ||
      "Staff renewal payment verified successfully.",
    data: fromBody,
  }
}

export const getRenewalPricingConfig = async (): Promise<RenewalPricingConfig> => {
  const res = await api.get("/v1/system/renewal-pricing")
  const body = asRecord(res.data)
  const data = asRecord(body?.data)

  const studentAmountKobo = Number(data?.student_amount_kobo ?? 150000)
  const staffAmountKobo = Number(data?.staff_amount_kobo ?? 250000)
  const studentAmountNaira = Number(data?.student_amount_naira ?? studentAmountKobo / 100)
  const staffAmountNaira = Number(data?.staff_amount_naira ?? staffAmountKobo / 100)

  return {
    student_amount_kobo: Number.isFinite(studentAmountKobo) && studentAmountKobo > 0 ? Math.floor(studentAmountKobo) : 150000,
    staff_amount_kobo: Number.isFinite(staffAmountKobo) && staffAmountKobo > 0 ? Math.floor(staffAmountKobo) : 250000,
    student_amount_naira: Number.isFinite(studentAmountNaira) && studentAmountNaira > 0 ? Math.floor(studentAmountNaira) : 1500,
    staff_amount_naira: Number.isFinite(staffAmountNaira) && staffAmountNaira > 0 ? Math.floor(staffAmountNaira) : 2500,
    currency: typeof data?.currency === "string" && data.currency.trim() ? data.currency.trim() : "NGN",
  }
}

export const updateRenewalPricingConfig = async (
  token: string,
  payload: {
    student_amount_naira: number
    staff_amount_naira: number
  }
): Promise<RenewalPricingConfig> => {
  const res = await api.put(
    "/v1/system/renewal-pricing",
    {
      student_amount_naira: Math.max(1, Math.floor(payload.student_amount_naira)),
      staff_amount_naira: Math.max(1, Math.floor(payload.staff_amount_naira)),
    },
    withAuthConfig(token)
  )
  const body = asRecord(res.data)
  const data = asRecord(body?.data)

  return {
    student_amount_kobo: Number(data?.student_amount_kobo ?? 150000),
    staff_amount_kobo: Number(data?.staff_amount_kobo ?? 250000),
    student_amount_naira: Number(data?.student_amount_naira ?? 1500),
    staff_amount_naira: Number(data?.staff_amount_naira ?? 2500),
    currency: typeof data?.currency === "string" && data.currency.trim() ? data.currency.trim() : "NGN",
  }
}

export const getStudentStatusMessagesConfig = async (): Promise<StudentStatusMessagesConfig> => {
  const res = await api.get("/v1/system/student-status-messages")
  const body = asRecord(res.data)
  const data = asRecord(body?.data)

  return {
    student_processing_message:
      (typeof data?.student_processing_message === "string" && data.student_processing_message.trim()) ||
      "Please check back to confirm if your ID Card is ready.",
    student_printed_message:
      (typeof data?.student_printed_message === "string" && data.student_printed_message.trim()) ||
      "Go to your College and pickup your ID Card.",
  }
}

export const updateStudentStatusMessagesConfig = async (
  token: string,
  payload: StudentStatusMessagesConfig
): Promise<StudentStatusMessagesConfig> => {
  const res = await api.put(
    "/v1/system/student-status-messages",
    {
      student_processing_message: payload.student_processing_message.trim(),
      student_printed_message: payload.student_printed_message.trim(),
    },
    withAuthConfig(token)
  )
  const body = asRecord(res.data)
  const data = asRecord(body?.data)

  return {
    student_processing_message:
      (typeof data?.student_processing_message === "string" && data.student_processing_message.trim()) ||
      payload.student_processing_message.trim(),
    student_printed_message:
      (typeof data?.student_printed_message === "string" && data.student_printed_message.trim()) ||
      payload.student_printed_message.trim(),
  }
}

const DEFAULT_STUDENT_LEVEL_MAPPINGS_CONFIG: StudentLevelMappingsConfig["student_level_mappings"] = {
  "100L": "26/",
  "200L": "25/",
  "300L": "24/",
  "400L": "23/",
  "500L": "22/",
}

const normalizeStudentLevelMappingsConfig = (value: unknown) => {
  const record = asRecord(value) ?? {}
  return (Object.keys(DEFAULT_STUDENT_LEVEL_MAPPINGS_CONFIG) as Array<keyof typeof DEFAULT_STUDENT_LEVEL_MAPPINGS_CONFIG>)
    .reduce<StudentLevelMappingsConfig["student_level_mappings"]>((acc, level) => {
      const nextValue = record[level]
      acc[level] =
        (typeof nextValue === "string" && nextValue.trim()) ||
        DEFAULT_STUDENT_LEVEL_MAPPINGS_CONFIG[level]
      return acc
    }, { ...DEFAULT_STUDENT_LEVEL_MAPPINGS_CONFIG })
}

export const getStudentLevelMappingsConfig = async (): Promise<StudentLevelMappingsConfig> => {
  const res = await api.get("/v1/system/student-level-mappings")
  const body = asRecord(res.data)
  const data = asRecord(body?.data)

  return {
    student_level_mappings: normalizeStudentLevelMappingsConfig(data?.student_level_mappings),
  }
}

export const updateStudentLevelMappingsConfig = async (
  token: string,
  payload: StudentLevelMappingsConfig
): Promise<StudentLevelMappingsConfig> => {
  const res = await api.put(
    "/v1/system/student-level-mappings",
    {
      student_level_mappings: normalizeStudentLevelMappingsConfig(payload.student_level_mappings),
    },
    withAuthConfig(token)
  )
  const body = asRecord(res.data)
  const data = asRecord(body?.data)

  return {
    student_level_mappings: normalizeStudentLevelMappingsConfig(data?.student_level_mappings),
  }
}

export const getPrintNotificationTemplateConfig = async (
  token: string
): Promise<PrintNotificationTemplateConfig> => {
  const res = await api.get("/v1/system/print-notification-template", withAuthConfig(token))
  const body = asRecord(res.data)
  const data = asRecord(body?.data)

  return {
    print_ready_email_subject:
      (typeof data?.print_ready_email_subject === "string" && data.print_ready_email_subject.trim()) ||
      "Your JoSTUM ID card is ready for pickup",
    print_ready_email_message:
      (typeof data?.print_ready_email_message === "string" && data.print_ready_email_message.trim()) ||
      "Your {{record_type}} ID card has been printed and is ready for pickup at {{pickup_location}}.\nPlease come with a valid means of identification when collecting it.",
    print_ready_sms_message:
      (typeof data?.print_ready_sms_message === "string" && data.print_ready_sms_message.trim()) ||
      "Your {{record_type}} ID card has been printed and is ready for pickup at {{pickup_location}}.",
  }
}

export const updatePrintNotificationTemplateConfig = async (
  token: string,
  payload: PrintNotificationTemplateConfig
): Promise<PrintNotificationTemplateConfig> => {
  const res = await api.put(
    "/v1/system/print-notification-template",
    {
      print_ready_email_subject: payload.print_ready_email_subject.trim(),
      print_ready_email_message: payload.print_ready_email_message.trim(),
      print_ready_sms_message: payload.print_ready_sms_message.trim(),
    },
    withAuthConfig(token)
  )
  const body = asRecord(res.data)
  const data = asRecord(body?.data)

  return {
    print_ready_email_subject:
      (typeof data?.print_ready_email_subject === "string" && data.print_ready_email_subject.trim()) ||
      payload.print_ready_email_subject.trim(),
    print_ready_email_message:
      (typeof data?.print_ready_email_message === "string" && data.print_ready_email_message.trim()) ||
      payload.print_ready_email_message.trim(),
    print_ready_sms_message:
      (typeof data?.print_ready_sms_message === "string" && data.print_ready_sms_message.trim()) ||
      payload.print_ready_sms_message.trim(),
  }
}

export const getRolePermissionsConfig = async (
  token: string
): Promise<RolePermissionsConfigResponse> => {
  const res = await api.get("/v1/system/role-permissions", withAuthConfig(token))
  const body = asRecord(res.data)

  return {
    data: toRolePermissionsApiConfig(body?.data),
    stored_in_database: body?.stored_in_database === true,
  }
}

export const updateRolePermissionsConfig = async (
  token: string,
  payload: RolePermissionsApiConfig
): Promise<RolePermissionsConfigResponse> => {
  const res = await api.put(
    "/v1/system/role-permissions",
    {
      super: payload.super,
      admin: payload.admin,
      user: payload.user,
    },
    withAuthConfig(token)
  )
  const body = asRecord(res.data)

  return {
    data: toRolePermissionsApiConfig(body?.data),
    stored_in_database: body?.stored_in_database === true,
  }
}

// PATCH /v1/students/{matric_no}/printed
export const updateStudentPrintedStatus = async (
  matric_no: string,
  is_printed: boolean
): Promise<Student> => {
  const normalized = normalizeMatric(matric_no)
  const res = await api.patch(`/v1/students/${encodeMatric(normalized)}/printed`, {
    is_printed,
  })
  const fromBody = pickStudentFromPayload(res.data)
  if (fromBody) return fromBody
  const fallback = await getStudent(normalized)
  if (fallback) return fallback
  throw new Error("Student print status updated but API response did not include retrievable student data.")
}

export const updateStudentArchivedStatus = async (
  matric_no: string,
  archived: boolean
): Promise<Student> => {
  const normalized = normalizeMatric(matric_no)
  const res = await api.patch(`/v1/students/${encodeMatric(normalized)}/archive`, {
    archived,
  })
  const fromBody = pickStudentFromPayload(res.data)
  if (fromBody) return fromBody

  const fallbackResponse = await api.get(`/v1/students/${encodeMatric(normalized)}`, {
    params: { include_archived: "1" },
  })
  const fallback = pickStudentFromPayload(fallbackResponse.data as unknown)
  if (fallback) return fallback

  throw new Error("Student archive status updated but API response did not include retrievable student data.")
}

export interface UpdateStudentCollectionPayload {
  is_collected: boolean
  card_collection_location?: string | null
  card_collected_at?: string | null
  card_collected_by?: string | null
}

export const updateStudentCollectionStatus = async (
  matric_no: string,
  payload: UpdateStudentCollectionPayload
): Promise<Student> => {
  const normalized = normalizeMatric(matric_no)
  const res = await api.patch(`/v1/students/${encodeMatric(normalized)}/collection`, payload)
  const fromBody = pickStudentFromPayload(res.data)
  if (fromBody) return fromBody

  const fallbackResponse = await api.get(`/v1/students/${encodeMatric(normalized)}`, {
    params: { include_archived: "1" },
  })
  const fallback = pickStudentFromPayload(fallbackResponse.data as unknown)
  if (fallback) return fallback

  throw new Error("Student collection status updated but API response did not include retrievable student data.")
}

export interface UpdateStaffCollectionPayload {
  is_collected: boolean
  card_collection_location?: string | null
  card_collected_at?: string | null
  card_collected_by?: string | null
}

export const updateStaffCollectionStatus = async (
  pf_number: string,
  payload: UpdateStaffCollectionPayload
): Promise<StaffRecord> => {
  const normalized = normalizePfNumber(pf_number)
  const res = await api.patch(`/v1/staff/${encodePfNumber(normalized)}/collection`, payload)
  const fromBody = pickStaffFromPayload(res.data)
  if (fromBody) return fromBody
  const fallback = await getStaff(normalized)
  if (fallback) return fallback
  throw new Error("Staff collection status updated but API response did not include retrievable staff data.")
}

export const updateStaffPrintedStatus = async (
  pf_number: string,
  is_printed: boolean
): Promise<StaffRecord> => {
  const normalized = normalizePfNumber(pf_number)
  const res = await api.patch(`/v1/staff/${encodePfNumber(normalized)}/printed`, {
    is_printed,
  })
  const fromBody = pickStaffFromPayload(res.data)
  if (fromBody) return fromBody
  const fallback = await getStaff(normalized)
  if (fallback) return fallback
  throw new Error("Staff print status updated but API response did not include retrievable staff data.")
}

// DELETE /v1/students/{matric_no}
export const deleteStudent = async (matric_no: string): Promise<void> => {
  await api.delete(`/v1/students/${encodeMatric(matric_no)}`);
};

export const deleteStaff = async (pf_number: string): Promise<void> => {
  await api.delete(`/v1/staff/${encodePfNumber(pf_number)}`)
}

// Delete by matric_no: DELETE /v1/students/{matric_no}
export const deleteStudentByMatric = async (matric_no: string): Promise<void> => {
  await deleteStudent(matric_no)
}

export const deleteStaffByPfNumber = async (pf_number: string): Promise<void> => {
  await deleteStaff(pf_number)
}

export const findStudent = async (
  params: { matric_no?: string; matric?: string; jamb_no?: string; jamb?: string }
): Promise<Student | null> => {
  const expectedMatric = (params.matric_no ?? params.matric ?? "").trim().toUpperCase()
  const expectedJamb = (params.jamb_no ?? params.jamb ?? "").trim().toUpperCase()
  const matchesMatric = (value?: string | null) =>
    expectedMatric ? String(value ?? "").trim().toUpperCase() === expectedMatric : true
  const matchesJamb = (value?: string | null) =>
    expectedJamb ? String(value ?? "").trim().toUpperCase() === expectedJamb : true
  const isLookupNotFound = (error: unknown) =>
    isAxiosError(error) && [404, 422].includes(error.response?.status ?? 0)
  let serviceError: unknown = null

  // If a matric was provided, prefer the matric-specific endpoint first
  const matricToTry = params.matric_no ?? params.matric
  if (matricToTry) {
    try {
      const byMatric = await getStudentByMatric(matricToTry)
      if (byMatric) {
        if (matchesJamb(byMatric.jamb_no)) return byMatric
        if (expectedJamb) return null
      }
    } catch (err) {
      if (!isLookupNotFound(err)) {
        serviceError = err
      }
      console.warn('getStudentByMatric failed', err)
      // continue to query list endpoint as fallback
    }
  }
  const tryParamsList: Array<Record<string, string | undefined>> = []

  // Prefer explicit matric_no, but try common variants
  if (params.matric_no) {
    tryParamsList.push({ matric_no: params.matric_no, jamb_no: params.jamb_no ?? params.jamb })
    tryParamsList.push({ matric: params.matric_no, jamb_no: params.jamb_no ?? params.jamb })
  }
  if (params.matric) {
    tryParamsList.push({ matric: params.matric, jamb_no: params.jamb_no ?? params.jamb })
    tryParamsList.push({ matric_no: params.matric, jamb_no: params.jamb_no ?? params.jamb })
  }
  // final attempt by jamb only applies only when matric is not provided
  if (!expectedMatric && (params.jamb_no || params.jamb)) {
    tryParamsList.push({ jamb_no: params.jamb_no ?? params.jamb })
  }

  for (const p of tryParamsList) {
    try {
      const res = await api.get('/v1/students', { params: p })
      const list = pickStudentListFromPayload(res.data as unknown)
      const matched = list.find((student) =>
        matchesMatric(student.matric_no) && matchesJamb(student.jamb_no)
      )
      if (matched) return matched
    } catch (err) {
      if (!isLookupNotFound(err)) {
        serviceError = err
      }
      console.warn('findStudent request failed for', p, err)
      // try next
    }
  }

  // Fallback: fetch all students and match client-side (last resort)
  try {
    const res = await api.get('/v1/students')
    const list = pickStudentListFromPayload(res.data as unknown)
    return (
      list.find((s) => {
        return matchesMatric(s.matric_no) && matchesJamb(s.jamb_no)
      }) ?? null
    )
  } catch (err) {
    if (!isLookupNotFound(err)) {
      serviceError = err
    }
    console.warn('findStudent fallback fetch failed', err)
  }

  if (serviceError) {
    throw serviceError
  }
  return null
}

export default {
  api,
  loginUser,
  requestLoginOtp,
  verifyLoginOtp,
  logoutUser,
  requestPasswordReset,
  resetPassword,
  getCurrentUser,
  listUsers,
  listMessageDirectoryUsers,
  listDirectMessages,
  getRolePermissionsConfig,
  sendDirectMessage,
  markDirectMessageRead,
  markAllDirectMessagesRead,
  archiveDirectMessage,
  restoreDirectMessage,
  deleteDirectMessage,
  resolveBroadcastAuthEndpoint,
  createUser,
  updateUser,
  deleteUser,
  createStudent,
  createStaff,
  getSubmittedStudentCount,
  getPrintedStudentCount,
  getSubmittedStaffCount,
  getPrintedStaffCount,
  getStudentMatricCount,
  updateRolePermissionsConfig,
  listStudents,
  listStaff,
  listStudentDepartments,
  listStaffDepartments,
  getStudent,
  getStaff,
  getStaffByPfNumber,
  getStudentByReferenceNumber,
  submitStudentCardRenewalRequest,
  submitStaffCardRenewalRequest,
  updateStudent,
  updateStaff,
  updateStaffByPfNumber,
  updateStudentPrintedStatus,
  updateStudentCollectionStatus,
  updateStaffPrintedStatus,
  deleteStudent,
  deleteStaff,
  deleteStaffByPfNumber,
};

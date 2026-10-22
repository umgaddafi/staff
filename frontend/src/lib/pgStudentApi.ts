import axios, { isAxiosError } from "axios"
import type { AxiosInstance } from "axios"

import { resolveApiAssetUrl, getStudentStatusMessagesConfig } from "@/lib/studentApi"
import {
  IMAGE_UPLOAD_MAX_BYTES,
  toCompressedImageFile,
} from "@/utils/imageCompression"

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, "")
const sanitizeConfiguredUrl = (value: string) =>
  value
    .trim()
    .replace(/^(https?:\/\/)+(https?:\/\/)/i, "$2")

const DEFAULT_API_URL = "http://localhost/id-card-staff-student/backend/public/api"
const configuredApiUrl =
  sanitizeConfiguredUrl(import.meta.env.VITE_API_URL?.trim() || "") ||
  DEFAULT_API_URL

const api: AxiosInstance = axios.create({
  baseURL: normalizeBaseUrl(configuredApiUrl),
  headers: {
    "Content-Type": "application/json",
  },
})

type CardRequestStatus = "pending" | "approved" | "rejected"
type CardRequestType = "new" | "reissue-lost" | "replacement-damaged" | "renew-expired"
type CardRenewalPaymentStatus = "initialized" | "paid" | "failed"

export interface PgStudent {
  id: number
  matric_no?: string
  nin_no?: string
  reference_number?: string | null
  first_name?: string | null
  other_name?: string | null
  last_name?: string | null
  email?: string | null
  department_id?: number | null
  department?: string | null
  graduation_year?: string | number | null
  card_request_type?: CardRequestType | null
  card_request_status?: CardRequestStatus | null
  card_request_reason?: string | null
  card_request_submitted_at?: string | null
  card_request_approved_at?: string | null
  card_request_rejected_at?: string | null
  card_request_rejection_reason?: string | null
  card_request_payment_reference?: string | null
  card_request_payment_status?: CardRenewalPaymentStatus | null
  card_request_payment_amount?: number | null
  card_request_payment_channel?: string | null
  card_request_payment_paid_at?: string | null
  is_submitted?: boolean
  is_printed?: boolean
  is_collected?: boolean
  card_collection_location?: string | null
  card_collected_at?: string | null
  card_collected_by?: string | null
  card_issued_at?: string | null
  card_expires_at?: string | null
  archived_at?: string | null
  admin_notice?: string | null
  passport_url?: string | null
  signature_url?: string | null
  submission_email_sent?: boolean | null
  submission_email_error?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type PgStudentStatusMessagesConfig = Awaited<ReturnType<typeof getStudentStatusMessagesConfig>>

type PgStudentWritePayload = Partial<PgStudent> & {
  passport?: string | File | Blob | null
  signature?: string | File | Blob | null
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

const toPgStudent = (value: unknown): PgStudent | null => {
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
    nin_no:
      toOptionalNullableString(record.nin_no) ??
      toOptionalNullableString(record.nin) ??
      undefined,
    reference_number:
      toOptionalNullableString(record.reference_number) ??
      toOptionalNullableString(record.referenceNumber),
    first_name: toOptionalNullableString(record.first_name),
    other_name: toOptionalNullableString(record.other_name),
    last_name: toOptionalNullableString(record.last_name),
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

const pickPgStudentListFromPayload = (payload: unknown): PgStudent[] => {
  if (Array.isArray(payload)) {
    return payload
      .map((entry) => toPgStudent(entry))
      .filter((entry): entry is PgStudent => entry !== null)
  }
  const record = asRecord(payload)
  if (!record) return []
  if (Array.isArray(record.data)) {
    return record.data
      .map((entry) => toPgStudent(entry))
      .filter((entry): entry is PgStudent => entry !== null)
  }
  if (Array.isArray(record.pg_students)) {
    return record.pg_students
      .map((entry) => toPgStudent(entry))
      .filter((entry): entry is PgStudent => entry !== null)
  }
  return []
}

const pickPgStudentFromPayload = (payload: unknown): PgStudent | null => {
  if (!payload) return null
  const root = asRecord(payload)
  const candidate =
    asRecord(root?.data) ??
    asRecord(root?.pg_student) ??
    asRecord(root?.result) ??
    asRecord(payload)
  if (!candidate) return null
  const pgStudent = toPgStudent(candidate)
  if (!pgStudent) return null
  return {
    ...pgStudent,
    submission_email_sent: toOptionalBoolean(root?.submission_email_sent),
    submission_email_error: toOptionalNullableString(root?.submission_email_error),
  }
}

const normalizeMatric = (matric_no: string) => String(matric_no ?? "").trim().toUpperCase()
const encodeMatric = (matric_no: string) => encodeURIComponent(normalizeMatric(matric_no)).replace(/%2F/gi, "/")

const appendPgStudentFileField = async (
  formData: FormData,
  field: string,
  value: unknown
) => {
  const isPassportField = field === "passport"
  const compressedFile = await toCompressedImageFile(value, {
    maxBytes: IMAGE_UPLOAD_MAX_BYTES,
    fileName: field,
    preferredType: isPassportField ? "image/jpeg" : "image/png",
    allowJpegFallback: isPassportField,
    maxWidthOrHeight: isPassportField ? 900 : 1200,
  })
  if (!compressedFile) return
  formData.append(field, compressedFile)
}

const buildMultipartConfig = () => ({
  headers: {
    "Content-Type": "multipart/form-data",
  },
})

const buildPgStudentFormData = async (payload: PgStudentWritePayload) => {
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

  await appendPgStudentFileField(
    formData,
    "passport",
    payloadRecord.passport ?? payloadRecord.passport_url
  )
  await appendPgStudentFileField(
    formData,
    "signature",
    payloadRecord.signature ?? payloadRecord.signature_url
  )

  return formData
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

export { resolveApiAssetUrl, getStudentStatusMessagesConfig }
export const getPgStudentStatusMessagesConfig = getStudentStatusMessagesConfig

export const listPgStudents = async (options?: {
  includeArchived?: boolean
  onlyArchived?: boolean
}): Promise<PgStudent[]> => {
  const res = await api.get("/v1/pg-students", {
    params: {
      include_archived: options?.includeArchived ? 1 : undefined,
      only_archived: options?.onlyArchived ? 1 : undefined,
    },
  })
  return pickPgStudentListFromPayload(res.data)
}

export const getPgStudentByMatric = async (matric_no: string): Promise<PgStudent | null> => {
  const normalized = normalizeMatric(matric_no)
  if (!normalized) return null
  try {
    const res = await api.get(`/v1/pg-students/${encodeMatric(normalized)}`)
    return pickPgStudentFromPayload(res.data)
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null
    throw error
  }
}

export const updatePgStudentByMatric = async (
  matric_no: string,
  payload: PgStudentWritePayload
): Promise<PgStudent> => {
  const normalized = normalizeMatric(matric_no)
  const body = await buildPgStudentFormData({ ...payload, _method: "PUT" } as PgStudentWritePayload & { _method: string })

  try {
    const res = await api.post(`/v1/pg-students/${encodeMatric(normalized)}`, body, buildMultipartConfig())
    const student = pickPgStudentFromPayload(res.data)
    if (!student) throw new Error("The PG student API returned an invalid record.")
    return student
  } catch (error) {
    if (!isAxiosError(error) || error.response?.status !== 405) {
      throw error
    }
  }

  const fallbackBody = await buildPgStudentFormData(payload)
  const res = await api.put(`/v1/pg-students/${encodeMatric(normalized)}`, fallbackBody, buildMultipartConfig())
  const student = pickPgStudentFromPayload(res.data)
  if (!student) throw new Error("The PG student API returned an invalid record.")
  return student
}

export const createPgStudent = async (payload: PgStudentWritePayload): Promise<PgStudent> => {
  const body = await buildPgStudentFormData(payload)
  const res = await api.post("/v1/pg-students", body, buildMultipartConfig())
  const student = pickPgStudentFromPayload(res.data)
  if (!student) throw new Error("The PG student API returned an invalid record.")
  return student
}

export const findPgStudent = async (
  params: { matric_no?: string; matric?: string; nin_no?: string; nin?: string }
): Promise<PgStudent | null> => {
  const expectedMatric = (params.matric_no ?? params.matric ?? "").trim().toUpperCase()
  const expectedNin = (params.nin_no ?? params.nin ?? "").trim().toUpperCase()

  const matchesMatric = (value?: string | null) => !expectedMatric || String(value ?? "").trim().toUpperCase() === expectedMatric
  const matchesNin = (value?: string | null) => !expectedNin || String(value ?? "").trim().toUpperCase() === expectedNin

  const matricToTry = params.matric_no ?? params.matric
  if (matricToTry) {
    const byMatric = await getPgStudentByMatric(matricToTry)
    if (byMatric && matchesMatric(byMatric.matric_no) && matchesNin(byMatric.nin_no)) {
      return byMatric
    }
  }

  try {
    const res = await api.get("/v1/pg-students", {
      params: {
        matric_no: params.matric_no ?? params.matric,
        nin_no: params.nin_no ?? params.nin,
      },
    })
    const students = pickPgStudentListFromPayload(res.data)
    return students.find((student) => matchesMatric(student.matric_no) && matchesNin(student.nin_no)) ?? null
  } catch (error) {
    throw new Error(resolveApiErrorMessage(error, "Unable to find PG student record."))
  }
}

export const getPgStudentByNin = getPgStudentByMatric
export const updatePgStudentByNin = updatePgStudentByMatric

export const deletePgStudentByMatric = async (matric_no: string): Promise<void> => {
  const normalized = normalizeMatric(matric_no)
  if (!normalized) return
  await api.delete(`/v1/pg-students/${encodeMatric(normalized)}`)
}

export const updatePgStudentPrintedStatus = async (
  matric_no: string,
  isPrinted: boolean
): Promise<PgStudent> => {
  const res = await api.patch(`/v1/pg-students/${encodeMatric(matric_no)}/printed`, {
    is_printed: isPrinted,
  })
  const student = pickPgStudentFromPayload(res.data)
  if (!student) throw new Error("The PG student API returned an invalid record.")
  return student
}

export const updatePgStudentArchivedStatus = async (
  matric_no: string,
  archived: boolean
): Promise<PgStudent> => {
  const res = await api.patch(`/v1/pg-students/${encodeMatric(matric_no)}/archive`, {
    archived,
  })
  const student = pickPgStudentFromPayload(res.data)
  if (!student) throw new Error("The PG student API returned an invalid record.")
  return student
}

export const updatePgStudentCollectionStatus = async (
  matric_no: string,
  payload: {
    is_collected: boolean
    card_collection_location?: string | null
    card_collected_at?: string | null
    card_collected_by?: string | null
  }
): Promise<PgStudent> => {
  const res = await api.patch(`/v1/pg-students/${encodeMatric(matric_no)}/collection`, payload)
  const student = pickPgStudentFromPayload(res.data)
  if (!student) throw new Error("The PG student API returned an invalid record.")
  return student
}

export const listPgStudentDepartments = async (): Promise<string[]> => {
  const res = await api.get("/v1/pg-students/departments")
  const record = asRecord(res.data)
  if (Array.isArray(record?.departments)) {
    return record.departments
      .map((value) => {
        if (typeof value === "string") return value.trim()
        const entry = asRecord(value)
        const candidate = entry?.name ?? entry?.department ?? entry?.value
        return typeof candidate === "string" ? candidate.trim() : ""
      })
      .filter(Boolean)
  }
  return []
}

const pickCount = (payload: unknown, keys: string[]) => {
  const record = asRecord(payload)
  for (const key of keys) {
    const value = record?.[key]
    const numeric = Number(value)
    if (Number.isFinite(numeric)) return numeric
  }
  return 0
}

export const getPgStudentMatricCount = async (): Promise<number> => {
  const res = await api.get("/v1/pg-students/matric-count")
  return pickCount(res.data, ["matric_no_count", "count"])
}

export const getSubmittedPgStudentCount = async (): Promise<number> => {
  const res = await api.get("/v1/pg-students/submitted-count")
  return pickCount(res.data, ["is_submitted_count", "count"])
}

export const getPrintedPgStudentCount = async (): Promise<number> => {
  const res = await api.get("/v1/pg-students/printed-count")
  return pickCount(res.data, ["is_printed_count", "count"])
}

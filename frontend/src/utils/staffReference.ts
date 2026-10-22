export const STAFF_REFERENCE_PREFIX = "JOSTUM-12-ICT"
const STAFF_REFERENCE_SERIAL_LENGTH = 11

export const STAFF_REFERENCE_PLACEHOLDER = `${STAFF_REFERENCE_PREFIX}-${"0".repeat(
  STAFF_REFERENCE_SERIAL_LENGTH
)}`

export const normalizeStaffReferenceNumber = (value?: string | null) => {
  return String(value ?? "").trim().toUpperCase()
}

export const resolveStaffReferenceNumber = (referenceNumber?: string | null) => {
  const normalized = normalizeStaffReferenceNumber(referenceNumber)
  if (normalized) return normalized
  return ""
}

export const resolveStudentReferenceNumber = (referenceNumber?: string | null) => {
  const normalized = normalizeStaffReferenceNumber(referenceNumber)
  if (normalized) return normalized
  return ""
}

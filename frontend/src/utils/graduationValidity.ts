export const parseGraduationYear = (value: unknown) => {
  const raw = String(value ?? "").trim()
  if (!/^\d{4}$/.test(raw)) return null
  const year = Number(raw)
  return Number.isFinite(year) ? year : null
}

export const isGraduationYearExpired = (value: unknown, currentYear = new Date().getFullYear()) => {
  const graduationYear = parseGraduationYear(value)
  if (graduationYear === null) return null
  return currentYear > graduationYear
}

export const resolveGraduationValidityState = (value: unknown, currentYear = new Date().getFullYear()) => {
  const expired = isGraduationYearExpired(value, currentYear)
  if (expired === true) return "expired" as const
  if (expired === false) return "valid" as const
  return "unknown" as const
}

const normalize = (value?: string | null) => String(value ?? "").trim().toUpperCase()

const normalizeAlphaNumeric = (value?: string | null) =>
  normalize(value).replace(/[^A-Z0-9]/g, "")

export const isJuniorStaffTemplate = ({
  category,
  pfNumber,
  fileNo,
}: {
  category?: string | null
  pfNumber?: string | null
  fileNo?: string | null
}) => {
  const normalizedCategory = normalize(category)
  if (normalizedCategory === "JUNIOR") return true

  const normalizedPfNumber = normalizeAlphaNumeric(pfNumber)
  if (normalizedPfNumber.startsWith("JP")) return true

  const normalizedFileNo = normalizeAlphaNumeric(fileNo)
  if (normalizedFileNo.startsWith("JP")) return true

  return false
}

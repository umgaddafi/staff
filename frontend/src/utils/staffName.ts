type StaffNameParts = {
  firstName?: string | null
  otherName?: string | null
  lastName?: string | null
}

const STAFF_NAME_MIDDLE_INITIAL_THRESHOLD = 20

function normalizeNamePart(value?: string | null) {
  return String(value ?? "").replace(/\s+/g, " ").trim()
}

export function buildStaffDisplayName({ firstName, otherName, lastName }: StaffNameParts) {
  const normalizedFirstName = normalizeNamePart(firstName)
  const normalizedOtherName = normalizeNamePart(otherName)
  const normalizedLastName = normalizeNamePart(lastName)

  const fullName = [normalizedLastName, normalizedOtherName, normalizedFirstName].filter(Boolean).join(" ").trim()
  if (fullName.length <= STAFF_NAME_MIDDLE_INITIAL_THRESHOLD || !normalizedOtherName) {
    return fullName
  }

  const middleInitial = normalizeNamePart(normalizedOtherName).charAt(0).toUpperCase()
  const abbreviatedMiddleName = middleInitial ? `${middleInitial}.` : ""
  return [normalizedLastName, abbreviatedMiddleName, normalizedFirstName].filter(Boolean).join(" ").trim()
}

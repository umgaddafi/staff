const normalize = (value?: string | null) => String(value ?? "").replace(/\s+/g, " ").trim()

const EXACT_PASSTHROUGH_RANKS = new Map<string, string>([
  ["graduate assistant", "Graduate Assistant"],
])

const PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bmedical\s+laboratory\s+scientist\b/gi, "Med. Lab. Sci."],
  [/\bmedical\s+laboratory\s+technician\b/gi, "Med. Lab. Tech."],
  [/\bscience\s+laboratory\s+technologist\b/gi, "Sci. Lab. Tech."],
  [/\bscience\s+laboratory\s+technician\b/gi, "Sci. Lab. Tech."],
  [/\blaboratory\s+technologist\b/gi, "Lab. Tech."],
  [/\blaboratory\s+technician\b/gi, "Lab. Tech."],
  [/\blaboratory\s+scientist\b/gi, "Lab. Scientist"],
  [/\bengineering\s+technologist\b/gi, "Engr. Tech."],
  [/\bengineering\s+technology\b/gi, "Engr. Tech."],
  [/\bcommunity\s+health\s+technologist\b/gi, "Comm. Health Tech."],
  [/\bcommunity\s+health\s+technician\b/gi, "Comm. Health Tech."],
  [/\banimal\s+health\s+superint(?:e|a)nd(?:e|a)nt\b/gi, "Animal Health Supt."],
  [/\benvironmental\s+health\s+superint(?:e|a)nd(?:e|a)nt\b/gi, "Env. Health Supt."],
  [/\bacademic\s+planning\b/gi, "Acad. Plng."],
  [/\bdata\s+processing\b/gi, "Data Proc."],
  [/\btechnical\s+assistant\b/gi, "Tech. Asst."],
  [/\btech\.\s+assistant\b/gi, "Tech. Asst."],
  [/\bworks\s+superintendent\b/gi, "Works Supt."],
  [/\bquantity\s+survey\s+services\b/gi, "Qty. Survey Serv."],
  [/\bquantity\s+surveyor\b/gi, "Qty. Surveyor"],
  [/\bcomputer\s+programmer\/analyst\b/gi, "Programmer/Analyst"],
]

const ASSISTANT_PREVIOUS_WORDS = new Set([
  "principal",
  "chief",
  "senior",
  "tech",
  "tech.",
  "technical",
  "laboratory",
  "lab",
  "lab.",
])

const abbreviateAssistantByContext = (value: string) => {
  return value.replace(/\bassistant\b/gi, (match, offset, fullText) => {
    const before = fullText.slice(0, offset).trimEnd()
    if (!before) return "Asst."

    const previousWordMatch = before.match(/([A-Za-z.]+)$/)
    const previousWord = previousWordMatch?.[1]?.toLowerCase() ?? ""
    if (ASSISTANT_PREVIOUS_WORDS.has(previousWord)) return "Asst."

    return match
  })
}

const cleanSpacing = (value: string) => {
  return value
    .replace(/\s*\/\s*/g, "/")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+/g, " ")
    .trim()
}

export const abbreviateStaffRank = (value?: string | null) => {
  const normalized = normalize(value)
  if (!normalized) return ""

  const passthrough = EXACT_PASSTHROUGH_RANKS.get(normalized.toLowerCase())
  if (passthrough) return passthrough

  let abbreviated = normalized

  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    abbreviated = abbreviated.replace(pattern, replacement)
  }

  abbreviated = abbreviateAssistantByContext(abbreviated)

  return cleanSpacing(abbreviated)
}

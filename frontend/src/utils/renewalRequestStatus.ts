export type RenewalRequestStatusState = "none" | "pending" | "approved" | "rejected"

export const resolveRenewalRequestStatusState = (value: unknown): RenewalRequestStatusState => {
  const normalized = String(value ?? "").trim().toLowerCase()
  if (normalized === "pending") return "pending"
  if (normalized === "approved") return "approved"
  if (normalized === "rejected") return "rejected"
  return "none"
}

export const formatRenewalRequestStatusLabel = (value: unknown) => {
  const state = resolveRenewalRequestStatusState(value)
  if (state === "pending") return "Pending review"
  if (state === "approved") return "Approved"
  if (state === "rejected") return "Rejected"
  return "No active request"
}

export const renewalRequestStatusClassMap: Record<RenewalRequestStatusState, string> = {
  none: "border border-slate-200 bg-white text-slate-700",
  pending: "border border-sky-200 bg-sky-50 text-sky-700",
  approved: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border border-rose-200 bg-rose-50 text-rose-700",
}

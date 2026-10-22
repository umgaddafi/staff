import { CheckCircle2, ShieldCheck } from "lucide-react"

import type { PassportValidationResult } from "@/hooks/usePassportValidation"

type ValidationResultProps = {
  result: PassportValidationResult | null
  image: string | null
}

export default function ValidationResult({
  result,
  image,
}: ValidationResultProps) {
  if (!result) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center sm:p-4">
      <div className="flex items-center justify-center gap-2">
        {result.pass ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : (
          <ShieldCheck className="h-5 w-5 text-amber-600" />
        )}
        <h2 className={result.pass ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
          {result.pass ? "PASSPORT PHOTO ACCEPTED" : "PHOTO REJECTED"}
        </h2>
      </div>

      {!result.pass && (
        <ul className="mt-3 list-disc pl-5 text-left text-xs text-slate-600 sm:text-sm">
          {result.issues.map((issue, index) => (
            <li key={`${issue}-${index}`}>{issue}</li>
          ))}
        </ul>
      )}

      {result.pass && image && (
        <div className="mt-4 flex flex-col items-center">
          <img
            src={image}
            alt="Accepted passport"
            className="h-60 w-[180px] rounded-lg border-2 border-emerald-600 bg-white object-cover"
          />
          <p className="mt-2 text-sm text-emerald-700">Passport-ready photo</p>
        </div>
      )}
    </div>
  )
}

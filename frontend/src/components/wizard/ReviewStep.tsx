import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { IdCardPreview } from "@/components/IdCardPreview"

type ReviewStepProps = {
  data: {
    matric: string
    jamb_no: string
    first_name?: string | null
    other_name?: string | null
    last_name?: string | null
    email?: string | null
    department?: string | null
    photoProcessed?: string
    signatureProcessed?: string
    graduation_year?: string | number
  }
  onBack: () => void
  onFinish: () => void | Promise<void>
  submitting?: boolean
  identifierLabel?: string
  secondaryIdentifierLabel?: string
}

export function ReviewStep({
  data,
  onBack,
  onFinish,
  submitting = false,
  identifierLabel = "Matric Number",
  secondaryIdentifierLabel = "JAMB Reg Number",
}: ReviewStepProps) {
  const nameParts = [data.first_name, data.other_name, data.last_name].filter(Boolean) as string[]
  const fullName = nameParts.length > 0 ? nameParts.join(" ") : ""
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review and Submit</CardTitle>
        <CardDescription>Confirm all details before final submission.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <SummaryItem label={identifierLabel} value={data.matric || "--"} />
          <SummaryItem label={secondaryIdentifierLabel} value={data.jamb_no || "--"} />
          <SummaryItem label="Full Name" value={fullName || "--"} />
          <SummaryItem label="Email Address" value={data.email || "--"} />
          <SummaryItem label="Department" value={data.department ?? "--"} />
          <SummaryItem label="Graduation Year" value={String(data.graduation_year ?? "--")} />
        </div>
        {/* <Separator /> */}
        {/* <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          <IdCardPreview data={data} size="full" />
        </div> */}
        <p className="text-sm text-slate-600">
          By submitting, you confirm that all details are accurate and authorize JoSTUM to print your student ID card.
        </p>
      </CardContent>
      <CardFooter className="flex-col gap-2 sm:flex-row">
        <Button variant="outline" onClick={onBack} className="w-full sm:w-auto" disabled={submitting}>
          Back
        </Button>
        <Button onClick={() => void onFinish()} className="w-full sm:w-auto" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? "Submitting..." : "Finish"}
        </Button>
      </CardFooter>
    </Card>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  )
}

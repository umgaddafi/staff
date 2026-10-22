import * as React from "react"
import type { UseFormReturn } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const biodataSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required."),
  lastName: z.string().trim().min(2, "Last name is required."),
  otherName: z.string().optional(),
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
      message: "Provide a valid email address.",
  }),
  graduationYear: z.string().optional(),
  departmentId: z.string().trim().min(1, "Department is required."),
})

type BiodataForm = z.infer<typeof biodataSchema>

type BiodataStepProps = {
  form: UseFormReturn<BiodataForm>
  matric: string
  identifierLabel?: string
  departmentOptions?: Array<{ id: string | number; name: string }>
  onBack: () => void
  onNext: () => void | Promise<void>
}

const GRADUATION_YEAR_OPTIONS = Array.from({ length: 10 }, (_, index) => String(2026 + index))

export function BiodataStep({
  form,
  matric,
  identifierLabel = "Matric Number",
  departmentOptions = [],
  onBack,
  onNext,
}: BiodataStepProps) {
  const currentDepartmentId = form.watch("departmentId")?.trim() ?? ""
  const normalizedDepartmentOptions = React.useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>()
    departmentOptions.forEach((department) => {
      const id = String(department?.id ?? "").trim()
      const name = String(department?.name ?? "").replace(/\s+/g, " ").trim()
      if (!id || !name) return
      byId.set(id, { id, name })
    })
    if (currentDepartmentId && !byId.has(currentDepartmentId)) {
      byId.set(currentDepartmentId, { id: currentDepartmentId, name: currentDepartmentId })
    }
    return Array.from(byId.values()).sort((left, right) => left.name.localeCompare(right.name))
  }, [currentDepartmentId, departmentOptions])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm Biodata</CardTitle>
        <CardDescription>
          Review your details exactly as they should appear on the ID card.
        </CardDescription>
      </CardHeader>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void onNext()
        }}
      >
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" {...form.register("firstName")} />
            {form.formState.errors.firstName && (
              <p className="text-xs text-red-600">{form.formState.errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" {...form.register("lastName")} />
            {form.formState.errors.lastName && (
              <p className="text-xs text-red-600">{form.formState.errors.lastName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="otherName">Other Name</Label>
            <Input id="otherName" {...form.register("otherName")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" {...form.register("email")} required/>
            {form.formState.errors.email && (
              <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
            )}
            <p className="text-xs text-slate-500">Used for card-ready notifications and updates.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="graduationYear">Graduation Year</Label>
            <select
              id="graduationYear"
              {...form.register("graduationYear")}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">Select graduation year</option>
              {GRADUATION_YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="departmentId">Department</Label>
            <select
              id="departmentId"
              {...form.register("departmentId")}
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="">Select department</option>
              {normalizedDepartmentOptions.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            {form.formState.errors.departmentId && (
              <p className="text-xs text-red-600">{form.formState.errors.departmentId.message}</p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="matric">{identifierLabel}</Label>
            <Input id="matric" value={matric} readOnly />
            <p className="text-xs text-slate-500">From verification step</p>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onBack} className="w-full sm:w-auto">
            Back
          </Button>
          <Button type="submit" className="w-full sm:w-auto">
            Next
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

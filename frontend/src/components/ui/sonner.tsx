import { Toaster as Sonner, type ToasterProps } from "sonner"

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      richColors
      className="toaster"
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-white text-slate-900 border border-slate-200 shadow-soft",
          title: "text-sm font-semibold",
          description: "text-sm text-slate-600",
          actionButton: "bg-jostum-700 text-white",
          cancelButton: "bg-slate-100 text-slate-800",
        },
      }}
      {...props}
    />
  )
}

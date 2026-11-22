"use client"

import { Toaster } from "sonner"

export default function Toasts({ bottom = "calc(var(--chrome-b) + 12px)" }: { bottom?: string }) {
  return (
    <Toaster
      position="bottom-center"
      offset={{ bottom }}
      mobileOffset={{ bottom }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "flex w-[min(360px,calc(100vw-32px))] items-center gap-3 rounded-container border border-line-strong bg-surface px-4 py-3 text-sm text-ink shadow-[0_8px_24px_-12px_rgb(21_25_22/0.35)]",
          actionButton: "ml-auto font-semibold underline underline-offset-2",
        },
      }}
    />
  )
}

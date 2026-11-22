"use client"

import { domMax, LazyMotion, MotionConfig } from "motion/react"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import type { ReactNode } from "react"
import { Toaster } from "sonner"

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LazyMotion>
      <Toaster
        position="bottom-center"
        offset={{ bottom: "calc(var(--chrome-b) + 12px)" }}
        mobileOffset={{ bottom: "calc(var(--chrome-b) + 12px)" }}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: "flex w-[min(360px,calc(100vw-32px))] items-center gap-3 rounded-container border border-line-strong bg-surface px-4 py-3 text-sm text-ink shadow-[0_8px_24px_-12px_rgb(21_25_22/0.35)]",
            actionButton: "ml-auto font-semibold underline underline-offset-2",
          },
        }}
      />
    </NuqsAdapter>
  )
}

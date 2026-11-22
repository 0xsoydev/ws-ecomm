"use client"

import { LazyMotion, MotionConfig } from "motion/react"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import type { ReactNode } from "react"
import Toasts from "./Toasts"

const loadFeatures = () => import("./motion-features").then((m) => m.default)

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <LazyMotion features={loadFeatures} strict>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LazyMotion>
      <Toasts />
    </NuqsAdapter>
  )
}

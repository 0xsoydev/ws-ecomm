"use client"

import { AnimatePresence, m, useReducedMotion } from "motion/react"
import { useEffect, useState, type ReactNode } from "react"

export default function StickyBar({ targetId, label, children }: { targetId: string; label: string; children: ReactNode }) {
  const [show, setShow] = useState(false)
  const reduce = Boolean(useReducedMotion())
  useEffect(() => {
    const target = document.getElementById(targetId)
    if (!target) return
    const io = new IntersectionObserver(([e]) => { setShow(e ? !e.isIntersecting : false); }, { rootMargin: "-56px 0px 0px 0px" })
    io.observe(target)
    return () => { io.disconnect(); }
  }, [targetId])
  return (
    <AnimatePresence>
      {show ? (
        <m.section
          aria-label={label}
          data-bar="purchase"
          initial={reduce ? { opacity: 0 } : { y: "100%" }}
          animate={reduce ? { opacity: 1 } : { y: 0 }}
          exit={reduce ? { opacity: 0 } : { y: "100%", transition: { duration: 0.19 } }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgb(21_25_22/0.35)] lg:hidden"
        >
          {children}
        </m.section>
      ) : null}
    </AnimatePresence>
  )
}

"use client"

import { useEffect, useState, type ReactNode } from "react"

export default function StickyBar({ targetId, label, children }: { targetId: string; label: string; children: ReactNode }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const target = document.getElementById(targetId)
    if (!target) return
    const io = new IntersectionObserver(
      ([e]) => {
        setShow(e ? !e.isIntersecting : false)
      },
      { rootMargin: "-56px 0px 0px 0px" },
    )
    io.observe(target)
    return () => {
      io.disconnect()
    }
  }, [targetId])
  return (
    <section
      aria-label={label}
      aria-hidden={!show}
      inert={!show}
      data-bar={show ? "purchase" : undefined}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgb(21_25_22/0.35)] transition-transform duration-250 ease-out lg:hidden ${show ? "translate-y-0" : "translate-y-full"}`}
    >
      {children}
    </section>
  )
}

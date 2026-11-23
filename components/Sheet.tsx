"use client"

import { Drawer } from "@base-ui/react/drawer"
import { X } from "lucide-react"
import type { ReactNode } from "react"
import { button } from "@/lib/ui"
import { useBackToClose } from "@/lib/use-back-to-close"

const popup = {
  bottom:
    "max-h-[88dvh] w-full rounded-t-[16px] border-t border-line [transform:translateY(var(--drawer-swipe-movement-y))] data-ending-style:[transform:translateY(100%)] data-starting-style:[transform:translateY(100%)]",
  right:
    "h-dvh w-[min(420px,100vw)] border-l border-line [transform:translateX(var(--drawer-swipe-movement-x))] data-ending-style:[transform:translateX(100%)] data-starting-style:[transform:translateX(100%)]",
}

export default function Sheet({
  open,
  onOpenChange,
  title,
  side = "bottom",
  footer,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  side?: "bottom" | "right"
  footer?: ReactNode
  children: ReactNode
}) {
  useBackToClose(open, () => { onOpenChange(false); })
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} swipeDirection={side === "bottom" ? "down" : "right"}>
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 min-h-dvh bg-on-well opacity-[calc(0.45*(1-var(--drawer-swipe-progress)))] transition-opacity duration-350 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0 dark:opacity-[calc(0.7*(1-var(--drawer-swipe-progress)))]" />
        <Drawer.Viewport className={`fixed inset-0 z-50 flex ${side === "bottom" ? "items-end justify-center" : "items-stretch justify-end"}`}>
          <Drawer.Popup
            aria-modal="true"
            className={`flex flex-col bg-surface text-ink shadow-[0_-8px_32px_-12px_rgb(21_25_22/0.25)] outline-hidden transition-transform duration-350 ease-out data-ending-style:duration-250 data-swiping:select-none data-swiping:duration-0 ${popup[side]}`}
          >
            {side === "bottom" ? <span aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong/60" /> : null}
            <div className="flex shrink-0 items-center justify-between gap-3 py-1 pr-2 pl-4">
              <Drawer.Title className="text-lg">{title}</Drawer.Title>
              <Drawer.Close aria-label="Close" className={button.icon}>
                <X aria-hidden className="size-5" strokeWidth={1.75} />
              </Drawer.Close>
            </div>
            <Drawer.Content className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</Drawer.Content>
            {footer ? <div className="shrink-0 border-t border-line bg-surface px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">{footer}</div> : <div className="h-[env(safe-area-inset-bottom)] shrink-0" />}
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

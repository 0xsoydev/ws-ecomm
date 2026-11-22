import type { ReactNode } from "react"
import { button } from "@/lib/ui"
import { waLink } from "@/lib/whatsapp"
import WhatsAppIcon from "./WhatsAppIcon"

const variants = {
  ink: button.ink,
  inkBig: button.inkBig,
  secondary: `${button.secondary} no-underline`,
  tile: "inline-flex h-11 items-center justify-center gap-1.5 rounded-control border border-line-strong bg-surface px-2 text-sm font-semibold whitespace-nowrap no-underline transition-[transform,background-color] duration-150 ease-out active:scale-[0.96] [@media(hover:hover)]:hover:bg-bg",
  icon: `${button.icon} border border-line-strong bg-surface`,
}

export default function WhatsAppLink({ text, variant, label, children, className = "" }: { text: string; variant: keyof typeof variants; label?: string; children?: ReactNode; className?: string }) {
  return (
    <a href={waLink(text)} target="_blank" rel="noopener" aria-label={label} className={`${variants[variant]} ${className}`}>
      <WhatsAppIcon className={variant === "icon" ? "size-5" : "size-4.5 shrink-0"} />
      {children}
    </a>
  )
}

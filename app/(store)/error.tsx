"use client"

import WhatsAppIcon from "@/components/WhatsAppIcon"
import { button } from "@/lib/ui"
import { waLink } from "@/lib/whatsapp"

export default function StoreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-[680px] flex-col items-start gap-4 px-4 py-16 sm:px-6">
      <h1 className="text-2xl">This page didn&rsquo;t load.</h1>
      <p className="text-muted">Try again, or ask us on WhatsApp.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={reset} className={button.ink}>
          Try again
        </button>
        <a href={waLink("Hi, the website didn't load for me.")} target="_blank" rel="noopener" className={`${button.secondary} no-underline`}>
          <WhatsAppIcon className="size-4.5" />
          WhatsApp
        </a>
      </div>
    </div>
  )
}

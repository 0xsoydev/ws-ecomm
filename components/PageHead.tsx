import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import type { Route } from "next"

export default function PageHead({ back, title, children }: { back: { href: Route; label: string } | null; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 pt-4 pb-2 lg:pt-8">
      {back ? (
        <Link href={back.href} className="-ml-1 flex w-fit items-center gap-0.5 py-1 text-sm text-muted no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:text-ink">
          <ChevronLeft aria-hidden className="size-4" strokeWidth={1.75} />
          {back.label}
        </Link>
      ) : null}
      <h1 className="text-2xl tracking-[-0.02em] lg:text-3xl">{title}</h1>
      {children}
    </div>
  )
}

import Link from "next/link"
import { button } from "@/lib/ui"

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[680px] flex-col items-start gap-4 px-4 py-16 sm:px-6">
      <h1 className="text-2xl">We couldn&rsquo;t find that page.</h1>
      <p className="text-muted">Search for the part by its code or name.</p>
      <form action="/search" role="search" className="w-full">
        <label htmlFor="nf-q" className="sr-only">
          Search parts
        </label>
        <input id="nf-q" name="q" type="search" enterKeyHint="search" placeholder="Part code, name or vehicle" className="h-12 w-full rounded-control border border-line-strong bg-surface px-4 text-base" />
      </form>
      <Link href="/" className={`${button.secondary} no-underline`}>
        Go to the home page
      </Link>
    </div>
  )
}

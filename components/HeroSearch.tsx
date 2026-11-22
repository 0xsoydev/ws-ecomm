"use client"

import { Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"

function useTyping(phrases: readonly string[], enabled: boolean) {
  const [text, setText] = useState(phrases[0] ?? "")
  useEffect(() => {
    if (!enabled || phrases.length === 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let phrase = 0
    let chars = 0
    let deleting = false
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const full = phrases[phrase] ?? ""
      if (!deleting && chars < full.length) {
        chars++
        timer = setTimeout(tick, 70)
      } else if (!deleting) {
        deleting = true
        timer = setTimeout(tick, 1600)
      } else if (chars > 0) {
        chars--
        timer = setTimeout(tick, 28)
      } else {
        deleting = false
        phrase = (phrase + 1) % phrases.length
        timer = setTimeout(tick, 300)
      }
      setText(full.slice(0, chars))
    }
    chars = 0
    timer = setTimeout(tick, 600)
    return () => { clearTimeout(timer); }
  }, [phrases, enabled])
  return text
}

export default function HeroSearch({ phrases }: { phrases: string[] }) {
  const form = useRef<HTMLFormElement>(null)
  const [value, setValue] = useState("")
  const [stopped, setStopped] = useState(false)
  const typed = useTyping(phrases, !stopped)

  useEffect(() => {
    const el = form.current
    if (!el) return
    const root = document.documentElement
    const io = new IntersectionObserver(([entry]) => root.toggleAttribute("data-hero-away", entry ? !entry.isIntersecting : false), { rootMargin: "-56px 0px 0px 0px" })
    io.observe(el)
    const stop = () => { setStopped(true); }
    window.addEventListener("scroll", stop, { once: true, passive: true })
    return () => {
      io.disconnect()
      root.removeAttribute("data-hero-away")
      window.removeEventListener("scroll", stop)
    }
  }, [])

  return (
    <form ref={form} id="hero-search" action="/search" role="search" className="corner-ticks -mx-1.5 p-1.5">
      <div className="flex h-13 items-stretch overflow-hidden rounded-control border border-line-strong bg-surface focus-within:border-ink">
        <label className="relative flex min-w-0 flex-1 items-center">
          <span className="sr-only">Search parts by code, name or vehicle</span>
          <input
            name="q"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={value}
            onChange={(e) => { setValue(e.currentTarget.value); }}
            onFocus={() => { setStopped(true); }}
            onKeyDown={() => { setStopped(true); }}
            className="peer h-full w-full bg-transparent px-4 text-lg outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {value === "" ? (
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg text-muted peer-focus:opacity-70">
              {stopped ? "Part code, name or vehicle" : typed}
              {stopped ? null : <span className="ml-px inline-block h-5 w-px animate-pulse bg-muted" />}
            </span>
          ) : null}
        </label>
        <button type="submit" className="m-1 inline-flex items-center gap-2 rounded-[4px] border border-ink bg-accent px-4 font-semibold text-on-accent transition-[transform,background-color] duration-150 ease-out active:scale-[0.96] [@media(hover:hover)]:hover:bg-accent/85">
          <Search aria-hidden className="size-4.5" strokeWidth={2} />
          Search
        </button>
      </div>
    </form>
  )
}

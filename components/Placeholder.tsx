import SystemIcon from "./SystemIcon"

export default function Placeholder({ systemSlug, code, size }: { systemSlug: string; code: string | null; size: "row" | "tile" | "pdp" }) {
  if (size === "row") {
    return (
      <span className="flex size-full items-center justify-center bg-well text-on-well-muted">
        <SystemIcon slug={systemSlug} className="size-5" strokeWidth={1.5} />
      </span>
    )
  }
  return (
    <span className="corner-ticks flex size-full flex-col items-center justify-center gap-3 bg-well bg-origin-content p-3 text-on-well-muted [--line-strong:var(--on-well-muted)]">
      <SystemIcon slug={systemSlug} className={size === "pdp" ? "size-14" : "size-9"} strokeWidth={1.25} />
      {size === "pdp" && code ? <span className="max-w-[12ch] text-center text-3xl leading-none font-semibold text-balance text-on-well [font-stretch:125%]">{code}</span> : null}
    </span>
  )
}

export const button = {
  primary:
    "inline-flex h-11 items-center justify-center gap-2 rounded-control border border-ink bg-accent px-4 font-semibold text-on-accent transition-[transform,opacity] duration-150 ease-out active:scale-[0.96] disabled:opacity-50",
  secondary:
    "inline-flex h-11 items-center justify-center gap-2 rounded-control border border-line-strong bg-surface px-4 font-semibold transition-[background-color,transform] duration-200 ease-out active:scale-[0.96] disabled:opacity-50 [@media(hover:hover)]:hover:bg-bg",
  small:
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-control border border-line-strong bg-surface px-3 text-sm font-semibold transition-[background-color,transform] duration-200 ease-out active:scale-[0.96] disabled:opacity-50 [@media(hover:hover)]:hover:bg-bg",
}

export const field = "h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base"

export const chip = (active: boolean) =>
  `inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-sm font-medium transition-colors duration-200 ease-out ${
    active ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface [@media(hover:hover)]:hover:bg-bg"
  }`

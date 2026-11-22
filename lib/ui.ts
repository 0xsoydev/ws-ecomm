const press = "transition-[transform,background-color,color,opacity] duration-150 ease-out active:scale-[0.96] disabled:opacity-50"

export const button = {
  primary: `inline-flex h-11 items-center justify-center gap-2 rounded-control border border-ink bg-accent px-4 font-semibold text-on-accent ${press} [@media(hover:hover)]:hover:bg-accent/85`,
  secondary: `inline-flex h-11 items-center justify-center gap-2 rounded-control border border-line-strong bg-surface px-4 font-semibold ${press} [@media(hover:hover)]:hover:bg-bg`,
  small: `inline-flex h-9 items-center justify-center gap-1.5 rounded-control border border-line-strong bg-surface px-3 text-sm font-semibold ${press} [@media(hover:hover)]:hover:bg-bg`,
  big: `inline-flex h-13 items-center justify-center gap-2 rounded-control border border-ink bg-accent px-5 text-lg font-semibold text-on-accent ${press} [@media(hover:hover)]:hover:bg-accent/85`,
  ink: `inline-flex h-11 items-center justify-center gap-2 rounded-control border border-ink bg-ink px-4 font-semibold text-bg no-underline ${press} [@media(hover:hover)]:hover:bg-ink/85`,
  inkBig: `inline-flex h-13 items-center justify-center gap-2 rounded-control border border-ink bg-ink px-5 font-semibold text-bg no-underline ${press} [@media(hover:hover)]:hover:bg-ink/85`,
  icon: `inline-flex size-11 shrink-0 items-center justify-center rounded-control text-ink ${press} [@media(hover:hover)]:hover:bg-ink/8`,
}

export const field = "h-11 w-full rounded-control border border-line-strong bg-surface px-3 text-base"

export const chip = (active: boolean) =>
  `inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-sm font-medium transition-colors duration-200 ease-out ${
    active ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface [@media(hover:hover)]:hover:bg-bg"
  }`

export const code = "font-semibold tracking-[-0.01em] [font-stretch:112%]"

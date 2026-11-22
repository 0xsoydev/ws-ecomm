import type { ReactNode } from "react"

export function AdminFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center gap-8 px-4 py-12">
      <picture>
        <source srcSet="/wsgreen_dark.svg" media="(prefers-color-scheme: dark)" />
        <img src="/wsgreen_light.svg" alt="WS Green" width={136} height={14} className="h-4 w-auto" />
      </picture>
      <h1 className="text-2xl">{title}</h1>
      {children}
    </main>
  )
}

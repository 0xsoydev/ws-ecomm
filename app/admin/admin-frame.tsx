import Logo from "@/components/Logo"
import type { ReactNode } from "react"

export function AdminFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center gap-8 px-4 py-12">
        <Logo className="h-5 w-auto" />
      <h1 className="text-2xl">{title}</h1>
      {children}
    </main>
  )
}

"use client"

import { Check, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useOptimistic, useState, useTransition } from "react"
import { chip } from "../../ui"
import { classifyPhoto } from "./actions"

type Photo = {
  id: number
  publicId: string
  ownPhoto: boolean
  watermarked: boolean
  onWhite: boolean
  classified: boolean
  position: number
  productId: number
  name: string
  sku: string
}

type Filter = "unsorted" | "ours" | "not-ours"
type Change = Pick<Photo, "id" | "ownPhoto" | "watermarked" | "onWhite" | "classified">

const matches = (p: Photo, filter: Filter) => (filter === "unsorted" ? !p.classified : filter === "ours" ? p.classified && p.ownPhoto : p.classified && !p.ownPhoto)

export function PhotoSorter({ photos }: { photos: Photo[] }) {
  const [filter, setFilter] = useState<Filter>("unsorted")
  const [error, setError] = useState("")
  const [, startTransition] = useTransition()
  const [view, apply] = useOptimistic(photos, (current, change: Change) => current.map((p) => (p.id === change.id ? { ...p, ...change } : p)))

  const counts = { unsorted: view.filter((p) => matches(p, "unsorted")).length, ours: view.filter((p) => matches(p, "ours")).length, "not-ours": view.filter((p) => matches(p, "not-ours")).length }
  const shown = view.filter((p) => matches(p, filter))

  function save(change: Change) {
    setError("")
    startTransition(async () => {
      apply(change)
      try {
        await classifyPhoto(change)
      } catch {
        setError("A photo did not save. Check your connection and tap it again.")
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Show">
        {(
          [
            ["unsorted", "Unsorted"],
            ["ours", "Ours"],
            ["not-ours", "Not ours"],
          ] as const
        ).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={filter === value} className={chip(filter === value)} onClick={() => { setFilter(value) }}>
            {label} <span className="ml-1 opacity-70">{counts[value]}</span>
          </button>
        ))}
      </div>
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-danger">
        {error}
      </p>
      {shown.length === 0 ? (
        <p className="py-12 text-center text-muted">{filter === "unsorted" ? "Every photo is sorted." : "No photos here yet."}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((p) => (
            <li key={p.id} className="flex min-w-0 flex-col gap-2">
              <div className="relative aspect-square overflow-hidden rounded-container bg-well outline outline-1 -outline-offset-1 outline-[color-mix(in_srgb,var(--on-well)_10%,transparent)]">
                <Image src={p.onWhite ? p.publicId : `fill:${p.publicId}`} alt={p.name} fill sizes="(min-width: 1024px) 260px, (min-width: 640px) 33vw, 50vw" className="object-contain" />
                {p.classified && (
                  <span className="absolute top-2 left-2 inline-flex h-6 items-center gap-1 rounded-full border border-ink bg-surface px-2 text-xs font-semibold text-ink">
                    {p.ownPhoto ? <Check aria-hidden size={12} /> : <X aria-hidden size={12} />}
                    {p.ownPhoto ? "Ours" : p.watermarked ? "Watermarked" : "Not ours"}
                  </span>
                )}
              </div>
              <Link href={`/admin/products/${String(p.productId)}`} className="line-clamp-2 text-sm leading-snug">
                {p.name}
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={p.classified && p.ownPhoto}
                  className={`h-11 rounded-control border text-sm font-semibold transition-[background-color,transform] duration-150 ease-out active:scale-[0.96] ${p.classified && p.ownPhoto ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface"}`}
                  onClick={() => { save({ id: p.id, ownPhoto: true, watermarked: false, onWhite: p.onWhite, classified: true }) }}
                >
                  Ours
                </button>
                <button
                  type="button"
                  aria-pressed={p.classified && !p.ownPhoto}
                  className={`h-11 rounded-control border text-sm font-semibold transition-[background-color,transform] duration-150 ease-out active:scale-[0.96] ${p.classified && !p.ownPhoto ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface"}`}
                  onClick={() => { save({ id: p.id, ownPhoto: false, watermarked: p.watermarked, onWhite: p.onWhite, classified: true }) }}
                >
                  Not ours
                </button>
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <label className="flex min-h-8 items-center gap-2">
                  <input type="checkbox" className="size-4 accent-[var(--ink)]" checked={p.watermarked} onChange={(e) => { save({ id: p.id, ownPhoto: false, watermarked: e.target.checked, onWhite: p.onWhite, classified: true }) }} />
                  Another seller&apos;s watermark
                </label>
                <label className="flex min-h-8 items-center gap-2">
                  <input type="checkbox" className="size-4 accent-[var(--ink)]" checked={!p.onWhite} onChange={(e) => { save({ id: p.id, ownPhoto: p.ownPhoto, watermarked: p.watermarked, onWhite: !e.target.checked, classified: p.classified }) }} />
                  Background not white
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

"use client"

import { Check, Plus, X } from "lucide-react"
import { useState, useTransition } from "react"
import { button, field } from "@/lib/ui"
import { changeFit } from "./actions"
import type { Fit, ModelOption } from "./load"

export function FitmentEditor({ productId, fits, models }: { productId: number; fits: Fit[]; models: ModelOption[] }) {
  const [pending, start] = useTransition()
  const [adding, setAdding] = useState("")
  const [error, setError] = useState<string | null>(null)
  const label = new Map(models.map((m) => [m.id, m.label]))
  const run = (modelId: number, action: "approve" | "remove" | "add") => {
    setError(null)
    start(async () => {
      const r = await changeFit({ productId, modelId, action })
      if (!r.ok) setError(r.message)
    })
  }
  const free = models.filter((m) => !fits.some((f) => f.modelId === m.id))
  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      {fits.length ? (
        <ul className="flex flex-col gap-2">
          {[...fits].sort((a, b) => Number(a.verified) - Number(b.verified)).map((f) => (
            <li key={f.modelId} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-line px-3 py-2">
              <span className="font-medium">{label.get(f.modelId) ?? `Model ${String(f.modelId)}`}</span>
              <span className={`text-xs ${f.verified ? "text-ink" : "text-signal"}`}>{f.verified ? "Checked" : "To check"}</span>
              {f.source ? (
                <span className="min-w-0 basis-full truncate text-xs text-muted">
                  {/^https?:\/\//.test(f.source) ? (
                    <a href={f.source} target="_blank" rel="noopener noreferrer">
                      {f.source}
                    </a>
                  ) : (
                    f.source.split(/(https?:\/\/\S+)/).map((part, i) =>
                      /^https?:\/\//.test(part) ? (
                        <a key={i} href={part} target="_blank" rel="noopener noreferrer">
                          {part}
                        </a>
                      ) : (
                        part
                      ),
                    )
                  )}
                </span>
              ) : null}
              <span className="ml-auto flex gap-1.5">
                {f.verified ? null : (
                  <button type="button" disabled={pending} onClick={() => { run(f.modelId, "approve") }} className={`${button.small} h-10`} aria-label={`Mark ${label.get(f.modelId) ?? ""} as checked`}>
                    <Check aria-hidden size={16} />
                    Fits
                  </button>
                )}
                <button type="button" disabled={pending} onClick={() => { run(f.modelId, "remove") }} className={`${button.small} h-10`} aria-label={`Remove ${label.get(f.modelId) ?? ""}`}>
                  <X aria-hidden size={16} />
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No vehicles tagged.</p>
      )}
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`add-${String(productId)}`}>
          Add a vehicle
        </label>
        <select id={`add-${String(productId)}`} value={adding} onChange={(e) => { setAdding(e.currentTarget.value) }} className={`${field} flex-1`}>
          <option value="">Add a vehicle</option>
          {free.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending || !adding}
          onClick={() => {
            run(Number(adding), "add")
            setAdding("")
          }}
          className={`${button.secondary} h-11`}
        >
          <Plus aria-hidden size={16} />
          Add
        </button>
      </div>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </div>
  )
}

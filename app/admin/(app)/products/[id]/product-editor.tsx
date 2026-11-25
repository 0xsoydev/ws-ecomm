"use client"

import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, CircleAlert, ExternalLink, Plus, Star, Trash2, X } from "lucide-react"
import type { Route } from "next"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react"
import { toast } from "sonner"
import { ISSUES, purchasableIssues, type Issue, type PurchasableContext } from "@/lib/catalog"
import { formatPaise, parseRupees } from "@/lib/format"
import { hasRetailTier } from "@/lib/pricing"
import type { auditAction, batteryKind, bodyStyle, fulfilment, products, productStatus } from "@/lib/schema"
import { button, field } from "@/lib/ui"
import { mayLeave, neighbours, setDirty, useOrder } from "../workspace"
import { saveProduct } from "./actions"

type Product = Omit<typeof products.$inferSelect, "bisVerifiedAt" | "specs" | "updatedAt"> & { bisVerifiedAt: string | null; specs: Record<string, string>; updatedAt: string }
type Category = { id: number; name: string; system: string }
type Photo = { id: number; publicId: string; ownPhoto: boolean; watermarked: boolean; onWhite: boolean; classified: boolean }
type Fit = { modelId: number; verified: boolean; source: string }
type Model = { id: number; label: string }
type HistoryEntry = { id: number; at: string; action: (typeof auditAction.enumValues)[number]; who: string; diff: Record<string, [unknown, unknown]> }

const rupees = (paise: number | null) => (paise === null ? "" : paise % 100 ? (paise / 100).toFixed(2) : String(paise / 100))
const int = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null)

const STATUS: Record<(typeof productStatus.enumValues)[number], string> = { active: "Active", draft: "Draft", archived: "Archived" }
const BODY: Record<(typeof bodyStyle.enumValues)[number], string> = { dl_model: "DL model", sl_model: "SL model", loader: "Loader / e-rickshaw", three_wheeler: "3-wheeler" }
const BATTERY: Record<(typeof batteryKind.enumValues)[number], string> = { none: "Not a battery", cell: "Lithium cell", pack: "Battery pack" }
const FULFIL: Record<(typeof fulfilment.enumValues)[number], string> = { courier: "Courier allowed", pickup_or_freight: "Pickup or freight only" }
const SECTIONS = [
  ["overview", "Overview"],
  ["price", "Price"],
  ["photos", "Photos"],
  ["vehicles", "Vehicles"],
  ["stock", "Stock"],
  ["specs", "Specs"],
  ["legal", "Tax and legal"],
  ["history", "History"],
] as const
const ISSUE_SECTION: Record<Issue, string> = { inactive: "overview", price: "price", prePackaged: "legal", netQuantity: "legal", mrp: "legal", maker: "legal", bis: "legal", epr: "legal", hsn: "legal" }
const PAISE_KEYS = new Set(["wholesalePaise", "retailPaise", "mrpPaise", "costPaise"])
const KEY_LABEL: Record<string, string> = { wholesalePaise: "wholesale", retailPaise: "retail", mrpPaise: "MRP", costPaise: "cost", moq: "wholesale from", minOrderQty: "minimum order", orderStep: "step", priceApproved: "approved", gstRateBps: "GST", partCode: "part code", categoryId: "category", bodyStyle: "body style", copyReviewed: "description checked", specsReviewed: "specs checked", prePackaged: "packaging", makerAddress: "maker address", netQuantity: "net quantity", batteryKind: "battery", bisRegistration: "BIS", lowStockAt: "low stock warning", weightGrams: "weight", photosRemoved: "photos removed" }

function Section({ id, title, note, children }: { id: string; title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="flex scroll-mt-44 flex-col gap-4 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-h`} className="text-lg">
          {title}
        </h2>
        {note ? <p className="max-w-[65ch] text-sm text-muted">{note}</p> : null}
      </div>
      {children}
    </section>
  )
}

function Field({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <label className="flex min-w-0 flex-col gap-1.5">
        <span className="text-sm font-semibold">{label}</span>
        {children}
      </label>
      {hint ? <span className="text-sm text-muted">{hint}</span> : null}
    </div>
  )
}

function Toggle({ on, onChange, children }: { on: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onChange} className={`h-10 rounded-control border px-3 text-sm font-semibold transition-[background-color,color] duration-150 ease-out ${on ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface [@media(hover:hover)]:hover:bg-bg"}`}>
      {children}
    </button>
  )
}

function Source({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/[^\s);,]+)/).map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  )
}

function shown(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "empty"
  if (PAISE_KEYS.has(key) && typeof value === "number") return formatPaise(value)
  if (key === "gstRateBps" && typeof value === "number") return `${String(value / 100)}%`
  if (typeof value === "boolean") return value ? "yes" : "no"
  const s = typeof value === "string" || typeof value === "number" ? String(value) : JSON.stringify(value)
  return s.length > 48 ? `${s.slice(0, 47)}...` : s
}

export function ProductEditor({ product, categories, images, ctx, fits, models, history, isOwner }: { product: Product; categories: Category[]; images: Photo[]; ctx: PurchasableContext; fits: Fit[]; models: Model[]; history: HistoryEntry[]; isOwner: boolean }) {
  const router = useRouter()
  const params = useSearchParams()
  const order = useOrder()
  const initial = useMemo(
    () => ({
      name: product.name,
      partCode: product.partCode ?? "",
      status: product.status,
      categoryId: product.categoryId,
      bodyStyle: product.bodyStyle,
      aliases: product.aliases,
      description: product.description,
      copyReviewed: product.copyReviewed,
      prePackaged: product.prePackaged,
      maker: product.maker ?? "",
      makerAddress: product.makerAddress ?? "",
      netQuantity: product.netQuantity ?? "",
      batteryKind: product.batteryKind,
      bisRegistration: product.bisRegistration ?? "",
      bisVerified: product.bisVerifiedAt !== null,
      counted: product.stock !== null,
      stock: String(product.stock ?? 0),
      stockNote: "",
      bin: product.bin ?? "",
      lowStockAt: product.lowStockAt === null ? "" : String(product.lowStockAt),
      weightGrams: product.weightGrams === null ? "" : String(product.weightGrams),
      fulfilment: product.fulfilment,
      specs: Object.entries<string>(product.specs),
      specsReviewed: product.specsReviewed,
      wholesale: rupees(product.wholesalePaise),
      retail: rupees(product.retailPaise ?? (product.priceApproved ? null : product.proposedRetailPaise)),
      priceApproved: product.priceApproved,
      moq: String(product.moq),
      minOrderQty: String(product.minOrderQty),
      orderStep: String(product.orderStep),
      mrp: rupees(product.mrpPaise),
      cost: rupees(product.costPaise),
      gstRateBps: product.gstRateBps,
      hsn: product.hsn ?? "",
      photos: images,
      fits,
    }),
    [product, images, fits],
  )
  const [form, setForm] = useState(initial)
  const [error, setError] = useState<{ text: string; conflict: boolean } | null>(null)
  const [adding, setAdding] = useState("")
  const [pending, startTransition] = useTransition()
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setError(null)
  }

  useEffect(() => {
    setDirty(dirty)
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => {
      window.removeEventListener("beforeunload", warn)
    }
  }, [dirty])
  useEffect(
    () => () => {
      setDirty(false)
    },
    [],
  )

  const tiered = hasRetailTier({ moq: int(form.moq) ?? 1, minOrderQty: int(form.minOrderQty) ?? 1 })
  const issues = purchasableIssues(
    {
      status: form.status,
      maker: form.maker || null,
      makerAddress: form.makerAddress || null,
      prePackaged: form.prePackaged,
      netQuantity: form.netQuantity || null,
      mrpPaise: form.mrp.trim() ? parseRupees(form.mrp) : null,
      batteryKind: form.batteryKind,
      bisRegistration: form.bisRegistration || null,
      bisVerifiedAt: form.bisVerified ? new Date() : null,
      priceApproved: form.priceApproved,
      hsn: form.hsn || null,
    },
    ctx,
  )
  const unsorted = form.photos.filter((p) => !p.classified).length
  const unchecked = form.fits.filter((f) => !f.verified).length
  const todos: { href: string; text: string }[] = [
    ...issues.map((i) => ({ href: `#${ISSUE_SECTION[i]}`, text: ISSUES[i] })),
    ...(unsorted ? [{ href: "#photos", text: `${String(unsorted)} ${unsorted === 1 ? "photo" : "photos"} to sort` }] : []),
    ...(unchecked ? [{ href: "#vehicles", text: `${String(unchecked)} ${unchecked === 1 ? "vehicle" : "vehicles"} to check` }] : []),
  ]
  const [legalOpen, setLegalOpen] = useState(issues.some((i) => ISSUE_SECTION[i] === "legal"))
  const label = new Map(models.map((m) => [m.id, m.label]))
  const near = neighbours(order, product.id)
  const search = params.toString()
  const open = (id: number | undefined) => {
    if (id === undefined || !mayLeave()) return
    router.push(`/admin/products/${String(id)}${search ? `?${search}` : ""}` as Route)
  }
  const jump = (href: string) => {
    if (href === "#legal") setLegalOpen(true)
  }

  const movePhoto = (from: number, to: number) => {
    const next = [...form.photos]
    const [moved] = next.splice(from, 1)
    if (!moved) return
    next.splice(to, 0, moved)
    set("photos", next)
  }
  const patchPhoto = (id: number, patch: Partial<Photo>) => {
    set(
      "photos",
      form.photos.map((p) => (p.id === id ? { ...p, ...patch, classified: true } : p)),
    )
  }

  function save() {
    const wholesalePaise = parseRupees(form.wholesale)
    const moq = int(form.moq)
    const minOrderQty = int(form.minOrderQty)
    const orderStep = int(form.orderStep)
    const stock = int(form.stock)
    const retailPaise = tiered && form.retail.trim() ? parseRupees(form.retail) : null
    if (wholesalePaise === null || moq === null || minOrderQty === null || orderStep === null || (form.counted && stock === null) || (tiered && form.retail.trim() && retailPaise === null)) {
      setError({ text: "Check the price and quantity fields: whole numbers only, prices like 120 or 120.50", conflict: false })
      return
    }
    const specs: Record<string, string> = {}
    for (const [k, v] of form.specs) if (k.trim() && v.trim()) specs[k.trim()] = v.trim()
    startTransition(async () => {
      const result = await saveProduct({
        id: product.id,
        expectedUpdatedAt: product.updatedAt,
        name: form.name,
        partCode: form.partCode,
        status: form.status,
        categoryId: form.categoryId,
        bodyStyle: form.bodyStyle,
        aliases: form.aliases,
        description: form.description,
        copyReviewed: form.copyReviewed,
        prePackaged: form.prePackaged,
        maker: form.maker,
        makerAddress: form.makerAddress,
        netQuantity: form.netQuantity,
        batteryKind: form.batteryKind,
        bisRegistration: form.bisRegistration,
        bisVerified: form.bisVerified,
        counted: form.counted,
        stock: stock ?? 0,
        stockSeen: product.stock,
        stockNote: form.stockNote,
        bin: form.bin,
        lowStockAt: int(form.lowStockAt),
        weightGrams: int(form.weightGrams),
        fulfilment: form.fulfilment,
        specs,
        specsReviewed: form.specsReviewed,
        wholesalePaise,
        retailPaise,
        priceApproved: form.priceApproved,
        moq,
        minOrderQty,
        orderStep,
        mrpPaise: form.mrp.trim() ? parseRupees(form.mrp) : null,
        costPaise: form.cost.trim() ? parseRupees(form.cost) : null,
        gstRateBps: form.gstRateBps,
        hsn: form.hsn,
        photos: form.photos.map(({ id, ownPhoto, watermarked, onWhite, classified }) => ({ id, ownPhoto, watermarked, onWhite, classified })),
        removedPhotos: images.filter((i) => !form.photos.some((p) => p.id === i.id)).map((i) => i.id),
        fits: form.fits.map(({ modelId, verified }) => ({ modelId, verified })),
      })
      if (result.ok) {
        setDirty(false)
        toast(`Saved ${form.name}`)
      } else setError({ text: result.message, conflict: Boolean(result.conflict) })
    })
  }

  const cover = form.photos[0]

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-20 -mx-4 flex flex-col gap-3 border-b border-line bg-bg px-4 pt-1 pb-3 md:-mx-8 md:px-8 xl:mx-0 xl:px-0 xl:pt-6">
        <div className="flex items-center gap-1">
          <Link href={`/admin/products${search ? `?${search}` : ""}` as Route} onClick={(e) => { if (!mayLeave()) e.preventDefault() }} className="inline-flex min-h-10 items-center gap-1 pr-2 text-sm no-underline xl:hidden">
            <ChevronLeft aria-hidden size={16} /> Products
          </Link>
          <span className="ml-auto flex items-center gap-1">
            <button type="button" aria-label="Previous product" disabled={near.prev === undefined} onClick={() => { open(near.prev) }} className={`${button.icon} size-10 border border-line disabled:opacity-40`}>
              <ArrowLeft aria-hidden size={16} />
            </button>
            <button type="button" aria-label="Next product" disabled={near.next === undefined} onClick={() => { open(near.next) }} className={`${button.icon} size-10 border border-line disabled:opacity-40`}>
              <ArrowRight aria-hidden size={16} />
            </button>
            <button type="button" disabled={near.fix === undefined || near.fix === product.id} onClick={() => { open(near.fix) }} className={`${button.small} h-10`}>
              Next to fix
              <ChevronRight aria-hidden size={16} />
            </button>
          </span>
        </div>
        <div className="flex items-start gap-3">
          <div className="relative size-14 shrink-0 overflow-hidden rounded-control bg-well">{cover ? <Image src={cover.onWhite ? cover.publicId : `fill:${cover.publicId}`} alt="" fill sizes="56px" className="object-contain" /> : null}</div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="truncate text-xl">{form.name || "Untitled product"}</h1>
            <p className="truncate text-sm text-muted">
              {product.sku}
              {product.partCode ? `, code ${product.partCode}` : ""}
              {product.legacyName ? `, shop name "${product.legacyName.trim()}"` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {todos.length === 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Check aria-hidden size={16} /> Buyable online
                </span>
              ) : (
                <details className="group">
                  <summary className="inline-flex cursor-pointer items-center gap-1 font-semibold text-signal">
                    <CircleAlert aria-hidden size={16} /> {todos.length} to fix
                  </summary>
                  <ul className="mt-2 flex flex-col gap-1">
                    {todos.map((t) => (
                      <li key={t.text}>
                        <a href={t.href} onClick={() => { jump(t.href) }}>
                          {t.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {product.status === "active" ? (
                <a href={`/p/${product.slug}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1">
                  View in store <ExternalLink aria-hidden size={14} />
                </a>
              ) : null}
            </div>
          </div>
        </div>
        <nav aria-label="Sections" className="-mx-1 flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {SECTIONS.map(([id, text]) => (
            <a key={id} href={`#${id}`} onClick={() => { jump(`#${id}`) }} className="inline-flex h-9 shrink-0 items-center rounded-control px-2.5 text-sm text-muted no-underline transition-colors duration-150 ease-out [@media(hover:hover)]:hover:bg-surface [@media(hover:hover)]:hover:text-ink">
              {text}
            </a>
          ))}
        </nav>
      </header>

      <div className="flex flex-col gap-8 pt-6 pb-8">
        <Section id="overview" title="Overview">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" hint="Up to about 40 characters so it fits on a phone card" wide>
              <input className={field} value={form.name} onChange={(e) => { set("name", e.target.value) }} />
            </Field>
            <Field label="Part code">
              <input className={field} value={form.partCode} onChange={(e) => { set("partCode", e.target.value) }} />
            </Field>
            <Field label="Status">
              <select className={field} value={form.status} onChange={(e) => { set("status", e.target.value as typeof form.status) }}>
                {Object.entries(STATUS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <select className={field} value={form.categoryId} onChange={(e) => { set("categoryId", Number(e.target.value)) }}>
                {[...new Set(categories.map((c) => c.system))].map((system) => (
                  <optgroup key={system} label={system}>
                    {categories
                      .filter((c) => c.system === system)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label="Body style">
              <select className={field} value={form.bodyStyle ?? ""} onChange={(e) => { set("bodyStyle", e.target.value === "" ? null : (e.target.value as keyof typeof BODY)) }}>
                <option value="">Any</option>
                {Object.entries(BODY).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Other names customers search for" hint="Shop words, Hindi or Hinglish welcome" wide>
              <input className={field} value={form.aliases} onChange={(e) => { set("aliases", e.target.value) }} />
            </Field>
          </div>
        </Section>

        <Section id="price" title="Price" note={isOwner ? "Approve the price once retail and wholesale are right. Until then the part is not buyable online." : "Only the owner can change prices."}>
          <fieldset disabled={!isOwner} className="grid gap-4 sm:grid-cols-2">
            <Field label={tiered ? "Wholesale price, each" : "Price, each"}>
              <input className={field} inputMode="decimal" value={form.wholesale} onChange={(e) => { set("wholesale", e.target.value) }} />
            </Field>
            <Field label="Wholesale from" hint={`${product.unit}; below this the retail price applies`}>
              <input className={field} inputMode="numeric" value={form.moq} onChange={(e) => { set("moq", e.target.value) }} />
            </Field>
            {tiered ? (
              <Field label={`Retail price, 1 to ${String((int(form.moq) ?? 2) - 1)} ${product.unit}`} hint={product.proposedRetailPaise !== null ? `Suggested ${formatPaise(product.proposedRetailPaise)}` : "Leave empty to sell every quantity at the wholesale price"}>
                <input className={field} inputMode="decimal" value={form.retail} onChange={(e) => { set("retail", e.target.value) }} />
              </Field>
            ) : null}
            <Field label="Minimum order">
              <input className={field} inputMode="numeric" value={form.minOrderQty} onChange={(e) => { set("minOrderQty", e.target.value) }} />
            </Field>
            <Field label="Sold in steps of" hint="1 unless sold only in packs">
              <input className={field} inputMode="numeric" value={form.orderStep} onChange={(e) => { set("orderStep", e.target.value) }} />
            </Field>
            <Field label="Your cost" hint="Never shown to customers">
              <input className={field} inputMode="decimal" value={form.cost} onChange={(e) => { set("cost", e.target.value) }} />
            </Field>
            <label className="flex min-h-11 items-center gap-2 sm:col-span-2">
              <input type="checkbox" className="size-5 accent-(--ink)" checked={form.priceApproved} onChange={(e) => { set("priceApproved", e.target.checked) }} />
              <span className="font-semibold">Price approved for the shop</span>
            </label>
          </fieldset>
        </Section>

        <Section id="photos" title="Photos" note="Photos marked Ours are shown first on the store. The first photo is the one on cards and in search. Remove any photo that shows a different part.">
          {images.length > form.photos.length ? (
            <p className="text-sm text-signal">
              {images.length - form.photos.length} {images.length - form.photos.length === 1 ? "photo" : "photos"} will be removed when you save.
            </p>
          ) : null}
          {form.photos.length === 0 ? (
            <p className="text-sm text-muted">No photos yet.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
              {form.photos.map((p, i) => (
                <li key={p.id} className="flex min-w-0 flex-col gap-2">
                  <div className="relative aspect-square overflow-hidden rounded-container bg-well">
                    <Image src={p.onWhite ? p.publicId : `fill:${p.publicId}`} alt={`Photo ${String(i + 1)} of ${form.name}`} fill sizes="(min-width: 640px) 220px, 45vw" className="object-contain" />
                    <span className="absolute top-2 left-2 rounded-full border border-line-strong bg-surface px-2 py-0.5 text-xs font-semibold">{i === 0 ? "First" : String(i + 1)}{!p.classified ? ", unsorted" : ""}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Toggle on={p.classified && p.ownPhoto} onChange={() => { patchPhoto(p.id, { ownPhoto: true, watermarked: false }) }}>
                      Ours
                    </Toggle>
                    <Toggle on={p.classified && !p.ownPhoto} onChange={() => { patchPhoto(p.id, { ownPhoto: false }) }}>
                      Not ours
                    </Toggle>
                  </div>
                  <label className="flex min-h-9 items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4 accent-(--ink)" checked={p.watermarked} onChange={(e) => { patchPhoto(p.id, { watermarked: e.target.checked, ownPhoto: e.target.checked ? false : p.ownPhoto }) }} />
                    Another seller&apos;s watermark
                  </label>
                  <label className="flex min-h-9 items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4 accent-(--ink)" checked={!p.onWhite} onChange={(e) => { set("photos", form.photos.map((x) => (x.id === p.id ? { ...x, onWhite: !e.target.checked } : x))) }} />
                    Background not white
                  </label>
                  <div className="flex gap-1.5">
                    <button type="button" aria-label="Move photo earlier" disabled={i === 0} onClick={() => { movePhoto(i, i - 1) }} className={`${button.small} h-9 w-9 px-0`}>
                      <ArrowLeft aria-hidden size={14} />
                    </button>
                    <button type="button" aria-label="Move photo later" disabled={i === form.photos.length - 1} onClick={() => { movePhoto(i, i + 1) }} className={`${button.small} h-9 w-9 px-0`}>
                      <ArrowRight aria-hidden size={14} />
                    </button>
                    {i > 0 ? (
                      <button type="button" onClick={() => { movePhoto(i, 0) }} className={`${button.small} h-9 flex-1`}>
                        <Star aria-hidden size={14} /> Make first
                      </button>
                    ) : null}
                    <button type="button" aria-label={`Remove photo ${String(i + 1)} from this product`} onClick={() => { set("photos", form.photos.filter((x) => x.id !== p.id)) }} className={`${button.small} ml-auto h-9 w-9 px-0`}>
                      <Trash2 aria-hidden size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section id="vehicles" title="Vehicles" note="Tags from research show as “Sold for” on the store. Mark Fits once you are sure.">
          {form.fits.length ? (
            <ul className="flex flex-col gap-2">
              {form.fits.map((f) => (
                <li key={f.modelId} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-line px-3 py-2">
                  <span className="font-medium">{label.get(f.modelId) ?? `Model ${String(f.modelId)}`}</span>
                  <span className={`text-xs ${f.verified ? "" : "text-signal"}`}>{f.verified ? "Fits" : "Sold for, to check"}</span>
                  <span className="ml-auto flex gap-1.5">
                    {f.verified ? null : (
                      <button type="button" onClick={() => { set("fits", form.fits.map((x) => (x.modelId === f.modelId ? { ...x, verified: true } : x))) }} className={`${button.small} h-9`}>
                        <Check aria-hidden size={14} /> Fits
                      </button>
                    )}
                    <button type="button" aria-label={`Remove ${label.get(f.modelId) ?? "vehicle"}`} onClick={() => { set("fits", form.fits.filter((x) => x.modelId !== f.modelId)) }} className={`${button.small} h-9`}>
                      <X aria-hidden size={14} /> Remove
                    </button>
                  </span>
                  {f.source ? (
                    <span className="basis-full text-xs text-muted">
                      <Source text={f.source} />
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No vehicles tagged. Generic parts can stay untagged.</p>
          )}
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="add-vehicle">
              Add a vehicle
            </label>
            <select id="add-vehicle" value={adding} onChange={(e) => { setAdding(e.currentTarget.value) }} className={`${field} flex-1`}>
              <option value="">Add a vehicle it fits</option>
              {models
                .filter((m) => !form.fits.some((f) => f.modelId === m.id))
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!adding}
              onClick={() => {
                set("fits", [...form.fits, { modelId: Number(adding), verified: true, source: "Added by staff" }])
                setAdding("")
              }}
              className={button.secondary}
            >
              <Plus aria-hidden size={16} /> Add
            </button>
          </div>
        </Section>

        <Section id="stock" title="Stock" note="Not counted means it sells, and staff check the shelf before confirming each order.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Toggle on={!form.counted} onChange={() => { set("counted", false) }}>
                Not counted
              </Toggle>
              <Toggle on={form.counted} onChange={() => { set("counted", true) }}>
                Counted
              </Toggle>
              <button type="button" className={`${button.small} h-10`} onClick={() => { setForm((f) => ({ ...f, counted: true, stock: "0" })) }}>
                Mark out of stock
              </button>
            </div>
            {form.counted ? (
              <Field label="On the shelf now" hint={form.stock === "0" ? "Shows as out of stock" : undefined}>
                <input className={field} inputMode="numeric" value={form.stock} onChange={(e) => { set("stock", e.target.value) }} />
              </Field>
            ) : null}
            {form.counted !== initial.counted || form.stock !== initial.stock ? (
              <Field label="Why it changed" hint={product.stock !== null ? "Required when changing a counted number" : undefined}>
                <input className={field} value={form.stockNote} onChange={(e) => { set("stockNote", e.target.value) }} placeholder="Recounted, damaged, found in back room" />
              </Field>
            ) : null}
            <Field label="Bin or shelf">
              <input className={field} value={form.bin} onChange={(e) => { set("bin", e.target.value) }} />
            </Field>
            <Field label="Warn when stock is at or below">
              <input className={field} inputMode="numeric" value={form.lowStockAt} onChange={(e) => { set("lowStockAt", e.target.value) }} />
            </Field>
          </div>
        </Section>

        <Section id="specs" title="Specs and description" note="Shown on the store once marked checked against the real part.">
          <ul className="flex flex-col gap-2">
            {form.specs.map(([k, v], i) => (
              <li key={i} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-2">
                <input aria-label="Spec name" className={field} value={k} onChange={(e) => { set("specs", form.specs.map((s, j) => (j === i ? [e.target.value, s[1]] : s))) }} />
                <input aria-label="Spec value" className={field} value={v} onChange={(e) => { set("specs", form.specs.map((s, j) => (j === i ? [s[0], e.target.value] : s))) }} />
                <button type="button" aria-label={`Remove ${k || "spec"}`} className={`${button.small} h-11 w-11 px-0`} onClick={() => { set("specs", form.specs.filter((_, j) => j !== i)) }}>
                  <Trash2 aria-hidden size={16} />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" className={button.small} onClick={() => { set("specs", [...form.specs, ["", ""]]) }}>
              <Plus aria-hidden size={16} /> Add spec
            </button>
            <label className="flex min-h-11 items-center gap-2">
              <input type="checkbox" className="size-5 accent-(--ink)" checked={form.specsReviewed} onChange={(e) => { set("specsReviewed", e.target.checked) }} />
              Specs checked
            </label>
          </div>
          <Field label="Description">
            <textarea className={`${field} h-32 py-2 leading-relaxed`} value={form.description} onChange={(e) => { set("description", e.target.value) }} />
          </Field>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" className="size-5 accent-(--ink)" checked={form.copyReviewed} onChange={(e) => { set("copyReviewed", e.target.checked) }} />
            Description checked
          </label>
        </Section>

        <details
          id="legal"
          open={legalOpen}
          onToggle={(e) => {
            setLegalOpen(e.currentTarget.open)
          }}
          className="group scroll-mt-44 border-t border-line pt-5"
        >
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
            <h2 className="text-lg">Tax, shipping and legal</h2>
            <ChevronRight aria-hidden size={18} className="transition-transform duration-200 ease-out group-open:rotate-90" />
          </summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <fieldset className="flex flex-col gap-2 sm:col-span-2">
              <legend className="mb-1.5 text-sm font-semibold">Sold in its own sealed packet?</legend>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    [null, "Not decided"],
                    [false, "Loose"],
                    [true, "Pre-packaged"],
                  ] as const
                ).map(([v, l]) => (
                  <Toggle key={l} on={form.prePackaged === v} onChange={() => { set("prePackaged", v) }}>
                    {l}
                  </Toggle>
                ))}
              </div>
            </fieldset>
            <Field label="Maker name">
              <input className={field} value={form.maker} onChange={(e) => { set("maker", e.target.value) }} />
            </Field>
            <Field label="Maker address">
              <input className={field} value={form.makerAddress} onChange={(e) => { set("makerAddress", e.target.value) }} />
            </Field>
            {form.prePackaged === true ? (
              <Field label="Net quantity" hint="As printed, for example 1 N or 100 pcs">
                <input className={field} value={form.netQuantity} onChange={(e) => { set("netQuantity", e.target.value) }} />
              </Field>
            ) : null}
            <Field label="Battery">
              <select className={field} value={form.batteryKind} onChange={(e) => { set("batteryKind", e.target.value as typeof form.batteryKind) }}>
                {Object.entries(BATTERY).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            {form.batteryKind === "cell" ? (
              <>
                <Field label="BIS registration number" hint="R-number from the cell packet">
                  <input className={field} value={form.bisRegistration} onChange={(e) => { set("bisRegistration", e.target.value) }} />
                </Field>
                <label className="flex min-h-11 items-center gap-2 self-end">
                  <input type="checkbox" className="size-5 accent-(--ink)" checked={form.bisVerified} onChange={(e) => { set("bisVerified", e.target.checked) }} />
                  Checked on the BIS portal
                </label>
              </>
            ) : null}
            <Field label="Weight in grams, packed">
              <input className={field} inputMode="numeric" value={form.weightGrams} onChange={(e) => { set("weightGrams", e.target.value) }} />
            </Field>
            <Field label="Delivery" hint={form.batteryKind !== "none" ? "Batteries are always pickup or freight" : undefined}>
              <select className={field} value={form.batteryKind !== "none" ? "pickup_or_freight" : form.fulfilment} disabled={form.batteryKind !== "none"} onChange={(e) => { set("fulfilment", e.target.value as typeof form.fulfilment) }}>
                {Object.entries(FULFIL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <fieldset disabled={!isOwner} className="contents">
              <Field label="MRP incl. taxes" hint="Needed for pre-packaged goods">
                <input className={field} inputMode="decimal" value={form.mrp} onChange={(e) => { set("mrp", e.target.value) }} />
              </Field>
              <Field label="GST rate">
                <select className={field} value={form.gstRateBps} onChange={(e) => { set("gstRateBps", Number(e.target.value)) }}>
                  {[0, 500, 1800, 4000].map((r) => (
                    <option key={r} value={r}>
                      {r / 100}%
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="HSN code">
                <input className={field} inputMode="numeric" value={form.hsn} onChange={(e) => { set("hsn", e.target.value) }} />
              </Field>
            </fieldset>
          </div>
        </details>

        <Section id="history" title="History">
          {history.length === 0 ? (
            <p className="text-sm text-muted">No changes recorded yet.</p>
          ) : (
            <ol className="flex flex-col gap-3 text-sm">
              {history.map((h) => (
                <li key={h.id} className="flex flex-col gap-0.5">
                  <span className="text-muted">
                    {new Date(h.at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}, {h.who}
                  </span>
                  <span>
                    {Object.entries(h.diff)
                      .slice(0, 6)
                      .map(([k, [a, b]]) => (k.startsWith("vehicle:") ? `${label.get(Number(k.slice(8))) ?? "vehicle"}: ${shown(k, a)} to ${shown(k, b)}` : `${KEY_LABEL[k] ?? k}: ${shown(k, a)} to ${shown(k, b)}`))
                      .join("; ")}
                    {Object.keys(h.diff).length > 6 ? `; and ${String(Object.keys(h.diff).length - 6)} more` : ""}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </div>

      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-line bg-surface px-4 py-3 md:bottom-0 md:-mx-8 md:px-8 xl:mx-0 xl:rounded-t-container xl:border-x xl:px-4">
        <div className="flex items-center gap-3">
          <p aria-live="polite" className={`min-w-0 flex-1 text-sm ${error ? "text-danger" : "text-muted"}`}>
            {error ? error.text : dirty ? "Unsaved changes" : "All changes saved"}
          </p>
          {error?.conflict ? (
            <button type="button" className={button.secondary} onClick={() => { setDirty(false); router.refresh() }}>
              Reload
            </button>
          ) : (
            <button type="button" className={button.secondary} disabled={!dirty || pending} onClick={() => { setForm(initial); setError(null) }}>
              Discard
            </button>
          )}
          <button type="button" className={button.primary} disabled={!dirty || pending} onClick={save}>
            {pending ? "Saving" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  )
}

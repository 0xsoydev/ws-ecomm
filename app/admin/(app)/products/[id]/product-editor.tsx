"use client"

import { Check, ChevronLeft, CircleAlert, Plus, Trash2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react"
import { ISSUES, purchasableIssues, type PurchasableContext } from "@/lib/catalog"
import { formatPaise, parseRupees } from "@/lib/format"
import type { batteryKind, bodyStyle, fulfilment, products, productStatus } from "@/lib/schema"
import { button, field } from "@/lib/ui"
import { saveProduct } from "./actions"

type Product = Omit<typeof products.$inferSelect, "bisVerifiedAt" | "specs"> & { bisVerifiedAt: string | null; specs: Record<string, string> }
type Category = { id: number; name: string; system: string }
type Photo = { id: number; publicId: string; ownPhoto: boolean; classified: boolean; onWhite: boolean }

const rupees = (paise: number | null) => (paise === null ? "" : paise % 100 ? (paise / 100).toFixed(2) : String(paise / 100))
const int = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null)

const STATUS: Record<(typeof productStatus.enumValues)[number], string> = { active: "Active", draft: "Draft", archived: "Archived" }
const BODY: Record<(typeof bodyStyle.enumValues)[number], string> = { dl_model: "DL model", sl_model: "SL model", loader: "Loader / e-rickshaw", three_wheeler: "3-wheeler" }
const BATTERY: Record<(typeof batteryKind.enumValues)[number], string> = { none: "Not a battery", cell: "Lithium cell", pack: "Battery pack" }
const FULFIL: Record<(typeof fulfilment.enumValues)[number], string> = { courier: "Courier allowed", pickup_or_freight: "Pickup or freight only" }

function Section({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg">{title}</h2>
        {note && <p className="max-w-[60ch] text-sm text-muted">{note}</p>}
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
      {hint && <span className="text-sm text-muted">{hint}</span>}
    </div>
  )
}

export function ProductEditor({ product, categories, images, ctx, isOwner }: { product: Product; categories: Category[]; images: Photo[]; ctx: PurchasableContext; isOwner: boolean }) {
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
      moq: String(product.moq),
      minOrderQty: String(product.minOrderQty),
      orderStep: String(product.orderStep),
      mrp: rupees(product.mrpPaise),
      cost: rupees(product.costPaise),
      gstRateBps: product.gstRateBps,
      hsn: product.hsn ?? "",
    }),
    [product],
  )
  const [form, setForm] = useState(initial)
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setMessage(null)
  }

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener("beforeunload", warn)
    return () => { window.removeEventListener("beforeunload", warn) }
  }, [dirty])

  const mrpPaise = form.mrp.trim() ? parseRupees(form.mrp) : null
  const issues = purchasableIssues(
    {
      status: form.status,
      maker: form.maker || null,
      makerAddress: form.makerAddress || null,
      prePackaged: form.prePackaged,
      netQuantity: form.netQuantity || null,
      mrpPaise,
      batteryKind: form.batteryKind,
      bisRegistration: form.bisRegistration || null,
      bisVerifiedAt: form.bisVerified ? new Date() : null,
      priceApproved: product.priceApproved,
      hsn: form.hsn || null,
    },
    ctx,
  )

  function save() {
    const wholesalePaise = parseRupees(form.wholesale)
    const moq = int(form.moq)
    const minOrderQty = int(form.minOrderQty)
    const orderStep = int(form.orderStep)
    const stock = int(form.stock)
    if (wholesalePaise === null || moq === null || minOrderQty === null || orderStep === null || (form.counted && stock === null)) {
      setMessage({ tone: "error", text: "Check the price and quantity fields: whole numbers only, prices like 120 or 120.50" })
      return
    }
    const specs: Record<string, string> = {}
    for (const [k, v] of form.specs) if (k.trim() && v.trim()) specs[k.trim()] = v.trim()
    startTransition(async () => {
      const result = await saveProduct({
        id: product.id,
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
        stockNote: form.stockNote,
        bin: form.bin,
        lowStockAt: int(form.lowStockAt),
        weightGrams: int(form.weightGrams),
        fulfilment: form.fulfilment,
        specs,
        specsReviewed: form.specsReviewed,
        wholesalePaise,
        moq,
        minOrderQty,
        orderStep,
        mrpPaise,
        costPaise: form.cost.trim() ? parseRupees(form.cost) : null,
        gstRateBps: form.gstRateBps,
        hsn: form.hsn,
      })
      setMessage(result.ok ? { tone: "ok", text: "Saved" } : { tone: "error", text: result.message })
      if (result.ok) setForm((f) => ({ ...f, stockNote: "" }))
    })
  }

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6 pb-24">
      <div className="flex flex-col gap-2">
        <Link href="/admin/products" className="inline-flex items-center gap-1 self-start text-sm">
          <ChevronLeft aria-hidden size={16} /> Products
        </Link>
        <h1 className="text-2xl">{form.name || "Untitled product"}</h1>
        <p className="text-sm text-muted">
          {product.sku}
          {product.legacyName ? `, old name "${product.legacyName.trim()}"` : ""}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-8">
          <Section title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" wide>
                <input className={field} value={form.name} onChange={(e) => { set("name", e.target.value) }} />
              </Field>
              <Field label="Part code" hint="Shown large on the product page">
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
              <Field label="Other names customers use" hint="Comma separated, Hindi or Hinglish welcome" wide>
                <input className={field} value={form.aliases} onChange={(e) => { set("aliases", e.target.value) }} />
              </Field>
              <Field label="Description" hint="Not shown on the store until it is marked reviewed" wide>
                <textarea className={`${field} h-36 py-2 leading-relaxed`} value={form.description} onChange={(e) => { set("description", e.target.value) }} />
              </Field>
              <label className="flex min-h-11 items-center gap-2 sm:col-span-2">
                <input type="checkbox" className="size-5 accent-[var(--ink)]" checked={form.copyReviewed} onChange={(e) => { set("copyReviewed", e.target.checked) }} />
                Description checked against the real part
              </label>
            </div>
          </Section>

          <Section title="Legal details" note="Needed before the product can be bought online. Copy them from the supplier invoice or the packet.">
            <div className="grid gap-4 sm:grid-cols-2">
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
                    <label key={l} className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-control border px-3 transition-colors duration-200 ease-out ${form.prePackaged === v ? "border-ink bg-surface font-semibold" : "border-line-strong"}`}>
                      <input type="radio" name="prePackaged" className="accent-[var(--ink)]" checked={form.prePackaged === v} onChange={() => { set("prePackaged", v) }} />
                      {l}
                    </label>
                  ))}
                </div>
                <span className="text-sm text-muted">Your CA decides this. Until then the product stays display-only.</span>
              </fieldset>
              <Field label="Maker name">
                <input className={field} value={form.maker} onChange={(e) => { set("maker", e.target.value) }} />
              </Field>
              <Field label="Maker address" wide>
                <input className={field} value={form.makerAddress} onChange={(e) => { set("makerAddress", e.target.value) }} />
              </Field>
              {form.prePackaged === true && (
                <Field label="Net quantity" hint="As printed, for example 1 N or 100 pcs">
                  <input className={field} value={form.netQuantity} onChange={(e) => { set("netQuantity", e.target.value) }} />
                </Field>
              )}
              <Field label="Battery">
                <select className={field} value={form.batteryKind} onChange={(e) => { set("batteryKind", e.target.value as typeof form.batteryKind) }}>
                  {Object.entries(BATTERY).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              {form.batteryKind === "cell" && (
                <>
                  <Field label="BIS registration number" hint="R-number from the cell packet">
                    <input className={field} value={form.bisRegistration} onChange={(e) => { set("bisRegistration", e.target.value) }} />
                  </Field>
                  <label className="flex min-h-11 items-center gap-2 self-end">
                    <input type="checkbox" className="size-5 accent-[var(--ink)]" checked={form.bisVerified} onChange={(e) => { set("bisVerified", e.target.checked) }} />
                    Checked on the BIS portal for this brand and model
                  </label>
                </>
              )}
            </div>
          </Section>

          <Section title="Stock" note="Not counted means it sells, and staff check the shelf before confirming each order.">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                {(
                  [
                    [false, "Not counted"],
                    [true, "Counted"],
                  ] as const
                ).map(([v, l]) => (
                  <label key={l} className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-control border px-3 transition-colors duration-200 ease-out ${form.counted === v ? "border-ink bg-surface font-semibold" : "border-line-strong"}`}>
                    <input type="radio" name="counted" className="accent-[var(--ink)]" checked={form.counted === v} onChange={() => { set("counted", v) }} />
                    {l}
                  </label>
                ))}
                <button type="button" className={button.small} onClick={() => { setForm((f) => ({ ...f, counted: true, stock: "0" })) }}>
                  Mark out of stock
                </button>
              </div>
              {form.counted && (
                <Field label="On the shelf now" hint={form.stock === "0" ? "Shows as out of stock" : undefined}>
                  <input className={field} inputMode="numeric" value={form.stock} onChange={(e) => { set("stock", e.target.value) }} />
                </Field>
              )}
              {(form.counted !== initial.counted || form.stock !== initial.stock) && (
                <Field label="Why it changed" hint={product.stock !== null ? "Required when changing a counted number" : undefined}>
                  <input className={field} value={form.stockNote} onChange={(e) => { set("stockNote", e.target.value) }} placeholder="Recounted, damaged, found in back room" />
                </Field>
              )}
              <Field label="Bin or shelf">
                <input className={field} value={form.bin} onChange={(e) => { set("bin", e.target.value) }} />
              </Field>
              <Field label="Warn when stock is at or below">
                <input className={field} inputMode="numeric" value={form.lowStockAt} onChange={(e) => { set("lowStockAt", e.target.value) }} />
              </Field>
            </div>
          </Section>

          <Section title="Price and tax" note={isOwner ? "Retail prices are approved on the Prices screen." : "Only the owner can change these."}>
            <fieldset disabled={!isOwner} className="grid gap-4 sm:grid-cols-2">
              <Field label="Wholesale price, each">
                <input className={field} inputMode="decimal" value={form.wholesale} onChange={(e) => { set("wholesale", e.target.value) }} />
              </Field>
              <Field label="Wholesale from" hint={`${product.unit}; below this the retail price applies`}>
                <input className={field} inputMode="numeric" value={form.moq} onChange={(e) => { set("moq", e.target.value) }} />
              </Field>
              <Field label="Minimum order">
                <input className={field} inputMode="numeric" value={form.minOrderQty} onChange={(e) => { set("minOrderQty", e.target.value) }} />
              </Field>
              <Field label="Sold in steps of" hint="1 unless sold only in packs">
                <input className={field} inputMode="numeric" value={form.orderStep} onChange={(e) => { set("orderStep", e.target.value) }} />
              </Field>
              <Field label="MRP incl. taxes" hint="Needed for pre-packaged goods">
                <input className={field} inputMode="decimal" value={form.mrp} onChange={(e) => { set("mrp", e.target.value) }} />
              </Field>
              <Field label="Your cost" hint="Never shown to customers">
                <input className={field} inputMode="decimal" value={form.cost} onChange={(e) => { set("cost", e.target.value) }} />
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
              <p className="text-sm text-muted sm:col-span-2">
                Retail: {product.retailPaise === null ? "none, one price" : formatPaise(product.retailPaise)}
                {product.priceApproved ? ", approved" : ", not approved yet"}.
              </p>
            </fieldset>
          </Section>

          <Section title="Specs" note="Not shown on the store until checked against the real part.">
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
                <input type="checkbox" className="size-5 accent-[var(--ink)]" checked={form.specsReviewed} onChange={(e) => { set("specsReviewed", e.target.checked) }} />
                Specs checked against the real part
              </label>
            </div>
          </Section>

          <Section title="Shipping">
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
          </Section>
        </div>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-8 lg:self-start">
          <section className="flex flex-col gap-3 rounded-container bg-surface p-4">
            <h2 className="text-lg">{issues.length === 0 ? "Buyable online" : "Not buyable online yet"}</h2>
            {issues.length === 0 ? (
              <p className="flex items-center gap-2 text-sm">
                <Check aria-hidden size={16} /> Every legal and price check passes.
              </p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {issues.map((issue) => (
                  <li key={issue} className="flex items-start gap-2">
                    <CircleAlert aria-hidden size={16} className="mt-0.5 shrink-0 text-signal" />
                    {ISSUES[issue]}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg">Photos</h2>
              <Link href="/admin/photos" className="text-sm">
                Sort photos
              </Link>
            </div>
            {images.length === 0 ? (
              <p className="text-sm text-muted">No photos yet.</p>
            ) : (
              <ul className="grid grid-cols-3 gap-2">
                {images.map((img) => (
                  <li key={img.id} className="relative aspect-square overflow-hidden rounded-control bg-well">
                    <Image src={img.onWhite ? img.publicId : `fill:${img.publicId}`} alt="" fill sizes="100px" className="object-contain" />
                    <span className="absolute inset-x-1 bottom-1 truncate rounded-sm bg-surface px-1 text-center text-xs">{!img.classified ? "Unsorted" : img.ownPhoto ? "Ours" : "Not ours"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-surface px-4 py-3 md:bottom-0 md:left-56 md:px-8">
        <div className="mx-auto flex max-w-[1100px] items-center gap-3">
          <p aria-live="polite" className={`min-w-0 flex-1 text-sm ${message?.tone === "error" ? "text-danger" : "text-muted"}`}>
            {message?.text ?? (dirty ? "Unsaved changes" : "No changes")}
          </p>
          <button type="button" className={button.secondary} disabled={!dirty || pending} onClick={() => { setForm(initial); setMessage(null) }}>
            Discard
          </button>
          <button type="button" className={button.primary} disabled={!dirty || pending} onClick={save}>
            {pending ? "Saving" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  )
}

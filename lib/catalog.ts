import type { products } from "./schema"

type Product = Pick<
  typeof products.$inferSelect,
  | "status"
  | "maker"
  | "makerAddress"
  | "prePackaged"
  | "netQuantity"
  | "mrpPaise"
  | "batteryKind"
  | "bisRegistration"
  | "bisVerifiedAt"
  | "priceApproved"
  | "hsn"
>

export type PurchasableContext = { collectsTax: boolean; eprRegistration: string | null; packStandard: string | null }

export const ISSUES = {
  inactive: "Not active",
  price: "Price not approved",
  prePackaged: "Pre-packaged or loose not decided",
  netQuantity: "Net quantity missing",
  mrp: "MRP missing",
  maker: "Maker name and address missing",
  bis: "BIS registration not verified",
  epr: "EPR registration or pack certification missing",
  hsn: "HSN code missing",
} as const
export type Issue = keyof typeof ISSUES


export function purchasableIssues(p: Product, ctx: PurchasableContext): Issue[] {
  const issues: Issue[] = []
  const hasMaker = Boolean(p.maker?.trim()) && Boolean(p.makerAddress?.trim())
  if (p.status !== "active") issues.push("inactive")
  if (!p.priceApproved) issues.push("price")
  if (p.prePackaged === null) issues.push("prePackaged")
  if (p.prePackaged === true) {
    if (!p.netQuantity?.trim()) issues.push("netQuantity")
    if (p.mrpPaise === null) issues.push("mrp")
    if (!hasMaker) issues.push("maker")
  }
  if (p.batteryKind === "cell" && (!p.bisRegistration?.trim() || p.bisVerifiedAt === null)) issues.push("bis")
  if (p.batteryKind === "pack" && (!ctx.eprRegistration || !ctx.packStandard)) issues.push("epr")
  if (ctx.collectsTax && !p.hsn) issues.push("hsn")
  return issues
}

export function isPurchasable(p: Product, ctx: PurchasableContext) {
  return purchasableIssues(p, ctx).length === 0
}

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
const rupeesPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatPaise(paise: number) {
  return paise % 100 === 0 ? rupees.format(paise / 100) : rupeesPaise.format(paise / 100)
}

export function parseRupees(input: string) {
  const clean = input.replace(/[₹,\s]/g, "")
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null
  return Math.round(Number(clean) * 100)
}

const plurals: Record<string, string> = { pcs: "pcs", set: "sets", pair: "pairs", box: "boxes", pkg: "packs", unit: "units" }
const singulars: Record<string, string> = { pcs: "pc", pkg: "pack" }

export function unitWord(unit: string, qty: number) {
  return qty === 1 ? (singulars[unit] ?? unit) : (plurals[unit] ?? unit)
}

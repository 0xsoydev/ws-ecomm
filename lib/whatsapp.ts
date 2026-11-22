import { BUSINESS } from "./business"
import { formatPaise, unitWord } from "./format"

export function waLink(text: string) {
  return `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(text)}`
}

export const telLink = `tel:${BUSINESS.phone.replace(/\s/g, "")}`

function label(code: string | null, name: string) {
  return code ? `${code} (${name})` : name
}

export function askAboutPart(code: string | null, name: string, url: string) {
  return `Hi, is ${label(code, name)} available? ${url}`
}

export function askForPhoto(code: string | null, name: string, url: string) {
  return `Please send a live photo of ${code ?? name}. ${url}`
}

export function photoHelp(vehicle: string | null) {
  return `Hi, I need a part for my ${vehicle ?? "scooter"}. Sending a photo.`
}

export function bookService(service: string, vehicle: string | null) {
  return `Hi, I want to book ${service} for my ${vehicle ?? "scooter"}.`
}

export type ListLine = { code: string | null; name: string; qty: number; unit: string; unitPaise: number; wholesale: boolean }

export function partsList(lines: readonly ListLine[], scope: string) {
  const rows = lines.map((l) => `${l.qty} ${unitWord(l.unit, l.qty)} ${label(l.code, l.name)}, ${formatPaise(l.unitPaise)} each${l.wholesale ? ", wholesale" : ""} = ${formatPaise(l.unitPaise * l.qty)}`)
  const total = lines.reduce((sum, l) => sum + l.unitPaise * l.qty, 0)
  return ["Parts list", ...rows, `Items ${formatPaise(total)}`, scope].join("\n")
}

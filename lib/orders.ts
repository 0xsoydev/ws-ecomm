import { formatPaise, unitWord } from "./format"
import type { orderStage } from "./schema"

export type Stage = (typeof orderStage.enumValues)[number]

export const next: Record<Stage, readonly Stage[]> = {
  requested: ["confirmed", "cancelled"],
  pending_payment: ["confirmed", "cancelled"],
  cod_pending_confirmation: ["confirmed", "cancelled"],
  quote_pending: ["pending_payment", "confirmed", "cancelled"],
  confirmed: ["packed", "ready_for_pickup", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered", "rto_in_transit"],
  rto_in_transit: ["rto_received"],
  ready_for_pickup: ["picked_up", "cancelled"],
  delivered: [],
  rto_received: [],
  picked_up: [],
  cancelled: [],
}

export const STAGE_LABEL: Record<Stage, string> = {
  requested: "Waiting for us to confirm",
  pending_payment: "Waiting for payment",
  cod_pending_confirmation: "Waiting for us to confirm",
  quote_pending: "Waiting for us to confirm the delivery charge",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  rto_in_transit: "Returning to us",
  rto_received: "Returned to us",
  ready_for_pickup: "Ready for pickup",
  delivered: "Delivered",
  picked_up: "Picked up",
  cancelled: "Cancelled",
}

export function orderNumber(id: number) {
  return `WS${String(id)}`
}

export function orderId(number: string) {
  const m = /^WS(\d{5,9})$/i.exec(number)
  return m?.[1] ? Number(m[1]) : null
}

export function isMaharashtraPincode(pin: string) {
  return /^4[0-4]\d{4}$/.test(pin)
}

export type MessageLine = { name: string; code: string | null; qty: number; unit: string; unitPaise: number; tier: "retail" | "wholesale"; hasRetail: boolean }

export function orderMessage(o: { number: string; lines: readonly MessageLine[]; itemsPaise: number; chargesPaise: number; deliveryPending: boolean; name: string; delivery: "pickup" | "ship"; pincode: string | null; link: string }) {
  const rows = o.lines.map((l) => `${String(l.qty)} ${unitWord(l.unit, l.qty)} ${l.name}${l.code && !l.name.includes(l.code) ? ` (${l.code})` : ""}, ${formatPaise(l.unitPaise)} / ${unitWord(l.unit, 1)}${l.hasRetail && l.tier === "wholesale" ? ", wholesale" : ""} = ${formatPaise(l.unitPaise * l.qty)}`)
  const totals = o.deliveryPending ? `Items ${formatPaise(o.itemsPaise)}, delivery charge to be confirmed` : `Items ${formatPaise(o.itemsPaise)}${o.chargesPaise ? `, delivery ${formatPaise(o.chargesPaise)}` : ""}, total ${formatPaise(o.itemsPaise + o.chargesPaise)}`
  const who = o.delivery === "pickup" ? `${o.name}, pickup at the shop` : `${o.name}, courier to ${o.pincode ?? ""}`
  return [`Order ${o.number}`, ...rows, totals, who, `Link: ${o.link}`].join("\n")
}

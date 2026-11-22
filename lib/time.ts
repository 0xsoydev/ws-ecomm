export function todayInIndia(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
}

export type Hours = { opens: string; closes: string } | null
export type SpecialDay = { day: string; hours: Hours; note: string }
export type StoreStatus = { tone: "open" | "closing" | "closed"; text: string }

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const
const IST_OFFSET_MS = 330 * 60000

function minutes(hhmm: string) {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
}

export function clock(hhmm: string) {
  const total = minutes(hhmm)
  const h = Math.floor(total / 60)
  const m = total % 60
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}${m === 0 ? "" : `:${String(m).padStart(2, "0")}`} ${h < 12 ? "am" : "pm"}`
}

export function storeStatus(now: Date, weekly: readonly Hours[], special: readonly SpecialDay[]): StoreStatus {
  const ist = new Date(now.getTime() + IST_OFFSET_MS)
  const dayStart = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate())
  const at = (offset: number) => {
    const d = new Date(dayStart + offset * 86400000)
    const date = d.toISOString().slice(0, 10)
    const override = special.find((s) => s.day === date)
    return { index: (d.getUTCDay() + 6) % 7, hours: override ? override.hours : (weekly[(d.getUTCDay() + 6) % 7] ?? null), note: override?.note ?? "" }
  }
  const today = at(0)
  const nowMin = ist.getUTCHours() * 60 + ist.getUTCMinutes()
  const withNote = (s: StoreStatus): StoreStatus => (today.note ? { ...s, text: `${s.text}. ${today.note}` } : s)
  const h = today.hours
  if (h && nowMin < minutes(h.opens)) return withNote({ tone: "closed", text: `Closed, opens ${clock(h.opens)}` })
  if (h && nowMin < minutes(h.closes)) {
    return withNote(minutes(h.closes) - nowMin <= 30 ? { tone: "closing", text: `Closes soon, at ${clock(h.closes)}` } : { tone: "open", text: `Open now, closes ${clock(h.closes)}` })
  }
  const lead = h === null ? "Closed today" : "Closed"
  for (let offset = 1; offset <= 7; offset++) {
    const next = at(offset)
    if (!next.hours) continue
    return withNote({ tone: "closed", text: offset === 1 ? `${lead}, opens ${clock(next.hours.opens)} tomorrow` : `${lead}, opens ${DAY_NAMES[next.index] ?? ""} ${clock(next.hours.opens)}` })
  }
  return withNote({ tone: "closed", text: lead })
}

export function hoursSummary(weekly: readonly Hours[]) {
  const first = weekly[0]
  if (first && weekly.length === 7 && weekly.every((h) => h?.opens === first.opens && h.closes === first.closes)) return `Open every day, ${clock(first.opens)} to ${clock(first.closes)}`
  return weekly.map((h, i) => `${DAY_NAMES[i] ?? ""} ${h ? `${clock(h.opens)} to ${clock(h.closes)}` : "closed"}`).join(", ")
}

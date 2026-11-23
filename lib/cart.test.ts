import { beforeEach, expect, test, vi } from "vitest"

const store = new Map<string, string>()

beforeEach(() => {
  store.clear()
  vi.resetModules()
  vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) })
  vi.stubGlobal("window", new EventTarget())
})

const cart = () => import("./cart")

test("quantities are set, replaced and removed, and saved", async () => {
  const { setQty, qtyOf } = await cart()
  setQty(1, 2)
  setQty(2, 5)
  setQty(1, 3)
  expect(qtyOf(1)).toBe(3)
  setQty(2, 0)
  expect(qtyOf(2)).toBe(0)
  expect(JSON.parse(store.get("ws-cart-v1") ?? "")).toEqual([{ id: 1, qty: 3 }])
})

test("clearing returns the old lines so Undo can restore them", async () => {
  const { setQty, clearCart, restoreCart, qtyOf } = await cart()
  setQty(4, 10)
  const previous = clearCart()
  expect(qtyOf(4)).toBe(0)
  restoreCart(previous)
  expect(qtyOf(4)).toBe(10)
})

test("tampered or broken storage is ignored", async () => {
  for (const bad of ["not json", JSON.stringify([{ id: 1, qty: -2 }]), JSON.stringify([{ id: "x", qty: 1 }]), JSON.stringify(Array.from({ length: 101 }, (_, i) => ({ id: i + 1, qty: 1 })))]) {
    store.set("ws-cart-v1", bad)
    vi.resetModules()
    const { qtyOf } = await cart()
    expect(qtyOf(1)).toBe(0)
  }
})

test("a clear made by checkout is marked quiet so the cart offers no Undo", async () => {
  const { setQty, clearCart, lastChangeWasQuiet } = await cart()
  setQty(1, 1)
  expect(lastChangeWasQuiet()).toBe(false)
  clearCart(true)
  expect(lastChangeWasQuiet()).toBe(true)
  setQty(2, 1)
  expect(lastChangeWasQuiet()).toBe(false)
})

import { sql } from "drizzle-orm"
import { bigint, boolean, check, date, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { z } from "zod"
import { user } from "./auth-schema"

export const productStatus = pgEnum("product_status", ["draft", "active", "archived"])
export const fulfilment = pgEnum("fulfilment", ["courier", "pickup_or_freight"])
export const qualityTier = pgEnum("quality_tier", ["original", "oem", "standard", "economy"])
export const stockReason = pgEnum("stock_reason", ["count", "received", "sold_online", "sold_counter", "damaged", "returned", "correction", "order_cancelled"])
export const channel = pgEnum("channel", ["web_whatsapp", "web_checkout"])
export const orderStage = pgEnum("order_stage", ["requested", "pending_payment", "cod_pending_confirmation", "quote_pending", "confirmed", "packed", "shipped", "delivered", "rto_in_transit", "rto_received", "ready_for_pickup", "picked_up", "cancelled"])
export const paymentState = pgEnum("payment_state", ["unpaid", "partially_paid", "paid", "cod_due", "cod_collected", "pay_at_store", "partially_refunded", "refunded"])
export const payMethod = pgEnum("pay_method", ["razorpay", "payment_link", "cod_courier", "cash_on_local_delivery", "pay_at_store", "upi_manual"])
export const deliveryMode = pgEnum("delivery_mode", ["ship", "local", "pickup", "freight"])
export const priceTier = pgEnum("price_tier", ["retail", "wholesale"])
export const chargeKind = pgEnum("charge_kind", ["shipping", "cod_fee", "freight"])
export const documentType = pgEnum("document_type", ["tax_invoice", "bill_of_supply", "cash_memo", "credit_note"])
export const gstScheme = pgEnum("gst_scheme", ["regular", "composition", "unregistered"])
export const batteryKind = pgEnum("battery_kind", ["none", "cell", "pack"])
export const bodyStyle = pgEnum("body_style", ["dl_model", "sl_model", "loader", "three_wheeler"])
export const authEventKind = pgEnum("auth_event_kind", ["otp_sent", "otp_failed", "sign_in", "passkey_sign_in", "sign_out", "banned", "role_changed"])
export const paymentProvider = pgEnum("payment_provider", ["razorpay", "manual"])
export const paymentStatus = pgEnum("payment_status", ["authorized", "captured", "failed", "refunded"])
export const refundStatus = pgEnum("refund_status", ["pending", "processed", "failed", "manual"])
export const adjustmentKind = pgEnum("adjustment_kind", ["cancel_line", "cancel_charge", "return"])
export const webhookSource = pgEnum("webhook_source", ["razorpay", "shiprocket"])
export const orderEventType = pgEnum("order_event_type", ["placed", "stage", "payment", "refund", "adjustment", "shipment", "document", "note", "notification", "price_changed", "error"])
export const bookingStatus = pgEnum("booking_status", ["requested", "confirmed", "in_workshop", "ready", "completed", "no_show", "cancelled"])
export const ticketStatus = pgEnum("ticket_status", ["open", "acknowledged", "resolved"])
export const ticketKind = pgEnum("ticket_kind", ["grievance", "data_request"])
export const razorpayKind = pgEnum("razorpay_kind", ["order", "payment_link"])
export const ackChannel = pgEnum("ack_channel", ["email", "whatsapp", "sms", "phone"])
export const auditAction = pgEnum("audit_action", ["price", "delete", "archive", "role", "settings", "refund", "export", "page", "utr_recorded", "cash_handover", "data_request"])

export const specsSchema = z.record(z.string().min(1).max(60), z.string().min(1).max(200))
export const addressSchema = z.object({ name: z.string().min(2).max(80), phone: z.string().regex(/^[6-9]\d{9}$/), line1: z.string().min(3).max(120), line2: z.string().max(120), landmark: z.string().max(80), city: z.string().min(2).max(60), state: z.string().min(2).max(40), stateCode: z.string().regex(/^\d{2}$/), pincode: z.string().regex(/^\d{6}$/) })
export const redactedSchema = z.object({ redacted: z.literal(true), at: z.iso.datetime() })
export const documentSnapshotSchema = z.object({
  supplier: z.object({ legalName: z.string(), address: z.string(), gstin: z.string().nullable(), stateName: z.string(), stateCode: z.string(), scheme: z.enum(gstScheme.enumValues) }),
  buyer: z.object({ name: z.string(), address: z.string(), gstin: z.string().nullable(), stateName: z.string(), stateCode: z.string() }),
  placeOfSupply: z.string(),
})
export const contactSchema = z.object({ name: z.string().min(2).max(80), phone: z.string().regex(/^[6-9]\d{9}$/), email: z.email().nullable(), businessName: z.string().max(120).nullable(), gstin: z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/).nullable() })
export const consentSchema = z.object({ whatsappUpdates: z.boolean(), noticeVersion: z.string(), at: z.iso.datetime() })
const hoursSchema = z.object({ opens: z.string().regex(/^\d{2}:\d{2}$/), closes: z.string().regex(/^\d{2}:\d{2}$/) })
export const settingsSchema = z.object({
  legalName: z.string().default("Gulab Auto Garage"),
  gstin: z.string().nullable().default(null),
  gstScheme: z.enum(gstScheme.enumValues).default("unregistered"),
  gstEffectiveFrom: z.iso.date().nullable().default(null),
  ewayInterStatePaise: z.number().int().default(5000000),
  ewayIntraStatePaise: z.number().int().default(10000000),
  certifications: z.object({ packStandard: z.string().nullable() }).default({ packStandard: null }),
  eprRegistration: z.string().nullable().default(null),
  courierAvailable: z.boolean().default(false),
  upiVpa: z.string().regex(/^[\w.-]{2,256}@[a-zA-Z]{2,64}$/).nullable().default(null),
  upiVpaIsMerchant: z.boolean().default(false),
  upiMerchantCode: z.string().regex(/^\d{4}$/).nullable().default(null),
  localDeliveryFeePaise: z.number().int().default(5000),
  shippingBaseGrams: z.number().int().default(500),
  shippingPerKgPaise: z.number().int().default(4000),
  cashAlertPaise: z.number().int().default(1000000),
  reviewRequestsTargetPerWeek: z.number().int().default(15),
  launchFloors: z.object({ purchasablePct: z.number().int(), ownPhotoPct: z.number().int() }).default({ purchasablePct: 70, ownPhotoPct: 60 }),
  grievanceOfficer: z.object({ name: z.string(), designation: z.string(), email: z.email(), phone: z.string() }).nullable().default(null),
  weeklyHours: z.array(hoursSchema.nullable()).length(7).default(Array.from({ length: 7 }, () => ({ opens: "09:00", closes: "22:00" }))),
  specialHours: z.array(z.object({ day: z.iso.date(), hours: hoursSchema.nullable(), note: z.string() })).default([]),
  codMaxPaise: z.number().int().default(500000),
  codFeePaise: z.number().int().default(4900),
  codDailyPerPhone: z.number().int().default(2),
  localDeliveryPincodes: z.array(z.string().regex(/^\d{6}$/)).default([]),
  minOrderPaise: z.number().int().default(20000),
  shippingBands: z.array(z.object({ upToPaise: z.number().int(), feePaise: z.number().int() })).default([]),
  freeShippingFromPaise: z.number().int().nullable().default(null),
  pickupHoldDays: z.number().int().default(3),
  lowStockDefault: z.number().int().default(3),
  serviceSlots: z.array(z.object({ label: z.string(), capacity: z.number().int() })).default([]),
  serviceBlockedDays: z.array(z.iso.date()).default([]),
  serviceLeadHours: z.number().int().default(4),
  whatsappTemplates: z.object({ orderReceived: z.string(), confirmWithPayment: z.string(), codConfirm: z.string(), newLink: z.string(), shipped: z.string(), readyForPickup: z.string(), pickupOverdue: z.string(), paymentReminder: z.string(), bookingConfirmed: z.string(), reviewRequest: z.string(), freightQuote: z.string(), grievanceAck: z.string() }).partial().default({}),
  reviewLink: z.url().nullable().default(null),
})
export type Specs = z.infer<typeof specsSchema>
export type Address = z.infer<typeof addressSchema>
export type Contact = z.infer<typeof contactSchema>
export type Consent = z.infer<typeof consentSchema>
export type StoreSettings = z.infer<typeof settingsSchema>

const tstz = () => timestamp({ withTimezone: true }).notNull().defaultNow()

export const units = pgTable("unit", {
  code: text().primaryKey(),
  label: text().notNull(),
  uqc: text().notNull(),
  unitCode: text().notNull(),
})

export const systems = pgTable("system", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  shortName: text().notNull(),
  blurb: text().notNull().default(""),
  position: integer().notNull(),
})

export const categories = pgTable("category", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  systemId: integer().notNull().references(() => systems.id),
  slug: text().notNull(),
  name: text().notNull(),
  blurb: text().notNull().default(""),
  position: integer().notNull(),
  defaultWeightGrams: integer(),
  quoteShipping: boolean().notNull().default(false),
  legacyName: text(),
}, (t) => [uniqueIndex("category_system_slug").on(t.systemId, t.slug), index("category_system").on(t.systemId)])

export const vehicleBrands = pgTable("vehicle_brand", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().notNull().unique(),
  name: text().notNull(),
})

export const vehicleModels = pgTable("vehicle_model", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  brandId: integer().notNull().references(() => vehicleBrands.id),
  slug: text().notNull(),
  name: text().notNull(),
  aliases: text().notNull().default(""),
}, (t) => [uniqueIndex("vehicle_model_brand_slug").on(t.brandId, t.slug)])

export const products = pgTable("product", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  slug: text().notNull().unique(),
  sku: text().notNull().unique(),
  partCode: text(),
  mpn: text(),
  name: text().notNull(),
  maker: text(),
  makerAddress: text(),
  countryOfOrigin: text(),
  prePackaged: boolean(),
  netQuantity: text(),
  batteryKind: batteryKind().notNull().default("none"),
  bodyStyle: bodyStyle(),
  bisRegistration: text(),
  bisVerifiedAt: timestamp({ withTimezone: true }),
  groupKey: text(),
  variantLabel: text(),
  categoryId: integer().notNull().references(() => categories.id),
  status: productStatus().notNull().default("draft"),
  qualityTier: qualityTier(),
  qualityEvidence: text(),
  description: text().notNull().default(""),
  copyReviewed: boolean().notNull().default(false),
  specs: jsonb().$type<Specs>().notNull().default({}),
  specsReviewed: boolean().notNull().default(false),
  unit: text().notNull().references(() => units.code),
  moq: integer().notNull().default(1),
  minOrderQty: integer().notNull().default(1),
  orderStep: integer().notNull().default(1),
  wholesalePaise: integer().notNull(),
  retailPaise: integer(),
  proposedRetailPaise: integer(),
  priceApproved: boolean().notNull().default(false),
  mrpPaise: integer(),
  costPaise: integer(),
  gstRateBps: integer().notNull().default(1800),
  hsn: text(),
  stock: integer(),
  lowStockAt: integer(),
  bin: text(),
  weightGrams: integer(),
  lengthMm: integer(),
  widthMm: integer(),
  heightMm: integer(),
  fulfilment: fulfilment().notNull().default("courier"),
  universalFit: boolean().notNull().default(false),
  aliases: text().notNull().default(""),
  seoTitle: text(),
  seoDescription: text(),
  legacyId: text().unique(),
  legacyName: text(),
  migratedAt: timestamp({ withTimezone: true }),
  createdAt: tstz(),
  updatedAt: tstz(),
}, (t) => [
  index("product_category").on(t.categoryId),
  index("product_status").on(t.status),
  index("product_group").on(t.groupKey),
  check("product_qty", sql`${t.moq} >= 1 and ${t.minOrderQty} >= 1 and ${t.minOrderQty} <= ${t.moq} and ${t.orderStep} >= 1 and ${t.minOrderQty} % ${t.orderStep} = 0 and ${t.moq} % ${t.orderStep} = 0`),
  check("product_wholesale", sql`${t.wholesalePaise} > 0`),
  check("product_retail", sql`${t.retailPaise} is null or (${t.moq} > 1 and ${t.minOrderQty} < ${t.moq} and ${t.retailPaise} >= ${t.wholesalePaise})`),
  check("product_mrp", sql`${t.mrpPaise} is null or ${t.mrpPaise} >= coalesce(${t.retailPaise}, ${t.wholesalePaise})`),
  check("product_stock", sql`${t.stock} is null or ${t.stock} >= 0`),
  check("product_gst", sql`${t.gstRateBps} in (0, 500, 1800, 4000)`),
  check("product_hsn", sql`${t.hsn} is null or ${t.hsn} ~ '^[0-9]{4,8}$'`),
])

export const productImages = pgTable("product_image", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  productId: integer().notNull().references(() => products.id, { onDelete: "cascade" }),
  publicId: text().notNull(),
  width: integer().notNull(),
  height: integer().notNull(),
  alt: text().notNull().default(""),
  position: integer().notNull(),
  ownPhoto: boolean().notNull().default(false),
  watermarked: boolean().notNull().default(false),
  onWhite: boolean().notNull().default(true),
  classified: boolean().notNull().default(false),
}, (t) => [index("product_image_product").on(t.productId, t.position)])

export const productVehicles = pgTable("product_vehicle", {
  productId: integer().notNull().references(() => products.id, { onDelete: "cascade" }),
  modelId: integer().notNull().references(() => vehicleModels.id),
  verified: boolean().notNull().default(false),
}, (t) => [primaryKey({ columns: [t.productId, t.modelId] }), index("product_vehicle_model").on(t.modelId)])

export const slugRedirects = pgTable("slug_redirect", {
  fromSlug: text().primaryKey(),
  productId: integer().notNull().references(() => products.id),
})

export const priceHistory = pgTable("price_history", {
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  productId: integer().notNull().references(() => products.id),
  retailPaise: integer(),
  wholesalePaise: integer().notNull(),
  actorId: text().references(() => user.id, { onDelete: "set null" }),
  at: tstz(),
}, (t) => [index("price_history_product").on(t.productId, t.at)])

export const customers = pgTable("customer", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  phone: text().unique(),
  phoneHash: text().notNull().unique(),
  firstName: text(),
  redactedAt: timestamp({ withTimezone: true }),
  rtoCount: integer().notNull().default(0),
  notes: text().notNull().default(""),
  createdAt: tstz(),
})

export const orders = pgTable("orders", {
  id: integer().primaryKey().generatedAlwaysAsIdentity({ startWith: 10001 }),
  tokenHash: text(),
  cookieHash: text(),
  customerId: integer().notNull().references(() => customers.id),
  channel: channel().notNull(),
  stage: orderStage().notNull(),
  payment: paymentState().notNull(),
  method: payMethod().notNull(),
  delivery: deliveryMode().notNull(),
  contact: jsonb().$type<Contact | z.infer<typeof redactedSchema>>().notNull(),
  shipTo: jsonb().$type<Address | z.infer<typeof redactedSchema>>(),
  billTo: jsonb().$type<Address | z.infer<typeof redactedSchema>>(),
  documentSnapshot: jsonb().$type<z.infer<typeof documentSnapshotSchema>>(),
  consent: jsonb().$type<Consent>().notNull(),
  placeOfSupply: text().notNull(),
  scheme: gstScheme().notNull(),
  itemsPaise: integer().notNull(),
  chargesPaise: integer().notNull(),
  totalPaise: integer().notNull(),
  taxPaise: integer().notNull(),
  idempotencyKey: uuid().notNull().unique(),
  requestHash: text().notNull(),
  holdExtensions: integer().notNull().default(0),
  documentNumber: text().unique(),
  documentType: documentType(),
  documentAt: timestamp({ withTimezone: true }),
  ewayBillNo: text(),
  customerNote: text().notNull().default(""),
  shelfCheckedAt: timestamp({ withTimezone: true }),
  holdUntil: timestamp({ withTimezone: true }),
  clientIp: text(),
  isTest: boolean().notNull().default(false),
  createdAt: tstz(),
  updatedAt: tstz(),
}, (t) => [
  index("orders_stage").on(t.stage, t.createdAt),
  index("orders_customer").on(t.customerId, t.createdAt),
  index("orders_hold").on(t.holdUntil).where(sql`${t.holdUntil} is not null and ${t.stage} in ('requested', 'pending_payment', 'cod_pending_confirmation', 'quote_pending', 'confirmed', 'ready_for_pickup')`),
  check("orders_total", sql`${t.totalPaise} = ${t.itemsPaise} + ${t.chargesPaise}`),
  check("orders_hold_ext", sql`${t.holdExtensions} between 0 and 2`),
  check("orders_pos", sql`${t.placeOfSupply} ~ '^[0-9]{2}$'`),
])

export const orderItems = pgTable("order_item", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  orderId: integer().notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer().notNull().references(() => products.id),
  name: text().notNull(),
  sku: text().notNull(),
  hsn: text(),
  unit: text().notNull(),
  uqc: text().notNull(),
  gstRateBps: integer().notNull(),
  qty: integer().notNull(),
  unitPaise: integer().notNull(),
  tier: priceTier().notNull(),
  linePaise: integer().notNull(),
  taxablePaise: integer().notNull(),
  taxPaise: integer().notNull(),
  reserved: boolean().notNull(),
  fulfilment: fulfilment().notNull(),
}, (t) => [
  index("order_item_order").on(t.orderId),
  index("order_item_product").on(t.productId),
  check("order_item_line", sql`${t.qty} > 0 and ${t.linePaise} = ${t.unitPaise} * ${t.qty} and ${t.taxablePaise} + ${t.taxPaise} = ${t.linePaise}`),
])

export const orderCharges = pgTable("order_charge", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  orderId: integer().notNull().references(() => orders.id, { onDelete: "cascade" }),
  kind: chargeKind().notNull(),
  amountPaise: integer().notNull(),
  gstRateBps: integer().notNull(),
  taxablePaise: integer().notNull(),
  taxPaise: integer().notNull(),
}, (t) => [index("order_charge_order").on(t.orderId), check("order_charge_sum", sql`${t.taxablePaise} + ${t.taxPaise} = ${t.amountPaise}`)])

export const orderEvents = pgTable("order_event", {
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  orderId: integer().notNull().references(() => orders.id, { onDelete: "cascade" }),
  type: orderEventType().notNull(),
  actorId: text().references(() => user.id, { onDelete: "set null" }),
  data: jsonb().$type<Record<string, string | number | boolean | null>>().notNull().default({}),
  at: tstz(),
}, (t) => [index("order_event_order").on(t.orderId, t.at)])

export const orderNotes = pgTable("order_note", {
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  orderId: integer().notNull().references(() => orders.id, { onDelete: "cascade" }),
  actorId: text().references(() => user.id, { onDelete: "set null" }),
  body: text().notNull(),
  at: tstz(),
}, (t) => [index("order_note_order").on(t.orderId, t.at)])

export const razorpayOrders = pgTable("razorpay_order", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  razorpayOrderId: text().unique(),
  orderId: integer().notNull().references(() => orders.id, { onDelete: "cascade" }),
  kind: razorpayKind().notNull(),
  paymentLinkId: text().unique(),
  referenceId: text().notNull().unique(),
  expiresAt: timestamp({ withTimezone: true }),
  amountPaise: integer().notNull(),
  createdAt: tstz(),
}, (t) => [
  index("razorpay_order_order").on(t.orderId),
  check("razorpay_order_kind", sql`(${t.kind} = 'order' and ${t.razorpayOrderId} is not null and ${t.paymentLinkId} is null) or (${t.kind} = 'payment_link' and ${t.paymentLinkId} is not null)`),
])

export const payments = pgTable("payment", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  orderId: integer().notNull().references(() => orders.id, { onDelete: "cascade" }),
  provider: paymentProvider().notNull(),
  providerPaymentId: text().unique(),
  utr: text(),
  amountPaise: integer().notNull(),
  status: paymentStatus().notNull(),
  method: text(),
  isTest: boolean().notNull(),
  verifiedBy: text().references(() => user.id, { onDelete: "set null" }),
  at: tstz(),
}, (t) => [index("payment_order").on(t.orderId), uniqueIndex("payment_manual_utr").on(t.utr).where(sql`${t.provider} = 'manual' and ${t.utr} is not null`)])

export const creditNotes = pgTable("credit_note", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  number: text().notNull().unique(),
  orderId: integer().notNull().references(() => orders.id, { onDelete: "cascade" }),
  reason: text().notNull(),
  actorId: text().notNull().references(() => user.id),
  at: tstz(),
}, (t) => [index("credit_note_order").on(t.orderId)])

export const adjustments = pgTable("adjustment", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  orderId: integer().notNull().references(() => orders.id, { onDelete: "cascade" }),
  creditNoteId: integer().references(() => creditNotes.id),
  orderItemId: integer().references(() => orderItems.id),
  orderChargeId: integer().references(() => orderCharges.id),
  kind: adjustmentKind().notNull(),
  qty: integer().notNull(),
  amountPaise: integer().notNull(),
  taxPaise: integer().notNull(),
  restock: boolean().notNull(),
  reason: text().notNull(),
  actorId: text().notNull().references(() => user.id),
  at: tstz(),
}, (t) => [
  index("adjustment_order").on(t.orderId),
  check("adjustment_target", sql`(${t.orderItemId} is null) <> (${t.orderChargeId} is null)`),
  check("adjustment_kind_target", sql`(${t.kind} = 'cancel_charge') = (${t.orderChargeId} is not null)`),
  check("adjustment_qty", sql`(${t.kind} = 'cancel_charge' and ${t.qty} = 0) or (${t.kind} <> 'cancel_charge' and ${t.qty} > 0)`),
])

export const refunds = pgTable("refund", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  orderId: integer().notNull().references(() => orders.id, { onDelete: "cascade" }),
  paymentId: integer().references(() => payments.id),
  adjustmentId: integer().references(() => adjustments.id),
  providerRefundId: text().unique(),
  utr: text(),
  amountPaise: integer().notNull(),
  status: refundStatus().notNull(),
  actorId: text().references(() => user.id, { onDelete: "set null" }),
  at: tstz(),
}, (t) => [index("refund_order").on(t.orderId)])

export const shipments = pgTable("shipment", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  orderId: integer().notNull().references(() => orders.id, { onDelete: "cascade" }),
  srOrderId: text(),
  srShipmentId: text(),
  awb: text().unique(),
  courier: text(),
  trackingUrl: text(),
  status: text().notNull(),
  codAmountPaise: integer(),
  remittedPaise: integer(),
  remittanceUtr: text(),
  etdFrom: date({ mode: "string" }),
  etdTo: date({ mode: "string" }),
  labelUrl: text(),
  lastEventAt: timestamp({ withTimezone: true }),
  createdAt: tstz(),
}, (t) => [uniqueIndex("shipment_order").on(t.orderId)])

export const stockMovements = pgTable("stock_movement", {
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  productId: integer().notNull().references(() => products.id),
  delta: integer().notNull(),
  reason: stockReason().notNull(),
  note: text().notNull().default(""),
  orderId: integer().references(() => orders.id, { onDelete: "set null" }),
  actorId: text().references(() => user.id, { onDelete: "set null" }),
  at: tstz(),
}, (t) => [index("stock_movement_product").on(t.productId, t.at), index("stock_movement_order").on(t.orderId)])

export const webhookEvents = pgTable("webhook_event", {
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  source: webhookSource().notNull(),
  eventId: text().notNull(),
  payload: jsonb(),
  receivedAt: tstz(),
  processedAt: timestamp({ withTimezone: true }),
  attempts: integer().notNull().default(0),
  error: text(),
}, (t) => [uniqueIndex("webhook_event_source_id").on(t.source, t.eventId), index("webhook_event_pending").on(t.receivedAt).where(sql`${t.processedAt} is null`)])

export const serviceBookings = pgTable("service_booking", {
  id: integer().primaryKey().generatedAlwaysAsIdentity({ startWith: 501 }),
  name: text().notNull(),
  phone: text().notNull(),
  modelId: integer().references(() => vehicleModels.id),
  vehicleText: text().notNull().default(""),
  problem: text().notNull(),
  day: date({ mode: "string" }).notNull(),
  slot: text().notNull(),
  status: bookingStatus().notNull().default("requested"),
  notes: text().notNull().default(""),
  clientIp: text(),
  createdAt: tstz(),
}, (t) => [index("service_booking_day").on(t.day, t.slot)])

export const tickets = pgTable("ticket", {
  id: integer().primaryKey().generatedAlwaysAsIdentity({ startWith: 1001 }),
  kind: ticketKind().notNull().default("grievance"),
  ackChannel: ackChannel(),
  name: text().notNull(),
  phone: text().notNull(),
  email: text(),
  orderId: integer().references(() => orders.id, { onDelete: "set null" }),
  message: text().notNull(),
  status: ticketStatus().notNull().default("open"),
  acknowledgedAt: timestamp({ withTimezone: true }),
  resolvedAt: timestamp({ withTimezone: true }),
  createdAt: tstz(),
})

export const pages = pgTable("page", {
  slug: text().primaryKey(),
  title: text().notNull(),
  body: text().notNull(),
  version: integer().notNull().default(1),
  updatedAt: tstz(),
})

export const searchLog = pgTable("search_log", {
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  q: text().notNull(),
  results: integer().notNull(),
  at: tstz(),
}, (t) => [index("search_log_at").on(t.at)])

export const docCounters = pgTable("doc_counter", {
  series: text().notNull(),
  fy: text().notNull(),
  last: integer().notNull().default(0),
}, (t) => [primaryKey({ columns: [t.series, t.fy] })])

export const rateLimits = pgTable("rate_limit", {
  key: text().notNull(),
  windowStart: timestamp({ withTimezone: true }).notNull(),
  count: integer().notNull(),
}, (t) => [primaryKey({ columns: [t.key, t.windowStart] })])

export const settings = pgTable("settings", {
  id: integer().primaryKey().default(1),
  data: jsonb().$type<StoreSettings>().notNull(),
  updatedAt: tstz(),
}, (t) => [check("settings_singleton", sql`${t.id} = 1`)])

export const gstRegimes = pgTable("gst_regime", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  scheme: gstScheme().notNull(),
  gstin: text(),
  fromDate: date({ mode: "string" }).notNull().unique(),
  actorId: text().references(() => user.id, { onDelete: "set null" }),
  at: tstz(),
}, (t) => [check("gst_regime_gstin", sql`(${t.scheme} = 'unregistered') = (${t.gstin} is null)`)])

export const integrationSecrets = pgTable("integration_secret", {
  key: text().primaryKey(),
  value: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }),
})

export const authEvents = pgTable("auth_event", {
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: text(),
  email: text(),
  kind: authEventKind().notNull(),
  ip: text(),
  userAgent: text(),
  at: tstz(),
}, (t) => [index("auth_event_at").on(t.at)])

export const auditLog = pgTable("audit_log", {
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  actorId: text().references(() => user.id, { onDelete: "set null" }),
  entity: text().notNull(),
  entityId: text().notNull(),
  action: auditAction().notNull(),
  diff: jsonb().$type<Record<string, [unknown, unknown]>>().notNull(),
  at: tstz(),
}, (t) => [index("audit_entity").on(t.entity, t.entityId, t.at)])

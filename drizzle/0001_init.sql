CREATE TYPE "public"."ack_channel" AS ENUM('email', 'whatsapp', 'sms', 'phone');--> statement-breakpoint
CREATE TYPE "public"."adjustment_kind" AS ENUM('cancel_line', 'cancel_charge', 'return');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('price', 'delete', 'archive', 'role', 'settings', 'refund', 'export', 'page', 'utr_recorded', 'cash_handover', 'data_request');--> statement-breakpoint
CREATE TYPE "public"."auth_event_kind" AS ENUM('otp_sent', 'otp_failed', 'sign_in', 'passkey_sign_in', 'sign_out', 'banned', 'role_changed');--> statement-breakpoint
CREATE TYPE "public"."battery_kind" AS ENUM('none', 'cell', 'pack');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('requested', 'confirmed', 'in_workshop', 'ready', 'completed', 'no_show', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('web_whatsapp', 'web_checkout');--> statement-breakpoint
CREATE TYPE "public"."charge_kind" AS ENUM('shipping', 'cod_fee', 'freight');--> statement-breakpoint
CREATE TYPE "public"."delivery_mode" AS ENUM('ship', 'local', 'pickup', 'freight');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('tax_invoice', 'bill_of_supply', 'cash_memo', 'credit_note');--> statement-breakpoint
CREATE TYPE "public"."fulfilment" AS ENUM('courier', 'pickup_or_freight');--> statement-breakpoint
CREATE TYPE "public"."gst_scheme" AS ENUM('regular', 'composition', 'unregistered');--> statement-breakpoint
CREATE TYPE "public"."order_event_type" AS ENUM('placed', 'stage', 'payment', 'refund', 'adjustment', 'shipment', 'document', 'note', 'notification', 'price_changed', 'error');--> statement-breakpoint
CREATE TYPE "public"."order_stage" AS ENUM('requested', 'pending_payment', 'cod_pending_confirmation', 'quote_pending', 'confirmed', 'packed', 'shipped', 'delivered', 'rto_in_transit', 'rto_received', 'ready_for_pickup', 'picked_up', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."pay_method" AS ENUM('razorpay', 'payment_link', 'cod_courier', 'cash_on_local_delivery', 'pay_at_store', 'upi_manual');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('razorpay', 'manual');--> statement-breakpoint
CREATE TYPE "public"."payment_state" AS ENUM('unpaid', 'partially_paid', 'paid', 'cod_due', 'cod_collected', 'pay_at_store', 'partially_refunded', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('authorized', 'captured', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."price_tier" AS ENUM('retail', 'wholesale');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."quality_tier" AS ENUM('original', 'oem', 'standard', 'economy');--> statement-breakpoint
CREATE TYPE "public"."razorpay_kind" AS ENUM('order', 'payment_link');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending', 'processed', 'failed', 'manual');--> statement-breakpoint
CREATE TYPE "public"."stock_reason" AS ENUM('count', 'received', 'sold_online', 'sold_counter', 'damaged', 'returned', 'correction', 'order_cancelled');--> statement-breakpoint
CREATE TYPE "public"."ticket_kind" AS ENUM('grievance', 'data_request');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'acknowledged', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."webhook_source" AS ENUM('razorpay', 'shiprocket');--> statement-breakpoint
CREATE TABLE "adjustment" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "adjustment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"credit_note_id" integer,
	"order_item_id" integer,
	"order_charge_id" integer,
	"kind" "adjustment_kind" NOT NULL,
	"qty" integer NOT NULL,
	"amount_paise" integer NOT NULL,
	"tax_paise" integer NOT NULL,
	"restock" boolean NOT NULL,
	"reason" text NOT NULL,
	"actor_id" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "adjustment_target" CHECK (("adjustment"."order_item_id" is null) <> ("adjustment"."order_charge_id" is null)),
	CONSTRAINT "adjustment_kind_target" CHECK (("adjustment"."kind" = 'cancel_charge') = ("adjustment"."order_charge_id" is not null)),
	CONSTRAINT "adjustment_qty" CHECK (("adjustment"."kind" = 'cancel_charge' and "adjustment"."qty" = 0) or ("adjustment"."kind" <> 'cancel_charge' and "adjustment"."qty" > 0))
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"actor_id" text,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" "audit_action" NOT NULL,
	"diff" jsonb NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_event" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "auth_event_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" text,
	"email" text,
	"kind" "auth_event_kind" NOT NULL,
	"ip" text,
	"user_agent" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "category_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"system_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"blurb" text DEFAULT '' NOT NULL,
	"position" integer NOT NULL,
	"default_weight_grams" integer,
	"quote_shipping" boolean DEFAULT false NOT NULL,
	"body_style" text,
	"legacy_name" text
);
--> statement-breakpoint
CREATE TABLE "credit_note" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "credit_note_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"number" text NOT NULL,
	"order_id" integer NOT NULL,
	"reason" text NOT NULL,
	"actor_id" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_note_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "customer" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "customer_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"phone" text,
	"phone_hash" text NOT NULL,
	"first_name" text,
	"redacted_at" timestamp with time zone,
	"rto_count" integer DEFAULT 0 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_phone_unique" UNIQUE("phone"),
	CONSTRAINT "customer_phoneHash_unique" UNIQUE("phone_hash")
);
--> statement-breakpoint
CREATE TABLE "doc_counter" (
	"series" text NOT NULL,
	"fy" text NOT NULL,
	"last" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "doc_counter_series_fy_pk" PRIMARY KEY("series","fy")
);
--> statement-breakpoint
CREATE TABLE "gst_regime" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gst_regime_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"scheme" "gst_scheme" NOT NULL,
	"gstin" text,
	"from_date" date NOT NULL,
	"actor_id" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gst_regime_fromDate_unique" UNIQUE("from_date"),
	CONSTRAINT "gst_regime_gstin" CHECK (("gst_regime"."scheme" = 'unregistered') = ("gst_regime"."gstin" is null))
);
--> statement-breakpoint
CREATE TABLE "integration_secret" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "order_charge" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_charge_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"kind" charge_kind NOT NULL,
	"amount_paise" integer NOT NULL,
	"gst_rate_bps" integer NOT NULL,
	"taxable_paise" integer NOT NULL,
	"tax_paise" integer NOT NULL,
	CONSTRAINT "order_charge_sum" CHECK ("order_charge"."taxable_paise" + "order_charge"."tax_paise" = "order_charge"."amount_paise")
);
--> statement-breakpoint
CREATE TABLE "order_event" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_event_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"type" "order_event_type" NOT NULL,
	"actor_id" text,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_item" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_item_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"hsn" text,
	"unit" text NOT NULL,
	"uqc" text NOT NULL,
	"gst_rate_bps" integer NOT NULL,
	"qty" integer NOT NULL,
	"unit_paise" integer NOT NULL,
	"tier" "price_tier" NOT NULL,
	"line_paise" integer NOT NULL,
	"taxable_paise" integer NOT NULL,
	"tax_paise" integer NOT NULL,
	"reserved" boolean NOT NULL,
	"fulfilment" "fulfilment" NOT NULL,
	CONSTRAINT "order_item_line" CHECK ("order_item"."qty" > 0 and "order_item"."line_paise" = "order_item"."unit_paise" * "order_item"."qty" and "order_item"."taxable_paise" + "order_item"."tax_paise" = "order_item"."line_paise")
);
--> statement-breakpoint
CREATE TABLE "order_note" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_note_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"actor_id" text,
	"body" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 10001 CACHE 1),
	"token_hash" text,
	"cookie_hash" text,
	"customer_id" integer NOT NULL,
	"channel" "channel" NOT NULL,
	"stage" "order_stage" NOT NULL,
	"payment" "payment_state" NOT NULL,
	"method" "pay_method" NOT NULL,
	"delivery" "delivery_mode" NOT NULL,
	"contact" jsonb NOT NULL,
	"ship_to" jsonb,
	"bill_to" jsonb,
	"document_snapshot" jsonb,
	"consent" jsonb NOT NULL,
	"place_of_supply" text NOT NULL,
	"scheme" "gst_scheme" NOT NULL,
	"items_paise" integer NOT NULL,
	"charges_paise" integer NOT NULL,
	"total_paise" integer NOT NULL,
	"tax_paise" integer NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"hold_extensions" integer DEFAULT 0 NOT NULL,
	"document_number" text,
	"document_type" "document_type",
	"document_at" timestamp with time zone,
	"eway_bill_no" text,
	"customer_note" text DEFAULT '' NOT NULL,
	"shelf_checked_at" timestamp with time zone,
	"hold_until" timestamp with time zone,
	"client_ip" text,
	"is_test" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_idempotencyKey_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "orders_documentNumber_unique" UNIQUE("document_number"),
	CONSTRAINT "orders_total" CHECK ("orders"."total_paise" = "orders"."items_paise" + "orders"."charges_paise"),
	CONSTRAINT "orders_hold_ext" CHECK ("orders"."hold_extensions" between 0 and 2),
	CONSTRAINT "orders_pos" CHECK ("orders"."place_of_supply" ~ '^[0-9]{2}$')
);
--> statement-breakpoint
CREATE TABLE "page" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_payment_id" text,
	"utr" text,
	"amount_paise" integer NOT NULL,
	"status" "payment_status" NOT NULL,
	"method" text,
	"is_test" boolean NOT NULL,
	"verified_by" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_providerPaymentId_unique" UNIQUE("provider_payment_id")
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "price_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"product_id" integer NOT NULL,
	"retail_paise" integer,
	"wholesale_paise" integer NOT NULL,
	"actor_id" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_image" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_image_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"product_id" integer NOT NULL,
	"public_id" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"position" integer NOT NULL,
	"own_photo" boolean DEFAULT false NOT NULL,
	"watermarked" boolean DEFAULT false NOT NULL,
	"on_white" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_vehicle" (
	"product_id" integer NOT NULL,
	"model_id" integer NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	CONSTRAINT "product_vehicle_product_id_model_id_pk" PRIMARY KEY("product_id","model_id")
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "product_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"sku" text NOT NULL,
	"part_code" text,
	"mpn" text,
	"name" text NOT NULL,
	"maker" text,
	"maker_address" text,
	"country_of_origin" text,
	"pre_packaged" boolean,
	"net_quantity" text,
	"battery_kind" "battery_kind" DEFAULT 'none' NOT NULL,
	"bis_registration" text,
	"bis_verified_at" timestamp with time zone,
	"group_key" text,
	"variant_label" text,
	"category_id" integer NOT NULL,
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"quality_tier" "quality_tier",
	"quality_evidence" text,
	"description" text DEFAULT '' NOT NULL,
	"copy_reviewed" boolean DEFAULT false NOT NULL,
	"specs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"specs_reviewed" boolean DEFAULT false NOT NULL,
	"unit" text NOT NULL,
	"moq" integer DEFAULT 1 NOT NULL,
	"min_order_qty" integer DEFAULT 1 NOT NULL,
	"order_step" integer DEFAULT 1 NOT NULL,
	"wholesale_paise" integer NOT NULL,
	"retail_paise" integer,
	"proposed_retail_paise" integer,
	"price_approved" boolean DEFAULT false NOT NULL,
	"mrp_paise" integer,
	"cost_paise" integer,
	"gst_rate_bps" integer DEFAULT 1800 NOT NULL,
	"hsn" text,
	"stock" integer,
	"low_stock_at" integer,
	"bin" text,
	"weight_grams" integer,
	"length_mm" integer,
	"width_mm" integer,
	"height_mm" integer,
	"fulfilment" "fulfilment" DEFAULT 'courier' NOT NULL,
	"universal_fit" boolean DEFAULT false NOT NULL,
	"aliases" text DEFAULT '' NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"legacy_id" text,
	"legacy_name" text,
	"migrated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_slug_unique" UNIQUE("slug"),
	CONSTRAINT "product_sku_unique" UNIQUE("sku"),
	CONSTRAINT "product_legacyId_unique" UNIQUE("legacy_id"),
	CONSTRAINT "product_qty" CHECK ("product"."moq" >= 1 and "product"."min_order_qty" >= 1 and "product"."min_order_qty" <= "product"."moq" and "product"."order_step" >= 1 and "product"."min_order_qty" % "product"."order_step" = 0 and "product"."moq" % "product"."order_step" = 0),
	CONSTRAINT "product_wholesale" CHECK ("product"."wholesale_paise" > 0),
	CONSTRAINT "product_retail" CHECK ("product"."retail_paise" is null or ("product"."moq" > 1 and "product"."min_order_qty" < "product"."moq" and "product"."retail_paise" >= "product"."wholesale_paise")),
	CONSTRAINT "product_mrp" CHECK ("product"."mrp_paise" is null or "product"."mrp_paise" >= coalesce("product"."retail_paise", "product"."wholesale_paise")),
	CONSTRAINT "product_stock" CHECK ("product"."stock" is null or "product"."stock" >= 0),
	CONSTRAINT "product_gst" CHECK ("product"."gst_rate_bps" in (0, 500, 1800, 4000)),
	CONSTRAINT "product_hsn" CHECK ("product"."hsn" is null or "product"."hsn" ~ '^[0-9]{4,8}$')
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "rate_limit_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "razorpay_order" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "razorpay_order_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"razorpay_order_id" text,
	"order_id" integer NOT NULL,
	"kind" "razorpay_kind" NOT NULL,
	"payment_link_id" text,
	"reference_id" text NOT NULL,
	"expires_at" timestamp with time zone,
	"amount_paise" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "razorpay_order_razorpayOrderId_unique" UNIQUE("razorpay_order_id"),
	CONSTRAINT "razorpay_order_paymentLinkId_unique" UNIQUE("payment_link_id"),
	CONSTRAINT "razorpay_order_referenceId_unique" UNIQUE("reference_id"),
	CONSTRAINT "razorpay_order_kind" CHECK (("razorpay_order"."kind" = 'order' and "razorpay_order"."razorpay_order_id" is not null and "razorpay_order"."payment_link_id" is null) or ("razorpay_order"."kind" = 'payment_link' and "razorpay_order"."payment_link_id" is not null))
);
--> statement-breakpoint
CREATE TABLE "refund" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "refund_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"payment_id" integer,
	"adjustment_id" integer,
	"provider_refund_id" text,
	"utr" text,
	"amount_paise" integer NOT NULL,
	"status" "refund_status" NOT NULL,
	"actor_id" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refund_providerRefundId_unique" UNIQUE("provider_refund_id")
);
--> statement-breakpoint
CREATE TABLE "search_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "search_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"q" text NOT NULL,
	"results" integer NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_booking" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "service_booking_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 501 CACHE 1),
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"model_id" integer,
	"vehicle_text" text DEFAULT '' NOT NULL,
	"problem" text NOT NULL,
	"day" date NOT NULL,
	"slot" text NOT NULL,
	"status" "booking_status" DEFAULT 'requested' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"client_ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_singleton" CHECK ("settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "shipment" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shipment_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"sr_order_id" text,
	"sr_shipment_id" text,
	"awb" text,
	"courier" text,
	"tracking_url" text,
	"status" text NOT NULL,
	"cod_amount_paise" integer,
	"remitted_paise" integer,
	"remittance_utr" text,
	"etd_from" date,
	"etd_to" date,
	"label_url" text,
	"last_event_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shipment_awb_unique" UNIQUE("awb")
);
--> statement-breakpoint
CREATE TABLE "slug_redirect" (
	"from_slug" text PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movement" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_movement_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"product_id" integer NOT NULL,
	"delta" integer NOT NULL,
	"reason" "stock_reason" NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"order_id" integer,
	"actor_id" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "system_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"blurb" text DEFAULT '' NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "system_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ticket" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ticket_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1001 CACHE 1),
	"kind" "ticket_kind" DEFAULT 'grievance' NOT NULL,
	"ack_channel" "ack_channel",
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"order_id" integer,
	"message" text NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"uqc" text NOT NULL,
	"unit_code" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_brand" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vehicle_brand_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "vehicle_brand_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "vehicle_model" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "vehicle_model_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"brand_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aliases" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_event" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "webhook_event_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"source" "webhook_source" NOT NULL,
	"event_id" text NOT NULL,
	"payload" jsonb,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "auth_rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "passkey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"public_key" text NOT NULL,
	"user_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" text,
	"created_at" timestamp,
	"aaguid" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	"auth_method" text DEFAULT 'unknown' NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "adjustment" ADD CONSTRAINT "adjustment_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustment" ADD CONSTRAINT "adjustment_credit_note_id_credit_note_id_fk" FOREIGN KEY ("credit_note_id") REFERENCES "public"."credit_note"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustment" ADD CONSTRAINT "adjustment_order_item_id_order_item_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustment" ADD CONSTRAINT "adjustment_order_charge_id_order_charge_id_fk" FOREIGN KEY ("order_charge_id") REFERENCES "public"."order_charge"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustment" ADD CONSTRAINT "adjustment_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_system_id_system_id_fk" FOREIGN KEY ("system_id") REFERENCES "public"."system"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_note" ADD CONSTRAINT "credit_note_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_note" ADD CONSTRAINT "credit_note_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gst_regime" ADD CONSTRAINT "gst_regime_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_charge" ADD CONSTRAINT "order_charge_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_event" ADD CONSTRAINT "order_event_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_event" ADD CONSTRAINT "order_event_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_note" ADD CONSTRAINT "order_note_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_note" ADD CONSTRAINT "order_note_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customer_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_verified_by_user_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_vehicle" ADD CONSTRAINT "product_vehicle_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_vehicle" ADD CONSTRAINT "product_vehicle_model_id_vehicle_model_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."vehicle_model"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_unit_unit_code_fk" FOREIGN KEY ("unit") REFERENCES "public"."unit"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "razorpay_order" ADD CONSTRAINT "razorpay_order_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_payment_id_payment_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_adjustment_id_adjustment_id_fk" FOREIGN KEY ("adjustment_id") REFERENCES "public"."adjustment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund" ADD CONSTRAINT "refund_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_booking" ADD CONSTRAINT "service_booking_model_id_vehicle_model_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."vehicle_model"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slug_redirect" ADD CONSTRAINT "slug_redirect_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_model" ADD CONSTRAINT "vehicle_model_brand_id_vehicle_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."vehicle_brand"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "adjustment_order" ON "adjustment" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "audit_entity" ON "audit_log" USING btree ("entity","entity_id","at");--> statement-breakpoint
CREATE INDEX "auth_event_at" ON "auth_event" USING btree ("at");--> statement-breakpoint
CREATE UNIQUE INDEX "category_system_slug" ON "category" USING btree ("system_id","slug");--> statement-breakpoint
CREATE INDEX "category_system" ON "category" USING btree ("system_id");--> statement-breakpoint
CREATE INDEX "credit_note_order" ON "credit_note" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_charge_order" ON "order_charge" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_event_order" ON "order_event" USING btree ("order_id","at");--> statement-breakpoint
CREATE INDEX "order_item_order" ON "order_item" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_item_product" ON "order_item" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "order_note_order" ON "order_note" USING btree ("order_id","at");--> statement-breakpoint
CREATE INDEX "orders_stage" ON "orders" USING btree ("stage","created_at");--> statement-breakpoint
CREATE INDEX "orders_customer" ON "orders" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_hold" ON "orders" USING btree ("hold_until") WHERE "orders"."hold_until" is not null and "orders"."stage" in ('requested', 'pending_payment', 'cod_pending_confirmation', 'quote_pending', 'confirmed', 'ready_for_pickup');--> statement-breakpoint
CREATE INDEX "payment_order" ON "payment" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_manual_utr" ON "payment" USING btree ("utr") WHERE "payment"."provider" = 'manual' and "payment"."utr" is not null;--> statement-breakpoint
CREATE INDEX "price_history_product" ON "price_history" USING btree ("product_id","at");--> statement-breakpoint
CREATE INDEX "product_image_product" ON "product_image" USING btree ("product_id","position");--> statement-breakpoint
CREATE INDEX "product_vehicle_model" ON "product_vehicle" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "product_category" ON "product" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "product_status" ON "product" USING btree ("status");--> statement-breakpoint
CREATE INDEX "product_group" ON "product" USING btree ("group_key");--> statement-breakpoint
CREATE INDEX "razorpay_order_order" ON "razorpay_order" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "refund_order" ON "refund" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "search_log_at" ON "search_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "service_booking_day" ON "service_booking" USING btree ("day","slot");--> statement-breakpoint
CREATE UNIQUE INDEX "shipment_order" ON "shipment" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "stock_movement_product" ON "stock_movement" USING btree ("product_id","at");--> statement-breakpoint
CREATE INDEX "stock_movement_order" ON "stock_movement" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_model_brand_slug" ON "vehicle_model" USING btree ("brand_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_event_source_id" ON "webhook_event" USING btree ("source","event_id");--> statement-breakpoint
CREATE INDEX "webhook_event_pending" ON "webhook_event" USING btree ("received_at") WHERE "webhook_event"."processed_at" is null;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_userId_idx" ON "passkey" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "passkey_credentialID_idx" ON "passkey" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");
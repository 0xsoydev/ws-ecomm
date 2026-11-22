REVOKE UPDATE, DELETE ON public.order_event, public.stock_movement, public.price_history, public.audit_log, public.auth_event, public.adjustment, public.credit_note, public.gst_regime FROM app;
--> statement-breakpoint
REVOKE DELETE ON public.orders, public.order_item, public.order_charge, public.payment, public.refund FROM app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.purge_expired() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  redacted jsonb := jsonb_build_object('redacted', true, 'at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
BEGIN
  DELETE FROM public.webhook_event WHERE processed_at IS NOT NULL AND received_at < now() - interval '90 days';
  DELETE FROM public.rate_limit WHERE window_start < now() - interval '7 days';
  DELETE FROM public.auth_rate_limit WHERE last_request < (extract(epoch FROM now() - interval '7 days') * 1000)::bigint;
  DELETE FROM public.search_log WHERE at < now() - interval '90 days';
  UPDATE public.orders SET client_ip = NULL, updated_at = now() WHERE client_ip IS NOT NULL AND created_at < now() - interval '90 days';
  UPDATE public.service_booking SET client_ip = NULL WHERE client_ip IS NOT NULL AND created_at < now() - interval '90 days';
  DELETE FROM public.service_booking WHERE created_at < now() - interval '2 years';
  DELETE FROM public.ticket WHERE resolved_at < now() - interval '2 years';
  UPDATE public.orders
    SET contact = redacted,
        ship_to = CASE WHEN ship_to IS NULL THEN NULL ELSE redacted END,
        bill_to = CASE WHEN bill_to IS NULL THEN NULL ELSE redacted END,
        updated_at = now()
    WHERE created_at < now() - interval '2 years'
      AND NOT (contact ? 'redacted')
      AND contact ->> 'gstin' IS NULL;
  DELETE FROM public.order_note WHERE at < now() - interval '2 years';
  UPDATE public.customer c
    SET phone = NULL, first_name = NULL, redacted_at = now()
    WHERE c.redacted_at IS NULL
      AND c.created_at < now() - interval '2 years'
      AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.customer_id = c.id AND o.created_at >= now() - interval '2 years');
  DELETE FROM public.auth_event WHERE at < now() - interval '1 year';
  DELETE FROM public.verification WHERE expires_at < now() - interval '1 day';
  DELETE FROM public.session WHERE expires_at < now() - interval '1 day';
END
$$;
--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.purge_expired() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.purge_expired() TO app;
--> statement-breakpoint
INSERT INTO public.unit (code, label, uqc, unit_code) VALUES
  ('pcs', 'pcs', 'NOS', 'C62'),
  ('set', 'set', 'SET', 'SET'),
  ('pair', 'pair', 'PRS', 'PR'),
  ('kg', 'kg', 'KGS', 'KGM'),
  ('m', 'm', 'MTR', 'MTR'),
  ('box', 'box', 'BOX', 'BX'),
  ('pkg', 'pkg', 'PAC', 'PK'),
  ('dozen', 'dozen', 'DOZ', 'DZN'),
  ('unit', 'unit', 'UNT', 'C62'),
  ('l', 'l', 'LTR', 'LTR')
ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint
INSERT INTO public.settings (id, data) VALUES (1, '{"legalName":"Gulab Auto Garage","gstin":null,"gstScheme":"unregistered","gstEffectiveFrom":null,"ewayInterStatePaise":5000000,"ewayIntraStatePaise":10000000,"certifications":{"packStandard":null},"eprRegistration":null,"courierAvailable":false,"upiVpa":null,"upiVpaIsMerchant":false,"upiMerchantCode":null,"localDeliveryFeePaise":5000,"shippingBaseGrams":500,"shippingPerKgPaise":4000,"cashAlertPaise":1000000,"reviewRequestsTargetPerWeek":15,"launchFloors":{"purchasablePct":70,"ownPhotoPct":60},"grievanceOfficer":null,"weeklyHours":[{"opens":"09:00","closes":"22:00"},{"opens":"09:00","closes":"22:00"},{"opens":"09:00","closes":"22:00"},{"opens":"09:00","closes":"22:00"},{"opens":"09:00","closes":"22:00"},{"opens":"09:00","closes":"22:00"},{"opens":"09:00","closes":"22:00"}],"specialHours":[],"codMaxPaise":500000,"codFeePaise":4900,"codDailyPerPhone":2,"localDeliveryPincodes":[],"minOrderPaise":20000,"shippingBands":[],"freeShippingFromPaise":null,"pickupHoldDays":3,"lowStockDefault":3,"serviceSlots":[],"serviceBlockedDays":[],"serviceLeadHours":4,"whatsappTemplates":{},"reviewLink":null}'::jsonb)
ON CONFLICT (id) DO NOTHING;

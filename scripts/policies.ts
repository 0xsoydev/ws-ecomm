const SHOP = "Gulab Auto Garage, 1 Akshardham Complex, near Milap Theatre, S.V. Road, Malad West, Mumbai 400064"
const CONTACT = "+91 98217 84847 (call or WhatsApp, 9 am to 10 pm) or gulabautoev@gmail.com"

export const policies: { slug: string; title: string; body: string }[] = [
  {
    slug: "shipping",
    title: "Delivery and pickup",
    body: `WS Green is the online counter of ${SHOP}.

## Pickup at the shop

Pickup is free. Once we confirm your order on WhatsApp or by phone, the parts are kept aside for you for 3 days. Pay at the counter by cash or UPI, or pay by UPI before you come. Check the parts at the counter before you leave.

## Delivery by courier

We deliver within Maharashtra. We usually hand the parcel to the courier the same or next working day after your payment, and send you the tracking number on WhatsApp. We tell you the expected delivery time when we confirm your order.

The delivery charge depends on the weight and size of the parcel. We tell you the exact charge on WhatsApp before you pay. Courier orders are paid by UPI.

## Parts we cannot send by courier

Lithium cells and battery packs cannot go by courier. Pick them up at the shop, or ask us for a quote to send them by transport.

## Delivery outside Maharashtra

We cannot deliver outside Maharashtra yet. Call or WhatsApp us and we will tell you when we can.`,
  },
  {
    slug: "returns",
    title: "Returns, replacements and refunds",
    body: `## A part arrived damaged or does not work

Tell us within 2 days of pickup or delivery, on WhatsApp at +91 98217 84847, with your order number and a photo or short video of the problem. A video of opening the parcel helps but is not required.

We replace the part, or refund it if we have no replacement. For courier orders, we arrange and pay for the return.

## You ordered the wrong part

Bring or send it back within 7 days, unused, in its original packing, with the order number. We exchange it for the right part or refund it. For a wrong part ordered by you, the courier charge to return it is yours.

## Parts we cannot take back

- Electrical parts that have been fitted or wired in, unless they were faulty when you received them.
- Lithium cells and battery packs, which we inspect before any replacement under warranty.
- Parts cut, drilled or changed after delivery.

## Refunds

Refunds go back to the UPI account or bank account you paid from, within 7 working days of us receiving the part back or approving the refund. Cash payments at the shop are refunded at the counter or by UPI.

## Cancelling an order

You can cancel any time before we hand the parcel to the courier or before you pick it up. If you already paid, we refund the full amount. If we cannot supply a part, we tell you before you pay, or refund it in full.

Questions: ${CONTACT}.`,
  },
  {
    slug: "warranty",
    title: "Warranty",
    body: `Every part is checked before it leaves the shop.

## Parts faulty on arrival

If a part does not work when you receive it, we replace or refund it. See [returns and refunds](/pages/returns).

## Manufacturer warranty

Some parts, such as BMS boards, controllers and chargers, carry a warranty from their maker. Where a part has one, we tell you the period on WhatsApp when we confirm your order, and we handle the claim with the maker for you at the shop.

Warranty does not cover damage from wrong wiring, water, accidents, overloading, or repairs by someone else.

## How to claim

Bring the part to the shop with your order number, or WhatsApp us at +91 98217 84847 with a photo and the order number.`,
  },
  {
    slug: "terms",
    title: "Terms of sale",
    body: `These terms apply to orders placed on this website. The seller is ${SHOP}, trading online as WS Green.

## Orders

- Placing an order is a request to buy. The order is confirmed only when we confirm it on WhatsApp or by phone, after checking stock.
- If a part is not available or a price shown was wrong, we tell you before you pay, and you can change or cancel the order.
- You must be 18 or older to place an order.

## Prices

Prices are in Indian rupees and include all charges except delivery. Wholesale prices apply when you buy the break quantity shown on the part or more. The delivery charge is shown or told to you before you pay.

## Payment

Pay at the shop by cash or UPI when you pick up, or by UPI after we confirm. We never ask for card numbers, OTPs or passwords.

## Fitment

Where we say a part is sold for a vehicle, check it against your old part or send us a photo before ordering. See [returns and refunds](/pages/returns) for wrong parts.

## Complaints

Contact ${CONTACT}. We reply within 2 days and aim to resolve complaints within 1 month.

These terms are governed by the laws of India, and courts in Mumbai have jurisdiction.`,
  },
  {
    slug: "privacy",
    title: "Privacy",
    body: `This notice explains what Gulab Auto Garage (WS Green) does with your personal data when you use this website.

## What we collect

- Your name, mobile number and optional email when you place an order.
- Your delivery address for courier orders.
- Your order, payment reference and messages about it.
- Basic technical data, such as your IP address, to stop abuse.

We do not collect card details. We do not use advertising trackers.

## Why we use it

To confirm, pack, deliver and support your order, to keep the records the law requires, and to stop fraud. With your agreement at checkout, we send order updates on WhatsApp.

## Who we share it with

Only the services that run the shop: our hosting and database providers, our image host, WhatsApp (Meta) for messages you start or agree to, and the courier for delivery orders. We do not sell your data.

## How long we keep it

Contact details and addresses for 2 years after your last order. Order and payment records for 8 years, as tax law requires.

## Your rights

You can ask to see, correct or delete your data, or withdraw your consent to WhatsApp updates, by writing to gulabautoev@gmail.com or calling +91 98217 84847. We reply within 30 days. You can also complain to the Data Protection Board of India.

On this phone, the site stores your cart and, if you ask, your contact details. Clear them from your browser at any time.`,
  },
]

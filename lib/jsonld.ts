import { BUSINESS } from "./business"
import { publicEnv } from "./env.public"
import type { Hours } from "./time"

const site = publicEnv.NEXT_PUBLIC_SITE_URL
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export function jsonLd(data: object) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") }
}

export function localBusiness(weekly: readonly Hours[], scope: string) {
  return {
    "@context": "https://schema.org",
    "@type": ["AutoPartsStore", "AutoRepair"],
    "@id": `${site}/#business`,
    name: BUSINESS.legalName,
    url: `${site}/store`,
    telephone: BUSINESS.phone.replace(/\s/g, ""),
    email: BUSINESS.email,
    address: { "@type": "PostalAddress", streetAddress: "1 Akshardham Complex, near Milap Theatre, S.V. Road, Malad West", addressLocality: "Mumbai", addressRegion: "Maharashtra", postalCode: "400064", addressCountry: "IN" },
    geo: { "@type": "GeoCoordinates", latitude: 19.1948505, longitude: 72.8473473 },
    openingHoursSpecification: weekly.flatMap((h, i) => (h ? [{ "@type": "OpeningHoursSpecification", dayOfWeek: DAYS[i], opens: h.opens, closes: h.closes }] : [])),
    areaServed: scope === "Delivery across India" ? "IN" : scope === "Delivery within Maharashtra" ? "Maharashtra" : "Mumbai",
    sameAs: ["https://www.instagram.com/gulabauto", "https://www.facebook.com/gulabautogarage"],
  }
}

export function website() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "WS Green",
    url: site,
    potentialAction: { "@type": "SearchAction", target: `${site}/search?q={query}`, "query-input": "required name=query" },
  }
}

export function breadcrumbs(items: readonly { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${site}${it.path}` })),
  }
}

type ProductInput = {
  name: string
  slug: string
  code: string | null
  description: string
  maker: string | null
  category: string
  images: readonly { publicId: string }[]
  listing: { paise: number; qty: number }
  unitCode: string
  inStock: boolean
  pickupOnly: boolean
  fits: readonly string[]
  countryOfOrigin: string | null
}

export function productNode(p: ProductInput) {
  const cloud = publicEnv.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const price = (p.listing.paise / 100).toFixed(2)
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    url: `${site}/p/${p.slug}`,
    image: p.images.map((i) => `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_auto,w_1200/${i.publicId}`),
    description: p.description,
    sku: p.code ?? undefined,
    brand: p.maker ? { "@type": "Brand", name: p.maker } : undefined,
    category: p.category,
    countryOfOrigin: p.countryOfOrigin ?? undefined,
    isAccessoryOrSparePartFor: p.fits.length ? p.fits.map((name) => ({ "@type": "Product", name })) : undefined,
    offers: {
      "@type": "Offer",
      url: `${site}/p/${p.slug}`,
      priceCurrency: "INR",
      ...(p.listing.qty === 1
        ? { price }
        : { priceSpecification: { "@type": "UnitPriceSpecification", price, priceCurrency: "INR", referenceQuantity: { "@type": "QuantitativeValue", value: p.listing.qty, unitCode: p.unitCode, valueReference: { "@type": "QuantitativeValue", value: 1, unitCode: p.unitCode } } } }),
      itemCondition: "https://schema.org/NewCondition",
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@id": `${site}/#business` },
      hasMerchantReturnPolicy: { "@type": "MerchantReturnPolicy", applicableCountry: "IN", returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow", merchantReturnDays: 7, returnMethod: ["https://schema.org/ReturnInStore", "https://schema.org/ReturnByMail"], merchantReturnLink: `${site}/pages/returns` },
      availableDeliveryMethod: p.pickupOnly ? "https://schema.org/OnSitePickup" : undefined,
    },
  }
}

export function itemList(name: string, items: readonly { slug: string; name: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.slice(0, 50).map((it, i) => ({ "@type": "ListItem", position: i + 1, url: `${site}/p/${it.slug}`, name: it.name })),
  }
}

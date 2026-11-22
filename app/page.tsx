export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[680px] flex-col justify-center gap-8 px-4 py-16">
      <picture>
        <source srcSet="/wsgreen_dark.svg" media="(prefers-color-scheme: dark)" />
        <img src="/wsgreen_light.svg" alt="WS Green" width={136} height={14} className="h-5 w-auto" />
      </picture>
      <h1 className="text-3xl">EV spare parts, BMS and controllers. Counter prices.</h1>
      <p className="max-w-[60ch] text-muted">
        The online counter for Gulab Auto Garage is being set up. Until it opens, ask us on WhatsApp or visit the shop.
      </p>
      <address className="not-italic leading-relaxed">
        Gulab Auto Garage
        <br />
        1 Akshardham Complex, near Milap Theatre, S.V. Road, Malad West, Mumbai 400064
        <br />
        Open every day, 9 am to 10 pm
      </address>
      <div className="flex flex-wrap gap-3">
        <a
          href="https://wa.me/919821784847"
          className="inline-flex h-11 items-center rounded-control border border-ink bg-accent px-5 font-semibold text-on-accent no-underline transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          Ask on WhatsApp
        </a>
        <a
          href="tel:+919821784847"
          className="inline-flex h-11 items-center rounded-control border border-line-strong bg-surface px-5 font-semibold no-underline transition-colors duration-200 ease-out hover:bg-bg"
        >
          Call +91 98217 84847
        </a>
      </div>
    </main>
  )
}

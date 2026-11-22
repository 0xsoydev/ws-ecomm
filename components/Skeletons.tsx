const bar = "rounded-[4px] bg-line/70 motion-safe:animate-pulse"

export function ListingSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3 pt-6">
      <div className={`${bar} h-4 w-16`} />
      <div className={`${bar} h-8 w-56`} />
      <div className={`${bar} mt-1 h-4 w-72 max-w-full`} />
      <div className="mt-6 flex gap-2">
        {[64, 88, 72, 96].map((w) => (
          <div key={w} className={`${bar} h-9`} style={{ width: w }} />
        ))}
      </div>
      <ul className="mt-4 divide-y divide-line">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            <div className={`${bar} size-12`} />
            <div className="flex flex-1 flex-col gap-2">
              <div className={`${bar} h-4 w-24`} />
              <div className={`${bar} h-3 w-44`} />
            </div>
            <div className={`${bar} size-11`} />
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ProductSkeleton() {
  return (
    <div aria-hidden className="grid gap-6 pt-4 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:gap-12 lg:pt-8">
      <div className={`${bar} aspect-square w-full rounded-container`} />
      <div className="flex flex-col gap-3">
        <div className={`${bar} h-8 w-40`} />
        <div className={`${bar} h-5 w-64 max-w-full`} />
        <div className={`${bar} mt-4 h-20 w-full`} />
        <div className={`${bar} h-13 w-full`} />
      </div>
    </div>
  )
}

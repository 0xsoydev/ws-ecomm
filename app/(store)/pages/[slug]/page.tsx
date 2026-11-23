import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import Markdown from "react-markdown"
import PageHead from "@/components/PageHead"
import { ListingSkeleton } from "@/components/Skeletons"
import { contentPage, POLICY_SLUGS } from "@/lib/pages"

export const ensureStatic = "navigation"

export function generateStaticParams() {
  return POLICY_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps<"/pages/[slug]">): Promise<Metadata> {
  const page = await contentPage((await params).slug)
  if (!page) return { title: "Page not found" }
  const lead = page.body.split("\n").find((l) => l.trim() && !l.startsWith("#") && !l.startsWith("-")) ?? page.title
  return { title: page.title, description: lead.replace(/[*_[\]]/g, "").replace(/\(\S+\)/g, "").trim().slice(0, 160), alternates: { canonical: `/pages/${page.slug}` } }
}

export default function ContentRoute({ params }: PageProps<"/pages/[slug]">) {
  return (
    <div className="mx-auto max-w-[720px] px-4 sm:px-6">
      <Suspense fallback={<ListingSkeleton />}>
        <Content params={params} />
      </Suspense>
    </div>
  )
}

async function Content({ params }: { params: PageProps<"/pages/[slug]">["params"] }) {
  const page = await contentPage((await params).slug)
  if (!page) notFound()
  return (
    <article>
      <PageHead back={{ href: "/", label: "Home" }} title={page.title}>
        <p className="text-sm text-muted">
          Version {page.version}, updated {page.updatedAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}
        </p>
      </PageHead>
      <div className="mt-6 flex max-w-[65ch] flex-col gap-4 [&_h2]:mt-6 [&_h2]:text-xl [&_h3]:mt-4 [&_h3]:text-lg [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc">
        <Markdown skipHtml components={{ a: ({ href, children }) => <a href={href} rel="noopener">{children}</a> }}>
          {page.body}
        </Markdown>
      </div>
    </article>
  )
}

import type { Metadata } from "next"
import StoreLayout from "./(store)/layout"
import StoreNotFound from "./(store)/not-found"

export const metadata: Metadata = { title: "Page not found" }

export default function NotFound() {
  return (
    <StoreLayout params={Promise.resolve({})}>
      <StoreNotFound />
    </StoreLayout>
  )
}

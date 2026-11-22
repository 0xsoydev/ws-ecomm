const site = process.env.NEXT_PUBLIC_SITE_URL

if (!site || !URL.canParse(site)) throw new Error("NEXT_PUBLIC_SITE_URL must be an absolute URL")

export const publicEnv = {
  NEXT_PUBLIC_SITE_URL: site,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "dbmblxf0a",
} as const

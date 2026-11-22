import { z } from "zod"

export const publicEnv = z
  .object({
    NEXT_PUBLIC_SITE_URL: z.url(),
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().default("dbmblxf0a"),
  })
  .parse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  })

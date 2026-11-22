"use server"

import { eq } from "drizzle-orm"
import { APIError } from "better-auth/api"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { auth, PASSWORD_MAX, PASSWORD_MIN, requireSession } from "@/lib/auth"
import { user } from "@/lib/auth-schema"
import { db } from "@/lib/db"

const input = z.object({ currentPassword: z.string().min(1).max(PASSWORD_MAX), newPassword: z.string().max(PASSWORD_MAX), confirm: z.string() })

export async function changePassword(_: string, form: FormData): Promise<string> {
  const current = await requireSession()
  const d = input.safeParse({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword"), confirm: form.get("confirm") })
  if (!d.success) return "Fill in all three fields."
  if (d.data.newPassword.length < PASSWORD_MIN) return `Use at least ${String(PASSWORD_MIN)} characters.`
  if (d.data.newPassword !== d.data.confirm) return "The two new passwords are different."
  if (d.data.newPassword === d.data.currentPassword) return "Choose a password different from the current one."
  try {
    await auth.api.changePassword({ body: { currentPassword: d.data.currentPassword, newPassword: d.data.newPassword, revokeOtherSessions: true }, headers: await headers() })
  } catch (error) {
    if (error instanceof APIError) return "The current password is wrong."
    throw error
  }
  await db.update(user).set({ mustChangePassword: false, updatedAt: new Date() }).where(eq(user.id, current.user.id))
  redirect("/admin")
}

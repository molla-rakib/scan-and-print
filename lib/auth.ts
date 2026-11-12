import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { connectDb } from "@/lib/db"
import { env } from "@/lib/env"
import { Shop, User } from "@/lib/models"
import { getSession } from "@/lib/session"

export function isAdminEmail(email: string) {
  return env.adminEmails.includes(email.toLowerCase())
}

/** Current signed-in user, or null. Deduplicated per request. */
export const getCurrentUser = cache(async () => {
  const session = await getSession()
  if (!session) return null
  await connectDb()
  const user = await User.findById(session.userId)
  if (!user) return null
  return { id: user.id as string, email: user.email, name: user.name ?? "", isAdmin: isAdminEmail(user.email) }
})

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}

export async function requireAdmin() {
  const user = await requireUser()
  if (!user.isAdmin) redirect("/dashboard")
  return user
}

/** Signed-in user and their shop, which may not exist yet (e.g. an admin without a shop). */
export const getUserAndShop = cache(async () => {
  const user = await requireUser()
  const shop = await Shop.findOne({ ownerId: user.id })
  return { user, shop }
})

/** Signed-in shop owner and their shop. Redirects to onboarding if no shop exists yet. */
export const requireShop = cache(async () => {
  const { user, shop } = await getUserAndShop()
  if (!shop) redirect("/onboarding")
  return { user, shop }
})

/**
 * Where a signed-in user's "home" is: onboarding while they have no shop (admins too), then the admin panel
 * for admins and the dashboard for owners. Send people straight there: a redirect from inside a streamed dashboard page (requireShop) only
 * takes effect once the browser hydrates, which looked like onboarding "not loading".
 */
export async function homePathFor(user: { id: string; email: string }) {
  await connectDb()
  // Everyone without a shop sets one up first, admins included (they can skip to the admin panel from there).
  if (!(await Shop.exists({ ownerId: user.id }))) return "/onboarding"
  return isAdminEmail(user.email) ? "/dashboard/admin" : "/dashboard"
}

import "server-only"
import { Shop } from "@/lib/models"

/** Whether this user already has a shop (then onboarding is done). */
export async function userHasShop(userId: string) {
  return Boolean(await Shop.exists({ ownerId: userId }))
}

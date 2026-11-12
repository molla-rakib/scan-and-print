import "server-only"
import { SubscriptionPayment } from "@/lib/models"
import type { SubscriptionMethod } from "@/lib/constants"

/** Methods where the owner sends money by hand and the admin approves it. */
export const MANUAL_METHODS: SubscriptionMethod[] = ["manual_bkash", "manual_nagad"]

/** How many manual bKash/Nagad payments wait for the admin (the count on the payments tab). */
export async function countPendingManualPayments() {
  return SubscriptionPayment.countDocuments({ status: "pending", method: { $in: MANUAL_METHODS } })
}

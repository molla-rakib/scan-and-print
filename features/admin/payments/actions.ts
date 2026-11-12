"use server"

import { refresh } from "next/cache"
import { isValidObjectId } from "mongoose"
import { fail, type ActionResult } from "@/lib/action-result"
import { requireAdmin } from "@/lib/auth"
import { markPaid, markUnpaid } from "@/lib/billing"
import { SubscriptionPayment } from "@/lib/models"

/** Approves a manual bKash/Nagad payment after checking it arrived: extends the shop. */
export async function approvePayment(paymentId: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!isValidObjectId(paymentId)) return fail("পেমেন্ট পাওয়া যায়নি।")
  const payment = await SubscriptionPayment.findById(paymentId)
  if (!payment || payment.status !== "pending") return fail("এই পেমেন্টটি আর যাচাইয়ের অপেক্ষায় নেই।")
  if (!(await markPaid(payment._id, { recordedBy: admin.email }))) return fail("এই পেমেন্টটি আর যাচাইয়ের অপেক্ষায় নেই।")
  refresh()
  return { ok: true }
}

export async function rejectPayment(paymentId: string, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin()
  if (!isValidObjectId(paymentId)) return fail("পেমেন্ট পাওয়া যায়নি।")
  const note = reason.trim().slice(0, 200) || "টাকা পাওয়া যায়নি"
  const payment = await SubscriptionPayment.findById(paymentId)
  if (!payment || !(await markUnpaid(payment._id, "rejected", note, admin.email))) return fail("এই পেমেন্টটি আর যাচাইয়ের অপেক্ষায় নেই।")
  refresh()
  return { ok: true }
}

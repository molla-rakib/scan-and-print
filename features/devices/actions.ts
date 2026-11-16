"use server"

import { refresh } from "next/cache"
import { isValidObjectId } from "mongoose"
import { z } from "zod"
import { fail, type ActionResult } from "@/lib/action-result"
import { requireShop } from "@/lib/auth"
import { randomCode } from "@/lib/crypto"
import { Agent, Device, PrintJob } from "@/lib/models"

export async function createPairingCode(): Promise<ActionResult<{ code: string; agentId: string; expiresAt: string }>> {
  const { shop } = await requireShop()
  // Drop unused codes so only the latest one works.
  await Agent.deleteMany({ shopId: shop._id, tokenHash: { $exists: false } })

  const code = randomCode(8)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  const agent = await Agent.create({ shopId: shop._id, pairingCode: code, pairingExpiresAt: expiresAt })
  return { ok: true, code, agentId: agent.id, expiresAt: expiresAt.toISOString() }
}

export type PairingStatus = {
  /** waiting: code not used yet · paired: the PC connected · expired: code expired or replaced. */
  state: "waiting" | "paired" | "expired"
  machineName: string
  /** The PC has sent its printer list (first heartbeat after pairing). */
  checkedIn: boolean
  printers: number
}

/** Polled by the pairing dialog so it can show the PC connecting live. Read-only. */
export async function getPairingStatus(agentId: string): Promise<ActionResult<PairingStatus>> {
  const { shop } = await requireShop()
  if (!isValidObjectId(agentId)) return fail("কম্পিউটারটি সঠিক নয়।")

  const agent = await Agent.findOne({ _id: agentId, shopId: shop._id })
  if (!agent) return { ok: true, state: "expired", machineName: "", checkedIn: false, printers: 0 }
  if (!agent.tokenHash) {
    const expired = !agent.pairingExpiresAt || agent.pairingExpiresAt.getTime() < Date.now()
    return { ok: true, state: expired ? "expired" : "waiting", machineName: "", checkedIn: false, printers: 0 }
  }
  const printers = await Device.countDocuments({ agentId: agent._id })
  const checkedIn = printers > 0 || Boolean(agent.lastSeenAt && agent.pairedAt && agent.lastSeenAt > agent.pairedAt)
  return { ok: true, state: "paired", machineName: agent.machineName, checkedIn, printers }
}

export async function removeAgent(agentId: string): Promise<ActionResult> {
  const { shop } = await requireShop()
  if (!isValidObjectId(agentId)) return fail("কম্পিউটারটি সঠিক নয়।")

  const agent = await Agent.findOneAndDelete({ _id: agentId, shopId: shop._id })
  if (!agent) return fail("কম্পিউটারটি পাওয়া যায়নি।")
  await Device.deleteMany({ agentId: agent._id })
  // Jobs routed to this PC get re-routed to another one when it next checks in.
  await PrintJob.updateMany({ agentId: agent._id, status: "queued" }, { $unset: { deviceId: 1, agentId: 1 } })
  refresh()
  return { ok: true }
}

const deviceSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  color: z.boolean().optional(),
  enabled: z.boolean().optional(),
})

export async function updateDevice(deviceId: string, input: z.input<typeof deviceSchema>): Promise<ActionResult> {
  const { shop } = await requireShop()
  const parsed = deviceSchema.safeParse(input)
  if (!parsed.success || !isValidObjectId(deviceId)) return fail("তথ্য সঠিক নয়।")

  const device = await Device.findOne({ _id: deviceId, shopId: shop._id })
  if (!device) return fail("ডিভাইসটি পাওয়া যায়নি।")

  if (parsed.data.enabled && !device.enabled) {
    const enabledCount = await Device.countDocuments({ shopId: shop._id, enabled: true })
    if (enabledCount >= shop.deviceLimit) {
      return fail(`আপনার প্ল্যানে সর্বোচ্চ ${shop.deviceLimit.toLocaleString("bn-BD")}টি ডিভাইস চালু রাখা যায়। আরও যোগ করতে আমাদের সাথে যোগাযোগ করুন।`)
    }
  }

  device.set(parsed.data)
  await device.save()
  refresh()
  return { ok: true }
}

import { NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, parseBody } from "@/lib/api"
import { randomToken, sha256 } from "@/lib/crypto"
import { connectDb } from "@/lib/db"
import { Agent, Shop } from "@/lib/models"

const schema = z.object({
  code: z.string().trim().toUpperCase().min(4).max(16),
  machineName: z.string().trim().max(120).default(""),
  version: z.string().trim().max(40).default(""),
})

/** Exchanges a one-time pairing code (shown in the shop dashboard) for a permanent agent token. */
export async function POST(request: Request) {
  const body = await parseBody(request, schema)
  if (!body) return jsonError("অনুরোধটি সঠিক নয়")

  await connectDb()
  const token = randomToken()
  // One timestamp: the dashboard treats lastSeenAt > pairedAt as "the PC has checked in since pairing".
  const now = new Date()
  const agent = await Agent.findOneAndUpdate(
    { pairingCode: body.code, pairingExpiresAt: { $gt: now } },
    {
      $set: { tokenHash: sha256(token), machineName: body.machineName, version: body.version, pairedAt: now, lastSeenAt: now },
      $unset: { pairingCode: 1, pairingExpiresAt: 1 },
    },
    { returnDocument: "after" }
  )
  if (!agent) return jsonError("পেয়ারিং কোডটি ভুল অথবা মেয়াদোত্তীর্ণ", 404)

  const shop = await Shop.findById(agent.shopId)
  return NextResponse.json({ token, agentId: agent.id, shop: { name: shop?.name ?? "" } })
}

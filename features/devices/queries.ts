import "server-only"
import type { Types } from "mongoose"
import { onlineCutoff } from "@/lib/jobs"
import { Agent, Device } from "@/lib/models"

/** The shop's paired PCs (oldest first), each with its online state and printers, plus how many printers are on. */
export async function getShopDevices(shopId: Types.ObjectId) {
  const [agents, devices] = await Promise.all([
    Agent.find({ shopId, tokenHash: { $exists: true } }).sort({ pairedAt: 1 }),
    Device.find({ shopId }).sort({ createdAt: 1 }),
  ])
  const cutoff = onlineCutoff()
  return {
    agents: agents.map((agent) => ({
      agent,
      online: Boolean(agent.lastSeenAt && agent.lastSeenAt >= cutoff),
      devices: devices.filter((d) => d.agentId.equals(agent._id)),
    })),
    enabledCount: devices.filter((d) => d.enabled).length,
  }
}

export type AgentWithDevices = Awaited<ReturnType<typeof getShopDevices>>["agents"][number]

import { MonitorIcon, PrinterIcon } from "lucide-react"
import { IconTile } from "@/components/icon-tile"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDateTime } from "@/lib/constants"
import type { AgentWithDevices } from "../queries"
import { DeviceControls } from "./device-controls"
import { RemoveAgentButton } from "./remove-agent-button"
import { StatusDot } from "./status-dot"

/** One paired PC: its connection state and a table of its printers. */
export function AgentCard({ agent, online, devices: agentDevices }: AgentWithDevices) {
  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <IconTile icon={MonitorIcon} tone={online ? "blue" : "sky"} variant={online ? "solid" : "soft"} />
          <div className="min-w-0">
            <CardTitle className="truncate">{agent.machineName || "দোকানের কম্পিউটার"}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <StatusDot online={online} label={online ? "অনলাইন" : "অফলাইন"} />
              {agent.lastSeenAt && <span>শেষ সংযোগ: {formatDateTime(agent.lastSeenAt)}</span>}
              {agent.version && <span className="hidden sm:inline">এজেন্ট v{agent.version}</span>}
            </CardDescription>
          </div>
        </div>
        <CardAction>
          <RemoveAgentButton agentId={agent.id} name={agent.machineName || "দোকানের কম্পিউটার"} />
        </CardAction>
      </CardHeader>
      <CardContent>
        {agentDevices.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            এই কম্পিউটারে কোনো প্রিন্টার পাওয়া যায়নি। Windows-এ প্রিন্টার ইনস্টল করা আছে কিনা দেখুন।
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>প্রিন্টার</TableHead>
                <TableHead className="hidden md:table-cell">অবস্থা</TableHead>
                <TableHead>ধরন</TableHead>
                <TableHead className="text-right">চালু</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentDevices.map((device) => (
                <TableRow key={device.id}>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <IconTile icon={PrinterIcon} tone={device.color ? "violet" : "sky"} variant="soft" className="size-8" />
                      <div className="min-w-0">
                        <div className="max-w-36 truncate font-medium sm:max-w-none">{device.name}</div>
                        {device.name !== device.systemName && (
                          <div className="max-w-36 truncate text-xs text-muted-foreground sm:max-w-none">{device.systemName}</div>
                        )}
                        <div className="md:hidden">
                          {!device.present ? (
                            <span className="text-xs text-muted-foreground">পাওয়া যাচ্ছে না</span>
                          ) : (
                            <StatusDot online={online} label={online ? "প্রস্তুত" : "অফলাইন"} />
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {!device.present ? (
                      <Badge variant="outline">পাওয়া যাচ্ছে না</Badge>
                    ) : (
                      <StatusDot online={online} label={online ? "প্রস্তুত" : "অফলাইন"} />
                    )}
                  </TableCell>
                  <DeviceControls device={{ id: device.id, name: device.name, color: device.color, enabled: device.enabled }} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

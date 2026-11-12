"use client"

import { PencilIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { TableCell } from "@/components/ui/table"
import { useDeviceRow } from "../hooks/use-device-row"
import { useRenameDevice } from "../hooks/use-rename-device"

type DeviceProps = { id: string; name: string; color: boolean; enabled: boolean }

const colorOptions = [
  { value: "bw", label: "সাদা-কালো" },
  { value: "color", label: "রঙিন" },
]

/** The editable cells of a printer row: color type, rename and the on/off switch. */
export function DeviceControls({ device }: { device: DeviceProps }) {
  const { pending, setColor, setEnabled } = useDeviceRow(device.id)
  return (
    <>
      <TableCell>
        <div className="flex items-center gap-1">
          <Select
            items={colorOptions}
            value={device.color ? "color" : "bw"}
            onValueChange={(value) => setColor(value === "color")}
            disabled={pending}
          >
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {colorOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <RenameDeviceButton device={device} />
        </div>
      </TableCell>
      <TableCell className="pr-4 text-right">
        <Switch checked={device.enabled} disabled={pending} onCheckedChange={setEnabled} aria-label="প্রিন্টার চালু/বন্ধ" />
      </TableCell>
    </>
  )
}

function RenameDeviceButton({ device }: { device: DeviceProps }) {
  const { open, setOpen, name, setName, submit, pending } = useRenameDevice(device)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="নাম বদলান" />}>
        <PencilIcon />
      </DialogTrigger>
      <DialogContent>
        <form className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>প্রিন্টারের নাম বদলান</DialogTitle>
            <DialogDescription>ড্যাশবোর্ড ও গ্রাহকের স্ট্যাটাস পেজে এই নাম দেখা যাবে।</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={`name-${device.id}`}>নাম</FieldLabel>
            <Input id={`name-${device.id}`} value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
          </Field>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>বাতিল</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />} Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

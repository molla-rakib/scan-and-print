"use client"

import { useState } from "react"
import { CopyIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"
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
import { useAction } from "@/components/use-action"
import { AGENT_DOWNLOAD_URL } from "@/lib/constants"
import { createPairingCode, removeAgent, updateDevice } from "../actions"

export function PairPcButton() {
  const { pending, run } = useAction()
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState<string | null>(null)

  function generate() {
    setCode(null)
    run(createPairingCode, { onSuccess: (result) => setCode(result.code) })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) generate()
      }}
    >
      <DialogTrigger render={<Button />}>
        <PlusIcon /> কম্পিউটার যুক্ত করুন
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>দোকানের কম্পিউটার যুক্ত করুন</DialogTitle>
          <DialogDescription>যে কম্পিউটারে প্রিন্টারগুলো ইনস্টল করা আছে, সেখানে এই ধাপগুলো অনুসরণ করুন।</DialogDescription>
        </DialogHeader>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm">
          <li>
            কম্পিউটারে{" "}
            <a href={AGENT_DOWNLOAD_URL} download className="font-medium text-primary underline underline-offset-4">
              প্রিন্ট এজেন্ট ডাউনলোড
            </a>{" "}
            করে চালান, এটি নিজেই ইনস্টল হবে। Windows সতর্কবার্তা দেখালে &quot;More info&quot; → &quot;Run anyway&quot; চাপুন।
          </li>
          <li>এজেন্ট চালু করে নিচের পেয়ারিং কোডটি দিন।</li>
          <li>প্রিন্টারগুলো এই পেজে দেখা গেলে যেগুলো ব্যবহার করবেন সেগুলো চালু করুন।</li>
        </ol>
        <div className="flex flex-col items-center gap-2 rounded-lg bg-muted p-4">
          {code ? (
            <>
              <span className="font-mono text-3xl font-semibold tracking-[0.3em]">{code}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(code)
                  toast.success("কোড কপি হয়েছে")
                }}
              >
                <CopyIcon /> কপি করুন
              </Button>
            </>
          ) : (
            <Spinner className="size-6" />
          )}
          <span className="text-xs text-muted-foreground">কোডটি ১৫ মিনিট পর্যন্ত কার্যকর থাকবে।</span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={generate} disabled={pending}>
            নতুন কোড
          </Button>
          <DialogClose render={<Button />}>সম্পন্ন</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RemoveAgentButton({ agentId, name }: { agentId: string; name: string }) {
  const { pending, run } = useAction()
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="কম্পিউটার সরান" />}>
        <Trash2Icon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>&quot;{name}&quot; সরিয়ে ফেলবেন?</DialogTitle>
          <DialogDescription>
            এই কম্পিউটার ও এর সব প্রিন্টার আর অর্ডার পাবে না। আবার ব্যবহার করতে নতুন করে যুক্ত করতে হবে।
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>না</DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => run(() => removeAgent(agentId), { success: "কম্পিউটার সরানো হয়েছে", onSuccess: () => setOpen(false) })}
          >
            {pending && <Spinner />} সরিয়ে ফেলুন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type DeviceProps = { id: string; name: string; color: boolean; enabled: boolean }

const colorOptions = [
  { value: "bw", label: "সাদা-কালো" },
  { value: "color", label: "রঙিন" },
]

export function DeviceControls({ device }: { device: DeviceProps }) {
  const { pending, run } = useAction()
  return (
    <>
      <TableCell>
        <div className="flex items-center gap-1">
          <Select
            items={colorOptions}
            value={device.color ? "color" : "bw"}
            onValueChange={(value) => run(() => updateDevice(device.id, { color: value === "color" }))}
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
        <Switch
          checked={device.enabled}
          disabled={pending}
          onCheckedChange={(enabled) =>
            run(() => updateDevice(device.id, { enabled }), { success: enabled ? "প্রিন্টার চালু হয়েছে" : "প্রিন্টার বন্ধ হয়েছে" })
          }
          aria-label="প্রিন্টার চালু/বন্ধ"
        />
      </TableCell>
    </>
  )
}

function RenameDeviceButton({ device }: { device: DeviceProps }) {
  const { pending, run } = useAction()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(device.name)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="নাম বদলান" />}>
        <PencilIcon />
      </DialogTrigger>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => updateDevice(device.id, { name }), { success: "নাম বদলানো হয়েছে", onSuccess: () => setOpen(false) })
          }}
        >
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

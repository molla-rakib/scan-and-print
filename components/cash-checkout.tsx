"use client"

import { useRef, useState } from "react"
import { BanknoteIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { formatTaka, normalizeBdPhone } from "@/lib/constants"

export type CashCustomer = { name: string; phone: string }
/** Which details the shop asks for (set in Settings → পেমেন্ট); shown fields are required. */
export type CashFields = { name: boolean; phone: boolean }

const STORAGE_KEY = "scan-print:customer"

function savedCustomer(): CashCustomer {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
    return { name: saved?.name ?? "", phone: saved?.phone ?? "" }
  } catch {
    return { name: "", phone: "" }
  }
}

/**
 * "কাউন্টারে ক্যাশ দেব" button. Cash orders print without the shop's approval, so the first tap asks
 * for the customer's name and/or mobile number (whichever the shop asks for, all required); the second
 * places the order.
 */
export function CashCheckout({
  amount,
  fields,
  pending,
  disabled,
  outline,
  onSubmit,
}: {
  amount: number
  fields: CashFields
  pending: boolean
  disabled: boolean
  /** Secondary style when another payment button is shown above. */
  outline?: boolean
  onSubmit: (customer: CashCustomer) => void
}) {
  const [open, setOpen] = useState(false)
  const [customer, setCustomer] = useState<CashCustomer>({ name: "", phone: "" })
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)

  function openForm() {
    setCustomer(savedCustomer())
    setOpen(true)
    requestAnimationFrame(() => (fields.name ? nameRef : phoneRef).current?.focus())
  }

  function submit() {
    const name = customer.name.trim()
    const phone = normalizeBdPhone(customer.phone)
    const next = {
      name: fields.name && name.length < 2 ? "আপনার নাম লিখুন" : undefined,
      phone: fields.phone && !phone ? "সঠিক মোবাইল নম্বর লিখুন (যেমন ০১৭১২৩৪৫৬৭৮)" : undefined,
    }
    setErrors(next)
    if (next.name || next.phone) return
    const saved = savedCustomer()
    const entered = { name: fields.name ? name : saved.name, phone: fields.phone ? (phone ?? "") : saved.phone }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entered))
    } catch {}
    onSubmit({ name: fields.name ? name : "", phone: fields.phone ? (phone ?? "") : "" })
  }

  return (
    <>
      {open && (
        <form
          id="cash-form"
          noValidate
          className="flex w-full flex-col gap-3 rounded-xl border bg-muted/40 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <p className="text-sm text-muted-foreground">
            অর্ডারটি সাথে সাথে প্রিন্ট হবে। কাউন্টারে টোকেন দেখিয়ে {formatTaka(amount)} দিন।
          </p>
          {fields.name && (
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="cash-name">আপনার নাম</FieldLabel>
              <Input
                ref={nameRef}
                id="cash-name"
                autoComplete="name"
                maxLength={80}
                value={customer.name}
                aria-invalid={!!errors.name}
                disabled={pending}
                onChange={(e) => {
                  setCustomer({ ...customer, name: e.target.value })
                  setErrors({ ...errors, name: undefined })
                }}
              />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </Field>
          )}
          {fields.phone && (
            <Field data-invalid={!!errors.phone}>
              <FieldLabel htmlFor="cash-phone">মোবাইল নম্বর</FieldLabel>
              <Input
                ref={phoneRef}
                id="cash-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="01XXXXXXXXX"
                maxLength={20}
                value={customer.phone}
                aria-invalid={!!errors.phone}
                disabled={pending}
                onChange={(e) => {
                  setCustomer({ ...customer, phone: e.target.value })
                  setErrors({ ...errors, phone: undefined })
                }}
              />
              {errors.phone && <FieldError>{errors.phone}</FieldError>}
            </Field>
          )}
        </form>
      )}
      <Button
        size="lg"
        type={open ? "submit" : "button"}
        form={open ? "cash-form" : undefined}
        variant={outline && !open ? "outline" : "default"}
        className="h-12 w-full text-base"
        disabled={disabled}
        onClick={
          open
            ? undefined
            : (e) => {
                // The button becomes the form's submit button on this same click; don't submit yet.
                e.preventDefault()
                openForm()
              }
        }
      >
        {pending ? <Spinner /> : <BanknoteIcon />} {open ? "অর্ডার দিন, ক্যাশে টাকা দেব" : "কাউন্টারে ক্যাশ দেব"}
      </Button>
    </>
  )
}

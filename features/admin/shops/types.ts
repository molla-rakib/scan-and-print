export type ShopDiscount = { kind: "percent" | "fixed"; value: number; until: string; note: string }

/** What the shop row's action menu and dialogs need to know about a shop. */
export type AdminShop = {
  id: string
  name: string
  slug: string
  deviceLimit: number
  suspended: boolean
  /** Full monthly price and the price after the shop's discount. */
  baseFee: number
  monthlyFee: number
  discount: ShopDiscount | null
}

/** What `days` of service cost at the shop's (discounted) monthly fee, pro-rated by 30-day months. */
export const suggestedAmount = (days: number, monthlyFee: number) => Math.round((monthlyFee * days) / 30)

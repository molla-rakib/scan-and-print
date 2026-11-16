export type ProfileSettings = { name: string; slug: string; address: string; phone: string }

export type Prices = { bw: number; color: number; bwSheet: number; colorSheet: number }
export type PaperPrices = Prices & { enabled: boolean }
export type Pricing = Prices & { colorDuplex: boolean; paperSizes: { Legal: PaperPrices; A3: PaperPrices } }

export type CashSettings = { enabled: boolean; askName: boolean; askPhone: boolean }

export type BkashInitial = {
  enabled: boolean
  sandbox: boolean
  username: string
  appKey: string
  hasPassword: boolean
  hasAppSecret: boolean
}

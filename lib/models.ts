import "server-only"
import mongoose, { Schema, type HydratedDocument, type InferSchemaType, type Model } from "mongoose"
import { JOB_STATUSES, PAPER_SIZES } from "@/lib/constants"

const { ObjectId } = Schema.Types

function defineModel<T extends Schema>(name: string, schema: T) {
  type Doc = InferSchemaType<T>
  return (mongoose.models[name] as Model<Doc>) ?? mongoose.model<Doc>(name, schema)
}

/* ---------------------------------- Users --------------------------------- */

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
)

export const User = defineModel("User", userSchema)
export type UserDoc = HydratedDocument<InferSchemaType<typeof userSchema>>

/* ---------------------------------- Shops --------------------------------- */

const pricingSchema = new Schema(
  {
    bw: { type: Number, default: 3 },
    color: { type: Number, default: 10 },
    // Price per sheet printed on both sides (two pages). Unset means the same as one side.
    bwSheet: { type: Number },
    colorSheet: { type: Number },
    // Color prints on one side only unless the owner turns this on.
    colorDuplex: { type: Boolean, default: false },
  },
  { _id: false }
)

// An extra paper size the owner can offer (A4 always uses `pricing`).
const paperSizeSchema = (bw: number, color: number) =>
  new Schema(
    {
      enabled: { type: Boolean, default: false },
      bw: { type: Number, default: bw },
      color: { type: Number, default: color },
      // Per sheet printed on both sides; unset means the same as one side.
      bwSheet: { type: Number },
      colorSheet: { type: Number },
    },
    { _id: false }
  )

const paperSizesSchema = new Schema(
  {
    Legal: { type: paperSizeSchema(4, 12), default: () => ({}), required: true },
    A3: { type: paperSizeSchema(10, 30), default: () => ({}), required: true },
  },
  { _id: false }
)

const bkashSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    sandbox: { type: Boolean, default: true },
    username: { type: String, default: "" },
    appKey: { type: String, default: "" },
    // Encrypted with ENCRYPTION_KEY (see lib/crypto.ts).
    passwordEnc: { type: String, default: "" },
    appSecretEnc: { type: String, default: "" },
  },
  { _id: false }
)

const cashSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    // Which customer details a cash order asks for (both required when shown). At least one stays on.
    askName: { type: Boolean, default: true },
    askPhone: { type: Boolean, default: true },
  },
  { _id: false }
)

const shopSchema = new Schema(
  {
    ownerId: { type: ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    address: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    // A4 prices in BDT: per page on one side, per sheet on both sides (see PaperPrices).
    pricing: { type: pricingSchema, default: () => ({}), required: true },
    // Legal and A3: offered only when enabled, each with its own prices.
    paperSizes: { type: paperSizesSchema, default: () => ({}), required: true },
    bkash: { type: bkashSchema, default: () => ({}), required: true },
    // Cash jobs print right away; the customer's name and/or phone tell the shop who owes the money.
    cash: { type: cashSchema, default: () => ({}), required: true },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    // Billing: the shop pays per enabled device.
    deviceLimit: { type: Number, default: 1 },
    paidUntil: { type: Date, required: true },
    tokenSeq: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export const Shop = defineModel("Shop", shopSchema)
export type ShopDoc = HydratedDocument<InferSchemaType<typeof shopSchema>>

/* --------------------------- Agents (shop PCs) ---------------------------- */

const agentSchema = new Schema(
  {
    shopId: { type: ObjectId, ref: "Shop", required: true, index: true },
    machineName: { type: String, default: "" },
    version: { type: String, default: "" },
    pairingCode: { type: String, index: { unique: true, sparse: true } },
    pairingExpiresAt: { type: Date },
    tokenHash: { type: String, index: { unique: true, sparse: true } },
    pairedAt: { type: Date },
    lastSeenAt: { type: Date },
  },
  { timestamps: true }
)

export const Agent = defineModel("Agent", agentSchema)
export type AgentDoc = HydratedDocument<InferSchemaType<typeof agentSchema>>

/* ------------------------- Devices (printers/MFPs) ------------------------ */

const deviceSchema = new Schema(
  {
    shopId: { type: ObjectId, ref: "Shop", required: true, index: true },
    agentId: { type: ObjectId, ref: "Agent", required: true },
    // Name of the printer as installed in Windows.
    systemName: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: Boolean, default: false },
    duplex: { type: Boolean, default: false },
    // Paper sizes the driver supports (of PAPER_SIZES). Empty when the agent doesn't report them.
    paperSizes: { type: [String], default: [] },
    // Only enabled devices receive jobs; enabled devices count against the shop's device limit.
    enabled: { type: Boolean, default: false },
    // Whether the printer was present in the agent's last heartbeat.
    present: { type: Boolean, default: true },
    state: { type: String, default: "idle" },
  },
  { timestamps: true }
)
deviceSchema.index({ agentId: 1, systemName: 1 }, { unique: true })

export const Device = defineModel("Device", deviceSchema)
export type DeviceDoc = HydratedDocument<InferSchemaType<typeof deviceSchema>>

/* ---------------------------------- Orders -------------------------------- */

// What the customer pays for: one or more files, one token, one payment.
const orderSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true },
    shopId: { type: ObjectId, ref: "Shop", required: true },
    token: { type: Number, required: true },
    // Payment progress only; the printing status comes from the order's jobs.
    status: { type: String, enum: ["draft", "pending_payment", "placed"], default: "draft" },
    amount: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ["bkash", "cash"] },
    // Cash orders: who to ask for the money. Which fields are asked depends on the shop's cash settings.
    customer: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    bkash: {
      paymentId: { type: String },
      trxId: { type: String },
      payer: { type: String },
    },
    placedAt: { type: Date },
    // Set only until the order is placed; MongoDB removes abandoned drafts automatically.
    draftExpiresAt: { type: Date, index: { expires: 0 } },
  },
  { timestamps: true }
)
orderSchema.index({ shopId: 1, status: 1, createdAt: -1 })
orderSchema.index({ "bkash.paymentId": 1 }, { sparse: true })

export const Order = defineModel("Order", orderSchema)
export type OrderDoc = HydratedDocument<InferSchemaType<typeof orderSchema>>

/* -------------------------------- Print jobs ------------------------------ */

// One file of an order, printed on one device.
const printJobSchema = new Schema(
  {
    orderId: { type: ObjectId, ref: "Order", required: true, index: true },
    shopId: { type: ObjectId, ref: "Shop", required: true },
    // Copied from the order so the agent and dashboard can show it.
    token: { type: Number, required: true },
    fileKey: { type: String, required: true, unique: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileDeleted: { type: Boolean, default: false },
    pageCount: { type: Number, required: true },
    // Selected page numbers (1-based); empty means every page.
    pages: { type: [Number], default: [] },
    // Pages that will print (selected pages, or pageCount).
    printPages: { type: Number, default: 0 },
    colorMode: { type: String, enum: ["bw", "color"], default: "bw" },
    duplex: { type: Boolean, default: false },
    paperSize: { type: String, enum: PAPER_SIZES, default: "A4" },
    copies: { type: Number, default: 1 },
    // Price per page, or per sheet when printed on both sides.
    pricePerPage: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    // Copied from the order for the dashboard's cash totals.
    paymentMethod: { type: String, enum: ["bkash", "cash"] },
    status: { type: String, enum: JOB_STATUSES, default: "draft" },
    deviceId: { type: ObjectId, ref: "Device" },
    agentId: { type: ObjectId, ref: "Agent" },
    error: { type: String },
    queuedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    // Set only while a job is a draft; MongoDB removes abandoned drafts automatically.
    draftExpiresAt: { type: Date, index: { expires: 0 } },
  },
  { timestamps: true }
)
printJobSchema.index({ shopId: 1, status: 1, createdAt: -1 })
printJobSchema.index({ deviceId: 1, status: 1, queuedAt: 1 })

export const PrintJob = defineModel("PrintJob", printJobSchema)
export type PrintJobDoc = HydratedDocument<InferSchemaType<typeof printJobSchema>>

/* ------------------------- Subscription payments ------------------------- */

// Money a shop paid us, recorded by the admin when extending the subscription. The admin's
// monthly income adds these up.
const subscriptionPaymentSchema = new Schema(
  {
    shopId: { type: ObjectId, ref: "Shop", required: true, index: true },
    amount: { type: Number, required: true },
    days: { type: Number, required: true },
    // The shop's new end date after this payment.
    paidUntil: { type: Date, required: true },
    recordedBy: { type: String, default: "" },
  },
  { timestamps: true }
)
subscriptionPaymentSchema.index({ createdAt: -1 })

export const SubscriptionPayment = defineModel("SubscriptionPayment", subscriptionPaymentSchema)

/* ------------------------------ Upload pieces ------------------------------ */

// Large uploads arrive in pieces (Vercel limits request bodies to 4.5 MB). Pieces wait here until the
// final request joins them; unused ones expire after two hours.
const uploadPartSchema = new Schema({
  uploadId: { type: String, required: true },
  shopId: { type: ObjectId, ref: "Shop", required: true },
  index: { type: Number, required: true },
  data: { type: Buffer, required: true },
  createdAt: { type: Date, default: Date.now, expires: 2 * 60 * 60 },
})
uploadPartSchema.index({ uploadId: 1, index: 1 }, { unique: true })

export const UploadPart = defineModel("UploadPart", uploadPartSchema)

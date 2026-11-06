import "server-only"
import mongoose, { Schema, type HydratedDocument, type InferSchemaType, type Model } from "mongoose"
import { JOB_STATUSES } from "@/lib/constants"

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

const cashSchema = new Schema({ enabled: { type: Boolean, default: true } }, { _id: false })

const shopSchema = new Schema(
  {
    ownerId: { type: ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    address: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    // Price per printed page, in BDT.
    pricing: { type: pricingSchema, default: () => ({}), required: true },
    bkash: { type: bkashSchema, default: () => ({}), required: true },
    // Cash jobs always wait for the owner to approve before printing.
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

/* -------------------------------- Print jobs ------------------------------ */

const printJobSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true },
    shopId: { type: ObjectId, ref: "Shop", required: true },
    token: { type: Number, required: true },
    fileKey: { type: String, required: true, unique: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileDeleted: { type: Boolean, default: false },
    pageCount: { type: Number, required: true },
    colorMode: { type: String, enum: ["bw", "color"], default: "bw" },
    copies: { type: Number, default: 1 },
    pricePerPage: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ["bkash", "cash"] },
    // Required for cash orders, which print without approval: who to ask for the money.
    customer: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    status: { type: String, enum: JOB_STATUSES, default: "draft" },
    deviceId: { type: ObjectId, ref: "Device" },
    agentId: { type: ObjectId, ref: "Agent" },
    bkash: {
      paymentId: { type: String },
      trxId: { type: String },
      payer: { type: String },
    },
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
printJobSchema.index({ "bkash.paymentId": 1 }, { sparse: true })

export const PrintJob = defineModel("PrintJob", printJobSchema)
export type PrintJobDoc = HydratedDocument<InferSchemaType<typeof printJobSchema>>

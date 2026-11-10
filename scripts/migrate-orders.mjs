// One-time migration to multi-file orders (2026-11-10). Safe to run more than once.
//
//   node --env-file=.env scripts/migrate-orders.mjs
//
// Before, each print job was a whole order (token, payment, customer). Now an Order holds those and
// each file is a print job with orderId. This script:
//   1. drops print job indexes the old schema created (a unique publicId index would reject new jobs);
//   2. creates an Order for every print job that has no orderId and moves the payment fields onto it.

import { randomBytes } from "node:crypto"
import mongoose from "mongoose"

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error("MONGODB_URI is not set. Run: node --env-file=.env scripts/migrate-orders.mjs")
  process.exit(1)
}

await mongoose.connect(uri)
const db = mongoose.connection.db
const jobs = db.collection("printjobs")
const orders = db.collection("orders")

for (const name of ["publicId_1", "bkash.paymentId_1"]) {
  try {
    await jobs.dropIndex(name)
    console.log(`Dropped printjobs index ${name}`)
  } catch (error) {
    if (!/index not found|ns not found/i.test(error.message)) throw error
  }
}

let migrated = 0
for await (const job of jobs.find({ orderId: { $exists: false } })) {
  const paymentStatus = ["draft", "pending_payment"].includes(job.status) ? job.status : "placed"
  const order = {
    publicId: job.publicId ?? randomBytes(9).toString("base64url"),
    shopId: job.shopId,
    token: job.token,
    status: paymentStatus,
    amount: job.amount ?? 0,
    ...(job.paymentMethod ? { paymentMethod: job.paymentMethod } : {}),
    ...(job.customer ? { customer: job.customer } : {}),
    ...(job.bkash ? { bkash: job.bkash } : {}),
    ...(job.queuedAt ? { placedAt: job.queuedAt } : {}),
    ...(job.draftExpiresAt ? { draftExpiresAt: job.draftExpiresAt } : {}),
    createdAt: job.createdAt ?? new Date(),
    updatedAt: job.updatedAt ?? new Date(),
  }
  const { insertedId } = await orders.insertOne(order)
  await jobs.updateOne(
    { _id: job._id },
    {
      $set: { orderId: insertedId, pages: [], printPages: job.pageCount, duplex: false, paperSize: "A4" },
      $unset: { publicId: "", customer: "", bkash: "" },
    }
  )
  migrated++
}

console.log(`Migrated ${migrated} print job(s) to orders.`)
await mongoose.disconnect()

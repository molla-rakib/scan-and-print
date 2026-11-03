import "server-only"
import mongoose from "mongoose"
import { env } from "@/lib/env"

type MongooseCache = { promise: Promise<typeof mongoose> | null }

// Reuse one connection across hot reloads in development.
const globalCache = globalThis as unknown as { __mongoose?: MongooseCache }
const cache = (globalCache.__mongoose ??= { promise: null })

export async function connectDb() {
  if (!cache.promise) {
    cache.promise = mongoose.connect(env.mongodbUri, { bufferCommands: false }).catch((error) => {
      cache.promise = null
      throw error
    })
  }
  return cache.promise
}

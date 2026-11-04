import "server-only"

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

function number(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

// Getters so a missing variable only fails when it is actually used, not at build time.
export const env = {
  get appUrl() {
    return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")
  },
  get sessionSecret() {
    return required("SESSION_SECRET")
  },
  get encryptionKey() {
    return required("ENCRYPTION_KEY")
  },
  get adminEmails() {
    return (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  },
  get mongodbUri() {
    return required("MONGODB_URI")
  },
  get google() {
    return {
      clientId: required("GOOGLE_CLIENT_ID"),
      clientSecret: required("GOOGLE_CLIENT_SECRET"),
    }
  },
  get maxUploadBytes() {
    return number("MAX_UPLOAD_MB", 50) * 1024 * 1024
  },
  get deviceMonthlyFee() {
    return number("DEVICE_MONTHLY_FEE", 300)
  },
  get trialDays() {
    return number("TRIAL_DAYS", 14)
  },
  get trialDeviceLimit() {
    return number("TRIAL_DEVICE_LIMIT", 1)
  },
}

// Search and pagination for the dashboard tables. The state lives in the URL (`?q=…&page=…`), so a
// refresh, a shared link or the back button keeps it. A page with two tables gives each its own `prefix`.

/** Rows per table page. */
export const PAGE_SIZE = 20

type RawParams = Record<string, string | string[] | undefined>

export type ListParams = { q: string; page: number; skip: number; limit: number }

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? ""

/** Reads `<prefix>q` and `<prefix>page` from a page's searchParams. */
export function readListParams(params: RawParams, prefix = ""): ListParams {
  const q = first(params[`${prefix}q`]).trim().slice(0, 100)
  const page = Math.max(1, Math.floor(Number(first(params[`${prefix}page`])) || 1))
  return { q, page, skip: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }
}

/** Escapes text for use inside a MongoDB `$regex`, so a search is always a plain "contains". */
export function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Case-insensitive "contains" condition for a search box, or undefined when the box is empty. */
export function containsRegex(q: string) {
  return q ? { $regex: escapeRegex(q), $options: "i" } : undefined
}

/** Number of pages for `total` rows (at least 1). */
export function pageCount(total: number) {
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
}

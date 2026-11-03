/** Turns a shop name into a URL-safe link, e.g. "Rahim Print" → "rahim-print". */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 40)
}

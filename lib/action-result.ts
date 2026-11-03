/** Return type of server actions. Extra success fields can be added via `T`. */
export type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string }

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error }
}

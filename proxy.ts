import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE } from "@/lib/session-cookie"

// Fast, optimistic check only: pages and actions still verify the session themselves.
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding"],
}

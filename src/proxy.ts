import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const isOldDomain = /(?:www\.)?agentbabygirl\.com/i.test(host);

  if (!isOldDomain) {
    return NextResponse.next();
  }

  const ua = request.headers.get("user-agent") || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  if (isIOS) {
    const url = request.nextUrl;
    return NextResponse.redirect(
      `https://www.abgs.app${url.pathname}${url.search}`,
      301
    );
  }

  // Android/Desktop: serve the app normally
  return NextResponse.next();
}

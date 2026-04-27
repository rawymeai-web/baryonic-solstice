import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Protect /admin route ---
  if (pathname.startsWith("/admin")) {
    // Check for Supabase session cookie (set by Supabase Auth)
    const hasSession =
      req.cookies.has("sb-access-token") ||
      req.cookies.has(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0]}-auth-token`) ||
      // New Supabase cookie format
      Array.from(req.cookies.getAll()).some(c => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

    if (!hasSession) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // --- CORS for API routes ---
  const res = req.method === "OPTIONS"
    ? new NextResponse(null, { status: 200 })
    : NextResponse.next();

  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, DELETE, PATCH, POST, PUT, OPTIONS");
  res.headers.set(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};

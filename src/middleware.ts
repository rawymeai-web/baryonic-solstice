import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // If it's an OPTIONS request, return a 200 response immediately.
  // Otherwise, continue the request chain.
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
  matcher: "/api/:path*",
};

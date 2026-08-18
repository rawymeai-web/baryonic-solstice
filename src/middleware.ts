import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  let res = NextResponse.next();

  // --- Protect /admin route ---
  if (pathname.startsWith("/admin")) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              req.cookies.set(name, value);
              res.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // --- CORS for API routes ---
  let finalRes = res;
  if (req.method === "OPTIONS") {
    finalRes = new NextResponse(null, { status: 200 });
  }

  finalRes.headers.set("Access-Control-Allow-Origin", "*");
  finalRes.headers.set("Access-Control-Allow-Methods", "GET, DELETE, PATCH, POST, PUT, OPTIONS");
  finalRes.headers.set(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  return finalRes;
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};

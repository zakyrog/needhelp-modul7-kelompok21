import { createClient } from "./utils/supabase/middleware.js";
import { NextResponse } from "next/server";

const PROTECTED_ROUTES = ["/buat-postingan", "/aktivitas", "/rating"];

export async function middleware(request) {
  const { supabase, response } = createClient(request);

  if (!supabase) {
    return response;
  }

  // Refresh dan validasi sesi
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

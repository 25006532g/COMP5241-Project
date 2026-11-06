import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicConfig } from "../public-config";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const settings = publicConfig(process.env);
  const pathname = request.nextUrl.pathname;
  const privatePath = pathname === "/" || ["/dashboard", "/onboarding", "/diagnostic", "/profile", "/progress", "/catalog", "/courses", "/studio", "/reports", "/paths", "/interviews-v2", "/interviews", "/reflections", "/teaching", "/admin", "/api"].some(path => pathname === path || pathname.startsWith(`${path}/`));
  if (!settings) {
    if (!privatePath) return response;
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Learning service is unavailable. Please try again later." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return new NextResponse(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Learning space unavailable</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f3ed;color:#17201d;font-family:"Avenir Next","Segoe UI",sans-serif}main{width:min(100% - 48px,540px);border-top:5px solid #f2c84b;padding:32px 0}h1{font:normal 36px/1.15 Georgia,serif}p{line-height:1.6;color:#46534d}a{display:inline-block;margin-top:12px;padding:12px 18px;background:#17201d;color:white;text-decoration:none;border-radius:4px}a:focus-visible{outline:3px solid #b14529;outline-offset:3px}</style></head>
<body><main><h1>Learning space unavailable</h1><p>We cannot connect to the learning service right now. Please try again shortly. If this continues, contact the site administrator.</p><a href="/">Try again</a></main></body></html>`, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }

  const supabase = createServerClient(settings.supabaseUrl, settings.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (privatePath && !user) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const loginUrl = new URL("/login", settings.siteOrigin);
    loginUrl.searchParams.set("message", "Please log in to view your private learning space.");
    const denied = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach(cookie => denied.cookies.set(cookie));
    return denied;
  }

  return response;
}
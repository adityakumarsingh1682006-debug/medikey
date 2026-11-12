import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL("/dashboard", request.url),
    { status: 303 }
  );

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.signInWithPassword({
    email: process.env.MEDIKEY_DEMO_EMAIL!,
    password: process.env.MEDIKEY_DEMO_PASSWORD!,
  });

  if (error) {
    return NextResponse.redirect(
      new URL("/?login=failed", request.url),
      { status: 303 }
    );
  }

  return response;
}
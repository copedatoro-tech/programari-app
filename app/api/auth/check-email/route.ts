import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json({ exists: false, type: null });
    }

    const [{ data: profile }, { data: staff }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle(),
      supabaseAdmin
        .from("staff")
        .select("id, auth_user_id")
        .eq("email", normalizedEmail)
        .not("auth_user_id", "is", null)
        .maybeSingle(),
    ]);

    if (profile?.id) {
      return NextResponse.json({ exists: true, type: "admin" });
    }

    if (staff?.id) {
      return NextResponse.json({ exists: true, type: "specialist" });
    }

    return NextResponse.json({ exists: false, type: null });
  } catch (error: any) {
    console.error("SERVER ERROR (auth check-email):", error?.message);
    return NextResponse.json({ exists: null, type: null }, { status: 500 });
  }
}

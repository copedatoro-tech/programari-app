import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Neautentificat." }, { status: 401 });
    }

    const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(token);
    if (callerError || !callerData?.user) {
      return NextResponse.json({ error: "Sesiune invalidă." }, { status: 401 });
    }
    const callerId = callerData.user.id;

    const { staffId } = await request.json();
    if (!staffId) {
      return NextResponse.json({ error: "Date lipsă." }, { status: 400 });
    }

    const { data: staffRow, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("id, user_id, auth_user_id")
      .eq("id", staffId)
      .single();

    if (staffError || !staffRow) {
      return NextResponse.json({ error: "Specialist inexistent." }, { status: 404 });
    }
    if (staffRow.user_id !== callerId) {
      return NextResponse.json({ error: "Nu ai dreptul să gestionezi acest specialist." }, { status: 403 });
    }
    if (!staffRow.auth_user_id) {
      return NextResponse.json({ error: "Acest specialist nu are un cont activ." }, { status: 404 });
    }

    const authUserId = staffRow.auth_user_id;

    // ✅ 1. Eliberăm legătura din staff — coloana auth_user_id are o cheie străină
    // către auth.users, iar Supabase refuză ștergerea userului cât timp mai există
    // o referință activă
    const { error: unlinkError } = await supabaseAdmin
      .from("staff")
      .update({ auth_user_id: null })
      .eq("id", staffId);

    if (unlinkError) {
      return NextResponse.json({ error: unlinkError.message }, { status: 500 });
    }

    // ✅ 2. Ștergem și eventualul rând din "profiles" creat automat la înregistrarea
    // contului (dacă există un trigger de auto-creare profil pentru orice user nou) —
    // altfel acel rând ține și el o referință către auth.users și blochează ștergerea
    const { error: profileDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", authUserId);

    if (profileDeleteError) {
      console.error("Avertisment: nu am putut șterge rândul din profiles (poate nu exista):", profileDeleteError.message);
    }

    // ✅ 3. Abia acum ștergem efectiv contul de autentificare
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
    if (deleteError) {
      // dacă ștergerea userului eșuează, refacem legătura din staff, ca datele
      // să rămână consistente (nu pierdem asocierea dacă operația a eșuat)
      await supabaseAdmin.from("staff").update({ auth_user_id: authUserId }).eq("id", staffId);
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("SERVER ERROR (staff delete-account):", error?.message);
    return NextResponse.json({ error: "Eroare internă." }, { status: 500 });
  }
}
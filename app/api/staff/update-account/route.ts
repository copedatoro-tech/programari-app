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

    const { staffId, newEmail, newPassword } = await request.json();
    if (!staffId || (!newEmail && !newPassword)) {
      return NextResponse.json({ error: "Nimic de actualizat." }, { status: 400 });
    }
    if (newPassword && newPassword.length < 6) {
      return NextResponse.json({ error: "Parola trebuie să aibă minim 6 caractere." }, { status: 400 });
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
      return NextResponse.json({ error: "Acest specialist nu are încă un cont." }, { status: 404 });
    }

    const updatePayload: Record<string, any> = {};
    if (newEmail) { updatePayload.email = newEmail; updatePayload.email_confirm = true; }
    if (newPassword) updatePayload.password = newPassword;

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      staffRow.auth_user_id,
      updatePayload
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // ✅ Sincronizăm și email-ul afișat în tabela staff, ca cele două să nu rămână diferite
    if (newEmail) {
      await supabaseAdmin.from("staff").update({ email: newEmail }).eq("id", staffId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("SERVER ERROR (staff update-account):", error?.message);
    return NextResponse.json({ error: "Eroare internă." }, { status: 500 });
  }
}
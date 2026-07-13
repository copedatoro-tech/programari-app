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

    const { staffId, email, tempPassword } = await request.json();
    if (!staffId || !email || !tempPassword) {
      return NextResponse.json({ error: "Date lipsă." }, { status: 400 });
    }
    if (tempPassword.length < 6) {
      return NextResponse.json({ error: "Parola trebuie să aibă minim 6 caractere." }, { status: 400 });
    }

    // ✅ Portalul de specialist e disponibil DOAR pentru planul Chronos Team —
    // verificăm planul apelantului (administratorul), nu al specialistului
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("plan_type, trial_started_at")
      .eq("id", callerId)
      .maybeSingle();

    const plan = (callerProfile?.plan_type || "").toUpperCase();
    const trialActive = !!callerProfile?.trial_started_at &&
      (Date.now() - new Date(callerProfile.trial_started_at).getTime() < 10 * 24 * 60 * 60 * 1000);
    const hasAccess = trialActive || plan.includes("TEAM");

    if (!hasAccess) {
      return NextResponse.json({ error: "Portalul de specialist este disponibil doar pentru planul Chronos Team." }, { status: 403 });
    }

    // ✅ Confirmăm că specialistul aparține salonului celui care face cererea
    const { data: staffRow, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("id, user_id, name, auth_user_id")
      .eq("id", staffId)
      .single();

    if (staffError || !staffRow) {
      return NextResponse.json({ error: "Specialist inexistent." }, { status: 404 });
    }
    if (staffRow.user_id !== callerId) {
      return NextResponse.json({ error: "Nu ai dreptul să gestionezi acest specialist." }, { status: 403 });
    }
    if (staffRow.auth_user_id) {
      return NextResponse.json({ error: "Acest specialist are deja un cont activ." }, { status: 409 });
    }

    // ✅ Creăm contul de autentificare al specialistului (email + parolă temporară)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (createError || !newUser?.user) {
      return NextResponse.json({ error: createError?.message || "Eroare la crearea contului." }, { status: 400 });
    }

    // ✅ Legăm noul cont de rândul specialistului
    const { error: linkError } = await supabaseAdmin
      .from("staff")
      .update({ auth_user_id: newUser.user.id })
      .eq("id", staffId);

    if (linkError) {
      // dacă legarea eșuează, ștergem contul creat, ca să nu rămână orfan
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId: newUser.user.id });
  } catch (error: any) {
    console.error("SERVER ERROR (staff create-account):", error?.message);
    return NextResponse.json({ error: "Eroare internă." }, { status: 500 });
  }
}
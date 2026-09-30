import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function digitsOnly(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const country = String(body?.country || "RO").toUpperCase();
  const taxId = digitsOnly(body?.taxId);

  if (!taxId) {
    return NextResponse.json({ errorKey: "lookupMissingTaxId" }, { status: 400 });
  }

  if (country !== "RO") {
    return NextResponse.json({
      supported: false,
      errorKey: "lookupUnsupportedCountry",
    }, { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch("https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ cui: Number(taxId), data: todayKey() }]),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json({ error: data?.message || null, errorKey: "lookupProviderError" }, { status: 502 });
    }

    const company = data?.found?.[0]?.date_generale;
    if (!company?.denumire) {
      return NextResponse.json({ errorKey: "lookupNotFound" }, { status: 404 });
    }

    return NextResponse.json({
      supported: true,
      company: {
        legalName: company.denumire || "",
        taxId: String(company.cui || taxId),
        registeredAddress: company.adresa || "",
        registrationNumber: company.nrRegCom || "",
        caen: company.cod_CAEN || "",
        status: company.stare_inregistrare || "",
        country: "RO",
      },
    });
  } catch (error: any) {
    const errorKey = error?.name === "AbortError" ? "lookupTimeout" : "lookupUnavailable";
    return NextResponse.json({ errorKey }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${baseUrl}/login`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  if (profile?.stripe_account_id) {
    // Verificăm direct la Stripe dacă salonul chiar a terminat completarea datelor
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    const isReady = account.charges_enabled && account.details_submitted;

    await supabase
      .from("profiles")
      .update({ stripe_onboarded: isReady })
      .eq("id", user.id);
  }

  // Îl trimitem înapoi la pagina de setări, cu un semnal în URL
  return NextResponse.redirect(`${baseUrl}/settings?stripe=connected`);
}
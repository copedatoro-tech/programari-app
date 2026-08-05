import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adminId, priceId, customerEmail } = body;
    if (!adminId || !priceId) return NextResponse.json({ error: "Missing data." }, { status: 400 });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_account_id, stripe_onboarded, slug")
      .eq("id", adminId)
      .single();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (request.headers.get("origin") || "");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: adminId,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: customerEmail || undefined,
      subscription_data: profile?.stripe_account_id ? { transfer_data: { destination: profile.stripe_account_id } } : undefined,
      success_url: `${baseUrl}/resurse?subscription=success`,
      cancel_url: `${baseUrl}/resurse?subscription=cancelled`,
      metadata: { adminId },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Eroare creare checkout subscription:", err.message);
    return NextResponse.json({ error: err.message || "Eroare internă." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  try {
    const supabase = createServiceClient();
    const body = await req.json();
    const { quote_id, status, amount, scheduled_date, scheduled_time, notes } = body;

    const { data: quote } = await supabase
      .from("provider_quotes")
      .select("id, status, expires_at")
      .eq("response_token", token)
      .eq("id", quote_id)
      .single();

    if (!quote) return NextResponse.json({ error: "Devis non trouvé" }, { status: 404 });
    if (quote.status !== "pending") return NextResponse.json({ error: "Déjà répondu" }, { status: 409 });
    if (new Date(quote.expires_at) < new Date()) return NextResponse.json({ error: "Lien expiré" }, { status: 410 });

    await supabase.from("provider_quotes").update({
      status,
      amount: amount ?? null,
      scheduled_date: scheduled_date ?? null,
      scheduled_time: scheduled_time ?? null,
      notes: notes ?? null,
    }).eq("id", quote_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("evaluations")
    .select("submitted_at")
    .eq("evaluation_token", token)
    .single();
  return NextResponse.json({ submitted: !!data?.submitted_at });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  try {
    const supabase = createServiceClient();

    const { data: evaluation } = await supabase
      .from("evaluations")
      .select("id, submitted_at, incident_id")
      .eq("evaluation_token", token)
      .single();

    if (!evaluation) return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
    if (evaluation.submitted_at) return NextResponse.json({ error: "Déjà soumis" }, { status: 409 });

    const { rating, comment } = await req.json();

    await supabase.from("evaluations").update({
      guest_rating: rating,
      guest_comment: comment ?? null,
      submitted_at: new Date().toISOString(),
    }).eq("id", evaluation.id);

    // Close incident
    await supabase.from("incidents").update({ status: "closed" })
      .eq("id", evaluation.incident_id)
      .eq("status", "resolved");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

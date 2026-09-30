import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase/server";
import QRCode from "qrcode";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { hotel_id } = await req.json();
    const supabase = createServiceClient();

    // Verify membership
    const { data: hotelUser } = await supabase
      .from("hotel_users")
      .select("role")
      .eq("user_id", user.id)
      .eq("hotel_id", hotel_id)
      .single();
    if (!hotelUser || !["hotel_admin", "manager"].includes(hotelUser.role)) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { data: hotel } = await supabase
      .from("hotels")
      .select("slug")
      .eq("id", hotel_id)
      .single();

    const { data: rooms } = await supabase
      .from("rooms")
      .select("id, room_number")
      .eq("hotel_id", hotel_id)
      .eq("is_active", true)
      .order("room_number");

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fixhub.app";
    const qrcodes = [];

    for (const room of rooms ?? []) {
      // Get or create QR token
      let { data: qr } = await supabase
        .from("qr_codes")
        .select("token")
        .eq("room_id", room.id)
        .eq("is_active", true)
        .single();

      if (!qr) {
        const token = randomBytes(16).toString("hex");
        const { data: newQr } = await supabase
          .from("qr_codes")
          .insert({ hotel_id, room_id: room.id, token })
          .select()
          .single();
        qr = newQr;
      }

      const qrUrl = `${APP_URL}/client/${hotel?.slug}/${room.room_number}?token=${qr!.token}`;
      const imageDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: { dark: "#1a2744", light: "#ffffff" },
      });

      qrcodes.push({ room_number: room.room_number, image_data_url: imageDataUrl, qr_url: qrUrl });
    }

    return NextResponse.json({ qrcodes });
  } catch (err) {
    console.error("POST /api/qrcodes/generate:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

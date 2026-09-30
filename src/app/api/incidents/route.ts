import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendIncidentConfirmation } from "@/lib/email";
import { randomBytes } from "crypto";
import { addHours } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient();
    const fd = await req.formData();

    const hotel_id = fd.get("hotel_id") as string;
    const room_id = fd.get("room_id") as string;
    const category_id = fd.get("category_id") as string;
    const title = fd.get("title") as string;
    const description = (fd.get("description") as string) || null;
    const guest_name = (fd.get("guest_name") as string) || null;
    const guest_email = (fd.get("guest_email") as string) || null;
    const guest_phone = (fd.get("guest_phone") as string) || null;
    const access_preference = (fd.get("access_preference") as string) || "notify_first";
    const priority = (fd.get("priority") as string) || "medium";

    if (!hotel_id || !room_id || !category_id || !title) {
      return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    const { data: cat } = await supabase
      .from("incident_categories")
      .select("default_escalation_hours")
      .eq("id", category_id)
      .single();

    const tracking_token = randomBytes(16).toString("hex");
    const next_escalation_at = addHours(new Date(), cat?.default_escalation_hours ?? 4).toISOString();

    const { data: incident, error: incErr } = await supabase
      .from("incidents")
      .insert({
        hotel_id, room_id, category_id, title, description,
        guest_name, guest_email, guest_phone, access_preference,
        priority, tracking_token, status: "new", next_escalation_at,
      })
      .select()
      .single();

    if (incErr || !incident) {
      return NextResponse.json({ error: incErr?.message ?? "DB error" }, { status: 500 });
    }

    const photos = fd.getAll("photos") as File[];
    for (const photo of photos) {
      if (photo.size === 0) continue;
      const ext = photo.name.split(".").pop() ?? "jpg";
      const path = `${hotel_id}/${incident.id}/${randomBytes(8).toString("hex")}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("incident-photos")
        .upload(path, photo, { contentType: photo.type });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("incident-photos").getPublicUrl(path);
        await supabase.from("incident_photos").insert({
          incident_id: incident.id,
          storage_path: path,
          public_url: urlData.publicUrl,
        });
      }
    }

    const eval_token = randomBytes(16).toString("hex");
    await supabase.from("evaluations").insert({
      incident_id: incident.id,
      evaluation_token: eval_token,
    });

    const { data: teamMembers } = await supabase
      .from("hotel_users")
      .select("user_id")
      .eq("hotel_id", hotel_id)
      .in("role", ["hotel_admin", "manager", "receptionist"])
      .eq("is_active", true);

    if (teamMembers && teamMembers.length > 0) {
      await supabase.from("notifications").insert(
        teamMembers.map((m) => ({
          hotel_id, user_id: m.user_id, incident_id: incident.id,
          type: "new_incident", title: "Nouvel incident", message: `${title}`,
        }))
      );
    }

    if (guest_email) {
      const { data: hotel } = await supabase.from("hotels").select("name").eq("id", hotel_id).single();
      const { data: room } = await supabase.from("rooms").select("room_number").eq("id", room_id).single();
      const { data: category } = await supabase.from("incident_categories").select("name_fr").eq("id", category_id).single();
      await sendIncidentConfirmation({
        to: guest_email,
        guestName: guest_name ?? "Client",
        hotelName: hotel?.name ?? "",
        roomNumber: room?.room_number ?? "",
        category: category?.name_fr ?? "",
        trackingToken: tracking_token,
      }).catch(() => {});
    }

    return NextResponse.json({ id: incident.id, tracking_token }, { status: 201 });
  } catch (err) {
    console.error("POST /api/incidents:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

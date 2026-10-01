import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceClient } from "@/lib/supabase/server";
import { sendStatusUpdate, sendEvaluationRequest } from "@/lib/email";
import { sendTechnicianAssignment } from "@/lib/sms";
import { STATUS_LABELS } from "@/types";
import type { IncidentStatus } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const { data: hotelUser } = await authClient
      .from("hotel_users")
      .select("hotel_id, role")
      .eq("user_id", user.id)
      .single();
    if (!hotelUser) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const body = await req.json();
    const { status, note, assigned_to } = body as {
      status: IncidentStatus;
      note?: string;
      assigned_to?: string;
    };

    const supabase = createServiceClient();

    // Get current incident
    const { data: incident } = await supabase
      .from("incidents")
      .select("*, hotels(name), rooms(room_number), incident_categories(name_fr), evaluations(evaluation_token)")
      .eq("id", id)
      .eq("hotel_id", hotelUser.hotel_id)
      .single();

    if (!incident) return NextResponse.json({ error: "Incident non trouvé" }, { status: 404 });

    // Build update payload
    const updatePayload: Record<string, unknown> = { status };
    if (note) updatePayload.resolution_notes = note;
    if (assigned_to) updatePayload.assigned_to = assigned_to;
    if (status === "acknowledged" && !incident.acknowledged_at) {
      updatePayload.acknowledged_at = new Date().toISOString();
    }
    if (status === "assigned" && !incident.assigned_at) {
      updatePayload.assigned_at = new Date().toISOString();
    }
    if (status === "in_progress" && !incident.in_progress_at) {
      updatePayload.in_progress_at = new Date().toISOString();
    }
    if (status === "resolved") {
      updatePayload.resolved_at = new Date().toISOString();
    }

    await supabase.from("incidents").update(updatePayload).eq("id", id);

    // Log history
    await supabase.from("incident_status_history").insert({
      incident_id: id,
      changed_by: user.id,
      old_status: incident.status,
      new_status: status,
      note: note ?? null,
    });

    const hotel = incident.hotels as unknown as { name: string };
    const room = incident.rooms as unknown as { room_number: string };
    const cat = incident.incident_categories as unknown as { name_fr: string };

    // Send notifications
    if (incident.guest_email) {
      if (["in_progress", "resolved"].includes(status)) {
        await sendStatusUpdate({
          to: incident.guest_email,
          guestName: incident.guest_name ?? "Client",
          hotelName: hotel?.name ?? "",
          statusLabel: STATUS_LABELS[status],
          notes: note,
          trackingToken: incident.tracking_token,
        }).catch(() => {});
      }

      if (status === "resolved") {
        const evalRow = (incident.evaluations as unknown as { evaluation_token: string }[])?.[0];
        if (evalRow?.evaluation_token) {
          await sendEvaluationRequest({
            to: incident.guest_email,
            guestName: incident.guest_name ?? "Client",
            hotelName: hotel?.name ?? "",
            evaluationToken: evalRow.evaluation_token,
          }).catch(() => {});
        }
      }
    }

    // SMS to technician when assigned
    if (status === "assigned" && assigned_to) {
      const { data: techProfile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", assigned_to)
        .single();
      if (techProfile?.phone) {
        await sendTechnicianAssignment({
          to: techProfile.phone,
          technicianName: techProfile.full_name,
          hotelName: hotel?.name ?? "",
          roomNumber: room?.room_number ?? "",
          category: cat?.name_fr ?? "",
          priority: incident.priority,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/incidents/[id]/status:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { addHours } from "date-fns";

// Called by Vercel Cron every 15 minutes
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // Find incidents past escalation time
  const { data: incidents } = await supabase
    .from("incidents")
    .select("id, hotel_id, title, priority, status, next_escalation_at, incident_categories(default_escalation_hours)")
    .lte("next_escalation_at", now)
    .not("status", "in", '("resolved","closed","cancelled")')
    .limit(50);

  let escalated = 0;
  for (const incident of incidents ?? []) {
    const cat = incident.incident_categories as { default_escalation_hours: number } | null;
    const hours = cat?.default_escalation_hours ?? 4;

    // Bump priority if not critical
    const priorityMap: Record<string, string> = {
      low: "medium", medium: "high", high: "critical", critical: "critical",
    };
    const newPriority = priorityMap[incident.priority] ?? "high";

    await supabase.from("incidents").update({
      priority: newPriority,
      next_escalation_at: addHours(new Date(), hours).toISOString(),
    }).eq("id", incident.id);

    // Notify managers
    const { data: managers } = await supabase
      .from("hotel_users")
      .select("user_id")
      .eq("hotel_id", incident.hotel_id)
      .in("role", ["hotel_admin", "manager"])
      .eq("is_active", true);

    if (managers && managers.length > 0) {
      await supabase.from("notifications").insert(
        managers.map((m) => ({
          hotel_id: incident.hotel_id,
          user_id: m.user_id,
          incident_id: incident.id,
          type: "escalation",
          title: "Incident escaladé",
          message: `"${incident.title}" — priorité montée à ${newPriority}`,
        }))
      );
    }

    escalated++;
  }

  return NextResponse.json({ escalated });
}

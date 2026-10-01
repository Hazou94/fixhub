import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_LABELS } from "@/types";
import type { IncidentStatus, IncidentPriority } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: hotelUser } = await supabase
    .from("hotel_users")
    .select("hotel_id, role")
    .eq("user_id", user.id)
    .single();
  if (!hotelUser) redirect("/auth/login");

  let query = supabase
    .from("incidents")
    .select("id, title, status, priority, created_at, rooms(room_number), incident_categories(name_fr, icon), profiles(full_name)")
    .eq("hotel_id", hotelUser.hotel_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (status) query = query.eq("status", status);
  if (hotelUser.role === "technician") query = query.eq("assigned_to", user.id);

  const { data: incidents } = await query;

  const statuses: IncidentStatus[] = ["new", "acknowledged", "assigned", "in_progress", "waiting_parts", "waiting_provider", "resolved", "closed", "cancelled"];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Incidents</h1>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/hotel/incidents"
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!status ? "bg-brand-500 text-white border-brand-500" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
        >
          Tous
        </Link>
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/hotel/incidents?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${status === s ? "bg-brand-500 text-white border-brand-500" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
          >
            {STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {/* Incidents list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        {incidents?.length === 0 && (
          <p className="p-8 text-center text-gray-400">Aucun incident trouvé</p>
        )}
        {incidents?.map((inc) => {
          const room = inc.rooms as unknown as { room_number: string };
          const cat = inc.incident_categories as unknown as { name_fr: string; icon: string };
          const assignee = inc.profiles as unknown as { full_name: string } | null;
          return (
            <Link
              key={inc.id}
              href={`/hotel/incidents/${inc.id}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="text-2xl w-8 text-center">{cat?.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{inc.title}</p>
                <p className="text-xs text-gray-500">
                  Chambre {room?.room_number} · {cat?.name_fr}
                  {assignee && ` · ${assignee.full_name}`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inc.status as IncidentStatus]}`}>
                  {STATUS_LABELS[inc.status as IncidentStatus]}
                </span>
                <span className="text-xs text-gray-400">
                  {PRIORITY_LABELS[inc.priority as IncidentPriority]} ·{" "}
                  {format(new Date(inc.created_at), "d MMM HH:mm", { locale: fr })}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle, Clock, Star, TrendingUp, RefreshCw } from "lucide-react";
import Link from "next/link";
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_LABELS } from "@/types";
import type { IncidentStatus, IncidentPriority } from "@/types";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: hotelUser } = await supabase
    .from("hotel_users")
    .select("hotel_id, role")
    .eq("user_id", user.id)
    .single();

  if (!hotelUser) redirect("/auth/login");

  // KPIs
  const { data: kpis } = await supabase
    .from("v_hotel_kpis")
    .select("*")
    .eq("hotel_id", hotelUser.hotel_id)
    .single();

  // Active incidents
  const { data: incidents } = await supabase
    .from("incidents")
    .select("id, title, status, priority, created_at, rooms(room_number), incident_categories(name_fr, icon)")
    .eq("hotel_id", hotelUser.hotel_id)
    .not("status", "in", '("resolved","closed","cancelled")')
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(10);

  // Recurring issues
  const { data: recurring } = await supabase
    .from("recurring_issues")
    .select("*, rooms(room_number), incident_categories(name_fr)")
    .eq("hotel_id", hotelUser.hotel_id)
    .order("occurrence_count", { ascending: false })
    .limit(5);

  const stats = [
    { label: "Incidents ouverts", value: kpis?.open_incidents ?? 0, icon: AlertTriangle, color: "text-blue-600 bg-blue-50" },
    { label: "En cours", value: kpis?.in_progress_incidents ?? 0, icon: Clock, color: "text-yellow-600 bg-yellow-50" },
    { label: "Résolus (7j)", value: kpis?.resolved_last_7_days ?? 0, icon: CheckCircle, color: "text-green-600 bg-green-50" },
    { label: "Note moyenne", value: kpis?.avg_guest_rating ? `${Number(kpis.avg_guest_rating).toFixed(1)} ⭐` : "N/A", icon: Star, color: "text-gold-600 bg-yellow-50" },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tableau de bord</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Response time metrics */}
      {(kpis?.avg_acknowledgement_minutes || kpis?.avg_resolution_hours) && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              Temps moyen de prise en charge
            </div>
            <div className="text-xl font-bold">
              {kpis?.avg_acknowledgement_minutes
                ? `${Math.round(kpis.avg_acknowledgement_minutes)} min`
                : "N/A"}
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              Temps moyen de résolution
            </div>
            <div className="text-xl font-bold">
              {kpis?.avg_resolution_hours
                ? `${Number(kpis.avg_resolution_hours).toFixed(1)} h`
                : "N/A"}
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active incidents */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Incidents actifs</h2>
            <Link href="/hotel/incidents" className="text-sm text-brand-500 hover:underline">Voir tout →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {incidents?.length === 0 && (
              <p className="p-5 text-sm text-gray-400 text-center">Aucun incident actif 🎉</p>
            )}
            {incidents?.map((inc) => {
              const room = inc.rooms as { room_number: string };
              const cat = inc.incident_categories as { name_fr: string; icon: string };
              return (
                <Link key={inc.id} href={`/hotel/incidents/${inc.id}`} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                  <div className="text-2xl">{cat?.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{inc.title}</p>
                    <p className="text-xs text-gray-500">Chambre {room?.room_number} · {cat?.name_fr}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[inc.status as IncidentStatus]}`}>
                      {STATUS_LABELS[inc.status as IncidentStatus]}
                    </span>
                    <span className="text-xs text-gray-400">{PRIORITY_LABELS[inc.priority as IncidentPriority]}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recurring issues */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-5 border-b border-gray-100 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-orange-500" />
            <h2 className="font-semibold text-gray-900">Problèmes récurrents</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recurring?.length === 0 && (
              <p className="p-5 text-sm text-gray-400 text-center">Aucun problème récurrent</p>
            )}
            {recurring?.map((r) => {
              const room = r.rooms as { room_number: string };
              const cat = r.incident_categories as { name_fr: string };
              return (
                <div key={r.id} className="p-4">
                  <p className="text-sm font-medium text-gray-900">Chambre {room?.room_number}</p>
                  <p className="text-xs text-gray-500">{cat?.name_fr}</p>
                  <p className="text-xs font-bold text-orange-600 mt-1">{r.occurrence_count} occurrences (60j)</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

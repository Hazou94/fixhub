import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { STATUS_COLORS, STATUS_LABELS, PRIORITY_LABELS, ACCESS_LABELS } from "@/types";
import type { IncidentStatus, IncidentPriority, AccessPreference } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import IncidentActions from "@/components/hotel/IncidentActions";

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: hotelUser } = await supabase
    .from("hotel_users")
    .select("hotel_id, role")
    .eq("user_id", user.id)
    .single();
  if (!hotelUser) redirect("/auth/login");

  const { data: incident } = await supabase
    .from("v_incidents_full")
    .select("*")
    .eq("id", id)
    .eq("hotel_id", hotelUser.hotel_id)
    .single();

  if (!incident) notFound();

  const { data: photos } = await supabase
    .from("incident_photos")
    .select("*")
    .eq("incident_id", id);

  const { data: history } = await supabase
    .from("incident_status_history")
    .select("*, profiles(full_name)")
    .eq("incident_id", id)
    .order("created_at", { ascending: true });

  const { data: quotes } = await supabase
    .from("provider_quotes")
    .select("*, service_providers(company_name, contact_name, phone)")
    .eq("incident_id", id);

  const { data: evaluation } = await supabase
    .from("evaluations")
    .select("*")
    .eq("incident_id", id)
    .single();

  const { data: technicians } = await supabase
    .from("hotel_users")
    .select("user_id, profiles(full_name)")
    .eq("hotel_id", hotelUser.hotel_id)
    .eq("role", "technician")
    .eq("is_active", true);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{incident.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Chambre {incident.room_number} · {incident.category_name_fr}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[incident.status as IncidentStatus]}`}>
              {STATUS_LABELS[incident.status as IncidentStatus]}
            </span>
            <span className="text-xs px-3 py-1 rounded-full font-medium bg-gray-100 text-gray-700">
              {PRIORITY_LABELS[incident.priority as IncidentPriority]}
            </span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guest info */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">Informations client</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">Nom</dt>
                <dd className="font-medium">{incident.guest_name || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium">{incident.guest_email || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Téléphone</dt>
                <dd className="font-medium">{incident.guest_phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Accès</dt>
                <dd className="font-medium">{ACCESS_LABELS[incident.access_preference as AccessPreference]}</dd>
              </div>
            </dl>
            {incident.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-600">{incident.description}</p>
              </div>
            )}
          </div>

          {/* Photos */}
          {photos && photos.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-4">Photos ({photos.length})</h2>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <a key={photo.id} href={photo.public_url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={photo.public_url}
                      alt="Photo incident"
                      className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Quotes */}
          {quotes && quotes.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold text-gray-900 mb-4">Devis prestataires</h2>
              <div className="space-y-3">
                {quotes.map((q) => {
                  const prov = q.service_providers as { company_name: string; contact_name: string };
                  return (
                    <div key={q.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{prov?.company_name}</p>
                        <p className="text-xs text-gray-500">{prov?.contact_name}</p>
                      </div>
                      <div className="text-right">
                        {q.amount && <p className="text-sm font-bold">{q.amount} €</p>}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          q.status === "accepted" ? "bg-green-100 text-green-700" :
                          q.status === "declined" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {q.status === "accepted" ? "Accepté" : q.status === "declined" ? "Refusé" : "En attente"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status history */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">Historique</h2>
            <div className="space-y-3">
              {history?.map((h, i) => {
                const profile = h.profiles as { full_name: string } | null;
                return (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-500 mt-1 shrink-0" />
                      {i < (history.length - 1) && <div className="w-0.5 bg-gray-200 flex-1 mt-1" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-medium text-gray-900">{STATUS_LABELS[h.new_status as IncidentStatus]}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(h.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                        {profile && ` · ${profile.full_name}`}
                      </p>
                      {h.note && <p className="text-xs text-gray-600 mt-1">{h.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar: Actions + Metrics */}
        <div className="space-y-6">
          {/* Guest evaluation */}
          {evaluation?.submitted_at && (
            <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-100">
              <h2 className="font-semibold text-gray-900 mb-2">Évaluation client</h2>
              <div className="text-2xl mb-1">
                {"⭐".repeat(evaluation.guest_rating ?? 0)}
              </div>
              {evaluation.guest_comment && (
                <p className="text-sm text-gray-600 italic">"{evaluation.guest_comment}"</p>
              )}
            </div>
          )}

          {/* Metrics */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">Métriques</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Créé le</dt>
                <dd>{format(new Date(incident.created_at), "d MMM HH:mm", { locale: fr })}</dd>
              </div>
              {incident.acknowledged_at && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Pris en compte</dt>
                  <dd>{format(new Date(incident.acknowledged_at), "d MMM HH:mm", { locale: fr })}</dd>
                </div>
              )}
              {incident.resolved_at && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Résolu le</dt>
                  <dd>{format(new Date(incident.resolved_at), "d MMM HH:mm", { locale: fr })}</dd>
                </div>
              )}
              {incident.assignee_name && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Assigné à</dt>
                  <dd>{incident.assignee_name}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Actions */}
          <IncidentActions
            incident={incident}
            technicians={technicians ?? []}
            role={hotelUser.role}
            currentUserId={user.id}
          />
        </div>
      </div>
    </div>
  );
}
